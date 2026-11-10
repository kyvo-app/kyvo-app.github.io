/* v8.46: Kyvo does not sell plans inside the app. A purchase on the sales site returns a
   one-time code. This app redeems it with HTTPS POST {code} to KYVO_ACCESS_CONFIG.redeemUrl.
   Empty redeemUrl does not unlock anyone. The code is not stored. A successful redeem only
   sets kyvo_device_ok=1 on this device (separate from kyvo_owner_tok). Never put a code,
   a shared password, or a Stripe secret in this file. */
window.KYVO_ACCESS_CONFIG = { redeemUrl: 'https://kyvo.46-224-229-212.sslip.io/api/redeem' };
window.KYVO_PREMIUM_CONFIG = {
  enabled: false,
  currency: 'USD',
  /* tiers still used by the gates:
       free     → 1 Runner / Warsaw day, Tracker 3 wallets, 2 notifications / day
       runners  → full access (all Runners, unlimited Tracker, all notifications). Owner link or the access password. */
  freeRunnersPerDay: 1,
  plans: {
    premium: { name: 'Premium', runnersPerDay: 3 },
    runners: { name: 'runners', runnersPerDay: null },
  },
  promoActive: false,
  popupAfterLogin: false,
};

/* v8.12 🥇 Gold tab (Orangie-style coin DD). Client-side gate like the Runner gate (bypassable by a technical user — data is public).
   enabled:false hides the tab, the seg button and the in-app Gold alerts; the server feed (tools/gold.py) keeps running. */
window.KYVO_GOLD_CONFIG = {
  enabled: false,              // v8.36: the 🥇 Gold tab is gone (#gold -> Pulse); the feed still loads for the coin page / Kyvo Check, 🛡️ watchlist guard replaces its alerts
  checkerFreePerDay: 3,        // "Sprawdź coin": free checks per Warsaw day (re-checking the same CA the same day is free); Premium = unlimited
  feedFreeCards: 1,            // Gold feed: free users see 1 full DD card per Warsaw day (the first one they open), the rest is Premium
  alertsPremium: true,         // 🔔 Gold alerts (server push + in-app watchlist ±15 % / vamp alerts) = Premium
  watchPriceMovePct: 15,       // in-app alert for ⭐ watchlist coins: move vs the last alert / baseline
  watchVampMc: 500000,         // in-app vamp alert: a copy of a watchlist coin's ticker above this MC
};

/* v8.14 👀 Tracker (wallet tracker like Axiom / pump.fun "following"). Client-side gate (data is public).
   Free: follow up to freeFollows wallets; Premium: unlimited + phone push when ≥3 top traders buy one coin in 30 min
   (server: tools/pump_tracker.py + tools/kyvo_push.py). Public wallet addresses only — the app never asks for keys / seed. */
window.KYVO_TRACKER_CONFIG = {
  enabled: true,
  freeFollows: 3,
  premiumPush: true,
  rpc: 'https://solana-rpc.publicnode.com',   // free public Solana RPC (CORS *) for pasted wallets outside the server feed
  customPollSec: 60,
  customMaxTxPerPoll: 6,     // getTransaction calls per pasted wallet per poll (spam airdrops eat some of them)
};

/* v8.4: entitlement hook used by notifications (free = 2/day, Premium = all). Until a real backend exists
   nobody is Premium. Later: set from Firebase/Stripe entitlement (never trust a value the user can type).
   v8.11: also gates Runners (free = 1 Runner per Warsaw day) + OWNER unlock:
   opening the app with ?owner=<token> checks SHA-256(token) against KYVO_OWNER_SHA256 below (only the HASH is public,
   the token itself is never in the repo), stores the token in this device's localStorage (kyvo_owner_tok — survives
   reloads, SW updates and "clear data"), strips the parameter from the URL and makes this device Premium (v8.14.1: top tier 'runners').
   Client-side only (static PWA, public data/*.json) — a technical user can bypass any client gate. */
