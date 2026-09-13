-- ==============================================================================
-- MIGRATION: 20260912000001_fix_compute_settlement_transfer_bug.sql
-- FIX CRÍTICO: Corrección del RPC compute_settlement para escenario
-- "tarea configurada en efectivo pero cobrada por transferencia".
--
-- BUG IDENTIFICADO:
--   Cuando una tarea tenía expected_payment_method='cash' pero el motorizado
--   la cobró por transferencia (payment_breakdown tiene transfer_amount pero
--   NO tiene cash_amount), la condición de fallback sumaba el monto completo
--   como efectivo en lugar de tratarlo como C$0.
--
-- SOLUCIÓN:
--   Agregar "t.metadata->'payment_breakdown' IS NULL" al fallback, de modo
--   que solo aplique cuando no hay breakdown registrado en absoluto.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.compute_settlement(UUID);
DROP FUNCTION IF EXISTS public.compute_settlement(TEXT);
DROP FUNCTION IF EXISTS public.compute_settlement;

CREATE OR REPLACE FUNCTION public.compute_settlement(p_workday_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_workday RECORD;
  v_initial_cash_nio NUMERIC := 0;
  v_advances_nio NUMERIC := 0;
  v_advances_usd NUMERIC := 0;
  v_already_received_nio NUMERIC := 0;
  v_already_received_usd NUMERIC := 0;
  v_expenses_nio NUMERIC := 0;
  v_expenses_usd NUMERIC := 0;
  v_task_expenses_nio NUMERIC := 0;
  v_task_expenses_usd NUMERIC := 0;
  v_collections_nio NUMERIC := 0;
  v_collections_usd NUMERIC := 0;
  v_net_expected_nio NUMERIC := 0;
  v_net_expected_usd NUMERIC := 0;
  v_result JSONB;
BEGIN
  -- 1. Obtener la jornada laboral
  SELECT id, courier_id, branch_id, work_date, status, COALESCE(initial_cash, 0) AS initial_cash
  INTO v_workday
  FROM public.workdays
  WHERE id = p_workday_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jornada con ID % no encontrada.', p_workday_id;
  END IF;

  v_initial_cash_nio := v_workday.initial_cash;

  -- 2. Movimientos de Caja (Libro Diario de la Jornada)
  -- A. Adelantos / Fondos adicionales entregados al motorizado
  SELECT 
    COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN currency = 'NIO' OR currency IS NULL THEN amount ELSE 0 END), 0)
  INTO v_advances_usd, v_advances_nio
  FROM public.cash_movements
  WHERE workday_id = p_workday_id
    AND direction = 'income'
    AND movement_type IN ('advance', 'cash_advance', 'additional_fund')
    AND COALESCE(description, '') NOT ILIKE '%[anulado]%';

  -- B. Entregas parciales / Recepciones ya liquidadas en oficina durante el día
  SELECT 
    COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN currency = 'NIO' OR currency IS NULL THEN amount ELSE 0 END), 0)
  INTO v_already_received_usd, v_already_received_nio
  FROM public.cash_movements
  WHERE workday_id = p_workday_id
    AND direction = 'income'
    AND movement_type IN ('cash_return', 'deposit', 'adjustment', 'settlement_payment', 'reception', 'partial_delivery')
    AND COALESCE(description, '') NOT ILIKE '%[anulado]%';

  -- C. Gastos directos registrados en caja (combustible, viáticos, etc.)
  SELECT 
    COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN currency = 'NIO' OR currency IS NULL THEN amount ELSE 0 END), 0)
  INTO v_expenses_usd, v_expenses_nio
  FROM public.cash_movements
  WHERE workday_id = p_workday_id
    AND direction = 'expense'
    AND COALESCE(description, '') NOT ILIKE '%[anulado]%';

  -- 3. Tareas completadas de la jornada
  -- A. Cobros en efectivo recaudados de clientes
  --
  -- LÓGICA DE COBROS (sólo efectivo físico):
  --   1. Si hay payment_breakdown con cash_amount → usar ese valor exacto (puede ser 0 si cobró por transferencia/cheque)
  --   2. Si NO hay payment_breakdown en absoluto y el método esperado era 'cash' → usar el monto esperado de cobro
  --   3. Si hay payment_breakdown pero sin cash_amount (cobró por transferencia/cheque) → 0
  --
  -- CORRECCIÓN DEL BUG: El fallback al monto esperado solo aplica cuando NO existe ningún
  -- payment_breakdown registrado (t.metadata->'payment_breakdown' IS NULL).
  -- Si el motorizado registró el cobro como transferencia (con transfer_amount), el breakdown
  -- existe pero sin cash_amount, por lo que cae en el Caso 3 y se trata correctamente como C$0.
  SELECT 
    COALESCE(SUM(
      CASE 
        -- Caso 1: Hubo desglose explícito → usar solo el efectivo declarado (puede ser 0)
        WHEN (t.metadata->'payment_breakdown'->>'cash_amount') IS NOT NULL 
          THEN (t.metadata->'payment_breakdown'->>'cash_amount')::NUMERIC
        -- Caso 2: Sin desglose alguno, método esperado es efectivo → usar monto esperado
        WHEN t.metadata->'payment_breakdown' IS NULL
          AND COALESCE(t.expected_payment_method, 'cash') = 'cash' 
          THEN COALESCE(t.expected_collection_amount, 0)
        -- Caso 3: Hay breakdown pero sin cash_amount (cobrado por transferencia/cheque) → 0
        ELSE 0 
      END
    ), 0)
  INTO v_collections_nio
  FROM public.tasks t
  WHERE t.assigned_courier_id = v_workday.courier_id
    AND t.scheduled_date = v_workday.work_date
    AND t.status = 'completed'
    AND t.requires_collection = true
    AND COALESCE(t.expected_collection_currency, 'NIO') = 'NIO'
    AND t.deleted_at IS NULL;

  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN (t.metadata->'payment_breakdown'->>'cash_amount') IS NOT NULL 
          THEN (t.metadata->'payment_breakdown'->>'cash_amount')::NUMERIC
        WHEN t.metadata->'payment_breakdown' IS NULL
          AND COALESCE(t.expected_payment_method, 'cash') = 'cash' 
          THEN COALESCE(t.expected_collection_amount, 0)
        ELSE 0 
      END
    ), 0)
  INTO v_collections_usd
  FROM public.tasks t
  WHERE t.assigned_courier_id = v_workday.courier_id
    AND t.scheduled_date = v_workday.work_date
    AND t.status = 'completed'
    AND t.requires_collection = true
    AND t.expected_collection_currency = 'USD'
    AND t.deleted_at IS NULL;

  -- B. Compras / Pagos a proveedores pagados en efectivo durante la ruta
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN (t.metadata->'payment_breakdown'->>'actual_paid_amount') IS NOT NULL 
          THEN (t.metadata->'payment_breakdown'->>'actual_paid_amount')::NUMERIC
        WHEN (t.metadata->'payment_breakdown'->>'cash_amount') IS NOT NULL 
          THEN (t.metadata->'payment_breakdown'->>'cash_amount')::NUMERIC
        WHEN t.metadata->'payment_breakdown' IS NULL
          AND COALESCE(t.expected_payment_method, 'cash') = 'cash' 
          THEN COALESCE(t.expected_payment_amount, 0)
        ELSE 0 
      END
    ), 0)
  INTO v_task_expenses_nio
  FROM public.tasks t
  WHERE t.assigned_courier_id = v_workday.courier_id
    AND t.scheduled_date = v_workday.work_date
    AND t.status = 'completed'
    AND t.requires_payment = true
    AND COALESCE(t.expected_payment_currency, 'NIO') = 'NIO'
    AND t.deleted_at IS NULL;

  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN (t.metadata->'payment_breakdown'->>'actual_paid_amount') IS NOT NULL 
          THEN (t.metadata->'payment_breakdown'->>'actual_paid_amount')::NUMERIC
        WHEN (t.metadata->'payment_breakdown'->>'cash_amount') IS NOT NULL 
          THEN (t.metadata->'payment_breakdown'->>'cash_amount')::NUMERIC
        WHEN t.metadata->'payment_breakdown' IS NULL
          AND COALESCE(t.expected_payment_method, 'cash') = 'cash' 
          THEN COALESCE(t.expected_payment_amount, 0)
        ELSE 0 
      END
    ), 0)
  INTO v_task_expenses_usd
  FROM public.tasks t
  WHERE t.assigned_courier_id = v_workday.courier_id
    AND t.scheduled_date = v_workday.work_date
    AND t.status = 'completed'
    AND t.requires_payment = true
    AND t.expected_payment_currency = 'USD'
    AND t.deleted_at IS NULL;

  -- Consolidar gastos totales (caja + tareas)
  v_expenses_nio := v_expenses_nio + v_task_expenses_nio;
  v_expenses_usd := v_expenses_usd + v_task_expenses_usd;

  -- 4. Cálculo final del Neto Esperado en Mano
  v_net_expected_nio := v_initial_cash_nio + v_advances_nio + v_collections_nio - v_expenses_nio - v_already_received_nio;
  v_net_expected_usd := v_advances_usd + v_collections_usd - v_expenses_usd - v_already_received_usd;

  -- Si el neto resultante es negativo debido a redondeos mínimos, asegurar piso en 0
  IF v_net_expected_nio < 0 THEN
    v_net_expected_nio := 0;
  END IF;
  IF v_net_expected_usd < 0 THEN
    v_net_expected_usd := 0;
  END IF;

  -- 5. Construir objeto JSON certificado
  v_result := jsonb_build_object(
    'workday_id', p_workday_id,
    'courier_id', v_workday.courier_id,
    'work_date', v_workday.work_date,
    'initial_cash_nio', v_initial_cash_nio,
    'advances_nio', v_advances_nio,
    'advances_usd', v_advances_usd,
    'collections_nio', v_collections_nio,
    'collections_usd', v_collections_usd,
    'expenses_nio', v_expenses_nio,
    'expenses_usd', v_expenses_usd,
    'already_received_nio', v_already_received_nio,
    'already_received_usd', v_already_received_usd,
    'net_expected_nio', v_net_expected_nio,
    'net_expected_usd', v_net_expected_usd,
    'calculated_at', NOW()
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_settlement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_settlement(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_settlement(UUID) TO anon;

