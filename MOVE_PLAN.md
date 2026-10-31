# Przeprowadzka Kyvo v8.25 → https://kyvo-app.github.io/ (robi Alez, krok po kroku)

Pliki:
- `kyvo_v8_25_deploy.tar.gz` to nowe repo **kyvo-app/kyvo-app.github.io**, razem z `.github/workflows`.
- `kyvo_old_redirect_v825.tar.gz` to stub dla starego repo **alezrugla-max/kyvo-demo-**.

Kolejność jest ważna. Najpierw zatrzymujesz starą pętlę, dopiero potem włączasz nową. Inaczej dwie pętle wysyłają te same pushe i posty na Discordzie.

## 0. Zanim zaczniesz (5 min)
Przygotuj wartości sekretów. GitHub nie pokazuje istniejących sekretów, więc trzeba je skopiować ze źródła:
- **OneSignal:** Dashboard → Settings → Keys & IDs → REST API Key (w razie potrzeby wygeneruj nowy).
- **Discord:** Server Settings → Integrations → Webhooks → każdy webhook → Copy Webhook URL.

## 1. Zatrzymaj stare repo (alezrugla-max/kyvo-demo-)
1. Settings → Secrets and variables → Actions → **Variables**: ustaw `KYVO_LOOP_CHAIN` = `0`. Pętla przestaje się wtedy sama kolejkować.
2. W zakładce Actions wyłącz workflowy **kyvo-push**, **kyvo-calls** i **kyvo-leaderboard** (każdy po kolei → „…” → *Disable workflow*).
3. W zakładce Actions anuluj (*Cancel run*) trwający lub oczekujący run **kyvo-push**. Bez tego jeden run może jeszcze działać do ok. 51 minut.
4. Pobierz najświeższe dane ze starego repo (Code → plik → Download raw), bo pętla dopisywała je aż do zatrzymania:
   - `data/track_record.json`
   - `data/flag_history.json`, jeśli już istnieje
   - `data/early_shadow.json`

   Wrzucisz je do nowego repo w kroku 2.3. Bez tego Wyniki stracą flagi z ostatnich godzin.

## 2. Nowe repo kyvo-app/kyvo-app.github.io (organizacja kyvo-app)
1. Utwórz repo **Public** o nazwie dokładnie `kyvo-app.github.io`, gałąź `main`.
2. Rozpakuj `kyvo_v8_25_deploy.tar.gz` i wrzuć całość (z `.github/`, `.nojekyll` i `data/`), np.:
   `git init && git add . && git commit -m "Kyvo v8.25" && git branch -M main && git remote add origin https://github.com/kyvo-app/kyvo-app.github.io.git && git push -u origin main`
3. Podmień pliki `data/` na te pobrane w kroku 1.4 i zrób commit.
4. **Secrets** (Settings → Secrets and variables → Actions → *New repository secret*). Odtwórz te same nazwy:
   - `ONESIGNAL_REST_API_KEY`
   - `DISCORD_WEBHOOK_SOL`
   - `DISCORD_WEBHOOK_BSC`
   - `DISCORD_WEBHOOK_NEWS`
   - `DISCORD_WEBHOOK_YT`
   - `DISCORD_WEBHOOK_ANNOUNCE`

   `GITHUB_TOKEN` jest wbudowany i nie trzeba go tworzyć.
5. **Variables**, wszystkie opcjonalne:
   - `KYVO_LOOP_CHAIN` = `1`, czyli dowolna wartość różna od `0`. Brak zmiennej też oznacza, że pętla działa.
   - `RUNNER_PUSH_SOURCE` = `github`, co jest domyślne. `worker` ustawiasz dopiero po wdrożeniu workera Cloudflare.
   - `KYVO_WORKER_FLAGS_URL`: zostaw puste, dopóki worker nie działa.
   - `KYVO_APP_URL`: zostaw puste. Domyślnie jest `https://kyvo-app.github.io/`.
6. Settings → Actions → General → Workflow permissions: **Read and write permissions**. Workflowy commitują dane i kolejkują następny run.
7. Settings → **Pages** → Source: *Deploy from a branch* → `main` / `/ (root)` → Save. Po 1–3 minutach sprawdź https://kyvo-app.github.io/ (stopka „Kyvo v8.25”).

