-- Which channel brought someone to the test.
--
-- Three columns and no analytics service. The question is narrow: is a
-- newsletter or a LinkedIn post worth writing again. Nothing here follows a
-- person anywhere else, and a direct visit is the null case rather than a
-- category of its own.
--
-- Nullable and added empty. Every test taken before today keeps a null, which
-- reads correctly as "we did not know", not as "direct".

alter table tests
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text;

comment on column tests.utm_source is
  'Lowercase [a-z0-9 _-], max 50. Null means a direct visit or a link without UTM.';

-- The report groups by source, medium and campaign, so the index follows the
-- query rather than the column order.
create index if not exists tests_utm_idx
  on tests (utm_source, utm_medium, utm_campaign);
