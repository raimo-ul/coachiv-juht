-- The self-assessment, lifted from AttFocus.
--
-- AttFocus asks three things on the last day of a period, before the report
-- goes out: how attention changed (1-5), how behaviour changed (1-5), and an
-- open question. The two numbers go into the report; the open text goes into
-- the report and into the AI reflection, where it is the one piece of the
-- person's own language the paragraph has to work with.
--
-- AttFocus spreads this over four tables (self_assessment_links,
-- self_assessment_question_defs, self_assessment_responses, plus
-- program_report_links) because it is multi-tenant: teams, members, repeating
-- program runs. Here one enrollment is one person doing it once, so the same
-- three answers are five columns on enrollments. The behaviour is identical:
-- one token, one submission, idempotent.
--
-- Nullable throughout. Someone who does not fill it in still gets a report,
-- the same way AttFocus still sends one.

alter table enrollments
  add column if not exists sa_token        text unique,
  add column if not exists sa_attention    smallint,
  add column if not exists sa_behaviour    smallint,
  add column if not exists sa_open_text    text,
  add column if not exists sa_submitted_at timestamptz;

alter table enrollments
  add constraint enrollments_sa_attention_range
    check (sa_attention is null or sa_attention between 1 and 5),
  add constraint enrollments_sa_behaviour_range
    check (sa_behaviour is null or sa_behaviour between 1 and 5);

comment on column enrollments.sa_token is
  'Minted by dispatch-daily on the last workday, when the self-assessment link goes into the letter.';
comment on column enrollments.sa_submitted_at is
  'Set once. A second submission is refused with 409, as in AttFocus.';
