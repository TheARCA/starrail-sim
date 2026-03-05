export const baryon = {
  id: "baryon",
  name: "Baryon",
  imageSrc: "https://placehold.co/200x200/png?text=NO IMAGE",
  type: "quantum",
  level: 1,
  baseHp: 45,
  baseSpd: 83,
  baseAtk: 12,
  baseToughness: 10,
  weaknesses: ["ice", "wind"],

  baseRes: {
    physical: 0.2,
    fire: 0.2,
    ice: 0.0,
    lightning: 0.2,
    wind: 0.0,
    quantum: 0.2,
    imaginary: 0.2,
  },

  getAIAction: function () {
    return {
      name: "OBLITERATE",
      type: "single",
      multiplier: 2.5,
      energyGain: 10,
      vfx: "fx-quantum-slash",
    };
  },
};
