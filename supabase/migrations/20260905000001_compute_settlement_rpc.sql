-- ==============================================================================
-- MIGRATION: 20260905000001_compute_settlement_rpc.sql
-- Implementación oficial y segura en PostgreSQL de la RPC `compute_settlement`
-- para validación y recálculo financiero server-side de liquidaciones de jornadas.
-- ==============================================================================

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
  v_collections_nio NUMERIC := 0;
  v_collections_usd NUMERIC := 0;
  v_net_expected_nio NUMERIC := 0;
  v_net_expected_usd NUMERIC := 0;
  v_result JSONB;
BEGIN
  -- 1. Obtener la jornada
  SELECT id, courier_id, branch_id, work_date, status, COALESCE(initial_cash, 0) AS initial_cash
  INTO v_workday
  FROM public.workdays
  WHERE id = p_workday_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jornada con ID % no encontrada.', p_workday_id;
  END IF;

  v_initial_cash_nio := v_workday.initial_cash;

  -- 2. Consolidar Movimientos de Caja de la jornada
  -- A. Adelantos recibidos durante el turno
  SELECT 
    COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN currency = 'NIO' OR currency IS NULL THEN amount ELSE 0 END), 0)
  INTO v_advances_usd, v_advances_nio
  FROM public.cash_movements
  WHERE workday_id = p_workday_id
    AND direction = 'income'
    AND movement_type IN ('advance', 'cash_advance', 'additional_fund')
    AND description NOT ILIKE '%[anulado]%';

  -- B. Entregas parciales ya entregadas a oficina
  SELECT 
    COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN currency = 'NIO' OR currency IS NULL THEN amount ELSE 0 END), 0)
  INTO v_already_received_usd, v_already_received_nio
  FROM public.cash_movements
  WHERE workday_id = p_workday_id
    AND direction = 'income'
    AND movement_type IN ('cash_return', 'deposit', 'adjustment', 'settlement_payment', 'reception', 'partial_delivery')
    AND description NOT ILIKE '%[anulado]%';

  -- C. Gastos registrados directamente en movimientos de caja
  SELECT 
    COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN currency = 'NIO' OR currency IS NULL THEN amount ELSE 0 END), 0)
  INTO v_expenses_usd, v_expenses_nio
  FROM public.cash_movements
  WHERE workday_id = p_workday_id
    AND direction = 'expense'
    AND description NOT ILIKE '%[anulado]%';

  -- 3. Consolidar Cobros y Pagos de Tareas Completadas de la jornada
  -- Cobros en efectivo
  SELECT 
    COALESCE(SUM(CASE WHEN expected_collection_currency = 'USD' THEN expected_collection_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN expected_collection_currency = 'NIO' OR expected_collection_currency IS NULL THEN expected_collection_amount ELSE 0 END), 0)
  INTO v_collections_usd, v_collections_nio
  FROM public.tasks
  WHERE assigned_courier_id = v_workday.courier_id
    AND scheduled_date = v_workday.work_date
    AND status = 'completed'
    AND requires_collection = true
    AND (payment_method = 'cash' OR payment_method IS NULL)
    AND deleted_at IS NULL;

  -- 4. Cálculo final de Neto Esperado
  v_net_expected_nio := v_initial_cash_nio + v_advances_nio + v_collections_nio - v_expenses_nio - v_already_received_nio;
  v_net_expected_usd := v_advances_usd + v_collections_usd - v_expenses_usd - v_already_received_usd;

  -- 5. Construir respuesta JSON
  v_result := jsonb_build_object(
    'workday_id', p_workday_id,
    'courier_id', v_workday.courier_id,
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
