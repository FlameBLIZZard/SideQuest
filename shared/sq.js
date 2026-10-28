// Sidequest shared helpers. Plain script (no modules) so apps work from file://.
(function () {
  const SQ = {};

  SQ.$ = (sel, root = document) => root.querySelector(sel);
  SQ.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  SQ.el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') n.className = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? n.style.setProperty(sk, sv) : (n.style[sk] = sv);
      }
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, '');
      else if (v !== false && v != null) n.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null) n.append(kid.nodeType ? kid : String(kid));
    return n;
  };

  let toastTimer;
  SQ.toast = (msg) => {
    let t = SQ.$('.sq-toast');
    if (!t) { t = SQ.el('div', { class: 'sq-toast', role: 'status' }); document.body.append(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  };

  SQ.stamp = () => new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');

  // Save a Blob, data: URL or string to disk.
  SQ.download = (data, filename) => {
    let url = data, revoke = false;
    if (data instanceof Blob) { url = URL.createObjectURL(data); revoke = true; }
    else if (typeof data === 'string' && !data.startsWith('data:') && !data.startsWith('blob:')) {
      url = URL.createObjectURL(new Blob([data], { type: 'text/plain' })); revoke = true;
    }
    const a = SQ.el('a', { href: url, download: filename });
    document.body.append(a); a.click(); a.remove();
    if (revoke) setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  SQ.canvasBlob = (canvas, type = 'image/png', q) =>
    new Promise((res) => canvas.toBlob(res, type, q));

  // localStorage can throw (private mode, file:// in some browsers); never let it break an app.
  SQ.store = {
    get(key, fallback) {
      try { const v = localStorage.getItem('sq:' + key); return v == null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('sq:' + key, JSON.stringify(value)); return true; }
      catch { return false; }
    },
  };

  // Tiny IndexedDB key/value store for things too big for localStorage (audio clips).
  SQ.idb = (dbName) => {
    const open = () => new Promise((res, rej) => {
      const r = indexedDB.open('sq-' + dbName, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const tx = async (mode, fn) => {
      const db = await open();
      return new Promise((res, rej) => {
        const t = db.transaction('kv', mode);
        const req = fn(t.objectStore('kv'));
        t.oncomplete = () => res(req && req.result);
        t.onerror = () => rej(t.error);
      });
    };
    return {
      get: (k) => tx('readonly', (s) => s.get(k)).catch(() => undefined),
      set: (k, v) => tx('readwrite', (s) => s.put(v, k)).catch(() => undefined),
      del: (k) => tx('readwrite', (s) => s.delete(k)).catch(() => undefined),
    };
  };

  // Seeded RNG (mulberry32) so generators can be reproduced from a seed.
  SQ.rng = (seed) => {
    let a = typeof seed === 'number' ? seed >>> 0 : SQ.hash(String(seed));
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  SQ.hash = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  SQ.pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];

  // Pick the best video format MediaRecorder supports here.
  SQ.videoMime = () => {
    const opts = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    if (!window.MediaRecorder) return null;
    return opts.find((m) => MediaRecorder.isTypeSupported(m)) || '';
  };

  // Record a canvas (plus optional audio MediaStream) to a video Blob.
  SQ.recorder = (canvas, { fps = 30, audio = null } = {}) => {
    const stream = canvas.captureStream(fps);
    if (audio) audio.getAudioTracks().forEach((t) => stream.addTrack(t));
    const mimeType = SQ.videoMime();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 8e6 } : undefined);
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    return {
      start() { rec.start(250); },
      stop() {
        return new Promise((res) => {
          rec.onstop = () => res(new Blob(chunks, { type: rec.mimeType || 'video/webm' }));
          rec.stop();
        });
      },
      get ext() { return (rec.mimeType || '').includes('mp4') ? 'mp4' : 'webm'; },
      get recording() { return rec.state === 'recording'; },
    };
  };

  // 16-bit PCM WAV from an AudioBuffer.
  SQ.encodeWAV = (buf) => {
    const ch = buf.numberOfChannels, len = buf.length, rate = buf.sampleRate;
    const out = new DataView(new ArrayBuffer(44 + len * ch * 2));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); out.setUint32(4, 36 + len * ch * 2, true); str(8, 'WAVE');
    str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
    out.setUint32(24, rate, true); out.setUint32(28, rate * ch * 2, true); out.setUint16(32, ch * 2, true);
    out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, len * ch * 2, true);
    const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, data[c][i]));
      out.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2;
    }
    return new Blob([out], { type: 'audio/wav' });
  };

  SQ.fmtTime = (s) => {
    s = Math.max(0, Math.round(s));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  SQ.isTyping = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;

  // Theme chosen on the launcher applies to every app.
  const theme = SQ.store.get('theme', '');
  if (theme) document.documentElement.dataset.theme = theme;

  window.SQ = SQ;
})();
