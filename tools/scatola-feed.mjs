// scripts/scatola-feed-cli.ts
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

// src/defaults.ts
var PROPERTY_IDS = ["saslong", "acadia", "hartmann"];
var PROPERTIES = {
  saslong: { id: "saslong", name: "Smart Hotel Saslong", short: "Saslong", color: "#3f5d73", dinner: true, pattern: /saslong/i },
  acadia: { id: "acadia", name: "Acadia Mountain Home", short: "Acadia", color: "#6e5570", dinner: false, pattern: /acadia/i },
  hartmann: { id: "hartmann", name: "Chalet Hartmann", short: "Hartmann", color: "#77583a", dinner: false, pattern: /hartmann/i }
};
var FIELD_DEFS = [
  { key: "slopeId", label: "ID prenotazione Slope", required: true, synonyms: ["numero", "id prenotazione", "numero prenotazione", "numero della prenotazione", "n prenotazione", "nr prenotazione", "num prenotazione", "codice prenotazione", "prenotazione n", "prenotazione nr", "prenotazione", "id", "buchungsnummer", "buchung nr", "booking id", "reservation id", "booking number", "reservation number"] },
  { key: "createdAt", label: "Data (e ora) di prenotazione", required: false, synonyms: ["data di creazione", "data prenotazione", "data della prenotazione", "data di prenotazione", "data ora prenotazione", "data e ora prenotazione", "data creazione", "data inserimento", "creata il", "creato il", "inserita il", "prenotato il", "prenotata il", "data registrazione", "booking date", "booked on", "created", "created at", "creation date", "date created", "buchungsdatum", "erstellt am", "angelegt am", "gebucht am"] },
  { key: "createdTime", label: "Ora di prenotazione (se in colonna separata)", required: false, synonyms: ["ora prenotazione", "ora della prenotazione", "ora creazione", "ora inserimento", "orario prenotazione", "booking time", "time created", "uhrzeit", "buchungszeit"] },
  { key: "arrival", label: "Arrivo", required: true, synonyms: ["arrivo", "data arrivo", "data di arrivo", "data del check in previsto", "check in", "checkin", "data check in", "dal", "anreise", "ankunft", "arrival", "arrival date", "from"] },
  { key: "departure", label: "Partenza", required: true, synonyms: ["partenza", "data partenza", "data di partenza", "check out", "checkout", "data check out", "al", "abreise", "departure", "departure date", "to"] },
  { key: "booker", label: "Prenotante", required: false, synonyms: ["prenotante", "nome prenotante", "cliente", "intestatario", "titolare", "nominativo prenotante", "booker", "booked by", "customer", "kunde", "buchender", "auftraggeber"] },
  { key: "company", label: "Ragione sociale", required: false, synonyms: ["ragione sociale", "azienda", "societa", "ditta", "company", "firma"] },
  { key: "lastName", label: "Cognome", required: false, synonyms: ["cognome", "last name", "lastname", "surname", "family name", "nachname"] },
  { key: "firstName", label: "Nome", required: false, synonyms: ["nome", "first name", "firstname", "given name", "vorname"] },
  { key: "guest", label: "Ospite", required: false, synonyms: ["ospite principale", "ospite", "nome ospite", "nominativo", "guest", "guest name", "gast", "name"] },
  { key: "email", label: "Email", required: false, synonyms: ["indirizzo e mail", "email", "e mail", "mail", "indirizzo email", "email address", "e mail address", "email prenotante", "email cliente", "e mail prenotante"] },
  { key: "phone", label: "Telefono", required: false, synonyms: ["numero telefonico", "telefono", "numero di telefono", "cellulare", "tel", "phone", "phone number", "mobile", "telefon", "telefonnummer", "handy"] },
  { key: "channel", label: "Canale", required: false, synonyms: ["canale", "canale di vendita", "fonte", "provenienza", "origine", "channel", "source", "kanal", "quelle"] },
  { key: "agency", label: "Agenzia / OTA", required: false, synonyms: ["agenzia", "ota", "portale", "agency", "agentur", "portal"] },
  { key: "channelRef", label: "Riferimento OTA", required: false, synonyms: ["riferimento ota", "rif ota", "codice ota", "id ota", "numero ota", "riferimento canale", "codice canale", "id canale", "numero canale", "codice esterno", "riferimento esterno", "id esterno", "channel ref", "channel reference", "ota reference", "external id", "external reference", "riferimento", "buchungsreferenz", "referenz"] },
  { key: "status", label: "Stato", required: false, synonyms: ["stato", "stato prenotazione", "status", "buchungsstatus", "zustand"] },
  { key: "room", label: "Camera", required: false, synonyms: ["nome alloggio", "camera", "n camera", "numero camera", "stanza", "appartamento", "alloggio", "unita", "room", "room number", "zimmer", "zimmernummer"] },
  { key: "roomType", label: "Tipologia alloggio", required: false, synonyms: ["tipologia alloggio", "tipologia", "tipo camera", "tipologia camera", "categoria", "room type", "zimmertyp", "kategorie"] },
  { key: "rooms", label: "Numero camere", required: false, synonyms: ["camere", "n camere", "numero camere", "nr camere", "num camere", "quantita camere", "totale camere", "rooms", "number of rooms", "anzahl zimmer", "zimmeranzahl"] },
  { key: "persons", label: "Numero persone", required: false, synonyms: ["persone", "n persone", "numero persone", "ospiti", "n ospiti", "numero ospiti", "pax", "persons", "guests", "personen", "anzahl personen"] },
  { key: "adults", label: "Adulti", required: false, synonyms: ["adulti", "n adulti", "adults", "erwachsene"] },
  { key: "children", label: "Bambini", required: false, synonyms: ["bambini", "n bambini", "ragazzi", "children", "kinder"] },
  { key: "total", label: "Importo (solo camera)", required: false, synonyms: ["importo solo camera", "importo camera", "totale", "importo", "importo totale", "totale prenotazione", "prezzo", "prezzo totale", "totale soggiorno", "total", "amount", "total amount", "gesamt", "gesamtbetrag", "betrag", "preis"] },
  { key: "paid", label: "Pagato", required: false, synonyms: ["pagato", "incassato", "acconto", "versato", "anticipo", "caparra", "caparra versata", "paid", "amount paid", "bezahlt", "anzahlung"] },
  { key: "balance", label: "Saldo da pagare", required: false, synonyms: ["saldo", "da pagare", "residuo", "saldo da pagare", "da saldare", "importo residuo", "balance", "outstanding", "open balance", "offen", "restbetrag", "offener betrag"] },
  { key: "property", label: "Casa / struttura", required: false, synonyms: ["struttura", "hotel", "casa", "proprieta", "property", "struktur", "betrieb", "haus"] }
];
var STEP_ORDER = ["letter", "depositNotice", "deposit", "roomingRequest", "roomingReceived", "dinner", "balanceNotice", "balance"];
var DEFAULT_DINNER_MENUS = [
  { id: "m_dolcevita", name: "Dolce Vita Menu", price: 35, courses: "Mozzarella e Pomodoro (caprese)\nRigatoni alla carbonara\nTartufo artigianale bianco o nero" },
  { id: "m_saslong", name: "Saslong Menu", price: 35, courses: "Insalata Saslong (misticanza, noci, avocado, feta, pere essiccate)\nPasta al pesto genovese\nI 4 cioccolati" },
  { id: "m_vegan", name: "Vegan menu", price: 35, courses: "Blue Salad (misticanza, finocchi, pomodorini, tonno, olive taggiasche, mozzarella)\nPasta al pomodoro con dressing al basilico\nMacedonia" }
];
var DEFAULT_SETTINGS = {
  thresholds: { saslong: 5, acadia: 5, hartmann: 3 },
  personThresholds: { saslong: 25, acadia: null, hartmann: null },
  toleranceSec: 60,
  linkSameBooker: true,
  depositMonthsBefore: 2,
  noticeDaysBeforeCharge: 1,
  depositPercent: 30,
  regularSkipLetter: true,
  leadRooming: 14,
  roomingReplyDays: 7,
  leadBalance: 5,
  leadBalanceNotice: 7,
  soonWindow: 7,
  summerFrom: 5,
  summerTo: 10,
  defaultLang: "en",
  staleAfterHours: 30,
  scatolaHorizonDays: 540,
  scatolaKey: "",
  feedApplied: "",
  bankDetails: "",
  dinnerMenus: DEFAULT_DINNER_MENUS.map((m) => ({ ...m })),
  mapping: {},
  knownRooms: {},
  customTexts: []
};

