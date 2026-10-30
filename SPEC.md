# Coachiv juht · ehitusspetsifikatsioon v1.0

Kuupäev: 30.10.2026 · Omanik: Raimo Ülavere (Mindsweeper OÜ) · Ehitaja: Claude Code

See fail on ainus allikas, mille järgi rakendus ehitatakse. Kõik kasutajale nähtavad tekstid on failis `content/et.json`. Koodi ei kirjutata ühtegi kasutajale nähtavat lauset, kõik tuleb keelefailist.

Lähtedokumendid (inimestele, mitte koodile): kontseptsioon https://claude.ai/artifact/USZg7MjCCuXvqGLVK3xXCz · väited https://claude.ai/artifact/Tcr72NnAyeUMuRn4ofLyAZ · tekstid https://claude.ai/artifact/K61uRzgQ3NPULfKQtMTp5v · mudel `claude/coachiva-juhi-mudel.md` (Claude projekt „Coaching & Training“).

---

## 1. Toode ühe lõiguna

Tasuta veebitest (18 väidet), mis annab juhile kohe raporti tema coachiva juhtimise kohta: 3 uskumust ja 3 tegevust. Raporti lõpus on kolme nädala programm (15 € koos käibemaksuga): igal tööpäeval tuleb kiri kuue jah/ei küsimusega ja lõpus lõpuraport. Ostuviise on kaks: juht maksab ise Stripe'iga või kasutab ettevõtte 100% sooduskoodi. Kõik juhid läbivad sama teekonna ja alustavad ning lõpetavad oma ajal. Admin-vaadet, sisselogimist ja meeskondi esimeses versioonis pole.

## 2. Mitte ehitada esimeses versioonis

Need asjad on teadlikult välja jäetud. Ära lisa neid ka siis, kui need tunduvad loogilised.

- Kasutajakontod, sisselogimine, paroolid. Juht kasutab salajasi linke.
- Admin-vaade. Raimo vaatab andmeid Supabase'i ja Stripe'i töölaualt.
- Meeskonnad, ühine algus, koondraportid, ettevõtte vaade.
- Arhetüübid, tüübid, üldskoor.
- Kontekstiküsimus ja alluvate arvu küsimus.
- Ingliskeelne sisu (struktuur peab seda toetama, vt punkt 9).
- „Beta“ silt kuskil kasutajale nähtavas kohas.
- Analüütika ja jälgimisküpsised.

## 3. Tehnoloogia

| Osa | Valik |
|---|---|
| Rakendus | Next.js (App Router, TypeScript), eraldi Verceli projekt |
| Andmebaas | Supabase, EL-i regioon. Ligipääs ainult serverist service role võtmega, RLS sees ja avalikke poliitikaid pole |
| E-kirjad | Brevo transactional API. HTML koostatakse koodis `et.json` tekstidest |
| Uudiskiri | Brevo kontaktiloend, double opt-in |
| Makse | Stripe Checkout (payment mode), promokoodid |
| Tehisaru | Anthropic Messages API |
| Ajastus | Vercel Cron, kord tunnis (kontrolli, et Verceli plaan seda lubab; kui ei luba, kord päevas kell 14:00 UTC ja kõigile Europe/Tallinn aja järgi) |
| Kujundus | Radical Simplicity: taust #0F1110, tekst #F0EFEA, teisene tekst #A8A89E, üks aktsent #00FC99, pealkirjad Bebas Neue, tekst DM Sans, teravad nurgad, palju tühja ruumi. Mobiil esmalt |

Mustrid, mis tuleb üle võtta olemasolevatest projektidest (küsi Raimolt repo ligipääsu):

- **AttFocus:** päevakirja saatmine, allkirjastatud jah/ei lingid, kordusklõpsu idempotentsus, lõpuraporti arvutus. Kui AttFocuse lahendus erineb sellest spetsist, eelista AttFocuse lahendust ja kirjuta erinevus `DECISIONS.md` faili.
- **Truresp:** keele tuvastus IP järgi ja keelevahetaja.

## 4. Keskkonnamuutujad

