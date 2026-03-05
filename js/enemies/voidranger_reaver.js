export const voidranger_reaver = {
  id: "voidranger_reaver",
  name: "Voidranger: Reaver",
  imageSrc: "https://placehold.co/200x200/png?text=NO IMAGE",
  type: "imaginary",
  level: 1,
  baseHp: 112,
  baseSpd: 100,
  baseAtk: 12,
  baseToughness: 20,
  weaknesses: ["physical", "lightning"],

  baseRes: {
    physical: 0.0,
    fire: 0.2,
    ice: 0.2,
    lightning: 0.0,
    wind: 0.2,
    quantum: 0.2,
    imaginary: 0.2,
  },

  getAIAction: function () {
    const isBlast = Math.random() > 0.5;

    if (isBlast) {
      return {
        name: "VORTEX LEAP",
        type: "blast",
        multiplier: 1.5,
        energyGain: 5,
        vfx: "fx-imaginary-blast",
      };
    } else {
      return {
        name: "HUNTING BLADE",
        type: "single",
        multiplier: 2.5,
        energyGain: 10,
        vfx: "fx-imaginary-slash",
      };
    }
  },
};
