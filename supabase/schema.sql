-- Kindra prototype schema. Run once in the Supabase SQL editor.
-- The app seeds fictional demo data automatically the first time it finds an empty students table.
-- The app connects with the service role key from server-side route handlers only.
-- Row Level Security is enabled with no policies, so the anon key cannot read anything.

create table if not exists students (
  id text primary key,
  name text not null,
  grade text not null,
  section text not null,
  adviser_id text not null,                 -- assignment-based access
  sensitivity text not null default 'Standard' check (sensitivity in ('Standard', 'Restricted')),
  aliases text[] not null default '{}',     -- used for redaction before AI calls
  guardian_name text not null,
  guardian_phone text not null
);

create table if not exists cases (
  id text primary key,
  student_id text not null references students(id),   -- the one adviser-confirmed student
  case_type text not null,
  conference_at timestamptz not null,
  documented_at timestamptz,                            -- null = report pending; drives the 24-hour metric
  status text not null default 'Open' check (status in ('Open', 'Closed')),
  status_note text not null default '',
  next_review date,
  source_type text check (source_type in ('written', 'audio', 'manual')),
  prepared_by text,
  reviewed_by text,
  report jsonb,                                         -- formal report sections with source citations
  source_paragraphs jsonb not null default '[]'         -- notes/transcript text; audio is never stored
);

create table if not exists action_items (
  id text primary key,
  case_id text not null references cases(id),
  student_id text not null references students(id),
  action text not null,
  owner text not null default '',
  due_date date,
  due_text text not null default '',
  status text not null default 'Open' check (status in ('Open', 'In progress', 'Done', 'Blocked')),
  src jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  updated_by text not null
);

create table if not exists contact_changes (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references students(id),
  old_phone text not null,
  new_phone text not null,
  changed_by text not null,
  changed_at timestamptz not null default now()
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  student_id text,
  detail text not null default ''
);

-- "Act faster": urgent alerts raised by the adviser for the guidance counselor and the family.
create table if not exists urgent_alerts (
  id text primary key,
  student_id text not null references students(id),
  case_id text references cases(id),
  concern text not null check (concern in ('self_harm', 'depression', 'mental_health', 'family', 'disengagement')),
  note text not null default '',                        -- shown in Kindra only; never sent by SMS
  raised_by text not null,
  raised_at timestamptz not null default now(),
  respond_by timestamptz not null,
  acknowledged_at timestamptz,
  acknowledged_by text,
  escalated_at timestamptz,                             -- set once when the guidance head is notified
  guardian_contact text not null check (guardian_contact in ('pending', 'sent', 'withheld')),
  guardian_decision_by text,
  guardian_decision_at timestamptz,
  resolved_at timestamptz,
  resolved_by text
);

-- Outbox: every SMS / call script the app produced. Delivery is simulated in the prototype.
create table if not exists alert_messages (
  id text primary key,
  alert_id text not null references urgent_alerts(id),
  student_id text not null references students(id),
  recipient text not null check (recipient in ('counselor', 'guardian', 'guidance_head')),
  channel text not null check (channel in ('sms', 'call')),
  to_name text not null,
  to_phone text not null,
  text text not null,                                   -- callback request + reference only, no case details
  delivery text not null default 'simulated' check (delivery in ('simulated')),
  at timestamptz not null default now()
);

create index if not exists cases_student_idx on cases(student_id);
create index if not exists items_student_idx on action_items(student_id);
create index if not exists audit_student_idx on audit_log(student_id);
create index if not exists alerts_open_idx on urgent_alerts(raised_at) where resolved_at is null;
create index if not exists messages_alert_idx on alert_messages(alert_id);

alter table students enable row level security;
alter table cases enable row level security;
alter table action_items enable row level security;
alter table contact_changes enable row level security;
alter table audit_log enable row level security;
alter table urgent_alerts enable row level security;
alter table alert_messages enable row level security;
