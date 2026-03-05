import { heroDatabase } from "./heroes.js";
import { enemyDatabase } from "./enemies.js";
import { lightconeDatabase } from "./lightcones.js";
import { playerSaveData } from "./saveData.js";
import { playSFX } from "./audio.js";
import { startCustomBattle } from "./combat.js";

// --- DOM ELEMENTS (MENUS) ---
const mainMenuScreen = document.getElementById("main-menu-screen");
const selectionScreen = document.getElementById("selection-screen");
const battleScreen = document.getElementById("battle-screen");
const rosterContainer = document.getElementById("roster-container");
const btnCustomBattle = document.getElementById("btn-custom-battle");
const selectionControls = document.getElementById("selection-controls");
const btnStartBattle = document.getElementById("btn-start-battle");
const loadoutScreen = document.getElementById("loadout-screen");
const loadoutContainer = document.getElementById("loadout-container");
const btnLoadout = document.getElementById("btn-loadout");
const btnLoadoutBack = document.getElementById("btn-loadout-back");

// --- MENU STATE ---
let heroSelection = {};
let enemySelection = {};
let heroSelectionQueue = [];
let enemySelectionQueue = [];

// --- EVENT LISTENERS ---
if (btnCustomBattle) {
  btnCustomBattle.addEventListener("click", () => {
    enterFullScreen(); // ✨ TRIGGER FULLSCREEN
    startCustomHeroSelect();
  });
}

if (btnLoadout) btnLoadout.addEventListener("click", showLoadoutScreen);
if (btnLoadoutBack) btnLoadoutBack.addEventListener("click", showMainMenu);

if (btnStartBattle) {
  btnStartBattle.addEventListener("click", () => {
    enterFullScreen(); // ✨ TRIGGER FULLSCREEN (Just in case they exited!)
    selectionScreen.style.display = "none";
    startCustomBattle(heroSelectionQueue, enemySelectionQueue);
  });
}

// --- MENU FUNCTIONS ---
export function showMainMenu() {
  mainMenuScreen.style.display = "block";
  selectionScreen.style.display = "none";
  battleScreen.style.display = "none";
  if (loadoutScreen) loadoutScreen.style.display = "none";
  if (selectionControls) selectionControls.style.display = "none";
}

// --- UTILITY FUNCTIONS ---
function enterFullScreen() {
  const doc = document.documentElement;
  if (doc.requestFullscreen) {
    doc
      .requestFullscreen()
      .catch((err) => console.warn("Fullscreen denied:", err));
  } else if (doc.webkitRequestFullscreen) {
    /* Safari */
    doc.webkitRequestFullscreen();
  } else if (doc.msRequestFullscreen) {
    /* IE11 */
    doc.msRequestFullscreen();
  }
}

//
function animateValue(obj, start, end, duration, prefix = "") {
  let startTimestamp = null;
  obj.dataset.target = end;

  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (end - start) * ease);

    if (parseInt(obj.dataset.target) !== end) return;

    obj.innerHTML = current > 0 ? `${prefix}${current}` : "";

    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.innerHTML = end > 0 ? `${prefix}${end}` : "";
    }
  };
  window.requestAnimationFrame(step);
}

function updateLoadoutStats(heroId) {
  const hero = heroDatabase[heroId];
  const save = playerSaveData.heroes[heroId];
  const lcId = save.equippedLightCone;
  const lc = lcId ? lightconeDatabase[lcId] : null;

  const hpObj = document.getElementById(`bonus-hp-${heroId}`);
  const atkObj = document.getElementById(`bonus-atk-${heroId}`);
  const defObj = document.getElementById(`bonus-def-${heroId}`);

  const baseHpObj = document.getElementById(`base-hp-${heroId}`);
  const baseAtkObj = document.getElementById(`base-atk-${heroId}`);
  const baseDefObj = document.getElementById(`base-def-${heroId}`);

  if (!hpObj) return;

  const heroLvl = save.level || 1;
  const lcLvl = save.lcLevel || 1;
  const si = save.lcSuperimposition || 1;

  // ✨ FIXED: Uses the stats dictionary, completely fixing the disappearing UI bug!
  if (baseHpObj) baseHpObj.innerText = hero.stats[heroLvl].hp;
  if (baseAtkObj) baseAtkObj.innerText = hero.stats[heroLvl].atk;
  if (baseDefObj) baseDefObj.innerText = hero.stats[heroLvl].def;

  const bonusHp = lc ? lc.stats[lcLvl].hp : 0;
  const bonusAtk = lc ? lc.stats[lcLvl].atk : 0;
  const bonusDef = lc ? lc.stats[lcLvl].def : 0;

  const curHp = parseInt(hpObj.innerText.replace("+", "")) || 0;
  const curAtk = parseInt(atkObj.innerText.replace("+", "")) || 0;
  const curDef = parseInt(defObj.innerText.replace("+", "")) || 0;

  animateValue(hpObj, curHp, bonusHp, 400, "+");
  animateValue(atkObj, curAtk, bonusAtk, 400, "+");
  animateValue(defObj, curDef, bonusDef, 400, "+");

  [hpObj, atkObj, defObj].forEach((el) => {
    el.classList.remove("flash-stat");
    void el.offsetWidth;
    if (lc) el.classList.add("flash-stat");
  });

  const imgBox = document.getElementById(`lc-img-box-${heroId}`);
  const imgEl = document.getElementById(`lc-img-${heroId}`);
  const descBox = document.getElementById(`lc-desc-${heroId}`);

  if (lc) {
    if (imgBox) imgBox.style.display = "block";
    if (imgEl) imgEl.src = lc.imageSrc || "";
    if (descBox && descBox.style.display !== "none") {
      descBox.innerHTML = lc.getDescription
        ? lc.getDescription(si)
        : "No data.";
    }
  } else {
    if (imgBox) imgBox.style.display = "none";
    if (descBox) descBox.style.display = "none";
  }
}

