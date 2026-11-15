-- When the trial-day letter went out for this test.
--
-- One letter per person, the workday after they took the test, and never
-- again. The column is the record and the lock at once: a row with a value
-- here is skipped, so the hourly dispatch can run as often as it likes.
--
-- Null means not sent, which covers both "not due yet" and "not eligible",
-- and the dispatch decides which on the facts rather than on a flag.

alter table tests
  add column if not exists trial_sent_at timestamptz;

comment on column tests.trial_sent_at is
  'When the one trial-day letter was sent. Null = never sent. Nobody gets two.';

-- The dispatch asks for unsent tests from a given day, every hour.
create index if not exists tests_trial_pending_idx
  on tests (created_at)
  where trial_sent_at is null;
