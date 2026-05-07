import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=") || true];
  }),
);

const encounter = String(args.get("encounter") || "Encounter 2");
const action = String(args.get("action") || "The party continues exploring.");
const notesLimit = args.get("notes") === "all" ? Infinity : Number(args.get("notes") || 6);

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8").trim();
}

function extractSection(markdown, headingText) {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) =>
    line.startsWith(`## ${headingText}`),
  );

  if (start === -1) {
    return undefined;
  }

  const next = lines.findIndex(
    (line, index) => index > start && line.startsWith("## "),
  );

  return lines.slice(start, next === -1 ? undefined : next).join("\n").trim();
}

function compactCharacters(characterSheet) {
  const sheet = JSON.parse(characterSheet);
  const notes =
    notesLimit === Infinity
      ? sheet.notes
      : (sheet.notes || []).slice(Math.max(0, sheet.notes.length - notesLimit));
  const characters = sheet.characters.map((character) => ({
    name: character.name,
    class: character.class,
    level: character.level,
    xp: character.xp,
    gold: character.gold,
    ac: character.ac,
    hp: character.hp,
    hit_dice: character.hit_dice,
    stats: character.stats,
    inventory: character.inventory,
    spells: character.spells,
    resources: character.resources || {},
    conditions: character.conditions || [],
    features: character.features,
  }));

  return JSON.stringify(
    {
      party_name: sheet.party_name,
      current_location: sheet.current_location,
      party_loot: sheet.party_loot || [],
      active_combat: sheet.active_combat || null,
      recent_notes: notes,
      characters,
    },
    null,
    2,
  );
}

const mission = read("GEMINI.md");
const resume = read("session-resume.txt");
const characterSheet = compactCharacters(read("character_sheet.json"));
const adventure = read("adventures/lv1-the-whispering-cellar.md");
const currentEncounter =
  extractSection(adventure, encounter) ||
  `No matching encounter named "${encounter}" found.`;

const minimalRules = `
- Ask for a d20 roll only when the outcome is uncertain and failure matters.
- Ability checks: d20 + relevant ability modifier + proficiency if applicable vs DC.
- Attack rolls: d20 + attack bonus vs AC. On a hit, apply damage and update HP.
- Saving throws: d20 + relevant save modifier vs DC. Apply listed success/failure effects.
- Keep responses short: describe the scene, request one clear player decision, and list state changes.
`.trim();

const prompt = `
${mission}

## Token Budget Rule
Use only the context below. Do not require the full SRD unless a specific rule is missing.

## Current Session
${resume}

## Character State
${characterSheet}

## Current Adventure Section
${currentEncounter}

## Minimal Rules Needed Now
${minimalRules}

## Player Action
${action}
`.trim();

console.log(prompt);
