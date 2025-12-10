let playerValues = {};
let pickValues = {};

// Load values + picks on startup
async function loadData() {
  try {
    const valuesRes = await fetch("data/values.json");
    const picksRes = await fetch("data/pick_values.json");

    playerValues = await valuesRes.json();
    pickValues = await picksRes.json();
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
    const v = playerValues[name] ?? 0;
    details.push(`Player: ${name} -> ${v}`);
    total += v;
  });

  picks.forEach((p) => {
    const v = pickValues[p] ?? 0;
    details.push(`Pick: ${p} -> ${v}`);
    total += v;
  });

  return { total, details };
}

function describeTrade(aTotal, bTotal) {
  if (aTotal === 0 && bTotal === 0) {
    return "No recognized players or picks yet. Add some names and picks.";
  }

  const diff = aTotal - bTotal;
  const bigger = Math.abs(diff);
  const base = Math.max(aTotal, bTotal, 1); // avoid divide by 0
  const pct = ((bigger / base) * 100).toFixed(1);

  if (Math.abs(diff) < base * 0.05) {
    return `Pretty fair trade. Difference: ${pct}%`;
  }

  if (diff > 0) {
    return `Side A wins this trade by about ${pct}%.`;
  } else {
    return `Side B wins this trade by about ${pct}%.`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();

  const btn = document.getElementById("analyzeBtn");
  const resultDiv = document.getElementById("result");
  const summaryP = document.getElementById("resultSummary");
  const detailsPre = document.getElementById("resultDetails");

  btn.addEventListener("click", () => {
    const sideAPlayers = parseList(
      document.getElementById("sideAPlayers").value
    );
    const sideAPicks = parseList(document.getElementById("sideAPicks").value);

    const sideBPlayers = parseList(
      document.getElementById("sideBPlayers").value
    );
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
