-- How many times the report paragraph has been attempted.
--
-- Until now a failed paragraph was final: get-report-ai answered "failed"
-- straight away on every later request, so 29 of the first 122 reports had a
-- hole in them that reloading could never fill. Retrying all 29 by hand
-- succeeded, which says the failures were one-off rather than caused by those
-- people's answers.
--
-- The counter is what keeps the retry from becoming a loop. A paragraph that
-- genuinely cannot be written stops after MAX_ATTEMPTS instead of calling
-- Anthropic again on every page load.

alter table tests
  add column if not exists ai_attempts integer not null default 0;

comment on column tests.ai_attempts is
  'Attempts at the AI paragraph. get-report-ai stops retrying a failed row at 3.';
