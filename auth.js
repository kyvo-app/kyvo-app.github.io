/* Kyvo v8.2 — sign-in. Wallet sign-in = the user SIGNS a readable text message (never a transaction),
   verified locally (ed25519 / secp256k1 ecrecover via vendor/kyvo-crypto). Session lives only in localStorage.
   v8.25: Google sign-in = Supabase Auth (EU), plain fetch, no SDK; off until auth-config.js google.enabled = true
   (after GOOGLE_LOGIN_SETUP.md). Firebase stays as a legacy option (google.provider = 'firebase').
   v8.25: Phantom on a phone without the in-app browser = Phantom deeplinks (connect + signMessage, payloads encrypted
   with an EPHEMERAL x25519 key — not a wallet key). Only a text message is signed: never a transaction, never a seed
   or private key. iPhone home-screen app: Phantom returns to Safari, so Safari shows a 15-min sign-in code
   ("KYVO1.…", only the signed message) that the home-screen app accepts via "Wklej logowanie z Safari". */
(function () {
  'use strict';
  const SKEY = 'kyvo_session_v1';
  const SEEN = 'kyvo_login_seen_v8';
  const CFG = window.KYVO_AUTH_CONFIG || { wallet: { enabled: true }, google: { enabled: false }, apple: { enabled: false } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const short = (a) => (a ? a.slice(0, 4) + '…' + a.slice(-4) : '');
  const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const toast = (t) => setTimeout(() => (window.__kyvoToast ? window.__kyvoToast(t) : console.log(t)), 0);
  const enc = (s) => new TextEncoder().encode(s);
  const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');
  const listeners = [];

  const EMAIL_KEY = 'kyvo_email_for_signin';
  function fbConfigured() {
    const f = CFG.firebase || {};
    return !!(f.apiKey && !/PASTE_/.test(f.apiKey) && f.authDomain && !/PASTE_/.test(f.authDomain) && f.projectId && !/PASTE_/.test(f.projectId) && f.appId && !/PASTE_/.test(f.appId));
  }
  function sbConfigured() {
    const b = CFG.supabase || {};
    return !!(b.url && /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(b.url) && b.anonKey && !/PASTE_/.test(b.anonKey) && !/service_role|sb_secret_/.test(b.anonKey));
  }
  const gViaSb = () => !(CFG.google && CFG.google.provider === 'firebase');
  function googleReady() { return !!(CFG.google && CFG.google.enabled && (gViaSb() ? sbConfigured() : fbConfigured())); }
  function emailReady() { return !!(CFG.email && CFG.email.enabled && fbConfigured()); }

  /* ---------------- session ---------------- */
  function read() {
    try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { return null; }
  }
  function verifySession(s) {
    if (!s || !s.method) return false;
    if (s.method === 'google' || s.method === 'email') return !!s.uid;
    const K = window.KyvoCrypto;
    if (!K || !s.message || !s.signature || !s.address) return false;
    if (s.message.indexOf(s.address) < 0) return false;
    try { return s.method === 'solana' ? K.verifySolana(s.message, s.signature, s.address) : K.verifyEvm(s.message, s.signature, s.address); } catch (e) { return false; }
  }
  let cache;
  function session() {
    if (cache !== undefined) return cache;
    const s = read();
    cache = verifySession(s) ? s : null;
    if (s && !cache) { try { localStorage.removeItem(SKEY); } catch (e) {} }
    return cache;
  }
  function save(s) {
    cache = s;
    try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); } catch (e) {}
    try { localStorage.setItem(SEEN, '1'); } catch (e) {}
    listeners.forEach((f) => { try { f(s); } catch (e) {} });
  }
  async function logout() {
    const s = session();
    if (s && s.method === 'google' && s.provider === 'supabase') await sbLogout(s);
    else if (s && (s.method === 'google' || s.method === 'email') && fb.auth) { try { await fb.mod.signOut(fb.auth); } catch (e) {} }
    try { if (s && s.method === 'solana' && s.wallet === 'phantom' && window.phantom && window.phantom.solana) await window.phantom.solana.disconnect(); } catch (e) {}
    save(null);
    toast('Wylogowano');
  }
  function addToProfile(chain, address) {
    const P = window.KyvoProfile;
    if (!P || !P.own) return;
    const o = P.own();
    const want = chain === 'solana' ? ['solana'] : ['bsc', 'robinhood'];
    for (const ch of want) {
      if (o.wallets.some((w) => w.chain === ch && w.address.toLowerCase() === address.toLowerCase())) continue;
      if (o.wallets.length >= (P.MAX_WALLETS || 8)) break;
      o.wallets.push({ chain: ch, address });
    }
    P.saveOwn(o);
  }
  function buildMessage(address, chainLabel) {
    const nonce = window.KyvoCrypto ? window.KyvoCrypto.randomNonce() : String(Math.random()).slice(2);
    return [
      'Logowanie do Kyvo.',
      'To nie jest transakcja i nic nie kosztuje.',
      '',
      'Adres: ' + address,
      'Sieć: ' + chainLabel,
      'Strona: ' + location.host,
      'Nonce: ' + nonce,
      'Czas: ' + new Date().toISOString(),
    ].join('\n');
  }

  /* ---------------- wallets ---------------- */
  const appUrl = () => location.origin + location.pathname;
  function deepLink(kind) {
    const url = appUrl() + '#login';
    if (kind === 'phantom') return 'https://phantom.app/ul/browse/' + encodeURIComponent(url) + '?ref=' + encodeURIComponent(location.origin);
    if (kind === 'solflare') return 'https://solflare.com/ul/v1/browse/' + encodeURIComponent(url) + '?ref=' + encodeURIComponent(location.origin);
    if (kind === 'metamask') return 'https://metamask.app.link/dapp/' + (location.host + location.pathname);
    return url;
  }
  const INSTALL = { phantom: 'https://phantom.app/download', solflare: 'https://solflare.com/download', metamask: 'https://metamask.io/download/' };
  function solProvider(kind) {
    if (kind === 'phantom') { const p = (window.phantom && window.phantom.solana) || (window.solana && window.solana.isPhantom ? window.solana : null); return p || null; }
    if (kind === 'solflare') return window.solflare && window.solflare.isSolflare ? window.solflare : null;
    return null;
  }
  function evmProvider() {
    const e = window.ethereum;
    if (!e) return null;
    if (Array.isArray(e.providers) && e.providers.length) return e.providers.find((p) => p.isMetaMask) || e.providers[0];
    return e;
  }
  function missing(kind) {
    if (isMobile() && kind === 'phantom' && window.KyvoCrypto && window.KyvoCrypto.boxKeyPair) { PL.connect(); return; }   // v8.25: Phantom app, back to Kyvo
    if (isMobile()) { location.href = deepLink(kind); return; }
    const names = { phantom: 'Phantom', solflare: 'Solflare', metamask: 'MetaMask' };
    status(`Nie widzę portfela ${names[kind]} w tej przeglądarce. <a href="${INSTALL[kind]}" target="_blank" rel="noopener noreferrer">Zainstaluj ${names[kind]} ↗</a> albo wybierz inny sposób.`, 'warn');
  }
  async function loginSolana(kind) {
    const p = solProvider(kind);
    if (!p) return missing(kind);
    status('Połącz portfel i podpisz wiadomość w aplikacji portfela…');
    const r = await p.connect();
    const pk = String((r && r.publicKey) || p.publicKey || '');
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pk)) throw new Error('Portfel nie zwrócił adresu.');
    const msg = buildMessage(pk, 'Solana');
    if (typeof p.signMessage !== 'function') throw new Error('Ten portfel nie obsługuje podpisywania wiadomości.');
    const res = await p.signMessage(enc(msg), 'utf8');
    const sig = res && res.signature ? res.signature : res;
    const sigU8 = sig instanceof Uint8Array ? sig : Uint8Array.from(sig && sig.data ? sig.data : sig || []);
    if (!window.KyvoCrypto.verifySolana(msg, sigU8, pk)) throw new Error('Podpis się nie zgadza — spróbuj ponownie.');
    const s = { v: 1, method: 'solana', wallet: kind, chain: 'solana', address: pk, message: msg, signature: hex(sigU8), signedAt: new Date().toISOString() };
    addToProfile('solana', pk);
    save(s);
    return s;
  }
  async function loginEvm() {
    const p = evmProvider();
    if (!p) return missing('metamask');
    status('Połącz portfel i podpisz wiadomość w aplikacji portfela…');
    const accs = await p.request({ method: 'eth_requestAccounts' });
    const addr = String((accs && accs[0]) || '');
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) throw new Error('Portfel nie zwrócił adresu.');
    const msg = buildMessage(addr, 'BSC / Robinhood Chain (EVM)');
    const sig = await p.request({ method: 'personal_sign', params: ['0x' + hex(enc(msg)), addr] });
    if (!window.KyvoCrypto.verifyEvm(msg, sig, addr)) throw new Error('Podpis się nie zgadza — spróbuj ponownie.');
    const name = p.isMetaMask ? 'metamask' : p.isRabby ? 'rabby' : p.isCoinbaseWallet ? 'coinbase' : p.isTrust ? 'trust' : 'evm';
    const s = { v: 1, method: 'evm', wallet: name, chain: 'evm', address: addr.toLowerCase(), message: msg, signature: sig, signedAt: new Date().toISOString() };
    s.message = msg; // message contains the checksum/original case; verify uses case-insensitive compare
    s.address = addr;
    addToProfile('evm', addr);
    save(s);
    return s;
  }

  /* ---------------- Google (Firebase Auth) — off until configured ---------------- */
  const fb = { auth: null, mod: null };
  async function fbInit() {
    if (fb.auth) return fb;
    const v = CFG.sdkVersion || '10.14.1';
    const base = 'https://www.gstatic.com/firebasejs/' + v + '/';
    const appMod = await import(base + 'firebase-app.js');
    const authMod = await import(base + 'firebase-auth.js');
    const app = appMod.initializeApp(CFG.firebase);
    fb.auth = authMod.getAuth(app);
    fb.mod = authMod;
    try { await authMod.setPersistence(fb.auth, authMod.browserLocalPersistence); } catch (e) {}
    return fb;
  }
  function fromUser(u, method) {
    return { v: 1, method: method || 'google', uid: u.uid, name: u.displayName || '', email: u.email || '', photo: u.photoURL || '', signedAt: new Date().toISOString() };
  }
  async function loginGoogle() {
    if (!googleReady()) { status('Logowanie przez Google będzie dostępne wkrótce.', 'warn'); return; }
    if (gViaSb()) return sbLoginGoogle();
    const { auth, mod } = await fbInit();
    const prov = new mod.GoogleAuthProvider();
    prov.setCustomParameters({ prompt: 'select_account' });
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    let r;
    if (standalone) { await mod.signInWithRedirect(auth, prov); return; }
    try { r = await mod.signInWithPopup(auth, prov); } catch (e) {
      if (/popup/.test(String(e && e.code))) { await mod.signInWithRedirect(auth, prov); return; }
      throw e;
    }
    const s = fromUser(r.user);
    save(s);
    return s;
  }
  async function googleOnLoad() {
    if (googleReady() && gViaSb()) { await sbOnLoad(); if (!emailReady()) return; }
    if (!(googleReady() && !gViaSb()) && !emailReady()) return;
    try {
      const { auth, mod } = await fbInit();
      if (emailReady() && mod.isSignInWithEmailLink(auth, location.href)) {
        let email = '';
        try { email = localStorage.getItem(EMAIL_KEY) || ''; } catch (e) {}
        if (!email) email = prompt(window.KyvoI18n ? window.KyvoI18n.t('Podaj e-mail, na który wysłaliśmy link logowania:') : 'Podaj e-mail, na który wysłaliśmy link logowania:') || '';
        if (email) {
          const r = await mod.signInWithEmailLink(auth, email.trim(), location.href);
          try { localStorage.removeItem(EMAIL_KEY); } catch (e) {}
          history.replaceState(null, '', location.pathname + '#profil');
          save(fromUser(r.user, 'email'));
          toast('Zalogowano e-mailem'); setTimeout(() => window.KyvoLaunch && window.KyvoLaunch.maybePremiumPopup && window.KyvoLaunch.maybePremiumPopup(), 900);
        }
        return;
      }
      if (googleReady() && !gViaSb()) {
        const r = await mod.getRedirectResult(auth);
        if (r && r.user) { save(fromUser(r.user)); toast('Zalogowano przez Google'); setTimeout(() => window.KyvoLaunch && window.KyvoLaunch.maybePremiumPopup && window.KyvoLaunch.maybePremiumPopup(), 900); }
      }
    } catch (e) { toast('Logowanie nie powiodło się — link mógł wygasnąć. Spróbuj ponownie.'); }
  }
  /* e-mail: Firebase passwordless "email link" — we send a one-time sign-in link, the user taps it */
  async function sendEmailLink(email) {
    if (!emailReady()) { status('Logowanie e-mailem będzie dostępne wkrótce.', 'warn'); return; }
    email = String(email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { status('Wpisz poprawny adres e-mail.', 'err'); return; }
    const { auth, mod } = await fbInit();
    await mod.sendSignInLinkToEmail(auth, email, { url: appUrl() + '#login', handleCodeInApp: true });
    try { localStorage.setItem(EMAIL_KEY, email); } catch (e) {}
    status(`Wysłaliśmy link logowania na <b>${esc(email)}</b>. Otwórz maila na tym urządzeniu i kliknij link (sprawdź też spam).`, 'ok');
  }
  async function deleteGoogleAccount() {
    const s = session();
    if (!s || (s.method !== 'google' && s.method !== 'email')) return;
    if (s.provider === 'supabase') {   // v8.25: no client-side delete in Supabase (needs a server key) -> sign out + ask us to delete
      const q = 'Wylogujemy Cię na tym urządzeniu. Żeby całkowicie usunąć konto Google w Kyvo, napisz do nas (Polityka prywatności → Kontakt) — usuniemy je w ciągu 30 dni. Kontynuować?';
      if (!confirm(window.KyvoI18n ? window.KyvoI18n.t(q) : q)) return;
      await logout(); return;
    }
    if (!confirm(window.KyvoI18n ? window.KyvoI18n.t('Usunąć konto Kyvo? Tej operacji nie da się cofnąć.') : 'Usunąć konto Kyvo? Tej operacji nie da się cofnąć.')) return;
    try { const { auth } = await fbInit(); if (auth.currentUser) await auth.currentUser.delete(); save(null); toast('Konto usunięte'); }
    catch (e) { toast('Zaloguj się ponownie i spróbuj jeszcze raz (wymóg bezpieczeństwa).'); }
  }


  /* ---------------- v8.25 Google via Supabase Auth (implicit OAuth, plain fetch) ---------------- */
  const SB_PENDING = 'kyvo_sb_pending';
  let sbTokens = null;
  function sbReturn() {   // runs synchronously at load, BEFORE app.js reads the hash
    const h = location.hash || '';
    const q = new URLSearchParams(location.search);
    if (/(^#|&)access_token=/.test(h)) {
      const p = new URLSearchParams(h.slice(1));
      sbTokens = { at: p.get('access_token'), exp: Date.now() + (+p.get('expires_in') || 3600) * 1000 };
      history.replaceState(null, '', location.pathname + '#profil');
    } else if (/(^#|&)error(_description)?=/.test(h) || (q.get('error') && q.get('error_description'))) {
      let pend = false; try { pend = !!localStorage.getItem(SB_PENDING); } catch (e) {}
      if (pend) { toast('Logowanie Google nie powiodło się — spróbuj ponownie.'); history.replaceState(null, '', location.pathname + '#login'); }
    }
  }
  function sbLoginGoogle() {
    const b = CFG.supabase;
    try { localStorage.setItem(SB_PENDING, String(Date.now())); } catch (e) {}
    status('Przekierowuję do Google…');
    location.href = b.url + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(appUrl());
  }
  async function sbOnLoad() {
    if (!sbTokens || !sbTokens.at) return;
    const b = CFG.supabase, tok = sbTokens; sbTokens = null;
    try { localStorage.removeItem(SB_PENDING); } catch (e) {}
    try {
      const r = await fetch(b.url + '/auth/v1/user', { headers: { apikey: b.anonKey, Authorization: 'Bearer ' + tok.at } });
      if (!r.ok) throw new Error('http ' + r.status);
      const u = await r.json(); const md = u.user_metadata || {};
      if (!u.id) throw new Error('no user');
      save({ v: 1, method: 'google', provider: 'supabase', uid: u.id, email: u.email || md.email || '', name: md.full_name || md.name || '', photo: md.avatar_url || md.picture || '', at: tok.at, exp: tok.exp, signedAt: new Date().toISOString() });
      toast('Zalogowano przez Google');
      if (window.__kyvoRerenderProfil) try { window.__kyvoRerenderProfil(); } catch (e) {}
      setTimeout(() => window.KyvoLaunch && window.KyvoLaunch.maybePremiumPopup && window.KyvoLaunch.maybePremiumPopup(), 900);
    } catch (e) { toast('Logowanie Google nie powiodło się — spróbuj ponownie.'); }
  }
  async function sbLogout(s) {
    const b = CFG.supabase || {};
    if (!s.at || !b.url) return;
    try { await fetch(b.url + '/auth/v1/logout', { method: 'POST', headers: { apikey: b.anonKey, Authorization: 'Bearer ' + s.at }, keepalive: true }); } catch (e) {}
  }

  /* ---------------- v8.25 Phantom deeplinks (phone without the Phantom in-app browser) ---------------- */
  const PL_KEY = 'kyvo_pl_v1';
  const PL_TTL = 15 * 60 * 1000;
  const standalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const b64u = (str) => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = (t) => decodeURIComponent(escape(atob(t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4))));
  const PL = {
    note: null,   // { kind: 'sign'|'code'|'msg', ... } shown on the login screen
    st() { try { const o = JSON.parse(localStorage.getItem(PL_KEY) || 'null'); return o && Date.now() - o.t < PL_TTL ? o : null; } catch (e) { return null; } },
    put(o) { try { o ? localStorage.setItem(PL_KEY, JSON.stringify(o)) : localStorage.removeItem(PL_KEY); } catch (e) {} },
    connect() {
      const K = window.KyvoCrypto, kp = K.boxKeyPair();
      const sk = K.b58encode(kp.secretKey), from = standalone() ? 'pwa' : 'web';
      this.put({ t: Date.now(), sk, from });
      // iPhone home-screen app: Phantom's reply opens in Safari (separate storage) -> the one-time key rides in the return link
      const back = appUrl() + '?pl=connect' + (from === 'pwa' ? '&pk=' + sk + '&from=pwa' : '');
      status('Otwieram Phantom… Zatwierdź połączenie, a Phantom wróci do Kyvo.');
      location.href = 'https://phantom.app/ul/v1/connect?app_url=' + encodeURIComponent(location.origin) + '&dapp_encryption_public_key=' + K.b58encode(kp.publicKey) +
        '&redirect_link=' + encodeURIComponent(back) + '&cluster=mainnet-beta';
    },
    sign() {
      const K = window.KyvoCrypto, o = this.st();
      if (!o || !o.session || !o.address) { this.put(null); this.note = { kind: 'msg', at: Date.now(), cls: 'warn', text: 'Logowanie wygasło — zacznij od nowa.' }; return false; }
      const msg = buildMessage(o.address, 'Solana');
      const shared = K.boxBefore(K.b58decode(o.phPk), K.b58decode(o.sk));
      const nonce = K.randomBytes(24);
      const payload = K.boxAfter(enc(JSON.stringify({ message: K.b58encode(enc(msg)), session: o.session, display: 'utf8' })), nonce, shared);
      o.msg = msg; o.t2 = Date.now(); this.put(o);
      location.href = 'https://phantom.app/ul/v1/signMessage?dapp_encryption_public_key=' + K.b58encode(K.boxKeyPairFromSecret(K.b58decode(o.sk)).publicKey) +
        '&nonce=' + K.b58encode(nonce) + '&redirect_link=' + encodeURIComponent(appUrl() + '?pl=sign') + '&payload=' + K.b58encode(payload);
      return true;
    },
    cancel() { this.put(null); this.note = null; },
    code() { try { const o = JSON.parse(sessionStorage.getItem(PL_KEY + '_code') || 'null'); return o && Date.now() - o.t < PL_TTL ? o.c : null; } catch (e) { return null; } },
    keepCode(c) { try { c ? sessionStorage.setItem(PL_KEY + '_code', JSON.stringify({ t: Date.now(), c })) : sessionStorage.removeItem(PL_KEY + '_code'); } catch (e) {} },
    open(o, q) {   // decrypt a Phantom reply with the shared key
      const K = window.KyvoCrypto;
      const shared = K.boxBefore(K.b58decode(o.phPk), K.b58decode(o.sk));
      const plain = K.boxOpenAfter(K.b58decode(q.get('data') || ''), K.b58decode(q.get('nonce') || ''), shared);
      if (!plain) throw new Error('Nie udało się odczytać odpowiedzi Phantom.');
      return JSON.parse(new TextDecoder().decode(plain));
    },
    onLoad() {   // synchronous, before app.js routes
      const q = new URLSearchParams(location.search);
      const mode = q.get('pl');
      if (mode !== 'connect' && mode !== 'sign') return;
      const clean = (hash) => history.replaceState(null, '', location.pathname + (hash || '#login'));
      const K = window.KyvoCrypto;
      try {
        if (!K || !K.boxBefore) throw new Error('Nie udało się odczytać odpowiedzi Phantom.');
        if (q.get('errorCode')) { this.put(null); this.note = { kind: 'msg', at: Date.now(), cls: 'warn', text: 'Anulowano w Phantom. Nic się nie stało.' }; clean(); return; }
        let o = this.st();
        if (mode === 'connect') {
          const pk = q.get('pk');
          if (!o && pk && /^[1-9A-HJ-NP-Za-km-z]{40,50}$/.test(pk)) o = { t: Date.now(), sk: pk, from: q.get('from') === 'pwa' ? 'pwa' : 'web' };   // opened in Safari from the home-screen app
          if (!o) { this.note = { kind: 'msg', at: Date.now(), cls: 'warn', text: 'Logowanie przez Phantom wygasło albo zaczęło się w innej przeglądarce — spróbuj ponownie.' }; clean(); return; }
          o.phPk = q.get('phantom_encryption_public_key') || '';
          const d = this.open(o, q);
          const addr = String(d.public_key || '');
          if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) throw new Error('Phantom nie zwrócił adresu.');
          o.address = addr; o.session = d.session; o.t = Date.now(); this.put(o);
          this.note = { kind: 'sign', address: addr };
          clean(); return;
        }
        // mode === 'sign'
        if (!o || !o.msg || !o.address) { this.put(null); this.note = { kind: 'msg', at: Date.now(), cls: 'warn', text: 'Brak danych logowania — zacznij od nowa.' }; clean(); return; }
        const d = this.open(o, q);
        const sig = K.b58decode(String(d.signature || ''));
        if (!K.verifySolana(o.msg, sig, o.address)) throw new Error('Podpis się nie zgadza.');
        const s = { v: 1, method: 'solana', wallet: 'phantom', via: 'deeplink', chain: 'solana', address: o.address, message: o.msg, signature: hex(sig), signedAt: new Date().toISOString() };
        this.put(null);
        addToProfile('solana', o.address);
        save(s);
        if (o.from === 'pwa' && !standalone()) { const c = handoffCode(s); this.keepCode(c); this.note = { kind: 'code', code: c }; clean('#login'); }
        else { this.note = null; toast('Zalogowano przez Phantom ✓'); clean('#profil'); }
      } catch (e) {
        this.put(null);
        this.note = { kind: 'msg', at: Date.now(), cls: 'err', text: String((e && e.message) || 'Nie udało się odczytać odpowiedzi Phantom.').slice(0, 160) };
        clean();
      }
    },
  };
  /* Safari -> home-screen app handoff: just the signed text message (no keys, no wallet access), valid 15 min, this site only */
  function handoffCode(s) { return 'KYVO1.' + b64u(JSON.stringify({ a: s.address, m: s.message, s: s.signature })); }
  function acceptHandoff(code) {
    const K = window.KyvoCrypto;
    code = String(code || '').trim().replace(/\s+/g, '');
    if (!/^KYVO1\.[A-Za-z0-9_-]+$/.test(code)) throw new Error('To nie jest kod logowania Kyvo.');
    let d; try { d = JSON.parse(unb64u(code.slice(6))); } catch (e) { throw new Error('To nie jest kod logowania Kyvo.'); }
    if (!d || typeof d.a !== 'string' || typeof d.m !== 'string' || typeof d.s !== 'string') throw new Error('To nie jest kod logowania Kyvo.');
    if (d.m.indexOf('Strona: ' + location.host + '\n') < 0) throw new Error('Kod jest z innej strony.');
    const tm = /Czas: (\S+)/.exec(d.m); const at = tm ? Date.parse(tm[1]) : NaN;
    if (!(Date.now() - at < PL_TTL && at - Date.now() < 5 * 60 * 1000)) throw new Error('Kod wygasł (ważny 15 min) — zaloguj się ponownie w Safari.');
    if (d.m.indexOf('Adres: ' + d.a + '\n') < 0 || !K.verifySolana(d.m, d.s, d.a)) throw new Error('Podpis się nie zgadza.');
    const s = { v: 1, method: 'solana', wallet: 'phantom', via: 'handoff', chain: 'solana', address: d.a, message: d.m, signature: d.s, signedAt: new Date().toISOString() };
    addToProfile('solana', d.a);
    save(s);
    return s;
  }
  try { sbReturn(); } catch (e) {}
  try { PL.onLoad(); } catch (e) {}

  /* ---------------- UI ---------------- */
  let statusEl = null;
  function status(html, kind) {
    if (!statusEl) return;
    statusEl.className = 'lgn-status' + (kind ? ' ' + kind : '');
    statusEl.innerHTML = html;
    statusEl.hidden = !html;
  }
  function errText(e) {
    const m = String((e && (e.message || e.code)) || e || '');
    if (/reject|denied|cancel|4001|user closed/i.test(m)) return 'Anulowano w portfelu. Nic się nie stało.';
    return 'Nie udało się zalogować: ' + esc(m.slice(0, 140));
  }
  function renderLogin(root, opts) {
    opts = opts || {};
    const s = session();
    const gOk = googleReady();
    const eOk = emailReady();
    root.innerHTML = `
      <div class="lgn">
        <div class="lgn-hero">
          <img src="icons/icon-192.png" width="84" height="84" alt="" class="lgn-logo">
          <h1>Zaloguj się do Kyvo</h1>
          <p>Smart money i viralowe memecoiny w jednym miejscu.</p>
          <p class="lgn-why">Logowanie zapisuje portfel na tym urządzeniu. Pełny dostęp włącza jednorazowy kod poniżej — Kyvo nie sprzedaje planów w aplikacji.</p>
        </div>
        ${s ? `<div class="lgn-status ok">Jesteś zalogowany: <b>${esc(s.uid ? s.email || s.name : short(s.address))}</b> · <a href="#profil">Profil →</a></div>` : ''}
        <div class="lgn-sec">Portfel <span class="mut">· podpisujesz tylko wiadomość</span></div>
        <div class="lgn-btns">
          <button type="button" class="lgn-btn" data-l="phantom"><span class="lgn-ic ic-phantom">👻</span><span><b>Phantom</b><small>Solana</small></span></button>
          <button type="button" class="lgn-btn" data-l="solflare"><span class="lgn-ic ic-solflare">☀️</span><span><b>Solflare</b><small>Solana</small></span></button>
          <button type="button" class="lgn-btn" data-l="metamask"><span class="lgn-ic ic-mm">🦊</span><span><b>MetaMask / portfel EVM</b><small>BSC · Robinhood Chain</small></span></button>
        </div>
        <div class="lgn-sec">Konto</div>
        <div class="lgn-btns">
          <button type="button" class="lgn-btn ${gOk ? '' : 'off'}" data-l="google" ${gOk ? '' : 'aria-disabled="true"'}><span class="lgn-ic ic-g">G</span><span><b>Google</b><small>${gOk ? 'Zaloguj kontem Google' : 'Wkrótce'}</small></span></button>
          <button type="button" class="lgn-btn ${eOk ? '' : 'off'}" data-l="email" ${eOk ? '' : 'aria-disabled="true"'}><span class="lgn-ic ic-mail">✉️</span><span><b>E-mail</b><small>${eOk ? 'Link logowania na maila — bez hasła' : 'Wkrótce'}</small></span></button>
          <div class="lgn-mail" id="lgnMail" hidden><input type="email" id="lgnEmail" placeholder="twoj@email.com" autocomplete="email" inputmode="email"><button type="button" class="pf-btn pf-share" id="lgnSend">Wyślij link</button></div>
          <button type="button" class="lgn-btn off" disabled aria-disabled="true"><span class="lgn-ic ic-apple">🍎</span><span><b>Apple</b><small>Wkrótce</small></span></button>
        </div>
        <div class="lgn-status" id="lgnStatus" hidden></div>
        ${plHtml()}
        ${standalone() && !s ? `<div class="lgn-btns"><button type="button" class="lgn-btn" id="lgnPasteBtn"><span class="lgn-ic">📋</span><span><b>📋 Wklej logowanie z Safari</b><small>Phantom · iPhone</small></span></button>
          <div class="lgn-mail" id="lgnPaste" hidden><textarea id="lgnCode" rows="3" placeholder="KYVO1.…" autocomplete="off" autocapitalize="off" spellcheck="false" style="width:100%;box-sizing:border-box"></textarea><button type="button" class="pf-btn pf-share" id="lgnCodeGo">Zaloguj</button></div></div>` : ''}
        <div id="lgnAccess"></div>
        <button type="button" class="lgn-guest" id="lgnGuest">Kontynuuj bez logowania</button>
        <div class="lgn-safe">🔒 Logowanie portfelem to tylko podpis wiadomości tekstowej — <b>to nie jest transakcja i nic nie kosztuje</b>. Kyvo nigdy nie prosi o seed phrase ani klucz prywatny i nie ma dostępu do Twoich środków. Bez logowania masz pełny dostęp do aplikacji.</div>
        <div class="lgn-legal">Logując się akceptujesz <a href="#legal/regulamin">Regulamin</a> i <a href="#legal/prywatnosc">Politykę prywatności</a>.</div>
      </div>`;
    statusEl = root.querySelector('#lgnStatus');
    if (PL.note && PL.note.kind === 'msg') { if (Date.now() - (PL.note.at || 0) < 20000) status(esc(PL.note.text), PL.note.cls); else PL.note = null; }   // survives the first-launch re-render
    const plSign = root.querySelector('#plSign'), plCancel = root.querySelector('#plCancel'), plCopy = root.querySelector('#plCopy');
    if (plSign) plSign.onclick = () => { if (!PL.sign()) renderLogin(root, opts); };
    if (plCancel) plCancel.onclick = () => { PL.cancel(); renderLogin(root, opts); };
    const plC = () => (PL.note && PL.note.code) || PL.code();
    if (plCopy) plCopy.onclick = async () => {
      const c = plC(); if (!c) return;
      try { await navigator.clipboard.writeText(c); toast('Skopiowano'); } catch (e) { const ta = root.querySelector('#plCodeTxt'); if (ta) { ta.select(); try { document.execCommand('copy'); toast('Skopiowano'); } catch (x) {} } }
    };
    const pb = root.querySelector('#lgnPasteBtn');
    if (pb) pb.onclick = () => { root.querySelector('#lgnPaste').hidden = false; root.querySelector('#lgnCode').focus(); };
    const pg = root.querySelector('#lgnCodeGo');
    if (pg) pg.onclick = () => { try { const sess = acceptHandoff(root.querySelector('#lgnCode').value); done(sess); } catch (e) { status(esc(e.message), 'err'); } };
    const pmPop = () => setTimeout(() => window.KyvoLaunch && window.KyvoLaunch.maybePremiumPopup && window.KyvoLaunch.maybePremiumPopup(), 700); // v8.2
    const done = (sess) => { if (sess) { toast('Zalogowano · ' + (sess.method === 'google' ? sess.name || 'Google' : short(sess.address))); (opts.onDone || (() => (location.hash = 'profil')))(sess); pmPop(); } };
    root.querySelectorAll('[data-l]').forEach((b) => (b.onclick = async () => {
      if (b.classList.contains('busy')) return;
      const k = b.dataset.l;
      b.classList.add('busy');
      try {
        if (k === 'phantom' || k === 'solflare') done(await loginSolana(k));
        else if (k === 'metamask') done(await loginEvm());
        else if (k === 'google') done(await loginGoogle());
        else if (k === 'email') {
          if (!eOk) status('Logowanie e-mailem będzie dostępne wkrótce.', 'warn');
          else { const m = root.querySelector('#lgnMail'); m.hidden = false; root.querySelector('#lgnEmail').focus(); }
        }
      } catch (e) { status(errText(e), 'err'); }
      finally { b.classList.remove('busy'); }
    }));
    const send = root.querySelector('#lgnSend');
    if (send) send.onclick = async () => { try { await sendEmailLink(root.querySelector('#lgnEmail').value); } catch (e) { status(errText(e), 'err'); } };
    const acc = root.querySelector('#lgnAccess');
    if (acc && window.KyvoPremium && window.KyvoPremium.formHtml) {
      const paintAcc = () => { if (!acc.isConnected) return; acc.innerHTML = window.KyvoPremium.formHtml(); window.KyvoPremium.wireAccess(acc); };
      if (window.KyvoPremiumReady) window.KyvoPremiumReady.then(paintAcc, paintAcc); else paintAcc();
    }
    root.querySelector('#lgnGuest').onclick = () => {
      try { localStorage.setItem(SEEN, '1'); } catch (e) {}
      (opts.onGuest || (() => (location.hash = 'pulse')))();
      pmPop();
    };
  }
  /* compact bar for Profil: avatar/nick + address + Wyloguj, or "Zaloguj się" */
  function renderBar(el) {
    if (!el) return;
    const s = session();
    const P = window.KyvoProfile;
    const o = P && P.own ? P.own() : {};
    if (!s) {
      el.innerHTML = `<div class="sbar"><div class="sbar-t"><b>Tryb gościa</b><small class="mut">Pełny dostęp · logowanie opcjonalne</small></div><a class="pf-btn pf-share sbar-btn" href="#login">Zaloguj się</a></div>`;
      return;
    }
    const av = s.uid && s.photo ? `<img class="pf-av" src="${esc(s.photo)}" style="width:36px;height:36px" alt="" referrerpolicy="no-referrer">` : P && P.avatarSpec ? P.avatarSpec(o.avatar, 36, o.nick || 'K') : '';
    const who = s.uid ? o.nick || s.name || s.email : o.nick || 'Zalogowano portfelem';
    const sub = s.uid ? (s.method === 'email' ? 'E-mail · ' : 'Google · ') + esc(s.email) : (s.method === 'solana' ? 'Solana · ' : 'EVM · ') + esc(short(s.address)) + ' · podpis ✓';
    el.innerHTML = `<div class="sbar">${av}<div class="sbar-t"><b>${esc(who)}</b><small class="mut">${sub}</small></div><button type="button" class="pf-btn sbar-btn" id="sbarOut">Wyloguj</button></div>
      ${s.uid ? '<button type="button" class="lnk-del" id="sbarDel">Usuń konto Kyvo</button>' : ''}`;
    el.querySelector('#sbarOut').onclick = async () => { await logout(); renderBar(el); if (window.__kyvoRerenderProfil) window.__kyvoRerenderProfil(); };
    const del = el.querySelector('#sbarDel');
    if (del) del.onclick = async () => { await deleteGoogleAccount(); renderBar(el); };
  }
  function plHtml() {
    let n = PL.note;
    if (!n || n.kind === 'msg') {   // derived from storage too, so it survives a reload / iOS dropping the page while Phantom is open
      const o = PL.st(), c = PL.code();
      if (o && o.session && o.address && !o.msg) n = { kind: 'sign', address: o.address };
      else if (c && session0()) n = { kind: 'code', code: c };
      else return '';
    }
    if (n.kind === 'sign') return `<div class="lgn-status ok">Połączono z Phantom: <b>${esc(short(n.address))}</b>. Teraz podpisz wiadomość (to nie transakcja).</div>
      <div class="lgn-btns"><button type="button" class="lgn-btn" id="plSign"><span class="lgn-ic ic-phantom">👻</span><span><b>👻 Podpisz w Phantom</b><small>Solana</small></span></button>
      <button type="button" class="lgn-guest" id="plCancel">Anuluj</button></div>`;
    if (n.kind === 'code') return `<div class="lgn-status ok">Zalogowano w Safari. Żeby zalogować też aplikację z ekranu głównego: skopiuj kod i w aplikacji Kyvo wybierz „Wklej logowanie z Safari”.</div>
      <div class="lgn-btns"><textarea id="plCodeTxt" rows="3" readonly style="width:100%;box-sizing:border-box;font-size:11px">${esc(n.code)}</textarea>
      <button type="button" class="pf-btn pf-share" id="plCopy">📋 Kopiuj kod logowania</button><small class="mut">Ważny 15 minut. To tylko podpisana wiadomość — nie daje dostępu do portfela.</small></div>`;
    return '';
  }
  const session0 = () => !!session();
  function shouldOfferLogin() {
    try { return !session() && !localStorage.getItem(SEEN); } catch (e) { return false; }
  }

  googleOnLoad();
  window.KyvoAuth = { session, logout, renderLogin, renderBar, shouldOfferLogin, onChange: (f) => listeners.push(f), googleReady, emailReady, deepLink, buildMessage, _verify: verifySession, _handoff: acceptHandoff, _handoffCode: handoffCode, _pl: PL };
})();
