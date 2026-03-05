import { enemyDatabase } from "./enemies.js";
import { heroDatabase } from "./heroes.js";
import { lightconeDatabase } from "./lightcones.js";

// ✨ IMPORTED SYSTEMS
import { playSFX } from "./audio.js";
import {
  calculateDamage,
  calculateBreakDamage,
  calculateBreakDebuff,
} from "./math.js";
import { playVisualEffect, triggerAnimation, animateSP } from "./vfx.js";
import { handleKeyboardInput } from "./input.js";
import { playerSaveData } from "./saveData.js";
import { showMainMenu } from "./menus.js";

// --- 🎮 CORE GAME STATE ---
const MAX_SP = 5;
let partySP = 3;
let playerSquad = [];
let enemySquad = [];

// Ultimate Interception & Turn State
let activeEntity = null;
let ultimateQueue = [];
let counterQueue = [];
let suspendedEntity = null;
let isInputPhase = false;
let isInterceptionTurn = false;
let isActionAnimating = false;

let targetEnemyIndex = 0;
let targetHeroIndex = 0;
let selectedAction = null;
let currentTurnTotalDamage = 0;
let currentTurnTotalHits = 0;

// --- DOM ELEMENTS (BATTLE ONLY) ---
const battleScreen = document.getElementById("battle-screen");
const logEl = document.getElementById("battle-log");
const btnBasic = document.getElementById("btn-basic");
const btnSkill = document.getElementById("btn-skill");
const btnUlt = document.getElementById("btn-ult");

// --- UI EVENT LISTENERS ---
btnBasic.addEventListener("click", () => handleActionInput("basic"));
btnSkill.addEventListener("click", () => handleActionInput("skill"));
btnUlt.addEventListener("click", () => handleActionInput("ultimate"));

// --- UTILITIES ---
function showVoiceline(speaker, text) {
  logEl.innerHTML = `<div style="margin-top: 10px; font-size: 24px; text-shadow: 0 0 5px rgba(0,243,255,0.5);">
    <span style="color: #fcee0a; font-weight: bold;">${speaker.toUpperCase()}:</span> 
    <span style="color: #fff; font-style: italic;">"${text}"</span>
  </div>`;
}

function updateTotalDamage(dmg) {
  if (dmg <= 0) return;
  let tdc = document.getElementById("total-damage-container");
  if (!tdc) {
    tdc = document.createElement("div");
    tdc.id = "total-damage-container";
    document.body.appendChild(tdc);
  }
  tdc.innerHTML = `TOTAL DAMAGE:<br><span class="total-dmg-num">${currentTurnTotalDamage}</span>`;
  tdc.classList.add("show");

  if (tdc.hideTimeout) clearTimeout(tdc.hideTimeout);
  tdc.hideTimeout = setTimeout(() => tdc.classList.remove("show"), 2000);
}

function updateComboMeter() {
  if (currentTurnTotalHits < 2) return; // Only show on 2+ hits
  let cm = document.getElementById("combo-meter-container");
  if (!cm) {
    cm = document.createElement("div");
    cm.id = "combo-meter-container";
    document.body.appendChild(cm);
  }
  cm.innerHTML = `<div class="combo-text"><span>${currentTurnTotalHits}</span> HITS!</div>`;
  cm.classList.add("show");
  triggerAnimation(cm.querySelector(".combo-text"), "combo-bump");

  if (cm.hideTimeout) clearTimeout(cm.hideTimeout);
  cm.hideTimeout = setTimeout(() => cm.classList.remove("show"), 2000);
}

// --- INITIALIZE BATTLE ---
export function startCustomBattle(selectedHeroIds, selectedEnemyIds) {
  playerSquad = [];
  selectedHeroIds.forEach((id, i) => {
    const hero = heroDatabase[id];
    const saveData = playerSaveData.heroes[id];
    const lc = lightconeDatabase[saveData.equippedLightCone];

    let finalHp = hero.stats[saveData.level].hp;
    let finalAtk = hero.stats[saveData.level].atk;
    let finalDef = hero.stats[saveData.level].def;
    let eBasic = saveData.basicLvl || 1;
    let eSkill = saveData.skillLvl || 1;
    let eUlt = saveData.ultLvl || 1;
    let eTalent = saveData.talentLvl || 1;
    const eido = saveData.eidolon || 0;

    if (id === "trailblazer_destruction") {
      if (eido >= 3) {
        eSkill += 2;
        eTalent += 2;
      }
      if (eido >= 5) {
        eUlt += 2;
        eBasic += 1;
      }
    }

    if (id === "danheng") {
      if (eido >= 3) {
        eSkill += 2;
        eBasic += 1;
      }
      if (eido >= 5) {
        eUlt += 2;
        eTalent += 2;
      }
    }

    if (id === "march_7th_preservation") {
      if (eido >= 3) {
        eUlt += 2;
        eBasic += 1;
      }
      if (eido >= 5) {
        eSkill += 2;
        eTalent += 2;
      }
    }

    if (id === "kafka") {
      if (eido >= 3) {
        eSkill += 2;
        eBasic += 1;
      }
      if (eido >= 5) {
        eUlt += 2;
        eTalent += 2;
      }
    }

    if (
      saveData.equippedLightCone &&
      lightconeDatabase[saveData.equippedLightCone]
    ) {
      const lc = lightconeDatabase[saveData.equippedLightCone];
      const lcLvl = saveData.lcLevel || 80;

      finalHp += lc.stats[lcLvl].hp;
      finalAtk += lc.stats[lcLvl].atk;
      finalDef += lc.stats[lcLvl].def;
    }

    const inst = {
      ...hero,
      state: { ...hero.state },
      level: saveData.level,
      eidolon: eido,
      basicLvl: eBasic,
      skillLvl: eSkill,
      ultLvl: eUlt,
      talentLvl: eTalent,
      lcSuperimposition: saveData.lcSuperimposition || 1,
      lightCone: saveData.equippedLightCone
        ? lightconeDatabase[saveData.equippedLightCone]
        : null,
      lcState: {},
      baseHp: finalHp,
      hp: finalHp,
      baseAtk: finalAtk,
      baseDef: finalDef,
      energy: 0,
      critRate: hero.critRate || 0.05,
      critDmg: hero.critDmg || 0.5,
      shield: 0,
      shieldDuration: 0,
      aggroModifier: 0,
      shieldAggroMod: 0,
      isHero: true,
      isUltQueued: false,
      uid: `hero_${id}_${i}`,
    };
    if (inst.init) inst.init();
    if (inst.lightCone && inst.lightCone.init) inst.lightCone.init(inst);
    inst.spd = inst.spd || 100;
    inst.baseSpd = inst.spd;
    inst.av = 10000 / inst.spd;
    playerSquad.push(inst);
  });

  enemySquad = [];
  selectedEnemyIds.forEach((id, i) => {
    const t = enemyDatabase[id];
    enemySquad.push({
      ...t,
      hp: t.baseHp,
      toughness: t.baseToughness,
      maxToughness: t.baseToughness,
      isBroken: false,
      state: { isFrozen: false },
      isHero: false,
      spd: t.baseSpd || 90,
      av: 10000 / (t.baseSpd || 90),
      uid: `enemy_${id}_${i}`,
    });
  });

  targetEnemyIndex = 0;
  targetHeroIndex = 0;
  partySP = 3;
  ultimateQueue = [];
  counterQueue = [];
  suspendedEntity = null;
  activeEntity = null;
  isInputPhase = false;
  isInterceptionTurn = false;
  isActionAnimating = false;
  selectedAction = null;
  currentTurnTotalDamage = 0;
  currentTurnTotalHits = 0;

  document.getElementById("hero-squad-container").innerHTML = "";
  document.getElementById("enemy-squad-container").innerHTML = "";

  // Clear the battle log text so it's fresh for the new fight
  const logEl = document.getElementById("battle-log");
  if (logEl) logEl.innerHTML = "";

  battleScreen.style.display = "block";

  // Check if anyone got a shield during the start phase and play the VFX!
  playerSquad.forEach((hero, index) => {
    if (hero.shield > 0) {
      setTimeout(() => {
        playVisualEffect(`hero-card-${index}`, "shield", hero.shield);
      }, 500); // Wait half a second after the screen loads
    }
  });

  showVoiceline("SYSTEM", "SIMULATION START.");
  playSFX("boot");
  advanceTurn();
}

