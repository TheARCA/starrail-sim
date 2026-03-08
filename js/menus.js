import { heroDatabase } from "./heroes.js";
import { enemyDatabase } from "./enemies.js";
import { lightconeDatabase } from "./lightcones.js";
import { playerSaveData, exportLoadout, importLoadout } from "./saveData.js";
import { playSFX } from "./audio.js";
import { startCustomBattle } from "./combat.js";
import { relicSets, compileRelicStats } from "./relics.js";

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

let heroSelection = {};
let enemySelection = {};
let heroSelectionQueue = [];
let enemySelectionQueue = [];

if (btnCustomBattle)
  btnCustomBattle.addEventListener("click", () => {
    enterFullScreen();
    startCustomHeroSelect();
  });
if (btnLoadout) btnLoadout.addEventListener("click", showLoadoutScreen);
if (btnLoadoutBack) btnLoadoutBack.addEventListener("click", showMainMenu);
if (btnStartBattle)
  btnStartBattle.addEventListener("click", () => {
    enterFullScreen();
    selectionScreen.style.display = "none";
    startCustomBattle(heroSelectionQueue, enemySelectionQueue);
  });

export function showMainMenu() {
  mainMenuScreen.style.display = "block";
  selectionScreen.style.display = "none";
  battleScreen.style.display = "none";
  if (loadoutScreen) loadoutScreen.style.display = "none";
  if (selectionControls) selectionControls.style.display = "none";
}

function enterFullScreen() {
  const doc = document.documentElement;
  if (doc.requestFullscreen)
    doc.requestFullscreen().catch((err) => console.warn(err));
}

function updateLoadoutStats(heroId) {
  const hero = heroDatabase[heroId];
  const save = playerSaveData.heroes[heroId];
  const lc = save.equippedLightCone
    ? lightconeDatabase[save.equippedLightCone]
    : null;

  const heroLvl = save.level || 1;
  const lcLvl = save.lcLevel || 1;

  // 1. Calculate Base (Hero + LC)
  const baseHp = hero.stats[heroLvl].hp + (lc ? lc.stats[lcLvl].hp : 0);
  const baseAtk = hero.stats[heroLvl].atk + (lc ? lc.stats[lcLvl].atk : 0);
  const baseDef = hero.stats[heroLvl].def + (lc ? lc.stats[lcLvl].def : 0);
  const baseSpd = hero.spd || 100;
  const baseCr = hero.critRate || 0.05;
  const baseCd = hero.critDmg || 0.5;

  // 2. Compile Relic Stats
  let rel = {
    hpPct: 0,
    atkPct: 0,
    defPct: 0,
    hpFlat: 0,
    atkFlat: 0,
    defFlat: 0,
    spd: 0,
    critRate: 0,
    critDmg: 0,
  };
  if (save.relics) {
    rel = compileRelicStats(save.relics);
  }

  // 3. Calculate Bonus Stats (Math.floor matches exactly how HSR rounds stats)
  const bonusHp = Math.floor(baseHp * rel.hpPct + rel.hpFlat);
  const bonusAtk = Math.floor(baseAtk * rel.atkPct + rel.atkFlat);
  const bonusDef = Math.floor(baseDef * rel.defPct + rel.defFlat);
  const bonusSpd = Math.floor(rel.spd);
  const bonusCr = rel.critRate;
  const bonusCd = rel.critDmg;

  // 4. Update the DOM elements instantly
  const setUI = (id, baseVal, bonusVal, isPct = false) => {
    const baseEl = document.getElementById(`base-${id}-${heroId}`);
    const bonusEl = document.getElementById(`bonus-${id}-${heroId}`);
    if (!baseEl || !bonusEl) return;

    if (isPct) {
      baseEl.innerText = (baseVal * 100).toFixed(1) + "%";
      bonusEl.innerText =
        bonusVal > 0 ? ` +${(bonusVal * 100).toFixed(1)}%` : "";
    } else {
      baseEl.innerText = Math.floor(baseVal);
      bonusEl.innerText = bonusVal > 0 ? ` +${Math.floor(bonusVal)}` : "";
    }
  };

  setUI("hp", baseHp, bonusHp);
  setUI("atk", baseAtk, bonusAtk);
  setUI("def", baseDef, bonusDef);
  setUI("spd", baseSpd, bonusSpd);
  setUI("cr", baseCr, bonusCr, true);
  setUI("cd", baseCd, bonusCd, true);
}

