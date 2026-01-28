const statusEl = document.getElementById("status");
const heroEl = document.getElementById("hero");
const titleEl = document.getElementById("title");
const dexEl = document.getElementById("dex");
const typesEl = document.getElementById("types");
const spriteEl = document.getElementById("sprite");

const shinyToggle = document.getElementById("shinyToggle");
const formSelect = document.getElementById("formSelect");

const statsEl = document.getElementById("stats");

const abilitiesPanel = document.getElementById("abilitiesPanel");
const abilitiesEl = document.getElementById("abilities");

const movesPanel = document.getElementById("movesPanel");
const movesEl = document.getElementById("moves");

const tmPanel = document.getElementById("tmPanel");
const tmsEl = document.getElementById("tms");

const evoPanel = document.getElementById("evoPanel");
const evolutionsEl = document.getElementById("evolutions");

const eggMovesPanel = document.getElementById("eggMovesPanel");
const eggMovesEl = document.getElementById("eggMoves");



const TYPE_COLORS = {
  NORMAL: "#A8A878",
  FIRE: "#F08030",
  WATER: "#6890F0",
  ELECTRIC: "#F8D030",
  GRASS: "#78C850",
  ICE: "#98D8D8",
  FIGHTING: "#C03028",
  POISON: "#A040A0",
  GROUND: "#E0C068",
  FLYING: "#A890F0",
  PSYCHIC: "#F85888",
  BUG: "#A8B820",
  ROCK: "#B8A038",
  GHOST: "#705898",
  DRAGON: "#7038F8",
  DARK: "#705848",
  STEEL: "#B8B8D0",
  FAIRY: "#EE99AC"
};

function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255
  };
}

// Simple perceived brightness
function bestTextColor(bgHex) {
  if (!bgHex) return "#e8eef6";
  const { r, g, b } = hexToRgb(bgHex);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#111" : "#fff";
}

function renderTypePills(types) {
  const safe = Array.isArray(types) ? types : [];
  if (safe.length === 0) return `<span class="type">N/A</span>`;

  return safe
    .map((t) => {
      const bg = TYPE_COLORS[t] || "#263445";
      const fg = bestTextColor(bg);
      return `<span class="type" style="background:${bg};color:${fg};border-color:transparent;">${t}</span>`;
    })
    .join("");
}



function pad3(n) {
  return String(n).padStart(3, "0");
}

function getIdFromUrl() {
  const sp = new URLSearchParams(window.location.search);
  const raw = sp.get("id");
  const id = raw ? Number(raw) : NaN;
  return Number.isFinite(id) ? id : null;
}

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function renderTypes(types) {
  typesEl.innerHTML = renderTypePills(types);
}


function renderStats(baseStats) {
  if (!baseStats) {
    statsEl.innerHTML = `<div class="muted">N/A</div>`;
    return;
  }

  const rows = [
    ["HP", baseStats.hp],
    ["ATK", baseStats.atk],
    ["DEF", baseStats.def],
    ["Sp. ATK", baseStats.spAtk],
    ["Sp. DEF", baseStats.spDef],
    ["SPEED", baseStats.speed],
  ];

  const total =
  (typeof baseStats.hp === "number" ? baseStats.hp : 0) +
  (typeof baseStats.atk === "number" ? baseStats.atk : 0) +
  (typeof baseStats.def === "number" ? baseStats.def : 0) +
  (typeof baseStats.spAtk === "number" ? baseStats.spAtk : 0) +
  (typeof baseStats.spDef === "number" ? baseStats.spDef : 0) +
  (typeof baseStats.speed === "number" ? baseStats.speed : 0);

  // scale bars roughly to 200 max (fine for UI)
  const max = 200;

  statsEl.innerHTML =
  rows
    .map(([label, val]) => {
      const v = typeof val === "number" ? val : 0;
      const pct = Math.max(0, Math.min(100, (v / max) * 100));
      return `
        <div class="statRow">
          <div class="muted">${label}</div>
          <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
          <div>${val ?? "N/A"}</div>
        </div>
      `;
    })
    .join("") +
  `
    <div class="statRow">
      <div class="muted">TOTAL</div>
      <div></div>
      <div>${total}</div>
    </div>
  `;
}