// --- ⏳ ACTION VALUE TURN ENGINE ---
function advanceTurn() {
  playerSquad = playerSquad.filter((h) => h.hp > 0);
  enemySquad = enemySquad.filter((e) => e.hp > 0);

  if (playerSquad.length === 0) {
    alert("/// CRITICAL_FAILURE: DEFEAT.");
    showMainMenu();
    return;
  }
  if (enemySquad.length === 0) {
    alert("/// SIMULATION_COMPLETE: VICTORY.");
    showMainMenu();
    return;
  }

  document
    .querySelectorAll(".enemy-attacking")
    .forEach((el) => el.classList.remove("enemy-attacking"));

  let allFighters = [...playerSquad, ...enemySquad];
  allFighters.sort((a, b) => {
    if (a.av === b.av) return a.isHero ? -1 : 1;
    return a.av - b.av;
  });

  activeEntity = allFighters[0];
  let avToSubtract = activeEntity.av;

  if (avToSubtract > 0) {
    allFighters.forEach((f) => (f.av -= avToSubtract));
  }

  renderQueue();

  if (activeEntity.isHero) {
    if (targetEnemyIndex >= enemySquad.length)
      targetEnemyIndex = Math.max(0, enemySquad.length - 1);
    targetHeroIndex = playerSquad.indexOf(activeEntity);

    if (activeEntity.shield > 0 && activeEntity.shieldSource === "march") {
      const march = playerSquad.find((h) => h.id === "march" && h.eidolon >= 6);
      if (march) {
        const heal = Math.floor(activeEntity.baseHp * 0.04 + 106);
        activeEntity.hp = Math.min(activeEntity.baseHp, activeEntity.hp + heal);

        const hIdx = playerSquad.indexOf(activeEntity);
        playVisualEffect(`hero-card-${hIdx}`, "heal", heal);
        triggerAnimation(
          document.getElementById(`hero-card-${hIdx}`),
          "heal-flash",
        );
      }
    }

    if (activeEntity.lightCone && activeEntity.lightCone.onTurnStart) {
      activeEntity.lightCone.onTurnStart(activeEntity);
    }

    if (activeEntity.shieldDuration > 0) {
      activeEntity.shieldDuration--;
      if (activeEntity.shieldDuration === 0) {
        activeEntity.shield = 0;
        activeEntity.shieldSource = null;
        if (activeEntity.shieldAggroMod) {
          activeEntity.aggroModifier -= activeEntity.shieldAggroMod;
          activeEntity.shieldAggroMod = 0;
        }
      }
    }

    if (activeEntity.state.lockOnTurns > 0) {
      activeEntity.state.lockOnTurns--;
      if (activeEntity.state.lockOnTurns === 0) {
        if (activeEntity.vulnerabilities)
          activeEntity.vulnerabilities.universal -= 0.1;
      }
    }

    if (activeEntity.onTurnStart) activeEntity.onTurnStart();

    selectedAction = null;
    isInputPhase = true;
    isActionAnimating = false;
    toggleButtons(false);
    updateUI();
  } else {
    isInputPhase = false;
    isActionAnimating = true;
    toggleButtons(true);
    updateUI();

    if (activeEntity.onTurnStart) activeEntity.onTurnStart();
    const eIndex = enemySquad.indexOf(activeEntity);

    // Tick down slows
    if (activeEntity.state.slowTurns > 0) {
      activeEntity.state.slowTurns--;
      if (activeEntity.state.slowTurns === 0)
        activeEntity.spd = activeEntity.baseSpd;
    }

    if (activeEntity.state.kafkaE1Turns > 0) {
      activeEntity.state.kafkaE1Turns--;
      if (
        activeEntity.state.kafkaE1Turns === 0 &&
        activeEntity.vulnerabilities
      ) {
        activeEntity.vulnerabilities.dot -= 0.3;
      }
    }

    // ✨ E2 & E4 PREP: Check Kafka's status for the current squad
    const isKafkaE2Active = playerSquad.some(
      (h) => h.id === "kafka" && h.hp > 0 && h.eidolon >= 2,
    );
    const kafkaEntity = playerSquad.find((h) => h.id === "kafka" && h.hp > 0);

    let isDeadFromDoT = false;

    // -- BREAK DEBUFF TICK BLOCK --
    if (activeEntity.state.breakDebuff) {
      const debuff = activeEntity.state.breakDebuff;
      let dmg = 0;
      let effectName = "";

      if (debuff.type === "wind") {
        dmg = debuff.baseTickDamage * debuff.stacks;
        effectName = "WIND SHEAR";
      } else if (debuff.type === "quantum") {
        dmg = Math.floor(
          0.6 *
            debuff.stacks *
            debuff.snapshot.levelMult *
            debuff.snapshot.maxToughnessMult *
            debuff.snapshot.commonMult,
        );
        effectName = "ENTANGLEMENT";
      } else if (debuff.type === "physical") {
        dmg = debuff.tickDamage;
        effectName = "BLEED";
      } else if (debuff.type === "fire") {
        dmg = debuff.tickDamage;
        effectName = "BURN";
      } else if (debuff.type === "lightning") {
        dmg = debuff.tickDamage;
        effectName = "SHOCK";
      } else if (debuff.type === "ice") {
        dmg = debuff.tickDamage;
        effectName = "FREEZE";
        activeEntity.state.isFrozen = true;
      }

      if (isKafkaE2Active) dmg = Math.floor(dmg * 1.25);

      if (dmg > 0) {
        activeEntity.hp = Math.max(0, activeEntity.hp - dmg);
        playVisualEffect(
          `enemy-card-${eIndex}`,
          "dmg",
          dmg,
          false,
          debuff.type,
        );
        showVoiceline(
          "SYSTEM",
          `${activeEntity.name.toUpperCase()} TOOK ${dmg} ${effectName} DAMAGE!`,
        );
        triggerAnimation(
          document.getElementById(`enemy-card-${eIndex}`),
          "shake",
        );
        renderSquad(); // Update HP bar immediately
      }

      debuff.duration--;
      if (debuff.duration <= 0) {
        // ✨ NEW: Restore speed when Imprisonment wears off
        if (debuff.type === "imaginary") {
          activeEntity.spd = activeEntity.baseSpd;
          // (If Dan Heng's slow is somehow still active, re-apply it)
          if (activeEntity.state.slowTurns > 0) {
            activeEntity.spd = activeEntity.baseSpd * 0.88;
          }
        }
        activeEntity.state.breakDebuff = null;
      }

      if (activeEntity.hp <= 0) isDeadFromDoT = true;
    }

    if (
      activeEntity.state.customDoTs &&
      activeEntity.state.customDoTs.length > 0
    ) {
      activeEntity.state.customDoTs.forEach((dot) => {
        let dmg = dot.tickDamage;

        // ✨ E2 BUFF: Boost the DoT damage by 25% before subtracting HP
        if (isKafkaE2Active) dmg = Math.floor(dmg * 1.25);

        if (dmg > 0) {
          activeEntity.hp = Math.max(0, activeEntity.hp - dmg);
          playVisualEffect(`enemy-card-${eIndex}`, "dmg", dmg, false, dot.type);
          showVoiceline(
            "SYSTEM",
            `${activeEntity.name.toUpperCase()} TOOK ${dmg} ${dot.name} DAMAGE!`,
          );
          triggerAnimation(
            document.getElementById(`enemy-card-${eIndex}`),
            "shake",
          );

          // ✨ E4 ENERGY: Give Kafka 2 Energy when her specific Shock deals damage
          if (
            dot.source === "kafka_shock" &&
            kafkaEntity &&
            kafkaEntity.eidolon >= 4
          ) {
            kafkaEntity.energy = Math.min(
              kafkaEntity.maxEnergy,
              kafkaEntity.energy + 2,
            );
            // Optional: You can call updateUI() here if you want her energy bar to instantly fill up!
          }

          renderSquad();
        }
        dot.duration--;
      });
      activeEntity.state.customDoTs = activeEntity.state.customDoTs.filter(
        (d) => d.duration > 0,
      );
      if (activeEntity.hp <= 0) isDeadFromDoT = true;
    }

    if (isDeadFromDoT) {
      document.getElementById(`enemy-card-${eIndex}`).classList.add("is-dead");
      setTimeout(() => finishAction(), 1000);
      return;
    }

    if (activeEntity.isBroken) {
      showVoiceline(
        "SYSTEM",
        `${activeEntity.name.toUpperCase()} RECOVERED FROM BREAK.`,
      );
      activeEntity.isBroken = false;
      activeEntity.toughness = activeEntity.maxToughness;
      updateUI();
    }

    // ✨ NEW: If Frozen, they skip the attack phase but advance 50%
    if (activeEntity.state.isFrozen) {
      showVoiceline(
        "SYSTEM",
        `${activeEntity.name.toUpperCase()} IS THAWING...`,
      );
      activeEntity.state.isFrozen = false;

      // 50% Action Advance (Their AV for the next turn is halved!)
      activeEntity.av = (10000 / activeEntity.spd) * 0.5;

      updateUI();
      setTimeout(() => finishAction(), 1000);
      return;
    }

    if (isDeadFromDoT) {
      document.getElementById(`enemy-card-${eIndex}`).classList.add("is-dead");
      setTimeout(() => finishAction(), 1000);
      return;
    }

    // ✨ NEW: Reboot broken status without skipping the turn
    if (activeEntity.isBroken) {
      showVoiceline(
        "SYSTEM",
        `${activeEntity.name.toUpperCase()} RECOVERED FROM BREAK.`,
      );
      activeEntity.isBroken = false;
      activeEntity.toughness = activeEntity.maxToughness;
      updateUI();
    }

    // ✨ NEW: If Frozen, they skip the attack phase!
    if (activeEntity.state.isFrozen) {
      showVoiceline(
        "SYSTEM",
        `${activeEntity.name.toUpperCase()} IS THAWING...`,
      );
      activeEntity.state.isFrozen = false;
      activeEntity.av = 10000 / activeEntity.spd;
      setTimeout(() => finishAction(), 1000);
      return;
    }

    const enemyCard = document.getElementById(`enemy-card-${eIndex}`);
    if (enemyCard) {
      enemyCard.classList.add("enemy-attacking");
      playSFX("hover");
    }
    setTimeout(() => executeEnemyTurn(activeEntity, eIndex), 1000);
  }
}

