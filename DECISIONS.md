# Otsused

Iga otsus, mida SPEC.md ei kata või mis sellest erineb. Uusim on üleval.

| Kuupäev | Otsus | Põhjus | Kes |
|---|---|---|---|
| 2026-10-30 | Taust Supabase'i edge-funktsioonides, mitte Next.js API marsruutides | Raimo otsus. Kolm olemasolevat projekti töötavad nii ja saladused on seal. Kõrvalkasu: Vercelis ei ole enam ühtegi saladust, service role võti ei lahku Supabase'ist | Raimo |
| 2026-10-30 | Uudiskiri läheb Smailysse, olemasolevasse lugejate nimekirja, mitte Brevo loendisse | SPEC 3 ütleb Brevo loend. Raimo päris uudiskiri on Smailys ja radicalsimplicity.eu liidab inimesi sinna. Brevo loend siin jagaks ühe lugejaskonna kahte süsteemi | Raimo |
| 2026-10-30 | `temperature` eemaldatud tehisaru kutsest | SPEC 12 nõuab 0,3. Sonnet 5 vastab sellele `400 temperature is deprecated for this model`, nii et iga kutse ebaõnnestus | Claude |
| 2026-10-30 | `max_tokens` 400 asemel 4000 | SPEC 12 ütleb 400. Mudel mõtleb enne kirjutamist ja mõtlemine kulub samast eelarvest. 400 juures lõppes eelarve enne lõiku; 2000 juures katkes lõik keset lauset. Lõik ise on endiselt 4–5 lauset, sest juhend ütleb nii ja `validateParagraph` kontrollib | Claude |
| 2026-10-30 | Tehisaru vastusest loetakse esimene `text`-plokk, mitte `content[0]` | Sonnet 5 paneb ette `thinking`-ploki, mille `.text` on olemata. `content[0].text` andis iga kord tühja stringi | Claude |
| 2026-10-30 | Katkenud lõik (`stop_reason: max_tokens`) loetakse ebaõnnestumiseks | Pooleli jäänud lause ei ole lühike lõik. `validateParagraph` luges kolm tervet lauset pluss katke kolmeks lauseks ja lasi läbi | Claude |
| 2026-10-30 | Lõiku ei kirjutata enam taustal, vaid `get-report-ai` sees päringu ajal | Kutse kestab ~36 s ja `EdgeRuntime.waitUntil` ei hoia isolaati nii kaua usaldusväärselt: neljast katsest kaks valmis, üks `failed`, üks jäi igaveseks `pending`. Nüüd teeb töö see päring, mida raportileht niikuinii pollib. Rida haaratakse aatomiliselt, et kaks avatud sakki ei kirjutaks kahte lõiku | Claude |
| 2026-10-30 | Pollimise aken 20 s asemel 60 s | SPEC 5.1 ütleb 20 s. See number on kirjutatud enne mõõtmist: mõõdetud jooks võttis 36 s. 20 s juures ei jõuaks lõik esimesel külastusel kunagi kohale | Claude |
| 2026-10-30 | Cron tuleb etapis B pg_cron + pg_net abil, mitte Vercel Croniga | SPEC 3 ütleb Vercel Cron. Taust on nüüd Supabase'is, nii et ajastus käib samas kohas, nagu AttFocuses | Claude |
| 2026-10-30 | Tasemete piirid loetakse lõikepunktidena: alla 3,0 = low, alla 4,5 = mid, muidu high | SPEC kirjutab vahemikud ühe komakohaga (1,0–2,9 · 3,0–4,4 · 4,5–6,0), mistõttu 2,95 ja 4,45 ei kuulu kuhugi. Lõikepunktidena saab iga võimalik skoor täpselt ühe taseme ja kirjapandud vahemikud ei muutu | Claude |
| 2026-10-30 | `cacheComponents` lülitatud välja (Next 16 skeletoni vaikeseade oli sees) | Peaaegu iga leht on ühe inimese privaatne andmestik, mida loetakse päringu kaupa. Sisselülitatuna on leht vaikimisi puhverdatud ja vea hind on see, et üks külastaja näeb teise raportit. Väljas on vea hind see, et leht renderdatakse sagedamini kui vaja. Lisaks keelab see `dynamic` ja `runtime` seadistused, millega need lehed just ütlevadki „ära puhverda“ | Claude |
| 2026-10-30 | E-kirjad on hele taust, tume tekst (SPEC 13 lubas valida) | Tume kiri on raskem: Outlook Windowsis eirab `body` taustavärvi ja Gmaili tume režiim värvib teksti ümber, mis annab osale lugejatest halli hallil. Valge taust renderdub kõikjal ühtemoodi ja üks roheline nupp kannab brändi edasi | Claude |
| 2026-10-30 | Lisatud `EMAIL_DISABLED` hädapidur (ei ole SPEC-is) | AttFocuse muster. Seal tähendas selle puudumine, et ainus viis kirjade peatamiseks oli Brevo võtme tühistamine, mis võtab maha ka kõik muud teavitused. Maksab ühe keskkonnamuutuja ja ühe hargnemise | Claude |
| 2026-10-30 | `monday_intro`-laadne nupusüntaks kirjades: `{nimiButton:Silt}` | Kirja keha on `et.json`-is massiiv. Nii saab Raimo nuppu kirjas üles-alla liigutada ja selle sõnu muuta ilma koodi puutumata | Claude |
| 2026-10-30 | Andmebaasi migratsioon loob kõik neli tabelit korraga, mitte ainult etapi A omad | Skeem on SPEC-is juba otsustatud. Poolikuna tehes tuleks etapis B teine migratsioon, mis lisab veerud, mida esimene oleks saanud kohe kanda | Claude |
| 2026-10-30 | Tasemed: low 1,0–2,9 · mid 3,0–4,4 · high 4,5–6,0 | Toetuvad skaala sõnadele; korrigeeritakse pärast ~200 vastust | Raimo + Claude |
| 2026-10-30 | Test kahel ekraanil (9 tegevust, 9 valikut) | Kaks skaalat, üks ekraan skaala kohta | Claude |
| 2026-10-30 | Vastuse link: GET näitab lehte, POST salvestab | E-posti skännerid avavad GET-linke | Claude |
| 2026-10-30 | Esimene versioon ainult eesti keeles, en-struktuur valmis | Raimo otsus | Raimo |
| 2026-10-30 | Hind 15 € koos käibemaksuga, Stripe Taxi pole | Raimo otsus | Raimo |
| 2026-10-30 | Tehisaru: testi raportis 4–5 lauset, lõpuraportis kolm lõiku, kontekstiküsimust pole | Raimo otsus | Raimo |
