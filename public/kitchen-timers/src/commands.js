// Turns what the speech recogniser heard into timer commands.
//
//   "duck on"            -> start duck
//   "duck off"           -> clear a ringing duck alarm, or cancel a running duck timer
//   "cancel duck"        -> same as "duck off"
//   "all off"            -> clear every ringing alarm
//
// Several commands can appear in one phrase ("duck on beef on").
// The recogniser often mishears short words, so "on" also accepts "one", "own"
// etc. Items can also have aliases for names it keeps getting wrong.

export const ON_WORDS = new Set(["on", "one", "1", "own", "won", "onn"]);
export const OFF_WORDS = new Set([
  "off",
  "of",
  "stop",
  "stopped",
  "done",
  "cancel",
  "clear",
]);
const OFF_PREFIX_WORDS = new Set(["cancel", "clear", "stop"]);
const FILLER_WORDS = new Set(["timer", "timers", "is", "the"]);
const ALL_WORDS = new Set(["all", "everything"]);

export function normalise(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokenise(text) {
  const n = normalise(text);
  return n ? n.split(" ") : [];
}

function sameWord(heard, expected) {
  if (heard === expected) return true;
  // Tolerate simple plurals: "nacho" vs "nachos".
  if (heard + "s" === expected || expected + "s" === heard) return true;
  if (heard + "es" === expected || expected + "es" === heard) return true;
  return false;
}

// Builds the list of phrases to look for, longest first so that
// "beef short rib" wins over "beef".
export function buildPhrases(items) {
  const phrases = [];
  for (const item of items) {
    const names = [item.name, ...(item.aliases || [])];
    for (const name of names) {
      const tokens = tokenise(name);
      if (tokens.length) phrases.push({ itemId: item.id, tokens });
    }
  }
  phrases.sort((a, b) => b.tokens.length - a.tokens.length);
  return phrases;
}

function matchPhraseAt(tokens, i, phrases) {
  for (const p of phrases) {
    if (i + p.tokens.length > tokens.length) continue;
    let ok = true;
    for (let k = 0; k < p.tokens.length; k++) {
      if (!sameWord(tokens[i + k], p.tokens[k])) {
        ok = false;
        break;
      }
    }
    if (ok) return p;
  }
  return null;
}

function skipFillers(tokens, j) {
  while (j < tokens.length && FILLER_WORDS.has(tokens[j])) j++;
  return j;
}

/**
 * @param {string} text  what the recogniser heard
 * @param {{id:string,name:string,aliases?:string[]}[]} items
 * @returns {({type:'start'|'stop', itemId:string} | {type:'stopAll'})[]}
 */
export function parseCommands(text, items) {
  const tokens = tokenise(text);
  const phrases = buildPhrases(items);
  const commands = [];

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];

    // "all off" / "everything off"
    if (ALL_WORDS.has(t)) {
      const j = skipFillers(tokens, i + 1);
      if (j < tokens.length && OFF_WORDS.has(tokens[j])) {
        commands.push({ type: "stopAll" });
        i = j + 1;
        continue;
      }
    }

    // "cancel duck" / "clear all"
    if (OFF_PREFIX_WORDS.has(t)) {
      const j = skipFillers(tokens, i + 1);
      if (j < tokens.length && ALL_WORDS.has(tokens[j])) {
        commands.push({ type: "stopAll" });
        i = j + 1;
        continue;
      }
      const p = j < tokens.length ? matchPhraseAt(tokens, j, phrases) : null;
      if (p) {
        commands.push({ type: "stop", itemId: p.itemId });
        // Swallow a trailing "off" in "stop duck off".
        let k = skipFillers(tokens, j + p.tokens.length);
        if (k < tokens.length && OFF_WORDS.has(tokens[k])) k++;
        i = k;
        continue;
      }
    }

    // "duck on" / "duck timer off"
    const p = matchPhraseAt(tokens, i, phrases);
    if (p) {
      const j = skipFillers(tokens, i + p.tokens.length);
      if (j < tokens.length && ON_WORDS.has(tokens[j])) {
        commands.push({ type: "start", itemId: p.itemId });
        i = j + 1;
        continue;
      }
      if (j < tokens.length && OFF_WORDS.has(tokens[j])) {
        commands.push({ type: "stop", itemId: p.itemId });
        i = j + 1;
        continue;
      }
      i += p.tokens.length;
      continue;
    }

    i++;
  }

  return commands;
}

/**
 * Tries each of the recogniser's guesses in order and returns the commands from
 * the first guess that contains any.
 * @param {string[]} alternatives
 */
export function parseAlternatives(alternatives, items) {
  for (const alt of alternatives) {
    const commands = parseCommands(alt, items);
    if (commands.length) return { transcript: alt, commands };
  }
  return { transcript: alternatives[0] || "", commands: [] };
}
