# Otsused

Iga otsus, mida SPEC.md ei kata või mis sellest erineb. Uusim on üleval.

| Kuupäev | Otsus | Põhjus | Kes |
|---|---|---|---|
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
