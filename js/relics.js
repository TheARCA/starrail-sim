// Exact Level 15 5-Star Main Stats (from HSR Wiki)
export const RELIC_MAIN_STATS = {
  hpFlat: 705.6, // Head (Always)
  atkFlat: 352.8, // Hands (Always)
  hpPct: 0.432,
  atkPct: 0.432,
  defPct: 0.54,
  critRate: 0.324,
  critDmg: 0.648,
  healing: 0.345,
  ehr: 0.432,
  spd: 25.032,
  physicalDmg: 0.388,
  fireDmg: 0.388,
  iceDmg: 0.388,
  lightningDmg: 0.388,
  windDmg: 0.388,
  quantumDmg: 0.388,
  imaginaryDmg: 0.388,
  breakEffect: 0.648,
  energyRegen: 0.194,
};

// Exact Average 5-Star Substat Rolls (from HSR Wiki)
export const RELIC_SUBSTAT_ROLL = {
  hpFlat: 38.1,
  atkFlat: 19.05,
  defFlat: 19.05,
  hpPct: 0.0388,
  atkPct: 0.0388,
  defPct: 0.0486,
  spd: 2.3,
  critRate: 0.0291,
  critDmg: 0.0582,
  ehr: 0.0388,
  effectRes: 0.0388,
  breakEffect: 0.0582,
};

// The Auto-Distribution Budget (50 targeted rolls = God-Tier Endgame Build)
// 6 Relics * ~8.5 average rolls per relic = ~50 total substat rolls
// [1st Priority (18), 2nd Priority (14), 3rd Priority (10), 4th Priority (8)]
const SUBSTAT_WEIGHTS = [18, 14, 10, 8];

export function compileRelicStats(relicData) {
  let totals = {
    hpFlat: 0,
    atkFlat: 0,
    hpPct: 0,
    atkPct: 0,
    defPct: 0,
    defFlat: 0,
    critRate: 0,
    critDmg: 0,
    spd: 0,
    ehr: 0,
    effectRes: 0,
    breakEffect: 0,
    energyRegen: 0,
    healing: 0,
    physicalDmg: 0,
    fireDmg: 0,
    iceDmg: 0,
    lightningDmg: 0,
    windDmg: 0,
    quantumDmg: 0,
    imaginaryDmg: 0,
  };

  if (!relicData) return totals;

  const mains = relicData.mainStats || {};
  const priorities = relicData.substatPriority || ["", "", "", ""];

  const hasAnySubstat = priorities.some((p) => p !== "");
  const hasRelics =
    relicData.relicSet1 ||
    relicData.relicSet2 ||
    mains.body ||
    mains.boots ||
    hasAnySubstat;
  const hasPlanars =
    relicData.planarSet || mains.sphere || mains.rope || hasAnySubstat;

  // 1. Add Main Stats ONLY if the slot is actually being used
  if (hasRelics) {
    totals.hpFlat += RELIC_MAIN_STATS.hpFlat; // Head
    totals.atkFlat += RELIC_MAIN_STATS.atkFlat; // Hands
  }
  if (mains.body)
    totals[mains.body] =
      (totals[mains.body] || 0) + RELIC_MAIN_STATS[mains.body];
  if (mains.boots)
    totals[mains.boots] =
      (totals[mains.boots] || 0) + RELIC_MAIN_STATS[mains.boots];
  if (mains.sphere)
    totals[mains.sphere] =
      (totals[mains.sphere] || 0) + RELIC_MAIN_STATS[mains.sphere];
  if (mains.rope)
    totals[mains.rope] =
      (totals[mains.rope] || 0) + RELIC_MAIN_STATS[mains.rope];

  // 2. Map out the 6 Relic Pieces (Using "empty" if the dropdown is [ NONE ])
  let pieces = [];
  if (hasRelics)
    pieces.push(
      "hpFlat",
      "atkFlat",
      mains.body || "empty",
      mains.boots || "empty",
    );
  if (hasPlanars) pieces.push(mains.sphere || "empty", mains.rope || "empty");

  const rollsPerPiece = [4, 3, 1, 1];
  const fallbacks = [
    "hpFlat",
    "atkFlat",
    "defFlat",
    "defPct",
    "hpPct",
    "effectRes",
  ];

  // 3. Process each piece individually
  pieces.forEach((mainStat) => {
    let validSubstats = [];

    priorities.forEach((stat) => {
      // ✨ NEW: If the user selected [ NONE ], we push an empty string so they get 0 rolls!
      if (stat === "") {
        validSubstats.push("");
      }
      // Normal valid stat
      else if (stat !== mainStat && !validSubstats.includes(stat)) {
        validSubstats.push(stat);
      }
      // Collision! (e.g. Crit Rate priority on a Crit Rate body). Find a fallback!
      else {
        let fallbackFound = false;
        for (let f of fallbacks) {
          // Don't use a fallback if it's the main stat, or if the user already has it in their priority list
          if (
            !validSubstats.includes(f) &&
            f !== mainStat &&
            !priorities.includes(f)
          ) {
            validSubstats.push(f);
            fallbackFound = true;
            break;
          }
        }
        if (!fallbackFound) validSubstats.push("");
      }
    });

    // Apply the mathematical rolls
    validSubstats.forEach((statKey, index) => {
      if (statKey !== "" && RELIC_SUBSTAT_ROLL[statKey]) {
        totals[statKey] =
          (totals[statKey] || 0) +
          RELIC_SUBSTAT_ROLL[statKey] * rollsPerPiece[index];
      }
    });
  });

  return totals;
}

