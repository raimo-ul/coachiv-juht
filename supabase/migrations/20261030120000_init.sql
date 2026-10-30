-- SPEC 6, in full.
--
-- All four tables are created here, not only the two stage A needs. The schema
-- is already decided and splitting it would mean a second migration later that
-- adds columns the first one could have carried, for no gain.
--
-- Row level security is on everywhere and no policy is ever created. That is
-- not an oversight: SPEC 3 says every query runs server side with the service
-- role, which bypasses RLS. With RLS on and no policies, anon and authenticated
-- can reach nothing even if the anon key leaks out of a browser bundle.
--
-- Grants are made explicitly rather than relying on Supabase's automatic grant
-- for new tables in public, which stops applying on 30 October 2026.

create extension if not exists citext;

create table participants (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  locale text not null default 'et',
  timezone text not null default 'Europe/Tallinn',
  newsletter_consent boolean not null default false,
  newsletter_consent_at timestamptz,
  created_at timestamptz not null default now()
);

create table tests (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  items_version text not null,               -- 'v1'
  locale text not null,
  answers jsonb not null,                    -- {"T1":4,...,"U9":2} raw 1-6
  scores jsonb not null,                     -- {"juhendamine":4.33,...} after reversal
  report_token text not null unique,
  ai_paragraph text,
  ai_status text not null default 'pending', -- pending | done | failed
  created_at timestamptz not null default now()
);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  test_id uuid not null references tests(id),
  status text not null default 'active',     -- active | finished
  start_date date not null,                  -- the participant's local date
  end_date date not null,
  stripe_session_id text not null unique,    -- the idempotency key
  amount_total integer not null,             -- cents, 0 with a full-discount code
  promo_code text,
  final_token text unique,
  final_report jsonb,
  final_sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- One programme at a time. A partial index, so a finished enrolment does not
-- block the next one.
create unique index one_active_enrollment on enrollments(participant_id) where status = 'active';

create table daily_answers (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  day date not null,                         -- the participant's local date
  day_index integer not null,                -- 1..15
  q1 boolean, q2 boolean, q3 boolean, q4 boolean, q5 boolean, q6 boolean,
  sent_at timestamptz not null default now(),
  answered_at timestamptz,
  unique (enrollment_id, day)
);

-- Lookups the daily engine and the report pages make on every request.
create index tests_participant_created on tests(participant_id, created_at desc);
create index enrollments_active_dates on enrollments(status, end_date);
create index daily_answers_enrollment_day on daily_answers(enrollment_id, day);

alter table participants  enable row level security;
alter table tests         enable row level security;
alter table enrollments   enable row level security;
alter table daily_answers enable row level security;

grant select, insert, update, delete on participants  to service_role;
grant select, insert, update, delete on tests         to service_role;
grant select, insert, update, delete on enrollments   to service_role;
grant select, insert, update, delete on daily_answers to service_role;

revoke all on participants  from anon, authenticated;
revoke all on tests         from anon, authenticated;
revoke all on enrollments   from anon, authenticated;
revoke all on daily_answers from anon, authenticated;