// ✨ NEW: Dynamic Light Cone Terminal Output
function updateLCUI(heroId) {
  const save = playerSaveData.heroes[heroId];
  const lcId = save.equippedLightCone;
  const lc = lcId ? lightconeDatabase[lcId] : null;
  const descBox = document.getElementById(`lc-desc-${heroId}`);

  if (!descBox) return;

  if (lc) {
    descBox.style.display = "block";
    const si = save.lcSuperimposition || 1;
    descBox.innerHTML = `<strong style="color:#fcee0a;">[${lc.name}]</strong><br><br>${lc.getDescription ? lc.getDescription(si) : "No data."}`;
  } else {
    descBox.style.display = "none";
  }
}

// ✨ Dynamic Relic Terminal Output
function updateRelicDescriptions(heroId) {
  const save = playerSaveData.heroes[heroId];
  if (!save.relics) return;

  const r1 = save.relics.relicSet1;
  const r2 = save.relics.relicSet2;
  const p = save.relics.planarSet;
  const descBox = document.getElementById(`relic-desc-${heroId}`);
  if (!descBox) return;

  let html = "";
  let setCounts = {};
  if (r1) setCounts[r1] = (setCounts[r1] || 0) + 1;
  if (r2) setCounts[r2] = (setCounts[r2] || 0) + 1;

  for (const [setId, count] of Object.entries(setCounts)) {
    const setObj = relicSets[setId];
    if (setObj) {
      html += `<div class="relic-desc-item"><strong style="color:#00f3ff;">[2-Pc] ${setObj.name}:</strong><br>${setObj.desc2P}</div>`;
      if (count === 2 && setObj.desc4P) {
        html += `<div class="relic-desc-item"><strong style="color:#fcee0a;">[4-Pc] ${setObj.name}:</strong><br>${setObj.desc4P}</div>`;
      }
    }
  }
  if (p && relicSets[p]) {
    html += `<div class="relic-desc-item"><strong style="color:#ff007c;">[Planar] ${relicSets[p].name}:</strong><br>${relicSets[p].desc}</div>`;
  }
  descBox.innerHTML =
    html ||
    "<div style='color:#FFF; font-size: 8px;'>/// NO SET BONUSES ACTIVE ///</div>";
}

