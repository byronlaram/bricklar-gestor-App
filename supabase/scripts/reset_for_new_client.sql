-- ==============================================================================
-- PELIGRO — OPERACIÓN DESTRUCTIVA
-- RESET PARA NUEVO CLIENTE (CONSERVANDO 1 ADMINISTRADOR GENERAL)
-- NO EJECUTAR SIN BACKUP Y AUTORIZACIÓN EXPLÍCITA
-- ==============================================================================
--
-- ATENCIÓN: ESTE SCRIPT PREPARA LA LIMPIEZA DE DATOS DE PRUEBA Y MOTORIZADOS DE DEV,
-- CONSERVANDO EXACTAMENTE 1 CUENTA DE ADMINISTRADOR GENERAL ('admin@gestorops.com')
-- COMO CUENTA ACCESO INICIAL PARA EL NUEVO CLIENTE.
--
-- NO ELIMINA TABLAS, ESTRUCTURAS, COLUMNAS, FUNCIONES NI POLÍTICAS RLS.
-- NO EJECUTAR DIRECTAMENTE HASTA HABER REALIZADO UN BACKUP COMPLETO DE LA BD Y
-- TENER AUTORIZACIÓN EXPLÍCITA.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- PASO 1: ELIMINACIÓN DE REGISTROS DE ACTIVIDAD, NOTIFICACIONES Y AUDITORÍA
-- ------------------------------------------------------------------------------
DELETE FROM public.audit_logs;
DELETE FROM public.notifications;
DELETE FROM public.notification_preferences;

-- ------------------------------------------------------------------------------
-- PASO 2: ELIMINACIÓN DE DATOS OPERATIVOS DE TAREAS E HISTORIAL
-- ------------------------------------------------------------------------------
DELETE FROM public.task_status_history;
DELETE FROM public.task_assignments;
DELETE FROM public.tasks;

-- ------------------------------------------------------------------------------
-- PASO 3: ELIMINACIÓN DE MOVIMIENTOS FINANCIEROS, CAJA Y LIQUIDACIONES
-- ------------------------------------------------------------------------------
DELETE FROM public.settlement_adjustments;
DELETE FROM public.settlements;
DELETE FROM public.daily_closures;
DELETE FROM public.cash_transfers;
DELETE FROM public.cash_movements;
DELETE FROM public.financial_movements;
DELETE FROM public.exchange_rates;

-- ------------------------------------------------------------------------------
-- PASO 4: ELIMINACIÓN DE JORNADAS DE TRABAJO
-- ------------------------------------------------------------------------------
DELETE FROM public.workdays;

-- ------------------------------------------------------------------------------
-- PASO 5: REINICIO DE SECUENCIAS Y CONTADORES DE TAREAS
-- ------------------------------------------------------------------------------
DELETE FROM public.task_sequences;

-- ------------------------------------------------------------------------------
-- PASO 6: ELIMINACIÓN DE VÍNCULOS A SUCURSALES DE PRUEBA
-- ------------------------------------------------------------------------------
DELETE FROM public.courier_branch_assignments;
DELETE FROM public.user_branches;

-- ------------------------------------------------------------------------------
-- PASO 7: ELIMINACIÓN DE MOTORIZADOS DE PRUEBA (CONSERVANDO 1 ADMIN GENERAL)
-- Preserva la cuenta Admin General ('11d5ac93-ede7-4b86-a4bd-20939253e2d0')
-- ------------------------------------------------------------------------------
DELETE FROM public.user_roles
WHERE user_id != '11d5ac93-ede7-4b86-a4bd-20939253e2d0';

DELETE FROM public.profiles
WHERE id != '11d5ac93-ede7-4b86-a4bd-20939253e2d0' AND role != 'general_admin';

-- ------------------------------------------------------------------------------
-- PASO 8: ELIMINACIÓN DE SUCURSALES DE PRUEBA ("MANAGUA")
-- ------------------------------------------------------------------------------
DELETE FROM public.branches;

-- ------------------------------------------------------------------------------
-- PASO 9: RESTABLECIMIENTO DE CONFIGURACIÓN OPERATIVA FACTORY DEFAULT
-- Control de Kilometraje: Habilitado = true, Permitir no disponible = true
-- ------------------------------------------------------------------------------
UPDATE public.app_settings
SET value_json = '{"enabled": true, "allow_not_available": true}'::jsonb,
    updated_at = NOW()
WHERE key = 'odometer_settings';

COMMIT;

-- ==============================================================================
-- FIN DEL SCRIPT DE RESET
-- ==============================================================================
