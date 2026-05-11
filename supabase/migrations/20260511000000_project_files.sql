-- Create project_files table for UDIN working file management
CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('word','excel','ppt','pdf','other')),
  audit_type TEXT NOT NULL CHECK (audit_type IN ('Internal Audit','Statutory Audit','IFC Report')),
  financial_year TEXT NOT NULL,
  is_final BOOLEAN DEFAULT FALSE,
  notes TEXT,
  file_data TEXT, -- base64 encoded
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: project members can see files
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_files_select" ON public.project_files
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.projects WHERE manager_id = auth.uid()
    )
  );

CREATE POLICY "project_files_insert" ON public.project_files
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.projects WHERE manager_id = auth.uid()
    )
  );

CREATE POLICY "project_files_update" ON public.project_files
  FOR UPDATE USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND manager_id = auth.uid()
  ));

CREATE POLICY "project_files_delete" ON public.project_files
  FOR DELETE USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND manager_id = auth.uid()
  ));
