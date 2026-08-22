CREATE OR REPLACE FUNCTION public.sync_admireme_revenue_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date := COALESCE(NEW.date, OLD.date);
  v_total numeric;
  v_data jsonb;
BEGIN
  IF lower(COALESCE(NEW.platform, OLD.platform, '')) <> 'admireme' THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(sum(COALESCE(ad.total, 0)), 0)
    INTO v_total
  FROM accounts_data ad
  WHERE ad.platform = 'admireme' AND ad.date = v_date;

  SELECT COALESCE(jsonb_object_agg(x.uname, x.amts), '{}'::jsonb)
    INTO v_data
  FROM (
    SELECT lower(COALESCE(NULLIF(a.subfolder_name, ''), NULLIF(a.folder_name, ''), split_part(a.account_email, '@', 1))) AS uname,
           COALESCE(jsonb_agg((e->>'amount')::numeric), '[]'::jsonb) AS amts
    FROM accounts_data ad
    JOIN accounts a ON a.id = ad.account_id
    LEFT JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(ad.amounts) = 'array' THEN ad.amounts ELSE '[]'::jsonb END
    ) e ON true
    WHERE ad.platform = 'admireme' AND ad.date = v_date
    GROUP BY 1
  ) x
  WHERE x.uname IS NOT NULL;

  INSERT INTO revenue_report (date, platform, revenue_today, data)
  VALUES (v_date, 'admireme'::platform, v_total, v_data)
  ON CONFLICT (date, platform) DO UPDATE
    SET revenue_today = EXCLUDED.revenue_today,
        data = EXCLUDED.data;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admireme_revenue_report ON public.accounts_data;
CREATE TRIGGER trg_sync_admireme_revenue_report
AFTER INSERT OR UPDATE ON public.accounts_data
FOR EACH ROW EXECUTE FUNCTION public.sync_admireme_revenue_report();