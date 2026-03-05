export const voidranger_disorter = {
  id: "voidranger_disorter", // Using your exact ID!
  name: "Voidranger: Distorter",
  imageSrc: "https://placehold.co/200x200/png?text=DISTORTER", // Replace later
  type: "quantum",
  isElite: false,

  baseHp: 134,
  baseAtk: 12,
  baseDef: 210,
  baseSpd: 120,
  baseToughness: 20,

  weaknesses: ["wind", "imaginary"],

  baseRes: {
    physical: 0.2,
    fire: 0.2,
    ice: 0.2,
    lightning: 0.2,
    wind: 0.0,
    quantum: 0.2,
    imaginary: 0.0,
  },

  debuffRes: { all: 0.0 },

  // ✨ NEW: The AI now receives the current state of the board!
  getAIAction: function (aliveEnemies, aliveHeroes) {
    const hasAllies = aliveEnemies.filter((e) => e.uid !== this.uid).length > 0;
    const isSomeoneLockedOn = aliveHeroes.some((h) => h.state.lockOnTurns > 0);

    // If there is another enemy AND no one is marked yet, use Nihility's Command!
    if (hasAllies && !isSomeoneLockedOn) {
      return {
        name: "Nihility's Command",
        type: "single",
        multiplier: 0, // Deals 0 damage
        vfx: "fx-lock-on",
        // ✨ NEW: Custom hook to apply statuses!
        onHit: (target) => {
          if (!target.state.lockOnTurns) {
            target.vulnerabilities = target.vulnerabilities || { universal: 0 };
            target.vulnerabilities.universal += 0.1; // Apply 10% Vulnerability
          }
          target.state.lockOnTurns = 2; // Lasts 2 turns
        },
      };
    }

    // Otherwise, nuke someone with Shadowless Void Strike
    return {
      name: "Shadowless Void Strike",
      type: "single",
      multiplier: 5.0, // 500% ATK
      energyGain: 15,
      vfx: "fx-quantum-strike",
    };
  },
};
