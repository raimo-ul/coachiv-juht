# Coachiv juht · kontseptsioon ja ehitus v2.0

Kuupäev: 01.11.2026 · Omanik: Raimo Ülavere (Mindsweeper OÜ) · Ehitaja: Claude Code

See fail kirjeldab, **mis on ehitatud ja miks**. v1.0 oli ehitusjuhis, kirjutatud 30.10 enne tööd; mitu selle eeldust osutus töö käigus valeks ja need on siin parandatud. Kus v2.0 erineb v1.0-st, on põhjus kirjas kohapeal või failis `DECISIONS.md`.

Kõik kasutajale nähtavad tekstid on failis `content/et.json`. Koodi ei kirjutata ühtegi kasutajale nähtavat lauset.

Veel ehitamata asju selles failis ei ole.

---

## 1. Toode ühe lõiguna

Tasuta veebitest (18 väidet), mis annab juhile kohe raporti tema coachiva juhtimise kohta: 3 uskumust ja 3 tegevust. Raporti lõpus on kolme nädala programm (15 € koos käibemaksuga): igal tööpäeval tuleb kiri, mille link viib lehele kuue jah/ei küsimusega. Viimasel päeval küsitakse lisaks enesehinnang. Järgmisel tööpäeval tuleb lõpuraport. Ostuviise on kaks: juht maksab ise Stripe'iga või kasutab ettevõtte 100% sooduskoodi. Kõik juhid läbivad sama teekonna ja alustavad ning lõpetavad oma ajal. Admin-vaadet, sisselogimist ja meeskondi ei ole.

## 2. Mida teadlikult ei ehitata

- Kasutajakontod, sisselogimine, paroolid. Juht kasutab salajasi linke.
- Admin-vaade. Raimo vaatab andmeid Supabase'i ja Stripe'i töölaualt.
- Meeskonnad, ühine algus, koondraportid, ettevõtte vaade. Grupihuvi korral on raportis `mailto:` Raimole, mitte funktsionaalsus.
- Arhetüübid, tüübid, üldskoor.
- Kontekstiküsimus ja alluvate arvu küsimus.
- Ingliskeelne sisu (struktuur toetab, vt punkt 9).
- „Beta" silt kuskil kasutajale nähtavas kohas.
- Analüütika ja jälgimisküpsised.
- **Kordustesti kutse lõpukirjas.** v1.0 §5.1 p10 nägi seda ette. Raimo otsus 31.10: kolme nädala järel uut testi ei pakuta.
- **Arengu mõõtmine.** Vt punkt 11.

## 3. Arhitektuur

**See on suurim erinevus v1.0-st.** v1.0 kirjeldas Next.js API-marsruute (`/api/test`, `/api/checkout`, `/api/answer`, `/api/cron/*`) ja Verceli Croni. Ühtegi neist ei ole. Raimo otsus 30.10: taust elab Supabase'is, nagu kõigis tema teistes projektides.

| Osa | Valik |
|---|---|
| Rakendus | Next.js 16 (App Router, TypeScript) Vercelis. **Ei hoia ühtegi saladust ega räägi andmebaasiga.** Renderdab tekste ja kutsub edge-funktsioone |
| Taust | Supabase edge-funktsioonid (Deno), EL-i regioon. Andmebaasi ligipääs ainult service role võtmega |
| Andmebaas | Supabase Postgres. RLS sees, avalikke poliitikaid ei ole, anon-rollil ei ole grant'e |
| Ajastus | **pg_cron + pg_net**, kord tunnis, mitte Verceli Cron |
| E-kirjad | Brevo transactional API |
| Uudiskiri | **Smaily** opt-in, mitte Brevo loend |
| Makse | Stripe Checkout (payment mode), promokoodid |
| Tehisaru | Anthropic Messages API |
| Stiilimine | **Tailwind 4** (CSS-first `@theme`). CLAUDE.md väidab 3.4, see on aegunud |

**Kujundus on hele, mitte tume.** v1.0 §3 nägi ette tausta `#0F1110`. Raimo lükkas selle 30.10 tagasi.

| roll | väärtus |
|---|---|
| taust | `#FFFFFF` |
| pind (kaardid) | `#EBEAE5` |
| tekst | `#0F0F0F` |
| teisene tekst | `#6A6862` |
| aktsent | `#00FA96` |
| joon | `#2B2B2B`, 1px |