function setupSpriteControls(pokemon) {
  const sprites = pokemon.sprites || {};
  const forms = Array.isArray(sprites.forms) ? sprites.forms : [];

  // Build form select
  formSelect.innerHTML = `<option value="default">Default</option>` + forms
    .map((p, idx) => `<option value="form:${idx}">Form ${idx + 1}</option>`)
    .join("");

  formSelect.disabled = forms.length === 0;

  function currentSpritePath() {
    const isShiny = shinyToggle.checked;

    // Form selected?
    const val = formSelect.value;
    if (val.startsWith("form:")) {
      const idx = Number(val.split(":")[1]);
      const formPath = forms[idx];
      if (formPath) return formPath;
    }

    if (isShiny && sprites.shiny) return sprites.shiny;
    if (sprites.default) return sprites.default;

    // fallback if data missing
    return `assets/img/${pad3(pokemon.id)}.png`;
  }

  function applySprite() {
    const p = currentSpritePath();
    spriteEl.src = p;
    spriteEl.alt = pokemon.name ?? "";
  }

  shinyToggle.addEventListener("change", applySprite);
  formSelect.addEventListener("change", applySprite);
  applySprite();
}

function renderAbilities(pokemon, abilitiesByKey) {
  const list = [];
  for (const key of pokemon.abilities || []) {
    list.push({ key, kind: "Ability" });
  }
  if (pokemon.hiddenAbility) {
    list.push({ key: pokemon.hiddenAbility, kind: "Hidden Ability" });
  }

  if (list.length === 0) {
    abilitiesPanel.hidden = false;
    abilitiesEl.innerHTML = `<div class="muted">N/A</div>`;
    return;
  }

  abilitiesPanel.hidden = false;
  abilitiesEl.innerHTML = `
    <div class="kv">
      ${list
        .map(({ key, kind }) => {
          const a = abilitiesByKey?.[key];
          const name = a?.name || key;
          const href = `abilities.html?ability=${encodeURIComponent(key)}`;
          const desc = a?.desc || "N/A";
          return `
            <div class="kvRow">
              <div class="kvKey">
                <a href="${href}" style="color:inherit;">${name}</a>
                <span class="muted">(${kind})</span>
              </div>
              <div class="kvVal">${desc}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function moveLabel(moveKey, movesByKey) {
  const m = movesByKey?.[moveKey];
  if (!m) return { name: moveKey, meta: "N/A" };

  const bits = [];
  if (m.type) bits.push(m.type);
  if (m.category) bits.push(m.category);
  const pa = [];
  if (typeof m.power === "number") pa.push(`Pow ${m.power}`);
  if (typeof m.accuracy === "number") pa.push(`Acc ${m.accuracy}`);
  if (typeof m.pp === "number") pa.push(`PP ${m.pp}`);

  const meta = [bits.join(" • "), pa.join(" • ")].filter(Boolean).join(" — ");
  return { name: m.name || moveKey, meta: meta || "N/A", desc: m.desc || null };
}

function renderLevelUpMoves(pokemon, movesByKey) {
  const moves = Array.isArray(pokemon.moves) ? pokemon.moves.slice() : [];
  if (moves.length === 0) {
    movesPanel.hidden = false;
    movesEl.innerHTML = `<div class="muted">N/A</div>`;
    return;
  }

  moves.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));

  movesPanel.hidden = false;
  movesEl.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th style="width:70px;">Level</th>
          <th>Move</th>
          <th>Info</th>
        </tr>
      </thead>
      <tbody>
        ${moves
          .map((x) => {
            const key = x.move;
            const lvl = x.level ?? "—";
            const info = moveLabel(key, movesByKey);
            return `
              <tr>
                <td>${lvl}</td>
                <td>${info.name}</td>
                <td class="muted">${info.meta}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function renderEggMoves(pokemon, movesByKey) {
  const list = Array.isArray(pokemon.eggMoves) ? pokemon.eggMoves : [];

  eggMovesPanel.hidden = false;

  if (list.length === 0) {
    eggMovesEl.innerHTML = `<div class="muted">N/A</div>`;
    return;
  }

  const sorted = [...list].sort((a, b) => a.localeCompare(b));

  eggMovesEl.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Move</th>
          <th>Info</th>
        </tr>
      </thead>
      <tbody>
        ${sorted
          .map((key) => {
            const info = moveLabel(key, movesByKey);
            return `
              <tr>
                <td>${info.name}</td>
                <td class="muted">${info.meta}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}



function renderTMs(pokemon, tmByPokemon, movesByKey) {
  const internal = pokemon.internalName;
  const tmMoves = (internal && tmByPokemon?.[internal]) ? tmByPokemon[internal] : [];

  if (!tmMoves || tmMoves.length === 0) {
    tmPanel.hidden = false;
    tmsEl.innerHTML = `<div class="muted">N/A</div>`;
    return;
  }

  const sorted = [...tmMoves].sort((a, b) => a.localeCompare(b));

  tmPanel.hidden = false;
  tmsEl.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Move</th>
          <th>Info</th>
        </tr>
      </thead>
      <tbody>
        ${sorted
          .map((key) => {
            const info = moveLabel(key, movesByKey);
            return `
              <tr>
                <td>${info.name}</td>
                <td class="muted">${info.meta}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function formatEvoMethod(method) {
  return method ? String(method) : "Unknown";
}

function formatEvoParam(method, param) {
  if (param == null || param === "") return "?";

  const m = String(method || "").toLowerCase();
  if (m === "level") return String(param);
  if (m === "item") return String(param);       // later we can prettify item names
  if (m === "trade") return String(param);
  if (m === "happiness") return String(param);

  return String(param);
}


function normalizeEvolutions(pokemon) {
  // Already normalized array
  if (Array.isArray(pokemon.evolutions)) {
    return pokemon.evolutions.map((e) => ({
      to: e.to,
      method: e.method,
      param: e.param ?? e.parameter ?? null
    }));
  }

  // Fallback: raw string if it exists (optional)
  const raw = pokemon.Evolutions || pokemon.evolutionsRaw || pokemon.evolutionRaw || "";
  if (!raw || typeof raw !== "string") return [];

  const parts = raw.split(",").map((x) => x.trim()).filter(Boolean);
  const out = [];
  for (let i = 0; i + 2 < parts.length; i += 3) {
    out.push({ to: parts[i], method: parts[i + 1], param: parts[i + 2] });
  }
  return out;
}


function findByInternalName(allPokemon, internalName) {
  return allPokemon.find((p) => p.internalName === internalName);
}

function spriteFor(p) {
  const s = p.sprites || {};
  return s.default || `assets/img/${pad3(p.id)}.png`;
}

function renderEvolutions(currentPokemon, allPokemon) {
  const evos = normalizeEvolutions(currentPokemon);

  if (!evos || evos.length === 0) {
    evoPanel.hidden = false;
    evolutionsEl.innerHTML = `<div class="muted">N/A</div>`;
    return;
  }

  evoPanel.hidden = false;

  evolutionsEl.innerHTML = evos
    .map((evo) => {
      const target = findByInternalName(allPokemon, evo.to);

      const toName = target?.name || evo.to;
      const toId = target?.id;
      const toHref = toId ? `pokemon.html?id=${toId}` : "#";
      const toSprite = target ? spriteFor(target) : "";

      const methodText = formatEvoMethod(evo.method);
      const paramText = formatEvoParam(evo.method, evo.param);

      return `
        <div class="evoRow">
          <a class="evoCard" href="pokemon.html?id=${currentPokemon.id}">
            <img src="${spriteFor(currentPokemon)}" alt="${currentPokemon.name ?? ""}" />
            <div>
              <div class="kvKey">${currentPokemon.name ?? "Unknown"}</div>
              <div class="muted">#${pad3(currentPokemon.id)}</div>
            </div>
          </a>

          <div class="evoArrow">
            <div class="muted" style="font-size:12px;">${methodText}</div>
            <div style="font-size:18px;">→</div>
            <div class="badge">${paramText}</div>
          </div>

          <a class="evoCard" href="${toHref}">
            ${toSprite ? `<img src="${toSprite}" alt="${toName}" />` : `<div style="width:64px;height:64px;"></div>`}
            <div>
              <div class="kvKey">${toName}</div>
              <div class="muted">${toId ? `#${pad3(toId)}` : "Not in dataset"}</div>
            </div>
          </a>
        </div>
      `;
    })
    .join("");
}



async function init() {
  const id = getIdFromUrl();
  if (!id) {
    statusEl.textContent = "Missing or invalid ?id= in URL.";
    return;
  }

  try {
    statusEl.textContent = "Loading…";

    const [pokemonList, movesByKey, abilitiesByKey, tmByPokemon] = await Promise.all([
      loadJson("./data/pokemon.json"),
      loadJson("./data/moves.json"),
      loadJson("./data/abilities.json"),
      loadJson("./data/tm.json"),
    ]);

    const pokemon = pokemonList.find((p) => p.id === id);
    if (!pokemon) {
      statusEl.textContent = `Pokémon with id ${id} not found.`;
      return;
    }

    // Header / hero
    titleEl.textContent = pokemon.name ?? "Unknown";
    dexEl.textContent = `#${pad3(pokemon.id)}`;
    renderTypes(pokemon.types || []);
    renderStats(pokemon.baseStats);

    setupSpriteControls(pokemon);

    // Panels
    renderAbilities(pokemon, abilitiesByKey);
    renderLevelUpMoves(pokemon, movesByKey);
    renderEggMoves(pokemon, movesByKey);
    renderTMs(pokemon, tmByPokemon, movesByKey);
    renderEvolutions(pokemon, pokemonList);


    statusEl.hidden = true;
    heroEl.hidden = false;
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed to load data. Check console for details.";
  }
}

init();
