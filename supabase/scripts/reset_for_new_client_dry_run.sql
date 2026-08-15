-- ==============================================================================
-- BRICKLAR GESTOR — DIAGNÓSTICO DRY-RUN (CONSERVAR 1 ADMIN GENERAL)
-- SCRIPT DE AUDITORÍA CON DECISIÓN DEFINITIVA DE MANTENER SUPERUSUARIO INICIAL
--
-- ESTE SCRIPT ES 100% SEGURO Y DE SOLO LECTURA. NO ELIMINA NADA.
-- CONSULTA Y MUESTRA LA PROYECCIÓN EXACTA DEL RESET DEFINITIVO.
-- ==============================================================================

DO $$
DECLARE
  v_tasks int;
  v_task_assign int;
  v_task_history int;
  v_workdays int;
  v_cash_mov int;
  v_cash_trans int;
  v_settlements int;
  v_settle_adj int;
  v_daily_clos int;
  v_fin_mov int;
  v_ex_rates int;
  v_notifications int;
  v_notif_pref int;
  v_audit_logs int;

  v_profiles_total int;
  v_profiles_delete int;
  v_profiles_keep int;

  v_user_roles_total int;
  v_user_roles_delete int;
  v_user_roles_keep int;

  v_user_branches_total int;
  v_courier_branches int;
  v_branches int;

  v_app_settings int;
  v_roles int;
  v_bus_routes int;
  v_bus_schedules int;
  v_destinations int;
  v_transport_serv int;
  v_task_seq int;

  v_total_delete int;
  v_total_keep int;
