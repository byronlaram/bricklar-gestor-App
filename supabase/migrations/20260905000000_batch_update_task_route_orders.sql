-- ==============================================================================
-- MIGRATION: 20260905000000_batch_update_task_route_orders.sql
-- Optimiza el reordenamiento de ruta de tareas a una única llamada RPC atómica.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.update_task_route_orders(p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    UPDATE public.tasks
    SET 
      route_order = (item->>'route_order')::integer,
      updated_at = NOW()
    WHERE id = (item->>'id')::uuid;
  END LOOP;
END;
$$;

-- Permisos de ejecución para usuarios autenticados
GRANT EXECUTE ON FUNCTION public.update_task_route_orders(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_task_route_orders(jsonb) TO service_role;
