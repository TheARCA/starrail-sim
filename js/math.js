// --- math.js ---
const BREAK_LEVEL_MULTIPLIERS = {
  1: 54.0,
  2: 58.0,
  3: 62.0,
  4: 67.5264,
  5: 70.5094,
  6: 73.5228,
  7: 76.566,
  8: 79.6385,
  9: 82.7395,
  10: 85.8684,
  11: 91.4944,
  12: 97.068,
  13: 102.5892,
  14: 108.0579,
  15: 113.4743,
  16: 118.8383,
  17: 124.1499,
  18: 129.4091,
  19: 134.6159,
  20: 139.7703,
  21: 149.3323,
  22: 158.8011,
  23: 168.1768,
  24: 177.4594,
  25: 186.6489,
  26: 195.7452,
  27: 204.7484,
  28: 213.6585,
  29: 222.4754,
  30: 231.1992,
  31: 246.4276,
  32: 261.181,
  33: 275.4733,
  34: 289.3179,
  35: 302.7275,
  36: 315.7144,
  37: 328.2905,
  38: 340.4671,
  39: 352.2554,
  40: 363.6658,
  41: 408.124,
  42: 451.7883,
  43: 494.6798,
  44: 536.8188,
  45: 578.2249,
  46: 618.9172,
  47: 658.9138,
  48: 698.2325,
  49: 736.8905,
  50: 774.9041,
  51: 871.0599,
  52: 964.8705,
  53: 1056.4206,
  54: 1145.791,
  55: 1233.0585,
  56: 1318.2965,
  57: 1401.575,
  58: 1482.9608,
  59: 1562.5178,
  60: 1640.3068,
  61: 1752.3215,
  62: 1861.9011,
  63: 1969.1242,
  64: 2074.0659,
  65: 2176.7983,
  66: 2277.3904,
  67: 2375.9085,
  68: 2472.416,
  69: 2566.9739,
  70: 2659.6406,
  71: 2780.3044,
  72: 2898.6022,
  73: 3014.6029,
  74: 3128.3729,
  75: 3239.9758,
  76: 3349.473,
  77: 3456.9236,
  78: 3562.3843,
  79: 3665.9099,
  80: 3767.5533,
  81: 3957.8618,
  82: 4155.2118,
  83: 4359.8638,
  84: 4572.0878,
  85: 4792.1641,
  86: 5020.3833,
  87: 5257.0466,
  88: 5502.4664,
  89: 5756.9667,
  90: 6020.8836,
  91: 6294.5654,
  92: 6578.3734,
  93: 6872.6823,
  94: 7177.8806,
  95: 7494.3713,
};

const BREAK_TYPE_MULTIPLIERS = {
  physical: 2.0,
  fire: 2.0,
  ice: 1.0,
  lightning: 1.0,
  wind: 1.5,
  quantum: 0.5,
  imaginary: 0.5,
};

