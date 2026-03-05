export const march_7th_preservation = {
  id: "march_7th_preservation",
  name: "March 7th: Preservation",
  imageSrc: "img/chars/march7th_1.webp",
  type: "ice",
  path: "preservation",

  stats: {
    1: { hp: 144, atk: 69, def: 78 },
    20: { hp: 280, atk: 135, def: 152 },
    30: { hp: 410, atk: 198, def: 222 },
    40: { hp: 540, atk: 260, def: 292 },
    50: { hp: 669, atk: 323, def: 362 },
    60: { hp: 799, atk: 386, def: 432 },
    70: { hp: 929, atk: 448, def: 502 },
    80: { hp: 1058, atk: 511, def: 573 },
  },

  spd: 101,
  maxEnergy: 120,
  critRate: 0.05,
  critDmg: 0.5,
  state: { maxCounters: 2, countersThisTurn: 0 },

  init: function () {
    this.state.countersThisTurn = 0;
    this.state.maxCounters = this.eidolon >= 4 ? 3 : 2;
  },

  onBattleStart: function (squad) {
    if (this.eidolon >= 2) {
      let target = squad[0]; // Explicitly default to the 1st slot!

      // Check if ANY hero is actually missing HP
      const isAnyoneInjured = squad.some((hero) => hero.hp < hero.baseHp);

      // If someone is injured, find the one with the lowest percentage
      if (isAnyoneInjured) {
        let lowestHpPct = target.hp / target.baseHp;

        for (let i = 1; i < squad.length; i++) {
          const pct = squad[i].hp / squad[i].baseHp;
          if (pct < lowestHpPct) {
            lowestHpPct = pct;
            target = squad[i];
          }
        }
      }

      // Apply the shield to the chosen target
      target.shield = this.baseDef * 0.24 + 320;
      target.shieldDuration = 3;
      target.shieldSource = this.id; // Track who gave the shield for E6!
    }
  },

  onFreeze: function (target) {
    if (this.eidolon >= 1) {
      this.energy = Math.min(this.maxEnergy, this.energy + 6);
    }
  },

  getButtonUI: function () {
    return {
      basic: { text: "FROST ARROW", targetType: "single", genSP: 1 },
      skill: { text: "POWER OF CUTENESS", targetType: "ally", costSP: 1 },
      ult: {
        text: "GLACIAL CASCADE",
        targetType: "all",
        costEN: 120,
        activationLine: "Gotta try hard sometimes.",
      },
    };
  },

  useAction: function (actionType) {
    if (actionType === "basic") {
      return {
        type: "single",
        genSP: 1,
        genEN: 20,
        multiplier: 0.5,
        toughnessDamage: 10,
        logText: `>_ FROST ARROW:`,
        vfx: "fx-ice-arrow",
        voiceline: "Watch this!",
      };
    } else if (actionType === "skill") {
      const skillLines = [
        "With me out here, how can we lose~",
        "Stay right there while I give you a present~",
      ];

      this.state.countersThisTurn = 0;

      return {
        type: "shield",
        costSP: 1,
        genEN: 30,
        shieldValue: this.baseDef * 0.48 + 160,
        duration: 3,
        aggroModThreshold: 0.3,
        aggroModValue: 5,
        vfx: "fx-shield-up",
        voiceline: skillLines[Math.floor(Math.random() * skillLines.length)],
      };
    } else if (actionType === "ultimate") {
      return {
        type: "all",
        hits: 4,
        costEN: 120,
        multiplier: 1.5,
        toughnessDamage: 20,
        chanceToFreeze: 0.5,
        logText: `>_ ULTIMATE: GLACIAL CASCADE!`,
        vfx: "fx-ice-explosion",
        voiceline: "Check out this awesome move~",
      };
    }
  },

  onAllyHit: function () {
    if (this.state.countersThisTurn < this.state.maxCounters) {
      const passiveLines = ["You can't run!", "Try that again!"];
      return {
        name: "GIRL POWER",
        type: "single",
        multiplier: 0.5,
        flatDamageBonus: this.eidolon >= 4 ? this.baseDef * 0.3 : 0,
        toughnessDamage: 10,
        logText: `>_ GIRL POWER (COUNTER):`,
        vfx: "fx-ice-arrow",
        voiceline:
          passiveLines[Math.floor(Math.random() * passiveLines.length)],
        onExecute: (hero) => {
          hero.state.countersThisTurn++;
        },
      };
    }
    return null;
  },
};