BEGIN
  -- 1. TABLAS OPERATIVAS (A LIMPIAR 100%)
  SELECT count(*) INTO v_tasks FROM public.tasks;
  SELECT count(*) INTO v_task_assign FROM public.task_assignments;
  SELECT count(*) INTO v_task_history FROM public.task_status_history;
  SELECT count(*) INTO v_workdays FROM public.workdays;
  SELECT count(*) INTO v_cash_mov FROM public.cash_movements;
  SELECT count(*) INTO v_cash_trans FROM public.cash_transfers;
  SELECT count(*) INTO v_settlements FROM public.settlements;
  SELECT count(*) INTO v_settle_adj FROM public.settlement_adjustments;
  SELECT count(*) INTO v_daily_clos FROM public.daily_closures;
  SELECT count(*) INTO v_fin_mov FROM public.financial_movements;
  SELECT count(*) INTO v_ex_rates FROM public.exchange_rates;
  SELECT count(*) INTO v_notifications FROM public.notifications;
  SELECT count(*) INTO v_notif_pref FROM public.notification_preferences;
  SELECT count(*) INTO v_audit_logs FROM public.audit_logs;
  SELECT count(*) INTO v_task_seq FROM public.task_sequences;

  -- 2. USUARIOS Y ESTRUCTURA DE PRUEBAS (CONSERVANDO 1 ADMIN GENERAL)
  SELECT count(*) INTO v_profiles_total FROM public.profiles;
  SELECT count(*) INTO v_profiles_keep FROM public.profiles WHERE id = '11d5ac93-ede7-4b86-a4bd-20939253e2d0' OR role = 'general_admin';
  v_profiles_delete := v_profiles_total - v_profiles_keep;

  SELECT count(*) INTO v_user_roles_total FROM public.user_roles;
  SELECT count(*) INTO v_user_roles_keep FROM public.user_roles WHERE user_id = '11d5ac93-ede7-4b86-a4bd-20939253e2d0';
  v_user_roles_delete := v_user_roles_total - v_user_roles_keep;

  SELECT count(*) INTO v_user_branches_total FROM public.user_branches;
  SELECT count(*) INTO v_courier_branches FROM public.courier_branch_assignments;
  SELECT count(*) INTO v_branches FROM public.branches;

  -- 3. CONFIGURACIÓN Y CATÁLOGOS BASE (A CONSERVAR 100%)
  SELECT count(*) INTO v_app_settings FROM public.app_settings;
  SELECT count(*) INTO v_roles FROM public.roles;
  SELECT count(*) INTO v_bus_routes FROM public.bus_routes;
  SELECT count(*) INTO v_bus_schedules FROM public.bus_schedules;
  SELECT count(*) INTO v_destinations FROM public.destinations;
  SELECT count(*) INTO v_transport_serv FROM public.transport_services;

  -- CÁLCULO DE TOTALES PROYECTADOS
  v_total_delete := v_tasks + v_task_assign + v_task_history + v_workdays + v_cash_mov +
                    v_cash_trans + v_settlements + v_settle_adj + v_daily_clos + v_fin_mov +
                    v_ex_rates + v_notifications + v_notif_pref + v_audit_logs + v_profiles_delete +
                    v_user_roles_delete + v_user_branches_total + v_courier_branches + v_branches + v_task_seq;

  v_total_keep := v_profiles_keep + v_user_roles_keep + v_app_settings + v_roles + v_bus_routes +
                  v_bus_schedules + v_destinations + v_transport_serv;

  RAISE NOTICE '========================================================================';
  RAISE NOTICE '   BRICKLAR GESTOR - DRY-RUN (CONSERVAR 1 ADMIN GENERAL INICIAL)       ';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '1. REGISTROS OPERATIVOS A ELIMINAR (PRUEBAS):';
  RAISE NOTICE '   - tasks                     : Actual % | Se eliminarán % | Permanecerían 0', v_tasks, v_tasks;
  RAISE NOTICE '   - task_assignments          : Actual % | Se eliminarán % | Permanecerían 0', v_task_assign, v_task_assign;
  RAISE NOTICE '   - task_status_history       : Actual % | Se eliminarán % | Permanecerían 0', v_task_history, v_task_history;
  RAISE NOTICE '   - workdays                  : Actual % | Se eliminarán % | Permanecerían 0', v_workdays, v_workdays;
  RAISE NOTICE '   - cash_movements            : Actual % | Se eliminarán % | Permanecerían 0', v_cash_mov, v_cash_mov;
  RAISE NOTICE '   - audit_logs                : Actual % | Se eliminarán % | Permanecerían 0', v_audit_logs, v_audit_logs;
  RAISE NOTICE '------------------------------------------------------------------------';
  RAISE NOTICE '2. USUARIOS Y ASIGNACIONES (CONSERVANDO 1 ADMIN GENERAL):';
  RAISE NOTICE '   - profiles                  : Actual % | Se eliminarán % (Motorizados) | Conservar % (Admin General)', v_profiles_total, v_profiles_delete, v_profiles_keep;
  RAISE NOTICE '   - user_roles                : Actual % | Se eliminarán % | Conservar % (Rol Admin General)', v_user_roles_total, v_user_roles_delete, v_user_roles_keep;
  RAISE NOTICE '   - user_branches             : Actual % | Se eliminarán % (Vínculos a Managua) | Permanecerían 0', v_user_branches_total, v_user_branches_total;
  RAISE NOTICE '   - branches (Managua)        : Actual % | Se eliminarán % | Permanecerían 0', v_branches, v_branches;
  RAISE NOTICE '   - task_sequences            : Actual % | Se eliminarán % | Permanecerían 0', v_task_seq, v_task_seq;
  RAISE NOTICE '------------------------------------------------------------------------';
  RAISE NOTICE '3. ESTRUCTURA Y CATÁLOGOS BASE A CONSERVAR (PRODUCTO REUTILIZABLE):';
  RAISE NOTICE '   - app_settings              : Actual % | Conservar % (Kilometraje reset a true/true)', v_app_settings, v_app_settings;
  RAISE NOTICE '   - roles (Catálogo)          : Actual % | Conservar %', v_roles, v_roles;
  RAISE NOTICE '   - destinations (Catálogo)   : Actual % | Conservar %', v_destinations, v_destinations;
  RAISE NOTICE '   - bus_routes (Directorio)   : Actual % | Conservar %', v_bus_routes, v_bus_routes;
  RAISE NOTICE '   - bus_schedules             : Actual % | Conservar %', v_bus_schedules, v_bus_schedules;
  RAISE NOTICE '   - transport_services        : Actual % | Conservar %', v_transport_serv, v_transport_serv;
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'TOTAL DE REGISTROS A ELIMINAR  : %', v_total_delete;
  RAISE NOTICE 'TOTAL DE REGISTROS A CONSERVAR : %', v_total_keep;
  RAISE NOTICE '========================================================================';
END $$;
