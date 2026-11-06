-- Why someone who asked for the newsletter did not get it.
--
-- Twice now a signup has reported success and subscribed nobody, and both
-- times the reason sat in a log this project cannot read. The consent is
-- already stored on this row; the outcome belongs next to it.
--
-- Null means it worked, or that nobody asked. A string is Smaily's own
-- complaint, kept so the person can be added by hand and the cause fixed.

alter table participants add column if not exists newsletter_error text;

comment on column participants.newsletter_error is
  'Smaily rejection, verbatim. Null when the subscription succeeded or was never attempted.';
