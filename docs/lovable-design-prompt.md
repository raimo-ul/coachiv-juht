# Lovable design prompt

In English, because Lovable follows English instructions more closely. The
Estonian copy inside it is real, approved text from `content/et.json` and should
be used as written.

Paste everything below the line.

---

You are designing a product site. Design it well. I am giving you the brand, the
content and what each page has to achieve. The design decisions are yours.

**Build it as a static front end only.** No backend, no database, no auth, no
form handling, no API calls. Real pages with this content hardcoded. I am wiring
the logic myself afterwards, so what I need from you is the design.

## What it is

A free self-assessment for managers, in Estonian, called **Coachiva juhi test**
(the Coaching Leader Test). A manager answers 18 statements on a 1 to 6 scale,
gives their email, and immediately gets a personal report scoring six things:
three **actions** they took over the last four weeks, and three **beliefs** their
real choices reveal. The report ends by offering a paid three-week follow-up
programme for 15 €.

## Who it is for

Estonian managers, roughly 35 to 55. Experienced, busy, a little sceptical of
leadership fashion. They will open this on a phone between meetings. They have
seen a hundred corporate personality quizzes and this is not one: it does not
sort anyone into a type and it never scores them against other people. It should
feel grown-up and earned rather than playful or gamified.

## The brand

Radical Simplicity, Raimo Ülavere's practice. **Light background.** Keep broadly
to these. They are a starting point, not a cage.

```
#FFFFFF   white ground
#EBEAE5   warm bone, the brand's second surface
#0F0F0F   near-black for text
#6A6862   warm grey for secondary text
#00FA96   the signature green
#2B2B2B   near-black, used for rules and edges
```

Typefaces: **Bebas Neue** for headings, **DM Sans** for body. Load them with
latin-ext — Estonian needs ä ö ü õ š ž and a missing subset breaks words
visibly.

The character is confident and uncluttered, closer to a well-set printed report
than to a SaaS dashboard. Within that, the look is yours to make. Extend the
palette with tints, shades or a supporting neutral if the design wants them. Use
depth, texture, scale, motion or imagery where they make it better. Interpret
the green rather than ration it.

Two things worth knowing rather than obeying. The green is very light: on white
it lands near 1.5:1, so as small text it will be unreadable, which is why it
tends to end up as a fill, a rule or an accent. And the existing brand leans on
hard near-black lines rather than soft grey cards, which is a good part of why it
looks like itself. Do what you think is best with both.

What I will judge it on: does the home page make a sceptical manager want to
start, and does the report look like something they would forward to a colleague.

## Pages

### `/` — home

A real landing page. This is the page that has to earn the five minutes, so give
it the most attention. Sections, rhythm, a proper hero. Make it attractive.

Here is the material. The Estonian is approved copy, so keep the wording; the
order, grouping, emphasis and what deserves to be large are your call. Anything
marked PLACEHOLDER has no copy yet, so design the slot and put a sensible
Estonian stand-in there that I will replace.

**The headline and the offer**

```
Coachiva juhi test

Coachiv juhtimine on kombinatsioon uskumustest ja tegevustest. Testi tehes saad
viie minutiga teada, kus sina praegu coachiva juhina oled.

Alusta testi · 5 min

Tasuta. Raport kohe ekraanile ja e-postile.
```

**The tension that makes someone care.** A strong candidate for the hook. Use it
where you think it lands best:

```
Coachiv juhtimine on ühelt poolt ülipopulaarne ja teiselt poolt erakordselt
ebamäärane. Sellest räägitakse ja sellele viidatakse üksikute tegevuste või
uskumuste kaudu. Kas see on vahend või filosoofia? Igas olukorras rakendatav või
pigem täppistöövahend? Pehmodele või hoopis tugevatele juhtidele?
```

**The model.** Six parts in two groups. This is what the product actually
measures, so it probably deserves to be the visual centrepiece. Each part has a
plain meaning and an honest label for how strong the research behind it is. That
honesty is a selling point here, not fine print:

```
USKUMUSED
  Inimene         Inimesed saavad areneda                                  Tugev
  Suhe            Töötaja usaldus juhi vastu on coachiva juhtimise eeldus  Kaudne
  Autonoomia      Inimene suudab end ise juhtida, kui otsus on tema oma    Suunav

TEGEVUSED
  Juhendamine     Ootused, tagasiside, kokkulepete juurde tagasi tulemine  Tugev
  Võimestamine    Küsimine, kuulamine, otsus jääb inimesele                Vaidlustatud
  Inspireerimine  Arengu välja ütlemine, väljakutsed                       Keskmine
```

**What you get.** Show it rather than only describing it: a preview of the
report, built from the real report design below.

```
PLACEHOLDER — lühike lõik sellest, mida raport sisaldab
```

**How it works.** Three steps:

```
PLACEHOLDER — 18 väidet, viis minutit
PLACEHOLDER — raport kohe ekraanile ja e-postile
PLACEHOLDER — soovi korral kolm nädalat, kuus küsimust päevas
```

**The honest limit.** Unusual on a landing page and deliberately kept, because it
is what makes the rest believable:

