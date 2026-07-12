
DROP FUNCTION IF EXISTS public.auto_reject_stale_model_requests();

CREATE OR REPLACE FUNCTION public.auto_reject_stale_model_requests()
RETURNS TABLE(rejected_count integer, reason_age integer, reason_followups integer, models_semi integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_age_reason text := 'Automatisch abgelehnt: Anfrage ist älter als 2 Wochen und wurde nicht fertiggestellt.';
  v_fup_reason text := 'Model ist aktuell nicht aktiv oder antwortet nicht – Anfrage wurde nach 2 Follow-ups automatisch abgelehnt.';
  v_fup_ids uuid[];
  v_age_ids uuid[];
  v_age_count int := 0;
  v_fup_count int := 0;
  v_semi_count int := 0;
BEGIN
  SELECT COALESCE(array_agg(r.id), '{}'::uuid[]) INTO v_fup_ids
  FROM public.model_requests r
  JOIN (
    SELECT request_id, count(*) AS n, max(sent_at) AS last_sent
    FROM public.model_request_followups
    GROUP BY request_id
  ) f ON f.request_id = r.id
  WHERE r.status NOT IN ('rejected','archived','completed','done')
    AND f.n >= 2
    AND f.last_sent < now() - interval '7 days';

  SELECT COALESCE(array_agg(r.id), '{}'::uuid[]) INTO v_age_ids
  FROM public.model_requests r
  WHERE r.status NOT IN ('rejected','archived','completed','done')
    AND r.created_at < now() - interval '14 days'
    AND NOT (r.id = ANY(v_fup_ids));

  IF array_length(v_fup_ids, 1) IS NOT NULL THEN
    UPDATE public.model_requests
       SET status = 'rejected',
           admin_comment = COALESCE(NULLIF(admin_comment, ''), v_fup_reason)
     WHERE id = ANY(v_fup_ids);
    v_fup_count := array_length(v_fup_ids, 1);
  END IF;

  IF array_length(v_age_ids, 1) IS NOT NULL THEN
    UPDATE public.model_requests
       SET status = 'rejected',
           admin_comment = COALESCE(NULLIF(admin_comment, ''), v_age_reason)
     WHERE id = ANY(v_age_ids);
    v_age_count := array_length(v_age_ids, 1);
  END IF;

  WITH auto_rejects AS (
    SELECT r.model_id, count(*) AS n
    FROM public.model_requests r
    WHERE r.model_id IS NOT NULL
      AND r.status = 'rejected'
      AND (r.admin_comment = v_age_reason OR r.admin_comment = v_fup_reason)
    GROUP BY r.model_id
    HAVING count(*) >= 2
  ),
  upd AS (
    UPDATE public.models m
       SET model_status = 'semi'
      FROM auto_rejects ar
     WHERE m.id = ar.model_id
       AND m.model_status = 'active'
    RETURNING m.id
  )
  SELECT count(*) INTO v_semi_count FROM upd;

  RETURN QUERY SELECT (v_age_count + v_fup_count), v_age_count, v_fup_count, v_semi_count;
END;
$$;

SELECT public.auto_reject_stale_model_requests();