function finishAction() {
  isActionAnimating = false;

  const heroesBefore = playerSquad.length;
  const enemiesBefore = enemySquad.length;

  // ✨ FIX: Immediately clear dead fighters from the field so they don't linger!
  playerSquad = playerSquad.filter((h) => h.hp > 0);
  enemySquad = enemySquad.filter((e) => e.hp > 0);

  // Reset target cursors to prevent out-of-bounds errors if the array shrank
  if (targetEnemyIndex >= enemySquad.length) {
    targetEnemyIndex = Math.max(0, enemySquad.length - 1);
  }
  if (targetHeroIndex >= playerSquad.length) {
    targetHeroIndex = Math.max(0, playerSquad.length - 1);
  }

  // Force the UI to physically delete the dead cards
  if (
    enemySquad.length !== enemiesBefore ||
    playerSquad.length !== heroesBefore
  ) {
    renderHeroSquad();
    renderSquad();
    renderQueue();
  }

  processUltimateQueue();
}

function processUltimateQueue() {
  const livingHeroes = playerSquad.filter((h) => h.hp > 0);
  const livingEnemies = enemySquad.filter((e) => e.hp > 0);

  if (livingHeroes.length === 0 || livingEnemies.length === 0) {
    suspendedEntity = null;
    ultimateQueue = [];
    advanceTurn();
    return;
  }

  if (ultimateQueue.length === 0) {
    isInterceptionTurn = false;
    if (suspendedEntity) {
      if (suspendedEntity.hp > 0) {
        activeEntity = suspendedEntity;
        suspendedEntity = null;
        isInputPhase = true;
        isActionAnimating = false;
        selectedAction = null;
        updateUI();
      } else {
        suspendedEntity = null;
        advanceTurn();
      }
    } else {
      advanceTurn();
    }
    return;
  }

  // ✨ FIX: Force remove the "active/attacking" visual state from enemies when an ultimate interrupts!
  document
    .querySelectorAll(".enemy-attacking")
    .forEach((el) => el.classList.remove("enemy-attacking"));

  // Safely suspend only if it's currently a Hero's turn
  if (
    !suspendedEntity &&
    activeEntity &&
    !activeEntity.isUltQueued &&
    !isInterceptionTurn
  ) {
    if (activeEntity.isHero) {
      suspendedEntity = activeEntity;
    }
  }

  const ultHero = ultimateQueue.shift();
  ultHero.isUltQueued = false;

  if (ultHero.hp <= 0) {
    processUltimateQueue();
    return;
  }

  const ui = ultHero.getButtonUI();

  const isInstant =
    ui.ult.targetType === "enhance" || ui.ult.targetType === "self";

  isInterceptionTurn = true;
  activeEntity = ultHero;

  if (isInstant) {
    isActionAnimating = true;
    isInputPhase = false;
    updateUI();
    executePlayerAction("ultimate");
  } else {
    isActionAnimating = false;
    isInputPhase = true;
    selectedAction = "ultimate";
    updateUI();
  }
}

export function queueUltimate(hero) {
  if (hero.hp <= 0 || hero.energy < (hero.getButtonUI().ult.costEN || 120))
    return;
  if (hero.isUltQueued) return;

  hero.isUltQueued = true;
  hero.energy -= hero.getButtonUI().ult.costEN || 120;
  ultimateQueue.push(hero);

  playSFX("hover");

  renderHeroSquad();
  renderQueue();

  if (isInputPhase && !isActionAnimating) {
    isInputPhase = false;
    processUltimateQueue();
  }
}

function executeEnemyTurn(enemy, i) {
  const alive = playerSquad
    .map((h, idx) => ({ h, idx }))
    .filter((d) => d.h.hp > 0);
  const aliveEnemies = enemySquad.filter((e) => e.hp > 0); // ✨ NEW
  if (alive.length === 0) return;

  // ✨ UPDATED: Pass the living arrays into the AI action
  const move = enemy.getAIAction
    ? enemy.getAIAction(
        aliveEnemies,
        alive.map((a) => a.h),
      )
    : {
        name: "STRIKE",
        type: "single",
        multiplier: 1.0,
        energyGain: 5,
        vfx: "fx-strike-normal",
      };

  const PATH_AGGRO = {
    hunt: 3,
    erudition: 3,
    harmony: 4,
    nihility: 4,
    abundance: 4,
    remembrance: 4,
    elation: 4,
    destruction: 5,
    preservation: 6,
  };

  let mainTargetData = alive[0];

  // ✨ NEW: AGGRO OVERRIDE (Lock-On System)
  const lockedOnTargets = alive.filter((t) => t.h.state.lockOnTurns > 0);
  if (lockedOnTargets.length > 0 && !enemy.isElite && move.type !== "all") {
    // Force enemies to attack the locked-on target
    mainTargetData =
      lockedOnTargets[Math.floor(Math.random() * lockedOnTargets.length)];
  } else {
    // Normal Aggro Math (Run this only if no one is locked on)
    let totalAggro = 0;
    const aggroMap = alive.map((t) => {
      const baseAggro = t.h.baseAggro || PATH_AGGRO[t.h.path] || 4;
      const currentAggro = baseAggro * (1 + (t.h.aggroModifier || 0));
      totalAggro += currentAggro;
      return { ...t, currentAggro };
    });

    let aggroRoll = Math.random() * totalAggro;
    for (let t of aggroMap) {
      if (aggroRoll < t.currentAggro) {
        mainTargetData = t;
        break;
      }
      aggroRoll -= t.currentAggro;
    }
  }

  let targets = [mainTargetData];

  if (move.type === "blast") {
    const mainIdx = playerSquad.indexOf(mainTargetData.h);
    if (mainIdx > 0 && playerSquad[mainIdx - 1].hp > 0)
      targets.push({ h: playerSquad[mainIdx - 1], idx: mainIdx - 1 });
    if (mainIdx < playerSquad.length - 1 && playerSquad[mainIdx + 1].hp > 0)
      targets.push({ h: playerSquad[mainIdx + 1], idx: mainIdx + 1 });
  }

  playSFX("enemyHit");

  let heroesTriggeredCounters = new Set();

  targets.forEach((t) => {
    let hadShield = t.h.shield > 0;
    const result = calculateDamage(
      enemy,
      t.h,
      move.multiplier,
      0,
      alive.length,
    );
    let originalDmg = result.damage;
    let dmg = originalDmg;

    if (hadShield) {
      const abs = Math.min(t.h.shield, dmg);
      t.h.shield -= abs;
      dmg -= abs;

      if (t.h.shield <= 0 && t.h.shieldAggroMod) {
        t.h.aggroModifier -= t.h.shieldAggroMod;
        t.h.shieldAggroMod = 0;
        t.h.shieldDuration = 0;
      }

      playerSquad.forEach((squadMember) => {
        if (
          squadMember.hp > 0 &&
          squadMember.onAllyHit &&
          !heroesTriggeredCounters.has(squadMember.uid)
        ) {
          const counterMove = squadMember.onAllyHit(t.h.id, i);
          if (counterMove) {
            counterQueue.push({
              hero: squadMember,
              move: counterMove,
              targetIdx: i,
            });
            heroesTriggeredCounters.add(squadMember.uid);
          }
        }
      });
    }

    t.h.hp = Math.max(t.h.hp - dmg, 0);
    if (move.energyGain)
      t.h.energy = Math.min(t.h.maxEnergy, t.h.energy + move.energyGain);

    if (move.onHit) move.onHit(t.h, true, playerSquad);

    playVisualEffect(
      `hero-card-${t.idx}`,
      "dmg",
      originalDmg,
      result.isCrit,
      enemy.type,
    );
    playVisualEffect(`hero-card-${t.idx}`, move.vfx);
    triggerAnimation(document.getElementById(`hero-card-${t.idx}`), "shake");
  });

  renderHeroSquad();
  enemy.av = 10000 / enemy.spd;
  renderQueue();
  setTimeout(() => processCounterQueue(), 1000);
}

