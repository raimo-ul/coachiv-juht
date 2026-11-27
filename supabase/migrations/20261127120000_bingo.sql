-- The year-end bingo campaign's only table.
--
-- It exists for one reason: to stop a person getting two summaries. Tally
-- retries a webhook after 5 min, 30 min, 1 h, 6 h and 1 day, and its signature
-- carries no timestamp, so a captured request stays valid forever. The primary
-- key is the lock: bingo-submit inserts before it sends anything, and a second
-- attempt fails on 23505 and stops there.
--
-- It holds no personal data. The responses themselves live in Tally, and the
-- name, address and free text are used once to write the summary and then
-- dropped. result_type and marked_count are here so the campaign can be counted
-- without exporting Tally.

create table if not exists bingo_submissions (
  -- data.responseId from the Tally payload, not eventId: the response is the
  -- thing that must happen once, and its id survives a retry.
  tally_response_id text primary key,
  created_at        timestamptz not null default now(),
  result_type       text,
  marked_count      smallint,
  -- Smaily's own complaint, verbatim, as on participants.newsletter_error.
  -- Null means it worked, or that nobody asked.
  newsletter_error  text
);

comment on table bingo_submissions is
  'One row per Tally response. The primary key is the idempotency lock for bingo-submit.';
comment on column bingo_submissions.result_type is
  'LUMEHELVES, GLOGIKEETJA, POHJAPODER or PAKAPIKK.';
comment on column bingo_submissions.marked_count is
  'How many of the nine squares were ticked, 0 to 9.';
comment on column bingo_submissions.newsletter_error is
  'Smaily rejection, verbatim. Null when the subscription succeeded or was never attempted.';

-- Grants are made explicitly rather than relying on Supabase's automatic grant
-- for new tables in public, which stops applying on 30 October 2026.
alter table bingo_submissions enable row level security;

grant select, insert, update, delete on bingo_submissions to service_role;

revoke all on bingo_submissions from anon, authenticated;
