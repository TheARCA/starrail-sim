export function triggerAnimation(element, animClass) {
  if (!element) return;
  element.classList.remove(animClass);
  void element.offsetWidth;
  element.classList.add(animClass);
  element.addEventListener("animationend", function handler() {
    element.classList.remove(animClass);
    element.removeEventListener("animationend", handler);
  });
}

export function playVisualEffect(
  targetId,
  type,
  value = "",
  isCrit = false,
  elementType = "physical",
  isBreakDmg = false,
) {
  if (type.startsWith("fx-ult")) {
    const ultNode = document.createElement("div");
    ultNode.className = type;
    document.body.appendChild(ultNode);
    setTimeout(() => ultNode.remove(), 2500);
    return;
  }

  const targetCard =
    document.getElementById(targetId) || document.querySelector(".arena");

  if (type === "skill-name") {
    const textNode = document.createElement("div");
    textNode.className = "fx-skill-name";
    textNode.innerText = value;
    targetCard.appendChild(textNode);
    setTimeout(() => textNode.remove(), 1200);
    return;
  }

  const frame = targetCard.querySelector
    ? targetCard.querySelector(".portrait-frame")
    : targetCard;
  const fxLayer = document.createElement("div");
  fxLayer.className = "effect-layer";

  if (type === "dmg" || type === "heal" || type === "shield") {
    const num = document.createElement("div");
    num.className = "fx-float-text"; // ✨ MASTER BASE CLASS

    // ✨ ADD RANDOM SPREAD (-20px to +20px from center)
    const randomX = (Math.random() - 0.5) * 40;
    const randomY = (Math.random() - 0.5) * 40;

    if (type === "dmg") {
      num.classList.add("fx-dmg-num", `color-${elementType}`);
      const tx = (Math.random() - 0.5) * 120;
      num.style.setProperty("--tx", `${tx}px`);

      if (isCrit) {
        num.classList.add("crit-hit");
        num.setAttribute("data-title", "CRIT!");
      }
      if (isBreakDmg) {
        num.classList.add("break-bonus");
        num.setAttribute("data-title", "BREAK");
      }
    } else if (type === "heal") {
      num.classList.add("fx-heal-num");
      num.setAttribute("data-title", "HEAL");
    } else if (type === "shield") {
      num.classList.add("fx-shield-num");
      num.setAttribute("data-title", "SHIELD");
    }

    num.innerText = Math.floor(value);
    num.style.left = `calc(50% + ${randomX}px)`;
    num.style.top = `calc(40% + ${randomY}px)`;
    fxLayer.appendChild(num);
  } else if (type === "break") {
    const breakText = document.createElement("div");
    breakText.className = `fx-break-text color-${elementType}`;
    breakText.innerText = "BREAK!";
    fxLayer.appendChild(breakText);
  } else if (type === "shatter") {
    for (let i = 0; i < 12; i++) {
      const p = document.createElement("div");
      p.className = `fx-particle type-${elementType}`;
      const px = (Math.random() - 0.5) * 200;
      const py = (Math.random() - 0.5) * 200;
      p.style.setProperty("--px", `${px}px`);
      p.style.setProperty("--py", `${py}px`);
      p.style.left = "50%";
      p.style.top = "50%";
      fxLayer.appendChild(p);
    }
  } else if (type === "overkill" || type === "detonated") {
    const stamp = document.createElement("div");
    stamp.className = "fx-overkill-stamp";
    stamp.innerText = type === "overkill" ? "OVERKILL" : "DETONATED!";

    if (type === "detonated") {
      stamp.style.color = "#e056fd";
      stamp.style.borderColor = "#e056fd";
      stamp.style.textShadow = "4px 4px 0 #000, 0 0 20px #e056fd";
    }

    stamp.style.left = "50%";
    stamp.style.top = "50%";
    fxLayer.appendChild(stamp);
  } else {
    const fx = document.createElement("div");
    fx.className = type;
    fxLayer.appendChild(fx);
    if (frame.classList) triggerAnimation(frame, "fx-flash");
  }

  // ✨ FIXED: Append directly to targetCard so it spills OUT of the portrait frame!
  targetCard.appendChild(fxLayer);
  setTimeout(() => fxLayer.remove(), 1000);
}

export function animateSP(targetId, type) {
  const heroCard = document.getElementById(targetId);
  const spHud = document.querySelector(".sp-hud-container");
  if (!heroCard || !spHud) return;

  const heroRect = heroCard.getBoundingClientRect();
  const spRect = spHud.getBoundingClientRect();

  const pip = document.createElement("div");
  pip.className = `sp-fly-pip ${type === "gain" ? "sp-gain" : "sp-spend"}`;

  let startX, startY, endX, endY;

  if (type === "gain") {
    // Basic Attack: Flies from Hero to the SP Bar
    startX = heroRect.left + heroRect.width / 2;
    startY = heroRect.top + heroRect.height / 2;
    endX = spRect.left + spRect.width / 2;
    endY = spRect.top + spRect.height / 2;
  } else {
    // Skill: Flies from SP Bar to Hero
    startX = spRect.left + spRect.width / 2;
    startY = spRect.top + spRect.height / 2;
    endX = heroRect.left + heroRect.width / 2;
    endY = heroRect.top + heroRect.height / 2;
  }

  pip.style.left = `${startX}px`;
  pip.style.top = `${startY}px`;

  // Pass the target distance into CSS via CSS Variables!
  pip.style.setProperty("--dx", `${endX - startX}px`);
  pip.style.setProperty("--dy", `${endY - startY}px`);

  document.body.appendChild(pip);

  // Remove the div exactly when the animation finishes
  setTimeout(() => pip.remove(), 1000);
}