```
Test on enesehinnang. See näitab, kui sageli tegevused sinu päeva jõuavad ja
milliseid valikuid sa teed. Kui hästi sa neid tegevusi teed, näevad kõige
paremini sinu inimesed.
```

**The paid programme.** Mentioned here, bought later from inside the report, so
this section should send people into the test rather than to a payment button:

```
Kolm nädalat, kuus küsimust

Iga tööpäeva lõpus saad kirja kuue jah/ei küsimusega. Vastamine võtab alla
minuti. Kolme nädala pärast näed, kui sageli need tegevused sinu päeva tegelikult
jõudsid, ja saad seda selle testiga võrrelda.

15 € koos käibemaksuga
```

Close the page by sending people into the test, plus a quiet link to the
background page: `Mille peale test tugineb →`

This page is about the test, not about Raimo. His background and the academic
sources live on their own page and one link to it is enough.

### `/test` — taking the assessment

An intro step:

```
Testis on 18 väidet kolme coachiva juhi võtmeuskumuse ja kolme võtmetegevuse kohta.
Vasta selle järgi, mida sa päriselt usud ja teed.

Alusta
```

Then two screens of nine statements each, with a running sense of progress
(`0 / 18`).

**Screen 1** — `Viimase nelja nädala jooksul, kui sageli sa…`
Every point on the scale carries a word:

```
1 mitte kordagi · 2 korra · 3 paar korda · 4 umbes kord nädalas ·
5 mitu korda nädalas · 6 peaaegu iga päev
```

Example statement: `ütlesid kellelegi selgelt, millist tulemust sa temalt ootad`

**Screen 2** — `Kui hästi kirjeldab see sinu tegelikke valikuid viimase poole
aasta jooksul?`
Same 1 to 6, but only the ends are labelled: 1 `ei kirjelda üldse`, 6 `kirjeldab
täpselt`. The numbers between carry no words.

Example statement: `Kui inimene ei tule ülesandega toime, uurin kõigepealt, mida
ta peaks selleks õppima.`

**This scale is the real design problem in the project.** Six options, six long
Estonian words, a 390px phone, and someone doing it eighteen times in a row. It
has to stay readable, stay tappable, make the chosen answer obvious at a glance,
and feel quick rather than like filling in a form. Solve it however you think
best. This is the thing I most want your judgement on.

Then the email step:

```
Kuhu raport saata?

E-post

☐ Tahan saada ka Raimo uudiskirja
   Ainult sisu, mida saad juhina kasutada. Loobuda saad ühe klõpsuga.

Näita raportit

Raport saadetakse sellele aadressile. Loe lähemalt: Privaatsus
```

### `/raport` — the report

The most important screen in the product. Someone has just spent five minutes on
it and this is what they might forward to a colleague.

```
Sinu coachiv juhtimine praegu

See raport näitab, kui sageli kolm coachiva juhi tegevust viimase nelja nädala
jooksul sinu päeva jõudsid ja milliseid valikuid sa juhina teed. Iga tegevus ja
uskumus on eraldi, sest need on erinevad asjad.
```

**Six results**, grouped under `TEGEVUSED` and `USKUMUSED`. Each has a name, a
score from 1 to 6 with one decimal and an Estonian comma, a line explaining what
the part means, and a sentence about where this person landed:

```
Juhendamine                                                              4,7
Inimene teab, millist tulemust temalt oodatakse, saab tagasisidet oma tegevuse
kohta ja juht tuleb kokkulepete juurde tagasi.
Ootused, tagasiside ja kokkulepete juurde tagasi tulemine on sinu nädalas
tavaline osa.
```

One caveat: the product deliberately avoids anything that reads as a grade or a
ranking, so a number out of six should not end up looking like a mark out of
six. How you solve that is up to you.

**A comparison block**, `Uskumus ja tegevus koos`, with up to three short cards
pairing a belief with its action, headed like `Inimene · Inspireerimine`.

**A personal paragraph**, `Mida sinu tulemused koos näitavad`: four or five
sentences of prose written individually for this reader. It should feel written
rather than generated, so give it a treatment that sets it apart.

**A caveat panel**, `Mida see ei tähenda`, quieter than the rest.

**The offer**, using the same programme copy as the home page, with a button
`Alusta · 15 €` and a line beneath it: `Sul on ettevõttelt kood? Sisesta see
makselehel.`

### `/alus` — what the test is based on

A long read: why this test exists, a table of the six parts with their academic
sources and strength of evidence, what the test does not measure, and a short
bio. The table has four columns (`Osa`, `Mida see tähendab`, `Peamised allikad`,
`Tõendite tugevus`) and needs to work on a phone. Editorial, generous, built for
reading.

### `/privaatsus` — privacy

Headed sections of running text. Nothing needed beyond excellent readability.

## Practical

- Every page carries a footer: `Mille peale test tugineb · Privaatsus` and
  `Raimo Ülavere · Radical Simplicity · radicalsimplicity.eu`
- Phone first in importance, good on a laptop too.
- Keep the Estonian exactly as written. Do not translate it, paraphrase it or
  replace it with lorem ipsum.
