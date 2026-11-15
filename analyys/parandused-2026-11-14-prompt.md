# Konversiooni parandused (14.11 analüüsi põhjal)

Loe enne alustamist: analyys/konversioon-2026-11-14.md, CLAUDE.md, SPEC.md, DECISIONS.md.

Eesmärk: suurendada testi → programmi konversiooni (praegu 1 ost 122 testist) nii, et test ei muutu keerulisemaks. Väiteid, skaalasid, mudelit, testi pikkust ega hinda EI muudeta. Muudame ainult tõlgendust, sõnumeid ja lisame ühe kirja. Tehisaru lõiku see töö ei puuduta, sellega on eraldi tegeletud.

Töötame kolmes etapis. Iga etapp on eraldi deploy. Enne iga etapi koodi näita mulle lühikest plaani: millised failid muutuvad ja mis migratsioonid tulevad. Pärast iga etappi käivita testid, tee deploy ja kirjuta DECISIONS.md faili kuupäev ja muudatus, et saaksin hiljem võrrelda tulemusi enne ja pärast.

Kõik kasutajale nähtavad tekstid on content/et.json failis. Allpool on tekstide mustandid. Pane need sisse täpselt nii, nagu need on, ja lisa iga uue võtme kõrvale DECISIONS.md faili rida „tekst: mustand, Raimo vaatab üle“. Ära kirjuta ise uusi kasutajale nähtavaid lauseid. Kui mõni tekst puudub, pane võtmesse "TODO: Raimo".

---

## Etapp 0 · Parandus ja mõõtmine

1. Uskumuste riba sildid
   - Praegu on kõigil ridadel riba otstes „harva“ ja „sageli“. Uskumuste ridadel peavad olema `report.track.beliefLow` = "vähem" ja `report.track.beliefHigh` = "rohkem". Tegevuste ridadel jäävad praegused sildid.
2. Ostunupu klõps
   - Lisa Vercel Analyticsi kohandatud sündmus `cta_click` nupule „Alusta · 15 €“ ja `code_submit` koodi nupule. Küpsiseid ei lisata.

Valmis, kui: uskumuste ribal on uued sildid ja sündmused on Verceli töölaual näha.

---

## Etapp 1 · Tõlgendus

1. Tegevuste tasemepiirid (ainult tegevustel, uskumused jäävad samaks)
   - Uued piirid: low 1,0–3,4 · mid 3,5–4,9 · high 5,0–6,0. Põhjus: „sageli“ peab tähendama sama mis sprindis, ehk enamikul tööpäevadel.
   - Lisa tests tabelisse veerg scoring_version (text). Olemasolevad read saavad 'v1', uued 'v2'. Raport arvutab taseme selle versiooni piiridega, mis on testi real. Vanade inimeste raportid ei tohi muutuda.
   - content/et.json: hoia piirid versioonide kaupa (test.scoring.levels.v1 ja test.scoring.levels.v2 tegevuste jaoks).
   - Ühiktestid: 4,7 on v1 järgi high ja v2 järgi mid, 5,0 on v2 järgi high, uskumuste piirid on mõlemas versioonis samad.

2. „Sinu peamine muster“ raporti alguses
   - Kohe pealkirja ja sissejuhatuse järel, enne tegevuste ridu, tuleb esile tõstetud plokk (eyebrow + üks või kaks lauset, suurem tekst, brändi stiilis).
   - Loogika: leia kolmest tegevusskoorist madalaim. Viigi korral kehtib järjekord inspireerimine → juhendamine → voimestamine. See on inimese „harvim tegevus“.
   - Kui harvima tegevuse paari uskumuse tase on kõrgem kui selle tegevuse tase (paarid: inimene → inspireerimine, suhe → juhendamine, autonoomia → voimestamine), lisa teine lause.
   - Tekstid:
     - report.pattern.heading: "Sinu peamine muster"
     - report.pattern.weakest.inspireerimine: "Kolmest tegevusest jõuab sinu päeva kõige harvem inspireerimine: arengu välja ütlemine ja väljakutsed."
     - report.pattern.weakest.juhendamine: "Kolmest tegevusest jõuab sinu päeva kõige harvem juhendamine: ootuste ütlemine, tagasiside ja kokkulepete juurde tagasi tulemine."
     - report.pattern.weakest.voimestamine: "Kolmest tegevusest jõuab sinu päeva kõige harvem võimestamine: küsimine, lõpuni kuulamine ja otsuse jätmine inimesele."
     - report.pattern.beliefHigher.inspireerimine: "Samas näitavad sinu valikud, et usud inimeste arengusse. Usk on olemas, inimesteni jõuab see harvem."
     - report.pattern.beliefHigher.juhendamine: "Samas näitavad sinu valikud, et hoiad usaldust. Alus on olemas, selged ootused ja tagasiside jõuavad inimesteni harvem."
     - report.pattern.beliefHigher.voimestamine: "Samas näitavad sinu valikud, et usaldad inimesi ise otsustama. Usk on olemas, päeva jõuab see harvem."
   - Sama loogika (harvim tegevus) peab olema ühes kohas (lib), sest seda kasutab ka etapp 2.

