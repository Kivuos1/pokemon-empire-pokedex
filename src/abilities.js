const searchEl = document.getElementById("abilitySearch");
const listEl = document.getElementById("abilityList");

const titleEl = document.getElementById("abilityTitle");
const descEl = document.getElementById("abilityDesc");
const monsEl = document.getElementById("abilityMons");
const monsTitleEl = document.getElementById("abilityMonsTitle");


let abilitiesByKey = {};
let pokemonList = [];
let selectedKey = null;

function pad3(n) {
  return String(n).padStart(3, "0");
}

function spriteFor(p) {
  const s = p.sprites || {};
  return s.default || `assets/img/${pad3(p.id)}.png`;
}

function getAbilityFromUrl() {
  const sp = new URLSearchParams(window.location.search);
  return sp.get("ability");
}

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function setSelected(key) {
  selectedKey = key;
  document.getElementById("abilityTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });

  // update URL (nice UX)
  const sp = new URLSearchParams(window.location.search);
  sp.set("ability", key);
  history.replaceState({}, "", `${location.pathname}?${sp.toString()}`);

  renderList();
  renderDetails();
}

function renderList() {
  const q = searchEl.value.trim().toLowerCase();
  const keys = Object.keys(abilitiesByKey).sort((a, b) => a.localeCompare(b));

  const filtered = q
    ? keys.filter((k) => {
        const a = abilitiesByKey[k];
        return (
          k.toLowerCase().includes(q) ||
          String(a.name || "").toLowerCase().includes(q) ||
          String(a.desc || "").toLowerCase().includes(q)
        );
      })
    : keys;

  listEl.innerHTML = filtered
    .map((k) => {
      const a = abilitiesByKey[k];
      const active = k === selectedKey ? "active" : "";
      return `
        <div class="listItem ${active}" data-key="${k}">
          <div class="listKey">${a.name || k}</div>
          <div class="listDesc">${a.desc || "—"}</div>
        </div>
      `;
    })
    .join("");

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="muted">No abilities found.</div>`;
  }
}

function pokemonHasAbility(p, key) {
  const list = Array.isArray(p.abilities) ? p.abilities : [];
  if (list.includes(key)) return true;
  if (p.hiddenAbility === key) return true;
  return false;
}

function renderDetails() {
  if (!selectedKey) {
    titleEl.textContent = "Select an ability";
    descEl.textContent = "";
    monsEl.innerHTML = `<div class="muted">—</div>`;
    monsTitleEl.textContent = "Pokémon with this ability";
    return;
  }

  const a = abilitiesByKey[selectedKey];
  titleEl.textContent = a?.name || selectedKey;
  descEl.textContent = a?.desc || "N/A";

  const mons = pokemonList
    .filter((p) => pokemonHasAbility(p, selectedKey))
    .sort((x, y) => x.id - y.id);

  monsTitleEl.textContent = `Pokémon with this ability (${mons.length})`;

  if (mons.length === 0) {
    monsEl.innerHTML = `<div class="muted">No Pokémon found for this ability.</div>`;
    return;
  }

  // Reuse your card style but simpler
  monsEl.innerHTML = mons
    .map((p) => {
        
      const isHidden = p.hiddenAbility === selectedKey;

      return `
        <a class="card" href="pokemon.html?id=${p.id}">
          <div class="row">
            <div class="name">${p.name ?? "Unknown"}</div>
            <div style="display:flex; gap:8px; align-items:center;">
                ${isHidden ? `<span class="badge hidden">Hidden</span>` : ``}
                <div class="dex">#${pad3(p.id)}</div>
            </div>
          </div>

          <img src="${spriteFor(p)}" alt="${p.name ?? ""}" loading="lazy" />
          <div class="types">${(p.types || []).map((t) => `<span class="type">${t}</span>`).join("")}</div>
        </a>
      `;
    })
    .join("");
}

async function init() {
  try {
    [abilitiesByKey, pokemonList] = await Promise.all([
      loadJson("./data/abilities.json"),
      loadJson("./data/pokemon.json"),
    ]);

    // initial selection from URL (if any)
    const fromUrl = getAbilityFromUrl();
    if (fromUrl && abilitiesByKey[fromUrl]) {
        setSelected(fromUrl);
    } else {
        renderList();
        renderDetails();
    }

    searchEl.addEventListener("input", renderList);

    listEl.addEventListener("click", (e) => {
      const item = e.target.closest("[data-key]");
      if (!item) return;
      setSelected(item.dataset.key);
    });
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<div class="muted">Failed to load abilities.</div>`;
  }
}

init();