## 3. OneSignal (to samo App ID a5a8f0d3-…)
1. Dashboard → Settings → Push & In-App → **Web** → Typical site:
   - Site URL: `https://kyvo-app.github.io`
   - Auto resubscribe: ON
   - Service worker path: `/`, scope: `/`, nazwy plików `OneSignalSDKWorker.js` i `OneSignalSDKUpdaterWorker.js` (już są w katalogu głównym)
   - Save
2. OneSignal obsługuje **jeden adres strony na aplikację**. Subskrypcje zrobione na starym adresie przestaną działać najpóźniej wtedy, gdy ktoś otworzy starą ikonę, bo stub usuwa stary service worker. **Każdy użytkownik musi ponownie dodać apkę do ekranu głównego i włączyć powiadomienia**. Mówi o tym komunikat na starej stronie. Warto to też ogłosić na Discordzie.
3. Kod nie zawiera adresu na sztywno: `push-config.js` liczy ścieżkę workera z adresu strony.

## 4. Logowanie (Supabase / Google / Firebase)
- **Supabase** (projekt bvszmqmfwtwedceqeymi) → Authentication → URL Configuration:
  - Site URL: `https://kyvo-app.github.io/`
  - Redirect URLs: `https://kyvo-app.github.io/**`
  - Stary adres możesz na chwilę zostawić.
- **Google** (konsola na kyvoappnoti@gmail.com): pełne kroki są w `GOOGLE_LOGIN_SETUP.md`.
  - JS origin: `https://kyvo-app.github.io`
  - Authorized domains: `kyvo-app.github.io` i `supabase.co`
  - Redirect URI: `https://bvszmqmfwtwedceqeymi.supabase.co/auth/v1/callback`
  - Na koniec ustaw `google.enabled: true` w `auth-config.js`.
- **Firebase** jest nieużywany od v8.25. Jeśli kiedyś wróci, dodaj `kyvo-app.github.io` w Authentication → Settings → Authorized domains.
- **Phantom** nie wymaga zmian. Link powrotny liczy się z adresu strony.
- Uwaga: sesje logowania i ustawienia (localStorage) **nie przechodzą** na nowy adres, bo to inne origin. Każdy loguje się ponownie, a lokalne „📱 tylko ten telefon” wyniki zostają na starej ikonie.

## 5. Uruchom nową pętlę
1. Odczekaj **co najmniej 20–30 minut** od zatrzymania starej pętli (krok 1).
   - Nowe repo startuje z pustym stanem (actions/cache nie przechodzi między repo).
   - Pierwszy run push tylko „seeduje”, ale elementy młodsze niż 20 minut mógłby wysłać drugi raz.
   - Stan Discorda też startuje od zera. Coin wrzucony przez stare repo w ostatnich 3 dniach może zostać wrzucony ponownie, jeśli nadal spełnia warunki.
2. Actions → **kyvo-push** → *Run workflow*. Najpierw możesz zaznaczyć `dry_run`, potem zwykły run.
3. Actions → **kyvo-calls** i **kyvo-leaderboard** → *Run workflow* raz ręcznie. Dalej uruchamia je cron.
4. W logu kyvo-push sprawdź:
   - `first run: seeded … nothing sent`
   - `runner prefilter … (cap 15)`
   - commit `data/track_record.json`

## 6. Stare repo → przekierowanie
1. Rozpakuj `kyvo_old_redirect_v825.tar.gz` i zastąp **całą** zawartość starego repo. Usuń wszystkie stare pliki, łącznie z `.github/workflows`, a potem commit i push na `main`. Pages zostaje włączone.
2. Sprawdź:
   - `https://alezrugla-max.github.io/kyvo-demo-/#coin/solana%3Atest` przenosi na `https://kyvo-app.github.io/#coin/solana%3Atest`
   - `…/kyvo-demo-/privacy.html` przenosi na nową stronę `privacy.html`
3. Stare linki z Discorda i stare pushe dalej działają, bo hash i ścieżka są zachowane.

## 7. Worker Cloudflare (opcjonalnie, później)
Kroki są w `kyvo_cf_worker/README.md`. Najpierw wdrażasz workera i ustawiasz `KYVO_WORKER_FLAGS_URL`. Dopiero potem przestawiasz `RUNNER_PUSH_SOURCE=worker` po obu stronach.
