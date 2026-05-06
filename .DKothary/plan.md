# DKC Quarterly Report Tracker

A web app where Managers run quarterly projects, Members log daily progress and observations, AI rewrites observations in a soft auditor tone, and a PowerPoint report is auto-drafted continuously and downloadable any time.

## Roles

- **IT Admin** — Adds/removes users, uploads/replaces the per-project PPT template, manages workspace settings.
- **Manager (CA)** — Creates projects, defines focus areas, adds members, finalizes the report (stamps it as "Final PPT").
- **Member (Auditor)** — Added to projects; logs daily tasks/progress; adds observation points; uses AI rewrite; downloads PPT any time.

## Core Flows

### 1. Project setup (Manager)
- Create a project with name, quarter (e.g. Q2 2026), client/entity, and start/end dates.
- Define **focus areas** the quarter should cover (e.g. "Internal Controls", "Tax Compliance").
- Add team members from the user directory.
- IT Admin (or Manager, if allowed) uploads a `.pptx` template for that project. Template is stored and used as the base for the auto-draft.
- Set the planned **finalization date** for the report.

### 2. Daily usage (Members)
- Dashboard shows projects the user belongs to.
- Inside a project: a **Daily Tracker** to log tasks done today + progress notes (date, hours/effort optional, status).
- An **Observations** feed where any member adds report-worthy points, tagged to a focus area.
- Every observation entry shows: author, timestamp, focus area, original text, AI-rewritten version (if generated), and edit history. All members on the project see the full feed continuously.

### 3. AI rewrite (on-demand)
- Each observation has a **"Rewrite (auditor tone)"** button.
- AI rewrites the point in a soft-toned, internal-auditor voice (constructive, factual, non-accusatory).
- Original is always preserved; user can accept, edit further, or discard the suggestion.
- Only the accepted version flows into the PPT; original stays visible in the feed for audit trail.

### 4. Live PPT draft + finalization
- The system continuously rebuilds a draft `.pptx` based on the project's template, inserting observations grouped by focus area in the chosen order.
- Manager can **reorder points, edit text, exclude points**, and adjust grouping in a report-builder view.
- **Any member can download the current PPT at any time** (filename: `DKC_<Project>_<Quarter>_Draft.pptx`).
- On the finalization date, Manager clicks **Finalize** → snapshot is saved and downloadable as `DKC_<Project>_<Quarter>_FINAL.pptx` (Final tag visible in UI and filename).

## Pages

- `/login`, `/signup`
- `/dashboard` — user's projects
- `/projects/new` (Manager)
- `/projects/$id` — overview, members, focus areas, finalization date
- `/projects/$id/tracker` — daily task log
- `/projects/$id/observations` — feed + add/rewrite
- `/projects/$id/report` — report builder, reorder, download draft / final
- `/admin/users`, `/admin/templates` (IT Admin)

## Data Model (Lovable Cloud)

- `profiles` (id, name, email)
- `user_roles` (user_id, role: admin | manager | member) — separate table
- `projects` (id, name, quarter, client, start_date, end_date, finalize_date, manager_id, template_path, status)
- `project_members` (project_id, user_id)
- `focus_areas` (id, project_id, name, order)
- `daily_logs` (id, project_id, user_id, log_date, tasks, progress_notes)
- `observations` (id, project_id, focus_area_id, author_id, original_text, rewritten_text, accepted_text, included_in_report, sort_order, created_at, updated_at)
- `observation_history` (id, observation_id, action, actor_id, snapshot, created_at) — for "who added what when"
- `report_snapshots` (id, project_id, kind: draft | final, file_path, created_at, created_by)
- Storage buckets: `ppt-templates`, `report-outputs`

RLS: members see only projects they belong to; only Manager of a project can finalize; only Admin can manage users/templates.

## Technical Notes

- TanStack Start + Lovable Cloud (Supabase) for auth, DB, storage.
- AI rewrite via Lovable AI Gateway (`google/gemini-3-flash-preview`) called from a `createServerFn` with a fixed system prompt enforcing soft auditor tone.
- PPT generation server-side using `pptxgenjs` (pure JS, Worker-compatible) — loads the project's template metadata, then builds a new deck programmatically, inserting accepted observations grouped by focus area. Stored to the `report-outputs` bucket; signed URL returned for download.
- Final snapshot is an immutable copy with `FINAL` tag in filename and DB record.
- Observation history table provides full audit trail (author, timestamp, original vs rewritten vs final).

## Out of Scope (v1)

- Email/Slack notifications
- Comments/threads on observations
- Multi-quarter rollups
- Rich PPT theming beyond what the uploaded template provides