// --- ⚔️ RENDERING & UI ---
function toggleButtons(disabled) {
  const currentHero = activeEntity && activeEntity.isHero ? activeEntity : null;
  if (!currentHero) {
    btnBasic.disabled = true;
    btnSkill.disabled = true;
    btnUlt.disabled = true;
    return;
  }
  btnBasic.disabled = disabled || !isInputPhase;
  btnSkill.disabled = disabled || partySP < 1 || !isInputPhase;
  const ultCost = currentHero.getButtonUI().ult.costEN || 120;
  btnUlt.disabled = currentHero.energy < ultCost || currentHero.isUltQueued;
}

function updateUI() {
  const currentHero = activeEntity && activeEntity.isHero ? activeEntity : null;

  if (enemySquad[targetEnemyIndex] && enemySquad[targetEnemyIndex].hp <= 0) {
    const aliveIdx = enemySquad.findIndex((e) => e.hp > 0);
    if (aliveIdx !== -1) targetEnemyIndex = aliveIdx;
  }

  enemySquad.forEach((e) => {
    e.previewToughnessDmg = 0;
    e.previewBroken = false;
    e.previewAvDelay = 0;
  });

  if (currentHero) {
    const ui = currentHero.getButtonUI();

    btnBasic.innerHTML = `<div class="btn-shortcut">Q</div> ${ui.basic.text}`;
    btnSkill.innerHTML = `<div class="btn-shortcut">E</div> ${ui.skill.text}`;
    btnUlt.innerHTML = `<div class="btn-shortcut">R</div> ${ui.ult.text}`;

    if (isInterceptionTurn && !currentHero.state.isEnhanced) {
      selectedAction = "ultimate";
    }

    let previewCost = 0;
    let previewGain = 0;
    [btnBasic, btnSkill, btnUlt].forEach((b) => b.classList.remove("selected"));

    if (selectedAction) {
      const actionKey = selectedAction === "ultimate" ? "ult" : selectedAction;
      const actionData = ui[actionKey];
      if (actionData) {
        previewCost =
          actionData.costSP !== undefined
            ? actionData.costSP
            : selectedAction === "skill"
              ? 1
              : 0;
        previewGain =
          actionData.genSP !== undefined
            ? actionData.genSP
            : selectedAction === "basic"
              ? 1
              : 0;

        if (selectedAction === "basic") btnBasic.classList.add("selected");
        if (selectedAction === "skill") btnSkill.classList.add("selected");
        if (selectedAction === "ultimate") btnUlt.classList.add("selected");
      }

      const stateSnapshot = JSON.stringify(currentHero.state);
      const mockMove = currentHero.useAction(selectedAction);
      currentHero.state = JSON.parse(stateSnapshot);

      if (
        mockMove.type === "single" ||
        mockMove.type === "blast" ||
        mockMove.type === "all"
      ) {
        let tIndices = [];
        if (mockMove.type === "single")
          tIndices.push({ i: targetEnemyIndex, main: true });
        else if (mockMove.type === "all")
          enemySquad.forEach((_, i) => tIndices.push({ i, main: true }));
        else if (mockMove.type === "blast") {
          if (targetEnemyIndex > 0)
            tIndices.push({ i: targetEnemyIndex - 1, main: false });
          tIndices.push({ i: targetEnemyIndex, main: true });
          if (targetEnemyIndex < enemySquad.length - 1)
            tIndices.push({ i: targetEnemyIndex + 1, main: false });
        }

        tIndices.forEach((t) => {
          if (t.i >= 0 && t.i < enemySquad.length) {
            const e = enemySquad[t.i];
            if (
              e.hp > 0 &&
              e.weaknesses.includes(currentHero.type) &&
              e.toughness > 0
            ) {
              const dmg = t.main
                ? mockMove.toughnessDamage || mockMove.toughnessMain || 10
                : mockMove.toughnessAdj || 10;
              e.previewToughnessDmg = dmg;
              if (e.toughness - dmg <= 0) {
                e.previewBroken = true;
                e.previewAvDelay = (10000 / e.spd) * 0.25;
              }
            }
          }
        });
      }
    }

    if (isInterceptionTurn) {
      if (currentHero.state.isEnhanced) {
        btnBasic.disabled = false;
        btnSkill.disabled = partySP < (ui.skill.costSP || 0);
        btnUlt.disabled = true;
      } else {
        btnBasic.disabled = true;
        btnSkill.disabled = true;
        btnUlt.disabled = false;
        btnUlt.classList.add("selected");
      }
    } else {
      const ultCost = ui.ult.costEN || 120;
      btnUlt.disabled = currentHero.energy < ultCost || currentHero.isUltQueued;
      btnSkill.disabled = partySP < (ui.skill.costSP || 1) || !isInputPhase;
      btnBasic.disabled = !isInputPhase;
    }

    renderSP(previewCost, previewGain);
  } else {
    [btnBasic, btnSkill, btnUlt].forEach((b) => b.classList.remove("selected"));
    renderSP(0, 0);
  }

  renderHeroSquad();
  renderSquad();
  renderQueue();
}

function renderQueue() {
  const container = document.getElementById("turn-queue");
  if (!container) return;

  let allFighters = [...playerSquad, ...enemySquad].filter((f) => f.hp > 0);
  if (allFighters.length === 0) return;

  const currentHero = activeEntity && activeEntity.isHero ? activeEntity : null;
  const ui = currentHero ? currentHero.getButtonUI() : null;
  const actionKey = selectedAction === "ultimate" ? "ult" : selectedAction;
  const targetType =
    selectedAction && ui && ui[actionKey] ? ui[actionKey].targetType : "single";

  let mainTargetUid = null;
  let adjTargetUids = [];

  if (
    currentHero &&
    selectedAction &&
    targetType !== "ally" &&
    targetType !== "enhance"
  ) {
    if (enemySquad[targetEnemyIndex])
      mainTargetUid = enemySquad[targetEnemyIndex].uid;

    if (targetType === "blast") {
      if (targetEnemyIndex > 0 && enemySquad[targetEnemyIndex - 1])
        adjTargetUids.push(enemySquad[targetEnemyIndex - 1].uid);
      if (
        targetEnemyIndex < enemySquad.length - 1 &&
        enemySquad[targetEnemyIndex + 1]
      )
        adjTargetUids.push(enemySquad[targetEnemyIndex + 1].uid);
    } else if (targetType === "all") {
      enemySquad.forEach((e, i) => {
        if (i !== targetEnemyIndex) adjTargetUids.push(e.uid);
      });
    }
  }

  let simFighters = allFighters.map((f) => ({
    ...f,
    simAv: f.av,
    previewBroken: f.previewBroken,
  }));
  let queue = [];
  let elapsedAV = 0;
  let seenCounts = {};

  const isPreviewing =
    isInputPhase && selectedAction !== null && !isInterceptionTurn;
  const targetLength = allFighters.length + (isPreviewing ? 1 : 0);

  for (let i = 0; queue.length < targetLength && i < 50; i++) {
    simFighters.sort((a, b) =>
      a.simAv === b.simAv ? (a.isHero ? -1 : 1) : a.simAv - b.simAv,
    );
    let next = simFighters[0];
    let step = next.simAv;

    if (!seenCounts[next.uid]) seenCounts[next.uid] = 0;
    seenCounts[next.uid]++;
    elapsedAV += step;
    simFighters.forEach((f) => (f.simAv -= step));
    next.simAv += 10000 / next.spd;

    if (seenCounts[next.uid] === 1) {
      queue.push({
        uid: next.uid,
        imageSrc: next.imageSrc,
        isHero: next.isHero,
        av: Math.ceil(elapsedAV),
        isPreview: false,
        isBrokenPreview: !next.isHero && next.previewBroken,
      });
    } else if (
      seenCounts[next.uid] === 2 &&
      activeEntity &&
      next.uid === activeEntity.uid &&
      isPreviewing
    ) {
      queue.push({
        uid: next.uid + "_preview",
        imageSrc: next.imageSrc,
        isHero: next.isHero,
        av: Math.ceil(elapsedAV),
        isPreview: true,
      });
    }
  }

  let finalQueue = [];
  if (isInterceptionTurn && activeEntity) {
    finalQueue.push({
      uid: activeEntity.uid + "_ult_active",
      imageSrc: activeEntity.imageSrc,
      isHero: true,
      isUlt: true,
      av: 0,
    });
    ultimateQueue.forEach((h) =>
      finalQueue.push({
        uid: h.uid + "_ult",
        imageSrc: h.imageSrc,
        isHero: true,
        isUlt: true,
        av: 0,
      }),
    );
    if (queue.length > 0) finalQueue.push(queue[0]);
    for (let i = 1; i < queue.length; i++) finalQueue.push(queue[i]);
  } else {
    if (queue.length > 0) finalQueue.push(queue[0]);

    const counteringHero = playerSquad.find((h) => h.isCountering);
    if (counteringHero) {
      finalQueue.push({
        uid: counteringHero.uid + "_counter_active",
        imageSrc: counteringHero.imageSrc,
        isHero: true,
        isCounter: true,
        av: 0,
      });
    }
    if (typeof counterQueue !== "undefined") {
      counterQueue.forEach((c) => {
        finalQueue.push({
          uid: c.hero.uid + "_counter",
          imageSrc: c.hero.imageSrc,
          isHero: true,
          isCounter: true,
          av: 0,
        });
      });
    }

    ultimateQueue.forEach((h) =>
      finalQueue.push({
        uid: h.uid + "_ult",
        imageSrc: h.imageSrc,
        isHero: true,
        isUlt: true,
        av: 0,
      }),
    );

    for (let i = 1; i < queue.length; i++) finalQueue.push(queue[i]);
  }

  while (container.children.length < finalQueue.length)
    container.appendChild(document.createElement("div"));
  while (container.children.length > finalQueue.length)
    container.removeChild(container.lastChild);

  finalQueue.forEach((f, idx) => {
    const el = container.children[idx];
    el.className = "queue-item";

    if (el.dataset.uid !== f.uid) {
      triggerAnimation(el, "queue-shuffle");
      el.dataset.uid = f.uid;
      el.innerHTML = `<img src="${f.imageSrc}">${idx !== 0 && !f.isUlt && !f.isCounter ? `<div class="queue-av">${f.av}</div>` : ""}`;
    } else {
      let avBadge = el.querySelector(".queue-av");
      if (idx !== 0 && !f.isUlt && !f.isCounter) {
        if (!avBadge) {
          avBadge = document.createElement("div");
          avBadge.className = "queue-av";
          el.appendChild(avBadge);
        }
        avBadge.innerText = f.av;
      } else if (avBadge) avBadge.remove();
    }

    if (f.isHero) el.classList.add("queue-hero");
    else el.classList.add("queue-enemy");
    if (idx === 0) el.classList.add("queue-active");
    if (f.isUlt) el.classList.add("queue-ult-indicator");
    if (f.isCounter) el.classList.add("queue-counter-indicator");
    if (f.isPreview) el.classList.add("queue-preview");
    if (f.isBrokenPreview) el.classList.add("queue-broken-preview");
    if (f.uid === mainTargetUid) el.classList.add("queue-targeted");
    else if (adjTargetUids.includes(f.uid))
      el.classList.add("queue-targeted-adj");
  });
}