function generateStatsHTML(hero, saveState) {
  // 1. Get Base Data
  const lvl = saveState.level || 1;
  const lcId = saveState.equippedLightCone;
  const lcLvl = saveState.lcLevel || 1;
  const lcSi = saveState.lcSuperimposition || 1;
  const lc = lcId ? lightconeDatabase[lcId] : null;

  // 2. Calculate Base Stats (Hero Base + Light Cone Base)
  const baseHp =
    (hero.stats[lvl]?.hp || 0) + (lc ? lc.stats[lcLvl]?.hp || 0 : 0);
  const baseAtk =
    (hero.stats[lvl]?.atk || 0) + (lc ? lc.stats[lcLvl]?.atk || 0 : 0);
  const baseDef =
    (hero.stats[lvl]?.def || 0) + (lc ? lc.stats[lcLvl]?.def || 0 : 0);
  const baseSpd = hero.spd || 100;

  const baseCritRate = hero.critRate || 0.05;
  const baseCritDmg = hero.critDmg || 0.5;

  // 3. Get Relic Totals
  const totals = compileRelicStats(saveState.relics);

  // ✨ NEW: SIMULATE ALL PASSIVES FOR THE UI!
  let mockHero = {
    spd: baseSpd + (totals.spd || 0),
    hpPctBonus: 0,
    atkPctBonus: 0,
    defPctBonus: 0,
    spdPctBonus: 0,
    critRateBonus: 0,
    critDmgBonus: 0,
    ehrBonus: 0,
    effectResBonus: 0,
    breakEffectBonus: 0,
    energyRegenBonus: 0,
    healingBonus: 0,
  };

  // Apply Hero Traces
  if (hero.applyTraces) {
    hero.applyTraces(mockHero, lvl);
  }

  // Apply Light Cone Passives
  if (lc && lc.onEquip) {
    lc.onEquip(mockHero, lcSi);
  }

  // Apply Relic Set Bonuses
  const r1 = saveState.relics?.relicSet1;
  const r2 = saveState.relics?.relicSet2;
  const p = saveState.relics?.planarSet;

  let setCounts = {};
  if (r1) setCounts[r1] = (setCounts[r1] || 0) + 1;
  if (r2) setCounts[r2] = (setCounts[r2] || 0) + 1;

  for (const [setId, count] of Object.entries(setCounts)) {
    const setObj = relicSets[setId];
    if (setObj && setObj.apply2P) setObj.apply2P(mockHero);
    if (count === 2 && setObj && setObj.apply4P) setObj.apply4P(mockHero);
  }
  if (p && relicSets[p] && relicSets[p].apply2P) {
    relicSets[p].apply2P(mockHero);
  }

  // Add all injected bonuses to our math totals
  totals.hpPct = (totals.hpPct || 0) + mockHero.hpPctBonus;
  totals.atkPct = (totals.atkPct || 0) + mockHero.atkPctBonus;
  totals.defPct = (totals.defPct || 0) + mockHero.defPctBonus;
  totals.spdPct = (totals.spdPct || 0) + mockHero.spdPctBonus;
  totals.critRate = (totals.critRate || 0) + mockHero.critRateBonus;
  totals.critDmg = (totals.critDmg || 0) + mockHero.critDmgBonus;

  // 4. Calculate Final Bonus Stats
  const bonusHp =
    Math.floor(baseHp * (totals.hpPct || 0)) + (totals.hpFlat || 0);
  const bonusAtk =
    Math.floor(baseAtk * (totals.atkPct || 0)) + (totals.atkFlat || 0);
  const bonusDef =
    Math.floor(baseDef * (totals.defPct || 0)) + (totals.defFlat || 0);
  const bonusSpd =
    Math.floor(baseSpd * (totals.spdPct || 0)) + (totals.spd || 0);

  const bonusCritRate = totals.critRate || 0;
  const bonusCritDmg = totals.critDmg || 0;

  // Helper function to format rows
  const formatRow = (label, base, bonus, isPercent = false) => {
    const total = base + bonus;
    let displayTotal = isPercent
      ? `${(total * 100).toFixed(1)}%`
      : Math.floor(total);
    let displayBonus = isPercent
      ? `${(bonus * 100).toFixed(1)}%`
      : Math.floor(bonus);

    const bonusHtml =
      bonus > 0 ? `<span class="stat-bonus">(+${displayBonus})</span>` : "";
    return `<div class="stat-row">${label} <span>${displayTotal} ${bonusHtml}</span></div>`;
  };

  // 5. Generate the HTML block
  return `
    ${formatRow("HP", baseHp, bonusHp)}
    ${formatRow("ATK", baseAtk, bonusAtk)}
    ${formatRow("DEF", baseDef, bonusDef)}
    ${formatRow("SPEED", baseSpd, bonusSpd)}
    ${formatRow("CRIT RATE", baseCritRate, bonusCritRate, true)}
    ${formatRow("CRIT DMG", baseCritDmg, bonusCritDmg, true)}
  `;
}

