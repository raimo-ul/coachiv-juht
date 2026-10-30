# Lovable design prompt

In English, because Lovable follows English instructions more closely. The
Estonian copy inside it is verbatim from `content/et.json` and must not be
rewritten.

Paste everything below the line.

---

Build a static, design-only marketing and assessment site. **No backend, no
database, no auth, no API calls, no form submission logic.** Every screen is a
static page with hardcoded content. I will wire the logic myself afterwards.

## The product

A free 18-statement self-assessment for managers called "Coachiva juhi test"
(Coaching Leader Test). A manager answers 18 statements on a 1–6 scale across
two screens, gives their email, and immediately sees a report with six scores:
three **actions** (what they did in the last four weeks) and three **beliefs**
(what their actual choices show). The report ends with an offer for a paid
three-week programme. The audience is Estonian managers, 35–55, serious people
with no patience for decoration.

## Visual direction

This is the Radical Simplicity brand. **Light, not dark.** Confident, spare,
editorial. Think a well-set printed report, not a SaaS dashboard. A lot of white
space. No gradients, no glassmorphism, no drop shadows, no rounded corners, no
illustrations, no stock photos, no icons unless they carry meaning.

### Exact palette — use these values, do not invent others

```
--background        #FFFFFF   page ground
--surface           #EBEAE5   warm bone, for cards and panels
--foreground        #0F0F0F   near-black, all body and heading text
--muted             #6A6862   warm grey, secondary text only
--accent            #00FA96   bright green
--border            #2B2B2B   near-black hairline
```

Two rules that matter more than the rest:

1. **The green is a fill, never text.** `#00FA96` on white fails contrast badly.
   Use it as a solid button background with near-black text on top, as a 3–4px
   rule or bar, or as a small marker. Never as a text colour on white.
2. **Borders are near-black hairlines, not light grey.** 1px `#2B2B2B`. This is
   the single most distinctive thing about the brand: hard, printed-looking
   rules instead of soft grey cards.

### Type

- Headings: **Bebas Neue**, uppercase, tight line-height (1.0–1.1), slight
  letter-spacing. Large and confident.
- Body: **DM Sans**, 17px base, line-height 1.6.
- Load both from Google Fonts with latin-ext (Estonian needs ä ö ü õ š ž).

### Shape and motion

- `border-radius: 0` everywhere, including buttons and inputs.
- Mobile first. It must be excellent at 390px wide before it is good at 1200px.
- Maximum text column around 34rem. Do not let body text run full width.
- Motion only where it helps: a progress bar filling, a button state. No
  scroll-triggered animation, no parallax, no fade-ins.

## Screens to build

### 1. `/` — home · **this is a proper marketing landing page, not a thin splash**

Full-width sections stacked down the page, each with its own rhythm. Every
sentence below is real approved Estonian copy unless marked PLACEHOLDER. Keep
the wording exactly; design around it.

#### Hero

Give this real presence. Bebas Neue at a genuinely large size, a lot of air
around it, one green element and nothing else competing.

```
COACHIVA JUHI TEST

Coachiv juhtimine on kombinatsioon uskumustest ja tegevustest. Testi tehes saad
viie minutiga teada, kus sina praegu coachiva juhina oled.

[ALUSTA TESTI · 5 MIN]

Tasuta. Raport kohe ekraanile ja e-postile.
```

No stock photography, no abstract 3D, no gradient mesh. If the hero needs a
visual anchor beyond type, build it from the six model words themselves, or from
hard rules and the one green block. The brand's confidence comes from space and
typography, not from imagery.

#### Section: the tension

The hook. Set the opening question big enough to stop someone scrolling.

```
Coachiv juhtimine on ühelt poolt ülipopulaarne ja teiselt poolt erakordselt
ebamäärane. Sellest räägitakse ja sellele viidatakse üksikute tegevuste või
uskumuste kaudu. Kas see on vahend või filosoofia? Igas olukorras rakendatav või
pigem täppistöövahend? Pehmodele või hoopis tugevatele juhtidele?
```

#### Section: the model — the centrepiece of the page

Six parts in two groups of three. This is what the product actually is, so it
deserves the most design thought on the page. Each row carries a name, a plain
meaning, and how strong the research behind it is. The honesty of that last
column is a feature, not a disclaimer: show it, do not bury it.

```
USKUMUSED
  Inimene        Inimesed saavad areneda                                    Tugev
  Suhe           Töötaja usaldus juhi vastu on coachiva juhtimise eeldus    Kaudne
  Autonoomia     Inimene suudab end ise juhtida, kui otsus on tema oma      Suunav

TEGEVUSED
  Juhendamine    Ootused, tagasiside, kokkulepete juurde tagasi tulemine    Tugev
  Võimestamine   Küsimine, kuulamine, otsus jääb inimesele                  Vaidlustatud
  Inspireerimine Arengu välja ütlemine, väljakutsed                         Keskmine
```

Make the evidence word read as a quiet label, not as a score or a rating badge.
Must work as a readable structure on a 390px phone, not a table squeezed sideways.

#### Section: what you get

```
PLACEHOLDER — Raimo kirjutab. Lühike lõik selle kohta, mida raport sisaldab:
kuus skoori, uskumuse ja tegevuse võrdlus, isiklik kokkuvõte.
```

Next to it, show a scaled-down preview of the report page: one or two of the
score cards rendered small, so a visitor sees what they are about to get. Build
it from the real report design, not a generic mockup frame.

#### Section: how it works

Three steps, numbered, flat. No icons, no circles, no connecting arrows.

```
1   PLACEHOLDER — 18 väidet, viis minutit
2   PLACEHOLDER — raport kohe ekraanile ja e-postile
3   PLACEHOLDER — soovi korral kolm nädalat, kuus küsimust päevas
```

