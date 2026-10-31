import { parseAlternatives } from "./commands.js";
import {
  startTimer,
  stopItem,
  stopAllRinging,
  removeTimer,
  tick,
  dueAnnouncements,
  markAnnounced,
  remainingMs,
  formatClock,
  describeDuration,
  finishedPhrase,
} from "./timers.js";
import {
  loadSettings,
  saveSettings,
  sanitiseSettings,
  loadTimers,
  saveTimers,
  slug,
} from "./settings.js";
import { createListener, speechRecognitionSupported } from "./listener.js";
import { createSpeaker } from "./speaker.js";

const $ = (sel) => document.querySelector(sel);

let settings = loadSettings();
let timers = loadTimers();
let started = false;
let wakeLock = null;
const recent = new Map(); // command key -> time, to ignore the same phrase reported twice

const speaker = createSpeaker(() => settings);
const listener = createListener({
  lang: settings.lang,
  onResult: handleHeard,
  onStatus: setMicStatus,
});

// ---------------------------------------------------------------- commands

function itemById(id) {
  return settings.items.find((i) => i.id === id);
}

function setTimers(next) {
  timers = next;
  saveTimers(timers);
  render();
}

function confirm(text) {
  if (settings.confirm && started) speaker.say(text, { kind: "confirm" });
}

function runCommand(cmd) {
  const now = Date.now();

  if (cmd.type === "start") {
    const item = itemById(cmd.itemId);
    if (!item) return null;
    const r = startTimer(timers, item, now);
    setTimers(r.timers);
    confirm(`${r.timer.label}. ${describeDuration(item.seconds)}.`);
    return `${r.timer.label} started`;
  }

  if (cmd.type === "stop") {
    const item = itemById(cmd.itemId);
    const r = stopItem(timers, cmd.itemId);
    if (r.cleared.length) {
      speaker.withdrawAlarms();
      setTimers(r.timers);
      const labels = r.cleared.map((t) => t.label).join(" and ");
      confirm(`${labels} cleared.`);
      return `${labels} cleared`;
    }
    if (r.cancelled.length) {
      setTimers(r.timers);
      confirm(`${r.cancelled[0].label} cancelled.`);
      return `${r.cancelled[0].label} cancelled`;
    }
    confirm(`No ${item ? item.name : ""} timer.`);
    return `no ${item ? item.name : ""} timer`;
  }

  if (cmd.type === "stopAll") {
    const r = stopAllRinging(timers);
    if (r.cleared.length) {
      speaker.withdrawAlarms();
      setTimers(r.timers);
      confirm("All cleared.");
      return "all alarms cleared";
    }
    return "nothing ringing";
  }
  return null;
}

function handleHeard(alternatives) {
  const { transcript, commands } = parseAlternatives(
    alternatives,
    settings.items,
  );
  const now = Date.now();
  const results = commands
    .filter((cmd) => {
      // Ignore the same command heard again within 2 seconds (the recogniser
      // sometimes reports one phrase twice). Taps don't go through here.
      const key = cmd.type + ":" + (cmd.itemId || "");
      const last = recent.get(key);
      recent.set(key, now);
      return !(last && now - last < 2000);
    })
    .map(runCommand)
    .filter(Boolean);
  const heard = $("#heard");
  heard.textContent = "";
  heard.append("Last heard: ");
  const b = document.createElement("b");
  b.textContent = `“${transcript.trim()}”`;
  heard.append(b, " ");
  const s = document.createElement("span");
  if (results.length) {
    s.className = "ok";
    s.textContent = "→ " + results.join(", ");
  } else if (!commands.length) {
    s.className = "miss";
    s.textContent = "→ not a command";
  }
  heard.append(s);
}

// ---------------------------------------------------------------- ticking

function loop() {
  const now = Date.now();
  const t = tick(timers, now);
  if (t.finished.length) {
    timers = t.timers;
    saveTimers(timers);
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
  }

  if (started && speaker.idle) {
    const due = dueAnnouncements(timers, now, settings.repeatSeconds * 1000);
    if (due.length) {
      timers = markAnnounced(
        timers,
        due.map((d) => d.id),
        now,
      );
      saveTimers(timers);
      speaker.say(finishedPhrase(due.map((d) => d.label)), {
        kind: "alarm",
        chime: settings.chime,
      });
    }
  }
  render();
}