Roheline on täide, mitte tekst (valgel ~1,5:1). Jooned on peaaegu mustad juuksekarvad. Bebas Neue pealkirjad, DM Sans tekst, raadius 0. Mobiil esmalt.

### 3.1 Edge-funktsioonid

| funktsioon | roll |
|---|---|
| `submit-test` | võtab vastu testi, skoorib, loob `report_token` |
| `get-report-by-token` | raporti andmed |
| `get-report-ai` | kirjutab testi lõigu päringu sees ja tagastab selle |
| `request-contact` | märgib, et juht soovib ühendust |
| `create-checkout` | loob Stripe'i maksevormi |
| `stripe-webhook` | makse järel liitumine ja tervituskiri |
| `dispatch-daily` | päevakiri, kord tunnis |
| `get-day-by-signed` | päevalehe küsimused |
| `submit-day` | kuus vastust korraga |
| `get-self-assessment-by-token` | enesehindamise leht |
| `submit-self-assessment` | kolm vastust |
| `dispatch-final` | lõpuraporti arvutus ja kiri |
| `get-final-by-token` | lõpuraport, kirjutab lõigud esimesel vaatamisel |

Mustrid on üle tõstetud **AttFocusest**: kirjakest (`emailLayout.ts`), `sendEmail`, `EMAIL_DISABLED` hädapidur, päevalehe kuju, enesehindamine, lõpuraporti loogika, `nextWorkday` ajastus. Kui AttFocuse lahendus erineb siinsest kirjeldusest, kehtib AttFocuse oma ja erinevus läheb `DECISIONS.md` faili.

## 4. Keskkonnamuutujad

Saladused elavad **Supabase'i projekti all**, mitte Vercelis. Vercelis on ainult kaks avalikku väärtust, mis käivad brauserisse kaasa.

**Supabase (edge-funktsioonid):**

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
SITE_BASE_URL              # v1.0 nimetas seda NEXT_PUBLIC_SITE_URL
STRIPE_SECRET_KEY          # piiratud võti, kaks õigust, vt punkt 8
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID            # 15.00 EUR, tax_behavior = inclusive, one-time
BREVO_API_KEY
BREVO_SENDER_EMAIL         # raimo@raimoulavere.com
BREVO_SENDER_NAME
ANTHROPIC_API_KEY
ANTHROPIC_MODEL
LINK_SIGNING_SECRET        # HMAC päevalinkide jaoks
CRON_SECRET
DAILY_SEND_HOUR=16         # osaleja kohalik aeg
EMAIL_DISABLED             # hädapidur, AttFocuse muster
```

**Vercel (Next.js):**

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Anon-võti on avalik: ükski tabel ei anna anon-rollile õigusi ja kõik funktsioonid kasutavad service role'i. Võti üksi ei ava midagi.

`BREVO_NEWSLETTER_LIST_ID` ja `BREVO_DOI_TEMPLATE_ID` olid v1.0-s, aga neid ei ole: uudiskiri läheb Smailysse.

**Supabase'i saladusi ei saa tagasi lugeda**, ainult üle kirjutada. Väärtuste kontrollimiseks tuleb neid kasutada.

## 5. Teekond

### 5.1 Juht

1. **Avaleht `/`.** `?kood=XXXX` salvestub küpsisesse `cj_promo` (60 päeva) ja eemaldatakse URL-ist.
2. **Test `/test`.** Kaks ekraani: 9 tegevusväidet, siis 9 uskumusväidet. Edenemisriba, iga väide kohustuslik. Vastused hoitakse kliendis (sessionStorage) ja lehe uuesti laadimine ei kaota neid.
3. **E-posti ekraan.** E-post ja märkimata linnuke uudiskirja jaoks. Ajavöönd loetakse brauserist.
4. **`submit-test`.** Valideerib, leiab või loob osaleja, skoorib, salvestab testi, loob `report_token`. Linnukese korral lisab kontakti Smailysse.
5. **Raport `/raport/[token]`.** Numbrid kohe. Tehisaru lõik kirjutatakse esimesel vaatamisel `get-report-ai` sees ja leht pollib seda kuni **60 sekundit** (v1.0 ütles 20 s; mõõdetud jooks võtab ~36 s).
6. **Kontakt.** Raportis saab märkida soovi ühendust võtta. Grupihuvi korral `mailto:` Raimole. *(v1.0-s ei olnud.)*
7. **CTA.** Aktiivse programmi korral kuvatakse `report.cta.active`. Muidu nupp → `create-checkout`.
8. **Stripe Checkout.** Pärast makset `/raport/[token]?alustatud=1`.
9. **Webhook** loob liitumise ja saadab tervituskirja.
10. **Kolm nädalat.** Iga tööpäev kell 16 kohaliku aja järgi päevakiri.
11. **Viimane päev.** Päevakiri kannab lisaks enesehindamise linki.
12. **Lõpuraport `/lopp/[token]`** järgmisel tööpäeval, kirjaga.

Kordustest: sama e-post → sama osaleja → uus `tests` rida. Programm seotakse testiga, millelt CTA vajutati.

### 5.2 Ettevõte (Raimo käsitsi)

1. Ettevõte maksab arve alusel ette N koha eest.
2. Raimo loob Stripe'is 100% kupongi ja promokoodi: max redemptions = N, aegumiskuupäev.
3. Raimo saadab lingi `https://coachivjuht.radicalsimplicity.eu/?kood=KOOD` ja juhendi (`et.json` → `companyGuide`).

