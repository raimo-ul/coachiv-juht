-- Which channels bring people who finish the test, and which bring people who
-- then start the programme.
--
-- Paste into the Supabase SQL editor. Nothing is aggregated anywhere else:
-- this file is the whole reporting layer, and there is no analytics service
-- and no tracking cookie behind it.
--
-- A row is a finished test, because that is the first moment a channel can be
-- credited with anything. Somebody who opened the page and left is not in this
-- table at all, so this measures finishers, not visits.
--
-- "otse" is a direct visit or a link without UTM. It is kept as its own row
-- rather than dropped: it is usually the largest one, and hiding it would make
-- every named channel look bigger than it is.
--
-- Free enrolments are counted apart. A company that bought twenty seats sends
-- its people through one link, and folding those into the paid number would
-- read as a channel that sells well when the selling happened in a meeting.

select
  coalesce(t.utm_source, 'otse')            as kanal,
  coalesce(t.utm_medium, '-')               as liik,
  coalesce(t.utm_campaign, '-')             as kampaania,

  count(*)                                   as teste,

  count(e.id)                                as alustas_programmi,
  count(e.id) filter (where e.amount_total = 0)  as neist_ettevotte_koodiga,
  count(e.id) filter (where e.amount_total > 0)  as neist_maksis_ise,

  round(100.0 * count(e.id) / nullif(count(*), 0))               as alustas_pct,
  round(100.0 * count(e.id) filter (where e.amount_total > 0)
        / nullif(count(*), 0))                                    as maksis_pct,

  min(t.created_at)::date                    as esimene,
  max(t.created_at)::date                    as viimane

from tests t
-- Through the test the button was pressed on, so a channel is credited with
-- the sale it started rather than with a later test by the same person.
left join enrollments e on e.test_id = t.id

group by 1, 2, 3
order by teste desc, kanal, liik;
