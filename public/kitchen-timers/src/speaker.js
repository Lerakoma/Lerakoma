// Speaks things out loud, one at a time, with an optional attention chime.
//
// Each message has a kind: 'alarm' (timer finished) or 'confirm' (saying a
// command back). Alarms can be withdrawn when someone clears them, so a
// cleared timer is never shouted after the fact.

export function createSpeaker(getSettings) {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  let audio = null;
  const queue = [];
  let current = null;

  function ensureAudio() {
    if (!audio) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audio = new Ctx();
    }
    if (audio && audio.state === "suspended") audio.resume();
    return audio;
  }

  function chime() {
    const ctx = ensureAudio();
    if (!ctx) return Promise.resolve();
    const start = ctx.currentTime + 0.05;
    const notes = [880, 1320, 880, 1320];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      const t = start + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    });
    return new Promise((r) => setTimeout(r, notes.length * 180 + 150));
  }

  function pickVoice(settings) {
    if (!synth) return null;
    const voices = synth.getVoices();
    if (settings.voiceURI) {
      const v = voices.find((v) => v.voiceURI === settings.voiceURI);
      if (v) return v;
    }
    return (
      voices.find((v) => v.lang === settings.lang) ||
      voices.find(
        (v) => v.lang && v.lang.startsWith(settings.lang.slice(0, 2)),
      ) ||
      null
    );
  }

  function utter(text) {
    if (!synth) return Promise.resolve();
    const settings = getSettings();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = settings.lang;
      u.rate = settings.rate;
      u.volume = 1;
      const voice = pickVoice(settings);
      if (voice) u.voice = voice;
      // Safety net: some Android builds never fire `end`.
      const fallback = setTimeout(done, 2500 + text.length * 120);
      function done() {
        clearTimeout(fallback);
        resolve();
      }
      u.onend = done;
      u.onerror = done;
      synth.resume();
      synth.speak(u);
    });
  }

  async function pump() {
    if (current || !queue.length) return;
    current = queue.shift();
    try {
      if (current.chime && !current.withdrawn) await chime();
      if (!current.withdrawn) await utter(current.text);
    } finally {
      current = null;
      pump();
    }
  }

  return {
    /** Call from a tap so the browser allows sound. */
    unlock() {
      ensureAudio();
      if (synth) {
        // An empty utterance unlocks speech on mobile browsers.
        const u = new SpeechSynthesisUtterance("");
        u.volume = 0;
        synth.speak(u);
      }
    },
    say(text, { kind = "confirm", chime: withChime = false } = {}) {
      queue.push({ text, kind, chime: withChime, withdrawn: false });
      pump();
    },
    /** Drop alarm messages that are queued or being spoken right now. */
    withdrawAlarms() {
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].kind === "alarm") queue.splice(i, 1);
      }
      if (current && current.kind === "alarm") {
        current.withdrawn = true;
        if (synth) synth.cancel();
      }
    },
    get idle() {
      return !current && !queue.length;
    },
    voices() {
      return synth ? synth.getVoices() : [];
    },
    onVoicesChanged(fn) {
      if (synth) synth.addEventListener("voiceschanged", fn);
    },
    chime,
  };
}