Rakendus ei tea ettevõtetest midagi. Kood salvestub liitumise kirjele.

## 6. Andmemudel

```sql
participants (
  id, email citext unique, locale, timezone,
  newsletter_consent, newsletter_consent_at,
  contact_requested, contact_requested_at,     -- lisatud 31.10
  created_at
)

tests (
  id, participant_id, items_version, locale,
  answers jsonb,          -- {"T1":4,...,"U9":2} toored vastused 1–6
  scores jsonb,           -- pärast R-ümberpööramist
  report_token unique, ai_paragraph, ai_status,
  ai_started_at,          -- lisatud 30.10, lõigu haaramiseks
  created_at
)

enrollments (
  id, participant_id, test_id, status, start_date, end_date,
  stripe_session_id unique, amount_total, promo_code,
  final_token unique, final_report jsonb, final_sent_at,
  sa_token unique, sa_attention, sa_behaviour,   -- enesehinnang, lisatud 31.10
  sa_open_text, sa_submitted_at,
  created_at
)
create unique index one_active_enrollment on enrollments(participant_id) where status = 'active';

daily_answers (
  id, enrollment_id, day, day_index,
  q1..q6 boolean, sent_at, answered_at,
  unique (enrollment_id, day)
)
```

RLS on kõigil sees, avalikke poliitikaid ei ole.

Tokenid: 32 baiti juhuslikku, base64url, **43 märki**. `looksLikeToken` kontrollib kuju enne andmebaasi päringut.

Migratsioonid pannakse peale **Supabase Management API kaudu** (`/v1/projects/{ref}/database/query`), mitte `supabase db push`-iga. Seetõttu on `supabase_migrations.schema_migrations` tühi ja see on ootuspärane, mitte viga.

## 7. Test ja skoorimine

Väidete tekstid ja järjekord: `et.json` → `test.items`. Muutmata v1.0-st.

**Ekraan 1, tegevused:** „Viimase nelja nädala jooksul, kui sageli sa…". Järjekord T1, T4, T7, T2, T5, T8, T3, T6, T9. Skaala 1–6: mitte kordagi … peaaegu iga päev.

**Ekraan 2, valikud:** „Kui hästi kirjeldab see sinu tegelikke valikuid viimase poole aasta jooksul?". Järjekord U1, U4, U7, U2, U5, U8, U3, U6, U9. Skaala 1–6, vahepealsed numbrid sildita.

| Osa | Väited | Ümberpööratud |
|---|---|---|
| juhendamine | T1, T2, T3 | – |
| voimestamine | T4, T5, T6 | – |
| inspireerimine | T7, T8, T9 | – |
| inimene | U1, U2, U3 | U3 |
| suhe | U4, U5, U6 | U6 |
| autonoomia | U7, U8, U9 | U9 |

Ümberpööramine `7 - vastus`. Osa skoor on kolme väite keskmine. Üldskoori ei arvutata.

**Tasemed** loetakse **lõikepunktidena**, mitte vahemikena: alla 3,0 = low, alla 4,5 = mid, muidu high. v1.0 kirjutas vahemikud ühe komakohaga, mistõttu 2,95 ja 4,45 ei kuulunud kuhugi.

