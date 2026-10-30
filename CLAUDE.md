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
- Kujundus: Radical Simplicity. Taust #0F1110, tekst #F0EFEA, teisene tekst #A8A89E, üks aktsent #00FC99, Bebas Neue pealkirjad, DM Sans tekst, teravad nurgad. Mobiil esmalt, minimalistlik.
- Commit'i sõnumid ja kood on inglise keeles, kasutajale nähtav sisu on eesti keeles.
