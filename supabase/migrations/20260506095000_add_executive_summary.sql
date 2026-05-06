ALTER TABLE public.project_metrics ADD COLUMN IF NOT EXISTS executive_summary TEXT;

CREATE OR REPLACE FUNCTION public.increment_view_count(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.shared_reports
  SET view_count = view_count + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
