-- Let the paragraph be generated on demand, and let a dead attempt be retried.
--
-- It was written in the background after submit-test had already answered,
-- under EdgeRuntime.waitUntil. That turned out to be unreliable for work this
-- long: the model thinks before it writes and a run takes around 36 seconds,
-- and the isolate is not guaranteed to live that far past its response. Four
-- test submissions in a row gave two done, one failed and one stuck on
-- pending, which is the worst of the three because nothing ever retries it.
--
-- Generation moves into get-report-ai, which the report page already polls.
-- The browser holds the request while the paragraph is written, so the work
-- happens inside a request that something is waiting on rather than after one.
--
-- ai_status gains 'generating', claimed atomically so two open tabs produce one
-- paragraph and not two. ai_started_at is when the claim was made: without it a
-- function that dies mid-generation leaves the row marked generating for ever
-- and the person never gets their paragraph, even on a later visit.

alter table tests add column if not exists ai_started_at timestamptz;

comment on column tests.ai_status is
  'pending | generating | done | failed. generating is a claim held by one
   get-report-ai call; ai_started_at says when, so a stalled claim can be
   taken over. See migration 20261030210000.';
