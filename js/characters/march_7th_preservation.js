export const march_7th_preservation = {
  id: "march_7th_preservation",
  name: "March 7th",
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
      let target = squad[0];
      const isAnyoneInjured = squad.some((hero) => hero.hp < hero.baseHp);

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

      target.shield = this.baseDef * 0.24 + 320;
      target.shieldDuration = 3;
      target.shieldSource = this.id;
    }
  },

  // ✨ INTEGRATED SYSTEM: Energy Regeneration Math (E1)
  onFreeze: function (target) {
    if (this.eidolon >= 1) {
      return { type: "energy", amount: 6 };
    }
  },

  onAllyTurnStart: function (ally) {
    if (this.eidolon >= 6 && ally.shield > 0 && ally.shieldSource === this.id) {
      return {
        type: "heal",
        baseAmount: ally.baseHp * 0.04,
        flatAmount: 106,
        text: `>_ E6 RECOVERY:`,
      };
    }
    return null;
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
        // ✨ DYNAMIC: Scales based on the Loadout Trace Level!
        multiplier: 0.5 + (this.basicLvl || 1) * 0.1,
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

      // ✨ DYNAMIC: Shield scales perfectly with Trace Level
      const defPct = 0.38 + (this.skillLvl || 1) * 0.019;
      const flatShield = 190 + (this.skillLvl || 1) * 57;

      return {
        type: "shield",
        costSP: 1,
        genEN: 30,
        shieldValue: this.baseDef * defPct + flatShield,
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
        // ✨ DYNAMIC: Scales up to 150% ATK at Lv 10
        multiplier: 0.9 + (this.ultLvl || 1) * 0.06,
        toughnessDamage: 20,
        // ✨ INTEGRATED SYSTEM: Bumped to 65% (A6 Trace included) for the EHR Math!
        baseChanceToApply: 0.65,
        debuffType: "freeze",
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
        // ✨ DYNAMIC: Scales up to 100% ATK at Lv 10
        multiplier: 0.5 + (this.talentLvl || 1) * 0.05,
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
