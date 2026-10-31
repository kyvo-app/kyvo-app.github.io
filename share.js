/* Kyvo v8.15 — P&L share card (FREE). Draws a 1080×1920 (9:16) PNG on a canvas, entirely in the browser:
   Kyvo mark + horizon arc art (same-origin files), chrome numbers, the user's own figures only (nothing invented).
   Then: native share sheet with the file where supported (mobile), otherwise "Download PNG".
   Coin logos come from other sites — drawn only if they load with CORS; otherwise a letter badge (keeps the canvas exportable). */
(function () {
  'use strict';
  const isEn = () => !!(window.KyvoI18n && window.KyvoI18n.isEn && window.KyvoI18n.isEn());
  const L = (pl, en) => (isEn() ? en : pl);
  const URL_TXT = (location.host + location.pathname.replace(/[^/]*$/, '')).replace(/\/$/, '') || 'kyvo-app.github.io';   // v8.25: the address the app runs on
  const W = 1080, H = 1920;
  const load = (src, cors) => new Promise((res) => {
    if (!src) return res(null);
    const i = new Image(); if (cors) i.crossOrigin = 'anonymous';
    let done = false; const fin = (v) => { if (!done) { done = true; res(v); } };
    i.onload = () => fin(i); i.onerror = () => fin(null); setTimeout(() => fin(null), 5000);
    i.src = src;
  });
  function fitText(c, t, max, size, weight, fam) {
    let s = size;
    do { c.font = `${weight} ${s}px ${fam}`; s -= 4; } while (c.measureText(t).width > max && s > 20);
  }
  const DISP = "'KyvoDisplay','KyvoInter',system-ui,sans-serif", TXT = "'KyvoInter',system-ui,sans-serif";
  function chrome(c, y0, y1) {
    const g = c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#c9ccd3'); g.addColorStop(0.6, '#8e96a3'); g.addColorStop(0.8, '#eef0f4'); g.addColorStop(1, '#b9bec8');
    return g;
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  // d = {kind, sym, title, big, pos, sub, rows:[[label, value]], img, when, note}
  async function draw(d) {
    try { await Promise.all([document.fonts.load(`700 120px KyvoDisplay`), document.fonts.load(`600 40px KyvoInter`)]); } catch (e) {}
    const [arc, logo, coin] = await Promise.all([load('img/arc-1280.webp'), load('icons/icon-192.png'), load(d.img, true)]);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    c.fillStyle = '#030304'; c.fillRect(0, 0, W, H);
    let g = c.createRadialGradient(W / 2, 520, 40, W / 2, 520, 900);
    g.addColorStop(0, d.pos ? 'rgba(59,229,138,.16)' : d.pos === false ? 'rgba(255,90,110,.16)' : 'rgba(155,135,255,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (arc) { c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.95; const aw = 1700, ah = aw * arc.height / arc.width; c.drawImage(arc, (W - aw) / 2, 1080 - ah * 0.42, aw, ah); c.restore(); }
    // header
    if (logo) { c.save(); rr(c, 80, 98, 88, 88, 22); c.clip(); c.drawImage(logo, 78, 96, 92, 92); c.restore(); c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 2; rr(c, 80, 98, 88, 88, 22); c.stroke(); }
    c.fillStyle = '#f4f4f6'; c.font = `700 58px ${DISP}`; c.textBaseline = 'middle'; c.fillText('Kyvo', 190, 144);
    c.textAlign = 'right'; c.fillStyle = '#9a9da6'; c.font = `600 26px ${TXT}`;
    c.fillText((d.kind === 'month' ? L('MIESIĄC', 'MONTH') : d.kind === 'day' ? L('DZIEŃ', 'DAY') : 'TRADE') + ' · ' + L('DZIENNIK MEMECOINÓW', 'MEMECOIN JOURNAL'), W - 80, 144);
    c.textAlign = 'center';
    // coin / title
    const cy = 470;
    if (d.kind !== 'day' && d.kind !== 'month') {
      c.save(); c.beginPath(); c.arc(W / 2, cy, 92, 0, Math.PI * 2); c.closePath();
      if (coin) { c.clip(); c.drawImage(coin, W / 2 - 92, cy - 92, 184, 184); }
      else { const lg = c.createLinearGradient(W / 2 - 92, cy - 92, W / 2 + 92, cy + 92); lg.addColorStop(0, '#2a2a33'); lg.addColorStop(1, '#121216'); c.fillStyle = lg; c.fill(); c.fillStyle = '#e8e8ee'; c.font = `700 92px ${DISP}`; c.fillText(((d.sym || '?')[0] || '?').toUpperCase(), W / 2, cy + 6); }
      c.restore();
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 3; c.beginPath(); c.arc(W / 2, cy, 94, 0, Math.PI * 2); c.stroke();
    }
    const MO = d.kind === 'month';
    c.fillStyle = '#f4f4f6'; fitText(c, d.title, W - 160, MO ? 64 : 84, 700, DISP); c.fillText(d.title, W / 2, MO ? 300 : d.kind === 'day' ? 470 : 650);
    // big number
    const by = MO ? 470 : 880;
    fitText(c, d.big, W - 120, MO ? 170 : 250, 700, DISP);
    c.save(); c.shadowColor = d.pos ? 'rgba(59,229,138,.55)' : d.pos === false ? 'rgba(255,90,110,.5)' : 'rgba(155,135,255,.5)'; c.shadowBlur = 60;
    c.fillStyle = chrome(c, by - 120, by + 120); c.fillText(d.big, W / 2, by); c.restore();
    if (d.sub) { c.fillStyle = d.pos ? '#3BE58A' : d.pos === false ? '#FF5A6E' : '#c9ccd3'; fitText(c, d.sub, W - 160, MO ? 46 : 60, 600, DISP); c.fillText(d.sub, W / 2, by + (MO ? 120 : 170)); }
    // v8.17: month calendar grid (Monday first), muted green / red tiles
    if (MO && d.cal) {
      const tw7 = 130, gp = 12, gx0 = (W - (tw7 * 7 + gp * 6)) / 2, th7 = 104, gy0 = 720;
      c.font = `600 24px ${TXT}`; c.fillStyle = '#6d717b';
      d.cal.wd.forEach((w, i) => c.fillText(w, gx0 + i * (tw7 + gp) + tw7 / 2, gy0 - 30));
      const mx = Math.max(0.0001, ...d.cal.cells.map((x) => Math.abs(x.v || 0)));
      d.cal.cells.forEach((x, i) => {
        const j = i + d.cal.pad, cx = gx0 + (j % 7) * (tw7 + gp), cy2 = gy0 + Math.floor(j / 7) * (th7 + gp);
        const a = x.v == null ? 0 : 0.3 + 0.5 * Math.min(1, Math.abs(x.v) / mx);
        rr(c, cx, cy2, tw7, th7, 22);
        c.fillStyle = x.v == null ? 'rgba(255,255,255,.035)' : x.be ? 'rgba(150,155,165,.22)' : x.v > 0 ? `rgba(46,150,98,${a})` : `rgba(176,62,76,${a})`; c.fill();
        c.strokeStyle = x.v == null ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.14)'; c.lineWidth = 2; c.stroke();
        c.textAlign = 'left'; c.fillStyle = x.v == null ? '#5d6069' : 'rgba(255,255,255,.8)'; c.font = `600 24px ${TXT}`; c.fillText(String(x.d), cx + 14, cy2 + 26);
        if (x.t) { c.textAlign = 'right'; c.fillStyle = '#f4f4f6'; fitText(c, x.t, tw7 - 20, 30, 700, DISP); c.fillText(x.t, cx + tw7 - 12, cy2 + th7 - 26); }
        c.textAlign = 'center';
      });
    }
    // stat tiles
    const rows = (d.rows || []).slice(0, 4), tw = 440, th = MO ? 150 : 170, gx = 40, x0 = (W - (tw * 2 + gx)) / 2, y0 = MO ? 1440 : 1250;
    rows.forEach((r, i) => {
      const x = x0 + (i % 2) * (tw + gx), y = y0 + Math.floor(i / 2) * (th + 30);
      rr(c, x, y, tw, th, 34); c.fillStyle = 'rgba(14,14,20,.78)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.10)'; c.lineWidth = 2; c.stroke();
      c.textAlign = 'left'; c.fillStyle = '#8e919a'; c.font = `600 26px ${TXT}`; c.fillText(String(r[0]).toUpperCase(), x + 34, y + 52);
      c.fillStyle = '#f4f4f6'; fitText(c, String(r[1]), tw - 68, 54, 700, DISP); c.fillText(String(r[1]), x + 34, y + 116);
      c.textAlign = 'center';
    });
    if (MO && d.verified) {   // only for data computed from the public wallet (journal.js decides)
      const vt = '✓ ' + L('Zweryfikowane on-chain', 'Verified on-chain'); c.font = `600 28px ${TXT}`; const vw = c.measureText(vt).width + 48;
      rr(c, (W - vw) / 2, 1630, vw, 54, 27); c.fillStyle = 'rgba(46,150,98,.16)'; c.fill(); c.strokeStyle = 'rgba(120,210,160,.45)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#9fe0bb'; c.fillText(vt, W / 2, 1658);
    }
    // footer
    c.fillStyle = '#c9ccd3'; c.font = `600 34px ${TXT}`; c.fillText(URL_TXT, W / 2, H - 170);
    c.fillStyle = '#6f727b'; c.font = `500 24px ${TXT}`;
    c.fillText((d.when ? d.when + ' · ' : '') + L('Wynik z publicznego portfela · nie porada finansowa', 'From a public wallet · not financial advice'), W / 2, H - 112);
    return cv;
  }

  let ov = null;
  function close() { if (ov) { const u = ov.dataset.url; ov.remove(); ov = null; if (u) URL.revokeObjectURL(u); document.body.classList.remove('ky-noscroll'); } }
  async function open(d) {
    close();
    ov = document.createElement('div'); ov.className = 'ky-share'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('translate', 'no');
    ov.innerHTML = `<div class="ksh-box"><div class="ksh-prev"><div class="ksh-load">${L('Tworzę kartę…', 'Making the card…')}</div></div>
      <div class="ksh-act"><button type="button" class="jr-btn on" data-sh="share" hidden>${L('Udostępnij', 'Share')}</button><a class="jr-btn on" data-sh="dl" download="kyvo-${d.kind === 'month' ? 'month' : d.kind === 'day' ? 'day' : 'trade'}.png" hidden>${L('Pobierz PNG', 'Download PNG')}</a><button type="button" class="jr-btn" data-sh="x">${L('Zamknij', 'Close')}</button></div>
      <small class="mut">${L('PNG 1080×1920 (format story). Tylko Twoje liczby — bez adresu portfela.', 'PNG 1080×1920 (story format). Only your numbers — no wallet address.')}</small></div>`;
    document.body.appendChild(ov); document.body.classList.add('ky-noscroll');
    ov.addEventListener('click', (e) => { if (e.target === ov || (e.target.closest && e.target.closest('[data-sh="x"]'))) close(); });
    const me = ov;
    let cv;
    try { cv = await draw(d); } catch (e) { cv = null; }
    if (me !== ov) return;
    if (!cv) { me.querySelector('.ksh-load').textContent = L('Nie udało się utworzyć karty.', 'Could not make the card.'); return; }
    const blob = await new Promise((r) => { try { cv.toBlob(r, 'image/png'); } catch (e) { r(null); } });
    if (me !== ov || !blob) return;
    const url = URL.createObjectURL(blob); me.dataset.url = url;
    me.querySelector('.ksh-prev').innerHTML = `<img src="${url}" alt="${L('Karta P&L', 'P&L card')}" width="1080" height="1920">`;
    const dl = me.querySelector('[data-sh="dl"]'); dl.href = url; dl.hidden = false;
    const file = typeof File === 'function' ? new File([blob], dl.getAttribute('download'), { type: 'image/png' }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      const b = me.querySelector('[data-sh="share"]'); b.hidden = false;
      b.onclick = () => navigator.share({ files: [file], text: 'Kyvo · ' + URL_TXT }).catch(() => {});
    }
    window.__kyShareLast = { w: cv.width, h: cv.height, bytes: blob.size };
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  window.KyvoShare = { open, draw, close };
})();
