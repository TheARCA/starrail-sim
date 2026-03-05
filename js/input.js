// --- input.js ---
import { playSFX } from "./audio.js";

export function handleKeyboardInput(e, state, callbacks) {
  // Unpack the current game state passed from combat.js
  const {
    isInputPhase,
    isInterceptionTurn,
    isBattleActive,
    activeEntity,
    selectedAction,
    targetHeroIndex,
    targetEnemyIndex,
    playerSquad,
    enemySquad,
    btnDisabledState,
  } = state;

  if ((!isInputPhase && !isInterceptionTurn) || !isBattleActive) return;

  const key = e.key.toLowerCase();
  const currentHero = activeEntity && activeEntity.isHero ? activeEntity : null;
  if (!currentHero) return;

  const ui = currentHero.getButtonUI();

  // 1. SELECT ACTION (Q, E, R)
  if (key === "q" && !btnDisabledState.basic) callbacks.handleAction("basic");
  if (key === "e" && !btnDisabledState.skill) callbacks.handleAction("skill");
  if (key === "r" && !btnDisabledState.ult) callbacks.handleAction("ultimate");

  if (selectedAction) {
    const actionKey = selectedAction === "ultimate" ? "ult" : selectedAction;
    const targetType = ui[actionKey] ? ui[actionKey].targetType : "single";

    // 2. EXECUTE ACTION (Spacebar)
    if (e.code === "Space") {
      e.preventDefault(); // Prevent page scroll
      if (selectedAction) callbacks.handleAction(selectedAction);
      return;
    }

    // 3. CANCEL SELECTION (S)
    if (key === "s") {
      if (
        (isInterceptionTurn && currentHero.state.isEnhanced) ||
        !isInterceptionTurn
      ) {
        callbacks.setSelectedAction(null);
        playSFX("hover");
        callbacks.updateUI();
      }
    }

    // 4. NAVIGATE TARGETS LEFT (A)
    if (key === "a") {
      if (targetType === "ally") {
        let newIdx = targetHeroIndex - 1;
        while (newIdx >= 0 && playerSquad[newIdx].hp <= 0) newIdx--;
        if (newIdx >= 0) {
          callbacks.setTargetHero(newIdx);
          playSFX("hover");
          callbacks.updateUI();
        }
      } else if (targetType !== "enhance" && targetType !== "all") {
        let newIdx = targetEnemyIndex - 1;
        while (newIdx >= 0 && enemySquad[newIdx].hp <= 0) newIdx--;
        if (newIdx >= 0) {
          callbacks.setTargetEnemy(newIdx);
          playSFX("hover");
          callbacks.updateUI();
        }
      }
    }

    // 5. NAVIGATE TARGETS RIGHT (D)
    if (key === "d") {
      if (targetType === "ally") {
        let newIdx = targetHeroIndex + 1;
        while (newIdx < playerSquad.length && playerSquad[newIdx].hp <= 0)
          newIdx++;
        if (newIdx < playerSquad.length) {
          callbacks.setTargetHero(newIdx);
          playSFX("hover");
          callbacks.updateUI();
        }
      } else if (targetType !== "enhance" && targetType !== "all") {
        let newIdx = targetEnemyIndex + 1;
        while (newIdx < enemySquad.length && enemySquad[newIdx].hp <= 0)
          newIdx++;
        if (newIdx < enemySquad.length) {
          callbacks.setTargetEnemy(newIdx);
          playSFX("hover");
          callbacks.updateUI();
        }
      }
    }
  }
}
