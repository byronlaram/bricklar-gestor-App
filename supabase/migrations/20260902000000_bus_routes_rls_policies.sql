-- ==============================================================================
-- MIGRACIÓN: Políticas de Seguridad RLS para Directorio de Buses (bus_routes)
-- Permite que usuarios autenticados (motorizados y administradores) consulten,
-- registren y actualicen rutas, reservando la eliminación para administradores.
-- ==============================================================================

-- 1. Habilitar RLS en la tabla
ALTER TABLE public.bus_routes ENABLE ROW LEVEL SECURITY;

-- 2. Política de Lectura (SELECT) para todos los usuarios
DROP POLICY IF EXISTS "bus_routes_read_policy" ON public.bus_routes;
CREATE POLICY "bus_routes_read_policy"
ON public.bus_routes FOR SELECT
USING (true);

-- 3. Eliminar política restrictiva anterior si existe
DROP POLICY IF EXISTS "bus_routes_all_admin_policy" ON public.bus_routes;

-- 4. Política de Inserción (INSERT) para usuarios autenticados (motorizados y administradores)
DROP POLICY IF EXISTS "bus_routes_insert_policy" ON public.bus_routes;
CREATE POLICY "bus_routes_insert_policy"
ON public.bus_routes FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Política de Actualización (UPDATE) para usuarios autenticados
DROP POLICY IF EXISTS "bus_routes_update_policy" ON public.bus_routes;
CREATE POLICY "bus_routes_update_policy"
ON public.bus_routes FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Política de Eliminación (DELETE) exclusiva para administradores
DROP POLICY IF EXISTS "bus_routes_delete_admin_policy" ON public.bus_routes;
CREATE POLICY "bus_routes_delete_admin_policy"
ON public.bus_routes FOR DELETE
TO authenticated
USING (is_admin());
