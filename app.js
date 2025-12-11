let playerValues = {};
let pickValues = {};

// Load players + values + picks on startup
async function loadData() {
  try {
    // Load full player list from Sleeper snapshot
    const playersRes = await fetch("Data/players.json");
    if (!playersRes.ok) {
      throw new Error("Failed to load players.json: " + playersRes.status);
    }
    const players = await playersRes.json(); // array of { id, name, pos, team }

    // Load optional manual overrides (can be empty or small)
    let overrides = {};
    try {
      const overridesRes = await fetch("Data/values.json");
      if (overridesRes.ok) {
        overrides = await overridesRes.json(); // object { "Player Name": number }
      }
    } catch (e) {
      console.warn("No overrides values.json found or invalid:", e);
    }

    // Load pick values if available
    try {
      const picksRes = await fetch("Data/pick_values.json");
      if (picksRes.ok) {
        pickValues = await picksRes.json(); // e.g. { "2026 1st": 500, ... }
      }
    } catch (e) {
      console.warn("No pick_values.json found or invalid:", e);
      pickValues = {};
    }

    // Baseline values by position (rough placeholders to get functionality flowing)
    const baseByPos = {
      QB: 700,
      RB: 650,
      WR: 650,
      TE: 550,
      K: 250,
      DEF: 300,
      DL: 275,
      LB: 275,
      DB: 250,
      CB: 250,
      S: 250,
      OT: 150,
      OG: 150,
      C: 150
    };

    const defaultValue = 100; // weird positions, long snappers, etc.

    playerValues = {};

    // Build baseline map from players.json
    players.forEach((p) => {
      if (!p || !p.name) return;
      const pos = p.pos || "";
      const base = baseByPos[pos] ?? defaultValue;
      playerValues[p.name] = base;
    });

    // Apply manual overrides on top
    Object.entries(overrides).forEach(([name, val]) => {
      playerValues[name] = val;
    });

    console.log("Loaded player values for", Object.keys(playerValues).length, "players");
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
