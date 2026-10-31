/* Kyvo v8.4 — background push (app CLOSED) via OneSignal Web SDK v16.
   ENABLED (v8.4). v8.25 home = https://kyvo-app.github.io/ . OneSignal dashboard → Settings → Web: Typical site,
   Site URL https://kyvo-app.github.io , service worker path / (root), scope / , files OneSignalSDKWorker.js +
   OneSignalSDKUpdaterWorker.js (repo root). OneSignal allows ONE site origin per app (subscriptions on the old origin
   alezrugla-max.github.io stop receiving after the switch — users re-enable on the new address, see MOVE_PLAN.md).
   Those two files load OneSignal's v16 worker AND the app's sw.js (offline cache), so ONE service worker controls the
   app's folder (computed from the page address when swPath / swScope are empty). To switch push off: enabled:false (the app then registers plain sw.js again).
   Permission is asked only when the user taps "Włącz powiadomienia systemowe" in notification settings.
   Only PUBLIC identifiers belong here. NEVER put the OneSignal REST API key here — it goes to
   GitHub → Settings → Secrets and variables → Actions (ONESIGNAL_REST_KEY) for the sender.

   Free vs Premium cap for background push (server side):
   - Each subscriber gets tag premium=1|0 (set by the app on opt-in; later set from the payment backend,
     because a client-set tag can be faked).
   - The sender (GitHub Action) sends every alert to filter premium=1, and to premium=0 only while its
     own per-day counter (Europe/Warsaw day, stored in actions/cache like .kyvo_calls) is < 2 — all free users
     get the same broadcasts, so a global counter = max 2 per free user per day. The in-app cap
     (notify.js, localStorage kyvo_notif_cap_v1) also counts 2/day on the device.
   - Do not send between 22:00 and 6:30 Polish time unless the user opts in (OneSignal "intelligent delivery" off). */
window.KYVO_PUSH_CONFIG = {
  enabled: true,
  provider: 'onesignal',       // 'onesignal' (recommended) or 'fcm'
  swPath: '',                  // v8.25: '' = computed from the page address (root '/' on kyvo-app.github.io) -> address-agnostic
  swScope: '',
  onesignalAppId: 'a5a8f0d3-4c22-4d5b-8ace-5e94dc22ef5f', // PUBLIC App ID (safe to publish)
  freeDailyCap: 2,             // documented here; enforced in notify.js (device) and by the sender (server)
  fcm: {                       // public Firebase web config (only if provider === 'fcm')
    apiKey: '', authDomain: '', projectId: '', messagingSenderId: '', appId: '',
    vapidPublicKey: '',
  },
};
