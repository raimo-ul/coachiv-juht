-- Which level bands a test's report is read against.
--
-- v1 called an action "sageli" from 4,5 up, and 102 of the first 122 tests
-- reached it. v2 moves the line to 5,0 so the word means what the sprint means
-- by it: on most working days.
--
-- The version is written on the row rather than decided when the report is
-- opened. Someone who took the test in November and opens their report in
-- March sees the same words they saw the first time; the bands move only for
-- tests taken after this.

alter table tests
  add column if not exists scoring_version text not null default 'v1';

comment on column tests.scoring_version is
  'Which level bands the report uses: v1 for tests taken before 15.11, v2 after.';
