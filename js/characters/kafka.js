export const kafka = {
  id: "kafka",
  name: "Kafka",
  imageSrc: "img/chars/kafka.webp", // Replace with your webp later
  type: "lightning",
  path: "nihility",

  // Base 5-Star Stats
  stats: {
    1: { hp: 144, atk: 92, def: 66 },
    20: { hp: 280, atk: 180, def: 128 },
    30: { hp: 409, atk: 262, def: 187 },
    40: { hp: 538, atk: 345, def: 247 },
    50: { hp: 668, atk: 428, def: 306 },
    60: { hp: 797, atk: 511, def: 365 },
    70: { hp: 926, atk: 594, def: 425 },
    80: { hp: 1058, atk: 679, def: 485 },
  },

  spd: 100,
  maxEnergy: 120,
  critRate: 0.05,
  critDmg: 0.5,

  state: { fuaUsedThisTurn: false },

  scaling: {
    basic: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1],
    skillMain: [
      0.8, 0.88, 0.96, 1.04, 1.12, 1.2, 1.3, 1.4, 1.5, 1.6, 1.68, 1.76,
    ],
    skillAdj: [
      0.3, 0.33, 0.36, 0.39, 0.42, 0.45, 0.4875, 0.525, 0.5625, 0.6, 0.63, 0.66,
    ],
    skillDetonate: [
      0.6, 0.615, 0.63, 0.645, 0.66, 0.675, 0.69375, 0.7125, 0.73125, 0.75,
      0.765, 0.78,
    ],
    ultDmg: [
      0.48, 0.512, 0.544, 0.576, 0.608, 0.64, 0.68, 0.72, 0.76, 0.8, 0.832,
      0.864,
    ],
    ultDetonate: [
      0.8, 0.82, 0.84, 0.86, 0.88, 0.9, 0.925, 0.95, 0.975, 1.0, 1.02, 1.04,
    ],
    ultShock: [
      1.16, 1.26875, 1.3775, 1.48625, 1.595, 1.758125, 1.975625, 2.2475,
      2.57375, 2.9, 3.041375, 3.18275,
    ],
    talentDmg: [
      0.42, 0.518, 0.616, 0.714, 0.812, 0.91, 1.0325, 1.155, 1.2775, 1.4, 1.498,
      1.596,
    ],
  },

  init: function () {
    this.state.fuaUsedThisTurn = false;
  },

  onTurnStart: function () {
    this.state.fuaUsedThisTurn = false; // Reset FUA limit
  },

  onAllyBasicATK: function (targetIndex) {
    if (!this.state.fuaUsedThisTurn) {
      this.state.fuaUsedThisTurn = true;
      const tIdx = Math.min((this.talentLvl || 1) - 1, 11);

      return {
        name: "Gentle but Cruel",
        type: "single",
        genEN: 10,
        hits: 6,
        hitSplit: [0.15, 0.15, 0.15, 0.15, 0.15, 0.25],
        multiplier: this.scaling.talentDmg[tIdx],
        toughnessDamage: 10,
        vfx: "fx-lightning-strike",
        voiceline: "Boom.",
        onHit: (target) => {
          this.applyShock(target);

          if (this.eidolon >= 1) {
            target.vulnerabilities = target.vulnerabilities || {
              universal: 0,
              dot: 0,
            };
            if (!target.state.kafkaE1Turns) target.vulnerabilities.dot += 0.3;
            target.state.kafkaE1Turns = 2;
          }
        },
      };
    }
    return null;
  },
  
  applyShock: function (target) {
    const uIdx = Math.min((this.ultLvl || 1) - 1, 11);
    let mult = this.scaling.ultShock[uIdx];
    let dur = 2;

    if (this.eidolon >= 6) {
      mult += 1.56;
      dur += 1;
    }

    target.state.customDoTs = target.state.customDoTs || [];
    target.state.customDoTs = target.state.customDoTs.filter(
      (dot) => dot.source !== "kafka_shock",
    );

    target.state.customDoTs.push({
      source: "kafka_shock",
      type: "lightning",
      name: "SHOCK",
      duration: dur,
      tickDamage: Math.floor(
        this.baseAtk *
          (1 + (this.getDynamicAtkHero ? this.getDynamicAtkHero() : 0)) *
          mult,
      ),
    });
  },

  getButtonUI: function () {
    return {
      basic: { text: "MIDNIGHT TUMULT", targetType: "single", genSP: 1 },
      skill: { text: "CARESSING MOONLIGHT", targetType: "blast", costSP: 1 },
      ult: { text: "TWILIGHT TRILL", targetType: "all", costEN: 120 },
    };
  },

  useAction: function (actionType) {
    if (actionType === "basic") {
      const bIdx = Math.min((this.basicLvl || 1) - 1, 6);
      return {
        name: "Midnight Tumult",
        type: "single",
        genSP: 1,
        genEN: 20,
        hits: 2,
        hitSplit: [0.5, 0.5],
        multiplier: this.scaling.basic[bIdx],
        toughnessDamage: 10,
        vfx: "fx-lightning-slash",
        voiceline: "This won't take long.",
      };
    } else if (actionType === "skill") {
      const sIdx = Math.min((this.skillLvl || 1) - 1, 11);
      const detonateMult = this.scaling.skillDetonate[sIdx];

      return {
        name: "Caressing Moonlight",
        type: "blast",
        costSP: 1,
        genEN: 30,
        hits: 3,
        hitSplit: [0.2, 0.3, 0.5], // The game applies this to MAIN only, engine handles adj
        multiplierMain: this.scaling.skillMain[sIdx],
        multiplierAdj: this.scaling.skillAdj[sIdx],
        toughnessMain: 20,
        toughnessAdj: 10,
        vfxMain: "fx-lightning-strike",
        vfxAdj: "fx-lightning-slash",
        onHit: (target, isMain, squad) => {
          if (isMain) this.detonateDoTs(target, detonateMult, null, squad);
        },
      };
    } else if (actionType === "ultimate") {
      const uIdx = Math.min((this.ultLvl || 1) - 1, 11);
      const detonateMult = this.scaling.ultDetonate[uIdx];

      return {
        name: "Twilight Trill",
        type: "all",
        costEN: 120,
        genEN: 5,
        hits: 6,
        hitSplit: [0.15, 0.15, 0.15, 0.15, 0.15, 0.25],
        multiplier: this.scaling.ultDmg[uIdx],
        toughnessDamage: 20,
        vfx: "fx-lightning-explosion",
        voiceline: "Time to say bye. BOOM.",
        onHit: (target, isMain, squad) => {
          this.applyShock(target);
          this.detonateDoTs(target, detonateMult, "SHOCK", squad);
        },
      };
    }
  },

  detonateDoTs: function (target, percentage, specificType = null, squad = []) {
    let totalDetonateDmg = 0;
    let kafkaShockDetonated = false;

    if (
      target.state.breakDebuff &&
      (!specificType || target.state.breakDebuff.name === specificType)
    ) {
      let dmg =
        target.state.breakDebuff.tickDamage ||
        target.state.breakDebuff.baseTickDamage *
          target.state.breakDebuff.stacks ||
        0;
      totalDetonateDmg += dmg * percentage;
    }

    if (target.state.customDoTs) {
      target.state.customDoTs.forEach((dot) => {
        if (!specificType || dot.name === specificType) {
          totalDetonateDmg += dot.tickDamage * percentage;
          if (dot.source === "kafka_shock") kafkaShockDetonated = true;
        }
      });
    }

    totalDetonateDmg = Math.floor(totalDetonateDmg);
    if (totalDetonateDmg > 0) {
      // ✨ E2: 25% DMG Boost if Kafka is E2+ and alive
      const isE2Active = squad.some(
        (h) => h.id === "kafka" && h.hp > 0 && h.eidolon >= 2,
      );
      if (isE2Active) totalDetonateDmg = Math.floor(totalDetonateDmg * 1.25);

      target.hp = Math.max(0, target.hp - totalDetonateDmg);
      if (window.playDetonateVFX)
        window.playDetonateVFX(target, totalDetonateDmg);

      // ✨ E4: Gain 2 Energy when Shock takes damage!
      if (kafkaShockDetonated && this.eidolon >= 4) {
        this.energy = Math.min(this.maxEnergy, this.energy + 2);
        if (window.updateUI) window.updateUI(); // Keep the energy bar visually accurate
      }
    }
  },
};