export function calculateDamage(
  attacker,
  defender,
  multiplier,
  flatDamageBonus = 0,
  enemyCount = 1,
  isFUA = false,
) {
  const aLevel = attacker.level || 1;
  const dLevel = defender.level || 1;

  let atkBonus = 0;
  let dmgBonus = 0;

  if (attacker.isHero && attacker.lightCone) {
    if (attacker.lightCone.getDynamicAtk)
      atkBonus += attacker.lightCone.getDynamicAtk(attacker);
    if (attacker.lightCone.getDynamicDmg)
      dmgBonus += attacker.lightCone.getDynamicDmg(attacker);
  }

  // ✨ NEW: Apply specific FUA Damage Multipliers!
  if (isFUA && attacker.isHero) {
    if (attacker.fuaDmgBonus) dmgBonus += attacker.fuaDmgBonus;
    if (attacker.lightCone && attacker.lightCone.getDynamicFuaDmg) {
      dmgBonus += attacker.lightCone.getDynamicFuaDmg(attacker);
    }
  }

  if (attacker.isHero && attacker.getDynamicAtkHero)
    atkBonus += attacker.getDynamicAtkHero();

  if (attacker.isHero && attacker.getDynamicDmgHero)
    dmgBonus += attacker.getDynamicDmgHero();

  let critRateBonus = 0;

  if (attacker.isHero && attacker.getDynamicCritRate) {
    critRateBonus += attacker.getDynamicCritRate(defender);
  }

  if (
    attacker.isHero &&
    attacker.lightCone &&
    attacker.lightCone.getDynamicCritRate
  ) {
    critRateBonus += attacker.lightCone.getDynamicCritRate(
      attacker,
      enemyCount,
    );
  }

  // BASE DAMAGE CALCULATION
  const finalAtk = attacker.baseAtk * (1 + atkBonus);
  const baseDamage = finalAtk * multiplier + flatDamageBonus;
  const dmgBoosted = baseDamage * (1 + dmgBonus);

  // DEF MULTIPLIER
  let defMultiplier;
  if (defender.isHero && defender.baseDef !== undefined) {
    defMultiplier =
      1 - defender.baseDef / (defender.baseDef + 200 + 10 * aLevel);
  } else {
    defMultiplier = (aLevel + 20) / (dLevel + aLevel + 40);
  }

  // ✨ FIXED: DYNAMIC RES MULTIPLIER
  let resTarget = 0;
  if (defender.baseRes && defender.baseRes[attacker.type] !== undefined) {
    // 1. Check if the enemy has a specific resistance to this element
    resTarget = defender.baseRes[attacker.type];
  } else if (!defender.isHero) {
    // 2. Smart Fallback: If no dictionary is found, default to 0% for weak, 20% for everything else!
    resTarget =
      defender.weaknesses && defender.weaknesses.includes(attacker.type)
        ? 0.0
        : 0.2;
  } else {
    // 3. Fallback for heroes being attacked
    resTarget = defender.res || 0;
  }

  const resPen = attacker.resPen || 0;
  const resMultiplier = 1 - (resTarget - resPen);

  // CRIT MULTIPLIER
  const roll = Math.random();
  const finalCritRate = (attacker.critRate || 0.05) + critRateBonus;
  const isCrit = roll < finalCritRate;
  const critMultiplier = isCrit ? 1 + (attacker.critDmg || 0.5) : 1;

  // ✨ NEW: VULNERABILITY MULTIPLIER (Normal Damage)
  let vulnMult = 1.0;
  if (defender.vulnerabilities) {
    let totalVuln =
      (defender.vulnerabilities.universal || 0) +
      (defender.vulnerabilities[attacker.type] || 0); // Elemental
    totalVuln = Math.max(-0.9, totalVuln); // Clamp at -90%
    vulnMult = 1.0 + totalVuln;
  }

  // ✨ UPDATED: FINAL DAMAGE MATH
  let finalDmg = Math.floor(
    dmgBoosted * defMultiplier * resMultiplier * critMultiplier * vulnMult,
  );

  // Broken targets lose their innate 10% DMG Reduction shield
  if (defender.isBroken) finalDmg = Math.floor(finalDmg * 1.11);

  return { damage: finalDmg || 0, isCrit: isCrit };
}

export function calculateBreakDamage(attacker, defender) {
  const aLevel = attacker.level || 1;
  const dLevel = defender.level || 1;

  const breakTypeMult = BREAK_TYPE_MULTIPLIERS[attacker.type] || 1.0;
  const levelMult =
    BREAK_LEVEL_MULTIPLIERS[aLevel] || BREAK_LEVEL_MULTIPLIERS[80];

  const maxToughness = defender.maxToughness || 30;
  const maxToughnessMult = 0.5 + maxToughness / 40;

  const breakEffect = attacker.breakEffect || 0;
  const defMultiplier = (aLevel + 20) / (dLevel + aLevel + 40);

  // ✨ FIXED: DYNAMIC RES MULTIPLIER (Same exact logic as above)
  let resTarget = 0;
  if (defender.baseRes && defender.baseRes[attacker.type] !== undefined) {
    resTarget = defender.baseRes[attacker.type];
  } else if (!defender.isHero) {
    resTarget =
      defender.weaknesses && defender.weaknesses.includes(attacker.type)
        ? 0.0
        : 0.2;
  } else {
    resTarget = defender.res || 0;
  }

  const resPen = attacker.resPen || 0;
  const resMultiplier = 1 - (resTarget - resPen);

  // ✨ NEW: VULNERABILITY MULTIPLIER (Break Initial Hit)
  let vulnMult = 1.0;
  if (defender.vulnerabilities) {
    let totalVuln =
      (defender.vulnerabilities.universal || 0) +
      (defender.vulnerabilities[attacker.type] || 0) +
      (defender.vulnerabilities.break || 0); // Break specific
    totalVuln = Math.max(-0.9, totalVuln); // Clamp
    vulnMult = 1.0 + totalVuln;
  }

  // ✨ UPDATED: RAW BREAK DAMAGE
  const rawBreakDmg =
    breakTypeMult *
    levelMult *
    maxToughnessMult *
    (1 + breakEffect) *
    defMultiplier *
    resMultiplier *
    vulnMult;

  return Math.floor(rawBreakDmg);
}

