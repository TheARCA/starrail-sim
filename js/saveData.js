// --- saveData.js ---
import { heroDatabase } from "./heroes.js";

export let playerSaveData = { heroes: {} };

export function initSaveData() {
  Object.keys(heroDatabase).forEach((id) => {
    playerSaveData.heroes[id] = {
      id: id,
      level: 1,
      equippedLightCone: null,
      lcLevel: 1,
      lcSuperimposition: 1,
      basicLvl: 1,
      skillLvl: 1,
      ultLvl: 1,
      talentLvl: 1,
      eidolon: 0,
    };
  });
}

initSaveData();
