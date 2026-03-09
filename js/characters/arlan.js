export const arlan = {
  id: "arlan",
  name: "Arlan",
  imageSrc: "img/chars/arlan.webp", // Replace with his webp later
  type: "lightning",
  path: "destruction",

  // Base 4-Star Destruction Stats
  stats: {
    1: { hp: 163, atk: 81, def: 45 },
    20: { hp: 317, atk: 158, def: 87 },
    30: { hp: 463, atk: 231, def: 127 },
    40: { hp: 609, atk: 304, def: 167 },
    50: { hp: 756, atk: 378, def: 208 },
    60: { hp: 902, atk: 451, def: 248 },
    70: { hp: 1049, atk: 524, def: 288 },
    80: { hp: 1199, atk: 599, def: 330 },
  },

  spd: 102,
  maxEnergy: 110,
  critRate: 0.05,
  critDmg: 0.5,

  scaling: {
    basic: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1],
    skill: [1.2, 1.32, 1.44, 1.56, 1.68, 1.8, 1.95, 2.1, 2.25, 2.4, 2.52, 2.64],
    ultMain: [
      1.92, 2.048, 2.176, 2.304, 2.432, 2.56, 2.72, 2.88, 3.04, 3.2, 3.328,
      3.456,
    ],
    ultAdj: [
      0.96, 1.024, 1.088, 1.152, 1.216, 1.28, 1.36, 1.44, 1.52, 1.6, 1.664,
      1.728,
    ],
    talent: [
      0.36, 0.396, 0.432, 0.468, 0.504, 0.54, 0.585, 0.63, 0.675, 0.72, 0.756,
      0.792,
    ],
  },

  init: function () {},

  // ✨ NEW: Dynamic Hook! Calculates his DMG% boost based on his Missing HP!
  getDynamicDmgHero: function () {
    const tIdx = Math.min((this.talentLvl || 1) - 1, 11);
    const missingHpPct = 1 - this.hp / this.baseHp;
    // Multiplies the missing HP ratio by the max talent bonus
    return missingHpPct * this.scaling.talent[tIdx];
  },

  getButtonUI: function () {
    return {
      basic: { text: "LIGHTNING RUSH", targetType: "single", genSP: 1 },
      skill: { text: "SHACKLE BREAKER", targetType: "single", costSP: 0 }, // 0 SP Cost!
      ult: { text: "FRENZIED PUNISHMENT", targetType: "blast", costEN: 110 },
    };
  },

  useAction: function (actionType) {
    if (actionType === "basic") {
      const bIdx = Math.min((this.basicLvl || 1) - 1, 6);
      return {
        name: "Lightning Rush",
        type: "single",
        genSP: 1,
        genEN: 20,
        hits: 2,
        hitSplit: [0.3, 0.7],
        multiplier: this.scaling.basic[bIdx],
        toughnessDamage: 10,
        vfx: "fx-lightning-slash",
        voiceline: "I'll protect everyone.",
      };
    } else if (actionType === "skill") {
      const sIdx = Math.min((this.skillLvl || 1) - 1, 11);
      return {
        name: "Shackle Breaker",
        type: "single",
        costSP: 0,
        genEN: 30,
        multiplier: this.scaling.skill[sIdx],
        toughnessDamage: 20,
        vfx: "fx-lightning-strike",
        voiceline: "No pain, no gain.",

        // ✨ NEW: This hook runs right before the attack connects to drain his HP!
        onActionStart: (hero, hIdx) => {
          const cost = Math.floor(hero.baseHp * 0.15);
          hero.hp = Math.max(1, hero.hp - cost); // Cannot drop below 1 HP

          // Juice: Play the damage numbers and shake him!
          if (window.playVisualEffect)
            window.playVisualEffect(`hero-card-${hIdx}`, "dmg", cost);
          if (window.triggerAnimation)
            window.triggerAnimation(
              document.getElementById(`hero-card-${hIdx}`),
              "shake",
            );
        },
      };
    } else if (actionType === "ultimate") {
      const uIdx = Math.min((this.ultLvl || 1) - 1, 11);
      return {
        name: "Frenzied Punishment",
        type: "blast",
        costEN: 110,
        genEN: 5,
        hits: 3,
        hitSplit: [0.3, 0.1, 0.6],
        multiplierMain: this.scaling.ultMain[uIdx],
        multiplierAdj: this.scaling.ultAdj[uIdx],
        toughnessMain: 20,
        toughnessAdj: 20,
        vfxMain: "fx-lightning-explosion",
        vfxAdj: "fx-lightning-slash",
        voiceline: "I'll repay this debt... tenfold!",
      };
    }
  },
};
