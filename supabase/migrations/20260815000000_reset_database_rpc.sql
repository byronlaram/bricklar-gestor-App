-- ==============================================================================
-- MIGRACIÓN: Función RPC para Restablecimiento Seguro de Base de Datos
-- Solo ejecutable por usuarios con rol 'general_admin' autenticados.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.reset_database_for_new_client()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_is_admin boolean;
  v_result jsonb;
BEGIN
  -- 1. Obtener ID del invocador autenticado
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado. Debe iniciar sesión para ejecutar esta acción.';
  END IF;

  -- 2. Validar que el invocador sea Administrador General
  SELECT (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = v_caller_id AND r.name = 'general_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_caller_id AND p.role = 'general_admin'
    )
  ) INTO v_is_admin;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Acceso denegado. Solo un Administrador General puede restablecer la base de datos.';
  END IF;

  -- 3. Eliminación de notificaciones, preferencias y logs de auditoría
  DELETE FROM public.audit_logs WHERE id IS NOT NULL;
  DELETE FROM public.notifications WHERE id IS NOT NULL;
  DELETE FROM public.notification_preferences WHERE id IS NOT NULL;

  -- 4. Eliminación de tareas, asignaciones e historial
  DELETE FROM public.task_status_history WHERE id IS NOT NULL;
  DELETE FROM public.task_assignments WHERE id IS NOT NULL;
  DELETE FROM public.tasks WHERE id IS NOT NULL;

  -- 5. Eliminación de movimientos financieros, caja, liquidaciones y jornadas
  DELETE FROM public.settlement_adjustments WHERE id IS NOT NULL;
  DELETE FROM public.settlements WHERE id IS NOT NULL;
  DELETE FROM public.daily_closures WHERE id IS NOT NULL;
  DELETE FROM public.cash_transfers WHERE id IS NOT NULL;
  DELETE FROM public.cash_movements WHERE id IS NOT NULL;
  DELETE FROM public.financial_movements WHERE id IS NOT NULL;
  DELETE FROM public.exchange_rates WHERE id IS NOT NULL;
  DELETE FROM public.workdays WHERE id IS NOT NULL;

  -- 6. Reinicio de secuencias operativas
  DELETE FROM public.task_sequences WHERE id IS NOT NULL;

  -- 7. Eliminación de vínculos de sucursales
  DELETE FROM public.courier_branch_assignments WHERE id IS NOT NULL;
  DELETE FROM public.user_branches WHERE user_id IS NOT NULL;

  -- 8. Eliminación de roles y perfiles que no sean el Administrador General activo
  DELETE FROM public.user_roles WHERE user_id != v_caller_id;
  DELETE FROM public.profiles WHERE id != v_caller_id;

  -- 9. Eliminación de sucursales de prueba
  DELETE FROM public.branches WHERE id IS NOT NULL;

  -- 10. Restablecer configuraciones de odómetro a valores de fábrica
  UPDATE public.app_settings
  SET value_json = '{"enabled": true, "allow_not_available": true}'::jsonb,
      updated_at = NOW()
  WHERE key = 'odometer_settings';

  -- Construir respuesta de éxito
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Base de datos restablecida correctamente a valores de fábrica.',
    'caller_id', v_caller_id,
    'timestamp', NOW()
  );

  RETURN v_result;
END;
$$;

-- Otorgar permisos de ejecución a usuarios autenticados (la función valida internamente el rol)
GRANT EXECUTE ON FUNCTION public.reset_database_for_new_client() TO authenticated;
