const grid = document.getElementById("grid");
const statusEl = document.getElementById("status");
const searchEl = document.getElementById("search");
const filtersEl = document.getElementById("filters");
const clearBtn = document.getElementById("clearFilters");

let allPokemon = [];
const selectedTypes = new Set();


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

function safeSprite(p) {
  return (p.sprites && p.sprites.default) || `assets/img/${pad3(p.id)}.png`;
}

function render(list) {
  grid.innerHTML = list
    .map((p) => {
      const types = renderTypePills(p.types);

      return `
        <a class="card" href="pokemon.html?id=${p.id}">
          <div class="row">
            <div class="name">${p.name ?? "Unknown"}</div>
            <div class="dex">#${pad3(p.id)}</div>
          </div>
          <img src="${safeSprite(p)}" alt="${p.name ?? ""}" loading="lazy" />
          <div class="types">${types || `<span class="type">N/A</span>`}</div>
        </a>
      `;
    })
    .join("");

  statusEl.textContent = `${list.length} Pokémon`;
}

function buildTypeFilters(pokemon) {
  // Collect unique types from data
  const types = new Set();
  for (const p of pokemon) {
    for (const t of p.types || []) types.add(t);
  }

  const sorted = [...types].sort((a, b) => a.localeCompare(b));

  filtersEl.innerHTML = sorted
  .map((t) => {
    const bg = TYPE_COLORS[t] || "#263445";
    const fg = bestTextColor(bg);
    return `
      <button
        class="chip"
        type="button"
        data-type="${t}"
        aria-pressed="false"
      >
        ${t}
      </button>
    `;
  })
  .join("");


  // Click handling (event delegation)
  filtersEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-type]");
    if (!btn) return;

    const type = btn.dataset.type;
    if (selectedTypes.has(type)) {
        selectedTypes.delete(type);
        btn.setAttribute("aria-pressed", "false");
        btn.style.background = "";
        btn.style.color = "";
        btn.style.borderColor = "";
    } else {
        selectedTypes.add(type);
        btn.setAttribute("aria-pressed", "true");

        const bg = TYPE_COLORS[type] || "#263445";
        const fg = bestTextColor(bg);
        btn.style.background = bg;
        btn.style.color = fg;
        btn.style.borderColor = "transparent";
    }


    applyFilters();
  });
}

function applyFilters() {
  const q = searchEl.value.trim().toLowerCase();

  const filtered = allPokemon.filter((p) => {
    // 1) Search filter
    if (q) {
      const name = String(p.name || "").toLowerCase();
      const idPadded = pad3(p.id);
      const idRaw = String(p.id);
      const matchesSearch = name.includes(q) || idPadded.includes(q) || idRaw === q;
      if (!matchesSearch) return false;
    }

    // 2) Type filter (OR across selected types)
    if (selectedTypes.size > 0) {
      const pTypes = p.types || [];
      const matchesType = pTypes.some((t) => selectedTypes.has(t));
      if (!matchesType) return false;
    }

    return true;
  });

  render(filtered);
}

async function init() {
  try {
    statusEl.textContent = "Loading…";
    const res = await fetch("./data/pokemon.json");
    if (!res.ok) throw new Error(`Failed to load JSON: ${res.status}`);
    allPokemon = await res.json();
    allPokemon.sort((a, b) => a.id - b.id);

    buildTypeFilters(allPokemon);
    render(allPokemon);

    searchEl.addEventListener("input", applyFilters);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed to load data. Check console for details.";
  }

  clearBtn.addEventListener("click", () => {
    // clear selected type set
    selectedTypes.clear();

    // reset chip UI
    document.querySelectorAll("#filters .chip[data-type]").forEach((btn) => {
        btn.setAttribute("aria-pressed", "false");
    });

    // clear search (comment out this line if you only want to clear type filters)
    searchEl.value = "";

    applyFilters();
    });

}

init();
