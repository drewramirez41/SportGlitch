let playerValues = {};
let pickValues = {};

// Load players + values + picks on startup
async function loadData() {
  try {
    // IMPORTANT: capital D here to match your "Data" folder
    const [playersRes, overridesRes, picksRes] = await Promise.all([
      fetch("Data/players.json"),
      fetch("Data/values.json"),
      fetch("Data/pick_values.json"),
    ]);

    const players = await playersRes.json();      // big Sleeper list (array)
    const overrides = await overridesRes.json();  // your custom values (object)
    pickValues = await picksRes.json();           // pick values (object)

    // Baseline values by position (just to get functionality rolling)
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
    };

    const defaultValue = 100; // weird positions, long snappers etc.

    playerValues = {};

    // 1) Give every Sleeper player a baseline value
    players.forEach((p) => {
      const base = baseByPos[p.pos] ?? defaultValue;
      playerValues[p.name] = base;
    });

    // 2) Override with your custom values (JJ, Breece, Lamb, Wilson)
    Object.entries(overrides).forEach(([name, val]) => {
      playerValues[name] = val;
    });

    console.log("Loaded players with values:", Object.keys(playerValues).length);
  } catch (err) {
    console.error("Error loading data files:", err);
  }
}