function showLoadoutScreen() {
  mainMenuScreen.style.display = "none";
  loadoutScreen.style.display = "block";
  loadoutContainer.innerHTML = "";
  loadoutContainer.className = "loadout-list";

  Object.values(heroDatabase).forEach((hero) => {
    const card = document.createElement("div");
    card.className = "loadout-card";
    const save = playerSaveData.heroes[hero.id];

    let optionsHtml = `<option value="">[ EMPTY_SLOT ]</option>`;
    Object.values(lightconeDatabase).forEach((lc) => {
      const isSelected = save.equippedLightCone === lc.id ? "selected" : "";
      optionsHtml += `<option value="${lc.id}" ${isSelected}>★ ${lc.name}</option>`;
    });

    const hasLC = save.equippedLightCone ? "flex" : "none";
    const curLcLvl = save.lcLevel || 1;
    const curSi = save.lcSuperimposition || 1;

    const traceOpts = (val, max) =>
      Array.from({ length: max }, (_, i) => i + 1)
        .map(
          (lvl) =>
            `<option value="${lvl}" ${val === lvl ? "selected" : ""}>${lvl}</option>`,
        )
        .join("");

    card.innerHTML = `
      <div class="loadout-portrait"><img src="${hero.imageSrc}"></div>
      <div class="loadout-details">
        <div class="loadout-header">
          <h3>${hero.name.toUpperCase()}</h3>
          <select class="hero-lvl-select loadout-lvl" data-hero="${hero.id}">
             ${[1, 20, 30, 40, 50, 60, 70, 80].map((lvl) => `<option value="${lvl}" ${save.level === lvl ? "selected" : ""}>LVL ${lvl}</option>`).join("")}
          </select>
        </div>

        <div class="loadout-stats">
          <div class="stat-row"><span>HP:</span> <span id="base-hp-${hero.id}">${hero.stats[save.level || 1].hp}</span> <span class="stat-bonus" id="bonus-hp-${hero.id}"></span></div>
          <div class="stat-row"><span>ATK:</span> <span id="base-atk-${hero.id}">${hero.stats[save.level || 1].atk}</span> <span class="stat-bonus" id="bonus-atk-${hero.id}"></span></div>
          <div class="stat-row"><span>DEF:</span> <span id="base-def-${hero.id}">${hero.stats[save.level || 1].def}</span> <span class="stat-bonus" id="bonus-def-${hero.id}"></span></div>
        </div>

        <div class="loadout-equip-section">
          <div class="equip-label" style="margin-bottom: 5px;">/// TRACES & EIDOLON</div>
          <div class="lc-sub-settings" style="flex-wrap: wrap; margin-bottom: 15px; border-color: #fcee0a;">
             <div class="equip-label">E:</div>
             <select class="eidolon-select" data-hero="${hero.id}">
               ${[0, 1, 2, 3, 4, 5, 6].map((e) => `<option value="${e}" ${save.eidolon === e ? "selected" : ""}>E${e}</option>`).join("")}
             </select>
             <div class="equip-label" style="margin-left: 10px;">ATK:</div>
             <select class="trace-select" data-type="basicLvl" data-hero="${hero.id}">${traceOpts(save.basicLvl, 6)}</select>
             
             <div class="equip-label" style="margin-left: 10px;">SKL:</div>
             <select class="trace-select" data-type="skillLvl" data-hero="${hero.id}">${traceOpts(save.skillLvl, 10)}</select>
             
             <div class="equip-label" style="margin-left: 10px;">ULT:</div>
             <select class="trace-select" data-type="ultLvl" data-hero="${hero.id}">${traceOpts(save.ultLvl, 10)}</select>
             
             <div class="equip-label" style="margin-left: 10px;">TAL:</div>
             <select class="trace-select" data-type="talentLvl" data-hero="${hero.id}">${traceOpts(save.talentLvl, 10)}</select>
          </div>

          <div class="equip-label">/// LIGHT_CONE_LINK</div>
          <div class="lc-equip-row">
            <div class="lc-image-container" id="lc-img-box-${hero.id}" style="display: ${hasLC};">
               <img id="lc-img-${hero.id}" src="" class="lc-portrait">
            </div>
            
            <div style="flex: 1;">
              <select class="lc-select" data-hero="${hero.id}">${optionsHtml}</select>
              <div class="lc-sub-settings" id="lc-config-${hero.id}" style="display: ${hasLC};">
                 <div class="equip-label">LVL:</div>
                 <select class="lc-lvl-select" data-hero="${hero.id}">
                   ${[1, 20, 30, 40, 50, 60, 70, 80].map((lvl) => `<option value="${lvl}" ${curLcLvl === lvl ? "selected" : ""}>${lvl}</option>`).join("")}
                 </select>
                 <div class="equip-label" style="margin-left: 10px;">SI:</div>
                 <select class="lc-si-select" data-hero="${hero.id}">
                   ${[1, 2, 3, 4, 5].map((si) => `<option value="${si}" ${curSi === si ? "selected" : ""}>${si}</option>`).join("")}
                 </select>
                 <button class="btn-info" data-hero="${hero.id}">[ i ]</button>
              </div>
              <div class="lc-desc-box" id="lc-desc-${hero.id}" style="display: none;"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    loadoutContainer.appendChild(card);
    updateLoadoutStats(hero.id);
  });

  document.querySelectorAll(".eidolon-select").forEach((select) => {
    select.addEventListener("change", (e) => {
      playerSaveData.heroes[e.target.getAttribute("data-hero")].eidolon =
        parseInt(e.target.value);
      playSFX("skillPop");
    });
  });

  document.querySelectorAll(".trace-select").forEach((select) => {
    select.addEventListener("change", (e) => {
      playerSaveData.heroes[e.target.getAttribute("data-hero")][
        e.target.getAttribute("data-type")
      ] = parseInt(e.target.value);
      playSFX("hover");
    });
  });

  // --- LISTENERS ---
  document.querySelectorAll(".hero-lvl-select").forEach((select) => {
    select.addEventListener("change", (e) => {
      const heroId = e.target.getAttribute("data-hero");
      playerSaveData.heroes[heroId].level = parseInt(e.target.value);
      playSFX("hover");
      updateLoadoutStats(heroId);
    });
  });

  document.querySelectorAll(".lc-select").forEach((select) => {
    select.addEventListener("change", (e) => {
      const heroId = e.target.getAttribute("data-hero");
      playerSaveData.heroes[heroId].equippedLightCone = e.target.value || null;
      document.getElementById(`lc-config-${heroId}`).style.display = e.target
        .value
        ? "flex"
        : "none";

      if (!e.target.value)
        document.getElementById(`lc-desc-${heroId}`).style.display = "none";

      playSFX("skillPop");
      updateLoadoutStats(heroId);
    });
  });

  document.querySelectorAll(".lc-lvl-select").forEach((select) => {
    select.addEventListener("change", (e) => {
      const heroId = e.target.getAttribute("data-hero");
      playerSaveData.heroes[heroId].lcLevel = parseInt(e.target.value);
      playSFX("hover");
      updateLoadoutStats(heroId);
    });
  });

  document.querySelectorAll(".lc-si-select").forEach((select) => {
    select.addEventListener("change", (e) => {
      const heroId = e.target.getAttribute("data-hero");
      playerSaveData.heroes[heroId].lcSuperimposition = parseInt(
        e.target.value,
      );
      playSFX("hover");
      updateLoadoutStats(heroId);
    });
  });

  document.querySelectorAll(".btn-info").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const heroId = e.target.getAttribute("data-hero");
      const descBox = document.getElementById(`lc-desc-${heroId}`);

      if (descBox.style.display === "none") {
        descBox.style.display = "block";
        updateLoadoutStats(heroId);
        playSFX("hover");
      } else {
        descBox.style.display = "none";
        playSFX("hover");
      }
    });
  });
}

// --- Roster Selection Functions (UNCHANGED) ---
function startCustomHeroSelect() {
  mainMenuScreen.style.display = "none";
  selectionScreen.style.display = "block";
  rosterContainer.innerHTML = "";
  rosterContainer.className = "";

  const titleBanner = document.createElement("div");
  titleBanner.innerHTML = `<h2 style="color: #fcee0a; text-shadow: 4px 4px 0 #ff007c; font-family: 'Press Start 2P', monospace; margin-bottom: 40px; letter-spacing: 2px;">/// INITIALIZE_SIMULATION_PARAMETERS</h2>`;
  rosterContainer.appendChild(titleBanner);

  heroSelection = {};
  enemySelection = {};
  heroSelectionQueue = [];
  enemySelectionQueue = [];
  selectionControls.style.display = "block";
  btnStartBattle.disabled = true;

  const heroSection = document.createElement("div");
  heroSection.style.marginBottom = "50px";
  heroSection.innerHTML = `<h3 style="color:#00f3ff; margin-bottom:15px; text-shadow: 2px 2px 0 #000;">> SELECT_SQUAD (MAX 4)</h3>`;
  const heroGrid = document.createElement("div");
  heroGrid.className = "roster-grid";
  heroSection.appendChild(heroGrid);
  rosterContainer.appendChild(heroSection);

  const enemySection = document.createElement("div");
  enemySection.innerHTML = `<h3 style="color:#ff007c; margin-bottom:15px; text-shadow: 2px 2px 0 #000;">> SELECT_ENEMIES (MAX 5)</h3>`;
  const enemyGrid = document.createElement("div");
  enemyGrid.className = "roster-grid";
  enemySection.appendChild(enemyGrid);
  rosterContainer.appendChild(enemySection);

  Object.values(heroDatabase).forEach((hero) => {
    const card = document.createElement("div");
    card.className = "roster-card hero-theme";
    card.id = `select-hero-${hero.id}`;
    card.innerHTML = `<div class="count-badge" id="badge-hero-${hero.id}">SELECTED</div>
      <div class="portrait-frame"><img src="${hero.imageSrc}"></div>
      <div class="roster-stats"><h2 style="font-size: 11px; line-height: 1.4; margin-top: 5px;">${hero.name}</h2></div>`;
    card.onclick = () => updateHeroCount(hero.id, 1);
    card.oncontextmenu = (e) => {
      e.preventDefault();
      updateHeroCount(hero.id, -1);
    };
    heroGrid.appendChild(card);
  });

  Object.values(enemyDatabase).forEach((enemy) => {
    const card = document.createElement("div");
    card.className = "roster-card enemy-theme";
    card.id = `select-enemy-${enemy.id}`;
    card.innerHTML = `<div class="count-badge" id="badge-enemy-${enemy.id}">0</div>
      <div class="portrait-frame"><img src="${enemy.imageSrc}"></div>
      <div class="roster-stats"><h2 style="font-size: 11px; line-height: 1.4; margin-top: 5px;">${enemy.name}</h2></div>`;
    card.onclick = () => updateEnemyCount(enemy.id, 1);
    card.oncontextmenu = (e) => {
      e.preventDefault();
      updateEnemyCount(enemy.id, -1);
    };
    enemyGrid.appendChild(card);
  });
}

function updateHeroCount(id, change) {
  const total = heroSelectionQueue.length;
  if (!heroSelection[id]) heroSelection[id] = 0;

  if (change > 0 && total < 4 && heroSelection[id] < 1) {
    heroSelection[id]++;
    heroSelectionQueue.push(id);
    playSFX("hover");
  } else if (change < 0 && heroSelection[id] > 0) {
    heroSelection[id]--;
    const idx = heroSelectionQueue.lastIndexOf(id);
    if (idx > -1) heroSelectionQueue.splice(idx, 1);
    playSFX("hover");
  }

  const card = document.getElementById(`select-hero-${id}`);
  if (heroSelection[id] > 0) card.classList.add("selected");
  else card.classList.remove("selected");

  checkStartConditions();
}

function updateEnemyCount(id, change) {
  const total = enemySelectionQueue.length;
  if (!enemySelection[id]) enemySelection[id] = 0;

  if (change > 0 && total < 5) {
    enemySelection[id]++;
    enemySelectionQueue.push(id);
    playSFX("hover");
  } else if (change < 0 && enemySelection[id] > 0) {
    enemySelection[id]--;
    const idx = enemySelectionQueue.lastIndexOf(id);
    if (idx > -1) enemySelectionQueue.splice(idx, 1);
    playSFX("hover");
  }

  document.getElementById(`badge-enemy-${id}`).innerText =
    `x${enemySelection[id]}`;
  const card = document.getElementById(`select-enemy-${id}`);

  if (enemySelection[id] > 0) card.classList.add("selected");
  else card.classList.remove("selected");

  checkStartConditions();
}

function checkStartConditions() {
  const hT = heroSelectionQueue.length;
  const eT = enemySelectionQueue.length;
  btnStartBattle.disabled = hT === 0 || eT === 0;
}
