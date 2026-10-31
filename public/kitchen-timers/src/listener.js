// Keeps the browser's speech recogniser listening for as long as the app runs.
//
// Chrome on Android ends a recognition session after each phrase or a few
// seconds of silence, so we start a fresh short session every time one ends.
// (Using short sessions rather than `continuous` also avoids an Android bug
// where continuous mode repeats earlier phrases.)

export function speechRecognitionSupported() {
  return (
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

/**
 * @param {object} opts
 * @param {string} opts.lang
 * @param {(alternatives: string[]) => void} opts.onResult  every guess for one phrase, best first
 * @param {(status: string, detail?: string) => void} opts.onStatus
 *   'listening' | 'restarting' | 'paused' | 'blocked' | 'network' | 'unsupported' | 'error'
 */
export function createListener({ lang, onResult, onStatus }) {
  const SR =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  let wanted = false;
  let rec = null;
  let currentLang = lang;
  let failures = 0;
  let restartTimer = null;
  let sessionStartedAt = 0;
  let watchdog = null;

  function scheduleRestart() {
    clearTimeout(restartTimer);
    if (!wanted) return;
    // Back off if it keeps failing (e.g. no internet), up to 10 seconds.
    const delay = failures
      ? Math.min(10000, 500 * 2 ** Math.min(failures, 5))
      : 150;
    restartTimer = setTimeout(startSession, delay);
  }

  function startSession() {
    restartTimer = null;
    if (!wanted) return;
    try {
      rec = new SR();
    } catch (err) {
      onStatus("error", String(err));
      return;
    }
    rec.lang = currentLang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 5;

    let gotError = null;

    rec.onstart = () => {
      sessionStartedAt = Date.now();
      onStatus("listening");
    };

    rec.onresult = (event) => {
      failures = 0;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;
        const alternatives = [];
        for (let k = 0; k < result.length; k++)
          alternatives.push(result[k].transcript);
        onResult(alternatives);
      }
    };

    rec.onerror = (event) => {
      gotError = event.error;
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        wanted = false;
        onStatus("blocked");
      } else if (event.error === "network") {
        failures++;
        onStatus("network");
      } else if (event.error === "no-speech" || event.error === "aborted") {
        // Normal: nobody spoke, or we stopped it ourselves.
      } else {
        failures++;
        onStatus("error", event.error);
      }
    };

    rec.onend = () => {
      rec = null;
      if (!wanted) return;
      if (!gotError || gotError === "no-speech" || gotError === "aborted")
        failures = 0;
      onStatus("restarting");
      scheduleRestart();
    };

    try {
      sessionStartedAt = Date.now();
      rec.start();
    } catch (err) {
      // Usually "already started"; try again shortly.
      rec = null;
      failures++;
      scheduleRestart();
    }
  }

  return {
    supported: !!SR,
    start() {
      if (!SR) {
        onStatus("unsupported");
        return;
      }
      if (wanted) return;
      wanted = true;
      failures = 0;
      startSession();
      // Some devices occasionally leave a session hanging without ever ending
      // it. If one has been open for over a minute, kill it so it restarts.
      clearInterval(watchdog);
      watchdog = setInterval(() => {
        if (wanted && rec && Date.now() - sessionStartedAt > 60000) {
          try {
            rec.abort();
          } catch {
            /* ignore */
          }
        } else if (wanted && !rec && !restartTimer) {
          startSession();
        }
      }, 5000);
    },
    stop() {
      wanted = false;
      clearTimeout(restartTimer);
      restartTimer = null;
      clearInterval(watchdog);
      if (rec) {
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
      }
      onStatus("paused");
    },
    setLang(next) {
      currentLang = next;
      if (rec) {
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
      }
    },
    get running() {
      return wanted;
    },
  };
}