export function calculateBreakDebuff(attacker, defender) {
  const aLevel = attacker.level || 1;
  const dLevel = defender.level || 1;

  // We use the Level Multiplier dictionary to get the true HSR scaling numbers
  const levelMult =
    BREAK_LEVEL_MULTIPLIERS[aLevel] || BREAK_LEVEL_MULTIPLIERS[80];

  const maxToughness = defender.maxToughness || 30;
  const maxToughnessMult = 0.5 + maxToughness / 40;

  const breakEffect = attacker.breakEffect || 0;
  const defMultiplier = (aLevel + 20) / (dLevel + aLevel + 40);

  // Dynamic RES Math
  let resTarget = 0;
  if (defender.baseRes && defender.baseRes[attacker.type] !== undefined) {
    resTarget = defender.baseRes[attacker.type];
  } else if (!defender.isHero) {
    resTarget =
      defender.weaknesses && defender.weaknesses.includes(attacker.type)
        ? 0.0
        : 0.2;
  } else {
    resTarget = defender.res || 0;
  }

  const resPen = attacker.resPen || 0;
  const resMultiplier = 1 - (resTarget - resPen);

  const isElite = defender.isElite || false;

  let debuff = {
    type: attacker.type,
    duration: 2,
    tickDamage: 0,
    stacks: 1,
  };

  let vulnMult = 1.0;
  if (defender.vulnerabilities) {
    let totalVuln =
      (defender.vulnerabilities.universal || 0) +
      (defender.vulnerabilities[attacker.type] || 0) +
      (defender.vulnerabilities.dot || 0);
    totalVuln = Math.max(-0.9, totalVuln);
    vulnMult = 1.0 + totalVuln;
  }

  const commonMult =
    (1 + breakEffect) * defMultiplier * resMultiplier * vulnMult;

  if (attacker.type === "physical") {
    const baseBleed = (isElite ? 0.07 : 0.16) * defender.baseHp;
    const cap = 2 * levelMult * maxToughnessMult;
    debuff.tickDamage = Math.min(baseBleed, cap) * commonMult;
  } else if (attacker.type === "fire") {
    debuff.tickDamage = levelMult * commonMult;
  } else if (attacker.type === "lightning") {
    debuff.tickDamage = 2 * levelMult * commonMult;
  } else if (attacker.type === "wind") {
    debuff.stacks = isElite ? 3 : 1;
    debuff.baseTickDamage = levelMult * commonMult;
  } else if (attacker.type === "ice") {
    debuff.duration = 1;
    debuff.tickDamage = levelMult * commonMult;
  } else if (attacker.type === "quantum") {
    debuff.duration = 1;
    debuff.snapshot = { levelMult, maxToughnessMult, commonMult };
  } else if (attacker.type === "imaginary") {
    debuff.duration = 1;
  }

  debuff.tickDamage = Math.floor(Math.max(0, debuff.tickDamage));
  if (debuff.baseTickDamage)
    debuff.baseTickDamage = Math.floor(Math.max(0, debuff.baseTickDamage));

  return debuff;
}