**Paarid** (uskumus → tegevus): inimene → inspireerimine, suhe → juhendamine, autonoomia → voimestamine. Kõik kolm paari kuvatakse alati, suunaga `beliefHigher`, `actionHigher` või `same`. Skoore omavahel ei võrrelda, sest skaalad on erinevad.

Skoorimisel on ühiktestid.

## 8. Makse ja Stripe

**Üks Stripe'i konto, mitu toodet.** Konto peal on ka väljakutse ja RaceDayMind. Igal projektil on oma piiratud võti, oma `price_…` ja oma webhooki otspunkt.

`STRIPE_SECRET_KEY` on **piiratud võti** (`rk_…`) täpselt kahe õigusega:

| õigus | milleks |
|---|---|
| Checkout Sessions → write | maksevormi loomine |
| Promotion Codes → read | sooduskoodi kontroll |

Muud õigused on `None`. Webhook ei kasuta API võtit üldse, ainult allkirja.

`create-checkout` (body: `token`):

1. Leia test ja osaleja. Aktiivse programmi korral 409.
2. Checkout Session: `mode: payment`, `line_items: [{ price, quantity: 1 }]`, `client_reference_id`, `metadata: { participant_id, test_id }`, `customer_email`, `locale: et`.
3. Kui `cj_promo` kannab koodi: `GET /v1/promotion_codes?code=…&active=true`. Leitu korral `discounts`, muidu `allow_promotion_codes: true`.
4. `success_url: /raport/[token]?alustatud=1`, `cancel_url: /raport/[token]`.

`stripe-webhook`:

- Allkiri kontrollitakse käsitsi Web Crypto abil (Node SDK `constructEvent` on sünkroonne ja Denos võimatu).
- Otspunkt on `verify_jwt = false`, sest Stripe ei saada `Authorization` päist.
- Sündmus `checkout.session.completed`, `payment_status` `paid` või `no_payment_required`.
- **Ristliiklus.** Sama konto saadab igale otspunktile kõik selle tüübi sündmused, ka teiste toodete omad. Kaitse on `metadata`: puuduva `participant_id` või `test_id` korral vastatakse 200 ja ei tehta midagi. Väljakutse webhook nõuab omakorda `cohort_id`, mida siinsel ostul ei ole.
- `stripe_session_id` on unikaalne, kordus-webhook ei loo teist rida.
- `start_date` = järgmine tööpäev osaleja ajavööndis. `end_date` = 15. tööpäev.
- Tervituskiri.

Hind 15 € on koos käibemaksuga, Stripe Taxi ei kasutata.

**TEGEMATA kontroll:** 100% koodiga tellimus peab läbima Checkouti ilma kaardita. Testimata.

## 9. Keel

- Keelevõtmed `et`, hiljem `en`. Fail `content/<locale>.json`, sama struktuur.
- `content/et.json` on ainus allikas. `scripts/sync-content.mjs` kopeerib selle edge-funktsioonide juurde, sest `supabase functions deploy` pakib ainult seda, milleni funktsiooni kaustast ulatub. **Käivita enne iga deploy'd.**
- Osaleja keel `participants.locale`, testi keel `tests.locale`.
- Esimeses versioonis on kõigil eesti keel.

## 10. Päevamootor

`dispatch-daily`, pg_cron kord tunnis (`0 * * * *`), kontrollib `CRON_SECRET`.

1. Leia aktiivsed liitumised, kus osaleja kohalik kell on `DAILY_SEND_HOUR`, kohalik kuupäev on tööpäev ja jääb vahemikku `[start_date, end_date]`.
2. **Haara päev:** `daily_answers` rida on unikaalne `(enrollment_id, day)` peal. Rida luuakse enne kirja saatmist, nii et teine jooks samal tunnil ei saada midagi.
3. Saada päevakiri.

**Kirjas on üks link, mitte kaksteist.** v1.0 §10.3 nägi ette iga küsimuse juures kaks linki. Kaksteist allkirjastatud URL-i tegi kirja loetamatuks ja lasi e-posti skänneril kellegi päeva ära vastata. Nüüd:

- Üks link `/v/[signed]`. Allkirjastatud osas on `enrollment_id`, `day` ja HMAC.
- Leht näitab kõiki kuut küsimust ja juba antud vastuseid. Juht märgib kõik ja vajutab korra „Saada".
- `submit-day` kontrollib allkirja ja salvestab kuus väärtust korraga. Ülekirjutamine lubatud, viimane vastus kehtib.
- Vale allkiri → 400.