function renderHeroSquad() {
  const container = document.getElementById("hero-squad-container");
  const currentHero = activeEntity && activeEntity.isHero ? activeEntity : null;
  const ui = currentHero ? currentHero.getButtonUI() : null;
  const actionKey = selectedAction === "ultimate" ? "ult" : selectedAction;
  const targetType =
    selectedAction && ui && ui[actionKey] ? ui[actionKey].targetType : "single";

  if (container.children.length !== playerSquad.length) {
    container.innerHTML = "";
    playerSquad.forEach((hero, index) => {
      const card = document.createElement("div");
      card.id = `hero-card-${index}`;
      card.className = "character-card hero-theme";
      card.innerHTML = `<div class="portrait-frame"><img src="${hero.imageSrc}"></div>
        <div class="stats-box"><h2>${hero.name}</h2>
          <div class="bar-container">
            <div class="bar-fill hp-ghost"></div> <div class="bar-fill hp-fill"></div>
            <div class="shield-fill" style="display:none;"></div>
            <div class="bar-text"></div>
          </div>
          <div class="bar-container en-bar-cont" style="border-color:#ff007c">
            <div class="bar-fill en-ghost"></div> <div class="bar-fill en-fill"></div>
            <div class="bar-text"></div>
          </div>
          <div class="passive-track"></div>
        </div>`;
      card.onclick = () => {
        if (!isInputPhase || !selectedAction) return;
        const curHero =
          activeEntity && activeEntity.isHero ? activeEntity : null;
        if (
          curHero &&
          curHero.getButtonUI()[
            selectedAction === "ultimate" ? "ult" : selectedAction
          ]?.targetType === "ally"
        ) {
          targetHeroIndex = index;
          playSFX("hover");
          updateUI();
        }
      };
      container.appendChild(card);
    });
  }

  playerSquad.forEach((hero, index) => {
    const card = document.getElementById(`hero-card-${index}`);

    card.classList.toggle("is-acting", hero === activeEntity);
    card.classList.toggle(
      "is-ally-target",
      targetType === "ally" && index === targetHeroIndex,
    );

    // ✨ FIX: Add the "active" class for the targeted hero!
    card.classList.toggle(
      "active",
      targetType === "ally" && index === targetHeroIndex,
    );

    card.classList.remove("is-dimmed");

    // ✨ (Plus your new Lock-On UI from earlier!)
    card.classList.toggle("is-locked-on", !!(hero.state.lockOnTurns > 0));

    // ✨ HP UPDATE + GHOST
    const hpPct = (hero.hp / hero.baseHp) * 100;
    card.querySelector(".hp-fill").style.width = `${hpPct}%`;
    card.querySelector(".hp-ghost").style.width = `${hpPct}%`;
    card.querySelectorAll(".bar-text")[0].innerText = Math.floor(hero.hp);

    // ✨ EN UPDATE + GHOST
    const enPct = (hero.energy / hero.maxEnergy) * 100;
    card.querySelector(".en-fill").style.width = `${enPct}%`;
    card.querySelector(".en-ghost").style.width = `${enPct}%`;
    card.querySelectorAll(".bar-text")[1].innerText = Math.floor(hero.energy);

    // ✨ UI STATE TRIGGERS
    const ultCost = hero.getButtonUI().ult.costEN || 120;
    card.classList.toggle(
      "state-overdrive",
      hero.energy >= ultCost && !hero.isUltQueued,
    );
    card.classList.toggle("state-danger", hero.hp > 0 && hpPct <= 30);

    const sF = card.querySelector(".shield-fill");
    if (hero.shield > 0) {
      sF.style.display = "block";
      sF.style.width = `${Math.min((hero.shield / hero.baseHp) * 100, 100)}%`;
    } else sF.style.display = "none";

    const pTrack = card.querySelector(".passive-track");
    pTrack.innerHTML = "";
    if (hero.state && hero.state.maxCounters) {
      const availableCharges =
        hero.state.maxCounters - (hero.state.countersThisTurn || 0);
      for (let c = 0; c < hero.state.maxCounters; c++) {
        pTrack.appendChild(
          Object.assign(document.createElement("div"), {
            className: `passive-pip ${c < availableCharges ? "active" : ""}`,
          }),
        );
      }
    }

    const portraitFrame = card.querySelector(".portrait-frame");
    let ultBadge = portraitFrame.querySelector(".ult-ready-badge");
    if (!ultBadge) {
      ultBadge = document.createElement("div");
      ultBadge.className = "ult-ready-badge";
      ultBadge.innerHTML = "ULT";
      ultBadge.onclick = (e) => {
        e.stopPropagation();
        queueUltimate(hero);
      };
      portraitFrame.appendChild(ultBadge);
    }
    ultBadge.style.display =
      hero.energy >= (hero.getButtonUI().ult.costEN || 120) && !hero.isUltQueued
        ? "flex"
        : "none";
  });
}

