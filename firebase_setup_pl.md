# Kyvo — włączenie logowania Google i e-mail (Firebase) — krok po kroku

Zajmie ok. 15 minut. Potrzebujesz tylko swojego konta Google. Firebase Authentication jest darmowy przy małej skali (wysyłka maili z linkiem logowania ma dzienny limit w darmowym planie — sprawdź aktualny limit w konsoli).

> Uwaga: Firebase dla osób poniżej 18 lat — sprawdź warunki Google; najbezpieczniej, żeby projekt założył rodzic / opiekun na swoim koncie albo żeby był współwłaścicielem projektu.

## 1. Utwórz projekt
1. Wejdź na https://console.firebase.google.com i zaloguj się kontem Google.
2. Kliknij **Dodaj projekt** (Add project) → nazwa np. `kyvo-app` → **Dalej**.
3. Google Analytics: **wyłącz** (Kyvo nie używa analityki) → **Utwórz projekt**.

## 2. Włącz logowanie Google
1. Menu po lewej: **Build → Authentication** → **Rozpocznij** (Get started).
2. Zakładka **Sign-in method** → **Google** → przełącz **Włącz** (Enable).
3. Wpisz „Public-facing name”: `Kyvo`, wybierz swój e-mail wsparcia → **Zapisz**.

## 3. Włącz logowanie e-mailem (link, bez hasła)
1. Ta sama zakładka **Sign-in method** → **Dodaj nowego dostawcę** → **E-mail/hasło** (Email/Password).
2. Włącz **E-mail/hasło** ORAZ **Link w e-mailu (logowanie bez hasła)** (Email link — passwordless sign-in) → **Zapisz**.
3. (Opcjonalnie) **Authentication → Templates** → szablon maila z linkiem: ustaw nazwę nadawcy `Kyvo` i język polski.

## 4. Dodaj domenę Kyvo jako autoryzowaną
1. **Authentication → Settings → Authorized domains** (Autoryzowane domeny) → **Dodaj domenę**.
2. Wpisz: `kyvo-app.github.io` → **Dodaj**.
   (Jeśli kiedyś będzie własna domena, np. `kyvo.app`, dodaj ją tu też.)

## 5. Zarejestruj aplikację web i skopiuj konfigurację
1. Kliknij ⚙️ obok **Project Overview** → **Ustawienia projektu** (Project settings).
2. Na dole **Twoje aplikacje** → ikona **</>** (Web) → nazwa `Kyvo web` → **NIE** zaznaczaj Firebase Hosting → **Zarejestruj aplikację**.
3. Pokaże się kod z `const firebaseConfig = { ... }`. Skopiuj 4 wartości:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `appId`
4. Wyślij mi te 4 wartości (to **nie są** sekrety — konfiguracja web Firebase jest publiczna z założenia, bezpieczeństwo zapewniają autoryzowane domeny i reguły). **Nie wysyłaj** żadnych haseł, plików „service account” ani kluczy prywatnych.

## 6. Co zrobię ja
W pliku `auth-config.js` wkleję te wartości i ustawię:
```js
google: { enabled: true },
email:  { enabled: true },
```
Przyciski „Google” i „E-mail” na ekranie logowania przestaną mieć „Wkrótce”. Apple zostaje „Wkrótce” (wymaga płatnego konta Apple Developer, 99 USD/rok).

## 7. Ważne (RODO)
Gdy logowanie Google/e-mail jest włączone, właściciel projektu Firebase staje się **administratorem danych** (imię, e-mail, zdjęcie, identyfikator konta). Trzeba wtedy: mieć aktualną Politykę prywatności (jest w Kyvo, do sprawdzenia przez prawnika), podać kontakt, umożliwić usunięcie konta (jest: Profil → „Usuń konto Kyvo”) i nie używać danych do innych celów.