#### Section: the honesty block

Unusual on a landing page and deliberately kept. It is what makes the rest
believable. Give it a distinct, quieter treatment, perhaps on the bone surface.

```
Test on enesehinnang. See näitab, kui sageli tegevused sinu päeva jõuavad ja
milliseid valikuid sa teed. Kui hästi sa neid tegevusi teed, näevad kõige
paremini sinu inimesed.
```

#### Section: the three-week programme

```
Kolm nädalat, kuus küsimust

Iga tööpäeva lõpus saad kirja kuue jah/ei küsimusega. Vastamine võtab alla
minuti. Kolme nädala pärast näed, kui sageli need tegevused sinu päeva tegelikult
jõudsid, ja saad seda selle testiga võrrelda.

15 € koos käibemaksuga
```

Note the programme is bought from inside the report, not from here, so this
section ends by pointing back at the test rather than at a payment button.

#### Closing

End on the test itself, not on a brand statement. Repeat the primary call to
action with room around it:

```
[ALUSTA TESTI · 5 MIN]

Tasuta. Raport kohe ekraanile ja e-postile.
```

Then one quiet text link: `Mille peale test tugineb →`

### 2. `/test` — the assessment

An intro step:

```
Testis on 18 väidet kolme coachiva juhi võtmeuskumuse ja kolme võtmetegevuse kohta.
Vasta selle järgi, mida sa päriselt usud ja teed.

[ALUSTA]
```

Then two question screens, 9 statements each. A sticky progress bar at the top
showing `0 / 18` and filling in green.

Screen 1 instruction: `Viimase nelja nädala jooksul, kui sageli sa…`
Each statement with a 1–6 scale where **every point has a word**:

```
ütlesid kellelegi selgelt, millist tulemust sa temalt ootad

 1              2        3            4                  5                  6
 mitte kordagi  korra    paar korda   umbes kord nädalas  mitu korda nädalas  peaaegu iga päev
```

Screen 2 instruction: `Kui hästi kirjeldab see sinu tegelikke valikuid viimase
poole aasta jooksul?`
Same 1–6 scale, but **only the ends are labelled**: 1 `ei kirjelda üldse`,
6 `kirjeldab täpselt`. 2–5 are bare numbers.

Example statement for screen 2:
`Kui inimene ei tule ülesandega toime, uurin kõigepealt, mida ta peaks selleks õppima.`

**This scale is the hardest design problem in the whole project — solve it
properly.** Six options with six long Estonian words will not sit side by side
on a 390px phone. Find a layout that stays readable and tappable on a phone
without hiding the words, and that makes answering 18 of these feel fast rather
than like a form. Selected state must be unmistakable at a glance.

Then an email step:

```
Kuhu raport saata?

E-post
[                    ]

☐ Tahan saada ka Raimo uudiskirja
   Ainult sisu, mida saad juhina kasutada. Loobuda saad ühe klõpsuga.

[NÄITA RAPORTIT]

Raport saadetakse sellele aadressile. Loe lähemalt: Privaatsus
```

### 3. `/raport` — the report (the most important screen)

```
Sinu coachiv juhtimine praegu

See raport näitab, kui sageli kolm coachiva juhi tegevust viimase nelja nädala
jooksul sinu päeva jõudsid ja milliseid valikuid sa juhina teed. Iga tegevus ja
uskumus on eraldi, sest need on erinevad asjad.
```

**TEGEVUSED** — three cards. **USKUMUSED** — three cards. Each card:

```
JUHENDAMINE                                    4,7
Inimene teab, millist tulemust temalt oodatakse, saab tagasisidet oma tegevuse
kohta ja juht tuleb kokkulepete juurde tagasi.

Ootused, tagasiside ja kokkulepete juurde tagasi tulemine on sinu nädalas
tavaline osa.
```

The number is a 1–6 score with one decimal and an Estonian comma. It should read
as the anchor of the card. **Do not add progress bars, rings, gauges or
percentages** — this product deliberately avoids anything that looks like a
grade. Design the score so a reader sees it instantly without it feeling like a
mark out of six.

Then a block "Uskumus ja tegevus koos" with up to three short comparison cards,
each headed by a pair like `Inimene · Inspireerimine`.

Then a block "Mida sinu tulemused koos näitavad" holding one 4–5 sentence
paragraph of plain prose. Give it a distinct treatment — it is written
individually for this person and should feel like it.

Then a quieter panel "Mida see ei tähenda" with a caveat paragraph.

Then the offer, visually separated:

```
Kolm nädalat, kuus küsimust

Iga tööpäeva lõpus saad kirja kuue jah/ei küsimusega. Vastamine võtab alla
minuti. Kolme nädala pärast näed, kui sageli need tegevused sinu päeva tegelikult
jõudsid, ja saad seda selle testiga võrrelda.

[ALUSTA · 15 €]

Sul on ettevõttelt kood? Sisesta see makselehel.
```

### 4. `/alus` — what the test is based on

A long-form editorial page: an intro, a four-column table of the six model parts
with their academic sources and a strength-of-evidence column, a section on what
the test does not measure, and a short bio. Make the table work on a phone.

### 5. `/privaatsus` — privacy

Plain headed sections of running text. No design needed beyond excellent
readability.

## Footer

On every page: `Mille peale test tugineb · Privaatsus`, then
`Raimo Ülavere · Radical Simplicity · radicalsimplicity.eu`

## What I will judge this on

- Does the report page look like something a manager would send to a colleague?
- Does the 1–6 scale work on a phone with real Estonian words?
- Is the green used exactly once per screen as a fill, never as text?
- Are the borders hard near-black hairlines rather than soft grey?
- Does it feel confident and quiet, or does it feel like a template?
