/* Kyvo v8.4 — the ONE service worker for scope the app folder (/ on kyvo-app.github.io) when push is on:
   OneSignal Web SDK v16 worker (background push) + the app's sw.js (offline cache, notification clicks). */
self.KYVO_ONESIGNAL = true;
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
importScripts('sw.js');
