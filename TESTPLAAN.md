# Coachiv juht · käivitamiseelne läbimäng

Kuupäev: 01.11.2026

Üks läbimäng kogu kliendi teekonnast, päris süsteemi peal, enne kui esimene võõras inimene lehele jõuab. Plaan ütleb ka, mida see läbimäng **ei** kata, sest kontrollimata osa teadmine on sama oluline kui kontrollitud osa.

Märgistus: **R** = Raimo teeb · **C** = Claude teeb · **R+C** = koos.

---

## 0. Ohutus enne algust

| kontroll | seis |
|---|---|
| Andmebaasis ei ole võõraid aadresse | ✅ kõik kümme on `raimoulavere+cjN@gmail.com` või põhiaadress |
| Aktiivseid liitumisi ei ole | ✅ null, nii et ükski cron ei saada midagi ootamatult |
| Cronid töötavad | ✅ `coachiv-daily` iga tund, `coachiv-final` iga tund :15 |

**Reegel kogu läbimängu ajaks:** iga uus testaadress on `raimoulavere+cjN@gmail.com`. Ühtegi muud aadressi andmebaasi ei lähe.

`EMAIL_DISABLED` jääb **välja**, sest kirjade kohalejõudmine on üks asi, mida me siin kontrollime.

---

## 1. Mis on juba kontrollitud

Neid ei tee uuesti, kui miski vahepeal ei muutu.

- Test avaneb ja töötab mobiilis ja arvutis, lehe uuesti laadimine ei kaota vastuseid
- Skoorimine, 66 ühiktesti
- Raport avaneb ainult tokeniga, vale token annab 404
- Tehisaru lõik ilmub testiraportisse
- Päevakiri tuleb E–R kell 16 osaleja ajavööndis, üks link
- Kuus vastust lähevad ühe POST-iga, teine klõps kirjutab üle, muudetud allkiri annab 400
- Viimase päeva kiri kannab enesehindamise linki, žetoon tehakse ainult korra
- Enesehindamine nõuab kõiki kolme välja, teine esitamine annab 409
- Lõpuraport arvutatakse, enesehinnang jõuab raportisse ja peegelduse teise lõiku
- Maksevormi loomine päris Stripe'i võtmetega
- Webhooki otspunkt on ligipääsetav ja lükkab allkirjata päringu tagasi
- Mõlema raporti PDF, A4, murdekohad üle vaadatud

---

## 2. Osa A · tasuta teekond (C, ~30 min)

Uus osaleja `raimoulavere+cj10@gmail.com`, kogu tee brauseris nagu päris inimene, mitte API kaudu.

| # | samm | mida kontrollin |
|---|---|---|
| A1 | Ava `coachivjuht.radicalsimplicity.eu` | leht laeb, hero, „Vaata teadust testi taga" viib `/alus` lehele |
| A2 | Ava `?kood=TESTKOOD` | kood läheb küpsisesse `cj_promo`, URL puhastub |
| A3 | Tee test läbi | 18 väidet kahel ekraanil, edenemisriba, iga väide kohustuslik |
| A4 | Laadi leht testi keskel uuesti | vastused ei kao |
| A5 | E-posti ekraan | ajavöönd loetakse brauserist, uudiskirja linnuke on märkimata |
| A6 | Saada | suunab `/raport/[token]` peale |
| A7 | Raport | kuus skoori, kolm paari, „Mida see ei tähenda" |
| A8 | Oota lõiku | tehisaru lõik ilmub alla 60 s, ei nimeta tüüpe, lõpeb küsimusega |
| A9 | Märgi kontaktisoov | `participants.contact_requested` muutub andmebaasis |
| A10 | Vajuta „Laadi PDF alla" | kolm lehekülge, müügiplokk puudub, värvid on alles |
| A11 | Kontrolli postkasti | raporti kiri on kohal, link töötab, jalus õige |
| A12 | Tee **sama aadressiga teine test** | uus `tests` rida samale osalejale, uus raport |

**Lahtine, mida A ei lahenda:** uudiskirja linnuke. Smaily opt-in on koodis, aga päris kontakti lisamist ei ole kordagi kontrollitud. **R** peab pärast A5 vaatama, kas kontakt Smaily nimekirja jõudis.

---

## 3. Osa B · makse (R+C, ~20 min)

**Enne:** `R` parandab ruuteri DNS-i (`coachivjuht.radicalsimplicity.eu` ei lahendu veel sinu masinas), muidu viskab Stripe sind pärast maksmist surnud lehele.

| # | samm | kes | mida kontrollin |
|---|---|---|---|
| B1 | Vajuta raportis „Alusta · 15 €" | R | maksevorm avaneb, toote nimi ja hind õiged, keel eesti |
| B2 | Maksa päriselt 15 € | R | makse läheb läbi |
| B3 | Suunamine | R | jõuad `/raport/[token]?alustatud=1` peale, kinnitus on näha |
| B4 | Webhook | C | `enrollments` rida tekkis, `start_date` on järgmine tööpäev, `end_date` 15. tööpäev, `amount_total` 1500 |
| B5 | Tervituskiri | R | kiri on postkastis, `{startDate}` ja `{sendTime}` on täidetud, mitte toored |
| B6 | Ava raport uuesti | C | makse-CTA asemel on „sul on aktiivne programm" |
| B7 | Proovi teist makset | C | `create-checkout` annab 409 |
| B8 | Saada sama webhook teist korda | C | teist liitumist ei teki |
| B9 | Tagasimakse | R | Stripe'ist |

