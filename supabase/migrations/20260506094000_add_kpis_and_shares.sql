CREATE TABLE public.project_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  revenue NUMERIC DEFAULT 0,
  expenses NUMERIC DEFAULT 0,
  kpi_scorecard JSONB DEFAULT '[]'::jsonb, -- e.g., [{ name: "New users", value: 100, target: 120, status: "Behind" }]
  goals JSONB DEFAULT '[]'::jsonb, -- e.g., [{ title: "Launch V2", achieved: true }]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

CREATE TRIGGER trg_project_metrics_updated BEFORE UPDATE ON public.project_metrics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.project_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_view" ON public.project_metrics FOR SELECT TO authenticated USING (public.is_project_member(project_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "metrics_manage" ON public.project_metrics FOR ALL TO authenticated 
  USING (public.is_project_manager(project_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_project_manager(project_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.shared_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_reports ENABLE ROW LEVEL SECURITY;
-- Shared reports are readable by anyone (anon or authenticated) using the token
CREATE POLICY "shared_reports_read_public" ON public.shared_reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "shared_reports_manage" ON public.shared_reports FOR ALL TO authenticated 
  USING (public.is_project_manager(project_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_project_manager(project_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- We also need to allow public read access to a project if it is shared.
-- Wait, the project itself has to be read!
-- Let's update `projects` policy to allow read if there's a valid unexpired share token.
CREATE POLICY "projects_view_shared" ON public.projects FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_reports sr 
      WHERE sr.project_id = projects.id 
      AND sr.expires_at > now()
    )
  );

-- And the same for metrics, focus_areas, observations!
CREATE POLICY "metrics_view_shared" ON public.project_metrics FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.shared_reports sr WHERE sr.project_id = project_metrics.project_id AND sr.expires_at > now()));

CREATE POLICY "focus_areas_view_shared" ON public.focus_areas FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.shared_reports sr WHERE sr.project_id = focus_areas.project_id AND sr.expires_at > now()));

CREATE POLICY "observations_view_shared" ON public.observations FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.shared_reports sr WHERE sr.project_id = observations.project_id AND sr.expires_at > now()));
