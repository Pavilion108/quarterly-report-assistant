
ALTER TABLE public.projects ADD COLUMN template_data TEXT;
ALTER TABLE public.projects ADD COLUMN template_filename TEXT;
ALTER TABLE public.report_snapshots ADD COLUMN file_data TEXT;
ALTER TABLE public.report_snapshots ALTER COLUMN file_path DROP NOT NULL;