**Eraldi, 100% sooduskood.** `R` teeb Stripe'is 100% kupongi ja koodi (nt `TESTKOOD`, max 1 kasutus). Siis `C` läbib ostu lingiga `?kood=TESTKOOD` ja kontrollib, et Checkout läheb läbi **ilma kaardita** ja `promo_code` salvestub kirjele. See on SPEC-i ainus TEGEMATA kontroll.

---

## 4. Osa C · kolm nädalat (C, ~30 min)

Kolme nädala ärakannatamine ei ole võimalik, nii et aega keritakse. `dispatch-daily` võtab `now` parameetri just selleks.

| # | samm | mida kontrollin |
|---|---|---|
| C1 | Nihuta B-liitumise kuupäevad minevikku | `start_date` = 15 tööpäeva tagasi, `end_date` = eile |
| C2 | Jooksuta `dispatch-daily` 15 korda, igale päevale oma `now` | iga päev saadab täpselt ühe kirja, `day_index` 1..15 |
| C3 | Jooksuta sama päev teist korda | ei saada midagi (`juba saadetud`) |
| C4 | Jooksuta laupäevase `now`-ga | ei saada midagi (`nädalavahetus`) |
| C5 | Ava päevalink | kuus küsimust, tekstid õiged, „Saada" hall kuni viimase vastuseni |
| C6 | Vasta, ava uuesti | varasemad vastused on näha, saab parandada |
| C7 | Riku allkiri | 400, midagi ei salvestu |
| C8 | Viimane päev | kiri kannab **kahte** linki, teine on enesehindamine |
| C9 | Täida enesehindamine | kolm välja nõutud, salvestub |
| C10 | Ava enesehindamine uuesti | näitab tänu, mitte tühja vormi |

**Postkast:** 15 kirja ühe hooga. `R` vaatab neist vähemalt kolm läbi: esimene, üks keskelt, viimane. Kontrollida: pealkiri, päevanumber, nupp töötab, jalus.

---

## 5. Osa D · lõpuraport (C, ~15 min)

| # | samm | mida kontrollin |
|---|---|---|
| D1 | Jooksuta `dispatch-final` | arvutab, saadab kirja, paneb `status = finished` |
| D2 | Ajastus | ei saada enne `nextWorkday(end_date)`; reedel lõppev ei tule laupäeval |
| D3 | Lõpuraporti kiri | kohal, link töötab |
| D4 | Ava leht | järjepidevus, kaks sagedasemat, üks harvem, enesehinnang, kõik kuus |
| D5 | Peegeldus | kaks lõiku pluss küsimus, teine lõik kasutab osaleja enda sõnu |
| D6 | Küsimus | küsib, mida edasi hoida, **ei** ole soovitus ega käsi harvemat tegevust parandada |
| D7 | PDF | neli lehekülge, murdekohad korras |
| D8 | Vastamine pärast raportit | ei muuda enam numbreid |

**Eraldi, enesehinnanguta jooks.** `C` teeb teise liitumise, jätab enesehindamise täitmata ja kontrollib, et peegeldus tuleb **ühe** lõiguga pluss küsimus, ilma väljamõeldud „sinu sõnadeta".

---

## 6. Osa E · sisu (R, ~45 min)

Seda ei saa mina teha. Kood ütleb, kas tekst jõuab ekraanile; kas see on õige tekst, ütled sina.

- **18 väidet** `/test` lehel: sõnastus, järjekord, skaalade sildid
- **Kuus päevaküsimust**: kas need on need kuus, mida sa tahad kolm nädalat küsida
- **Kuue osa tähendused** raportis ja `/alus` lehel
- **`/alus` leht**: allikad, mudeli kirjeldus, raamatute pealkirjad ja **aastad** (2009, 2024 on minu pandud ja kontrollimata)
- **Kõik viis kirja**: raport, tervitus, päev, viimane päev, lõpp
- **Privaatsusleht**: praegu mustand, ei räägi kontaktilinnukesest ega kolme nädala andmetest
- **Mõttekriipsud**: `et.json`-is on kolm kohta, kus on `—`, mida `CLAUDE.md` keelab

---

## 7. Mida see läbimäng ei kata

Aus nimekiri sellest, mis jääb käivitamise hetkel kontrollimata.

- **Ajavöönd.** Kogu test käib Europe/Tallinn ajas. `America/New_York` osalejat ei ole kordagi olnud. Kood on kirjutatud nii, et iga osaleja kell loetakse eraldi, aga seda ei ole päriselt nähtud.
- **Koormus.** Üks inimene korraga. Kümme inimest samal kellaajal kirja saamas on katsetamata.
- **Kirjade kohalejõudmine võõrastesse postkastidesse.** Kõik testkirjad lähevad ühte Gmaili, mis on saatjat juba näinud. Outlook, Office 365 ja rämpsfiltrid on katsetamata.
- **Suvalise kuupäeva käitumine.** Riigipühi ei arvestata (teadlik otsus). Kuuvahetus ja aastavahetus on katsetamata.
- **Mis juhtub, kui tehisaru on maas.** Kood on kirjutatud nii, et raport tuleb ilma lõiguta. Päris tõrget ei ole esinenud.

---

## 8. Koristus

Pärast läbimängu, enne esimest päris inimest:

- kustuta kõik testliitumised ja nende päevavastused
- kustuta testosalejad (`raimoulavere+cjN@gmail.com`)
- jäta alles ainult see, mida sa ise tahad alles hoida
- kontrolli, et aktiivseid liitumisi on null, muidu hakkavad cronid saatma

**Enne kustutamist küsin.** Andmete kustutamine on pöördumatu ja see on sinu otsus, mitte minu.
