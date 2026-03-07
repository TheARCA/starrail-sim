export const lightconeDatabase = {
  lc_aeon: {
    id: "lc_aeon",
    name: "On the Fall of an Aeon",
    path: "destruction",
    imageSrc: "https://placehold.co/500x700/png?text=LC+IMAGE",
    stats: {
      1: { hp: 48, atk: 24, def: 18 },
      20: { hp: 184, atk: 92, def: 69 },
      30: { hp: 314, atk: 157, def: 117 },
      40: { hp: 463, atk: 231, def: 173 },
      50: { hp: 612, atk: 306, def: 229 },
      60: { hp: 760, atk: 380, def: 285 },
      70: { hp: 909, atk: 454, def: 341 },
      80: { hp: 1058, atk: 529, def: 396 },
    },

    passiveAtkPerStack: [0.08, 0.1, 0.12, 0.14, 0.16],
    passiveBreakDmg: [0.12, 0.15, 0.18, 0.21, 0.24],

    getDescription: function (si) {
      const idx = (si || 1) - 1;
      const atk = (this.passiveAtkPerStack[idx] * 100).toFixed(0);
      const dmg = (this.passiveBreakDmg[idx] * 100).toFixed(0);
      return `	Setiap kali pengguna melancarkan serangan, ATK dari pengguna akan meningkat <span class="lc-highlight">${atk}%</span> selama pertempuran, efek tersebut dapat ditumpuk hingga 4 lapis. Ketika pengguna mengakibatkan Weakness Break pada target musuh, DMG yang diakibatkan pengguna akan meningkat <span class="lc-highlight">${dmg}%</span> selama 2 giliran.`;
    },

    init: function (hero) {
      hero.lcState = { atkStacks: 0, breakBuffTurns: 0 };
    },
    onAttack: function (hero) {
      if (hero.lcState.atkStacks < 4) hero.lcState.atkStacks++;
    },
    onBreak: function (hero) {
      hero.lcState.breakBuffTurns = 2;
    },
    onTurnStart: function (hero) {
      if (hero.lcState.breakBuffTurns > 0) hero.lcState.breakBuffTurns--;
    },
    getDynamicAtk: function (hero) {
      const siIndex = (hero.lcSuperimposition || 1) - 1; // Converts SI 1 to Array Index 0
      return hero.lcState.atkStacks * this.passiveAtkPerStack[siIndex];
    },
    getDynamicDmg: function (hero) {
      const siIndex = (hero.lcSuperimposition || 1) - 1;
      return hero.lcState.breakBuffTurns > 0
        ? this.passiveBreakDmg[siIndex]
        : 0;
    },
  },

  lc_dayone: {
    id: "lc_dayone",
    name: "Day One of My New Life",
    path: "preservation",
    imageSrc: "https://placehold.co/500x700/png?text=DAY+ONE",
    stats: {
      1: { hp: 43, atk: 16, def: 21 },
      20: { hp: 166, atk: 64, def: 80 },
      30: { hp: 282, atk: 110, def: 137 },
      40: { hp: 416, atk: 162, def: 202 },
      50: { hp: 550, atk: 214, def: 267 },
      60: { hp: 684, atk: 266, def: 332 },
      70: { hp: 818, atk: 318, def: 397 },
      80: { hp: 952, atk: 370, def: 463 },
    },

    passiveDef: [0.16, 0.18, 0.2, 0.22, 0.24],
    passiveRes: [0.08, 0.09, 0.1, 0.11, 0.12],

    getDescription: function (si) {
      const idx = (si || 1) - 1;
      const def = (this.passiveDef[idx] * 100).toFixed(0);
      const res = (this.passiveRes[idx] * 100).toFixed(0);
      return `	Meningkatkan <span class="lc-highlight">${def}%</span> DEF pengguna. Setelah memasuki pertempuran, meningkatkan <span class="lc-highlight">${res}%</span> RES seluruh tipe seluruh rekan tim. Kemampuan yang serupa efeknya tidak dapat ditumpuk.`;
    },

    init: function (hero) {
      const siIndex = (hero.lcSuperimposition || 1) - 1;
      hero.baseDef = Math.floor(hero.baseDef * (1 + this.passiveDef[siIndex]));
    },

    // ✨ NEW: Tells the Loadout UI to add the DEF% to the character's stats instantly!
    onEquip: function (hero, si) {
      const siIndex = (si || 1) - 1;
      hero.defPctBonus += this.passiveDef[siIndex];
    },

    onBattleStart: function (hero, squad) {
      const siIndex = (hero.lcSuperimposition || 1) - 1;
      const resBuff = this.passiveRes[siIndex];

      squad.forEach((ally) => {
        ally.lcBuffs = ally.lcBuffs || {};

        // ✨ Only applies the buff if they don't have it, preventing multiple Day Ones from stacking
        if (!ally.lcBuffs.dayOneRes || ally.lcBuffs.dayOneRes < resBuff) {
          const oldBuff = ally.lcBuffs.dayOneRes || 0;
          ally.res = (ally.res || 0) - oldBuff + resBuff;
          ally.lcBuffs.dayOneRes = resBuff;
        }
      });
    },
  },

  lc_onlysilence: {
    id: "lc_onlysilence",
    name: "Only Silence Remains",
    path: "hunt",
    imageSrc: "https://placehold.co/500x700/png?text=ONLY+SILENCE",
    stats: {
      1: { hp: 43, atk: 21, def: 15 },
      20: { hp: 166, atk: 83, def: 57 },
      30: { hp: 216, atk: 110, def: 60 },
      40: { hp: 266, atk: 136, def: 74 },
      50: { hp: 317, atk: 162, def: 88 },
      60: { hp: 367, atk: 188, def: 103 },
      70: { hp: 418, atk: 214, def: 117 },
      80: { hp: 952, atk: 476, def: 264 },
    },

    passiveAtk: [0.16, 0.2, 0.24, 0.28, 0.32],
    passiveCrit: [0.12, 0.15, 0.18, 0.21, 0.24],

    getDescription: function (si) {
      const idx = (si || 1) - 1;
      const atk = (this.passiveAtk[idx] * 100).toFixed(0);
      const crit = (this.passiveCrit[idx] * 100).toFixed(0);
      return `Increases the wearer's ATK by <span class="lc-highlight">${atk}%</span>. If there are 2 or fewer enemies on the field, increases wearer's CRIT Rate by <span class="lc-highlight">${crit}%</span>.`;
    },

    init: function (hero) {
      const siIndex = (hero.lcSuperimposition || 1) - 1;
      // ✨ Applies the static ATK bonus directly to base stats!
      hero.baseAtk = Math.floor(hero.baseAtk * (1 + this.passiveAtk[siIndex]));
    },

    // ✨ NEW: Tells the Loadout UI to add the ATK% to the character's stats instantly!
    onEquip: function (hero, si) {
      const siIndex = (si || 1) - 1;
      hero.atkPctBonus += this.passiveAtk[siIndex];
    },

    // ✨ NEW: Dynamic Hook that checks the enemy count!
    getDynamicCritRate: function (hero, enemyCount) {
      const siIndex = (hero.lcSuperimposition || 1) - 1;
      if (enemyCount <= 2) {
        return this.passiveCrit[siIndex];
      }
      return 0;
    },
  },
  lc_patience: {
    id: "lc_patience",
    name: "Patience Is All You Need",
    path: "nihility",
    imageSrc: "https://placehold.co/500x700/png?text=PATIENCE",
    stats: {
      1: { hp: 48, atk: 26, def: 21 },
      20: { hp: 184, atk: 101, def: 80 },
      30: { hp: 240, atk: 132, def: 105 },
      40: { hp: 296, atk: 163, def: 129 },
      50: { hp: 352, atk: 194, def: 154 },
      60: { hp: 408, atk: 225, def: 178 },
      70: { hp: 464, atk: 256, def: 203 },
      80: { hp: 1058, atk: 582, def: 463 }, // Official 5-Star Stats
    },

    passiveDmg: [0.24, 0.28, 0.32, 0.36, 0.4],
    passiveSpd: [0.048, 0.056, 0.064, 0.072, 0.08],
    passiveErode: [0.6, 0.7, 0.8, 0.9, 1.0],

    getDescription: function (si) {
      const idx = (si || 1) - 1;
      const dmg = (this.passiveDmg[idx] * 100).toFixed(0);
      const spd = (this.passiveSpd[idx] * 100).toFixed(1);
      const erode = (this.passiveErode[idx] * 100).toFixed(0);
      return `Increases DMG dealt by the wearer by <span class="lc-highlight">${dmg}%</span>. After every attack launched by wearer, their SPD increases by <span class="lc-highlight">${spd}%</span>, stacking up to 3 times. If the wearer hits an enemy target that is not afflicted by Erode, there is a 100% base chance to inflict Erode to the target. Enemies afflicted with Erode are also considered to be Shocked and will receive Lightning DoT at the start of each turn equal to <span class="lc-highlight">${erode}%</span> of the wearer's ATK, lasting for 1 turn(s).`;
    },

    init: function (hero) {
      hero.lcState = { spdStacks: 0 };
    },

    getDynamicDmg: function (hero) {
      const siIndex = (hero.lcSuperimposition || 1) - 1;
      return this.passiveDmg[siIndex];
    },

    // Triggered at the start of an attack to stack the SPD buff
    onAttack: function (hero) {
      const siIndex = (hero.lcSuperimposition || 1) - 1;
      if (hero.lcState.spdStacks < 3) {
        hero.lcState.spdStacks++;
        // Applies the percentage to their Base Speed!
        hero.spd = Math.floor(
          hero.baseSpd *
            (1 + hero.lcState.spdStacks * this.passiveSpd[siIndex]),
        );
      }
    },

    // ✨ NEW: Triggered when the attack connects with a target
    onHit: function (hero, target) {
      const siIndex = (hero.lcSuperimposition || 1) - 1;
      target.state.customDoTs = target.state.customDoTs || [];

      // Check if they already have Erode!
      const hasErode = target.state.customDoTs.some(
        (dot) => dot.source === "erode",
      );

      if (!hasErode) {
        target.state.customDoTs.push({
          source: "erode", // Separate source from kafka_shock
          type: "lightning",
          name: "SHOCK", // ✨ Treated mechanically as Shock!
          duration: 1, // Lasts exactly 1 turn
          tickDamage: Math.floor(
            hero.baseAtk *
              (1 + (hero.getDynamicAtkHero ? hero.getDynamicAtkHero() : 0)) *
              this.passiveErode[siIndex],
          ),
        });
      }
    },
  },
};
