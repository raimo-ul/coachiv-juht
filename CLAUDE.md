# Coachiv juht · juhised Claude Code'ile

See repo ehitab toote „Coachiva juhi test“: tasuta test, raport ja kolme nädala programm. Omanik on Raimo Ülavere (Radical Simplicity).

## Alusta siit

1. Loe läbi `SPEC.md`. See on ainus allikas, mille järgi ehitad.
2. Kõik kasutajale nähtavad tekstid on failis `content/et.json`. Koodi ei kirjuta ühtegi kasutajale nähtavat lauset.
3. Ehita etappide kaupa: kõigepealt **etapp A** (test ja raport), siis **etapp B** (kolm nädalat). Iga etapi lõpus kontrolli `SPEC.md` punktis 15 olevad valmisoleku kriteeriumid ja anna Raimole ülevaade.
4. Taustaks on `docs/coachiva-juhi-mudel.md`: mudel, allikad ja nõrkused. Seda läheb vaja aluse lehe ja tehisaru juhendite mõistmiseks. Koodi see ei mõjuta.

## Olemasolevad projektid samas arvutis

- `~/attfocus`: päevamootor, allkirjastatud jah/ei lingid, idempotentsus, lõpuraport. **Võta mustrid sealt üle.**
- `~/truresp`: keele tuvastus IP järgi, keelevahetaja, privaatsuslehe näidis.
- `~/radical-simplicity`: bränd, kujundus, fondid.

Kui sul pole nendele kaustadele ligipääsu, palu Raimol käivitada sind lisakaustadega (`claude --add-dir ~/attfocus --add-dir ~/truresp --add-dir ~/radical-simplicity`). Ära kopeeri nendest projektidest saladusi ega võtmeid.

## Reeglid

- Ära ehita seda, mis on `SPEC.md` punktis 2 („Mitte ehitada esimeses versioonis“).
- Võtmed ja saladused on ainult keskkonnamuutujates. Ära kirjuta neid koodi, logidesse ega repo.
- Iga otsus, mida spec ei kata, läheb faili `DECISIONS.md`: mis, miks ja millal. Kui otsus muudab kasutaja teekonda, hinda või andmekaitset, küsi enne Raimolt.
- Kui AttFocuse või Truresp'i lahendus erineb specist, eelista olemasolevat lahendust ja kirjuta erinevus `DECISIONS.md` faili.
- Tekstide muutmine käib `content/et.json` failis. Kui mõni tekst puudub, lisa võti koos märkega `"TODO: Raimo"` ja ära mõtle lauset ise välja.
- Kirjutamise reeglid tehisaru väljundile ja kõigile uutele tekstidele: ilma mõttekriipsuta (—), ilma „ei …, vaid …“ vastandusteta, ilma komata enne „ja“. Kirjelda tegevust, mitte omadust.
- Kujundus: Radical Simplicity, **hele**. Taust #FFFFFF, pind (kaardid) #EBEAE5, tekst #0F0F0F, teisene tekst #6A6862, üks aktsent #00FA96, joon #2B2B2B. Bebas Neue pealkirjad, DM Sans tekst, teravad nurgad (radius 0). Mobiil esmalt.
  - **Roheline on täide, mitte tekst.** #00FA96 valgel on ~1,5:1 ja kukub kontrastis läbi. Nupu taust jah, tekstivärv ei.
  - **Jooned on peaaegu mustad juuksekarvad, mitte hall.** 1px #2B2B2B. See on brändi kõige iseloomulikum osa ja esimene asi, mille tüüpiline mall valesti teeb.
  - Stiilimine käib **Tailwind 3.4-ga**, sama versioon mis radical-simplicity's ja attfocus-v2-s, et Lovable'is tehtud disain tuleks siia ilma tõlkesammuta. Värvid on HSL-kanalid CSS-muutujates, loetakse `hsl(var(--x))` kaudu.
- Commit'i sõnumid ja kood on inglise keeles, kasutajale nähtav sisu on eesti keeles.

## AttFocus ja muud olemasolevad projektid

Kui mõni asi on AttFocuses (või truresp'is, radical-simplicity's) juba olemas ja
töötab, **tõsta see üle, ära kirjuta ümber**. Raimo viitab nendele projektidele
just sellepärast. Kirjuta kommentaari, kust tõstetud ja mis teel muutus.

Siiani üle tõstetud: `_shared/emailLayout.ts` (AttFocuse kirjakest, Outlookis
läbi proovitud), `sendEmail` (AttFocuse `sendEmailBrevo`), `EMAIL_DISABLED`
hädapidur, päevalehe kuju (`attfocus-v2/src/pages/TokenDaily.tsx`),
`lib/functionsUrl.ts` (AttFocuse oma eeskujul).
