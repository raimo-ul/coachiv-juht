// Send Tally-shaped webhooks at bingo-submit, signed the way Tally signs them.
//
// Tally will not let you replay a real delivery, and the form is not published,
// so this is the only way to exercise the function before launch. It builds the
// payload from the real form's labels and option ids, read from form rDoLyR on
// 27.11.2026, so a mismatch here is a mismatch in production too.
//
//   TALLY_SIGNING_SECRET=... BINGO_URL=... node scripts/bingo-testhook.mjs [case]
//
// Cases: all (default), lumehelves, glogikeetja, pohjapoder, pakapikk,
// uudiskiri, kontakt, tyhi, html, kordus, vale-allkiri, puudub-allkiri.
//
// Every case sends to the address in BINGO_TEST_EMAIL. Nothing here may ever
// point at a real respondent.

import { createHmac, randomUUID } from "node:crypto";

const SECRET = process.env.TALLY_SIGNING_SECRET;
const URL_ = process.env.BINGO_URL;
const TO = process.env.BINGO_TEST_EMAIL;
if (!SECRET || !URL_ || !TO) {
  console.error("Vaja on TALLY_SIGNING_SECRET, BINGO_URL ja BINGO_TEST_EMAIL");
  process.exit(1);
}

const LABELS = {
  firstName: "Eesnimi",
  email: "E-post",
  squares: "Sel aastal olen...",
  proud: "Mille üle oled sel aastal uhke, midagi, mida tegid ja mida keegi teine ei pannudki tähele?",
  endings: [
    "Sel aastal oli mul raske, kui...",
    "Ka teistel on aeg-ajalt raske, kui...",
    "Ma tegin sel hetkel parima, mida oskasin, ja ütlen endale:",
  ],
  newsletter: "Uudiskiri",
  contact: "Kontakt",
};

/** The nine checkbox option ids, in form order. */
const SQUARE_IDS = [
  "88483643-5c65-4a9a-9b34-f0cf660324e5", "83339f0f-67cc-45e6-b743-2c204d1e2713",
  "5c468df7-48eb-4b3c-b10f-f3c422185e4d", "db9d1353-44de-4f31-b837-af289535908a",
  "355abe02-9261-4492-94f2-9e750a9b4c78", "6ddfef50-ee2a-4dde-9cee-86d4182bda59",
  "e568d7ae-2029-4a3d-bd14-2cd3dcfd97e3", "92f8b789-3ff9-4943-b13f-1d91e4b6ddd6",
  "c72ec023-4a67-4a40-a35e-945e536773f2",
];
const SQUARE_TEXTS = [
  "Istunud koosolekul, mis oleks võinud olla e-kiri.",
  "Kirjutanud e-kirja teemareaga KIIRE asjast, mis on seisnud minu postkastis kolm nädalat.",
  "Lubanud midagi „enne aasta lõppu“ ja ...see on ikka veel tegemata.",
  "Vastanud e-kirjaga inimesele, kes istub kõrvallauas.",
  "Tahtnud oma kalendrit vaadates kõigele ühe nupuga „delete“ vajutada.",
  "Öelnud „räägime sellest pärast puhkust“ ja siis ei ole rääkinud.",
  "Tormanud hooga uut projekti, ettevõtmist tegema, ehkki vana saba lohiseb...siiani.",
  "Mõelnud, et peaksin kedagi kiitma ja siis jätnud selle tegemata, sest „elu“ tuli vahele.",
  "Avastanud keset tööpäeva, et ei tea, mis kell ja päev on.",
];
const NEWSLETTER_ID = "12240a1f-4996-48d2-9f24-84708f62e771";
const CONTACT_ID = "ab4bba9a-4268-429c-a91f-bbf4b43224e3";

