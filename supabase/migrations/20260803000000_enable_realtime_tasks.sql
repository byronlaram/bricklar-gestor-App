-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRACIÓN SQL: Configuración de REPLICA IDENTITY y Publicación Supabase Realtime
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Habilitar REPLICA IDENTITY FULL para enviar todas las columnas en payload.old durante UPDATE
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.task_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 2. Asegurar que las tablas estén en la publicación supabase_realtime
DO $$
BEGIN
  -- Agregar public.tasks a supabase_realtime si no está presente
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;

  -- Agregar public.task_assignments a supabase_realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'task_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignments;
  END IF;

  -- Agregar public.notifications a supabase_realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