// ---------------------------------------------------------------- rendering

const cards = new Map(); // timer id -> element

function makeCard(timer) {
  const el = document.createElement("article");
  el.className = "card";
  el.innerHTML = `
    <div class="label"></div>
    <div class="clock"></div>
    <div class="sub"></div>
    <button class="x" type="button" aria-label="Cancel timer">✕</button>
    <div class="bar-track"><div class="bar-fill"></div></div>`;
  el.querySelector(".label").textContent = timer.label;
  el.querySelector(".x").addEventListener("click", (e) => {
    e.stopPropagation();
    const r = removeTimer(timers, timer.id);
    setTimers(r.timers);
  });
  el.addEventListener("click", () => {
    const current = timers.find((t) => t.id === timer.id);
    if (current && current.ringing) {
      speaker.withdrawAlarms();
      setTimers(removeTimer(timers, timer.id).timers);
    }
  });
  return el;
}

function render() {
  const now = Date.now();
  const list = $("#timers");
  const sorted = [...timers].sort(
    (a, b) => b.ringing - a.ringing || a.endsAt - b.endsAt,
  );

  const live = new Set(sorted.map((t) => t.id));
  for (const [id, el] of cards) {
    if (!live.has(id)) {
      el.remove();
      cards.delete(id);
    }
  }

  sorted.forEach((t, index) => {
    let el = cards.get(t.id);
    if (!el) {
      el = makeCard(t);
      cards.set(t.id, el);
    }
    if (list.children[index] !== el)
      list.insertBefore(el, list.children[index] || null);

    const left = remainingMs(t, now);
    el.classList.toggle("ringing", t.ringing);
    el.classList.toggle("soon", !t.ringing && left <= 30000);
    const clock = t.ringing ? "FINISHED" : formatClock(left);
    const clockEl = el.querySelector(".clock");
    if (clockEl.textContent !== clock) clockEl.textContent = clock;
    const sub = t.ringing
      ? `Say “${t.name} off” or tap to clear`
      : `of ${formatClock(t.durationMs)}`;
    const subEl = el.querySelector(".sub");
    if (subEl.textContent !== sub) subEl.textContent = sub;
    const pct = t.ringing ? 100 : 100 - (left / t.durationMs) * 100;
    el.querySelector(".bar-fill").style.width = `${pct.toFixed(1)}%`;
  });
}

function renderQuick() {
  const nav = $("#quick");
  nav.textContent = "";
  for (const item of settings.items) {
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = '<span class="n"></span><span class="d"></span>';
    b.querySelector(".n").textContent = item.name;
    b.querySelector(".d").textContent = formatClock(item.seconds * 1000);
    b.addEventListener("click", () =>
      runCommand({ type: "start", itemId: item.id }),
    );
    nav.append(b);
  }
  $("#example").textContent = settings.items[0]?.name || "duck";
}

const MIC_TEXT = {
  listening: "Listening",
  restarting: "Listening",
  paused: "Paused – tap to listen",
  blocked: "Microphone blocked",
  network: "No internet – retrying",
  unsupported: "Voice not supported here",
  error: "Mic problem – retrying",
};

function setMicStatus(status, detail) {
  const mic = $("#mic");
  mic.dataset.state = status;
  $("#mic-text").textContent = MIC_TEXT[status] || status;
  mic.title = detail || "";
  if (status === "blocked") {
    $("#heard").textContent =
      "Allow microphone access for this site in Chrome’s settings, then tap the mic button.";
  }
  if (status === "unsupported") {
    $("#heard").textContent =
      "This browser can’t do voice commands. Use Chrome on Android. Buttons still work.";
  }
}

// ---------------------------------------------------------------- start / wake lock

async function keepAwake() {
  try {
    if ("wakeLock" in navigator && document.visibilityState === "visible") {
      wakeLock = await navigator.wakeLock.request("screen");
    }
  } catch {
    /* not allowed right now; we'll try again when visible */
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && started) {
    keepAwake();
    if (!listener.running && $("#mic").dataset.state !== "blocked")
      listener.start();
  }
});

