/* Kyvo — login configuration (public, no secrets).
   v8.25 Google sign-in = Supabase Auth (free project in the EU, Frankfurt). The project URL and the publishable/anon key
   are PUBLIC by design (they only identify the project; Google's client secret lives in the Supabase dashboard, never here).
   The Google button stays "Wkrótce" until google.enabled is true. Turn it on only AFTER the dashboard steps in
   GOOGLE_LOGIN_SETUP.md (Google provider enabled in Supabase + OAuth client + redirect URLs), otherwise the button would
   open a broken page. Never put a service_role / sb_secret_ key here. */
window.KYVO_AUTH_CONFIG = {
  wallet: { enabled: true },            // Phantom / Solflare / MetaMask — message signing only, works now
  supabase: {
    url: 'https://bvszmqmfwtwedceqeymi.supabase.co',
    anonKey: 'sb_publishable_o2EgvYEii1clHpAnCO3EpQ_U87vJnnv',   // publishable key (public)
  },
  google: { enabled: false, provider: 'supabase' },   // v8.25: flip to true after GOOGLE_LOGIN_SETUP.md
  // legacy Firebase (e-mail link) — placeholders, unused
  firebase: {
    apiKey: 'PASTE_FIREBASE_API_KEY',
    authDomain: 'PASTE_PROJECT_ID.firebaseapp.com',
    projectId: 'PASTE_PROJECT_ID',
    appId: 'PASTE_FIREBASE_APP_ID',
  },
  sdkVersion: '10.14.1',
  email: { enabled: false },            // shown as "Wkrótce"
  apple: { enabled: false },            // shown as "Wkrótce"
};