```
NEXT_PUBLIC_SITE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID            # 15.00 EUR, tax_behavior = inclusive, one-time
BREVO_API_KEY
BREVO_SENDER_EMAIL         # nt raimo@raimoulavere.com
BREVO_SENDER_NAME          # Raimo Ülavere
BREVO_NEWSLETTER_LIST_ID
BREVO_DOI_TEMPLATE_ID
ANTHROPIC_API_KEY
ANTHROPIC_MODEL            # sama mudel mis Compensa/Eesti Energia töövoos
LINK_SIGNING_SECRET        # HMAC vastuslinkide ja tokenite jaoks
CRON_SECRET
DAILY_SEND_HOUR=16         # kohalik aeg
```

Võtmeid ei kirjutata kunagi koodi ega repo. Ainult Verceli keskkonnamuutujad.

## 5. Teekond

### 5.1 Juht (üksi või ettevõtte koodiga)

1. **Avaleht `/`.** Kui URL-is on `?kood=XXXX`, salvesta kood küpsisesse `cj_promo` (60 päeva) ja eemalda see URL-ist.
2. **Test `/test`.** Kaks ekraani: 9 tegevusväidet, siis 9 uskumusväidet. Edenemisriba. Iga väide on kohustuslik. Vastused hoitakse kliendis kuni lõpuni. Lehe uuesti laadimisel ei tohi vastused kaduda (sessionStorage, try/catch).
3. **E-posti ekraan.** E-post (kohustuslik) ja märkimata linnuke uudiskirja jaoks. Nupp „Näita raportit“. Brauserist loetakse ajavöönd (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
4. **Server `POST /api/test`:** valideeri sisend. Leia osaleja e-posti järgi või loo uus (e-post väiketähtedega). Arvuta skoorid (punkt 7), salvesta test, loo `report_token` ja suuna `/raport/[token]`. Käivita tehisaru lõik ja raporti kiri taustal. Kui linnuke on märgitud, lisa kontakt Brevo DOI kaudu.
5. **Raport `/raport/[token]`.** Raport kuvatakse kohe. Tehisaru lõigu kohal on laadimisolek, mis uueneb (polling kuni 20 s). Kui lõik pole 20 sekundi jooksul valmis, kuvatakse raport ilma selleta.
6. **CTA.** Kui osalejal on aktiivne programm, CTA asemel kuvatakse rida `report.cta.active`. Muidu nupp „Alusta · 15 €“ → `POST /api/checkout`.
7. **Stripe Checkout** (punkt 8). Pärast makset suunatakse `/raport/[token]?alustatud=1` ja kuvatakse kinnitus.
8. **Webhook** loob programmi kirje ja saadab tervituskirja.
9. **Kolm nädalat.** Iga tööpäev kell 16 kohaliku aja järgi tuleb päevakiri.
10. **Lõpuraport `/lopp/[token]`** genereeritakse esimesel tööpäeval pärast lõppu ja saadetakse kirjaga. Kirjas on ka link uuele testile.

Kordustest: sama e-post → sama osaleja → uus `tests` rida. Eraldi tunnust pole vaja. Programm seotakse testiga, millelt CTA vajutati (`enrollments.test_id`).

### 5.2 Ettevõte (Raimo käsitsi, väljaspool rakendust)

1. Ettevõte maksab arve alusel ette N koha eest.
2. Raimo loob Stripe'i töölaual 100% kupongi ja promokoodi (nt `COMPENSA26`): max redemptions = N, aegumiskuupäev.
3. Raimo saadab osalejatele lingi `https://<domeen>/?kood=COMPENSA26` ja juhendi (tekst `et.json` → `companyGuide`).

Rakendus ei pea ettevõtetest midagi teadma. Kood salvestub programmi kirjele.

## 6. Andmemudel (Supabase / Postgres)

```sql
create extension if not exists citext;

create table participants (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  locale text not null default 'et',
  timezone text not null default 'Europe/Tallinn',
  newsletter_consent boolean not null default false,
  newsletter_consent_at timestamptz,
  created_at timestamptz not null default now()
);

create table tests (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  items_version text not null,          -- 'v1'
  locale text not null,
  answers jsonb not null,               -- {"T1":4,...,"U9":2} toored vastused 1–6
  scores jsonb not null,                -- {"juhendamine":4.33,...} pärast R-ümberpööramist
  report_token text not null unique,
  ai_paragraph text,
  ai_status text not null default 'pending', -- pending | done | failed
  created_at timestamptz not null default now()
);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  test_id uuid not null references tests(id),
  status text not null default 'active',     -- active | finished
  start_date date not null,                  -- osaleja kohalik kuupäev
  end_date date not null,
  stripe_session_id text not null unique,    -- idempotentsuse võti
  amount_total integer not null,             -- sentides, 0 koodiga
  promo_code text,                           -- nt 'COMPENSA26'
  final_token text unique,
  final_report jsonb,                        -- numbrid + tehisaru lõigud
  final_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index one_active_enrollment on enrollments(participant_id) where status = 'active';

create table daily_answers (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  day date not null,                         -- osaleja kohalik kuupäev
  day_index integer not null,                -- 1..15
  q1 boolean, q2 boolean, q3 boolean, q4 boolean, q5 boolean, q6 boolean,
  sent_at timestamptz not null default now(),
  answered_at timestamptz,
  unique (enrollment_id, day)
);

alter table participants enable row level security;
alter table tests enable row level security;
alter table enrollments enable row level security;
alter table daily_answers enable row level security;
-- Avalikke poliitikaid ei looda. Kõik päringud käivad serverist service role võtmega.
```

Tokenid: 32 baiti juhuslikku, base64url. Väidete ja tekstide versioon: `items_version = 'v1'` ja `content/et.json` → `version`.

## 7. Test ja skoorimine

Väidete tekstid ja järjekord on failis `et.json` → `test.items`.

**Ekraan 1, tegevused** (juhis: „Viimase nelja nädala jooksul, kui sageli sa…“). Järjekord: T1, T4, T7, T2, T5, T8, T3, T6, T9.
Skaala: 1 mitte kordagi · 2 korra · 3 paar korda · 4 umbes kord nädalas · 5 mitu korda nädalas · 6 peaaegu iga päev.

**Ekraan 2, valikud** (juhis: „Kui hästi kirjeldab see sinu tegelikke valikuid viimase poole aasta jooksul?“). Järjekord: U1, U4, U7, U2, U5, U8, U3, U6, U9.
Skaala: 1 ei kirjelda üldse … 6 kirjeldab täpselt. Vahepealsed numbrid on ilma siltideta.

**Osad:**

| Osa (võti) | Väited | Ümberpööratud |
|---|---|---|
| juhendamine | T1, T2, T3 | – |
| voimestamine | T4, T5, T6 | – |
| inspireerimine | T7, T8, T9 | – |
| inimene | U1, U2, U3 | U3 |
| suhe | U4, U5, U6 | U6 |
| autonoomia | U7, U8, U9 | U9 |

Ümberpööramine: `7 - vastus`. Osa skoor on kolme väite keskmine, ümardatud ühe komakohani ainult kuvamisel (andmebaasis täpne). Üldskoori ei arvutata.

**Tasemed** (sama mõlemale skaalale): `low` 1,0–2,9 · `mid` 3,0–4,4 · `high` 4,5–6,0. Taseme nime ekraanil ei kuvata. Kuvatakse skoor ja tasemele vastav lause.

**Paarid** (uskumus → tegevus): inimene → inspireerimine, suhe → juhendamine, autonoomia → voimestamine. Kui uskumuse tase on tegevuse tasemest vähemalt ühe astme võrra kõrgem, kuvatakse `report.pairs.beliefHigher`. Kui vastupidi, siis `report.pairs.actionHigher`. Kui tasemed on samad, lauset ei kuvata. Skoore omavahel ei võrrelda, sest skaalad on erinevad.

Kirjuta skoorimisele ühiktestid: vähemalt 5 käsitsi arvutatud vastuste komplekti, sh kõik 1, kõik 6 ja R-väidete kontroll.

## 8. Makse ja Stripe

`POST /api/checkout` (body: `report_token`):

1. Leia test ja osaleja. Kui osalejal on aktiivne programm, tagasta 409.
2. Loo Checkout Session:
   - `mode: 'payment'`, `line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }]`
   - `client_reference_id: participant.id`, `metadata: { participant_id, test_id }`
   - `customer_email: participant.email`, `locale: 'et'`
   - kui küpsises `cj_promo` on kood: leia `stripe.promotionCodes.list({ code, active: true })`. Kui kood leiti, `discounts: [{ promotion_code: id }]`. Kui ei leitud, `allow_promotion_codes: true`.
   - kui koodi pole: `allow_promotion_codes: true`
   - `success_url: /raport/[token]?alustatud=1`, `cancel_url: /raport/[token]`
3. Suuna Stripe'i.

`POST /api/stripe/webhook`:

- Kontrolli allkirja (`STRIPE_WEBHOOK_SECRET`).
- Sündmus `checkout.session.completed`, kui `payment_status` on `paid` või `no_payment_required`.
- Loo `enrollments` rida. `stripe_session_id` on unikaalne, nii et kordus-webhook ei loo teist rida (püüa unique-viga ja tagasta 200).
- `promo_code`: võta sessiooni discounts'ist (expand `total_details.breakdown.discounts.discount.promotion_code`) ja salvesta kood tekstina.
- `start_date` = järgmine tööpäev (E–R) osaleja ajavööndis pärast makse hetke. `end_date` = 15. tööpäev (E–R), lugedes `start_date` esimeseks.
- Saada tervituskiri.

100% koodiga tellimus peab läbima Checkouti ilma kaardita (Stripe „no-cost orders“). **Kontrolli seda testrežiimis enne avalikustamist.**

Käibemaks: hind 15 € on koos käibemaksuga (`tax_behavior: inclusive`). Stripe Taxi ei kasutata. Raamatupidamine on Raimo vastutus.

## 9. Keel

- Keelevõtmed: `et`, hiljem `en`. Fail `content/<locale>.json`, sama struktuur.
- Keele valik: küpsis `cj_lang`, selle puudumisel päis `x-vercel-ip-country` (EE → et, muu → en). Kui valitud keele faili pole, kasutatakse `et`. Esimeses versioonis on seega kõigil eesti keel.
- Keelevahetaja ehitatakse valmis, aga see on peidus, kuni `en.json` on olemas (konfiguratsioon `LOCALES_ENABLED = ['et']`).
- Osaleja keel salvestub `participants.locale` väljale ja testi keel `tests.locale` väljale. Kirjad, raportid ja päevaküsimused tulevad osaleja keeles.

## 10. Päevamootor

`GET /api/cron/daily` (Vercel Cron kord tunnis, kontrolli `CRON_SECRET`):

1. Leia aktiivsed programmid, kus osaleja kohalik kell on `DAILY_SEND_HOUR`, kohalik kuupäev on tööpäev (E–R) ja jääb vahemikku `[start_date, end_date]`, ning sellele kuupäevale pole veel `daily_answers` rida.
2. Loo `daily_answers` rida (`day`, `day_index`) ja saada päevakiri (`emails.daily`).
3. Kirjas on iga küsimuse juures kaks linki: `/v/[signed]`. Signeeritud osas on `enrollment_id`, `day`, `q` (1–6), `value` (1/0) ja HMAC (`LINK_SIGNING_SECRET`).

Vastuse salvestamine:

- `GET /v/[signed]` avab lihtsa lehe, mis kontrollib allkirja ja saadab vastuse JavaScriptiga `POST /api/answer`. Põhjus: e-posti turvaskännerid avavad GET-linke. GET ise andmeid ei muuda. Leht näitab kõiki kuut küsimust ja seda, mis on juba vastatud, et juht saaks ülejäänud samal lehel ära vastata.
- `POST /api/answer` kontrollib allkirja ja salvestab väärtuse (ülekirjutamine, viimane vastus kehtib). Vastata saab kuni lõpuraporti genereerimiseni.
- Vale või muudetud allkiri → 400, midagi ei salvestata.

Riigipühi ei arvestata. Vahele jäänud päev programmi ei katkesta.

Kui AttFocuses on see lahendatud teisiti (näiteks skännerite kaitse), kasuta AttFocuse lahendust.

## 11. Lõpuraport

`GET /api/cron/final` (kord tunnis): programmid, mille `end_date` on möödas, osaleja kohalik kell on `DAILY_SEND_HOUR` ja `final_sent_at` on tühi.

Arvutus:

- Iga küsimuse kohta: mitu „jah“ vastust ja mitu vastatud päeva (null ei loe).
- Iga tegevuse kohta: q1+q2 → juhendamine, q3+q4 → voimestamine, q5+q6 → inspireerimine.
- Esimese ja viimase nädala võrdlus: päevad 1–5 vs 11–15, „jah“ osakaal küsimuse kaupa.
- Võrdlus testiga: testi tegevuse tase vs kolme nädala tase. Kolme nädala tase: „jah“ osakaal alla 30% = low, 30–59% = mid, 60% ja üle = high. See on esialgne vastavus ja see tuleb kirjutada `DECISIONS.md` faili.

Tehisaru lõigud (punkt 12) salvestatakse `final_report` välja. Raport kuvatakse `/lopp/[token]` all: numbrid alati ja tehisaru lõigud siis, kui need on olemas. Kui tehisaru ebaõnnestub, kasutatakse mallilauseid `final.compare.*`. Lõpuks seatakse `status = 'finished'`, saadetakse kiri `emails.final` ja täidetakse `final_sent_at`.

## 12. Tehisaru

Kutse: Anthropic Messages API, `ANTHROPIC_MODEL`, temperature 0,3, max_tokens 400 (test) / 900 (lõpp). Saadetakse ainult skoorid ja vastused, mitte e-posti aadress ega muud isikuandmed.

Järeltöötlus: eemalda mõttekriipsud (— ja –, kui see on lausesisene kriips, mitte vahemik). Kui tekst on tühi, liiga pikk (test üle 6 lause) või sisaldab sõnu „tüüp“ või „arhetüüp“, märgi `failed` ja ära kuva. Logi kõik vastused (Raimo loeb esimesed 30–50 läbi).

### 12.1 Testi raporti lõik

System prompt:

```
Sa kirjutad eesti keeles ühe lühikese lõigu juhi coachiva juhtimise testi raporti lõppu.
Sisend on kuue osa skoorid skaalal 1–6 ja 18 väite vastused.
Osad: kolm tegevust (juhendamine, võimestamine, inspireerimine; sagedus viimase nelja nädala jooksul) ja kolm uskumust (inimene, suhe, autonoomia; kui hästi väide kirjeldab juhi tegelikke valikuid).
Paarid: inimene–inspireerimine, suhe–juhendamine, autonoomia–võimestamine.

Reeglid:
1. Kirjuta 4–5 lauset sina-vormis.
2. Kirjelda ainult seda, mis andmetes on näha. Ära oleta juhi töökeskkonna, meeskonna ega põhjuste kohta.
3. Seo vähemalt kaks osa omavahel, näiteks uskumuse ja tegevuse paar või kahe tegevuse erinevus.
4. Kui ühe osa sees on väidete vastused väga erinevad (vahe 3 või rohkem), võid selle välja tuua, nimetades väite sisu oma sõnadega.
5. Kui osade erinevused on väikesed (kõik alla 0,5 punkti), ütle, et pilt on ühtlane. Ära loo mustrit, mida pole.
6. Ära nimeta tüüpe, isiksuseomadusi ega diagnoose. Kirjelda tegevusi ja valikuid.
7. Ära kiida ega hinda. Ära kasuta sõnu nagu hea, suurepärane, tugev, nõrk.
8. Viimane lause on üks küsimus, mille üle juht saab mõelda.
9. Ära kasuta mõttekriipsu. Ära kasuta vastandust kujul „ei …, vaid …“. Ära pane koma sõna „ja“ ette.
10. Ära korda numbreid, juht näeb neid raportis.
Vasta ainult lõigu tekstiga.
```

User message: JSON `{ "scores": {...}, "levels": {...}, "answers": {...}, "items": { "T1": "<väite tekst>", ... } }`.

### 12.2 Lõpuraporti lõigud

System prompt:

```
Sa kirjutad eesti keeles juhi kolme nädala programmi lõpuraporti tekstiosa.
Juht vastas igal tööpäeval kuuele jah/ei küsimusele. Sisend: iga päeva vastused, küsimuste tekstid, iga küsimuse jah-vastuste arv vastatud päevadest, esimese ja viimase nädala võrdlus ning testi tegevuste skoorid enne programmi.

Kirjuta kolm lõiku, igaüks 2–3 lauset, ja nende järel üks küsimus:
1. Muster: millised tegevused jõudsid päeva sageli, millised harva ja millised tulid sageli samal päeval koos.
2. Muutus: mis muutus esimese ja viimase nädala vahel. Kui muutust pole, ütle seda.
3. Võrdlus testiga: kus erineb kolme nädala pilt sellest, mida juht testis enda kohta hindas.
Küsimus: mida juht tahab neist tegevustest edasi hoida.

Reeglid:
- Kirjelda ainult andmetes nähtavat. Andmeid on vähe, seega kirjelda suunda ja ära tee põhjuslikke järeldusi.
- Kui vastatud päevi on alla viie, ütle esimeses lauses, et pilt on ligikaudne.
- „Ei“ vastus on info sellest, mis päeva ei jõudnud. Ära käsitle seda ebaõnnestumisena.
- Ära nimeta tüüpe, isiksuseomadusi ega diagnoose. Ära kiida ega hinda.
- Ära kasuta mõttekriipsu, vastandust kujul „ei …, vaid …“ ega koma sõna „ja“ ees.
Vasta JSON-ina: {"pattern": "...", "change": "...", "compare": "...", "question": "..."}
```

## 13. E-kirjad (Brevo)

| Kiri | Millal | Tekst |
|---|---|---|
| Raporti kiri | kohe pärast testi | `emails.report` |
| Tervituskiri | webhook | `emails.welcome` (kohatäide `{startDate}`, `{sendTime}`) |
| Päevakiri | cron | `emails.daily` (`{dayIndex}`, 6 küsimust, 12 linki) |
| Lõpuraporti kiri | cron final | `emails.final` |
| Uudiskirja kinnitus | linnuke | Brevo DOI mall (Brevos) |

Kirjade kujundus on lihtne: tume taust või valge taust tumeda tekstiga (vali see, mis töötab Gmailis ja Outlookis paremini), üks roheline nupp, jalus „Raimo Ülavere · Radical Simplicity · radicalsimplicity.eu“. Igal kirjal on ka tekstiversioon.

## 14. Lehed

| Aadress | Sisu (`et.json`) |
|---|---|
| `/` | `home` |
| `/test` | `test` |
| `/raport/[token]` | `report` |
| `/lopp/[token]` | `final` |
| `/alus` | `about` |
| `/privaatsus` | `privacy` |
| `/v/[signed]` | `answer` |

Iga lehe jaluses on link aluse ja privaatsuse lehele. Raporti ja lõpu lehtedel peab olema `noindex`.

## 15. Etapid ja valmisoleku kriteeriumid

### Etapp A · test ja raport

- [ ] Avaleht, test, e-posti ekraan, raport, alus ja privaatsus töötavad mobiilis ja arvutis.
- [ ] Test on tehtav alla 5 minutiga. Lehe uuesti laadimine ei kaota vastuseid.
- [ ] Skoorimise ühiktestid läbivad (punkt 7).
- [ ] Raport avaneb ainult tokeniga ja vale token annab 404.
- [ ] Tehisaru lõik ilmub raportisse. Kui API võti on vale, kuvatakse raport ilma lõiguta.
- [ ] Raporti kiri jõuab kohale ja link töötab.
- [ ] Uudiskirja kontakt luuakse ainult märgitud linnukese korral ja DOI kaudu.
- [ ] Sama e-postiga teine test loob uue testi samale osalejale.
- [ ] Kasutajale nähtavat teksti pole koodis, kõik tuleb `et.json` failist.

### Etapp B · kolm nädalat

- [ ] Testrežiimis makse loob ühe programmi kirje. Sama webhook kaks korda loob ikkagi ühe kirje.
- [ ] 100% promokood (`?kood=` lingiga) läbib Checkouti ilma kaardita ja kood salvestub kirjele.
- [ ] Aktiivse programmiga osaleja ei näe makse-CTA-d.
- [ ] Päevakiri tuleb E–R kell 16 osaleja ajavööndis, kuni 15 korda.
- [ ] Vastuse link salvestab vastuse POST-iga. GET üksi ei muuda midagi. Teine klõps kirjutab üle ega tekita teist rida. Muudetud link annab 400.
- [ ] Lõpuraport genereeritakse ja saadetakse pärast viimast päeva. Ilma tehisaruta kuvatakse mallilaused.
- [ ] Ajavööndi test: osaleja ajavööndiga America/New_York saab kirja kell 16 New Yorgi aja järgi.

## 16. Lahtised (ei takista ehitust)

- Domeen. Kuni selleni Verceli vaikedomeen.
- Ingliskeelsed tekstid (`en.json`) koos väidete tagasitõlkega.
- Privaatsuslehe lõplik tekst (viia kooskõlla Truresp'i privaatsuslehega, juriidiline ülevaatus).
- Andmete säilitusaeg (praegu 24 kuud, kohatäide).
- Teise raamatu pealkirja kontroll aluse lehel.
- Tasemete piiride korrigeerimine pärast ~200 vastust.
- Stripe'i 100% koodi kontroll testrežiimis.

Iga otsus, mille Claude Code ehitamise ajal ise teeb, kirjutatakse faili `DECISIONS.md`: mis otsustati, miks ja millal.