Vastata saab kuni lõpuraporti koostamiseni. Riigipühi ei arvestata. Vahele jäänud päev programmi ei katkesta.

### 10.1 Enesehinnang viimasel päeval

*(v1.0-s ei olnud. Üle tõstetud AttFocusest, Raimo korraldus 31.10.)*

Viimasel tööpäeval (`today == end_date`) kannab päevakiri teist linki. `sa_token` luuakse siis ja ainult siis, kordusjooks kasutab sama.

Leht `/hinnang/[token]` küsib kolm asja, kõik kohustuslikud:

1. Kuidas muutus sinu tähelepanu? (1–5)
2. Kuidas muutus sinu käitumine? (1–5)
3. Mis muutus sinu töötamises selle perioodi jooksul? (vabatekst)

Üks esitamine, teine katse saab 409 ja leht näitab tänu. Tähtaeg on järgmise päeva keskpäev, lõpuraport tuleb sama päeva kell 16.

## 11. Lõpuraport

`dispatch-final`, pg_cron kord tunnis (`15 * * * *`).

Tingimus: `today >= nextWorkday(end_date)`, osaleja kohalik kell on `DAILY_SEND_HOUR`, `final_sent_at` on tühi. v1.0 ütles „kui `end_date` on möödas", mis saatis iga reedel lõppeva programmi raporti laupäeval.

### 11.1 See raport ei mõõda arengut

**v1.0 §11 nõudis kahte võrdlust ja mõlemad on eemaldatud.** Raimo otsus 31.10.