3. Sagedusskaala sildid nähtavaks testis
   - Tegevuste ekraanil on kõigi kuue nupu sildid näha juba enne valimist, mitte alles pärast klõpsu. Kasuta olemasolevaid test.screens.actions.scale tekste.
   - Peab olema loetav 360 px laiusel ekraanil. Kui kuus silti nuppude all ei mahu, kasuta mobiilis nuppude kohal või all üht väikest legendi rida. Näita mulle mobiili ekraanipilti enne deploy'd.
   - Uskumuste skaala jääb nagu on.

4. „Mida see ei tähenda“ uude kohta
   - Tõsta see plokk raportis sissejuhatuse alla (enne mustri plokki või kohe selle järele, vali loetavam). Vahetult enne pakkumist seda enam ei ole.


Valmis, kui: uus test saab scoring_version 'v2', vana raport (v1) näeb välja täpselt nagu enne, muster kuvatakse õigesti kõigil kolmel juhul ja viigi korral, skaala sildid on mobiilis loetavad ja kõik ühiktestid läbivad.

---

## Etapp 2 · Sõnumid

1. Pakkumine algab inimese enda tulemusest (raporti roheline plokk)
   - Asenda üleminekulause „Tahad edasi liikuda?“ isikliku lausega harvima tegevuse järgi:
     - report.cta.personal: "Sinu harvim tegevus on {action}. Kolm nädalat küsib sinult iga tööpäeva lõpus ka seda:"
   - Selle all on harvima tegevuse kaks päevaküsimust täpselt nii, nagu need kirjas tulevad (daily.questions + daily.mapping). Need on loetelu kujul, mitte nupud.
   - Seejärel tuleb programmi pealkiri, tekst, hind ja nupp nagu praegu, aga programmi tekst muutub:
     - programme.body: "Kokku kuus küsimust, alla minuti päevas. Igapäevane küsimus hoiab tegevuse tähelepanu all ja tähelepanust saab tegu. Kolme nädala pärast näed, kui sageli need tegevused sinu päeva jõudsid."
   - Kui osalejal on aktiivne programm, jääb praegune käitumine.

2. Avalehe lubadus
   - home.how.steps[2] tekst: "Saad soovi korral jätkata lihtsa programmiga, mis hoiab kuus võtmetegevust kolm nädalat sinu tähelepanu all."

3. Raporti kiri
   - emails.report: lisa raporti lingi järele mustri lause (sama mis raportis, ilma teise lauseta) ja lõppu üks rida: "Raporti lõpus näed, millised kaks küsimust kolm nädalat sinult küsiks."

Valmis, kui: raporti roheline plokk näitab õige tegevuse nime ja kaks õiget küsimust kõigil kolmel juhul ja raporti kiri sisaldab mustri lauset.

---

## Etapp 3 · Proovipäeva kiri (alles pärast etappide 0–2 deploy'd)

- Järgmisel tööpäeval pärast testi kell 16 osaleja ajavööndis saadetakse üks kiri, kui inimesel ei ole programmi ja talle pole proovipäeva kirja varem saadetud. Ainult üks kord inimese kohta.
- Kirjas on kuus päevaküsimust lihtsa loeteluna. Vastuslinke pole, inimene vastab endale.
- Lisa tests tabelisse veerg trial_sent_at (timestamptz). Saatmine käib olemasoleva tunnipõhise dispatchi kaudu.
- Tekst:
  - emails.trial.subject: "Üks päev proovi: kuus küsimust"
  - emails.trial.body:
    - "Tere!"
    - "Tegid coachiva juhi testi. Selle järgi jõuab sinu päeva kõige sagedamini {strongest} ja kõige harvem {weakest}."
    - "Nüüd proovi, kuidas igapäevane tähelepanu juhtimise küsimus töötab. Mõtle tänasele päevale ja vasta endale jah või ei."
    - [kuus küsimust]
    - "Kui see üks päev suunas tähelepanu sinu jaoks olulisele, siis kujuta ette, mida teeb kolm nädalat tööpäevadel sama tegemine. Siit võib tekkida või tugevneda coachiv harjumus!"
    - {reportButton:Vaata programmi} (link raporti pakkumise juurde, #programm ankruga)
    - "See on ainus lisakiri, mida testi järel saadan."
    - "Raimo"
- {weakest} on inimese harvim tegevus (sama lib-funktsioon mis etapis 1). {strongest} on tema kõrgeima skooriga tegevus; viigi korral kehtib järjekord juhendamine → voimestamine → inspireerimine. Mõlemad on nimetavas käändes ja väikese algustähega, tekstid et.json failis:
  - emails.trial.names.juhendamine: "juhendamine"
  - emails.trial.names.voimestamine: "võimestamine"
  - emails.trial.names.inspireerimine: "inspireerimine"
- Kui kõigi kolme tegevuse skoor on võrdne (tugevaim ja harvim tegevus kattuvad), jäta teine lause ära ja kirja algus on ainult "Tegid coachiva juhi testi."
- Privaatsuslehe „Milleks“ lõiku lisa: "üks proovipäeva kiri järgmisel tööpäeval pärast testi".
- Testi COACHIV_TEST_EMAIL_ALLOWLIST abil enne avalikuks tegemist.

Valmis, kui: testaadress saab kirja täpselt ühe korra järgmisel tööpäeval kell 16, programmi ostnud inimene seda ei saa ja nädalavahetusel kirja ei saadeta.

---

Lõpus: uuenda SPEC.md (punktid 7 ja 13), DECISIONS.md ja käivita scripts/sync-content. Too mulle nimekiri kõigist uutest ja muudetud tekstivõtmetest, et saaksin need üle vaadata.
