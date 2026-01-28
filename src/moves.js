const searchEl = document.getElementById("moveSearch");
const listEl = document.getElementById("moveList");

const titleEl = document.getElementById("moveTitle");
const metaEl = document.getElementById("moveMeta");
const descEl = document.getElementById("moveDesc");
const monsEl = document.getElementById("moveMons");
const monsTitleEl = document.getElementById("moveMonsTitle");

const typeFilterEl = document.getElementById("typeFilter");
const catFilterEl = document.getElementById("catFilter");
const clearFiltersBtn = document.getElementById("clearMoveFilters");

let movesByKey = {};
let pokemonList = [];
let selectedKey = null;
let tmByPokemon = {};
let tmLearnersByMove = {};

function pad3(n) {
  return String(n).padStart(3, "0");
}

function spriteFor(p) {
  const s = p.sprites || {};
  return s.default || `assets/img/${pad3(p.id)}.png`;
}

function getMoveFromUrl() {
  return new URLSearchParams(window.location.search).get("move");
}

async function loadJson(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(path);
  return r.json();
}

function populateTypeFilter() {
  const types = Array.from(
    new Set(Object.values(movesByKey).map((m) => m.type).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  typeFilterEl.innerHTML =
    `<option value="">All Types</option>` +
    types.map((t) => `<option value="${t}">${t}</option>`).join("");
}


function setSelected(key) {
  selectedKey = key;
  history.replaceState({}, "", `?move=${encodeURIComponent(key)}`);
  renderList();
  renderDetails();
}

function renderList() {
  const q = searchEl.value.trim().toLowerCase();
  const typeVal = typeFilterEl.value;
  const catVal = catFilterEl.value;


  const keys = Object.keys(movesByKey).sort((a, b) =>
    movesByKey[a].name.localeCompare(movesByKey[b].name)
  );

  const filtered = keys.filter((k) => {
    const m = movesByKey[k];

    if (typeVal && m.type !== typeVal) return false;
    if (catVal && m.category !== catVal) return false;

    if (!q) return true;

    return (
        k.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.desc.toLowerCase().includes(q)
    );
    });


  listEl.innerHTML = filtered
    .map((k) => {
      const m = movesByKey[k];
      return `
        <div class="listItem ${k === selectedKey ? "active" : ""}" data-key="${k}">
          <div class="listKey">${m.name}</div>
          <div class="listDesc">${m.type} • ${m.category}</div>
        </div>
      `;
    })
    .join("");

  if (!filtered.length) {
    listEl.innerHTML = `<div class="muted">No moves found.</div>`;
  }
}

function pokemonLearnsMove(p, key) {
  const arr = p.moves;
  if (!Array.isArray(arr)) return false;
  return arr.some((x) => x?.move === key);
}


function renderDetails() {
  if (!selectedKey) {
    titleEl.textContent = "Select a move";
    metaEl.textContent = "";
    descEl.textContent = "";
    monsTitleEl.textContent = "Pokémon that learn this move";
    monsEl.innerHTML = `<div class="muted">—</div>`;
    return;
  }

  const m = movesByKey[selectedKey];
  titleEl.textContent = m.name;
  metaEl.textContent = `${m.type} • ${m.category} — Pow ${m.power} • Acc ${m.accuracy} • PP ${m.pp}`;
  descEl.textContent = m.desc;

  const mons = pokemonList
  .map((p) => {
    const levelEntry = Array.isArray(p.moves)
      ? p.moves.find((x) => x?.move === selectedKey)
      : null;

    const tmLearners = tmLearnersByMove?.[selectedKey];
    const viaTm = Array.isArray(tmLearners) && tmLearners.includes(p.internalName);

    if (!levelEntry && !viaTm) return null;

    const learn = [
        levelEntry ? `Lv ${levelEntry.level}` : null,
        viaTm ? "TM" : null,
    ].filter(Boolean).join(" + ");

    return {
      p,
      learn,
      priority: levelEntry ? 0 : 1,
    };
  })
  .filter(Boolean)
  .sort((a, b) => (a.priority - b.priority) || (a.p.id - b.p.id));



  monsTitleEl.textContent = `Pokémon that learn this move (${mons.length})`;

  if (!mons.length) {
    monsEl.innerHTML = `<div class="muted">No Pokémon found.</div>`;
    return;
  }

  monsEl.innerHTML = mons
  .map(({ p, learn }) => `
    <a class="card" href="pokemon.html?id=${p.id}">
      <div class="row">
        <div class="name">${p.name}</div>

        <div style="display:flex; gap:8px; align-items:center;">
          <span class="badge">${learn}</span>
          <div class="dex">#${pad3(p.id)}</div>
        </div>
      </div>

      <img src="${spriteFor(p)}" alt="${p.name}" />
      <div class="types">
        ${(p.types || []).map((t) => `<span class="type">${t}</span>`).join("")}
      </div>
    </a>
  `)
  .join("");


}

async function init() {
  try {
    [movesByKey, pokemonList, tmByPokemon] = await Promise.all([
        loadJson("./data/moves.json"),
        loadJson("./data/pokemon.json"),
        loadJson("./data/tm.json"),
    ]);

    tmLearnersByMove = {};
    for (const [internalName, moveKeys] of Object.entries(tmByPokemon || {})) {
        if (!Array.isArray(moveKeys)) continue;
        for (const mk of moveKeys) {
            if (!tmLearnersByMove[mk]) tmLearnersByMove[mk] = [];
            tmLearnersByMove[mk].push(internalName);
        }
    }   

    populateTypeFilter();

    const fromUrl = getMoveFromUrl();
    if (fromUrl && movesByKey[fromUrl]) setSelected(fromUrl);
    else {
        renderList();
        renderDetails();
    }

    searchEl.addEventListener("input", renderList);
    typeFilterEl.addEventListener("change", renderList);   
    catFilterEl.addEventListener("change", renderList); 

    clearFiltersBtn.addEventListener("click", () => {      // <-- add
        searchEl.value = "";
        typeFilterEl.value = "";
        catFilterEl.value = "";
        renderList();
    });

    listEl.addEventListener("click", (e) => {
      const item = e.target.closest("[data-key]");
      if (item) setSelected(item.dataset.key);
    });
  } catch (e) {
    listEl.innerHTML = `<div class="muted">Failed to load moves.</div>`;
    console.error(e);
  }
}

init();
