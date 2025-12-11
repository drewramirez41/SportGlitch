let playerValues = {};
let pickValues = {};

// Load players + values + picks on startup
async function loadData() {
  try {
    // 1) Load all players from the Data/players.json file (from GitHub on the live site)
    const playersRes = await fetch("Data/players.json");
    if (!playersRes.ok) {
      throw new Error("Failed to load players.json: " + playersRes.status);
    }
    const players = await playersRes.json();

    // 2) Try to load pick values (optional)
    try {
      const picksRes = await fetch("Data/pick_values.json");
      if (picksRes.ok) {
        pickValues = await picksRes.json();
      } else {
        pickValues = {};
      }
    } catch (e) {
      console.warn("No pick_values.json found or invalid:", e);
      pickValues = {};
    }

    // 3) Build per-player values: position base + tiny tweak from ID so each player is unique
    const baseByPos = {
      QB: 900,
      RB: 800,
      WR: 780,
      TE: 700,
      K: 300,
      DEF: 300,
    };
    const defaultBase = 400;

    playerValues = {};

    players.forEach((p) => {
      if (!p || !p.name) return;

      const pos = p.pos || "";
      const base = baseByPos[pos] ?? defaultBase;

      const idNum = parseInt(p.player_id || p.id || "0", 10) || 0;
      const noise = (idNum % 41) - 20;

      const value = base + noise;

      const key = typeof normalizeName === "function"
        ? normalizeName(p.name)
        : p.name.trim();

      playerValues[key] = value;
    });

    console.log("Loaded values for", Object.keys(playerValues).length, "players");
  } catch (err) {
    console.error("Error loading data files:", err);
  }
}

function parseList(value) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function sumSide(players, picks) {
  let total = 0;
  const details = [];

  players.forEach((name) => {
    const key = name.trim();
    const v = playerValues[key] ?? 0;
    details.push(`Player: ${key} -> ${v}`);
    total += v;
  });

  picks.forEach((p) => {
    const key = p.trim();
    const v = pickValues[key] ?? 0;
    details.push(`Pick: ${key} -> ${v}`);
    total += v;
  });

  return { total, details };
}

function describeTrade(aTotal, bTotal) {
  if (aTotal === 0 && bTotal === 0) {
    return "No recognized players or picks yet. Add some names and picks.";
  }

  const diff = Math.abs(aTotal - bTotal);
  const bigger = Math.max(aTotal, bTotal);
  const pct = bigger === 0 ? 0 : Math.round((diff / bigger) * 100);

  if (pct <= 5) {
    return `Pretty fair trade. Difference: ${pct}%.`;
  }
  if (aTotal > bTotal) {
    return `Side A wins this trade by about ${pct}%.`;
  }
  return `Side B wins this trade by about ${pct}%.`;
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();

  const btn = document.getElementById("analyzeBtn");
  const resultDiv = document.getElementById("result");
  const summaryP = document.getElementById("resultSummary");
  const detailsPre = document.getElementById("resultDetails");

  btn.addEventListener("click", () => {
    const sideAPlayers = parseList(document.getElementById("sideAPlayers").value);
    const sideAPicks = parseList(document.getElementById("sideAPicks").value);

    const sideBPlayers = parseList(document.getElementById("sideBPlayers").value);
    const sideBPicks = parseList(document.getElementById("sideBPicks").value);

    const a = sumSide(sideAPlayers, sideAPicks);
    const b = sumSide(sideBPlayers, sideBPicks);

    const summary = describeTrade(a.total, b.total);
    const detailsText =
      `Side A total: ${a.total}\n` +
      a.details.join("\n") +
      `\n\nSide B total: ${b.total}\n` +
      b.details.join("\n");

    summaryP.textContent = summary;
    detailsPre.textContent = detailsText;
    resultDiv.classList.remove("hidden");
  });
});