(function () {
  'use strict';
  var KYVO_OWNER_SHA256 = 'fe4e23b1d006665193fb50952d6d357bb7f1da522ae3cc208aa4aca0c4e4ad7e';
  /* Permanent password accepted in the Hasło/kod field. Hash only. Checked locally, never sent to redeemUrl. */
  var KYVO_OWNER_PASSWORD_SHA256 = 'b190c797fac3d7eb152a9236254c89e5b2a54fa4c88b9cfd2e8027f9953912ee';
  var owner = false;
  var access = false;
  try { access = localStorage.getItem('kyvo_device_ok') === '1'; } catch (e) {}
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function sha(t) {
    if (!t || !(window.crypto && crypto.subtle && window.TextEncoder)) return Promise.resolve('');
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(t))).then(hex, function () { return ''; });
  }
  function toast(msg) {
    var show = function () {
      var el = document.createElement('div');
      el.textContent = msg; el.setAttribute('role', 'status');
      el.style.cssText = 'white-space:nowrap;position:fixed;left:50%;bottom:calc(92px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9999;padding:10px 16px;border-radius:12px;background:#151a24;color:#e8ecf3;font:700 13px/1.3 system-ui,sans-serif;box-shadow:0 0 0 1px rgba(139,92,246,.55),0 8px 24px rgba(0,0,0,.5)';
      document.body.appendChild(el); setTimeout(function () { el.remove(); }, 3800);
    };
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
  }
  var tokUrl = null;
  try {
    var u = new URL(location.href);
    tokUrl = u.searchParams.get('owner');
    if (tokUrl !== null) { u.searchParams.delete('owner'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); }
  } catch (e) {}
  var stored = null; try { stored = localStorage.getItem('kyvo_owner_tok'); } catch (e) {}
  var storedPw = null; try { storedPw = localStorage.getItem('kyvo_owner_pw'); } catch (e) {}
  function changed(detail) {
    try { window.dispatchEvent(new CustomEvent('kyvo-premium-change', { detail: detail || {} })); } catch (e) {}
    setTimeout(function () { try { if (window.KyvoPush && window.KyvoPush.syncTags) window.KyvoPush.syncTags(); } catch (e) {} }, 4000);
  }
  function redeemUrl() {
    var c = window.KYVO_ACCESS_CONFIG || {};
    var u = String(c.redeemUrl || '').replace(/^\s+|\s+$/g, '');
    return /^https:\/\//i.test(u) ? u : '';
  }
  window.KyvoPremiumReady = Promise.all([sha(tokUrl), sha(stored), sha(storedPw)]).then(function (r) {
    var en = false; try { en = localStorage.getItem('kyvo_lang') === 'en'; } catch (e) {}
    if (tokUrl && r[0] === KYVO_OWNER_SHA256) {
      owner = true;
      try { localStorage.setItem('kyvo_owner_tok', tokUrl); } catch (e) {}
      toast(en ? '🏃 Runners plan active (owner)' : '🏃 Plan Runners aktywny (właściciel)');
    } else if (tokUrl) toast(en ? 'Invalid owner link' : 'Nieprawidłowy link właściciela');
    if (!owner && stored && r[1] === KYVO_OWNER_SHA256) owner = true;
    if (!owner && storedPw && r[2] === KYVO_OWNER_PASSWORD_SHA256) owner = true;
    if (!owner && !access && freeHour()) toast(en ? '🎁 Premium free until ' + freeLabel() : '🎁 Premium za darmo do ' + freeLabel());
    if (owner || access) changed(owner ? { owner: true } : { access: true });
    return owner || access;
  });
  /* v8.14.1 tiers: 'free' | 'premium' | 'runners'. Owner = 'runners' (top tier). Until a real backend exists nobody else is paid
     (enabled:false). Later the entitlement (kyvo_premium_until + kyvo_premium_tier) must come from the backend, never from user input. */
  /* v8.22 🎁 free launch week (same mechanism as the v8.19 free hour): everyone gets the top tier until FREE_UNTIL
     (absolute time, expires on its own, no redeploy needed). paidTier() ignores it, so the real paid status and the
     OneSignal tier / premium tags never flip for free users. */
  var FREE_UNTIL = Date.parse('2026-11-07T22:59:00Z');   // = 7.11.2026 23:59 Europe/Warsaw
  function freeHour() { return Date.now() < FREE_UNTIL; }
  function freeLabel() { return '7.11 23:59'; }
  function tier() {
    if (owner || access) return 'runners';
    if (freeHour()) return 'runners';
    return paidTier();
  }
  function paidTier() {
    if (owner || access) return 'runners';
    var C = window.KYVO_PREMIUM_CONFIG || {};
    if (!C.enabled) return 'free';
    try {
      var until = +localStorage.getItem('kyvo_premium_until') || 0;
      if (until <= Date.now()) return 'free';
      return localStorage.getItem('kyvo_premium_tier') === 'runners' ? 'runners' : 'premium';
    } catch (e) { return 'free'; }
  }
  window.KyvoPremium = window.KyvoPremium || {
    tier: tier,
    isActive: function () { return tier() !== 'free'; },          // any paid tier (Premium or Runners)
    isRunners: function () { return tier() === 'runners'; },      // top tier: all Runners + Runner / smart-money push
    runnersPerDay: function () {                                  // Infinity = unlimited
      var C = window.KYVO_PREMIUM_CONFIG || {}, P = C.plans || {}, t = tier();
      if (t === 'runners') return Infinity;
      if (t === 'premium') return Math.max(1, +((P.premium || {}).runnersPerDay) || 3);
      return Math.max(1, +C.freeRunnersPerDay || 1);
    },
    isOwner: function () { return owner; },
    hasAccess: function () { return access; },
    /* One-time code. Sent once to redeemUrl, never saved. Empty URL does not unlock. */
    redeem: function (code) {
      var t = String(code == null ? '' : code).trim();
      if (!t) return Promise.resolve({ ok: false, reason: 'empty' });
      return sha(t).then(function (h) {
        if (h && h === KYVO_OWNER_PASSWORD_SHA256) {
          owner = true;
          try { localStorage.setItem('kyvo_owner_pw', t); } catch (e) {}
          changed({ owner: true });
          return { ok: true };
        }
        var url = redeemUrl();
        if (!url) return { ok: false, reason: 'pending' };
        return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ code: t }),
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (res.ok && (!body || body.ok !== false)) {
            access = true;
            try { localStorage.setItem('kyvo_device_ok', '1'); } catch (e) {}
            changed({ access: true });
            return { ok: true };
          }
          return { ok: false, reason: 'invalid' };
        });
      }, function () { return { ok: false, reason: 'network' }; });
      });
    },
    paidTier: paidTier,
    isFreeHour: function () { return !owner && !access && freeHour(); },
    freeUntil: FREE_UNTIL,
    freeLabel: freeLabel,
    formHtml: function () {
      var en = false; try { en = localStorage.getItem('kyvo_lang') === 'en'; } catch (e) {}
      if (owner || access) {
        return '<div class="card" translate="no"><b>' + (en ? 'Unlocked' : 'Odblokowano') + '</b><div class="mut" style="margin-top:4px;font-size:12.5px;line-height:1.45">' + (en ? 'Full access is on for this device.' : 'Pełny dostęp jest włączony na tym urządzeniu.') + '</div></div>';
      }
      var pending = !redeemUrl();
      return '<form id="kyvoAccess" class="card" translate="no" autocomplete="off">' +
        '<div class="h" style="font-size:15px;margin:0 0 6px">' + (en ? 'Code' : 'Hasło / kod') + '</div>' +
        '<p class="mut" style="font-size:12.5px;line-height:1.45;margin:0 0 8px">' + (en ? 'One-time code from your purchase. It works on one device. Kyvo does not sell plans in the app.' : 'Jednorazowy kod z zakupu. Działa na jednym urządzeniu. Kyvo nie sprzedaje planów w aplikacji.') + '</p>' +
        (pending ? '<p class="mut" style="font-size:12.5px;line-height:1.45;margin:0 0 8px">' + (en ? 'The code will work after the next app update.' : 'Kod zadziała po kolejnej aktualizacji aplikacji.') + '</p>' : '') +
        '<input class="acc-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="256" placeholder="' + (en ? 'Code' : 'Hasło / kod') + '" aria-label="' + (en ? 'Code' : 'Hasło / kod') + '">' +
        '<button type="submit" class="pf-btn pf-share">' + (en ? 'Unlock' : 'Odblokuj') + '</button>' +
        '<div data-acc-msg class="mut" style="margin-top:8px;font-size:12.5px"></div></form>';
    },
    wireAccess: function (root) {
      if (!root) return;
      var form = root.querySelector('#kyvoAccess');
      if (!form || form._w) return;
      form._w = true;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = form.querySelector('input');
        var msg = form.querySelector('[data-acc-msg]');
        var en = false; try { en = localStorage.getItem('kyvo_lang') === 'en'; } catch (e2) {}
        var btn = form.querySelector('button');
        if (btn) btn.disabled = true;
        window.KyvoPremium.redeem(input ? input.value : '').then(function (r) {
          if (btn) btn.disabled = false;
          if (!msg) return;
          if (r && r.ok) { if (input) input.value = ''; msg.textContent = en ? 'Unlocked on this device.' : 'Odblokowano na tym urządzeniu.'; }
          else if (r && r.reason === 'pending') msg.textContent = en ? 'The code will work after the next app update.' : 'Kod zadziała po kolejnej aktualizacji aplikacji.';
          else if (r && r.reason === 'empty') msg.textContent = en ? 'Enter the code.' : 'Wpisz kod.';
          else if (r && r.reason === 'network') msg.textContent = en ? 'Could not connect. Try again in a moment.' : 'Nie udało się połączyć. Spróbuj za chwilę.';
          else msg.textContent = en ? 'Code is invalid or already used.' : 'Kod nieprawidłowy albo już wykorzystany.';
        });
      });
    },
  };
})();
