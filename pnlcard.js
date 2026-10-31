/* Kyvo v8.20 🎴 Kreator P&L — self-serve 9:16 P&L card with the user's own photo or video as the background.
   Look = the owner-approved card (darkened full-bleed background, Kyvo mark + wordmark, pill, glass card with avatar / nick,
   huge green (red for a loss) chrome number, SOL line, 3-stat row, footer with date + source).
   * Numbers come ONLY from the caller (journal.js → the user's Journal trades). Nothing here lets the user type a P&L number.
   * Source label: 'wallet' → "✓ Zweryfikowane on-chain", 'manual' → "✍︎ wpisane ręcznie", 'demo' → "DEMO · przykładowe dane".
   * Background files stay on this device (object URLs, never uploaded; no network calls).
   * Export: photo / default bg → 1080×1920 PNG (canvas.toBlob). Video bg → 9:16 MP4 or WebM (canvas.captureStream + MediaRecorder,
     max 15 s, overlay drawn every frame, the video's audio via Web Audio when possible). No MediaRecorder → PNG with the first frame.
   * Share: navigator.share({files}) when the browser can share that file type, otherwise a download link. */
(function () {
  'use strict';
  const isEn = () => !!(window.KyvoI18n && window.KyvoI18n.isEn && window.KyvoI18n.isEn());
  const L = (pl, en) => (isEn() ? en : pl);
  const E = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const W = 1080, H = 1920, MAXSEC = 15, FPS = 30;
  const DISP = "'KyvoDisplay','KyvoInter',system-ui,sans-serif", TXT = "'KyvoInter',system-ui,sans-serif";
  const load = (src) => new Promise((res) => {
    if (!src) return res(null);
    const i = new Image(); let done = false; const fin = (v) => { if (!done) { done = true; res(v); } };
    i.onload = () => fin(i); i.onerror = () => fin(null); setTimeout(() => fin(null), 6000); i.src = src;
  });
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fit(c, t, max, size, weight, fam, min) {
    let s = size;
    do { c.font = `${weight} ${s}px ${fam}`; s -= 4; } while (c.measureText(t).width > max && s > (min || 20));
  }
  // Pick the best supported recorder type: MP4 first (plays everywhere, shares to TikTok / IG), then WebM.
  function pickMime() {
    const MR = window.MediaRecorder;
    if (!MR || !MR.isTypeSupported) return '';
    const list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4',
      'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    for (const t of list) { try { if (MR.isTypeSupported(t)) return t; } catch (e) {} }
    return '';
  }
  const canRecord = () => !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream && pickMime());

  /* ---------------- drawing ---------------- */
  let ART = null;   // {mark, arc}
  async function art() {
    if (ART) return ART;
    try { await Promise.all([document.fonts.load('700 196px KyvoDisplay'), document.fonts.load('600 38px KyvoInter'), document.fonts.load('500 26px KyvoInter')]); } catch (e) {}
    const [mark, arc] = await Promise.all([load('kyvo_mark.svg'), load('img/arc-1280.webp')]);
    ART = { mark, arc }; return ART;
  }
  // bg = {el (img|video), w, h} or null; o = {offX, offY, zoom, dark}
  function drawBg(c, bg, o, pos) {
    c.fillStyle = '#030304'; c.fillRect(0, 0, W, H);
    if (bg && bg.el && bg.w && bg.h) {
      const s = Math.max(W / bg.w, H / bg.h) * (o.zoom || 1), dw = bg.w * s, dh = bg.h * s;
      const x = -(dw - W) * (0.5 + (o.offX || 0) / 200), y = -(dh - H) * (0.5 + (o.offY || 0) / 200);
      try { c.drawImage(bg.el, x, y, dw, dh); } catch (e) {}
      c.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(0.92, o.dark))})`; c.fillRect(0, 0, W, H);
    } else {   // default: black + chrome (Obsidian)
      const g = c.createRadialGradient(W / 2, 640, 40, W / 2, 640, 1000);
      g.addColorStop(0, pos === false ? 'rgba(255,90,110,.14)' : 'rgba(74,222,128,.13)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      if (ART && ART.arc) { c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.9; const aw = 1800, ah = aw * ART.arc.height / ART.arc.width; c.drawImage(ART.arc, (W - aw) / 2, 760 - ah * 0.5, aw, ah); c.restore(); }
      if (ART && ART.mark) { c.save(); c.globalAlpha = 0.07; const mw = 760, mh = mw * 406 / 399; c.drawImage(ART.mark, (W - mw) / 2, 330, mw, mh); c.restore(); }
    }
    const sh = c.createLinearGradient(0, 0, 0, H);
    sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(0.22, 'rgba(0,0,0,0)'); sh.addColorStop(0.42, 'rgba(0,0,0,0)'); sh.addColorStop(0.62, 'rgba(0,0,0,.82)'); sh.addColorStop(1, '#000');
    c.fillStyle = sh; c.fillRect(0, 0, W, H);
  }
  // d = data from journal.js (see open()); o = options (nick, hideUsd, hideSol)
  function drawOverlay(c, d, o) {
    const pos = d.pos, up = pos !== false;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    // top bar: mark + wordmark, pill
    if (ART && ART.mark) { c.save(); c.shadowColor = 'rgba(255,255,255,.27)'; c.shadowBlur = 18; c.drawImage(ART.mark, 80, 90, 62, 62 * 406 / 399); c.restore(); }
    c.fillStyle = '#f2f3f5'; c.font = `700 54px ${DISP}`; c.textBaseline = 'middle'; c.fillText('Kyvo', 164, 122);
    const pill = d.src === 'demo' ? 'DEMO' : d.pill || 'Trade';
    c.font = `600 26px ${TXT}`; const pw = c.measureText(pill).width + 48;
    rr(c, W - 80 - pw, 98, pw, 50, 25); c.fillStyle = d.src === 'demo' ? 'rgba(120,80,0,.6)' : 'rgba(0,0,0,.53)'; c.fill();
    c.strokeStyle = d.src === 'demo' ? 'rgba(255,200,90,.7)' : 'rgba(255,255,255,.2)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = d.src === 'demo' ? '#ffd27a' : '#cfd3da'; c.textAlign = 'center'; c.fillText(pill, W - 80 - pw / 2, 124);
    // glass card
    const cx = 70, cw = W - 140, cy = 1006, ch = 1770 - cy;
    c.save(); c.shadowColor = 'rgba(0,0,0,.8)'; c.shadowBlur = 120; c.shadowOffsetY = 40;
    rr(c, cx, cy, cw, ch, 44); c.fillStyle = 'rgba(8,8,11,.55)'; c.fill(); c.restore();
    const gg = c.createLinearGradient(cx, cy, cx + cw * 0.6, cy + ch);
    gg.addColorStop(0, 'rgba(255,255,255,.085)'); gg.addColorStop(1, 'rgba(255,255,255,.02)');
    rr(c, cx, cy, cw, ch, 44); c.fillStyle = gg; c.fill(); c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 2; c.stroke();
    const px = cx + 64;
    // who
    const nick = String(o.nick || '').trim() || L('Trader Kyvo', 'Kyvo trader');
    const av = c.createLinearGradient(px, cy + 64, px + 88, cy + 152); av.addColorStop(0, '#e9ebef'); av.addColorStop(1, '#7d838d');
    c.beginPath(); c.arc(px + 44, cy + 108, 44, 0, Math.PI * 2); c.fillStyle = av; c.fill();
    c.fillStyle = '#111'; c.font = `700 42px ${DISP}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText((Array.from(nick)[0] || 'K').toUpperCase(), px + 44, cy + 110);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = '#f2f3f5'; fit(c, nick, cw - 64 * 2 - 110, 38, 600, TXT, 24); c.fillText(nick, px + 110, cy + 102);
    c.fillStyle = '#8a8f98'; c.font = `500 28px ${TXT}`; c.fillText(d.whoSub || 'Solana', px + 110, cy + 140);
    // label
    c.fillStyle = '#8a8f98'; c.font = `600 28px ${TXT}`;
    const lbl = String(d.label || '').toUpperCase(); try { c.letterSpacing = '4px'; } catch (e) {}
    c.fillText(lbl, px, cy + 238); try { c.letterSpacing = '0px'; } catch (e) {}
    // big number: $ (or % when $ hidden / no SOL price)
    const big = o.hideUsd || !d.usdTxt ? d.pctTxt || d.solTxt : d.usdTxt;
    fit(c, big, cw - 128, 196, 700, DISP, 80);
    const fs = parseInt(c.font, 10) || 196, by = cy + 250 + fs * 0.86;
    const bgd = c.createLinearGradient(0, by - fs * 0.8, 0, by);
    if (up) { bgd.addColorStop(0, '#d9ffe8'); bgd.addColorStop(0.55, '#4ade80'); bgd.addColorStop(1, '#1f9d55'); }
    else { bgd.addColorStop(0, '#ffe1e5'); bgd.addColorStop(0.55, '#ff5a6e'); bgd.addColorStop(1, '#b02a3c'); }
    c.save(); c.shadowColor = up ? 'rgba(74,222,128,.33)' : 'rgba(255,90,110,.33)'; c.shadowBlur = 40; c.fillStyle = bgd; c.fillText(big, px - 4, by); c.restore();
    // SOL / % line
    const parts = [];
    if (!o.hideSol && d.solTxt && big !== d.solTxt) parts.push(d.solTxt);
    if (d.pctTxt && big !== d.pctTxt) parts.push(d.pctTxt);
    if (parts.length) { c.fillStyle = up ? '#4ade80' : '#ff6b7d'; fit(c, parts.join('  ·  '), cw - 128, 42, 600, DISP, 24); c.fillText(parts.join('  ·  '), px, by + 66); }
    // stat row
    const ry = cy + ch - 56 - 120;
    c.strokeStyle = 'rgba(255,255,255,.11)'; c.lineWidth = 2; c.beginPath(); c.moveTo(px, ry); c.lineTo(cx + cw - 64, ry); c.stroke();
    const st = (o.hideUsd ? d.statsNoUsd || d.stats : d.stats) || [], colW = (cw - 128) / 3;
    st.slice(0, 3).forEach((s, i) => {
      const x = px + i * colW + (i ? 28 : 0);
      if (i) { c.beginPath(); c.moveTo(px + i * colW, ry + 40); c.lineTo(px + i * colW, ry + 130); c.stroke(); }
      c.fillStyle = '#f2f3f5'; fit(c, String(s[0]), colW - 36, 54, 700, DISP, 26); c.fillText(String(s[0]), x, ry + 92);
      c.fillStyle = '#8a8f98'; fit(c, String(s[1]), colW - 36, 26, 500, TXT, 18); c.fillText(String(s[1]), x, ry + 128);
    });
    // footer: date + source (on-chain only for wallet data)
    const srcT = d.src === 'wallet' ? '✓ ' + L('Zweryfikowane on-chain', 'Verified on-chain') : d.src === 'demo' ? 'DEMO · ' + L('przykładowe dane', 'sample data') : '✍︎ ' + L('wpisane ręcznie', 'entered manually');
    c.font = `500 24px ${TXT}`; c.fillStyle = d.src === 'wallet' ? '#8fd6ad' : d.src === 'demo' ? '#e0b660' : '#8a8f98';
    const fl = (d.when ? d.when + ' · ' : '') + srcT;
    fit(c, fl, W - 160, 26, 600, TXT, 18); c.fillText(fl, 80, H - 92);
    c.font = `500 22px ${TXT}`; c.fillStyle = '#6b7078'; c.fillText(L('kyvo · Dziennik · nie porada finansowa', 'kyvo · Journal · not financial advice'), 80, H - 54);
  }
  function frame(c, d, o, bg) { drawBg(c, bg, o, d.pos); drawOverlay(c, d, o); }

  /* ---------------- UI ---------------- */
  let ov = null, S = null;   // S = {d, o, bg, url, raf, rec, outUrl}
  function cleanup() {
    if (!S) return;
    cancelAnimationFrame(S.raf); S.raf = 0;
    if (S.rec && S.rec.state !== 'inactive') { S.cancel = true; try { S.rec.stop(); } catch (e) {} }
    if (S.bg && S.bg.el && S.bg.el.tagName === 'VIDEO') { try { S.bg.el.pause(); S.bg.el.removeAttribute('src'); S.bg.el.load(); } catch (e) {} }
    if (S.url) URL.revokeObjectURL(S.url);
    if (S.outUrl) URL.revokeObjectURL(S.outUrl);
    if (S.ac) { try { S.ac.close(); } catch (e) {} }
    S = null;
  }
  function close() { cleanup(); if (ov) { ov.remove(); ov = null; document.body.classList.remove('ky-noscroll'); } }
  const q = (s) => ov && ov.querySelector(s);
  function paint() { if (!S || !ov) return; const cv = q('#kpcCv'); if (cv) frame(cv.getContext('2d'), S.d, S.o, S.bg); }
  function loop() {
    if (!S) return;
    if (!S.recording) paint();
    if (S.bg && S.bg.kind === 'video') S.raf = requestAnimationFrame(loop); else S.raf = 0;
  }
  function setStatus(t, cls) { const s = q('#kpcStat'); if (s) { s.textContent = t || ''; s.className = 'kpc-stat' + (cls ? ' ' + cls : ''); } }
  function setBusy(b) { ov && ov.querySelectorAll('[data-kpc]').forEach((x) => { if (x.dataset.kpc !== 'x') x.disabled = !!b; }); ov && ov.querySelectorAll('.kpc-ctl input').forEach((x) => (x.disabled = !!b)); }
  function syncUi() {
    if (!ov || !S) return;
    const v = S.bg && S.bg.kind === 'video', any = !!S.bg;
    q('[data-kpc="clear"]').hidden = !any;
    q('#kpcPos').closest('.kpc-sl').hidden = !any; q('#kpcZoom').closest('.kpc-sl').hidden = !any; q('#kpcDark').closest('.kpc-sl').hidden = !any;
    q('[data-kpc="png"]').textContent = '🖼 ' + (v ? L('Zapisz PNG (1. klatka)', 'Save PNG (1st frame)') : L('Zapisz PNG', 'Save PNG'));
    const vb = q('[data-kpc="vid"]'); vb.hidden = !v;
    q('#kpcVidNote').hidden = !v;
    q('#kpcVidNote').textContent = canRecord()
      ? L(`Filmik ${pickMime().indexOf('mp4') >= 0 ? 'MP4' : 'WebM'} 9:16, max ${MAXSEC} s${S.bg && S.bg.dur ? ' (Twój: ' + Math.min(MAXSEC, S.bg.dur).toFixed(1) + ' s)' : ''}. Nagrywa się w czasie rzeczywistym — nie zamykaj karty.`, `${pickMime().indexOf('mp4') >= 0 ? 'MP4' : 'WebM'} 9:16 video, max ${MAXSEC} s${S.bg && S.bg.dur ? ' (yours: ' + Math.min(MAXSEC, S.bg.dur).toFixed(1) + ' s)' : ''}. Records in real time — keep this screen open.`)
      : L('Ta przeglądarka nie umie nagrać filmiku (np. starszy iPhone). Zapisz PNG z pierwszą klatką albo użyj Chrome / nowszego iOS.', 'This browser cannot record video (e.g. an older iPhone). Save a PNG with the first frame, or use Chrome / a newer iOS.');
    vb.disabled = !canRecord();
  }
  function readOpts() {
    const o = S.o;
    o.nick = (q('#kpcNick').value || '').slice(0, 24);
    o.hideUsd = q('#kpcHideUsd').checked; o.hideSol = q('#kpcHideSol').checked;
    o.offY = +q('#kpcPos').value; o.zoom = 1 + (+q('#kpcZoom').value) / 100; o.dark = (+q('#kpcDark').value) / 100;
    if (!S.raf) paint();
  }
  async function setFile(f, kind) {
    if (!f || !S) return;
    if (kind === 'image' && !/^image\//.test(f.type || 'image/')) { setStatus(L('To nie jest zdjęcie.', 'That is not an image.'), 'err'); return; }
    if (kind === 'video' && !/^video\//.test(f.type || 'video/')) { setStatus(L('To nie jest filmik.', 'That is not a video.'), 'err'); return; }
    const old = S.bg, oldUrl = S.url;
    const url = URL.createObjectURL(f);   // stays on this device — never uploaded
    setStatus(L('Wczytuję…', 'Loading…'));
    let bg = null;
    if (kind === 'image') {
      const im = await load(url);
      if (im && im.naturalWidth) bg = { kind: 'image', el: im, w: im.naturalWidth, h: im.naturalHeight };
    } else {
      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.preload = 'auto';
      v.src = url;
      bg = await new Promise((res) => {
        let done = false; const fin = (x) => { if (!done) { done = true; res(x); } };
        v.onloadeddata = () => fin({ kind: 'video', el: v, w: v.videoWidth, h: v.videoHeight, dur: isFinite(v.duration) ? v.duration : 0 });
        v.onerror = () => fin(null); setTimeout(() => fin(v.videoWidth ? { kind: 'video', el: v, w: v.videoWidth, h: v.videoHeight, dur: isFinite(v.duration) ? v.duration : 0 } : null), 10000);
      });
      if (bg) { try { await v.play(); } catch (e) {} }
    }
    if (!S) { URL.revokeObjectURL(url); return; }
    if (!bg || !bg.w) { URL.revokeObjectURL(url); setStatus(L('Nie umiem otworzyć tego pliku w tej przeglądarce.', 'This browser cannot open that file.'), 'err'); return; }
    if (old && old.el && old.el.tagName === 'VIDEO') { try { old.el.pause(); } catch (e) {} }
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    S.bg = bg; S.url = url; S.o.offX = 0; q('#kpcPos').value = 0; S.o.offY = 0; q('#kpcZoom').value = 0; S.o.zoom = 1;
    setStatus(''); syncUi();
    cancelAnimationFrame(S.raf); S.raf = 0; loop(); paint();
  }
  function clearBg() {
    if (!S) return;
    if (S.bg && S.bg.el && S.bg.el.tagName === 'VIDEO') { try { S.bg.el.pause(); } catch (e) {} }
    if (S.url) URL.revokeObjectURL(S.url);
    S.bg = null; S.url = null; cancelAnimationFrame(S.raf); S.raf = 0; syncUi(); paint();
  }
  function fname(ext) { const d = S.d; return 'kyvo-pnl-' + String(d.kind || 'trade') + (d.sym ? '-' + String(d.sym).replace(/[^\w-]/g, '').slice(0, 16) : '') + '.' + ext; }
  function offer(blob, name, kind) {
    if (!S) return;
    if (S.outUrl) URL.revokeObjectURL(S.outUrl);
    const url = URL.createObjectURL(blob); S.outUrl = url;
    const box = q('#kpcOut');
    box.hidden = false;
    box.innerHTML = `<b>${kind === 'video' ? '🎬 ' + L('Filmik gotowy', 'Video ready') : '🖼 ' + L('PNG gotowy', 'PNG ready')}</b> <small class="mut">${(blob.size / 1048576).toFixed(blob.size > 1048576 ? 1 : 2)} MB</small>
      <div class="kpc-oa"><button type="button" class="jr-btn on" data-kpo="share" hidden>${L('Udostępnij', 'Share')}</button><a class="jr-btn${kind === 'video' ? '' : ' on'}" data-kpo="dl" href="${url}" download="${E(name)}">${L('Pobierz', 'Download')} ${E(name.split('.').pop().toUpperCase())}</a></div>`;
    const file = typeof File === 'function' ? new File([blob], name, { type: blob.type || (kind === 'video' ? 'video/webm' : 'image/png') }) : null;
    let can = false; try { can = !!(file && navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) {}
    if (can) { const b = box.querySelector('[data-kpo="share"]'); b.hidden = false; b.onclick = () => navigator.share({ files: [file] }).catch(() => {}); box.querySelector('[data-kpo="dl"]').classList.remove('on'); }
    try { box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
    window.__kyPnlLast = { kind, type: blob.type, bytes: blob.size, name };
    window.__kyPnlBlob = blob;
  }
  async function exportPng() {
    if (!S) return;
    setBusy(true); setStatus(L('Tworzę PNG…', 'Making the PNG…'));
    try {
      if (S.bg && S.bg.kind === 'video') {   // PNG = first frame
        const v = S.bg.el; v.pause();
        await seek(v, 0);
      }
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      frame(cv.getContext('2d'), S.d, S.o, S.bg);
      const blob = await new Promise((r) => { try { cv.toBlob(r, 'image/png'); } catch (e) { r(null); } });
      if (!blob) throw new Error('png');
      offer(blob, fname('png'), 'image'); setStatus('');
    } catch (e) { setStatus(L('Nie udało się zapisać PNG.', 'Could not save the PNG.'), 'err'); }
    if (S && S.bg && S.bg.kind === 'video') { try { S.bg.el.play(); } catch (e) {} }
    setBusy(false);
  }
  function seek(v, t) {
    return new Promise((res) => {
      if (Math.abs(v.currentTime - t) < 0.01 && v.readyState >= 2) return res();
      let done = false; const fin = () => { if (!done) { done = true; v.removeEventListener('seeked', fin); res(); } };
      v.addEventListener('seeked', fin); setTimeout(fin, 3000);
      try { v.currentTime = t; } catch (e) { fin(); }
    });
  }
  async function exportVideo() {
    if (!S || !S.bg || S.bg.kind !== 'video') return;
    if (!canRecord()) { setStatus(L('Brak nagrywania w tej przeglądarce — zapisuję PNG z pierwszą klatką.', 'No recording in this browser — saving a PNG with the first frame.'), 'err'); return exportPng(); }
    const me = S, v = S.bg.el, mime = pickMime();
    const dur = Math.min(MAXSEC, S.bg.dur && isFinite(S.bg.dur) ? S.bg.dur : MAXSEC);
    setBusy(true); setStatus(L('Przygotowuję nagrywanie…', 'Preparing the recording…'));
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    v.pause(); v.loop = false; await seek(v, 0);
    frame(c, S.d, S.o, S.bg);
    const stream = cv.captureStream(FPS);
    // audio of the clip (Web Audio → stream; not played on the speakers). If it fails → silent video.
    let audio = false;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        if (!S.ac) { S.ac = new AC(); S.asrc = S.ac.createMediaElementSource(v); S.adst = S.ac.createMediaStreamDestination(); S.asrc.connect(S.adst); }
        if (S.ac.state === 'suspended') await S.ac.resume();
        S.adst.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
        v.muted = false; v.volume = 1; audio = stream.getAudioTracks().length > 0;
      }
    } catch (e) { audio = false; v.muted = true; }
    let rec;
    try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000, audioBitsPerSecond: audio ? 128000 : undefined }); }
    catch (e) { try { rec = new MediaRecorder(stream, { mimeType: mime }); } catch (e2) { rec = null; } }
    if (!rec) { v.muted = true; v.loop = true; setBusy(false); setStatus(L('Nie udało się uruchomić nagrywania — zapisuję PNG.', 'Could not start recording — saving a PNG.'), 'err'); return exportPng(); }
    S.rec = rec; S.recording = true; S.cancel = false;
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise((r) => (rec.onstop = r));
    const bar = q('#kpcBar'); if (bar) { bar.hidden = false; bar.firstElementChild.style.width = '0%'; }
    rec.start(250);
    try { await v.play(); } catch (e) { v.muted = true; audio = false; try { await v.play(); } catch (e2) {} }
    const prev = q('#kpcCv').getContext('2d');
    const t0 = performance.now();
    await new Promise((res) => {
      // frame callbacks stop when the clip ends / pauses → also finish on 'ended' and on a hard time limit
      let done = false; const fin = () => { if (!done) { done = true; v.removeEventListener('ended', fin); clearTimeout(hard); res(); } };
      v.addEventListener('ended', fin);
      const hard = setTimeout(fin, (dur + 4) * 1000);
      const step = () => {
        if (done) return;
        if (S !== me || me.cancel) return fin();
        frame(c, me.d, me.o, me.bg);
        prev.drawImage(cv, 0, 0);
        const t = Math.max(v.currentTime, 0), p = Math.min(1, t / dur);
        if (bar) bar.firstElementChild.style.width = (p * 100).toFixed(1) + '%';
        setStatus(L(`Nagrywam… ${Math.round(p * 100)}%`, `Recording… ${Math.round(p * 100)}%`));
        if (t >= dur - 0.02 || v.ended || v.paused || performance.now() - t0 > (dur + 4) * 1000) return fin();
        setTimeout(step, 1000 / FPS);   // timer, not requestVideoFrameCallback / rAF: keeps drawing the overlay even if no new video frame arrives
      };
      step();
    });
    frame(c, me.d, me.o, me.bg);
    try { rec.stop(); } catch (e) {}
    await stopped;
    stream.getVideoTracks().forEach((t) => t.stop());
    if (S !== me) return;
    v.pause(); v.muted = true; v.loop = true; S.recording = false; S.rec = null;
    if (bar) bar.hidden = true;
    setBusy(false);
    const type = (rec.mimeType || mime).split(';')[0] || 'video/webm';
    const blob = new Blob(chunks, { type });
    if (!blob.size) { setStatus(L('Nagranie wyszło puste — spróbuj jeszcze raz albo zapisz PNG.', 'The recording came out empty — try again or save a PNG.'), 'err'); }
    else { offer(blob, fname(type.indexOf('mp4') >= 0 ? 'mp4' : 'webm'), 'video'); setStatus(audio ? L('Gotowe (z dźwiękiem z filmiku).', 'Done (with the clip’s audio).') : L('Gotowe (bez dźwięku).', 'Done (silent).')); }
    window.__kyPnlRec = { mime: type, audio, dur };
    seek(v, 0).then(() => { try { v.play(); } catch (e) {} });
  }

  // d: {kind:'trade'|'day'|'month', sym, pill, label, whoSub, usdTxt, solTxt, pctTxt, pos, stats:[[v,l]x3], statsNoUsd, when, src:'wallet'|'manual'|'demo', nick}
  async function open(d) {
    close();
    const P = window.KyvoPremium;
    if (P && P.isActive && !P.isActive()) { if (window.__kyvoToast) window.__kyvoToast(L('Kreator P&L jest w Premium.', 'The P&L card maker is Premium.')); return; }
    S = { d, o: { nick: d.nick || '', hideUsd: false, hideSol: false, offX: 0, offY: 0, zoom: 1, dark: 0.45 }, bg: null, raf: 0 };
    ov = document.createElement('div'); ov.className = 'kpc'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('translate', 'no');
    ov.setAttribute('aria-label', L('Kreator P&L', 'P&L card maker'));
    ov.innerHTML = `<div class="kpc-box">
      <div class="kpc-h"><b>🎴 ${L('Kreator P&L', 'P&L card maker')}</b><button type="button" class="jr-ib" data-kpc="x" aria-label="${L('Zamknij', 'Close')}">×</button></div>
      <div class="kpc-main">
        <div class="kpc-pv"><canvas id="kpcCv" width="${W}" height="${H}" aria-label="${L('Podgląd karty', 'Card preview')}"></canvas><div class="kpc-bar" id="kpcBar" hidden><i></i></div></div>
        <div class="kpc-ctl">
          <div class="kpc-bgb">
            <label class="jr-btn kpc-file">📷 ${L('Dodaj zdjęcie', 'Add photo')}<input type="file" id="kpcImg" accept="image/*" hidden></label>
            <label class="jr-btn kpc-file">🎬 ${L('Dodaj filmik', 'Add video')}<input type="file" id="kpcVid" accept="video/*" hidden></label>
            <button type="button" class="jr-btn" data-kpc="clear" hidden>⬛ ${L('Domyślne tło', 'Default background')}</button>
          </div>
          <label class="kpc-sl" hidden><span>${L('Pozycja', 'Position')}</span><input type="range" id="kpcPos" min="-100" max="100" value="0"></label>
          <label class="kpc-sl" hidden><span>Zoom</span><input type="range" id="kpcZoom" min="0" max="100" value="0"></label>
          <label class="kpc-sl" hidden><span>${L('Przyciemnienie', 'Darkness')}</span><input type="range" id="kpcDark" min="0" max="90" value="45"></label>
          <label class="kpc-in"><span>${L('Nick na karcie', 'Name on the card')}</span><input id="kpcNick" maxlength="24" value="${E(S.o.nick)}" placeholder="${L('Twój nick', 'Your nick')}" autocomplete="off" spellcheck="false"></label>
          <label class="kpc-tg"><input type="checkbox" id="kpcHideUsd"><span>${L('Ukryj $ — pokaż tylko %', 'Hide $ — show % only')}</span></label>
          <label class="kpc-tg"><input type="checkbox" id="kpcHideSol"><span>${L('Ukryj SOL', 'Hide SOL')}</span></label>
          <div class="kpc-act"><button type="button" class="jr-btn on" data-kpc="png">🖼 ${L('Zapisz PNG', 'Save PNG')}</button><button type="button" class="jr-btn on" data-kpc="vid" hidden>🎬 ${L('Zapisz filmik', 'Save video')}</button></div>
          <small class="mut kpc-note" id="kpcVidNote" hidden></small>
          <div class="kpc-stat" id="kpcStat" role="status" aria-live="polite"></div>
          <div class="kpc-out" id="kpcOut" hidden></div>
          <small class="mut kpc-note">${L('Liczby są z Twojego Dziennika (nie da się ich wpisać). Zdjęcie / filmik zostaje na tym telefonie — nic nie jest wysyłane. Przeciągnij podgląd, żeby przesunąć tło.', 'Numbers come from your Journal (they cannot be typed in). The photo / video stays on this device — nothing is uploaded. Drag the preview to move the background.')}</small>
        </div>
      </div></div>`;
    document.body.appendChild(ov); document.body.classList.add('ky-noscroll');
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    ov.querySelectorAll('[data-kpc]').forEach((b) => (b.onclick = () => {
      const a = b.dataset.kpc;
      if (a === 'x') close(); else if (a === 'clear') clearBg(); else if (a === 'png') exportPng(); else if (a === 'vid') exportVideo();
    }));
    q('#kpcImg').onchange = (e) => { setFile(e.target.files && e.target.files[0], 'image'); e.target.value = ''; };
    q('#kpcVid').onchange = (e) => { setFile(e.target.files && e.target.files[0], 'video'); e.target.value = ''; };
    ['#kpcNick', '#kpcPos', '#kpcZoom', '#kpcDark'].forEach((s) => (q(s).oninput = readOpts));
    ['#kpcHideUsd', '#kpcHideSol'].forEach((s) => (q(s).onchange = readOpts));
    if (!d.usdTxt) { q('#kpcHideUsd').closest('.kpc-tg').hidden = true; }
    // drag the preview to move the background (both axes)
    const cvEl = q('#kpcCv'); let drag = null;
    cvEl.addEventListener('pointerdown', (e) => { if (!S || !S.bg || S.recording) return; drag = { x: e.clientX, y: e.clientY, ox: S.o.offX, oy: S.o.offY, r: cvEl.getBoundingClientRect() }; try { cvEl.setPointerCapture(e.pointerId); } catch (er) {} });
    cvEl.addEventListener('pointermove', (e) => {
      if (!drag || !S) return;
      const cl = (v) => Math.max(-100, Math.min(100, v));
      S.o.offX = cl(drag.ox - ((e.clientX - drag.x) / drag.r.width) * 200);
      S.o.offY = cl(drag.oy - ((e.clientY - drag.y) / drag.r.height) * 200);
      q('#kpcPos').value = Math.round(S.o.offY);
      if (!S.raf) paint();
    });
    const end = () => { drag = null; };
    cvEl.addEventListener('pointerup', end); cvEl.addEventListener('pointercancel', end);
    await art();
    syncUi(); paint();
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ov && !(S && S.recording)) close(); });
  window.KyvoPnlCard = { open, close, draw: frame, pickMime, canRecord, _state: () => S };
})();