export function showLoadoutScreen() {
  mainMenuScreen.style.display = "none";
  loadoutScreen.style.display = "block";
  loadoutContainer.innerHTML = "";
  loadoutContainer.className = "loadout-list";

  const controlBar = document.createElement("div");
  controlBar.className = "loadout-control-bar";
  controlBar.innerHTML = `
    <button id="btn-export-loadout" class="hud-select" style="width: auto; padding: 10px 20px; color: #00f3ff; border-bottom-color: #00f3ff;">[ EXPORT TO JSON ]</button>
    <button id="btn-import-loadout" class="hud-select" style="width: auto; padding: 10px 20px; color: #fcee0a; border-bottom-color: #fcee0a;">[ IMPORT JSON ]</button>
    <input type="file" id="import-file-input" accept=".json" style="display: none;">
  `;
  loadoutContainer.appendChild(controlBar);

  // Wire up the Export Button
  document
    .getElementById("btn-export-loadout")
    .addEventListener("click", () => {
      playSFX("skillPop");
      exportLoadout();
    });

  // Wire up the Import Button
  const fileInput = document.getElementById("import-file-input");
  document
    .getElementById("btn-import-loadout")
    .addEventListener("click", () => {
      playSFX("hover");
      fileInput.click(); // Secretly clicks the hidden file input
    });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    importLoadout(file, () => {
      playSFX("boot");
      showLoadoutScreen(); // Instantly redraws the screen with your new stats!
    });
  });

  Object.values(heroDatabase).forEach((hero) => {
    const card = document.createElement("div");
    card.className = "loadout-card";
    const save = playerSaveData.heroes[hero.id];

    let lcOptions = `<option value="">[ NO LIGHT CONE ]</option>`;
    Object.values(lightconeDatabase).forEach((lc) => {
      lcOptions += `<option value="${lc.id}" ${save.equippedLightCone === lc.id ? "selected" : ""}>★ ${lc.name}</option>`;
    });

    const traceOpts = (val, max) =>
      Array.from({ length: max }, (_, i) => i + 1)
        .map(
          (lvl) =>
            `<option value="${lvl}" ${val === lvl ? "selected" : ""}>LVL ${lvl}</option>`,
        )
        .join("");
    const lvlOpts = [1, 20, 30, 40, 50, 60, 70, 80]
      .map(
        (lvl) =>
          `<option value="${lvl}" ${save.level === lvl ? "selected" : ""}>LVL ${lvl}</option>`,
      )
      .join("");
    const lcLvlOpts = [1, 20, 30, 40, 50, 60, 70, 80]
      .map(
        (lvl) =>
          `<option value="${lvl}" ${(save.lcLevel || 1) === lvl ? "selected" : ""}>LVL ${lvl}</option>`,
      )
      .join("");
    const siOpts = [1, 2, 3, 4, 5]
      .map(
        (si) =>
          `<option value="${si}" ${(save.lcSuperimposition || 1) === si ? "selected" : ""}>S${si}</option>`,
      )
      .join("");
    const eOpts = [0, 1, 2, 3, 4, 5, 6]
      .map(
        (e) =>
          `<option value="${e}" ${save.eidolon === e ? "selected" : ""}>E${e}</option>`,
      )
      .join("");

    if (!save.relics)
      save.relics = {
        relicSet1: "",
        relicSet2: "",
        planarSet: "",
        mainStats: {
          body: "atkPct",
          boots: "spd",
          sphere: "lightningDmg",
          rope: "atkPct",
        },
        substatPriority: ["spd", "atkPct", "breakEffect", "ehr"],
      };
    const rel = save.relics;
    const formatStat = (s) =>
      s.replace("Pct", "%").replace("Dmg", " DMG").toUpperCase();
    const makeOpts = (arr, sel) =>
      arr
        .map(
          (s) =>
            `<option value="${s}" ${sel === s ? "selected" : ""}>${formatStat(s)}</option>`,
        )
        .join("");

    const STAT_LABELS = {
      hpFlat: "HP",
      atkFlat: "ATK",
      defFlat: "DEF",
      hpPct: "HP %",
      atkPct: "ATK %",
      defPct: "DEF %",
      spd: "SPEED",
      critRate: "CRIT RATE",
      critDmg: "CRIT DMG",
      ehr: "EHR",
      effectRes: "EFFECT RES",
      breakEffect: "BREAK EFFECT",
      energyRegen: "ENERGY REGEN",
      healing: "HEALING BOOST",
      physicalDmg: "PHYS DMG",
      fireDmg: "FIRE DMG",
      iceDmg: "ICE DMG",
      lightningDmg: "LIGHTNING DMG",
      windDmg: "WIND DMG",
      quantumDmg: "QUANTUM DMG",
      imaginaryDmg: "IMAGINARY DMG",
    };

    const mBody = [
      "hpPct",
      "atkPct",
      "defPct",
      "critRate",
      "critDmg",
      "healing",
      "ehr",
    ];
    const mBoots = ["hpPct", "atkPct", "defPct", "spd"];
    const mSphere = [
      "hpPct",
      "atkPct",
      "defPct",
      "physicalDmg",
      "fireDmg",
      "iceDmg",
      "lightningDmg",
      "windDmg",
      "quantumDmg",
      "imaginaryDmg",
    ];
    const mRope = ["hpPct", "atkPct", "defPct", "breakEffect", "energyRegen"];
    const subs = [
      "hpFlat",
      "atkFlat",
      "defFlat",
      "hpPct",
      "atkPct",
      "defPct",
      "spd",
      "critRate",
      "critDmg",
      "ehr",
      "effectRes",
      "breakEffect",
    ];

    // Helper to generate options with the [ NONE ] default
    const generateOpts = (arr, selectedVal) => {
      return arr
        .map(
          (s) =>
            `<option value="${s}" ${selectedVal === s ? "selected" : ""}>${STAT_LABELS[s]}</option>`,
        )
        .join("");
    };
    const generateRelicOpts = (selected) => {
      let html = `<option value="">[ RELIC SLOT ]</option>`;
      Object.entries(relicSets).forEach(([id, set]) => {
        if (set.desc4P) {
          html += `<option value="${id}" ${selected === id ? "selected" : ""}>${set.name}</option>`;
        }
      });
      return html;
    };

    const generatePlanarOpts = (selected) => {
      let html = `<option value="">[ PLANAR ORNAMENT ]</option>`;
      Object.entries(relicSets).forEach(([id, set]) => {
        if (!set.desc4P) {
          html += `<option value="${id}" ${selected === id ? "selected" : ""}>${set.name}</option>`;
        }
      });
      return html;
    };

    // ✨ INJECTED COLOR CLASSES TO HEADERS & BOXES
    card.innerHTML = `
      <div class="loadout-col-left">
        <div class="name-header">
          <h3>${hero.name.toUpperCase()}</h3>
          <select class="hero-lvl-select" data-hero="${hero.id}">${lvlOpts}</select>
        </div>
        
        <div class="loadout-portrait"><img src="${hero.imageSrc}"></div>
        
        <div class="loadout-stats" id="stats-panel-${hero.id}">
          ${generateStatsHTML(hero, rel)}
        </div>
      </div>

      <div class="loadout-col-main">
        <div class="equip-grid">
          
          <div class="grid-col">
            <div class="hud-module box-traces">
              <span class="hud-label label-traces">/// TRACES & EIDOLON</span>
              <div class="hud-row"><span>EDLN</span> <select class="hud-select eidolon-select" data-hero="${hero.id}">${eOpts}</select></div>
              <div class="hud-row">
                <span>ATK</span> <select class="hud-select trace-select" data-type="basicLvl" data-hero="${hero.id}">${traceOpts(save.basicLvl, 6)}</select>
                <span>SKL</span> <select class="hud-select trace-select" data-type="skillLvl" data-hero="${hero.id}">${traceOpts(save.skillLvl, 10)}</select>
              </div>
              <div class="hud-row">
                <span>ULT</span> <select class="hud-select trace-select" data-type="ultLvl" data-hero="${hero.id}">${traceOpts(save.ultLvl, 10)}</select>
                <span>TLN</span> <select class="hud-select trace-select" data-type="talentLvl" data-hero="${hero.id}">${traceOpts(save.talentLvl, 10)}</select>
              </div>
            </div>

            <div class="hud-module box-lc">
              <span class="hud-label label-lc">/// LIGHT CONE</span>
              <select class="hud-select lc-select" data-hero="${hero.id}" style="width: 100%;">${lcOptions}</select>
              <div class="hud-row">
                <span>LVL</span> <select class="hud-select lc-lvl-select" data-hero="${hero.id}">${lcLvlOpts}</select>
                <span>SUP</span> <select class="hud-select lc-si-select" data-hero="${hero.id}">${siOpts}</select>
              </div>
            </div>
          </div>

          <div class="grid-col">
            <div class="hud-module box-relics">
              <span class="hud-label label-relics">/// RELIC PROTOCOL</span>
              
              <div class="hud-row">
                <select class="hud-select relic-set1-select" data-hero="${hero.id}">
                  ${generateRelicOpts(rel.relicSet1)}
                </select>
                <select class="hud-select relic-set2-select" data-hero="${hero.id}">
                  ${generateRelicOpts(rel.relicSet2)}
                </select>
              </div>
              
              <select class="hud-select planar-set-select" data-hero="${hero.id}" style="margin-bottom: 5px;">
                ${generatePlanarOpts(rel.planarSet)}
              </select>
              
              <div class="hud-row">
                <select class="hud-select relic-main-select" data-type="body" data-hero="${hero.id}">
                  <option value="">[ BODY ]</option>
                  ${generateOpts(mBody, rel.mainStats.body)}
                </select>
                <select class="hud-select relic-main-select" data-type="boots" data-hero="${hero.id}">
                  <option value="">[ BOOTS ]</option>
                  ${generateOpts(mBoots, rel.mainStats.boots)}
                </select>
              </div>
              <div class="hud-row" style="margin-bottom: 5px;">
                <select class="hud-select relic-main-select" data-type="sphere" data-hero="${hero.id}">
                  <option value="">[ SPHERE ]</option>
                  ${generateOpts(mSphere, rel.mainStats.sphere)}
                </select>
                <select class="hud-select relic-main-select" data-type="rope" data-hero="${hero.id}">
                  <option value="">[ ROPE ]</option>
                  ${generateOpts(mRope, rel.mainStats.rope)}
                </select>
              </div>

              <div class="hud-row">
                <span class="sub-label">PR 1:</span>
                <select class="hud-select relic-sub-select" data-index="0" data-hero="${hero.id}">
                  <option value="">[ NONE ]</option>
                  ${generateOpts(subs, rel.substatPriority[0])}
                </select>
                <span class="sub-label">PR 2:</span>
                <select class="hud-select relic-sub-select" data-index="1" data-hero="${hero.id}">
                  <option value="">[ NONE ]</option>
                  ${generateOpts(subs, rel.substatPriority[1])}
                </select>
              </div>
              <div class="hud-row">
                <span class="sub-label">PR 3:</span>
                <select class="hud-select relic-sub-select" data-index="2" data-hero="${hero.id}">
                  <option value="">[ NONE ]</option>
                  ${generateOpts(subs, rel.substatPriority[2])}
                </select>
                <span class="sub-label">PR 4:</span>
                <select class="hud-select relic-sub-select" data-index="3" data-hero="${hero.id}">
                  <option value="">[ NONE ]</option>
                  ${generateOpts(subs, rel.substatPriority[3])}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="hud-monitor">
          <div class="lc-monitor-half" id="lc-desc-${hero.id}"></div>
          <div class="relic-monitor-half" id="relic-desc-${hero.id}"></div>
        </div>
      </div>
    `;
    loadoutContainer.appendChild(card);
    updateLoadoutStats(hero.id);
    updateLCUI(hero.id); // ✨ Auto-generate LC text on load
    updateRelicDescriptions(hero.id);
  });

  // --- WIRING LISTENERS ---

  // ✨ NEW: The universal function to update stats and trigger the Neon Flash!
  const refreshStatsAndAnimate = (heroId) => {
    const hero = heroDatabase[heroId];
    const saveState = playerSaveData.heroes[heroId];
    const statsPanel = document.getElementById(`stats-panel-${heroId}`);

    if (statsPanel) {
      statsPanel.innerHTML = generateStatsHTML(hero, saveState);
      statsPanel.classList.remove("stat-animate");
      void statsPanel.offsetWidth; // CSS Magic to restart animation
      statsPanel.classList.add("stat-animate");
    }
  };

  const saveAction = (heroId, updateFunc) => {
    updateFunc();
    playSFX("hover");
    refreshStatsAndAnimate(heroId); // ✨ Calls the new animator!
  };

  document
    .querySelectorAll(".hero-lvl-select")
    .forEach((sel) =>
      sel.addEventListener("change", (e) =>
        saveAction(
          e.target.dataset.hero,
          () =>
            (playerSaveData.heroes[e.target.dataset.hero].level = parseInt(
              e.target.value,
            )),
        ),
      ),
    );

  document
    .querySelectorAll(".eidolon-select")
    .forEach((sel) =>
      sel.addEventListener("change", (e) =>
        saveAction(
          e.target.dataset.hero,
          () =>
            (playerSaveData.heroes[e.target.dataset.hero].eidolon = parseInt(
              e.target.value,
            )),
        ),
      ),
    );

  document
    .querySelectorAll(".trace-select")
    .forEach((sel) =>
      sel.addEventListener("change", (e) =>
        saveAction(
          e.target.dataset.hero,
          () =>
            (playerSaveData.heroes[e.target.dataset.hero][
              e.target.dataset.type
            ] = parseInt(e.target.value)),
        ),
      ),
    );

  document.querySelectorAll(".lc-select").forEach((sel) =>
    sel.addEventListener("change", (e) =>
      saveAction(e.target.dataset.hero, () => {
        playerSaveData.heroes[e.target.dataset.hero].equippedLightCone =
          e.target.value || null;
        updateLCUI(e.target.dataset.hero);
      }),
    ),
  );

  document.querySelectorAll(".lc-lvl-select").forEach((sel) =>
    sel.addEventListener("change", (e) =>
      saveAction(e.target.dataset.hero, () => {
        playerSaveData.heroes[e.target.dataset.hero].lcLevel = parseInt(
          e.target.value,
        );
        updateLCUI(e.target.dataset.hero);
      }),
    ),
  );

  document.querySelectorAll(".lc-si-select").forEach((sel) =>
    sel.addEventListener("change", (e) =>
      saveAction(e.target.dataset.hero, () => {
        playerSaveData.heroes[e.target.dataset.hero].lcSuperimposition =
          parseInt(e.target.value);
        updateLCUI(e.target.dataset.hero);
      }),
    ),
  );

  // Relic Wiring
  const relicAction = (e, updateFunc) => {
    const hId = e.target.dataset.hero;
    updateFunc(hId);
    playSFX("skillPop");
    updateRelicDescriptions(hId);
    refreshStatsAndAnimate(hId);
  };

  document
    .querySelectorAll(".relic-set1-select")
    .forEach((sel) =>
      sel.addEventListener("change", (e) =>
        relicAction(
          e,
          (id) => (playerSaveData.heroes[id].relics.relicSet1 = e.target.value),
        ),
      ),
    );
  document
    .querySelectorAll(".relic-set2-select")
    .forEach((sel) =>
      sel.addEventListener("change", (e) =>
        relicAction(
          e,
          (id) => (playerSaveData.heroes[id].relics.relicSet2 = e.target.value),
        ),
      ),
    );
  document
    .querySelectorAll(".planar-set-select")
    .forEach((sel) =>
      sel.addEventListener("change", (e) =>
        relicAction(
          e,
          (id) => (playerSaveData.heroes[id].relics.planarSet = e.target.value),
        ),
      ),
    );
  document
    .querySelectorAll(".relic-main-select")
    .forEach((sel) =>
      sel.addEventListener("change", (e) =>
        relicAction(
          e,
          (id) =>
            (playerSaveData.heroes[id].relics.mainStats[e.target.dataset.type] =
              e.target.value),
        ),
      ),
    );
  document
    .querySelectorAll(".relic-sub-select")
    .forEach((sel) =>
      sel.addEventListener("change", (e) =>
        relicAction(
          e,
          (id) =>
            (playerSaveData.heroes[id].relics.substatPriority[
              e.target.dataset.index
            ] = e.target.value),
        ),
      ),
    );
}

