export const trailblazer_destruction = {
  id: "trailblazer_destruction",
  name: "Trailblazer",
  imageSrc: "img/chars/trailblazer_1.webp",
  type: "physical",
  path: "destruction",

  stats: {
    1: { hp: 163, atk: 84, def: 62 },
    20: { hp: 318, atk: 164, def: 121 },
    30: { hp: 464, atk: 240, def: 177 },
    40: { hp: 611, atk: 316, def: 233 },
    50: { hp: 758, atk: 392, def: 289 },
    60: { hp: 905, atk: 468, def: 345 },
    70: { hp: 1052, atk: 544, def: 401 },
    80: { hp: 1203, atk: 620, def: 460 },
  },

  spd: 100,
  maxEnergy: 120,
  critRate: 0.05,
  critDmg: 0.5,

  state: { isEnhanced: false, talentStacks: 0, e1Triggered: false },

  // ✨ NEW: Exact multiplier arrays mapped to Trace levels (Index 0 = Level 1)
  scaling: {
    basic: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1],
    skill: [
      0.625, 0.6875, 0.75, 0.8125, 0.875, 0.9375, 1.0156, 1.0938, 1.1719, 1.25,
      1.3125, 1.375,
    ],
    ultBasic: [
      3.0, 3.15, 3.3, 3.45, 3.6, 3.75, 3.9375, 4.125, 4.3125, 4.5, 4.65, 4.8,
    ],
    ultSkillMain: [
      1.8, 1.89, 1.98, 2.07, 2.16, 2.25, 2.3625, 2.475, 2.5875, 2.7, 2.79, 2.88,
    ],
    ultSkillAdj: [
      1.08, 1.134, 1.188, 1.242, 1.296, 1.35, 1.4175, 1.485, 1.5525, 1.62,
      1.674, 1.728,
    ],
    talent: [
      0.1, 0.11, 0.12, 0.13, 0.14, 0.15, 0.1625, 0.175, 0.1875, 0.2, 0.21, 0.22,
    ],
  },

  getDynamicAtkHero: function () {
    // Array limits to prevent crashes if level somehow exceeds max
    const lvlIdx = Math.min((this.talentLvl || 1) - 1, 11);
    return this.state.talentStacks * this.scaling.talent[lvlIdx];
  },

  getDynamicCritRate: function (defender) {
    if (this.eidolon >= 4 && defender.isBroken) return 0.25;
    return 0;
  },

  onTriggerBreak: function () {
    this.state.talentStacks = Math.min(2, this.state.talentStacks + 1);
    return "PERFECT PICKOFF!";
  },

  onAttackTarget: function (target) {
    if (this.eidolon >= 2 && target.weaknesses.includes("physical")) {
      return this.baseAtk * 0.05;
    }
    return 0;
  },

  onKill: function (target, move) {
    let msg = "";

    if (this.eidolon >= 6 && this.state.talentStacks < 2) {
      this.state.talentStacks++;
      msg += "E6 TALENT PROC! ";
    }

    if (this.eidolon >= 1 && move.isEnhancedAttack && !this.state.e1Triggered) {
      this.energy = Math.min(this.maxEnergy, this.energy + 10);
      this.state.e1Triggered = true;
      msg += "E1 ENERGY REGEN!";
    }

    return msg !== "" ? msg : null;
  },

  getButtonUI: function () {
    const isEnhanced = this.state.isEnhanced;
    return {
      basic: {
        text: isEnhanced ? "BLOWOUT: FAREWELL HIT" : "FAREWELL HIT",
        targetType: "single",
        genSP: isEnhanced ? 0 : 1,
      },
      skill: {
        text: isEnhanced ? "BLOWOUT: RIP HOME RUN" : "RIP HOME RUN",
        targetType: "blast",
        costSP: isEnhanced ? 0 : 1,
      },
      ult: { text: "STARDUST ACE", targetType: "enhance", costEN: 120 },
    };
  },

  useAction: function (actionType) {
    this.state.e1Triggered = false;
    const randomLine = () =>
      ["You're out!", "Decisive strike!"][Math.floor(Math.random() * 2)];

    if (actionType === "ultimate") {
      this.state.isEnhanced = true;
      return {
        type: "enhance",
        costEN: 120,
        logText: `>_ ULTIMATE: STARDUST ACE PROTOCOL ENGAGED!`,
        voiceline: "Rules are made to be broken!",
      };
    }

    if (actionType === "basic") {
      const isEnhanced = this.state.isEnhanced;
      this.state.isEnhanced = false;

      const basicIdx = Math.min((this.basicLvl || 1) - 1, 6);
      const ultIdx = Math.min((this.ultLvl || 1) - 1, 11);

      return {
        type: "single",
        genSP: isEnhanced ? 0 : 1,
        genEN: isEnhanced ? 5 : 20,
        isEnhancedAttack: isEnhanced,
        multiplier: isEnhanced
          ? this.scaling.ultBasic[ultIdx]
          : this.scaling.basic[basicIdx],
        toughnessDamage: isEnhanced ? 30 : 10,
        vfx: isEnhanced ? "fx-bat-enhanced-hit" : "fx-bat-hit",
        voiceline: isEnhanced ? randomLine() : "Batter up.",
      };
    } else if (actionType === "skill") {
      const isEnhanced = this.state.isEnhanced;
      this.state.isEnhanced = false;

      const skillIdx = Math.min((this.skillLvl || 1) - 1, 11);
      const ultIdx = Math.min((this.ultLvl || 1) - 1, 11);

      return {
        type: "blast",
        costSP: isEnhanced ? 0 : 1,
        genEN: isEnhanced ? 5 : 30,
        isEnhancedAttack: isEnhanced,
        multiplierMain: isEnhanced
          ? this.scaling.ultSkillMain[ultIdx]
          : this.scaling.skill[skillIdx],
        multiplierAdj: isEnhanced
          ? this.scaling.ultSkillAdj[ultIdx]
          : this.scaling.skill[skillIdx],
        toughnessMain: isEnhanced ? 20 : 20,
        toughnessAdj: isEnhanced ? 20 : 10,
        vfxMain: isEnhanced ? "fx-bat-enhanced-smash" : "fx-bat-smash",
        vfxAdj: isEnhanced ? "fx-bat-enhanced-hit" : "fx-bat-hit",
        voiceline: isEnhanced ? randomLine() : "Take this!",
      };
    }
  },
};