// Universal Set Bonus Database
export const relicSets = {
  band_of_sizzling_thunder: {
    name: "Band of Sizzling Thunder",
    desc2P: "Increases Lightning DMG by 10%.",
    desc4P:
      "When the wearer uses their Skill, increases the wearer's ATK by 20% for 1 turn(s).",
    apply2P: (hero) => {
      hero.lightningDmgBonus = (hero.lightningDmgBonus || 0) + 0.1;
    },
    apply4P: (hero) => {
      hero.hasSizzlingThunder4P = true;
    },
  },
  champion_of_streetwise_boxing: {
    name: "Champion of Streetwise Boxing",
    desc2P: "Physical DMG +10%.",
    desc4P:
      "Setelah pengguna melancarkan atau menerima serangan, ATK pengguna meningkat 5% selama pertempuran, dapat ditumpuk hingga 5 lapis.",
    apply2P: (hero) => {
      hero.physicalDmgBonus = (hero.physicalDmgBonus || 0) + 0.1;
    },
    apply4P: (hero) => {
      // 1. Give them the tag and initialize the stacks
      hero.hasStreetwiseBoxing4P = true;
      hero.state.streetwiseBoxingStacks = 0;

      // 2. Secretly wrap their dynamic ATK calculator so the math engine reads the stacks!
      const originalDynamicAtk = hero.getDynamicAtkHero;
      hero.getDynamicAtkHero = function () {
        let base = originalDynamicAtk ? originalDynamicAtk.call(this) : 0;
        return base + this.state.streetwiseBoxingStacks * 0.05;
      };
    },
  },
  genius_of_brilliant_stars: {
    name: "Genius of Brilliant Stars",
    desc2P: "Increases Quantum DMG by 10%.",
    desc4P:
      "When the wearer deals DMG to the target enemy, ignores 10% DEF. If the target has Quantum Weakness, additionally ignores 10% DEF.",
    apply2P: (hero) => {
      hero.quantumDmgBonus = (hero.quantumDmgBonus || 0) + 0.1;
    },
    apply4P: (hero) => {
      hero.hasGeniusStars4P = true;
    },
  },
  space_sealing_station: {
    name: "Space Sealing Station",
    // ✨ NEW: Added the Planar description!
    desc: "Increases the wearer's ATK by 12%. When the wearer's SPD reaches 120 or higher, the wearer's ATK increases by an extra 12%.",
    apply2P: (hero) => {
      hero.atkPctBonus = (hero.atkPctBonus || 0) + 0.12;
      if (hero.spd >= 120) {
        hero.atkPctBonus += 0.12;
      }
    },
  },
};