// --- Roster Selection Functions ---
function startCustomHeroSelect() {
  mainMenuScreen.style.display = "none";
  selectionScreen.style.display = "block";
  rosterContainer.innerHTML = "";
  rosterContainer.className = "";

  const titleBanner = document.createElement("div");
  titleBanner.innerHTML = `<h2 style="color: #fcee0a; text-shadow: 4px 4px 0 #ff007c; margin-bottom: 30px; letter-spacing: 2px; text-align: center;">/// INITIALIZE_SIMULATION_PARAMETERS</h2>`;
  rosterContainer.appendChild(titleBanner);

  heroSelection = {};
  enemySelection = {};
  heroSelectionQueue = [];
  enemySelectionQueue = [];

  // Center the "START BATTLE" button nicely
  selectionControls.style.display = "";
  selectionControls.style.justifyContent = "";
  selectionControls.style.marginTop = "";
  btnStartBattle.disabled = true;

  // ✨ NEW: The Split-Screen Container
  const splitContainer = document.createElement("div");
  splitContainer.className = "selection-split";

  // --- HERO PANEL (LEFT) ---
  const heroPanel = document.createElement("div");
  heroPanel.className = "selection-panel panel-heroes";
  // ✨ Added the dynamic counter span
  heroPanel.innerHTML = `<div class="panel-header"><h3>> SELECT_SQUAD</h3> <span class="roster-count" id="hero-count-display">0/4</span></div>`;
  const heroGrid = document.createElement("div");
  heroGrid.className = "roster-grid";
  heroPanel.appendChild(heroGrid);
  splitContainer.appendChild(heroPanel);

  // --- ENEMY PANEL (RIGHT) ---
  const enemyPanel = document.createElement("div");
  enemyPanel.className = "selection-panel panel-enemies";
  // ✨ Added the dynamic counter span
  enemyPanel.innerHTML = `<div class="panel-header"><h3>> SELECT_TARGETS</h3> <span class="roster-count" id="enemy-count-display">0/5</span></div>`;
  const enemyGrid = document.createElement("div");

  enemyGrid.className = "roster-grid";
  enemyPanel.appendChild(enemyGrid);
  splitContainer.appendChild(enemyPanel);

  rosterContainer.appendChild(splitContainer);

  // Helper for elemental colors
  const getElementColor = (type) => {
    const colors = {
      physical: "#aaa",
      fire: "#ff5a5a",
      ice: "#00f3ff",
      lightning: "#cc00ff",
      wind: "#00ff88",
      quantum: "#6600ff",
      imaginary: "#fcee0a",
    };
    return colors[type] || "#fff";
  };

  // Populate Heroes
  Object.values(heroDatabase).forEach((hero) => {
    const card = document.createElement("div");
    card.className = "roster-card hero-theme";
    card.id = `select-hero-${hero.id}`;

    // ✨ NEW: Added the element-tag overlay to the portrait
    card.innerHTML = `
      <div class="count-badge" id="badge-hero-${hero.id}">SELECTED</div>
      <div class="portrait-frame">
        <img src="${hero.imageSrc}">
        <div class="element-tag" style="color: ${getElementColor(hero.type)}">${hero.type}</div>
      </div>
      <div class="roster-stats"><h2>${hero.name}</h2></div>`;

    card.onclick = () => updateHeroCount(hero.id, 1);
    card.oncontextmenu = (e) => {
      e.preventDefault();
      updateHeroCount(hero.id, -1);
    };
    heroGrid.appendChild(card);
  });

  // Populate Enemies
  Object.values(enemyDatabase).forEach((enemy) => {
    const card = document.createElement("div");
    card.className = "roster-card enemy-theme";
    card.id = `select-enemy-${enemy.id}`;

    // ✨ NEW: Tag shows the enemy's base level or class
    card.innerHTML = `
      <div class="count-badge" id="badge-enemy-${enemy.id}">x0</div>
      <div class="portrait-frame">
        <img src="${enemy.imageSrc}">
        <div class="element-tag" style="color: #ff007c">LVL ${enemy.baseLevel || 1}</div>
      </div>
      <div class="roster-stats"><h2>${enemy.name}</h2></div>`;

    card.onclick = () => updateEnemyCount(enemy.id, 1);
    card.oncontextmenu = (e) => {
      e.preventDefault();
      updateEnemyCount(enemy.id, -1);
    };
    enemyGrid.appendChild(card);
  });
}

