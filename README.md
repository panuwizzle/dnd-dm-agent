# DnD game with AI

## Setup

Pull the SRD

```
git submodule init
git submodule update
```

## Token-lite play context

Do not send the full SRD file to the AI during normal play. Build a small prompt
from the current session, current characters, current encounter, and only the
rules needed for the next action.

Example:

```bash
node scripts/build-context.mjs \
  --encounter="Encounter 2" \
  --action="Kaelen checks the smuggler's tunnel for traps."
```

This prints a compact prompt you can paste into the AI chat. Change
`--encounter` as the party moves through the adventure.

By default, only the latest six character-sheet notes are included. Use
`--notes=all` only when you deliberately want the full notes history.

## State validation

Run this after a session or after manual edits:

```bash
node scripts/validate-state.mjs
```

The validator catches common bookkeeping problems such as HP above maximum,
invalid spell slot/resource counts, stale coin entries in inventory, and arrow
count drift.
