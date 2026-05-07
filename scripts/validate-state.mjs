import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sheet = JSON.parse(
  readFileSync(resolve(root, "character_sheet.json"), "utf8"),
);

const errors = [];
const warnings = [];

function isInteger(value) {
  return Number.isInteger(value);
}

function checkRange(label, current, max) {
  if (!isInteger(current) || !isInteger(max)) {
    errors.push(`${label} must use integer current/max values.`);
    return;
  }

  if (current < 0 || max < 0 || current > max) {
    errors.push(`${label} is out of range: ${current}/${max}.`);
  }
}

if (!sheet.party_name) {
  errors.push("Missing party_name.");
}

if (!Array.isArray(sheet.characters) || sheet.characters.length === 0) {
  errors.push("characters must be a non-empty array.");
}

for (const character of sheet.characters || []) {
  const label = character.name || "Unnamed character";

  if (!character.name) errors.push("A character is missing name.");
  if (!character.class) errors.push(`${label} is missing class.`);
  if (!isInteger(character.level) || character.level < 1) {
    errors.push(`${label} has invalid level.`);
  }
  if (!isInteger(character.xp) || character.xp < 0) {
    errors.push(`${label} has invalid xp.`);
  }
  if (!isInteger(character.gold) || character.gold < 0) {
    errors.push(`${label} has invalid gold.`);
  }
  if (!isInteger(character.ac) || character.ac < 1) {
    errors.push(`${label} has invalid ac.`);
  }

  if (!character.hp) {
    errors.push(`${label} is missing hp.`);
  } else {
    checkRange(`${label} hp`, character.hp.current, character.hp.max);
  }

  if (!character.hit_dice) {
    warnings.push(`${label} is missing hit_dice.`);
  } else {
    checkRange(
      `${label} hit dice`,
      character.hit_dice.current,
      character.hit_dice.max,
    );
    if (!/^d(6|8|10|12)$/.test(character.hit_dice.die || "")) {
      errors.push(`${label} has invalid hit die: ${character.hit_dice.die}.`);
    }
  }

  if (!Array.isArray(character.inventory)) {
    errors.push(`${label} inventory must be an array.`);
  } else {
    for (const item of character.inventory) {
      if (/\b\d+\s*GP\b/i.test(item)) {
        warnings.push(
          `${label} inventory contains "${item}"; track coin in gold instead.`,
        );
      }
    }

    const arrowItem = character.inventory.find((item) => /\bArrows\b/i.test(item));
    const arrowMatch = arrowItem?.match(/\b(\d+)\s+Arrows\b/i);
    const arrowResource = character.resources?.arrows;
    if (arrowMatch && arrowResource && Number(arrowMatch[1]) !== arrowResource.current) {
      warnings.push(
        `${label} inventory arrow count (${arrowMatch[1]}) differs from resources.arrows.current (${arrowResource.current}).`,
      );
    }
  }

  if (!Array.isArray(character.conditions)) {
    errors.push(`${label} conditions must be an array.`);
  }

  for (const [resourceName, resource] of Object.entries(
    character.resources || {},
  )) {
    if (
      typeof resource === "object" &&
      resource !== null &&
      "current" in resource &&
      "max" in resource
    ) {
      checkRange(`${label} resource ${resourceName}`, resource.current, resource.max);
    }
  }

  for (const [slotName, slot] of Object.entries(character.spells?.slots || {})) {
    if (typeof slot === "number") {
      warnings.push(
        `${label} spell slot ${slotName} uses legacy number format; prefer { current, max }.`,
      );
      continue;
    }
    checkRange(`${label} spell slot ${slotName}`, slot.current, slot.max);
  }
}

if (sheet.party_loot && !Array.isArray(sheet.party_loot)) {
  errors.push("party_loot must be an array when present.");
}

if (sheet.active_combat !== null && typeof sheet.active_combat !== "object") {
  errors.push("active_combat must be null or an object.");
}

for (const warning of warnings) {
  console.warn(`warning: ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`error: ${error}`);
  }
  process.exit(1);
}

console.log(
  `State OK: ${sheet.characters.length} characters, ${warnings.length} warning(s).`,
);
