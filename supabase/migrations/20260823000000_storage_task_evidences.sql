-- ==============================================================================
-- MIGRACIÓN: Configuración Reproducible de Bucket de Storage 'task-evidences'
-- Entorno: Bricklar Gestor Operativo
-- ==============================================================================

-- 1. Crear / Configurar el bucket 'task-evidences' en el esquema storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-evidences',
  'task-evidences',
  true,
  10485760, -- 10 MB límite por archivo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

-- 2. Políticas de Seguridad (RLS) en storage.objects para el bucket 'task-evidences'

-- A) Lectura: Permitir visualización de evidencias para usuarios autenticados y acceso público a través de CDN
DROP POLICY IF EXISTS "Public and authenticated can read task evidences" ON storage.objects;
CREATE POLICY "Public and authenticated can read task evidences"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-evidences');

-- B) Subida / Inserción: Permitir que cualquier usuario autenticado (motorizado o administrador) suba evidencias
DROP POLICY IF EXISTS "Authenticated users can upload task evidences" ON storage.objects;
CREATE POLICY "Authenticated users can upload task evidences"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-evidences'
  AND (auth.role() = 'authenticated')
);

-- C) Eliminación: Solo administradores pueden eliminar evidencias almacenadas
DROP POLICY IF EXISTS "Admins can delete task evidences" ON storage.objects;
CREATE POLICY "Admins can delete task evidences"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-evidences'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('general_admin', 'junior_admin')
  )
);
