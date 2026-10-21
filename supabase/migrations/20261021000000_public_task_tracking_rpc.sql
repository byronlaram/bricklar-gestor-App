-- ==============================================================================
-- MIGRATION: 20261021000000_public_task_tracking_rpc.sql
-- Provee RPCs con SECURITY DEFINER para consulta pública y feedback de clientes
-- sin romper el aislamiento RLS estricto de la tabla tasks.
-- ==============================================================================

-- 1. Función para obtener datos públicos de seguimiento de una tarea
CREATE OR REPLACE FUNCTION public.get_public_task_tracking(p_task_code_or_id text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task JSONB;
  v_clean_code text;
  v_is_uuid BOOLEAN;
BEGIN
  v_clean_code := TRIM(p_task_code_or_id);
  
  IF v_clean_code IS NULL OR v_clean_code = '' THEN
    RETURN NULL;
  END IF;

  v_is_uuid := v_clean_code ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  SELECT JSONB_BUILD_OBJECT(
    'id', t.id,
    'code', t.code,
    'title', t.title,
    'status', t.status,
    'priority', t.priority,
    'task_type', t.task_type,
    'scheduled_date', t.scheduled_date,
    'address', t.address,
    'latitude', t.latitude,
    'longitude', t.longitude,
    'contact_name', t.contact_name,
    'phone', t.phone,
    'whatsapp', t.whatsapp,
    'requires_collection', COALESCE(t.requires_collection, false),
    'expected_collection_amount', t.expected_collection_amount,
    'expected_collection_currency', t.expected_collection_currency,
    'created_at', t.created_at,
    'completed_at', t.completed_at,
    'evidence_url', t.evidence_url,
    'metadata', t.metadata,
    'courier', CASE 
      WHEN p.id IS NOT NULL THEN JSONB_BUILD_OBJECT(
        'id', p.id,
        'full_name', COALESCE(p.full_name, p.display_name, 'Motorizado'),
        'display_name', p.display_name,
        'phone', p.phone,
        'avatar_url', p.avatar_url
      )
      ELSE NULL
    END
  ) INTO v_task
  FROM public.tasks t
  LEFT JOIN public.profiles p ON p.id = t.assigned_courier_id
  WHERE (
    (v_is_uuid AND t.id::text = v_clean_code)
    OR (LOWER(TRIM(t.code)) = LOWER(v_clean_code))
  )
  LIMIT 1;

  RETURN v_task;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_task_tracking(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_task_tracking(text) TO anon;

-- 2. Función para registrar calificación y feedback del cliente de forma pública
CREATE OR REPLACE FUNCTION public.submit_public_task_feedback(
  p_task_code_or_id text,
  p_rating integer,
  p_comment text DEFAULT NULL,
  p_tags text[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id UUID;
  v_current_meta JSONB;
  v_clean_code text;
  v_is_uuid BOOLEAN;
BEGIN
  v_clean_code := TRIM(p_task_code_or_id);
  
  IF v_clean_code IS NULL OR v_clean_code = '' THEN
    RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'Código de tarea requerido.');
  END IF;

  v_is_uuid := v_clean_code ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  SELECT id, COALESCE(metadata, '{}'::jsonb)
  INTO v_task_id, v_current_meta
  FROM public.tasks
  WHERE (
    (v_is_uuid AND id::text = v_clean_code)
    OR (LOWER(TRIM(code)) = LOWER(v_clean_code))
  )
  LIMIT 1;

  IF v_task_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'No se encontró la entrega para calificar.');
  END IF;

  UPDATE public.tasks
  SET metadata = jsonb_set(
    v_current_meta,
    '{customer_feedback}',
    JSONB_BUILD_OBJECT(
      'rating', GREATEST(1, LEAST(5, COALESCE(p_rating, 5))),
      'comment', NULLIF(TRIM(p_comment), ''),
      'tags', to_jsonb(COALESCE(p_tags, '{}'::text[])),
      'submitted_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  )
  WHERE id = v_task_id;

  RETURN JSONB_BUILD_OBJECT('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_task_feedback(text, integer, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_task_feedback(text, integer, text, text[]) TO anon;
