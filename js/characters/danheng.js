export const danheng = {
  id: "danheng",
  name: "Dan Heng",
  imageSrc: "https://placehold.co/200x200/png?text=DAN+HENG", // Replace with your webp later!
  type: "wind",
  path: "hunt",

  // Baseline 4-Star Hunt Stats
  stats: {
    1: { hp: 120, atk: 73, def: 54 },
    20: { hp: 234, atk: 142, def: 105 },
    30: { hp: 342, atk: 208, def: 153 },
    40: { hp: 450, atk: 274, def: 202 },
    50: { hp: 558, atk: 339, def: 250 },
    60: { hp: 666, atk: 405, def: 299 },
    70: { hp: 774, atk: 471, def: 347 },
    80: { hp: 882, atk: 536, def: 396 },
  },

  spd: 110,
  maxEnergy: 100,
  critRate: 0.05,
  critDmg: 0.5,

  state: { talentBuffActive: false, talentCooldown: 0 },

  init: function () {
    this.state.talentBuffActive = false;
    this.state.talentCooldown = 0;
    this.resPen = 0;
  },

  onTurnStart: function () {
    if (this.state.talentCooldown > 0) this.state.talentCooldown--;
  },

  // ✨ NEW: Triggered when an ally (like March) uses a skill on him
  onReceiveAllyAbility: function () {
    if (this.state.talentCooldown === 0) {
      this.state.talentBuffActive = true;
      this.resPen = 0.18;
      // ✨ E2: Cooldown reduced from 2 turns to 1 turn!
      this.state.talentCooldown = this.eidolon >= 2 ? 1 : 2;
    }
  },

  getDynamicCritRate: function (defender) {
    if (this.eidolon >= 1 && defender.hp / defender.baseHp >= 0.5) {
      return 0.12;
    }
    return 0;
  },

  onKill: function (target, move) {
    if (this.eidolon >= 4 && move.name === "Ethereal Dream") {
      this.av = 0; // 100% Action Advance forces him to the top of the queue
      return "E4: 100% ACTION ADVANCE!";
    }
    return null;
  },

  // ✨ NEW: Clears the buff after he finishes an attack
  onActionEnd: function () {
    if (this.state.talentBuffActive) {
      this.state.talentBuffActive = false;
      this.resPen = 0;
    }
  },

  // ✨ NEW: Listens for crits to apply his Slow debuff!
  onAttackTarget: function (target, move, result) {
    if (move.name === "Cloudlancer Art: Torrent" && result.isCrit) {
      target.state.slowTurns = 2;
      // ✨ E6: Increases the slow amount from 12% to 20%
      const slowPct = this.eidolon >= 6 ? 0.2 : 0.12;
      target.spd = target.baseSpd * (1 - slowPct);
      return 0;
    }
    return 0;
  },

  getButtonUI: function () {
    return {
      basic: { text: "NORTH WIND", targetType: "single", genSP: 1 },
      skill: { text: "TORRENT", targetType: "single", costSP: 1 },
      ult: { text: "ETHEREAL DREAM", targetType: "single", costEN: 100 },
    };
  },

  useAction: function (actionType) {
    if (actionType === "basic") {
      return {
        name: "Cloudlancer Art: North Wind",
        type: "single",
        genSP: 1,
        genEN: 20,
        hits: 2,
        hitSplit: [0.45, 0.55],
        multiplier: 0.5 + (this.basicLvl - 1) * 0.1,
        toughnessDamage: 10,
        vfx: "fx-wind-slash",
        voiceline: "The time is now.",
      };
    } else if (actionType === "skill") {
      return {
        name: "Cloudlancer Art: Torrent",
        type: "single",
        costSP: 1,
        genEN: 30,
        hits: 4,
        hitSplit: [0.1, 0.2, 0.3, 0.4],
        multiplier: 1.3 + (this.skillLvl - 1) * 0.13,
        toughnessDamage: 20,
        vfx: "fx-wind-blast",
      };
    } else if (actionType === "ultimate") {
      return {
        name: "Ethereal Dream",
        type: "single",
        costEN: 100,
        genEN: 5,
        hits: 1,
        toughnessDamage: 30,
        vfx: "fx-wind-explosion",
        voiceline: "This sanctuary, is but a vision... Break!",
        multiplier: (target) => {
          const base = 2.4 + (this.ultLvl - 1) * 0.16;
          return target.state.slowTurns > 0 ? base + 0.72 : base;
        },
      };
    }
  },
};
