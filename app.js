// =====================
// 1) Productos
// =====================
const productos = [
  "Tenis Running Pro",
  "Leggings PowerFit",
  "Camiseta DryTech",
  "Shorts Velocity",
  "Sudadera Active",
  "Top Deportivo Flex",
  "Chaqueta WindRunner",
  "Medias Compresión Elite",
  "Morral SportMax",
  "Gorra Performance"
];

// =====================
// 2) Tipos de cliente
// =====================
const segmentos = {
  RUN: "Corredores",
  GYM: "Gimnasio",
  YOGA: "Yoga / Funcional",
  FUT: "Fútbol amateur",
  CASUAL: "Uso diario deportivo",
  PREMIUM: "Cliente premium"
};

// =====================
// 3) Objetivos de compra
// =====================
const contextos = {
  VENTA: "¿Cuál comprarías más probablemente?",
  COMODIDAD: "¿Cuál es más cómodo?",
  RENDIMIENTO: "¿Cuál ayuda más al rendimiento deportivo?",
  ESTILO: "¿Cuál se ve mejor?"
};

// =====================
// 4) Parámetros Elo
// =====================
const RATING_INICIAL = 1000;
const K = 32;

// =====================
// 5) Estado + localStorage
// =====================
const STORAGE_KEY = "sportstyle_rank_v1";

function defaultState() {
  const buckets = {};

  for (const seg of Object.keys(segmentos)) {
    for (const ctx of Object.keys(contextos)) {

      const key = `${seg}__${ctx}`;
      buckets[key] = {};

      productos.forEach(p => {
        buckets[key][p] = RATING_INICIAL;
      });
    }
  }

  return { buckets, votes: [] };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return defaultState();

  try {
    return JSON.parse(raw);
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

// =====================
// 6) Utilidades Elo
// =====================
function expectedScore(ra, rb) {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

function updateElo(bucket, a, b, winner) {

  const ra = bucket[a];
  const rb = bucket[b];

  const ea = expectedScore(ra, rb);
  const eb = expectedScore(rb, ra);

  const sa = winner === "A" ? 1 : 0;
  const sb = winner === "B" ? 1 : 0;

  bucket[a] = ra + K * (sa - ea);
  bucket[b] = rb + K * (sb - eb);
}

function randomPair() {

  const a = productos[Math.floor(Math.random() * productos.length)];

  let b = a;

  while (b === a) {
    b = productos[Math.floor(Math.random() * productos.length)];
  }

  return [a, b];
}

function bucketKey(seg, ctx) {
  return `${seg}__${ctx}`;
}

function topN(bucket, n = 10) {

  return Object.entries(bucket)
    .map(([producto, rating]) => ({ producto, rating }))
    .sort((x, y) => y.rating - x.rating)
    .slice(0, n);
}

// =====================
// 7) UI
// =====================
const segmentSelect = document.getElementById("segmentSelect");
const contextSelect = document.getElementById("contextSelect");

const questionEl = document.getElementById("question");

const labelA = document.getElementById("labelA");
const labelB = document.getElementById("labelB");

const btnA = document.getElementById("btnA");
const btnB = document.getElementById("btnB");

const btnNewPair = document.getElementById("btnNewPair");
const btnShowTop = document.getElementById("btnShowTop");

const btnReset = document.getElementById("btnReset");
const btnExport = document.getElementById("btnExport");

const topBox = document.getElementById("topBox");

let currentA = null;
let currentB = null;

function fillSelect(el, obj) {

  el.innerHTML = "";

  for (const [k, v] of Object.entries(obj)) {

    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = v;

    el.appendChild(opt);
  }
}

fillSelect(segmentSelect, segmentos);
fillSelect(contextSelect, contextos);

// valores iniciales
segmentSelect.value = "RUN";
contextSelect.value = "VENTA";

function refreshQuestion() {
  questionEl.textContent = contextos[contextSelect.value];
}

function newDuel() {

  [currentA, currentB] = randomPair();

  labelA.textContent = currentA;
  labelB.textContent = currentB;

  refreshQuestion();
}

function renderTop() {

  const key = bucketKey(
    segmentSelect.value,
    contextSelect.value
  );

  const bucket = state.buckets[key];

  const rows = topN(bucket, 10);

  topBox.innerHTML = rows.map((r, i) => `
    <div class="toprow">
      <span><b>${i + 1}.</b> ${r.producto}</span>
      <span>${r.rating.toFixed(1)}</span>
    </div>
  `).join("");
}

// =====================
// 8) Votar
// =====================
function vote(winner) {

  const seg = segmentSelect.value;
  const ctx = contextSelect.value;

  const key = bucketKey(seg, ctx);
  const bucket = state.buckets[key];

  updateElo(bucket, currentA, currentB, winner);

  const ganador = winner === "A" ? currentA : currentB;
  const perdedor = winner === "A" ? currentB : currentA;

  state.votes.push({
    ts: new Date().toISOString(),
    segmento: segmentos[seg],
    contexto: contextos[ctx],
    A: currentA,
    B: currentB,
    ganador,
    perdedor
  });

  saveState();

  renderTop();
  newDuel();
}

// =====================
// 9) Eventos
// =====================
btnA.addEventListener("click", () => vote("A"));
btnB.addEventListener("click", () => vote("B"));

btnNewPair.addEventListener("click", newDuel);

btnShowTop.addEventListener("click", renderTop);

segmentSelect.addEventListener("change", () => {
  renderTop();
  refreshQuestion();
});

contextSelect.addEventListener("change", () => {
  renderTop();
  refreshQuestion();
});

btnReset.addEventListener("click", () => {

  if (!confirm("Esto borrará todos los votos y rankings guardados. ¿Continuar?")) {
    return;
  }

  state = defaultState();

  saveState();

  renderTop();
  newDuel();
});

// =====================
// 10) Exportar CSV
// =====================
btnExport.addEventListener("click", () => {

  if (state.votes.length === 0) {
    alert("Aún no hay votos para exportar.");
    return;
  }

  const headers = [
    "ts",
    "segmento",
    "contexto",
    "A",
    "B",
    "ganador",
    "perdedor"
  ];

  const lines = [headers.join(",")];

  for (const v of state.votes) {

    const row = headers.map(h => {
      const val = String(v[h] ?? "").replaceAll('"', '""');
      return `"${val}"`;
    }).join(",");

    lines.push(row);
  }

  const blob = new Blob(
    [lines.join("\n")],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = "sportstyle_votos.csv";

  document.body.appendChild(a);

  a.click();

  a.remove();

  URL.revokeObjectURL(url);
});

// =====================
// 11) Inicio
// =====================
newDuel();
renderTop();
refreshQuestion();
