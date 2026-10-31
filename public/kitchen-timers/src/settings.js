// Settings and saved timers, stored in the tablet's browser (localStorage).

export const DEFAULT_SETTINGS = {
  items: [
    { id: "duck", name: "duck", seconds: 5 * 60, aliases: [] },
    { id: "beef", name: "beef", seconds: 3 * 60, aliases: [] },
    { id: "nachos", name: "nachos", seconds: 4 * 60, aliases: [] },
  ],
  lang: "en-GB",
  repeatSeconds: 10,
  confirm: true,
  chime: true,
  voiceURI: "",
  rate: 1,
};

const SETTINGS_KEY = "kitchen-timers.settings.v1";
const TIMERS_KEY = "kitchen-timers.timers.v1";

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export function slug(name) {
  return (
    String(name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "item"
  );
}

/** Cleans up settings from storage or the settings form so the app can trust them. */
export function sanitiseSettings(raw) {
  const s = {
    ...DEFAULT_SETTINGS,
    ...(raw && typeof raw === "object" ? raw : {}),
  };
  const seen = new Set();
  const items = [];
  for (const it of Array.isArray(s.items) ? s.items : []) {
    const name = String(it?.name ?? "").trim();
    if (!name) continue;
    let id = it.id ? String(it.id) : slug(name);
    while (seen.has(id)) id += "-x";
    seen.add(id);
    const seconds = Math.max(
      1,
      Math.min(24 * 3600, Math.round(Number(it.seconds) || 0)),
    );
    const aliases = (
      Array.isArray(it.aliases)
        ? it.aliases
        : String(it.aliases ?? "").split(",")
    )
      .map((a) => String(a).trim())
      .filter(Boolean);
    items.push({ id, name, seconds, aliases });
  }
  return {
    items,
    lang: String(s.lang || DEFAULT_SETTINGS.lang),
    repeatSeconds: Math.max(
      3,
      Math.min(120, Number(s.repeatSeconds) || DEFAULT_SETTINGS.repeatSeconds),
    ),
    confirm: s.confirm !== false,
    chime: s.chime !== false,
    voiceURI: String(s.voiceURI || ""),
    rate: Math.max(0.5, Math.min(2, Number(s.rate) || 1)),
  };
}

export function loadSettings() {
  const raw = safeGet(SETTINGS_KEY);
  if (!raw) return sanitiseSettings(DEFAULT_SETTINGS);
  try {
    return sanitiseSettings(JSON.parse(raw));
  } catch {
    return sanitiseSettings(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings) {
  safeSet(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadTimers() {
  const raw = safeGet(TIMERS_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list)
      ? list.filter((t) => t && t.id && typeof t.endsAt === "number")
      : [];
  } catch {
    return [];
  }
}

export function saveTimers(timers) {
  safeSet(TIMERS_KEY, JSON.stringify(timers));
}
