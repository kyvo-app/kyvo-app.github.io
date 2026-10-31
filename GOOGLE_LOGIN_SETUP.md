# Logowanie Google w Kyvo (v8.25), czyli kroki w panelach

Kyvo loguje przez Google za pomocą **Supabase Auth**. To darmowy projekt `bvszmqmfwtwedceqeymi` w regionie Frankfurt (UE). Aplikacja używa zwykłego `fetch`, bez SDK.
Do repo trafiają tylko wartości publiczne: URL projektu i klucz publishable. **Client secret z Google wpisujesz wyłącznie w panelu Supabase.**
Do czasu przestawienia `google.enabled` na `true` w `auth-config.js` przycisk Google pokazuje „Wkrótce”.

Adres aplikacji: **https://kyvo-app.github.io/**. Callback Supabase: **https://bvszmqmfwtwedceqeymi.supabase.co/auth/v1/callback**

## 1. Google Cloud (konto kyvoappnoti@gmail.com, bez karty)
1. Wejdź na console.cloud.google.com i utwórz projekt `Kyvo`.
2. Przejdź do Google Auth Platform → Branding:
   - App name: `Kyvo`
   - support/contact email: kyvoappnoti@gmail.com
   - Home page: `https://kyvo-app.github.io/`
   - Privacy policy: `https://kyvo-app.github.io/privacy.html`
   - **Authorized domains:** `kyvo-app.github.io` i `supabase.co`
3. W zakładce Audience wybierz External, potem **Publish app**. W trybie Testing zalogują się tylko dodani testerzy.
4. W zakładce Data access zostaw tylko `openid`, `userinfo.email` i `userinfo.profile`.
5. Przejdź do Clients → Create client → **Web application**:
   - Authorized JavaScript origins: `https://kyvo-app.github.io`
   - Authorized redirect URIs: `https://bvszmqmfwtwedceqeymi.supabase.co/auth/v1/callback`

   Skopiuj Client ID i Client secret. Secret trafia tylko do kroku 2.

## 2. Supabase (supabase.com/dashboard → projekt bvszmqmfwtwedceqeymi)
1. Authentication → Sign In / Providers → **Google**: Enable. Wklej Client ID i Client secret, potem Save.
2. Authentication → **URL Configuration**:
   - Site URL: `https://kyvo-app.github.io/`
   - Redirect URLs: `https://kyvo-app.github.io/` i `https://kyvo-app.github.io/**`
   - Opcjonalnie, na czas przeprowadzki: `https://alezrugla-max.github.io/kyvo-demo-/**`
3. Darmowy projekt pauzuje po 7 dniach bez ruchu. Wtedy kliknij „Restore” w panelu.

## 3. Włączenie w kodzie
W `auth-config.js` ustaw `google: { enabled: true, provider: 'supabase' }`, podbij `?v=` i zrób deploy.
Test na telefonie: Google → wybór konta → powrót do Kyvo → Profil pokazuje e-mail → Wyloguj.

Na iPhonie zainstalowana apka (ekran główny) otwiera stronę Google w swoim oknie. Jeśli iOS przeniesie logowanie do Safari, zaloguj się tam albo w samej apce.
