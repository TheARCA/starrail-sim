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
      // ✨ NEW: Standardized empty relic schema!
      relics: {
        relicSet1: "",
        relicSet2: "",
        planarSet: "",
        mainStats: {
          body: "",
          boots: "",
          sphere: "",
          rope: "",
        },
        substatPriority: ["", "", "", ""],
      },
    };
  });
}

// Call it immediately on load
initSaveData();

// ✨ EXPORT PROTOCOL
export function exportLoadout() {
  const dataStr = JSON.stringify(playerSaveData, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "hsr_arcade_loadout.json"; // The name of the downloaded file
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ✨ IMPORT PROTOCOL
export function importLoadout(file, onSuccess) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target.result);
      if (importedData && importedData.heroes) {
        // We merge the data so we don't accidentally delete new heroes that
        // exist in the database but weren't in your old save file!
        Object.keys(importedData.heroes).forEach((id) => {
          if (playerSaveData.heroes[id]) {
            playerSaveData.heroes[id] = {
              ...playerSaveData.heroes[id],
              ...importedData.heroes[id],
            };
          }
        });
        if (onSuccess) onSuccess();
      } else {
        alert("/// ERROR: INVALID SAVE FILE ARCHITECTURE");
      }
    } catch (err) {
      alert("/// ERROR: FAILED TO PARSE JSON DATA");
    }
  };
  reader.readAsText(file);
}