function renderSquad() {
  const container = document.getElementById("enemy-squad-container");
  const currentHero = activeEntity && activeEntity.isHero ? activeEntity : null;
  const ui = currentHero ? currentHero.getButtonUI() : null;
  const actionKey = selectedAction === "ultimate" ? "ult" : selectedAction;
  const targetType =
    selectedAction && ui && ui[actionKey] ? ui[actionKey].targetType : "single";

  if (container.children.length !== enemySquad.length) {
    container.innerHTML = "";
    enemySquad.forEach((enemy, index) => {
      const card = document.createElement("div");
      card.id = `enemy-card-${index}`;
      card.className = "character-card enemy-theme";
      card.innerHTML = `<div class="portrait-frame"><img src="${enemy.imageSrc}"></div>
        <div class="stats-box">
          <div class="weakness-row">${enemy.weaknesses.map((w) => `<div class="weakness-icon type-${w}">${w[0].toUpperCase()}</div>`).join("")}</div>
          <h2>${enemy.name}</h2>
          <div class="bar-container toughness-container">
             <div class="bar-fill toughness-fill"></div>
             <div class="bar-fill toughness-preview"></div>
          </div>
          <div class="bar-container">
             <div class="bar-fill hp-ghost"></div> <div class="bar-fill hp-fill"></div>
          </div>
        </div>`;
      card.onclick = () => {
        if (enemy.hp <= 0) return; // 🚨 Prevent clicking dead enemies!
        if (!isInputPhase || !selectedAction || !activeEntity?.isHero) return;

        const curTargetType =
          activeEntity.getButtonUI()[
            selectedAction === "ultimate" ? "ult" : selectedAction
          ]?.targetType || "single";
        if (curTargetType !== "ally" && curTargetType !== "enhance") {
          targetEnemyIndex = index;
          playSFX("hover");
          updateUI();
        }
      };
      container.appendChild(card);
    });
  }

  enemySquad.forEach((enemy, index) => {
    const card = document.getElementById(`enemy-card-${index}`);
    if (!card) return;

    const isMain =
      selectedAction &&
      index === targetEnemyIndex &&
      targetType !== "enhance" &&
      targetType !== "ally" &&
      currentHero;
    const isAdj =
      selectedAction &&
      targetType === "blast" &&
      (index === targetEnemyIndex - 1 || index === targetEnemyIndex + 1);
    const isAll = selectedAction && targetType === "all" && currentHero;

    if (enemy.hp <= 0) {
      card.classList.add("is-dead");
      card.classList.remove(
        "is-targeted",
        "is-targeted-adj",
        "is-acting",
        "is-dimmed",
      );
    } else {
      card.style.display = "flex";
      card.classList.remove("is-dead");
      card.classList.toggle("is-acting", enemy === activeEntity);
      card.classList.toggle("is-targeted", Boolean(isMain || isAll));
      card.classList.toggle("is-targeted-adj", Boolean(isAdj));

      const isUninvolvedEnemy =
        selectedAction &&
        !isMain &&
        !isAdj &&
        !isAll &&
        targetType !== "ally" &&
        targetType !== "enhance";
      card.classList.toggle(
        "is-dimmed",
        Boolean(
          targetType === "ally" ||
          targetType === "enhance" ||
          isUninvolvedEnemy,
        ),
      );
    }

    const wIcons = card.querySelectorAll(".weakness-icon");
    wIcons.forEach((icon, idx) => {
      const isTargetedEnemy = isMain || isAdj || isAll;
      if (
        isTargetedEnemy &&
        currentHero &&
        enemy.weaknesses[idx] === currentHero.type
      ) {
        icon.classList.add("pulse-weakness");
      } else {
        icon.classList.remove("pulse-weakness");
      }
    });

    // ✨ JUICY HP UPDATE + GHOST BAR
    const eHpPct = (enemy.hp / enemy.baseHp) * 100;
    card.querySelector(".hp-fill").style.width = `${eHpPct}%`;
    const hpGhost = card.querySelector(".hp-ghost");
    if (hpGhost) hpGhost.style.width = `${eHpPct}%`;

    const tDmg = enemy.previewToughnessDmg || 0;
    const maxT = enemy.maxToughness || 1;
    const remaining = Math.max(enemy.toughness - tDmg, 0);
    const removing = Math.min(tDmg, enemy.toughness);

    card.querySelector(".toughness-fill").style.width =
      `${(remaining / maxT) * 100}%`;
    const previewBar = card.querySelector(".toughness-preview");
    if (removing > 0) {
      previewBar.style.display = "block";
      previewBar.style.width = `${(removing / maxT) * 100}%`;
      previewBar.style.left = `${(remaining / maxT) * 100}%`;
    } else previewBar.style.display = "none";

    card.classList.toggle("status-frozen", enemy.state.isFrozen);
    const img = card.querySelector("img");
    img.style.filter =
      enemy.isBroken && !enemy.state.isFrozen
        ? "brightness(0.5) sepia(1) hue-rotate(300deg)"
        : "";
  });
}

function renderSP(previewCost = 0, previewGain = 0) {
  const container = document.getElementById("sp-slots");
  container.innerHTML = "";
  for (let i = 1; i <= MAX_SP; i++) {
    const pip = document.createElement("div");
    pip.className = `sp-pip ${i <= partySP ? "active" : ""}`;
    if (previewCost > 0 && i > partySP - previewCost && i <= partySP)
      pip.classList.add("preview-spend");
    else if (previewGain > 0 && i > partySP && i <= partySP + previewGain)
      pip.classList.add("preview-gain");
    container.appendChild(pip);
  }
}

// --- ⚔️ ACTION HANDLING ---
function handleActionInput(type) {
  if (!isInputPhase || !type) return;
  const currentHero = activeEntity && activeEntity.isHero ? activeEntity : null;
  const isEnhanced = currentHero && currentHero.state.isEnhanced;

  if (type === "ultimate") {
    if (isInterceptionTurn && !isEnhanced) executePlayerAction("ultimate");
    else if (currentHero && !currentHero.isUltQueued && !isEnhanced)
      queueUltimate(currentHero);
    return;
  }

  if (isInterceptionTurn && !isEnhanced) return;

  if (selectedAction === type) {
    executePlayerAction(type);
  } else {
    selectedAction = type;
    playSFX("hover");
    updateUI();
  }
}

