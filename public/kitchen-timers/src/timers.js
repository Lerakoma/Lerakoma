// Timer state, kept free of any browser code so it can be tested on its own.
// Every function takes the current time so nothing here reads the clock.
//
// A timer looks like:
//   { id, itemId, name, number, label, durationMs, startedAt, endsAt,
//     ringing, lastAnnouncedAt }

let nextId = 1;
function newId(now) {
  return `t${now.toString(36)}${(nextId++).toString(36)}`;
}

export function labelFor(name, number) {
  return number > 1 ? `${name} ${number}` : name;
}

/**
 * Starts a timer for an item. If the same item already has timers going, the
 * new one gets the lowest free number ("duck 2", "duck 3").
 */
export function startTimer(timers, item, now) {
  const used = new Set(
    timers.filter((t) => t.itemId === item.id).map((t) => t.number),
  );
  let number = 1;
  while (used.has(number)) number++;
  const durationMs = Math.max(1, Math.round(item.seconds)) * 1000;
  const timer = {
    id: newId(now),
    itemId: item.id,
    name: item.name,
    number,
    label: labelFor(item.name, number),
    durationMs,
    startedAt: now,
    endsAt: now + durationMs,
    ringing: false,
    lastAnnouncedAt: null,
  };
  return { timers: [...timers, timer], timer };
}

/**
 * "duck off": if any duck alarm is ringing, clear all ringing duck alarms.
 * Otherwise cancel the most recently started duck timer (most likely the one
 * started by mistake). Returns what happened so the app can say it back.
 */
export function stopItem(timers, itemId) {
  const ringing = timers.filter((t) => t.itemId === itemId && t.ringing);
  if (ringing.length) {
    const ids = new Set(ringing.map((t) => t.id));
    return {
      timers: timers.filter((t) => !ids.has(t.id)),
      cleared: ringing,
      cancelled: [],
    };
  }
  const running = timers
    .filter((t) => t.itemId === itemId && !t.ringing)
    .sort((a, b) => b.startedAt - a.startedAt);
  if (running.length) {
    const victim = running[0];
    return {
      timers: timers.filter((t) => t.id !== victim.id),
      cleared: [],
      cancelled: [victim],
    };
  }
  return { timers, cleared: [], cancelled: [] };
}

export function stopAllRinging(timers) {
  const cleared = timers.filter((t) => t.ringing);
  return { timers: timers.filter((t) => !t.ringing), cleared };
}

export function removeTimer(timers, id) {
  const removed = timers.find((t) => t.id === id) || null;
  return { timers: timers.filter((t) => t.id !== id), removed };
}

/** Marks timers whose time is up as ringing. Returns the ones that just finished. */
export function tick(timers, now) {
  const finished = [];
  const next = timers.map((t) => {
    if (!t.ringing && t.endsAt <= now) {
      const done = { ...t, ringing: true };
      finished.push(done);
      return done;
    }
    return t;
  });
  return { timers: finished.length ? next : timers, finished };
}

/**
 * Ringing timers that are due to be shouted out again. A timer is due when it
 * has never been announced, or was last announced at least repeatMs ago.
 */
export function dueAnnouncements(timers, now, repeatMs) {
  return timers.filter(
    (t) =>
      t.ringing &&
      (t.lastAnnouncedAt === null || now - t.lastAnnouncedAt >= repeatMs),
  );
}

export function markAnnounced(timers, ids, now) {
  const set = new Set(ids);
  return timers.map((t) =>
    set.has(t.id) ? { ...t, lastAnnouncedAt: now } : t,
  );
}

export function remainingMs(timer, now) {
  return Math.max(0, timer.endsAt - now);
}

/** 125000 -> "2:05", 3725000 -> "1:02:05" */
export function formatClock(ms) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** 300 -> "5 minutes", 90 -> "1 minute 30 seconds", 45 -> "45 seconds" */
export function describeDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  const parts = [];
  if (m) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  if (s) parts.push(`${s} second${s === 1 ? "" : "s"}`);
  return parts.join(" ") || "0 seconds";
}

/** ["duck", "beef"] -> "duck timer finished. beef timer finished." */
export function finishedPhrase(labels) {
  return labels.map((l) => `${l} timer finished.`).join(" ");
}