function updateHeroCount(id, change) {
  if (!heroSelection[id]) heroSelection[id] = 0;
  if (change > 0 && heroSelectionQueue.length < 4 && heroSelection[id] < 1) {
    heroSelection[id]++;
    heroSelectionQueue.push(id);
    playSFX("hover");
  } else if (change < 0 && heroSelection[id] > 0) {
    heroSelection[id]--;
    heroSelectionQueue.splice(heroSelectionQueue.lastIndexOf(id), 1);
    playSFX("hover");
  }
  const card = document.getElementById(`select-hero-${id}`);
  if (heroSelection[id] > 0) card.classList.add("selected");
  else card.classList.remove("selected");

  // ✨ NEW: Update the visual counter!
  document.getElementById("hero-count-display").innerText =
    `${heroSelectionQueue.length}/4`;

  checkStartConditions();
}

function updateEnemyCount(id, change) {
  if (!enemySelection[id]) enemySelection[id] = 0;
  if (change > 0 && enemySelectionQueue.length < 5) {
    enemySelection[id]++;
    enemySelectionQueue.push(id);
    playSFX("hover");
  } else if (change < 0 && enemySelection[id] > 0) {
    enemySelection[id]--;
    enemySelectionQueue.splice(enemySelectionQueue.lastIndexOf(id), 1);
    playSFX("hover");
  }
  document.getElementById(`badge-enemy-${id}`).innerText =
    `x${enemySelection[id]}`;
  const card = document.getElementById(`select-enemy-${id}`);
  if (enemySelection[id] > 0) card.classList.add("selected");
  else card.classList.remove("selected");

  // ✨ NEW: Update the visual counter!
  document.getElementById("enemy-count-display").innerText =
    `${enemySelectionQueue.length}/5`;

  checkStartConditions();
}

function checkStartConditions() {
  btnStartBattle.disabled =
    heroSelectionQueue.length === 0 || enemySelectionQueue.length === 0;
}