// src/dates.ts
var DAY_MS = 864e5;
var pad2 = (n) => (n < 10 ? "0" : "") + String(n);
function isValidYMD(y, m, d) {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
var ymd = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
function toUTC(date) {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const d = Number(date.slice(8, 10));
  return Date.UTC(y, m - 1, d);
}
function fromUTC(ms) {
  const dt = new Date(ms);
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}
var isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && isValidYMD(Number(s.slice(0, 4)), Number(s.slice(5, 7)), Number(s.slice(8, 10)));
var addDays = (date, n) => fromUTC(toUTC(date) + n * DAY_MS);
var diffDays = (a, b) => Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
var maxDate = (a, b) => a >= b ? a : b;
var minDate = (a, b) => a <= b ? a : b;
function todayLocal(now = /* @__PURE__ */ new Date()) {
  return ymd(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
function localDateOfStamp(stamp) {
  if (!stamp) return null;
  const dt = new Date(stamp);
  if (Number.isNaN(dt.getTime())) return null;
  return todayLocal(dt);
}
function fmtDate(date, sep = "/") {
  if (!date || !isDate(date)) return "";
  return `${date.slice(8, 10)}${sep}${date.slice(5, 7)}${sep}${date.slice(0, 4)}`;
}
function wallSeconds(wall) {
  const base = toUTC(wall.slice(0, 10)) / 1e3;
  const h = Number(wall.slice(11, 13)) || 0;
  const mi = Number(wall.slice(14, 16)) || 0;
  const s = Number(wall.slice(17, 19)) || 0;
  return base + h * 3600 + mi * 60 + s;
}
function addMonths(date, n) {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const d = Number(date.slice(8, 10));
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12 + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return ymd(ny, nm, Math.min(d, last));
}

// src/util.ts
function normalizeText(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, " ").trim();
}
function tokens(s) {
  const n = normalizeText(s);
  return n ? n.split(" ") : [];
}
function fnv1a(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
var round2 = (n) => Math.round(n * 100) / 100;
function clone(x) {
  return x === void 0 ? x : JSON.parse(JSON.stringify(x));
}

// src/slope-import.ts
var SYN_EXACT = /* @__PURE__ */ new Set();
for (const def of FIELD_DEFS) for (const s of def.synonyms) SYN_EXACT.add(s);
function detectProperty(text3) {
  for (const p of PROPERTY_IDS) if (PROPERTIES[p].pattern.test(text3)) return p;
  return null;
}
function parseResultFromRows(rows, source, window2) {
  const issues = [];
  const rowsByProperty = {};
  for (const r of rows) rowsByProperty[r.property] = (rowsByProperty[r.property] || 0) + 1;
  const properties = PROPERTY_IDS.filter((p) => rowsByProperty[p]);
  const arrivalRange = {};
  for (const p of properties) arrivalRange[p] = { from: window2.from, to: window2.to };
  const withCreated = rows.filter((r) => r.createdAt).length;
  const withTime = rows.filter((r) => r.hasTime).length;
  const timeMode = withCreated === 0 ? "none" : withTime * 2 >= withCreated ? "time" : "date";
  if (!rows.length) issues.push({ level: "error", message: "Nessuna prenotazione nell’intervallo richiesto." });
  return { rows, skipped: [], issues, timeMode, arrivalRange, properties, rowsByProperty, source };
}

// src/scatola.ts
var ScatolaError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "ScatolaError";
  }
};
var isRecord = (x) => typeof x === "object" && x !== null && !Array.isArray(x);
var text = (x) => typeof x === "string" ? x.trim() : "";
var numOrNull = (x) => typeof x === "number" && Number.isFinite(x) ? x : null;
var isYmd = (x) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x);
function toStay(x) {
  if (!isRecord(x)) return null;
  const reservationId = text(x.reservation_id);
  const orderId = text(x.order_id);
  if (!reservationId || !orderId || !isYmd(x.arrival) || !isYmd(x.departure)) return null;
  return {
    reservationId,
    orderId,
    propertyName: text(x.property_name),
    arrival: x.arrival,
    departure: x.departure,
    room: text(x.room_name),
    adults: numOrNull(x.adults),
    children: numOrNull(x.children),
    isOption: x.is_option === true
  };
}
function toBalance(x) {
  if (!isRecord(x)) return null;
  const orderId = text(x.order_id);
  const n = x.order_number;
  const orderNumber = typeof n === "number" && Number.isFinite(n) ? String(n) : text(n);
  if (!orderId || !orderNumber) return null;
  return {
    orderId,
    orderNumber,
    createdAt: text(x.creation_date),
    total: numOrNull(x.order_total),
    collected: numOrNull(x.collected_amount),
    refunded: numOrNull(x.collected_refunded_amount),
    openBalance: numOrNull(x.open_balance)
  };
}
function toCustomer(x) {
  if (!isRecord(x)) return null;
  const reservationId = text(x.reservation_id);
  const firstName = text(x.order_customer_first_name);
  const lastName = text(x.order_customer_last_name);
  if (!reservationId || !firstName && !lastName) return null;
  return { reservationId, firstName, lastName, email: text(x.order_customer_primary_email), phone: text(x.order_customer_primary_phone_number) };
}
function buildSnapshot(raw) {
  const stays = [];
  const stayKeys = /* @__PURE__ */ new Set();
  for (const row of raw.stayRows) {
    const s = toStay(row);
    if (!s) throw new ScatolaError("unexpected", "La Scatola ha restituito un soggiorno in un formato non previsto: non applico nulla.");
    const key = `${s.reservationId}|${s.room}|${s.arrival}`;
    if (stayKeys.has(key)) continue;
    stayKeys.add(key);
    stays.push(s);
  }
  const needed = new Set(stays.map((s) => s.orderId));
  const balanceById = /* @__PURE__ */ new Map();
  for (const row of raw.balanceRows) {
    const b = toBalance(row);
    if (b && needed.has(b.orderId)) balanceById.set(b.orderId, b);
  }
  const missing = needed.size - balanceById.size;
  if (missing) throw new ScatolaError("incomplete", `La Scatola non ha restituito ${missing} ${missing === 1 ? "ordine" : "ordini"} su ${needed.size}: lettura incompleta, non applico nulla. Riprova.`);
  const customers = [];
  const seenReservation = /* @__PURE__ */ new Set();
  for (const row of raw.guestRows) {
    const c = toCustomer(row);
    if (!c || seenReservation.has(c.reservationId)) continue;
    seenReservation.add(c.reservationId);
    customers.push(c);
  }
  return { from: raw.from, to: raw.to, fetchedAt: raw.fetchedAt, freshness: raw.freshness, stays, balances: Array.from(balanceById.values()), customers };
}
var romeFormat = null;
function romeWall(isoUtc) {
  const d = new Date(isoUtc);
  if (!isoUtc || Number.isNaN(d.getTime())) return null;
  if (!romeFormat) romeFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const parts = {};
  for (const p of romeFormat.formatToParts(d)) parts[p.type] = p.value;
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}`;
}
function snapshotToRows(snap) {
  const balanceById = new Map(snap.balances.map((b) => [b.orderId, b]));
  const customerByReservation = new Map(snap.customers.map((c) => [c.reservationId, c]));
  const customerByOrder = /* @__PURE__ */ new Map();
  for (const s of snap.stays) {
    const c = customerByReservation.get(s.reservationId);
    if (c && !customerByOrder.has(s.orderId)) customerByOrder.set(s.orderId, c);
  }
  const sorted = snap.stays.slice().sort((a, b) => a.propertyName.localeCompare(b.propertyName) || a.arrival.localeCompare(b.arrival) || a.orderId.localeCompare(b.orderId) || a.room.localeCompare(b.room) || a.reservationId.localeCompare(b.reservationId));
  const amountsWritten = /* @__PURE__ */ new Set();
  const rows = [];
  const orderIds = [];
  let unknownProperty = 0;
  for (const s of sorted) {
    const bal = balanceById.get(s.orderId);
    const property = detectProperty(s.propertyName);
    if (!bal) continue;
    if (!property) {
      unknownProperty++;
      continue;
    }
    if (s.departure <= s.arrival) continue;
    const cust = customerByOrder.get(s.orderId);
    const first = !amountsWritten.has(s.orderId);
    amountsWritten.add(s.orderId);
    const createdAt = romeWall(bal.createdAt);
    const persons = s.adults === null && s.children === null ? null : (s.adults || 0) + (s.children || 0);
    orderIds.push(s.orderId);
    rows.push({
      slopeId: bal.orderNumber,
      createdAt,
      hasTime: createdAt !== null,
      arrival: s.arrival,
      departure: s.departure,
      booker: cust ? `${cust.firstName} ${cust.lastName}`.trim() : "",
      guest: "",
      firstName: cust ? cust.firstName : "",
      lastName: cust ? cust.lastName : "",
      email: cust ? cust.email : "",
      phone: cust ? cust.phone : "",
      channel: "",
      channelRef: "",
      status: s.isOption ? "Opzione" : "",
      cancelled: false,
      room: s.room,
      rooms: 1,
      persons: persons || null,
      total: first ? bal.total : null,
      paid: first ? Math.round(((bal.collected || 0) - (bal.refunded || 0)) * 100) / 100 : null,
      balance: first ? bal.openBalance : null,
      property,
      line: rows.length + 1
    });
  }
  return { rows, orderIds, unknownProperty };
}
function parseScatolaPayload(payload) {
  if (!isRecord(payload) || !Array.isArray(payload.data)) throw new ScatolaError("unexpected", "La Scatola ha risposto in un formato non previsto: non applico nulla.");
  const page = isRecord(payload.page) ? payload.page : {};
  const overall = isRecord(payload.freshness) && isRecord(payload.freshness.overall) ? payload.freshness.overall.status : void 0;
  const freshness = overall === "fresh" || overall === "stale" || overall === "failing" ? overall : "unknown";
  return {
    data: payload.data,
    freshness,
    total: typeof page.total === "number" ? page.total : null,
    nextCursor: typeof page.next_cursor === "string" && page.next_cursor ? page.next_cursor : null
  };
}

// src/scatola-feed.ts
var ALG = "A256GCM+gzip";
var MAX_ROWS = 6e4;
var FeedError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "FeedError";
  }
};
var KEY_RE = /^[A-Za-z0-9_-]{43}$/;
var YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
var ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
var isFeedKey = (s) => KEY_RE.test(s);
var isRecord2 = (x) => typeof x === "object" && x !== null && !Array.isArray(x);
var numOrNull2 = (x) => x === null || typeof x === "number" && Number.isFinite(x);
var round22 = (n) => Math.round(n * 100) / 100;
function subtle() {
  const c = globalThis.crypto;
  if (!c || !c.subtle || typeof CompressionStream === "undefined" || typeof DecompressionStream === "undefined") {
    throw new FeedError("unsupported", "Questo browser non sa leggere i dati cifrati di La Scatola: aggiornalo oppure usa Chrome, Edge, Firefox o Safari recenti.");
  }
  return c.subtle;
}
function toBase64(bytes, url) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode(...bytes.subarray(i, i + 32768));
  const b64 = btoa(bin);
  return url ? b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : b64;
}
function fromBase64(text3) {
  const b64 = text3.replace(/-/g, "+").replace(/_/g, "/");
  let bin;
  try {
    bin = atob(b64);
  } catch {
    throw new FeedError("bad_file", "Il file dei dati di La Scatola è rovinato.");
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function pipe(bytes, stream) {
  const writer = stream.writable.getWriter();
  const written = writer.write(bytes).then(() => writer.close());
  written.catch(() => void 0);
  const reader = stream.readable.getReader();
  const chunks = [];
  let size = 0;
  for (; ; ) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await written;
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}
async function importKey(key, usage) {
  if (!isFeedKey(key)) throw new FeedError("bad_key", "La chiave dei dati di La Scatola non ha la forma giusta: controlla di averla copiata per intero.");
  return subtle().importKey("raw", fromBase64(key), "AES-GCM", false, [usage]);
}
var aad = (generated) => new TextEncoder().encode(`alpstay-gruppi|scatola|1|${generated}`);
function generateFeedKey() {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return toBase64(bytes, true);
}
function parseEnvelope(raw) {
  if (!isRecord2(raw) || raw.v !== 1 || raw.alg !== ALG || typeof raw.generated !== "string" || !ISO_RE.test(raw.generated) || Number.isNaN(Date.parse(raw.generated)) || typeof raw.iv !== "string" || typeof raw.data !== "string" || !raw.data) {
    throw new FeedError("bad_file", "Il file dei dati di La Scatola non ha il formato previsto.");
  }
  return { v: 1, generated: raw.generated, alg: ALG, iv: raw.iv, data: raw.data };
}
function toPayload(snap) {
  const { rows, orderIds, unknownProperty } = snapshotToRows(snap);
  const balanceById = new Map(snap.balances.map((b) => [b.orderId, b]));
  const orderIndex = /* @__PURE__ */ new Map();
  const customerIndex = /* @__PURE__ */ new Map();
  const orders = [];
  const customers = [];
  const out = [];
  rows.forEach((r, i) => {
    const orderId = orderIds[i];
    let o = orderIndex.get(orderId);
    if (o === void 0) {
      const b = balanceById.get(orderId);
      let c = -1;
      if (r.firstName || r.lastName) {
        const key = JSON.stringify([r.firstName, r.lastName, r.email, r.phone]);
        const known = customerIndex.get(key);
        if (known === void 0) {
          c = customers.push([r.firstName, r.lastName, r.email, r.phone]) - 1;
          customerIndex.set(key, c);
        } else c = known;
      }
      o = orders.push([orderId, b.orderNumber, b.createdAt, b.total, b.collected, b.refunded, b.openBalance, c]) - 1;
      orderIndex.set(orderId, o);
    }
    out.push([o, PROPERTY_IDS.indexOf(r.property), r.arrival, r.departure, r.room, r.persons, r.status ? 1 : 0]);
  });
  return { v: 1, generated: snap.fetchedAt, from: snap.from, to: snap.to, freshness: snap.freshness, unknownProperty, orders, customers, rows: out };
}
function bad() {
  throw new FeedError("bad_file", "Il contenuto del file dei dati di La Scatola non ha il formato previsto.");
}
function fromPayload(p, generated) {
  if (!isRecord2(p) || p.v !== 1 || p.generated !== generated || typeof p.from !== "string" || !YMD_RE.test(p.from) || typeof p.to !== "string" || !YMD_RE.test(p.to) || !Array.isArray(p.orders) || !Array.isArray(p.customers) || !Array.isArray(p.rows) || p.rows.length > MAX_ROWS || p.orders.length > MAX_ROWS) bad();
  const freshness = p.freshness === "fresh" || p.freshness === "stale" || p.freshness === "failing" ? p.freshness : "unknown";
  const customers = p.customers.map((c) => {
    if (!Array.isArray(c) || c.length !== 4 || c.some((x) => typeof x !== "string")) bad();
    return c;
  });
  const orders = p.orders.map((o) => {
    if (!Array.isArray(o) || o.length !== 8 || typeof o[0] !== "string" || !o[0] || typeof o[1] !== "string" || !o[1] || typeof o[2] !== "string" || !numOrNull2(o[3]) || !numOrNull2(o[4]) || !numOrNull2(o[5]) || !numOrNull2(o[6]) || !Number.isInteger(o[7]) || o[7] < -1 || o[7] >= customers.length) bad();
    return o;
  });
  const amountsWritten = /* @__PURE__ */ new Set();
  const rows = p.rows.map((raw, i) => {
    if (!Array.isArray(raw) || raw.length !== 7) bad();
    const [o, prop, arrival, departure, room, persons, option] = raw;
    if (!Number.isInteger(o) || o < 0 || o >= orders.length || !Number.isInteger(prop) || prop < 0 || prop >= PROPERTY_IDS.length || typeof arrival !== "string" || !YMD_RE.test(arrival) || typeof departure !== "string" || !YMD_RE.test(departure) || departure <= arrival || typeof room !== "string" || !numOrNull2(persons) || option !== 0 && option !== 1) bad();
    const order = orders[o];
    const cust = order[7] >= 0 ? customers[order[7]] : null;
    const first = !amountsWritten.has(o);
    amountsWritten.add(o);
    const createdAt = romeWall(order[2]);
    const property = PROPERTY_IDS[prop];
    return {
      slopeId: order[1],
      createdAt,
      hasTime: createdAt !== null,
      arrival,
      departure,
      booker: cust ? `${cust[0]} ${cust[1]}`.trim() : "",
      guest: "",
      firstName: cust ? cust[0] : "",
      lastName: cust ? cust[1] : "",
      email: cust ? cust[2] : "",
      phone: cust ? cust[3] : "",
      channel: "",
      channelRef: "",
      status: option === 1 ? "Opzione" : "",
      cancelled: false,
      room,
      rooms: 1,
      persons,
      total: first ? order[3] : null,
      paid: first ? round22((order[4] || 0) - (order[5] || 0)) : null,
      balance: first ? order[6] : null,
      property,
      line: i + 1
    };
  });
  return {
    generated,
    from: p.from,
    to: p.to,
    freshness,
    unknownProperty: typeof p.unknownProperty === "number" ? p.unknownProperty : 0,
    rows,
    orders: orders.map((o) => ({ orderId: o[0], orderNumber: o[1], createdAt: o[2], total: o[3], collected: o[4], refunded: o[5], openBalance: o[6] }))
  };
}
async function encodeFeed(snap, key) {
  const k = await importKey(key, "encrypt");
  const payload = toPayload(snap);
  const packed = await pipe(new TextEncoder().encode(JSON.stringify(payload)), new CompressionStream("gzip"));
  const iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(iv);
  const sealed = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv, additionalData: aad(payload.generated) }, k, packed));
  return { v: 1, generated: payload.generated, alg: ALG, iv: toBase64(iv, false), data: toBase64(sealed, false) };
}
async function decodeFeed(envelope, key) {
  const k = await importKey(key, "decrypt");
  let packed;
  try {
    packed = new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv: fromBase64(envelope.iv), additionalData: aad(envelope.generated) }, k, fromBase64(envelope.data)));
  } catch (e) {
    if (e instanceof FeedError) throw e;
    throw new FeedError("bad_key", "La chiave non apre i dati di La Scatola: non è quella giusta, oppure il file è stato modificato.");
  }
  let text3;
  try {
    text3 = new TextDecoder().decode(await pipe(packed, new DecompressionStream("gzip")));
  } catch {
    return bad();
  }
  let payload;
  try {
    payload = JSON.parse(text3);
  } catch {
    return bad();
  }
  return fromPayload(payload, envelope.generated);
}

// src/store.ts
function emptyDinner() {
  return { nights: {}, included: "", allergies: "" };
}

// src/missing-data.ts
var GONE_STATUS = "Non più presente in La Scatola";
var filled = (s) => typeof s === "string" && s.trim() !== "";
function effective(g, key) {
  const override = g.organizer[key];
  return filled(override) ? override.trim() : g[key].trim();
}
var DEFS = {
  booker: {
    level: "important",
    label: "prenotante",
    why: "Non si sa a chi intestare le comunicazioni del gruppo.",
    fix: 'Scrivi nome e cognome in "Organizzatore del gruppo" oppure importa l’export Slope.'
  },
  email: {
    level: "important",
    label: "email",
    why: "Condizioni, messaggio caparra e richiesta rooming list non possono partire via email.",
    fix: 'Scrivi l’email in "Organizzatore del gruppo" oppure importa l’export Slope.'
  },
  total: {
    level: "important",
    label: "importo",
    why: "Non si può calcolare la caparra.",
    fix: 'Importa l’export Slope con la colonna "Importo solo camera".'
  },
  phone: {
    level: "minor",
    label: "telefono",
    why: "Niente chiamata o WhatsApp dalla scheda.",
    fix: 'Scrivi il telefono in "Organizzatore del gruppo".'
  },
  channel: {
    level: "minor",
    label: "canale",
    why: "Non si vede se la prenotazione arriva da un portale (le condizioni si inviano tramite OTA).",
    fix: "Importa l’export Slope: La Scatola non riporta il canale."
  },
  persons: {
    level: "minor",
    label: "persone",
    why: "Manca il numero di persone per cena e soglia gruppo.",
    fix: "Importa l’export Slope con adulti e bambini."
  },
  bookedAt: {
    level: "minor",
    label: "data di prenotazione",
    why: "Le scadenze partono dal giorno in cui il gruppo è entrato nell’app.",
    fix: "Importa l’export Slope con la data di creazione."
  }
};
var ORDER = ["booker", "email", "total", "phone", "channel", "persons", "bookedAt"];
function missingData(g) {
  const hasName = filled(g.booker) || filled(effective(g, "firstName")) || filled(effective(g, "lastName"));
  const absent = {
    booker: !hasName,
    email: !filled(effective(g, "email")),
    total: g.total === null || g.total <= 0,
    phone: !filled(effective(g, "phone")),
    channel: !filled(g.channel),
    persons: g.persons === null || g.persons <= 0,
    bookedAt: !filled(g.bookedAt)
  };
  return ORDER.filter((k) => absent[k]).map((key) => ({ key, ...DEFS[key] }));
}

// src/gruppi-logic.ts
var UnionFind = class {
  constructor(n) {
    this.p = Array.from({ length: n }, (_, i) => i);
  }
  find(x) {
    while (this.p[x] !== x) {
      this.p[x] = this.p[this.p[x]];
      x = this.p[x];
    }
    return x;
  }
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.p[rb] = ra;
  }
};
var maxN = (a, b) => a === null ? b : b === null ? a : Math.max(a, b);
var sumN = (a, b) => a === null ? b : b === null ? a : a + b;
function mode(values) {
  const count = /* @__PURE__ */ new Map();
  let best = "";
  let bestN = 0;
  for (const v of values) {
    if (!v) continue;
    const n = (count.get(v) || 0) + 1;
    count.set(v, n);
    if (n > bestN) {
      bestN = n;
      best = v;
    }
  }
  return best;
}
var validRef = (r) => r.channelRef.length >= 4 && /\d/.test(r.channelRef) && normalizeText(r.channelRef) !== normalizeText(r.channel);
function toBooking(r) {
  return {
    slopeId: r.slopeId,
    room: r.room,
    rooms: r.rooms,
    persons: r.persons,
    guest: r.guest,
    arrival: r.arrival,
    departure: r.departure,
    status: r.status,
    cancelled: r.cancelled,
    total: r.total,
    paid: r.paid,
    balance: r.balance,
    createdAt: r.createdAt,
    channelRef: r.channelRef
  };
}
function countRooms(list) {
  const per = /* @__PURE__ */ new Map();
  for (const b of list) {
    const cur = per.get(b.slopeId) || { named: /* @__PURE__ */ new Set(), unnamed: 0 };
    if (b.room) cur.named.add(b.room);
    else cur.unnamed += b.rooms;
    per.set(b.slopeId, cur);
  }
  let n = 0;
  per.forEach((v) => {
    n += v.named.size + v.unnamed;
  });
  return n;
}
function aggregate(bookings) {
  const active = bookings.filter((b) => !b.cancelled);
  const base = active.length ? active : bookings;
  let arrival = base[0].arrival;
  let departure = base[0].departure;
  for (const b of base) {
    if (b.arrival < arrival) arrival = b.arrival;
    if (b.departure > departure) departure = b.departure;
  }
  const perRoom = /* @__PURE__ */ new Map();
  let total = null;
  let paid = null;
  let balance = null;
  active.forEach((b, i) => {
    const key = b.room ? `${b.slopeId}|${b.room}` : `${b.slopeId}|#${i}`;
    perRoom.set(key, maxN(perRoom.get(key) ?? null, b.persons));
    total = sumN(total, b.total);
    paid = sumN(paid, b.paid);
    balance = sumN(balance, b.balance);
  });
  let persons = null;
  perRoom.forEach((n) => {
    persons = sumN(persons, n);
  });
  return {
    arrival,
    departure,
    roomsActive: countRooms(active),
    roomsTotal: countRooms(bookings),
    persons,
    total: total === null ? null : round2(total),
    paid: paid === null ? null : round2(paid),
    balance: balance === null ? null : round2(balance)
  };
}
function isGroupSize(property, rooms, persons, settings) {
  const pt = settings.personThresholds[property];
  return rooms >= settings.thresholds[property] || pt !== null && persons !== null && persons >= pt;
}
function buildCluster(property, rows, linkedBy, settings) {
  const sorted = rows.slice().sort((a, b) => (a.createdAt || "9").localeCompare(b.createdAt || "9") || a.slopeId.localeCompare(b.slopeId));
  const agg = aggregate(sorted.map(toBooking));
  const first = sorted.find((r) => r.createdAt) || null;
  const bookers = new Set(sorted.map((r) => normalizeText(r.booker)).filter(Boolean));
  const refs = new Set(sorted.filter(validRef).map((r) => r.channelRef));
  const ids = [];
  for (const r of sorted) if (!ids.includes(r.slopeId)) ids.push(r.slopeId);
  const booker = mode(sorted.map((r) => r.booker));
  const lead = sorted.find((r) => normalizeText(r.booker) === normalizeText(booker)) || sorted[0];
  return {
    property,
    rows: sorted,
    ids,
    bookedAt: first ? first.createdAt : null,
    bookedHasTime: first ? first.hasTime : false,
    booker,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email || (sorted.find((r) => r.email) || { email: "" }).email,
    phone: lead.phone || (sorted.find((r) => r.phone) || { phone: "" }).phone,
    channel: mode(sorted.map((r) => r.channel)),
    channelRef: mode(sorted.filter(validRef).map((r) => r.channelRef)),
    ...agg,
    isGroup: isGroupSize(property, agg.roomsActive, agg.persons, settings),
    mixedBookers: bookers.size > 1 && linkedBy.includes("time") && refs.size !== 1,
    linkedBy
  };
}
function detectClusters(rows, settings, timeMode) {
  const out = [];
  for (const property of PROPERTY_IDS) {
    const rs = rows.filter((r) => r.property === property);
    if (!rs.length) continue;
    const uf = new UnionFind(rs.length);
    const edges = [];
    const link = (a, b, k) => {
      uf.union(a, b);
      edges.push([a, k]);
    };
    const byKey = (pick, kind) => {
      const first = /* @__PURE__ */ new Map();
      rs.forEach((r, i) => {
        const k = pick(r);
        if (!k) return;
        const f = first.get(k);
        if (f === void 0) first.set(k, i);
        else link(f, i, kind);
      });
    };
    byKey((r) => r.slopeId, "id");
    byKey((r) => validRef(r) ? r.channelRef : null, "ref");
    if (timeMode === "time") {
      const timed = rs.map((r, i) => ({ i, s: r.createdAt && r.hasTime ? wallSeconds(r.createdAt) : NaN })).filter((x) => !Number.isNaN(x.s)).sort((a, b) => a.s - b.s);
      for (let k = 1; k < timed.length; k++) if (timed[k].s - timed[k - 1].s <= settings.toleranceSec) link(timed[k - 1].i, timed[k].i, "time");
    }
    byKey((r) => {
      if (!r.createdAt || r.hasTime) return null;
      const b = normalizeText(r.booker);
      return `${r.createdAt.slice(0, 10)}|${b || `~${r.departure}`}|${r.arrival}`;
    }, "date");
    if (settings.linkSameBooker) {
      const byBooker = /* @__PURE__ */ new Map();
      rs.forEach((r, i) => {
        const b = normalizeText(r.booker);
        if (b.length < 4 || r.cancelled) return;
        byBooker.set(b, [...byBooker.get(b) || [], i]);
      });
      byBooker.forEach((idx) => {
        for (let a = 0; a < idx.length; a++) {
          for (let b = a + 1; b < idx.length; b++) {
            const x = rs[idx[a]];
            const y = rs[idx[b]];
            if (x.arrival < y.departure && y.arrival < x.departure && uf.find(idx[a]) !== uf.find(idx[b])) link(idx[a], idx[b], "booker");
          }
        }
      });
    }
    const members = /* @__PURE__ */ new Map();
    rs.forEach((_, i) => {
      const root = uf.find(i);
      members.set(root, [...members.get(root) || [], i]);
    });
    const kinds = /* @__PURE__ */ new Map();
    for (const [a, k] of edges) {
      const root = uf.find(a);
      const set = kinds.get(root) || /* @__PURE__ */ new Set();
      set.add(k);
      kinds.set(root, set);
    }
    members.forEach((idx, root) => {
      out.push(buildCluster(property, idx.map((i) => rs[i]), Array.from(kinds.get(root) || []).filter((k) => k !== "id"), settings));
    });
  }
  return out;
}
function sortBookings(list) {
  return list.slice().sort((a, b) => a.arrival.localeCompare(b.arrival) || a.slopeId.localeCompare(b.slopeId) || a.room.localeCompare(b.room) || Number(a.cancelled) - Number(b.cancelled));
}
function emptyStep() {
  return { done: false, at: null, by: null, auto: false };
}
function groupIdFor(c) {
  const stamp = c.bookedAt ? c.bookedAt.replace(/[-T:]/g, "").slice(0, 12) : `a${c.arrival.replace(/-/g, "")}`;
  return `g_${c.property}_${stamp}_${fnv1a(c.ids.slice().sort().join("|"))}`;
}
function balanceState(g) {
  const { total, paid, balance } = g;
  if (total !== null && total > 0) {
    if (balance !== null) return balance <= 5e-3 ? "paid" : "open";
    if (paid !== null) return paid >= total - 5e-3 ? "paid" : "open";
  }
  return "unknown";
}
function applyAutoBalance(g, now) {
  const st = balanceState(g);
  if (st === "paid" && !g.steps.balance.done) g.steps.balance = { done: true, at: now, by: null, auto: true };
  else if (st === "open" && g.steps.balance.done && g.steps.balance.auto) g.steps.balance = emptyStep();
}
function newGroup(c, settings, now, userId, source = "slope-export") {
  const steps = {};
  for (const k of STEP_ORDER) steps[k] = emptyStep();
  const g = {
    id: groupIdFor(c),
    property: c.property,
    source,
    sourceIds: c.ids.slice(),
    syncedAt: now,
    bookedAt: c.bookedAt,
    bookedHasTime: c.bookedHasTime,
    booker: c.booker,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    organizer: { firstName: null, lastName: null, email: null, phone: null },
    channel: c.channel,
    channelRef: c.channelRef,
    arrival: c.arrival,
    departure: c.departure,
    roomsActive: c.roomsActive,
    roomsTotal: c.roomsTotal,
    persons: c.persons,
    total: c.total,
    paid: c.paid,
    balance: c.balance,
    mixedBookers: c.mixedBookers,
    linkedBy: c.linkedBy.slice(),
    bookings: sortBookings(c.rows.map(toBooking)),
    steps,
    payMethod: null,
    dinner: null,
    dinnerInfo: emptyDinner(),
    roomingList: "",
    lang: settings.defaultLang,
    regularOverride: null,
    excluded: false,
    missingSince: null,
    belowSince: null,
    notes: "",
    firstSeen: now,
    updatedAt: now,
    updatedBy: userId
  };
  if (source === "slope-export") applyAutoBalance(g, now);
  return g;
}
function mergeCluster(g, c, settings, now) {
  const incoming = new Set(c.ids);
  const bookings = sortBookings([...g.bookings.filter((b) => !incoming.has(b.slopeId)), ...c.rows.map(toBooking)]);
  g.bookings = bookings;
  for (const id of c.ids) if (!g.sourceIds.includes(id)) g.sourceIds.push(id);
  const agg = aggregate(bookings);
  Object.assign(g, agg);
  if (c.booker) g.booker = c.booker;
  if (c.email) g.email = c.email;
  if (c.firstName || c.lastName) {
    g.firstName = c.firstName;
    g.lastName = c.lastName;
  }
  if (c.phone) g.phone = c.phone;
  if (c.channel) g.channel = c.channel;
  if (c.channelRef) g.channelRef = c.channelRef;
  if (c.bookedAt && (!g.bookedAt || c.bookedAt < g.bookedAt)) {
    g.bookedAt = c.bookedAt;
    g.bookedHasTime = c.bookedHasTime;
  }
  g.mixedBookers = c.mixedBookers;
  for (const k of c.linkedBy) if (!g.linkedBy.includes(k)) g.linkedBy.push(k);
  g.missingSince = null;
  g.belowSince = isGroupSize(g.property, agg.roomsActive, agg.persons, settings) ? null : g.belowSince || now;
  g.source = "slope-export";
  applyAutoBalance(g, now);
}
function mergePartial(g, c, settings, now, range, known) {
  const incoming = new Set(c.ids);
  const inRange = (b) => !range || b.arrival >= range.from && b.arrival <= range.to;
  const gone = (b) => b.cancelled || !inRange(b) ? b : { ...b, cancelled: true, status: GONE_STATUS };
  const carry = (old, nb) => ({ ...old, room: nb.room, arrival: nb.arrival, departure: nb.departure, rooms: nb.rooms, persons: nb.persons ?? old.persons, cancelled: false, status: old.cancelled ? nb.status : old.status });
  const group = (list) => {
    const m = /* @__PURE__ */ new Map();
    for (const b of list) m.set(b.slopeId, [...m.get(b.slopeId) || [], b]);
    return m;
  };
  const oldByOrder = group(g.bookings.filter((b) => incoming.has(b.slopeId)));
  const newByOrder = group(c.rows.map(toBooking));
  const next2 = g.bookings.filter((b) => !incoming.has(b.slopeId));
  for (const id of c.ids) {
    const olds = oldByOrder.get(id) || [];
    const news = newByOrder.get(id) || [];
    const used = /* @__PURE__ */ new Set();
    const free = (test) => olds.findIndex((o, i) => !used.has(i) && test(o));
    const pending = [];
    for (const nb of news) {
      let i = free((o) => o.room === nb.room && !o.cancelled);
      if (i < 0) i = free((o) => o.room === nb.room);
      if (i < 0) {
        pending.push(nb);
        continue;
      }
      used.add(i);
      next2.push(carry(olds[i], nb));
    }
    for (const nb of pending) {
      const sameStay = (o) => !o.cancelled && o.arrival === nb.arrival && o.departure === nb.departure;
      let i = free((o) => sameStay(o) && o.persons === nb.persons);
      if (i < 0) i = free(sameStay);
      if (i < 0) i = free((o) => !o.cancelled);
      if (i >= 0) {
        used.add(i);
        next2.push(carry(olds[i], nb));
      } else next2.push(olds.length ? { ...nb, total: null, paid: null, balance: null } : nb);
    }
    olds.forEach((o, i) => {
      if (!used.has(i)) next2.push(gone(o));
    });
  }
  const bookings = sortBookings(next2.map((b) => known.has(b.slopeId) ? b : gone(b)));
  g.bookings = bookings;
  for (const id of c.ids) if (!g.sourceIds.includes(id)) g.sourceIds.push(id);
  const agg = aggregate(bookings);
  Object.assign(g, agg);
  if (!g.booker && c.booker) g.booker = c.booker;
  if (!g.firstName && !g.lastName && (c.firstName || c.lastName)) {
    g.firstName = c.firstName;
    g.lastName = c.lastName;
  }
  if (!g.email && c.email) g.email = c.email;
  if (!g.phone && c.phone) g.phone = c.phone;
  if (!g.channel && c.channel) g.channel = c.channel;
  if (!g.channelRef && c.channelRef) g.channelRef = c.channelRef;
  if (!g.bookedAt && c.bookedAt) {
    g.bookedAt = c.bookedAt;
    g.bookedHasTime = c.bookedHasTime;
  }
  for (const k of c.linkedBy) if (!g.linkedBy.includes(k)) g.linkedBy.push(k);
  g.missingSince = null;
  g.belowSince = isGroupSize(g.property, agg.roomsActive, agg.persons, settings) ? null : g.belowSince || now;
}
var goneCount = (g) => g.bookings.filter((b) => b.cancelled && b.status === GONE_STATUS).length;
var SLOPE_FIELDS = [
  "source",
  "sourceIds",
  "bookedAt",
  "bookedHasTime",
  "booker",
  "firstName",
  "lastName",
  "email",
  "phone",
  "channel",
  "channelRef",
  "arrival",
  "departure",
  "roomsActive",
  "roomsTotal",
  "persons",
  "total",
  "paid",
  "balance",
  "mixedBookers",
  "linkedBy",
  "bookings",
  "missingSince",
  "belowSince"
];
function diffPatch(before, after) {
  const patch = {};
  for (const f of SLOPE_FIELDS) if (JSON.stringify(before[f]) !== JSON.stringify(after[f])) patch[f] = clone(after[f]);
  if (JSON.stringify(before.steps.balance) !== JSON.stringify(after.steps.balance)) patch.steps = { balance: clone(after.steps.balance) };
  return Object.keys(patch).length ? patch : null;
}
var clusterKey = (c) => `${c.property}|${c.ids.slice().sort().join("|")}`;
function reconcile(clusters, existing, settings, ctx) {
  const working = new Map(existing.map((g) => [g.id, clone(g)]));
  const idIndex = /* @__PURE__ */ new Map();
  for (const g of existing) for (const sid of g.sourceIds) idIndex.set(`${g.property}|${sid}`, g.id);
  const touched = /* @__PURE__ */ new Set();
  const created = /* @__PURE__ */ new Set();
  const near = [];
  let pastSkipped = 0;
  const source = ctx.source || "slope-export";
  const known = /* @__PURE__ */ new Map();
  for (const c of clusters) {
    const set = known.get(c.property) || /* @__PURE__ */ new Set();
    for (const id of c.ids) set.add(id);
    known.set(c.property, set);
  }
  for (const c of clusters) {
    const counts = /* @__PURE__ */ new Map();
    for (const id of c.ids) {
      const gid = idIndex.get(`${c.property}|${id}`);
      if (gid) counts.set(gid, (counts.get(gid) || 0) + 1);
    }
    let target = null;
    let best = 0;
    counts.forEach((n, gid) => {
      if (n > best) {
        best = n;
        target = gid;
      }
    });
    const forced = Boolean(ctx.force && ctx.force.has(clusterKey(c)));
    if (target === null && (c.isGroup || forced)) {
      if (c.departure < ctx.today) {
        pastSkipped++;
        continue;
      }
      const g2 = newGroup(c, settings, ctx.now, ctx.userId, source);
      if (forced && !c.isGroup) g2.belowSince = ctx.now;
      if (working.has(g2.id)) target = g2.id;
      else {
        working.set(g2.id, g2);
        created.add(g2.id);
        touched.add(g2.id);
        for (const id of c.ids) idIndex.set(`${c.property}|${id}`, g2.id);
        continue;
      }
    }
    if (target === null) {
      if (c.roomsActive >= 2) near.push(c);
      continue;
    }
    const g = working.get(target);
    if (!g) continue;
    if (source === "scatola") mergePartial(g, c, settings, ctx.now, ctx.arrivalRange[c.property], known.get(c.property) || /* @__PURE__ */ new Set());
    else mergeCluster(g, c, settings, ctx.now);
    touched.add(target);
    for (const id of c.ids) idIndex.set(`${c.property}|${id}`, target);
  }
  let missing = 0;
  for (const g of existing) {
    if (touched.has(g.id) || g.excluded || g.missingSince || !ctx.properties.includes(g.property)) continue;
    const range = ctx.arrivalRange[g.property];
    if (!range || g.departure < ctx.today) continue;
    if (g.arrival >= range.from && g.arrival <= range.to) {
      const w = working.get(g.id);
      if (w) w.missingSince = ctx.now;
      touched.add(g.id);
      missing++;
    }
  }
  const ops = [];
  let updated = 0;
  let unchanged = 0;
  let gone = 0;
  const before = new Map(existing.map((g) => [g.id, g]));
  touched.forEach((id) => {
    const after = working.get(id);
    if (!after) return;
    if (created.has(id)) {
      if (ctx.markPastDone) markOverdueDone(after, settings, ctx.regulars, ctx.today, ctx.userId, 3);
      ops.push({ kind: "create", id, record: after, before: null, patch: null });
      return;
    }
    const prev = before.get(id);
    if (!prev) return;
    const patch = diffPatch(prev, after);
    if (!patch) {
      unchanged++;
      return;
    }
    patch.syncedAt = ctx.now;
    after.syncedAt = ctx.now;
    gone += Math.max(0, goneCount(after) - goneCount(prev));
    ops.push({ kind: "update", id, record: after, before: prev, patch });
    updated++;
  });
  return { ops, created: created.size, updated, unchanged, missing, pastSkipped, near, gone };
}
function markOverdueDone(g, settings, regulars, today, userId, minDaysOverdue = 1) {
  const marked = [];
  for (let pass = 0; pass < 4; pass++) {
    const v = buildView(g, settings, regulars, today);
    let changed = false;
    for (const k of STEP_ORDER) {
      const st = v.steps[k];
      if (st.status === "overdue" && st.due && diffDays(st.due, today) >= minDaysOverdue) {
        g.steps[k] = { done: true, at: (/* @__PURE__ */ new Date(`${st.due}T12:00:00`)).toISOString(), by: userId, auto: false };
        marked.push(k);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return marked;
}
function matchRegular(booker, email, regulars) {
  const bt = new Set(tokens(booker));
  const mail = email.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const r of regulars) {
    for (const cand of [r.name, ...r.keywords]) {
      const ct = tokens(cand);
      if (!ct.length) continue;
      if (bt.size && ct.every((t) => bt.has(t))) return r;
      const compact = ct.join("");
      if (mail && compact.length >= 5 && mail.includes(compact)) return r;
    }
  }
  return null;
}
function buildView(g, settings, regulars, today) {
  const prop = PROPERTIES[g.property];
  const regularMatch = matchRegular(g.booker, g.email, regulars);
  const regular = g.regularOverride ?? Boolean(regularMatch);
  const B = (g.bookedAt ? g.bookedAt.slice(0, 10) : localDateOfStamp(g.firstSeen)) || today;
  const A = g.arrival;
  const chargeBase = maxDate(B, addMonths(A, -settings.depositMonthsBefore));
  const noticeDue = maxDate(B, addDays(chargeBase, -settings.noticeDaysBeforeCharge));
  const steps = {};
  const mk = (key, due, extra) => {
    const state = g.steps[key];
    let status;
    let note = "";
    if (state.done) status = "done";
    else if (extra && extra.na !== void 0) {
      status = "na";
      note = extra.na;
    } else if (today > A) {
      status = "lapsed";
      note = "Non fatto prima dell’arrivo";
    } else if (extra && extra.waiting !== void 0) {
      status = "waiting";
      note = extra.waiting;
    } else if (due === null) status = "planned";
    else {
      const d = diffDays(today, due);
      status = d < 0 ? "overdue" : d === 0 ? "today" : d <= settings.soonWindow ? "soon" : "planned";
    }
    steps[key] = { key, status, due, state, note };
  };
  const exempt = regular ? { na: "Gruppo abituale: esente" } : void 0;
  mk("letter", B, regular && settings.regularSkipLetter ? { na: "Gruppo abituale: non si inviano" } : void 0);
  mk("depositNotice", noticeDue, exempt);
  const noticeAt = g.steps.depositNotice.done ? localDateOfStamp(g.steps.depositNotice.at) : null;
  const chargeDue = noticeAt ? maxDate(chargeBase, addDays(noticeAt, settings.noticeDaysBeforeCharge)) : chargeBase;
  mk("deposit", chargeDue, exempt || (g.steps.depositNotice.done ? void 0 : { waiting: `Dopo il messaggio (prevista il ${fmtDate(chargeBase)})` }));
  mk("roomingRequest", maxDate(B, addDays(A, -settings.leadRooming)));
  const reqAt = g.steps.roomingRequest.done ? localDateOfStamp(g.steps.roomingRequest.at) : null;
  const replyDue = reqAt ? maxDate(reqAt, minDate(addDays(reqAt, settings.roomingReplyDays), addDays(A, -1))) : null;
  mk("roomingReceived", replyDue, reqAt ? void 0 : { waiting: "Dopo la richiesta" });
  if (prop.dinner) mk("dinner", replyDue, reqAt ? void 0 : { waiting: "Con la rooming list" });
  else mk("dinner", null, { na: "Solo Smart Hotel Saslong" });
  mk(
    "balanceNotice",
    maxDate(B, addDays(A, -settings.leadBalanceNotice)),
    g.payMethod === "transfer" ? void 0 : { na: g.payMethod ? "Solo per chi paga con bonifico" : "Solo per chi paga con bonifico: mezzo non ancora indicato" }
  );
  mk("balance", maxDate(B, addDays(A, -settings.leadBalance)));
  const openStatuses = ["overdue", "today", "soon"];
  let open = 0;
  let worst2 = null;
  for (const k of STEP_ORDER) {
    const st = steps[k].status;
    if (openStatuses.includes(st)) {
      open++;
      if (worst2 === null || openStatuses.indexOf(st) < openStatuses.indexOf(worst2)) worst2 = st;
    }
  }
  return {
    g,
    prop,
    regular,
    regularMatch,
    steps,
    nights: diffDays(A, g.departure),
    daysToArrival: diffDays(today, A),
    phase: today < A ? "future" : today < g.departure ? "inhouse" : "past",
    open,
    worst: worst2,
    attention: Boolean(g.missingSince || g.belowSince || g.mixedBookers),
    missing: missingData(g)
  };
}

// scripts/scatola-feed-cli.ts
var WORK = join(tmpdir(), "alpstay-gruppi-feed");
var RUN_FILE = join(WORK, "run.json");
var IN_LIMIT = 50;
var PAGE_LIMIT = 500;
var MAX_FAILURES = 3;
var BOOTSTRAP_BY_DATE = 400;
var FRESHNESS_RANK = { fresh: 0, unknown: 1, stale: 2, failing: 3 };
var isRecord3 = (x) => typeof x === "object" && x !== null && !Array.isArray(x);
var text2 = (x) => typeof x === "string" ? x.trim() : "";
var STATUS_FILE = "scatola-stato.json";
function writeStatus(ok, message, extra = {}) {
  try {
    if (!existsSync(RUN_FILE)) return;
    const run = JSON.parse(readFileSync(RUN_FILE, "utf8"));
    writeFileSync(join(dirname(run.out), STATUS_FILE), `${JSON.stringify({ at: (/* @__PURE__ */ new Date()).toISOString(), ok, messaggio: message, ...extra })}
`);
  } catch {
  }
}
function fail(message) {
  console.log(`ERRORE: ${message}`);
  writeStatus(false, message);
  console.log(`Non pubblicare scatola.json. Pubblica solo ${STATUS_FILE} (dice perché l'aggiornamento non è arrivato) e riporta questo messaggio nel riepilogo.`);
  process.exit(2);
}
function romeToday(now) {
  const parts = {};
  for (const p of new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now)) parts[p.type] = p.value;
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function shiftDay(date, days) {
  const ms = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) + days * 864e5;
  return new Date(ms).toISOString().slice(0, 10);
}
function flag(args, name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
function findTranscript() {
  const root = join(homedir(), ".claude", "projects");
  let best = null;
  if (existsSync(root)) {
    for (const dir of readdirSync(root)) {
      const d = join(root, dir);
      if (!statSync(d).isDirectory()) continue;
      for (const f of readdirSync(d)) {
        if (!f.endsWith(".jsonl")) continue;
        const p = join(d, f);
        const m = statSync(p).mtimeMs;
        if (!best || m > best.mtime) best = { path: p, mtime: m };
      }
    }
  }
  if (!best) fail(`non trovo il registro della sessione in ${root}. Passa il percorso con --transcript a "start".`);
  return best.path;
}
function resultText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((b) => isRecord3(b) && typeof b.text === "string" ? b.text : "").join("");
  return "";
}
function parseResult(body) {
  let raw = body.trim();
  const saved = /saved to (\/\S+?\.(?:txt|json))(?=[.\s]|$)/.exec(raw);
  if (!raw.startsWith("{") && saved) {
    if (!existsSync(saved[1])) return { page: null, error: `file della risposta non trovato: ${saved[1]}` };
    raw = readFileSync(saved[1], "utf8").trim();
  }
  if (!raw.startsWith("{")) return { page: null, error: raw.slice(0, 200) || "risposta vuota" };
  try {
    return { page: parseScatolaPayload(JSON.parse(raw)), error: null };
  } catch (e) {
    return { page: null, error: e instanceof Error ? e.message.slice(0, 200) : "risposta non leggibile" };
  }
}
function readCalls(transcript, since) {
  const byId = /* @__PURE__ */ new Map();
  for (const line of readFileSync(transcript, "utf8").split("\n")) {
    if (!line || !line.includes("query_curated_view") && !line.includes("tool_result")) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isRecord3(o) || !isRecord3(o.message) || !Array.isArray(o.message.content)) continue;
    const at = text2(o.timestamp);
    for (const block of o.message.content) {
      if (!isRecord3(block)) continue;
      if (block.type === "tool_use" && typeof block.name === "string" && /scatola/i.test(block.name) && /query_curated_view$/.test(block.name) && typeof block.id === "string" && isRecord3(block.input)) {
        if (at >= since) byId.set(block.id, { id: block.id, at, input: block.input, page: null, error: "nessuna risposta" });
      } else if (block.type === "tool_result" && typeof block.tool_use_id === "string") {
        const call = byId.get(block.tool_use_id);
        if (call) Object.assign(call, parseResult(resultText(block.content)));
      }
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.at.localeCompare(b.at));
}
var filterKey = (f) => isRecord3(f) ? `${text2(f.field)}|${text2(f.op)}|${JSON.stringify(f.value)}` : "";
function sameFilters(input, expected) {
  const got = Array.isArray(input.filters) ? input.filters.map(filterKey).sort() : [];
  const want = expected.map(filterKey).sort();
  return got.length === want.length && got.every((k, i) => k === want[i]);
}
var isPlain = (c, view) => c.input.view === view && !(Array.isArray(c.input.group_by) && c.input.group_by.length) && !(Array.isArray(c.input.aggregates) && c.input.aggregates.length);
function follow(calls, first) {
  const mine = calls.filter((c) => isPlain(c, first.view) && sameFilters(c.input, first.filters));
  const starts = mine.filter((c) => !c.input.cursor);
  const start2 = starts.filter((c) => c.page).pop();
  const chain = { pages: [], rows: [], next: null, failures: 0, starts: starts.filter((c) => c.page).length };
  if (!start2) {
    chain.failures = starts.length;
    chain.next = { ...first };
    return chain;
  }
  let cur = start2;
  for (let guard = 0; guard < 2e3; guard++) {
    const page = cur.page;
    chain.pages.push(cur);
    chain.rows.push(...page.data);
    if (!page.nextCursor) return chain;
    const tries = mine.filter((c) => c.input.cursor === page.nextCursor && c.at >= start2.at);
    const ok = tries.filter((c) => c.page).pop();
    if (!ok) {
      chain.failures = tries.length;
      chain.next = { ...first, cursor: page.nextCursor };
      return chain;
    }
    cur = ok;
  }
  return fail("la lettura a pagine non termina.");
}
function worst(calls) {
  let w = "fresh";
  for (const c of calls) if (c.page && FRESHNESS_RANK[c.page.freshness] > FRESHNESS_RANK[w]) w = c.page.freshness;
  return w;
}
function ask(input, what) {
  console.log(`PROSSIMO PASSO: ${what}`);
  console.log('CHIAMA lo strumento query_curated_view del connettore La Scatola con ESATTAMENTE questi argomenti (copia e incolla, senza cambiare nulla), poi riesegui "next":');
  console.log(JSON.stringify(input));
  process.exit(0);
}
async function loadPrevious(run) {
  if (!existsSync(run.out)) return null;
  try {
    return await decodeFeed(parseEnvelope(JSON.parse(readFileSync(run.out, "utf8"))), run.key);
  } catch (e) {
    console.log(`NOTA: il file precedente non si apre (${e instanceof Error ? e.message : "errore"}): riparto da zero.`);
    return null;
  }
}
function start(args) {
  const key = args[0] || "";
  if (!isFeedKey(key)) fail('la chiave passata a "start" non ha la forma giusta (43 caratteri).');
  const days = Number(flag(args, "--days") || DEFAULT_SETTINGS.scatolaHorizonDays);
  if (!Number.isInteger(days) || days < 30 || days > 730) fail("--days deve essere tra 30 e 730.");
  const today = flag(args, "--today") || romeToday(/* @__PURE__ */ new Date());
  const transcript = flag(args, "--transcript");
  const run = { since: (/* @__PURE__ */ new Date()).toISOString(), from: today, to: shiftDay(today, days), key, out: resolve(flag(args, "--out") || "scatola.json"), transcript: transcript ? resolve(transcript) : null, today, byDateOver: Number(flag(args, "--by-date-over") || BOOTSTRAP_BY_DATE) };
  mkdirSync(WORK, { recursive: true });
  writeFileSync(RUN_FILE, JSON.stringify(run), { mode: 384 });
  console.log(`Avviato: arrivi dal ${run.from} al ${run.to}, file ${run.out}.`);
  console.log('Ora esegui "node tools/scatola-feed.mjs next" e segui quello che dice, ripetendo finché risponde PRONTO oppure ERRORE.');
}
function loadRun() {
  if (!existsSync(RUN_FILE)) fail('esegui prima "start <CHIAVE>".');
  return JSON.parse(readFileSync(RUN_FILE, "utf8"));
}
function summary(snap, previous, fresh, cached) {
  const { rows, unknownProperty } = snapshotToRows(snap);
  const parsed = parseResultFromRows(rows, "scatola", { from: snap.from, to: snap.to });
  const res = reconcile(detectClusters(parsed.rows, DEFAULT_SETTINGS, parsed.timeMode), [], DEFAULT_SETTINGS, {
    now: snap.fetchedAt,
    today: snap.from,
    userId: null,
    properties: parsed.properties,
    arrivalRange: parsed.arrivalRange,
    markPastDone: false,
    regulars: [],
    source: "scatola"
  });
  const per = (p) => `${PROPERTIES[p].short} ${rows.filter((r) => r.property === p).length} camere, ${res.ops.filter((o) => o.record.property === p).length} gruppi`;
  console.log(`RIEPILOGO (senza dati personali): dati La Scatola del ${snap.fetchedAt} (${snap.freshness}), arrivi ${snap.from} > ${snap.to}.`);
  console.log(`  ${PROPERTY_IDS.map(per).join(" | ")}`);
  console.log(`  camere ${rows.length}, ordini ${snap.balances.length} (${fresh} letti oggi, ${cached} già noti), ordini con prenotante ${new Set(rows.filter((r) => r.booker).map((r) => r.slopeId)).size}, camere di strutture non riconosciute ${unknownProperty}.`);
  if (previous) console.log(`  file precedente: dati del ${previous.generated}, ${previous.rows.length} camere.`);
}
async function next(args) {
  const run = loadRun();
  const force = args.includes("--force");
  const calls = readCalls(run.transcript || findTranscript(), run.since);
  const broken = (c, what) => {
    if (c.failures >= MAX_FAILURES) fail(`${what}: ${c.failures} tentativi falliti. Ultimo errore: ${calls.filter((x) => !x.page).pop()?.error || "sconosciuto"}`);
  };
  const staysQuery = {
    view: "curated_operational_stays",
    filters: [{ field: "arrival", op: "gte", value: run.from }, { field: "arrival", op: "lte", value: run.to }],
    order_by: [{ field: "arrival", direction: "asc" }],
    limit: PAGE_LIMIT
  };
  const stays = follow(calls, staysQuery);
  broken(stays, "lettura dei soggiorni");
  const total = stays.pages.length ? stays.pages[0].page?.total ?? null : null;
  if (stays.next) ask(stays.next, `soggiorni, ${stays.rows.length} righe lette${total !== null ? ` su ${total}` : ""}.`);
  const stayKey = (x) => isRecord3(x) ? `${text2(x.reservation_id)}|${text2(x.room_name)}|${text2(x.arrival)}` : "";
  const distinct = new Set(stays.rows.map(stayKey)).size;
  if (total !== null && stays.rows.length !== total || distinct !== stays.rows.length) {
    if (stays.starts >= 3) fail(`i soggiorni cambiano durante la lettura (${stays.rows.length} righe, ${distinct} distinte, ${total} dichiarate) anche al terzo tentativo.`);
    ask({ ...staysQuery }, "i dati sono cambiati durante la lettura dei soggiorni: si rilegge da capo.");
  }
  if (!stays.rows.length) fail("La Scatola non ha restituito nessun soggiorno.");
  const stayOrder = /* @__PURE__ */ new Map();
  for (const r of stays.rows) if (isRecord3(r) && text2(r.order_id)) stayOrder.set(text2(r.order_id), (stayOrder.get(text2(r.order_id)) || 0) + 1);
  const needed = Array.from(stayOrder.keys());
  const previous = await loadPrevious(run);
  const cached = /* @__PURE__ */ new Map();
  if (previous) {
    for (const o of previous.orders) {
      cached.set(o.orderId, { order_id: o.orderId, order_number: o.orderNumber, creation_date: o.createdAt, order_total: o.total, collected_amount: o.collected, collected_refunded_amount: o.refunded, open_balance: o.openBalance });
    }
  }
  const sinceDate = previous ? shiftDay(previous.generated.slice(0, 10), -2) : needed.length > run.byDateOver ? shiftDay(run.today, -560) : null;
  const none = { pages: [], rows: [], next: null, failures: 0, starts: 0 };
  const recent = sinceDate ? follow(calls, { view: "curated_order_balances", filters: [{ field: "creation_date", op: "gte", value: sinceDate }], order_by: [{ field: "creation_date", direction: "asc" }], limit: PAGE_LIMIT }) : none;
  broken(recent, "lettura degli ordini recenti");
  if (recent.next) ask(recent.next, `ordini creati dal ${sinceDate}, ${recent.rows.length} letti${recent.pages.length ? ` su ${recent.pages[0].page?.total ?? "?"}` : ""}.`);
  const read = /* @__PURE__ */ new Map();
  const byNumber = /* @__PURE__ */ new Map();
  const inCalls = calls.filter((c) => isPlain(c, "curated_order_balances") && c.page && Array.isArray(c.input.filters) && c.input.filters.some((f) => isRecord3(f) && f.op === "in"));
  for (const row of [...recent.rows, ...inCalls.flatMap((c) => c.page.data)]) {
    if (isRecord3(row) && text2(row.order_id)) read.set(text2(row.order_id), row);
  }
  for (const c of inCalls) {
    const cursor = c.page.nextCursor;
    const same = (x) => JSON.stringify(Array.isArray(x.input.filters) ? x.input.filters.map(filterKey).sort() : []) === JSON.stringify(c.input.filters.map(filterKey).sort());
    if (cursor && !calls.some((x) => x.page && x.input.cursor === cursor && same(x))) ask({ view: "curated_order_balances", filters: c.input.filters, limit: PAGE_LIMIT, cursor }, "ordini: la risposta precedente continua.");
  }
  const asked = /* @__PURE__ */ new Set();
  for (const c of inCalls) {
    for (const f of c.input.filters) {
      if (isRecord3(f) && f.field === "order_id" && f.op === "in" && Array.isArray(f.value)) for (const v of f.value) asked.add(String(v));
      if (isRecord3(f) && f.field === "order_number" && f.op === "in" && Array.isArray(f.value)) for (const v of f.value) byNumber.set(String(v), "");
    }
  }
  const unknown = needed.filter((id) => !read.has(id) && !cached.has(id));
  const absent = unknown.filter((id) => asked.has(id));
  if (absent.length) fail(`La Scatola non ha i dati di ${absent.length} ordini che hanno un soggiorno (lettura incompleta).`);
  if (inCalls.length > Math.ceil(needed.length / IN_LIMIT) + 8) fail("troppe richieste sugli ordini: qualcosa non torna negli ID inviati.");
  if (unknown.length) {
    ask({ view: "curated_order_balances", filters: [{ field: "order_id", op: "in", value: unknown.slice(0, IN_LIMIT) }], limit: PAGE_LIMIT }, `ordini senza dati: ne mancano ${unknown.length}.`);
  }
  const numberOf = (id) => {
    const row = cached.get(id);
    return row ? String(row.order_number) : "";
  };
  const stale = needed.filter((id) => (stayOrder.get(id) || 0) >= 3 && !read.has(id) && numberOf(id) && !byNumber.has(numberOf(id)));
  if (stale.length) {
    const numbers = stale.slice(0, IN_LIMIT).map((id) => Number(numberOf(id)));
    ask({ view: "curated_order_balances", filters: [{ field: "order_number", op: "in", value: numbers }], limit: PAGE_LIMIT }, `importi aggiornati dei possibili gruppi: ne mancano ${stale.length}.`);
  }
  const guests = follow(calls, {
    view: "curated_guest_stays",
    filters: [{ field: "stay_start", op: "gte", value: run.from }, { field: "stay_start", op: "lte", value: run.to }, { field: "is_primary_guest", op: "eq", value: true }],
    limit: PAGE_LIMIT
  });
  broken(guests, "lettura dei prenotanti");
  if (guests.next) ask(guests.next, `prenotanti registrati, ${guests.rows.length} letti.`);
  const balanceRows = needed.map((id) => read.get(id) || cached.get(id)).filter((r) => r !== void 0);
  const used = [...stays.pages, ...recent.pages, ...inCalls, ...guests.pages];
  let snap;
  try {
    snap = buildSnapshot({ from: run.from, to: run.to, fetchedAt: stays.pages[0].at, freshness: worst(used), stayRows: stays.rows, balanceRows, guestRows: guests.rows });
  } catch (e) {
    return fail(e instanceof ScatolaError ? e.message : "dati non coerenti.");
  }
  const { rows } = snapshotToRows(snap);
  if (previous && !force) {
    for (const p of PROPERTY_IDS) {
      const before = previous.rows.filter((r) => r.property === p).length;
      const now = rows.filter((r) => r.property === p).length;
      if (before >= 40 && now < before * 0.6) fail(`${PROPERTIES[p].short}: ${now} camere contro le ${before} del file precedente. Sembra una lettura sbagliata; se è corretto, riesegui "next --force".`);
    }
  }
  const envelope = await encodeFeed(snap, run.key);
  const back = await decodeFeed(parseEnvelope(JSON.parse(JSON.stringify(envelope))), run.key);
  if (JSON.stringify(back.rows) !== JSON.stringify(rows)) fail("il file riletto non coincide con i dati di partenza.");
  writeFileSync(run.out, `${JSON.stringify(envelope)}
`);
  summary(snap, previous, needed.filter((id) => read.has(id)).length, needed.filter((id) => !read.has(id)).length);
  console.log(`verifica OK: scritto ${run.out} (${Math.round(statSync(run.out).size / 1024)} KB, cifrato).`);
  writeStatus(true, "Dati pubblicati.", { generated: snap.fetchedAt, camere: rows.length, ordini: snap.balances.length, chiamate: calls.length });
  console.log(`PRONTO: pubblica scatola.json e ${STATUS_FILE} (git add, commit, push).`);
}
async function verify(args) {
  const [file, key] = args;
  if (!file || !key) fail("uso: verify <scatola.json> <CHIAVE>");
  try {
    const content = await decodeFeed(parseEnvelope(JSON.parse(readFileSync(file, "utf8"))), key);
    console.log(`verifica OK: dati del ${content.generated}, arrivi ${content.from} > ${content.to}, ${content.rows.length} camere, ${content.orders.length} ordini.`);
  } catch (e) {
    fail(e instanceof FeedError ? e.message : "file non leggibile.");
  }
}
async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "keygen") console.log(generateFeedKey());
  else if (cmd === "start") start(args);
  else if (cmd === "next") await next(args);
  else if (cmd === "verify") await verify(args);
  else {
    console.log("uso: keygen | start <CHIAVE> [--days N] [--out file] | next [--force] | verify <file> <CHIAVE>");
    process.exit(1);
  }
}
void main();
