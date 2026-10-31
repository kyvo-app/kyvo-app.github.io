/* Kyvo Premium — payment stub. NOTHING is sold yet (enabled:false → CTA shows "Wkrótce").
   Later: Stripe Payment Links (Stripe account of an adult / legal guardian or a company), subscription with
   a 3-day trial that requires a payment method (card, Apple Pay, Google Pay; BLIK is not available for
   recurring payments). Payment Links are public URLs — NEVER put a Stripe secret key (sk_...) here.
   Entitlement check (who is Premium) needs a backend later, e.g. Firebase + Stripe webhook / extension. */
window.KYVO_PREMIUM_CONFIG = {
  enabled: false,                       // payments are NOT live (no Stripe account yet) → every CTA shows "Wkrótce"
  currency: 'USD',
  /* v8.14.1 two paid tiers (launch price = -50 %, shown as a crossed-out regular price):
       free     → 1 Runner / Warsaw day, Gold 3 checks + 1 card / day, Tracker 3 wallets, 2 notifications / day
       premium  → 3 Runners / day + everything else unlimited (Gold full, Tracker unlimited, all notifications)
       runners  → everything in Premium + ALL Runners (👑 KOL coin, 🚀 Moon run, 📈 Big runner, 🐦 Tweet runner, 🔁 second leg)
                  + Runner / Tweet runner / 👀 smart-money push (top tier; the owner link unlocks this tier) */
  freeRunnersPerDay: 1,
  plans: {
    premium: { name: 'Premium', regularPrice: '$9.99', promoPrice: '$4.99', runnersPerDay: 3,
               stripePaymentLinkPromo: '', stripePaymentLinkRegular: '' },        // e.g. https://buy.stripe.com/xxxx (only used when enabled:true)
    runners: { name: '🏃 Runners', regularPrice: '$49.99', promoPrice: '$24.99', runnersPerDay: null,   // null = unlimited
               stripePaymentLinkPromo: '', stripePaymentLinkRegular: '' },
  },
  regularPrice: '$9.99',                // legacy fields (= Premium plan) for older code paths
  promoPrice: '$4.99',
  promoActive: true,                    // "Cena startowa -50%" badge + crossed-out regular price (no deadline / seat count)
  promoPct: 50,
  period: 'mies.',
  trialDays: 3,
  stripePaymentLinkPromo: '',           // legacy (= Premium plan)
  stripePaymentLinkRegular: '',
  manageUrl: '',                        // Stripe customer portal link (cancel / change card)
  popupAfterLogin: true,                // v8.2: show the Premium pop-up after login / "continue without login" (max once per session and per day)
};

/* v8.12 🥇 Gold tab (Orangie-style coin DD). Client-side gate like the Runner gate (bypassable by a technical user — data is public).
   enabled:false hides the tab, the seg button and the in-app Gold alerts; the server feed (tools/gold.py) keeps running. */
window.KYVO_GOLD_CONFIG = {
  enabled: true,
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
  var owner = false;
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
  window.KyvoPremiumReady = Promise.all([sha(tokUrl), sha(stored)]).then(function (r) {
    var en = false; try { en = localStorage.getItem('kyvo_lang') === 'en'; } catch (e) {}
    if (tokUrl && r[0] === KYVO_OWNER_SHA256) {
      owner = true;
      try { localStorage.setItem('kyvo_owner_tok', tokUrl); } catch (e) {}
      toast(en ? '🏃 Runners plan active (owner)' : '🏃 Plan Runners aktywny (właściciel)');
    } else if (tokUrl) toast(en ? 'Invalid owner link' : 'Nieprawidłowy link właściciela');
    if (!owner && stored && r[1] === KYVO_OWNER_SHA256) owner = true;
    if (!owner && freeHour()) toast(en ? '🎁 Premium free until ' + freeLabel() : '🎁 Premium za darmo do ' + freeLabel());
    if (owner) {
      try { window.dispatchEvent(new CustomEvent('kyvo-premium-change', { detail: { owner: true } })); } catch (e) {}
      // OneSignal tag premium=1 (only works once push was enabled on this device; notify.js also re-syncs on opt-in)
      setTimeout(function () { try { if (window.KyvoPush && window.KyvoPush.syncTags) window.KyvoPush.syncTags(); } catch (e) {} }, 4000);
    }
    return owner;
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
    if (owner) return 'runners';
    if (freeHour()) return 'runners';
    return paidTier();
  }
  function paidTier() {
    if (owner) return 'runners';
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
    paidTier: paidTier,
    isFreeHour: function () { return !owner && freeHour(); },   // v8.22: free launch week (owner keeps the 'owner' label)
    freeUntil: FREE_UNTIL,
    freeLabel: freeLabel,
  };
})();
