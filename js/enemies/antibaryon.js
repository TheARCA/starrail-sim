export const antibaryon = {
  id: "antibaryon",
  name: "Antibaryon",
  imageSrc: "https://placehold.co/200x200/png?text=ANTIBARYON", // Replace with your webp later!
  type: "imaginary",
  isElite: false,

  // Core Stats
  baseHp: 45,
  baseAtk: 12,
  baseDef: 210,
  baseSpd: 83,
  baseToughness: 10,

  weaknesses: ["physical", "quantum"],

  // 0% for weaknesses, 20% for everything else
  baseRes: {
    physical: 0.0,
    fire: 0.2,
    ice: 0.2,
    lightning: 0.2,
    wind: 0.2,
    quantum: 0.0,
    imaginary: 0.2,
  },

  debuffRes: {
    all: 0.0, // Ready for future Effect Hit Rate math!
  },

  getAIAction: function () {
    return {
      name: "Obliterate",
      type: "single",
      multiplier: 2.5, // 250% ATK
      energyGain: 10, // Grants 10 Energy to the target it hits
      vfx: "fx-imaginary-strike",
    };
  },
};