Eemaldatud: esimese ja viimase nädala võrdlus (päevad 1–5 vs 11–15); võrdlus testiskooriga koos tasemekaardistusega („alla 30% = low").

Põhjus: kolm nädalat juhivad tähelepanu. Viisteist päeva enesekohast vastust ei kanna arengu mõõtmist ja liikunud number loetaks kas eduks või läbikukkumiseks. AttFocuse isiklik raport ütleb sama oma sõnadega: „See näitab, kui järjepidevalt sa igapäevast kontrolli tegid, mitte seda, kas sul läks hästi."

### 11.2 Mida raport näitab

- **Järjepidevus.** Mitmel tööpäeval vastati, viieteistkümnest. Päevade kaupa, mitu kuuest oli „jah".
- **Kõige sagedasemad.** Kaks küsimust, mis jõudsid päeva kõige sagedamini.
- **Kõige harvem.** Üks küsimus, mis jõudis kõige harvemini, koos lausega, et see ei ole automaatselt probleem.
- **Enesehinnang.** Kaks hinnangut skaalal ja juhi enda sõnad eraldi tsitaadina.
- **Kõik kuus** küsimust loeteluna.

Vastamata päev ei ole „ei". `null` tähendab, et küsimus ei jõudnud päeva, ja selle lugemine „ei"-ks karistaks eemalolekut.

Arvutus on puhas aritmeetika (`_shared/finalReport.ts`), ilma andmebaasi ja võrguta, ühiktestidega.

Numbrid salvestatakse `final_report` välja koos enesehinnanguga ja kiri saadetakse. **Lõike ei kirjutata siin:** need võtavad umbes minuti ja cron käib ühe tunni jooksul kõik lõppevad programmid läbi. Lõigud kirjutatakse `get-final-by-token` sees, selle päringu ajal, mida leht niikuinii pollib (kuni 150 s). Rida haaratakse aatomiliselt, nii et kaks avatud sakki annavad ühed lõigud.

## 12. Tehisaru

Anthropic Messages API, `ANTHROPIC_MODEL`.

**Parameetrid erinevad v1.0-st:**

- **`temperature` ei saadeta.** v1.0 nõudis 0,3. Sonnet 5 vastab `400 temperature is deprecated for this model` ja iga kutse ebaõnnestub.
- **`max_tokens` on 4000**, mitte 400 ja 900. Mudel mõtleb enne kirjutamist ja mõtlemine kulub samast eelarvest. Väljund ise on endiselt lühike, seda kontrollib `validateParagraph`.
- Vastusest loetakse **esimene `text`-plokk**, mitte `content[0]`: ees on `thinking`-plokk, mille `.text` on olemata.
- `stop_reason === "max_tokens"` loetakse ebaõnnestumiseks. Pooleli lause ei ole lühike lõik.

Saadetakse ainult skoorid, vastused ja küsimuste tekstid. Mitte e-posti aadressi ega muid isikuandmeid.

Järeltöötlus: mõttekriipsud eemaldatakse. Tühi, liiga pikk või sõnu „tüüp"/„arhetüüp" sisaldav tekst märgitakse `failed` ja seda ei kuvata. Ebaõnnestumise korral plokk lihtsalt ei ilmu; v1.0 §11 lubas mallilauseid `final.compare.*`, neid võtmeid ei ole.

### 12.1 Testi raporti lõik

Üks lõik, 4–5 lauset, sina-vormis. Kirjelda ainult andmetes nähtavat, seo vähemalt kaks osa, ära nimeta tüüpe, ära kiida ega hinda, viimane lause on küsimus. Ilma mõttekriipsuta, ilma „ei …, vaid …" vastanduseta, ilma komata „ja" ees. Juhend tervikuna on `_shared/ai.ts` failis.

### 12.2 Lõpuraporti peegeldus

**Kaks lõiku ja üks küsimus.** Vastus tuleb JSON-ina.

1. **`pattern`** — mis jõudis päeva sageli, mis harva, mis tulid sageli samal päeval koos.
2. **`ownWords`** — mida juht viimasel päeval enesehinnangus ise kirjutas, kõrvutatuna sellega, mis numbrites näha. Ainus koht, kus kõlab tema enda hääl.
3. **`question`** — üks küsimus selle kohta, mida juht tahab **edasi hoida**.

Kui enesehinnang jäi täitmata, ehitatakse juhend ilma teise lõiguta ja alles on üks lõik ning küsimus. Mudelilt ei küsita kunagi lõiku sõnadest, mida ei ole.

**Miks kaks, mitte kolm.** v1.0 §12.2 nõudis kolme lõiku: muster, muutus, võrdlus testiga. Kaks viimast on §11.1-ga keelatud. 01.11 asendati need kolmikuga muster / sinu sõnad / tähelepanu, aga päris andmete peal kirjutas kolmas lõik esimese ümber: samad kolm küsimuste rühma, sama järjekord, teised omadussõnad. Põhjus oli andmetes, mitte juhendis. Selles raportis on kaks asja, millest kirjutada, ja mudel, kellelt küsitakse kolmandat vaadet seal kus kolmandat vaadet ei ole, sõnastab esimese ümber.

**Küsimus ei ole soovitus.** Esimene jooks andis „Mida saaksid teha, et anda kellelegi senisest suurem väljakutse sagedamini kui praegu?". See on nõuanne küsimuse kujul, ja just selle kohta, mis kõige harvemini päeva jõudis, mida §11.2 nimetab mitte-probleemiks. Juhend keelab nüüd otse: küsimus on selle kohta, mida alles hoida, seda ei ehitata kõige harvema tegevuse ümber.

Reeglid jäävad samaks mis punktis 12.1. Lisaks: kui juht kirjutas ise midagi, kaalub see rohkem kui numbrid; teda ei tsiteerita sõna-sõnalt ega parandata tema sõnastust. Kui vastatud päevi on alla viie, öeldakse esimeses lõigus, et pilt on ligikaudne.

Valideerimine on kõik-või-mitte-midagi: üks vigane osa kukutab terve peegelduse. Raport, mille keskelt on lõik puudu, loeb katkisena; raport ilma peegelduseta loeb raportina, mida §11 lubab.

## 13. E-kirjad

| Kiri | Millal | Tekst |
|---|---|---|
| Raporti kiri | kohe pärast testi | `emails.report` |
| Tervituskiri | webhook | `emails.welcome` (`{startDate}`, `{sendTime}`) |
| Päevakiri | cron | `emails.daily` (`{dayIndex}`, **üks link**) |
| Päevakiri viimasel päeval | cron | sama + `saTitle`, `saBody`, `saButton` |
| Lõpuraporti kiri | cron final | `emails.final` |
| Uudiskirja kinnitus | linnuke | Smaily |

Kirjakest on üle tõstetud AttFocusest (`_shared/emailLayout.ts`), muutunud on ainult bränd. **Hele taust, tume tekst**: Outlook Windowsis eirab `body` taustavärvi ja Gmaili tume režiim värvib teksti ümber, mis annaks osale lugejatest halli hallil.

Nupud kirjutatakse kirja kehasse süntaksiga `{nimiButton:Silt}`, nii et nuppu saab `et.json`-is liigutada ilma koodi puutumata. Esimene nupp on roheline, järgmised on lingiread. Lingita nuppu ei renderdata. Igal kirjal on tekstiversioon.

`EMAIL_DISABLED` on hädapidur. Ilma selleta oleks ainus viis kirjade peatamiseks Brevo võtme tühistamine.

## 14. Lehed

| Aadress | Sisu |
|---|---|
| `/` | `home` |
| `/test` | `test` |
| `/raport/[token]` | `report` |
| `/v/[signed]` | `answer` |
| `/hinnang/[token]` | `selfAssessment` *(uus)* |
| `/lopp/[token]` | `final` |
| `/alus` | `about` |
| `/privaatsus` | `privacy` |

Jaluses on link aluse ja privaatsuse lehele. Tokeniga lehed on `noindex`.

`cacheComponents` on välja lülitatud. Peaaegu iga leht on ühe inimese privaatne andmestik; sisselülitatuna oleks vea hind see, et üks külastaja näeb teise raportit.

## 15. Majutus

| | |
|---|---|
| Repo | `github.com/raimo-ul/coachiv-juht`, private |
| Deploy | Vercel, automaatselt igast `git push`-ist `main` harusse |
| Domeen | `coachivjuht.radicalsimplicity.eu` (CNAME Zone.ee's, Let's Encrypti sertifikaat) |
| Varuaadress | `coachiv-juht.vercel.app` |
| Supabase | projekt `xdoniywdqrwbmatjttdo`, West EU (Ireland) |

Edge-funktsioonid **ei** deploy'u pushist. Need lähevad üles käsitsi: `npm run sync:content && supabase functions deploy <nimi> --project-ref xdoniywdqrwbmatjttdo`.

## 16. Mis on kontrollitud

**Etapp A · test ja raport**

- [x] Kõik lehed töötavad mobiilis ja arvutis
- [x] Lehe uuesti laadimine ei kaota vastuseid
- [x] Skoorimise ühiktestid (52 testi kokku)
- [x] Raport avaneb ainult tokeniga, vale token annab 404
- [x] Tehisaru lõik ilmub raportisse
- [x] Raporti kiri jõuab kohale
- [x] Sama e-postiga teine test loob uue testi samale osalejale
- [x] Kasutajale nähtavat teksti ei ole koodis
- [ ] Uudiskirja kontakt Smailys (kood valmis, päris lisamine kontrollimata)

**Etapp B · kolm nädalat**

- [x] Päevakiri tuleb E–R kell 16 osaleja ajavööndis
- [x] Üks link avab lehe, kuus vastust lähevad ühe POST-iga, teine klõps kirjutab üle
- [x] Muudetud allkiri annab 400
- [x] Viimase päeva kiri kannab enesehindamise linki, žetoon tehakse ainult korra
- [x] Enesehindamine nõuab kõiki kolme välja, teine esitamine annab 409
- [x] Lõpuraport arvutatakse, enesehinnang jõuab raportisse ja tehisaru lõiku
- [x] Maksevormi loomine töötab päris võtmetega
- [x] Webhooki otspunkt on ligipääsetav ja lükkab allkirjata päringu tagasi
- [ ] **Päris makse → liitumine → tervituskiri.** Ahela viimane lüli on kontrollimata
- [ ] 100% promokood läbib Checkouti ilma kaardita
- [ ] Ajavööndi test `America/New_York` ajavööndiga

## 17. Lahtised

- **Privaatsusleht on mustand.** Ei räägi kontaktilinnukesest ega kolme nädala andmetest. Vajalik enne raha küsimist.
- **Andmete säilitusaeg.** 24 kuud on kohatäide, otsustamata.
- **Testandmed andmebaasis.** Kolm liitumist, mis tuleb enne käivitamist koristada.
- **Faviconit ja jagamispilti ei ole.** Brauser näitab Next.js-i vaikeikooni, jagatud link annab tühja kasti.
- **Raamatute aastad** aluse lehel (2009, 2024) on kontrollimata. Pealkirjad on õiged.
- **Tasemete piiride korrigeerimine** pärast ~200 vastust.
- **Ingliskeelsed tekstid** (`en.json`) koos väidete tagasitõlkega.

Iga otsus, mille Claude Code ise teeb, läheb faili `DECISIONS.md`: mis, miks ja millal.
