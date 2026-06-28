CREATE OR REPLACE FUNCTION public.refresh_profiles_data_today()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := current_date;
  v_from  date := current_date - 3;
  v_count integer := 0;
BEGIN
  WITH days AS (
    SELECT generate_series(v_from, v_today, interval '1 day')::date AS d
  ),
  asg AS (
    SELECT
      d.d AS date,
      aa.account_id,
      COALESCE(
        (SELECT p.telegram_id FROM public.profiles p WHERE p.id = aa.profile_id),
        (SELECT p.telegram_id FROM public.profiles p WHERE p.user_id = aa.user_id ORDER BY p.created_at NULLS LAST LIMIT 1)
      ) AS telegram_id
    FROM days d
    JOIN public.account_assignments aa
      ON aa.start_date <= d.d
     AND (aa.end_date IS NULL OR aa.end_date >= d.d)
  ),
  filtered AS (
    SELECT date, account_id, telegram_id
    FROM asg
    WHERE telegram_id IS NOT NULL AND telegram_id <> ''
  ),
  daily AS (
    SELECT
      f.telegram_id,
      f.date,
      ad.account_id,
      ad.model_id,
      a.platform,
      m.name AS model_name,
      COALESCE(ad.total, 0)::numeric AS total,
      COALESCE(ad.mass_dms, 0)::int AS mass_dms,
      COALESCE(ad.unread_chats, 0)::int AS unread_chats,
      COALESCE(ad.oldest_chat, 0)::int AS oldest_chat
    FROM filtered f
    JOIN public.accounts_data ad ON ad.account_id = f.account_id AND ad.date = f.date
    LEFT JOIN public.accounts a ON a.id = ad.account_id
    LEFT JOIN public.models m ON m.id = ad.model_id
  ),
  agg AS (
    SELECT
      d.telegram_id,
      d.date,
      SUM(d.total)::numeric AS revenue,
      SUM(d.mass_dms)::int AS mass_dm,
      SUM(d.unread_chats)::int AS unread_chats,
      MAX(d.oldest_chat)::int AS oldest_chat,
      (
        SELECT jsonb_agg(DISTINCT jsonb_build_object(
          'model_id', d2.model_id,
          'name', d2.model_name,
          'account_id', d2.account_id,
          'platform', d2.platform,
          'total', d2.total
        ))
        FROM daily d2
        WHERE d2.telegram_id = d.telegram_id AND d2.date = d.date
      ) AS models
    FROM daily d
    GROUP BY d.telegram_id, d.date
  ),
  ups AS (
    INSERT INTO public.profiles_data (telegram_id, date, revenue, mass_dm, unread_chats, oldest_chat, models, updated_at)
    SELECT telegram_id, date, revenue, mass_dm, unread_chats, oldest_chat, COALESCE(models, '[]'::jsonb), now()
    FROM agg
    ON CONFLICT (telegram_id, date) DO UPDATE SET
      revenue = EXCLUDED.revenue,
      mass_dm = EXCLUDED.mass_dm,
      unread_chats = EXCLUDED.unread_chats,
      oldest_chat = EXCLUDED.oldest_chat,
      models = EXCLUDED.models,
      updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ups;

  RETURN v_count;
END;
$function$;