function executePlayerAction(actionType) {
  isInputPhase = false;
  const wasInterception = isInterceptionTurn;
  isInterceptionTurn = false;

  const currentHero = activeEntity;
  const move = currentHero.useAction(actionType);
  const heroIndex = playerSquad.indexOf(currentHero);

  isActionAnimating = true;
  toggleButtons(true);
  playSFX("attack");

  const uiData = currentHero.getButtonUI();
  const actionKey = actionType === "ultimate" ? "ult" : actionType;
  const actionName = uiData[actionKey].text;

  let actualCost = actionType === "skill" ? 1 : 0;
  if (uiData[actionKey].costSP !== undefined)
    actualCost = uiData[actionKey].costSP;
  if (move.costSP !== undefined) actualCost = move.costSP;

  let actualGen = actionType === "basic" ? 1 : 0;
  if (uiData[actionKey].genSP !== undefined)
    actualGen = uiData[actionKey].genSP;
  if (move.genSP !== undefined) actualGen = move.genSP;

  if (actualCost > 0) animateSP(`hero-card-${heroIndex}`, "spend");
  else if (actualGen > 0) animateSP(`hero-card-${heroIndex}`, "gain");

  partySP = Math.min(Math.max(partySP - actualCost + actualGen, 0), MAX_SP);
  currentHero.energy = Math.min(
    Math.max(
      currentHero.energy -
        (move.costEN ?? uiData[actionKey].costEN ?? 0) +
        (move.genEN ?? uiData[actionKey].genEN ?? 0),
      0,
    ),
    currentHero.maxEnergy,
  );

  window.playDetonateVFX = (target, dmg) => {
    const eIdx = enemySquad.indexOf(target);
    if (eIdx !== -1) {
      playVisualEffect(`enemy-card-${eIdx}`, "dmg", dmg, false, "lightning");

      playVisualEffect(`enemy-card-${eIdx}`, "detonated");
      document.body.classList.remove("fx-impact-frame");
      void document.body.offsetWidth;
      document.body.classList.add("fx-impact-frame");
      triggerAnimation(document.querySelector(".arena"), "arena-impact-zoom");
      playSFX("break");

      currentTurnTotalDamage += dmg;
      currentTurnTotalHits++;
      updateComboMeter();
    }
  };

  if (actionType !== "ultimate" && !wasInterception) {
    currentHero.av = 10000 / currentHero.spd;
    suspendedEntity = null;
  }

  renderSP(0, 0);
  playVisualEffect(`hero-card-${heroIndex}`, "skill-name", actionName);
  playSFX("skillPop");

  function proceedWithAction() {
    if (move.type === "enhance") {
      if (move.cinematic || move.vfx)
        playVisualEffect("battle-screen", move.cinematic || move.vfx);
      triggerAnimation(
        document.getElementById(`hero-card-${heroIndex}`),
        "heal-flash",
      );
      selectedAction = "skill";
      setTimeout(() => {
        isActionAnimating = false;
        isInputPhase = true;
        isInterceptionTurn = true;
        updateUI();
      }, 800);
      return;
    }

    if (move.type === "shield") {
      const targetHero = playerSquad[targetHeroIndex];

      if (targetHero.onReceiveAllyAbility) {
        targetHero.onReceiveAllyAbility();
      }

      if (targetHero.shieldAggroMod) {
        targetHero.aggroModifier -= targetHero.shieldAggroMod;
        targetHero.shieldAggroMod = 0;
      }

      targetHero.shield = move.shieldValue;
      targetHero.shieldDuration = move.duration;
      targetHero.shieldSource = currentHero.id;

      if (
        move.aggroModThreshold &&
        targetHero.hp / targetHero.baseHp >= move.aggroModThreshold
      ) {
        targetHero.aggroModifier += move.aggroModValue;
        targetHero.shieldAggroMod = move.aggroModValue;
      }

      playSFX("heal");
      triggerAnimation(
        document.getElementById(`hero-card-${targetHeroIndex}`),
        "heal-flash",
      );

      playVisualEffect(
        `hero-card-${targetHeroIndex}`,
        "shield",
        move.shieldValue,
      );

      selectedAction = null;
      setTimeout(() => finishAction(), 800);
      return;
    }

    let targets = [];
    if (move.type === "single" && enemySquad[targetEnemyIndex])
      targets.push({
        e: enemySquad[targetEnemyIndex],
        i: targetEnemyIndex,
        main: true,
      });
    else if (move.type === "all")
      enemySquad.forEach((e, i) => targets.push({ e, i, main: true }));
    else if (move.type === "blast") {
      if (targetEnemyIndex > 0 && enemySquad[targetEnemyIndex - 1])
        targets.push({
          e: enemySquad[targetEnemyIndex - 1],
          i: targetEnemyIndex - 1,
          main: false,
        });
      if (enemySquad[targetEnemyIndex])
        targets.push({
          e: enemySquad[targetEnemyIndex],
          i: targetEnemyIndex,
          main: true,
        });
      if (
        targetEnemyIndex < enemySquad.length - 1 &&
        enemySquad[targetEnemyIndex + 1]
      )
        targets.push({
          e: enemySquad[targetEnemyIndex + 1],
          i: targetEnemyIndex + 1,
          main: false,
        });
    }

    if (move.onActionStart) {
      move.onActionStart(currentHero, heroIndex);
      renderHeroSquad(); // Update his UI bar instantly before the attack lands!
    }

    if (move.cinematic) {
      playVisualEffect("battle-screen", move.cinematic);
    }

    const hits = move.hits || 1;
    let currentHitCount = 0;
    currentTurnTotalDamage = 0;
    currentTurnTotalHits = 0;

    function doHit() {
      if (
        targets.length > 0 &&
        currentHero.lightCone &&
        currentHero.lightCone.onAttack
      )
        currentHero.lightCone.onAttack(currentHero);

      let isHeavyHit = false;

      targets.forEach((t) => {
        if (t.e.hp <= 0) return;
        let justBroke = false;

        // Calculate the exact percentage of damage this specific hit should do
        let hitRatio = 1 / hits;
        if (move.hitSplit && move.hitSplit.length === hits) {
          hitRatio = move.hitSplit[currentHitCount];
        }

        const isWeak = t.e.weaknesses.includes(currentHero.type);

        // Apply the hit ratio to the damage multiplier
        let baseMult = t.main
          ? move.multiplier || move.multiplierMain
          : move.multiplierAdj;
        if (typeof baseMult === "function") baseMult = baseMult(t.e);

        const livingEnemiesCount = enemySquad.filter((e) => e.hp > 0).length;

        const result = calculateDamage(
          currentHero,
          t.e,
          baseMult * hitRatio,
          0,
          livingEnemiesCount,
        );

        const dmg = result.damage;

        const preHp = t.e.hp;

        // HP is now only subtracted ONCE per hit!
        t.e.hp = Math.max(t.e.hp - dmg, 0);
        currentTurnTotalDamage += dmg;

        // ✨ NEW: ARCADE COMBO METER TRIGGER!
        if (dmg > 0) {
          currentTurnTotalHits++;
          updateComboMeter();
        }

        // Trigger Quantum Stacks
        if (
          t.e.state.breakDebuff &&
          t.e.hp > 0 &&
          t.e.state.breakDebuff.type === "quantum"
        ) {
          t.e.state.breakDebuff.stacks = Math.min(
            5,
            t.e.state.breakDebuff.stacks + 1,
          );
        }

        if (currentHero.onAttackTarget) {
          const heal = currentHero.onAttackTarget(t.e, move, result);
          if (heal > 0) {
            currentHero.hp = Math.min(
              currentHero.baseHp,
              currentHero.hp + heal,
            );
            triggerAnimation(
              document.getElementById(`hero-card-${heroIndex}`),
              "heal-flash",
            );
            playVisualEffect(`hero-card-${heroIndex}`, "heal", heal);
          }
        }

        const isDead = t.e.hp <= 0 && preHp > 0;
        if (isDead) playSFX("death");

        if (isDead && currentHero.onKill) {
          const killMsg = currentHero.onKill(t.e, move);
          if (killMsg) showVoiceline(currentHero.name, killMsg);
        }

        if (isWeak && t.e.toughness > 0) {
          // Apply the exact same hit ratio to the Toughness Damage!
          const rawToughness = t.main
            ? move.toughnessDamage || move.toughnessMain || 10
            : move.toughnessAdj || 10;
          const tDmg = rawToughness * hitRatio;

          t.e.toughness = Math.max(t.e.toughness - tDmg, 0);

          if (t.e.toughness === 0) {
            t.e.isBroken = true;
            justBroke = true;
            playSFX("break");

            // ✨ NEW: PARTICLE VOXEL SHATTER!
            playVisualEffect(
              `enemy-card-${t.i}`,
              "shatter",
              "",
              false,
              currentHero.type,
            );

            // ... (Apply Break Debuff and Delay)
            const debuff = calculateBreakDebuff(currentHero, t.e);
            t.e.state.breakDebuff = debuff;

            if (currentHero.type === "imaginary") {
              t.e.av +=
                (10000 / t.e.spd) * (0.3 + (currentHero.breakEffect || 0));
              t.e.spd = t.e.baseSpd * 0.9;
            } else if (currentHero.type === "quantum") {
              t.e.av +=
                (10000 / t.e.spd) * (0.2 + (currentHero.breakEffect || 0));
            } else {
              t.e.av += (10000 / t.e.spd) * 0.25;
            }

            if (currentHero.lightCone && currentHero.lightCone.onBreak) {
              currentHero.lightCone.onBreak(currentHero);
            }

            playVisualEffect(
              `enemy-card-${t.i}`,
              "break",
              "",
              false,
              currentHero.type,
            );

            if (currentHero.onTriggerBreak) {
              showVoiceline(currentHero.name, currentHero.onTriggerBreak());
            }

            const breakDmg = calculateBreakDamage(currentHero, t.e);
            t.e.hp = Math.max(t.e.hp - breakDmg, 0);
            currentTurnTotalDamage += breakDmg;

            // ✨ NEW: ADD BREAK DAMAGE TO COMBO METER!
            if (breakDmg > 0) {
              currentTurnTotalHits++;
              updateComboMeter();
            }

            setTimeout(() => {
              playVisualEffect(
                `enemy-card-${t.i}`,
                "dmg",
                breakDmg,
                false,
                currentHero.type,
                true,
              );
            }, 300);
          }
        }

        if (currentHitCount === hits - 1) {
          if (move.chanceToFreeze && Math.random() < move.chanceToFreeze)
            t.e.state.isFrozen = true;
          if (move.onHit) move.onHit(t.e, t.main, playerSquad);

          if (currentHero.lightCone && currentHero.lightCone.onHit) {
            currentHero.lightCone.onHit(currentHero, t.e);
          }
        }

        playVisualEffect(
          `enemy-card-${t.i}`,
          "dmg",
          dmg,
          result.isCrit,
          currentHero.type,
        );
        playVisualEffect(
          `enemy-card-${t.i}`,
          (t.main ? move.vfx || move.vfxMain : move.vfxAdj || move.vfx) ||
            "fx-strike-normal",
        );

        if (result.isCrit || justBroke) isHeavyHit = true;

        if (result.isCrit || justBroke) {
          document.body.classList.remove("fx-impact-frame");
          void document.body.offsetWidth;
          document.body.classList.add("fx-impact-frame");

          triggerAnimation(
            document.getElementById(`enemy-card-${t.i}`),
            "glitch-hit",
          );

          triggerAnimation(
            document.querySelector(".arena"),
            "arena-impact-zoom",
          );
          playSFX("break");
        } else {
          triggerAnimation(
            document.getElementById(`enemy-card-${t.i}`),
            "shake",
          );
        }

        // Spawn "OVERKILL" if it deals massive damage (>40% base HP) or is a heavy lethal blow!
        if (dmg >= t.e.baseHp * 0.4 || (isDead && isHeavyHit)) {
          playVisualEffect(`enemy-card-${t.i}`, "overkill");
        }
      }); // <-- End of the forEach loop

      updateTotalDamage(currentTurnTotalDamage);
      renderSquad();
      renderHeroSquad();

      currentHitCount++;

      // ✨ HIT-STOP TIMING: Can now safely read isHeavyHit!
      let baseInterHitDelay = 100 + Math.random() * 200;
      let hitStopDelay = isHeavyHit ? 350 : baseInterHitDelay;

      if (currentHitCount < hits) {
        setTimeout(doHit, hitStopDelay);
      } else {
        if (currentHero.onActionEnd) currentHero.onActionEnd();
        selectedAction = null;
        renderQueue();

        if (
          actionType === "basic" &&
          enemySquad[targetEnemyIndex] &&
          enemySquad[targetEnemyIndex].hp > 0
        ) {
          playerSquad.forEach((ally) => {
            if (
              ally.uid !== currentHero.uid &&
              ally.onAllyBasicATK &&
              ally.hp > 0
            ) {
              const fuaMove = ally.onAllyBasicATK(targetEnemyIndex);
              if (fuaMove) {
                counterQueue.push({
                  hero: ally,
                  move: fuaMove,
                  targetIdx: targetEnemyIndex,
                });
              }
            }
          });
        }

        setTimeout(() => {
          // Send to processCounterQueue instead of finishAction directly to catch the FUA!
          if (counterQueue.length > 0) processCounterQueue();
          else finishAction();
        }, 600);
      }
    }
    setTimeout(doHit, move.cinematic ? 800 : 150);
  }

  if (actionType === "ultimate" && move.voiceline) {
    const blackout = document.createElement("div");
    blackout.className = "fx-ult-blackout";
    blackout.innerHTML = `
      <div class="fx-ult-cutin-strip">
        <div class="fx-ult-scanlines"></div>
        <div class="fx-ult-voiceline">"${move.voiceline}"</div>
      </div>`;

    document.body.appendChild(blackout);
    playSFX("ult");

    setTimeout(() => blackout.remove(), 2000);

    // ✨ CHANGED: Show the text early, but delay the ATTACK until 2100ms (after the black screen fully fades out!)
    setTimeout(() => {
      showVoiceline(currentHero.name, move.voiceline);
    }, 1500);

    setTimeout(() => {
      proceedWithAction();
    }, 2100);
  } else {
    if (move.voiceline) showVoiceline(currentHero.name, move.voiceline);
    proceedWithAction();
  }
}

