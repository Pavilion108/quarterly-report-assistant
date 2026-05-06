
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'member');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT, email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, quarter TEXT NOT NULL, client TEXT,
  start_date DATE, end_date DATE, finalize_date DATE,
  manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  template_path TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE OR REPLACE FUNCTION public.is_project_member(_project_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_members WHERE project_id=_project_id AND user_id=_user_id)
    OR EXISTS (SELECT 1 FROM public.projects WHERE id=_project_id AND manager_id=_user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_project_manager(_project_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id=_project_id AND manager_id=_user_id)
$$;

CREATE TABLE public.focus_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tasks TEXT NOT NULL, progress_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  focus_area_id UUID REFERENCES public.focus_areas(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  original_text TEXT NOT NULL,
  rewritten_text TEXT, accepted_text TEXT,
  included_in_report BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.observation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES public.observations(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL, snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('draft','final')),
  file_path TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid()=id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid()=id);

CREATE POLICY "roles_read" ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "projects_view" ON public.projects FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR manager_id=auth.uid()
    OR EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id=projects.id AND pm.user_id=auth.uid()));
CREATE POLICY "projects_create" ON public.projects FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')) AND manager_id=auth.uid());
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
  USING (manager_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "members_view" ON public.project_members FOR SELECT TO authenticated
  USING (public.is_project_member(project_id,auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "members_manage" ON public.project_members FOR ALL TO authenticated
  USING (public.is_project_manager(project_id,auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_project_manager(project_id,auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "focus_view" ON public.focus_areas FOR SELECT TO authenticated USING (public.is_project_member(project_id,auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "focus_manage" ON public.focus_areas FOR ALL TO authenticated
  USING (public.is_project_manager(project_id,auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_project_manager(project_id,auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "logs_view" ON public.daily_logs FOR SELECT TO authenticated USING (public.is_project_member(project_id,auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "logs_insert" ON public.daily_logs FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND public.is_project_member(project_id,auth.uid()));
CREATE POLICY "logs_update_own" ON public.daily_logs FOR UPDATE TO authenticated USING (user_id=auth.uid());
CREATE POLICY "logs_delete_own" ON public.daily_logs FOR DELETE TO authenticated USING (user_id=auth.uid());

CREATE POLICY "obs_view" ON public.observations FOR SELECT TO authenticated USING (public.is_project_member(project_id,auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "obs_insert" ON public.observations FOR INSERT TO authenticated WITH CHECK (author_id=auth.uid() AND public.is_project_member(project_id,auth.uid()));
CREATE POLICY "obs_update" ON public.observations FOR UPDATE TO authenticated USING (author_id=auth.uid() OR public.is_project_manager(project_id,auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "obs_delete" ON public.observations FOR DELETE TO authenticated USING (author_id=auth.uid() OR public.is_project_manager(project_id,auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "hist_view" ON public.observation_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.observations o WHERE o.id=observation_id AND public.is_project_member(o.project_id,auth.uid())) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "hist_insert" ON public.observation_history FOR INSERT TO authenticated WITH CHECK (actor_id=auth.uid());

CREATE POLICY "snap_view" ON public.report_snapshots FOR SELECT TO authenticated USING (public.is_project_member(project_id,auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "snap_insert" ON public.report_snapshots FOR INSERT TO authenticated WITH CHECK (
  created_by=auth.uid() AND public.is_project_member(project_id,auth.uid())
  AND (kind='draft' OR public.is_project_manager(project_id,auth.uid()) OR public.has_role(auth.uid(),'admin')));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_observations_updated BEFORE UPDATE ON public.observations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.projects ADD COLUMN template_data TEXT;
ALTER TABLE public.projects ADD COLUMN template_filename TEXT;
ALTER TABLE public.report_snapshots ADD COLUMN file_data TEXT;
ALTER TABLE public.report_snapshots ALTER COLUMN file_path DROP NOT NULL;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_project_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_project_manager(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_manager(UUID, UUID) TO authenticated;
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
ALTER TABLE public.project_metrics ADD COLUMN IF NOT EXISTS executive_summary TEXT;

CREATE OR REPLACE FUNCTION public.increment_view_count(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.shared_reports
  SET view_count = view_count + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