function payload({ marked = 0, proud = "", endings = ["", "", ""], newsletter = false, contact = false, responseId = randomUUID() }) {
  const fields = [
    { key: "q1", label: LABELS.firstName, type: "INPUT_TEXT", value: "Testija" },
    { key: "q2", label: LABELS.email, type: "INPUT_EMAIL", value: TO },
    {
      key: "q3", label: LABELS.squares, type: "CHECKBOXES",
      value: SQUARE_IDS.slice(0, marked),
      options: SQUARE_IDS.map((id, i) => ({ id, text: SQUARE_TEXTS[i] })),
    },
    { key: "q4", label: LABELS.proud, type: "TEXTAREA", value: proud || null },
    ...LABELS.endings.map((label, i) => ({
      key: `q5${i}`, label, type: "TEXTAREA", value: endings[i] || null,
    })),
    {
      key: "q6", label: LABELS.newsletter, type: "CHECKBOXES",
      value: newsletter ? [NEWSLETTER_ID] : null,
      options: [{ id: NEWSLETTER_ID, text: "Liitun Raimo uudiskirja listiga (lubame, et jama ei saada :-))" }],
    },
    {
      key: "q7", label: LABELS.contact, type: "CHECKBOXES",
      value: contact ? [CONTACT_ID] : null,
      options: [{ id: CONTACT_ID, text: "Tahan, et Raimo võtaks ühendust minuga - mul on üks mõte (koolitus, coaching, ettekanne või küsimus)" }],
    },
  ];
  return JSON.stringify({
    eventId: randomUUID(),
    eventType: "FORM_RESPONSE",
    createdAt: "2026-11-27T12:00:00.000Z",
    data: { responseId, formId: "rDoLyR", formName: "Milline aasta sul juhina oli?", fields },
  });
}

const sign = (body) => createHmac("sha256", SECRET).update(body).digest("base64");

async function post(name, body, header) {
  const res = await fetch(URL_, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(header === null ? {} : { "Tally-Signature": header ?? sign(body) }) },
    body,
  });
  const text = await res.text();
  const ok = res.status < 300;
  console.log(`  ${ok ? "OK " : "VIGA"} ${String(res.status).padEnd(3)} ${name.padEnd(28)} ${text.slice(0, 90)}`);
  return res.status;
}

const CASES = {
  lumehelves: () => post("0 ruutu, LUMEHELVES", payload({ marked: 0 })),
  glogikeetja: () => post("4 ruutu, GLOGIKEETJA", payload({ marked: 4, proud: "Pidasin ühe raske vestluse." })),
  pohjapoder: () => post("6 ruutu, POHJAPODER", payload({ marked: 6, proud: "Sain projekti lõpuni.", endings: ["ma olin väsinud", "nad ei öelnud midagi", "homme on uus päev"] })),
  pakapikk: () => post("9 ruutu, PAKAPIKK", payload({ marked: 9, proud: "Ei öelnud kolm korda." })),
  uudiskiri: () => post("uudiskiri märgitud", payload({ marked: 5, newsletter: true })),
  kontakt: () => post("kontaktisoov märgitud", payload({ marked: 7, contact: true })),
  tyhi: () => post("vabatekstid tühjad", payload({ marked: 2, proud: "", endings: ["", "", ""] })),
  html: () => post("vabatekst HTML-iga", payload({ marked: 3, proud: '<script>alert(1)</script> ja <b>paks</b>', endings: ["<i>kaldus</i>", "", ""] })),
  kordus: async () => {
    const id = randomUUID();
    const body = payload({ marked: 6, responseId: id });
    await post("kordus, esimene", body);
    await post("kordus, teine (ootan 200)", body);
  },
  "vale-allkiri": () => post("vale allkiri (ootan 401)", payload({ marked: 1 }), "vale"),
  "puudub-allkiri": () => post("allkiri puudub (ootan 401)", payload({ marked: 1 }), null),
};

const pick = process.argv[2] ?? "all";
const run = pick === "all" ? Object.keys(CASES) : [pick];
if (run.some((k) => !CASES[k])) {
  console.error(`Tundmatu juhtum. Valikud: all, ${Object.keys(CASES).join(", ")}`);
  process.exit(1);
}
console.log(`  Saadan ${URL_}, kirjad lähevad ${TO}\n`);
for (const k of run) await CASES[k]();
