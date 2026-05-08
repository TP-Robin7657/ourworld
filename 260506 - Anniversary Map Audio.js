(function () {
  const BASE = "./assets/audio/";

  const BGM = {
    home: { src: "bombinsound-happy-ukulele-512480.mp3", vol: 0.55 },
    match3: {
      srcs: [
        "geoffharvey-ping-pong-427889.mp3",
        "denis-pavlov-music-marimba-game-music-playful-tropical-jungle-puzzle-399759.mp3",
        "rohitvaliant-puzzle-masters-rohit-valiant-402154.mp3",
      ],
      vol: 0.5,
    },
  };

  const SFX = {
    pop: ["pop-1.ogg", "pop-2.ogg", "pop-3.ogg"],
    popSoft: ["pop-soft-1.ogg", "pop-soft-2.ogg"],
    combo: ["pop-combo.ogg"],
    levelComplete: ["level-complete.mp3"],
    win: ["win.wav"],
    victory: ["victory-fanfare.wav"],
  };

  const MUTE_KEY = "yytp.audio.muted.v1";

  let currentKey = null;
  let currentEl = null;
  let muted = readMuted();
  let unlocked = false;
  const sfxCache = new Map();

  function readMuted() {
    try { return localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { return false; }
  }
  function writeMuted(v) {
    try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch (e) {}
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    if (currentEl && !muted) currentEl.play().catch(() => {});
  }

  function pickSrc(cfg) {
    if (cfg.srcs && cfg.srcs.length) {
      return cfg.srcs[Math.floor(Math.random() * cfg.srcs.length)];
    }
    return cfg.src;
  }

  function makeBgmEl(key) {
    const cfg = BGM[key];
    if (!cfg) return null;
    const a = new Audio(BASE + pickSrc(cfg));
    a.loop = true;
    a.preload = "auto";
    a.volume = 0;
    a.dataset.targetVol = String(cfg.vol);
    return a;
  }

  function fadeTo(el, target, ms) {
    if (!el) return Promise.resolve();
    const start = el.volume;
    const t0 = performance.now();
    return new Promise((resolve) => {
      function step(now) {
        const k = Math.min(1, (now - t0) / ms);
        el.volume = start + (target - start) * k;
        if (k >= 1) resolve();
        else requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  function playBgm(key) {
    if (currentKey === key) return;
    const next = makeBgmEl(key);
    if (!next) return;
    const prev = currentEl;
    currentKey = key;
    currentEl = next;

    const targetVol = muted ? 0 : Number(next.dataset.targetVol || 0.5);
    if (unlocked) next.play().catch(() => {});

    fadeTo(next, targetVol, 600);
    if (prev) {
      fadeTo(prev, 0, 500).then(() => {
        try { prev.pause(); } catch (e) {}
      });
    }
  }

  function stopBgm() {
    const prev = currentEl;
    currentKey = null;
    currentEl = null;
    if (prev) {
      fadeTo(prev, 0, 400).then(() => {
        try { prev.pause(); } catch (e) {}
      });
    }
  }

  function getSfx(name) {
    const list = SFX[name];
    if (!list || !list.length) return null;
    const file = list[Math.floor(Math.random() * list.length)];
    let pool = sfxCache.get(file);
    if (!pool) {
      pool = [];
      for (let i = 0; i < 4; i++) {
        const a = new Audio(BASE + file);
        a.preload = "auto";
        pool.push(a);
      }
      sfxCache.set(file, pool);
    }
    for (const a of pool) {
      if (a.paused || a.ended) return a;
    }
    return pool[0];
  }

  function sfx(name, vol) {
    if (muted || !unlocked) return;
    const a = getSfx(name);
    if (!a) return;
    try {
      a.currentTime = 0;
      a.volume = vol == null ? 0.7 : vol;
      a.play().catch(() => {});
    } catch (e) {}
  }

  function setMuted(v) {
    muted = !!v;
    writeMuted(muted);
    if (currentEl) {
      const target = muted ? 0 : Number(currentEl.dataset.targetVol || 0.5);
      fadeTo(currentEl, target, 200);
      if (muted) {
        try { currentEl.pause(); } catch (e) {}
      } else if (unlocked) {
        currentEl.play().catch(() => {});
      }
    }
    document.body.classList.toggle("audio-muted", muted);
    window.dispatchEvent(new CustomEvent("audio:muted", { detail: { muted } }));
  }

  function toggleMuted() { setMuted(!muted); }
  function isMuted() { return muted; }

  document.addEventListener("click", unlock, { once: true, capture: true });
  document.addEventListener("touchend", unlock, { once: true, capture: true });
  document.addEventListener("keydown", unlock, { once: true, capture: true });

  if (muted) document.body.classList.add("audio-muted");

  window.GameAudio = { playBgm, stopBgm, sfx, setMuted, toggleMuted, isMuted };
})();
