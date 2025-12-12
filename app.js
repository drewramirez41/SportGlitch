let players = [];
let playerByName = new Map();   // normalizedName -> player
let overrides = {};             // optional: { "Player Name": 1234 }
let pickValues = {};            // { "2026 1st": 500, ... }

const DATA_DIR = "Data"; // IMPORTANT: match your repo folder name exactly (case-sensitive)

const el = (id) => document.getElementById(id);

function normName(s) {
  return (s || "").trim().toLowerCase();
}

function splitCommaList(s) {
  return (s || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

// deterministic tiny hash so every player gets a unique “prototype” value
function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

function prototypeValueFor(player) {
  // base by position (feel free to tweak)
  const base = {
    QB: 900,
    RB: 780,
    WR: 760,
    TE: 640,
    K: 120,
    DEF: 200,
    DL: 260,
    LB: 240,
    DB: 220,
  };

  const pos = player?.pos || "WR";
  const b = base[pos] ?? 300;

  // add unique “variation” so players aren’t all the same by position
  const h = hashStr(`${player?.name || ""}|${player?.team || ""}|${player?.id || ""}`);
  const wiggle = (h % 220); // 0..219

  return b + wiggle;
}

async function safeFetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${path}`);
  return res.json();
}

async function loadData() {
  el("loading").style.display = "block";
  el("loading").textContent = "Loading data...";

  // 1) players
  players = await safeFetchJson(`${DATA_DIR}/players.json`);

  // players.json might be either array OR object (Sleeper raw format is often an object)
  if (!Array.isArray(players)) {
    // convert object -> array
    players = Object.values(players);
  }

  // build lookup map by name
  playerByName.clear();
  for (const p of players) {
    if (!p || !p.name) continue;
    const key = normName(p.name);
    if (!playerByName.has(key)) playerByName.set(key, p);
  }

  // 2) overrides (optional)
  try {
    const maybe = await safeFetchJson(`${DATA_DIR}/values.json`);
    // we only treat it as overrides if it’s a plain object map
    if (maybe && !Array.isArray(maybe) && typeof maybe === "object") {
      overrides = maybe;
    } else {
      overrides = {};
    }
  } catch {
    overrides = {};
  }

  // 3) pick values (optional)
  try {
    pickValues = await safeFetchJson(`${DATA_DIR}/pick_values.json`);
  } catch {
    pickValues = {};
  }

  el("loading").textContent = `Loaded ${players.length} players.`;
  setTimeout(() => (el("loading").style.display = "none"), 700);

  // wire typeahead once data is loaded
  setupTypeahead("playersA", "suggestA");
  setupTypeahead("playersB", "suggestB");
}

function getPlayerValueByName(name) {
  const exact = (name || "").trim();

  // if overrides are present, they win
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, exact)) {
    const v = Number(overrides[exact]);
    if (Number.isFinite(v)) return v;
  }

  // fallback: find player and generate a deterministic prototype value
  const p = playerByName.get(normName(exact));
  if (!p) return 0;
  return prototypeValueFor(p);
}

function getPickValue(pickText) {
  const key = (pickText || "").trim();
  const v = pickValues?.[key];
  return Number.isFinite(Number(v)) ? Number(v) : 0;
}

function calcSide(playersText, picksText) {
  const playerNames = splitCommaList(playersText);
  const picks = splitCommaList(picksText);

  let total = 0;
  let details = [];

  for (const n of playerNames) {
    const v = getPlayerValueByName(n);
    total += v;
    details.push(`Player: ${n} -> ${v}`);
  }

  for (const p of picks) {
    const v = getPickValue(p);
    total += v;
    details.push(`Pick: ${p} -> ${v}`);
  }

  return { total, details };
}

function describeTrade(aTotal, bTotal) {
  if (aTotal === 0 && bTotal === 0) return "No recognized players or picks yet. Add some names and picks.";

  const diff = aTotal - bTotal;
  const base = Math.max(aTotal, bTotal, 1);
  const pct = Math.round((Math.abs(diff) / base) * 100);

  if (pct <= 5) return `Pretty fair trade. Difference: ${pct}%.`;
  if (diff > 0) return `Side A wins this trade by about ${pct}%.`;
  return `Side B wins this trade by about ${pct}%.`;
}

function analyze() {
  const a = calcSide(el("playersA").value, el("picksA").value);
  const b = calcSide(el("playersB").value, el("picksB").value);

  const lines = [];
  lines.push(describeTrade(a.total, b.total));
  lines.push("");
  lines.push(`Side A total: ${a.total}`);
  lines.push(...a.details);
  lines.push("");
  lines.push(`Side B total: ${b.total}`);
  lines.push(...b.details);

  el("resultText").textContent = lines.join("\n");
}

/* -------- Typeahead (dropdown suggestions) -------- */

function getLastTokenInfo(inputValue) {
  // we suggest for the last comma-separated token
  const raw = inputValue || "";
  const parts = raw.split(",");
  const last = parts[parts.length - 1];
  const prefix = parts.slice(0, -1).join(","); // without last
  return {
    prefix: prefix.trim(),
    last: (last || "").trim()
  };
}

function setLastTokenValue(inputEl, fullValuePrefix, chosenName) {
  if (fullValuePrefix) {
    inputEl.value = `${fullValuePrefix}, ${chosenName}`;
  } else {
    inputEl.value = chosenName;
  }
}

function setupTypeahead(inputId, suggestId) {
  const inputEl = el(inputId);
  const suggestEl = el(suggestId);

  const allNames = Array.from(playerByName.values()).map(p => p.name);

  function hide() {
    suggestEl.innerHTML = "";
  }

  function render(items, prefix) {
    if (!items.length) return hide();

    const box = document.createElement("div");
    box.className = "sg-suggest-box";

    items.forEach((name) => {
      const p = playerByName.get(normName(name));
      const item = document.createElement("div");
      item.className = "sg-suggest-item";
      const meta = p ? `(${p.pos || ""} ${p.team || ""})` : "";
      item.innerHTML = `${name} <span class="sg-suggest-muted">${meta}</span>`;
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        setLastTokenValue(inputEl, prefix, name);
        hide();
      });
      box.appendChild(item);
    });

    suggestEl.innerHTML = "";
    suggestEl.appendChild(box);
  }

  inputEl.addEventListener("input", () => {
    const info = getLastTokenInfo(inputEl.value);
    const q = info.last.toLowerCase();
    if (q.length < 2) return hide();

    const matches = allNames
      .filter(n => n.toLowerCase().includes(q))
      .slice(0, 10);

    render(matches, info.prefix);
  });

  inputEl.addEventListener("blur", () => {
    // small delay so click can register
    setTimeout(hide, 150);
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadData();

  el("analyzeBtn").addEventListener("click", analyze);

  // run once if fields are prefilled
  analyze();
});