function processCounterQueue() {
  const livingEnemies = enemySquad.filter((e) => e.hp > 0);

  if (counterQueue.length === 0 || livingEnemies.length === 0) {
    finishAction();
    return;
  }

  const nextCounter = counterQueue.shift();

  if (nextCounter.hero.hp <= 0 || enemySquad[nextCounter.targetIdx].hp <= 0) {
    processCounterQueue();
    return;
  }

  nextCounter.hero.isCountering = true;
  renderQueue();

  executeCounter(
    nextCounter.hero,
    nextCounter.move,
    nextCounter.targetIdx,
    () => {
      nextCounter.hero.isCountering = false;
      processCounterQueue();
    },
  );
}

function executeCounter(hero, move, eIdx, onComplete) {
  const t = enemySquad[eIdx];
  if (!t || t.hp <= 0) {
    if (onComplete) onComplete();
    return;
  }

  const hIdx = playerSquad.indexOf(hero);
  if (hIdx !== -1) {
    playVisualEffect(
      `hero-card-${hIdx}`,
      "skill-name",
      move.name || "FOLLOW-UP",
    );
    playSFX("skillPop");
    triggerAnimation(
      document.getElementById(`hero-card-${hIdx}`),
      "counter-bump",
    );
    if (move.onExecute) move.onExecute(hero);
    renderHeroSquad();
  }

  if (move.voiceline) showVoiceline(hero.name, move.voiceline);

  setTimeout(() => {
    if (t.hp <= 0) {
      if (onComplete) onComplete();
      return;
    }

    currentTurnTotalDamage = 0;
    let justBroke = false;

    // ✨ NEW: Multi-hit FUA tracking!
    const hits = move.hits || 1;
    let currentHitCount = 0;

    function doCounterHit() {
      // Stop hitting if the enemy dies mid-attack!
      if (t.hp <= 0 && currentHitCount < hits) {
        updateTotalDamage(currentTurnTotalDamage);
        renderSquad();
        if (onComplete) setTimeout(onComplete, 800);
        return;
      }

      playSFX("attack");

      // ✨ Fetch the exact hit ratio
      let hitRatio = 1 / hits;
      if (move.hitSplit && move.hitSplit.length === hits) {
        hitRatio = move.hitSplit[currentHitCount];
      }

      if (currentHitCount === 0 && hero.lightCone && hero.lightCone.onAttack) {
        hero.lightCone.onAttack(hero);
      }

      const livingEnemiesCount = enemySquad.filter((e) => e.hp > 0).length;

      // ✨ UPDATED: Apply the hit ratio to the FUA damage math!
      const result = calculateDamage(
        hero,
        t,
        move.multiplier * hitRatio,
        (move.flatDamageBonus || 0) * hitRatio,
        livingEnemiesCount,
        true,
      );
      const dmg = result.damage;

      const preHp = t.hp;
      t.hp = Math.max(t.hp - dmg, 0);
      currentTurnTotalDamage += dmg;

      if (
        t.state.breakDebuff &&
        t.hp > 0 &&
        t.state.breakDebuff.type === "quantum"
      ) {
        t.state.breakDebuff.stacks = Math.min(
          5,
          t.state.breakDebuff.stacks + 1,
        );
      }

      const isDead = t.hp <= 0 && preHp > 0;
      if (isDead) playSFX("death");

      const isWeak = t.weaknesses.includes(hero.type);
      if (isWeak && t.toughness > 0) {
        // ✨ UPDATED: Apply the hit ratio to the FUA Toughness damage!
        const tDmg = (move.toughnessDamage || 10) * hitRatio;
        t.toughness = Math.max(t.toughness - tDmg, 0);

        if (t.toughness === 0) {
          t.isBroken = true;
          justBroke = true;
          playSFX("break");

          const debuff = calculateBreakDebuff(hero, t);
          t.state.breakDebuff = debuff;

          if (hero.type === "imaginary") {
            t.av += (10000 / t.spd) * (0.3 + (hero.breakEffect || 0));
            t.spd = t.baseSpd * 0.9;
          } else if (hero.type === "quantum") {
            t.av += (10000 / t.spd) * (0.2 + (hero.breakEffect || 0));
          } else {
            t.av += (10000 / t.spd) * 0.25;
          }

          if (hero.lightCone && hero.lightCone.onBreak)
            hero.lightCone.onBreak(hero);
          playVisualEffect(`enemy-card-${eIdx}`, "break", "", false, hero.type);

          const breakDmg = calculateBreakDamage(hero, t);
          t.hp = Math.max(t.hp - breakDmg, 0);
          currentTurnTotalDamage += breakDmg;

          setTimeout(() => {
            playVisualEffect(
              `enemy-card-${eIdx}`,
              "dmg",
              breakDmg,
              false,
              hero.type,
              true,
            );
          }, 300);
        }
      }

      if (currentHitCount === hits - 1) {
        if (move.onHit) move.onHit(t, true, playerSquad);

        if (hero.lightCone && hero.lightCone.onHit) {
          hero.lightCone.onHit(hero, t);
        }
      }

      playVisualEffect(
        `enemy-card-${eIdx}`,
        "dmg",
        dmg,
        result.isCrit,
        hero.type,
      );
      playVisualEffect(`enemy-card-${eIdx}`, move.vfx || "fx-ice-slash");

      let isHeavyHit = result.isCrit || justBroke;

      if (isHeavyHit) {
        document.body.classList.remove("fx-impact-frame");
        void document.body.offsetWidth;
        document.body.classList.add("fx-impact-frame");

        triggerAnimation(
          document.getElementById(`enemy-card-${eIdx}`),
          "glitch-hit",
        );

        // ✨ CHANGED: Impact Zoom for Counters!
        triggerAnimation(document.querySelector(".arena"), "arena-impact-zoom");
        playSFX("break");
      } else {
        triggerAnimation(
          document.getElementById(`enemy-card-${eIdx}`),
          "shake",
        );
      }

      // ✨ NEW: FUA Overkill trigger!
      if (dmg >= t.hp * 0.4 || (isDead && isHeavyHit)) {
        playVisualEffect(`enemy-card-${eIdx}`, "overkill");
      }

      currentHitCount++;

      // ✨ HIT-STOP TIMING FOR MACHINE-GUN FOLLOW-UPS
      let hitStopDelay = isHeavyHit ? 300 : 150;

      if (currentHitCount < hits) {
        setTimeout(doCounterHit, hitStopDelay);
      } else {
        updateTotalDamage(currentTurnTotalDamage);
        renderSquad();
        renderQueue();
        if (onComplete) setTimeout(onComplete, 800);
      }
    }

    // Fire the first shot!
    doCounterHit();
  }, 600);
}

// --- ⌨️ KEYBOARD HOOK ---
document.addEventListener("keydown", (e) => {
  if (["1", "2", "3", "4"].includes(e.key)) {
    if (battleScreen.style.display === "none") return;

    const squadIndex = parseInt(e.key) - 1;
    const targetHero = playerSquad[squadIndex];

    if (targetHero && targetHero.hp > 0) {
      queueUltimate(targetHero);
    }
    return;
  }

  const combatState = {
    isInputPhase,
    isInterceptionTurn,
    isBattleActive: battleScreen.style.display !== "none",
    activeEntity,
    selectedAction,
    targetHeroIndex,
    targetEnemyIndex,
    playerSquad,
    enemySquad,
    btnDisabledState: {
      basic: btnBasic.disabled,
      skill: btnSkill.disabled,
      ult: btnUlt.disabled,
    },
  };

  const combatFunctions = {
    handleAction: handleActionInput,
    setSelectedAction: (action) => {
      selectedAction = action;
    },
    setTargetHero: (idx) => {
      targetHeroIndex = idx;
    },
    setTargetEnemy: (idx) => {
      targetEnemyIndex = idx;
    },
    updateUI: updateUI,
  };

  handleKeyboardInput(e, combatState, combatFunctions);
});