$("#start-btn").addEventListener("click", () => {
  started = true;
  speaker.unlock();
  keepAwake();
  $("#start").hidden = true;
  if (speechRecognitionSupported()) listener.start();
  else setMicStatus("unsupported");
});

$("#mic").addEventListener("click", () => {
  if (!started) return;
  if (listener.running) listener.stop();
  else listener.start();
});

// ---------------------------------------------------------------- settings dialog

const dialog = $("#settings");

function addItemRow(item = { name: "", seconds: 300, aliases: [] }) {
  const row = $("#item-row").content.firstElementChild.cloneNode(true);
  row.dataset.id = item.id || "";
  row.querySelector(".name").value = item.name;
  row.querySelector(".min").value = Math.floor(item.seconds / 60);
  row.querySelector(".sec").value = item.seconds % 60;
  row.querySelector(".aliases").value = (item.aliases || []).join(", ");
  row.querySelector(".remove").addEventListener("click", () => row.remove());
  $("#items").append(row);
  return row;
}

function fillVoices() {
  const select = $("#voice");
  const keep = settings.voiceURI;
  select.textContent = "";
  const def = document.createElement("option");
  def.value = "";
  def.textContent = "Default";
  select.append(def);
  for (const v of speaker
    .voices()
    .filter((v) => v.lang && v.lang.startsWith("en"))) {
    const o = document.createElement("option");
    o.value = v.voiceURI;
    o.textContent = `${v.name} (${v.lang})`;
    select.append(o);
  }
  select.value = keep;
}
speaker.onVoicesChanged(fillVoices);

function openSettings() {
  $("#items").textContent = "";
  settings.items.forEach(addItemRow);
  $("#lang").value = settings.lang;
  fillVoices();
  $("#rate").value = settings.rate;
  $("#repeat").value = settings.repeatSeconds;
  $("#confirm").checked = settings.confirm;
  $("#chime").checked = settings.chime;
  dialog.showModal();
}

function readForm() {
  const items = [...$("#items").children].map((row) => {
    const name = row.querySelector(".name").value.trim();
    return {
      id: row.dataset.id || slug(name),
      name,
      seconds:
        (Number(row.querySelector(".min").value) || 0) * 60 +
        (Number(row.querySelector(".sec").value) || 0),
      aliases: row.querySelector(".aliases").value,
    };
  });
  return sanitiseSettings({
    items,
    lang: $("#lang").value,
    voiceURI: $("#voice").value,
    rate: $("#rate").value,
    repeatSeconds: $("#repeat").value,
    confirm: $("#confirm").checked,
    chime: $("#chime").checked,
  });
}

$("#open-settings").addEventListener("click", openSettings);
$("#add-item").addEventListener("click", () =>
  addItemRow().querySelector(".name").focus(),
);

$("#test-voice").addEventListener("click", () => {
  const saved = settings;
  settings = readForm();
  speaker.unlock();
  speaker.say(finishedPhrase([settings.items[0]?.name || "duck"]), {
    kind: "confirm",
    chime: settings.chime,
  });
  settings = saved;
});

$("#try-btn").addEventListener("click", () => {
  const text = $("#try-text").value;
  if (text.trim()) handleHeard([text]);
});
$("#try-text").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    $("#try-btn").click();
  }
});

dialog.addEventListener("close", () => {
  if (dialog.returnValue !== "save") return;
  const next = readForm();
  const langChanged = next.lang !== settings.lang;
  settings = next;
  saveSettings(settings);
  if (langChanged) listener.setLang(settings.lang);
  renderQuick();
});

// ---------------------------------------------------------------- go

renderQuick();
render();
setMicStatus(speechRecognitionSupported() ? "paused" : "unsupported");
setInterval(loop, 250);

// Expose a hook for automated tests and debugging.
window.kitchenTimers = {
  handleHeard,
  get timers() {
    return timers;
  },
  get settings() {
    return settings;
  },
};
