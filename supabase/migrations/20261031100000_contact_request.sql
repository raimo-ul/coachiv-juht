-- "Tahan, et Raimo võtaks minuga ühendust."
--
-- A checkbox at the foot of the report, from Raimo's design. It is a request
-- for contact about coaching or training, which is a different thing from the
-- newsletter consent already on participants: that one is marketing the person
-- opted into, this one is a person asking to be called back.
--
-- Kept on participants rather than on the test, because the request is about
-- the person and not about one sitting of the test. Someone who ticks it on a
-- second report has not made a second request.
--
-- Raimo reads this from the Supabase table editor; there is no admin view in
-- this version. A plain boolean with a timestamp is what makes that readable.

alter table participants
  add column if not exists contact_requested boolean not null default false,
  add column if not exists contact_requested_at timestamptz;

comment on column participants.contact_requested is
  'Asked to be contacted about coaching or training, from the report page. Not
   the newsletter: that is newsletter_consent.';

create index if not exists participants_contact_requested
  on participants (contact_requested_at desc) where contact_requested;
