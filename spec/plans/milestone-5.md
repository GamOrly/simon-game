# תוכנית – Milestone 5: PWA ו-Offline

> מבוסס על `MILESTONES.md` (Milestone 5), `ARCHITECTURE.md` §2.7, §2.9 ו-ADR-6 עד ADR-9, ADR-13, ו-`DESIGN.md` §2.4 (App Icon).
> ההחלטות הטכניות של ה-PWA כבר תועדו מראש ב-ADR-6 (עדכון ללא Reload), ADR-7 (אייקונים), ADR-8 (נתיב בסיס) ו-ADR-9 (`id` ושם). התוכנית מיישמת אותן ואינה מוסיפה יכולות.

## 1. מצב נוכחי (מהקוד)

- `vite.config.ts`: `base: '/simon-game/'`, React plugin בלבד, ללא PWA.
- `index.html`: `lang="he" dir="rtl"`, `theme-color` `#0A1628`, ללא Favicon או Manifest.
- אין תיקיית `public/`.
- `src/main.tsx`: טוען את Heebo (400/600/700) ואת ה-CSS, ללא רישום Service Worker.
- `.github/workflows/deploy.yml`: `npm ci` ← typecheck ← test ← build ← Pages. רץ בכל Push ל-`main`.
- צלילים נוצרים ב-Web Audio (Oscillators) – אין קובצי אודיו, ולכן אין מה להוסיף ל-Cache עבורם.
- צבעי המשחק (`tokens.css`): ירוק `#00D26A`, אדום `#FF3B30`, צהוב `#FFD600`, כחול `#00A3FF`; רקע `#0A1628`.

## 2. תלויות חדשות (devDependencies)

| חבילה | גרסה | תפקיד |
|---|---|---|
| `vite-plugin-pwa` | `^2.0.0` (תומך ב-Vite 8) | Manifest, Service Worker (`generateSW`), Precache |
| `workbox-window` | `^7.4.1` | Peer dependency של `virtual:pwa-register` |
| `@vite-pwa/assets-generator` | `^2.0.0` | יצירת קובצי ה-PNG וה-Favicon מה-SVG (מורץ ידנית בלבד, ADR-7) |

## 3. קבצים ליצור / לשנות

### 3.1 אייקון (ADR-7, DESIGN §2.4)

- **`public/icon.svg`** (חדש) – נכתב ידנית, `viewBox="0 0 512 512"`:
  - רקע מלא `#0A1628` (ללא שקיפות, כדי שיתאים גם ל-Maskable ול-iOS).
  - לוח עגול בקוטר ~78% מהקנבס (רדיוס ~200, ממורכז) – בתוך ה-Safe Zone של Maskable (עיגול 80%).
  - ארבעה רבעים בסידור הלוח: ירוק למעלה-שמאל, אדום למעלה-ימין, צהוב למטה-שמאל, כחול למטה-ימין, עם פסי הפרדה כהים (`#0F0F0F`) בין הרבעים.
  - דיסק מרכזי כהה (`#0F0F0F`/`#12213A`), **ללא טקסט**.
- **`pwa-assets.config.ts`** (חדש, בשורש) – Preset `minimal-2023` של `@vite-pwa/assets-generator`, מקור `public/icon.svg`, רקע Maskable/Apple `#0A1628`.
- **`package.json`** – סקריפט `"generate-pwa-assets": "pwa-assets-generator"`.
- הרצה חד-פעמית של הסקריפט, שמייצרת ל-`public/`: `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`. הקבצים נשמרים ב-Repository; ה-CI אינו מריץ את הכלי.
- בדיקה חזותית של התוצאה (פתיחת ה-PNG) – הלוח מלא, לא חתוך, הצבעים במיקום הנכון.

### 3.2 `index.html`

- הוספת קישורים (נתיבים מוחלטים ל-`public/`; Vite מוסיף להם את ה-`base` ב-Build – לוודא בתוצר):
  - `<link rel="icon" href="/favicon.ico" sizes="48x48">`
  - `<link rel="icon" href="/icon.svg" type="image/svg+xml">`
  - `<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png">`
- את ה-`<link rel="manifest">` מוסיף התוסף אוטומטית.
- `<title>` נשאר "סיימון" (ADR-9).

### 3.3 `vite.config.ts`

הוספת `VitePWA` עם:

- `strategies: 'generateSW'`, `registerType: 'prompt'`, `injectRegister: false` (ADR-6).
- `includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png']`.
- `manifest`:
  - `id: '/simon-game/app'` (ADR-9 – אסור לשנות בעתיד), `name: 'Simon'`, `short_name: 'Simon'`.
  - `description` קצר בעברית (מתוך ה-PRD: משחק זיכרון של רצפי צבעים וצלילים).
  - `lang: 'he'`, `dir: 'rtl'`, `display: 'standalone'`, `orientation: 'portrait'`.
  - `start_url` ו-`scope` = `'/simon-game/'` – נגזרים מקבוע `BASE` אחד, שמשמש גם ל-`base` (ADR-8).
  - `theme_color` ו-`background_color`: `'#0A1628'`.
  - `icons`: `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png` (`purpose: 'any'`), `maskable-icon-512x512.png` (`purpose: 'maskable'`).
- `workbox`:
  - `globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}']` – כולל קובצי Heebo של שלושת המשקלים (Precache של הגופן, §2.7).
  - `navigateFallback: 'index.html'` (בתוך ה-Scope בלבד).
  - `cleanupOutdatedCaches: true`.
  - **ללא** `skipWaiting` / `clientsClaim` (ADR-6).
  - ללא `runtimeCaching` – אין בקשות רשת חיצוניות (§2.7).
- `devOptions.enabled: false` – ה-Service Worker לא פועל ב-`npm run dev`, כדי לא להפריע לפיתוח ולבדיקה בטלפון דרך ה-Wi-Fi.

### 3.4 `src/main.tsx`

- `import { registerSW } from 'virtual:pwa-register';`
- `registerSW({ immediate: true });` – בלי `onNeedRefresh` ובלי קריאה ל-`updateSW()` (ADR-6). גרסה חדשה מותקנת ברקע ונכנסת לתוקף רק אחרי סגירה מלאה של האפליקציה, כך שמשחק פעיל לעולם לא מתרענן בכפייה.
- הערה באנגלית בקוד שמפנה ל-ADR-6.

### 3.5 TypeScript

- `tsconfig.json`: הוספת `"vite-plugin-pwa/client"` ל-`types` (טיפוסים של `virtual:pwa-register`), והוספת `pwa-assets.config.ts` ל-`include`.

### 3.6 Workflow (`.github/workflows/deploy.yml`)

- **ללא שינוי צפוי.** ה-Build מייצר כבר את `dist/` כולו, וה-Manifest, ה-`sw.js`, קובץ ה-Workbox והאייקונים מ-`public/` נכנסים אליו אוטומטית. לוודא אחרי ה-Push שה-Workflow עובר ושהקבצים נגישים בכתובת ה-Pages.

### 3.7 `.gitignore`

- לוודא ש-`dev-dist/` (תיקייה ש-vite-plugin-pwa עשוי ליצור) מתווספת אם היא נוצרת. לא להסיר שורות קיימות.

### 3.8 ADR

- ההחלטות כבר קיימות (ADR-6 עד ADR-9). ADR חדש ייכתב רק אם במהלך הבנייה תתקבל החלטה שאינה מכוסה (למשל שינוי ב-Preset של האייקונים או בתבנית ה-Precache).

## 4. נגישות ופריסה – מעבר בדיקה (ללא הרחבת תכולה)

מעבר קצר על הקיים, ותיקון רק של מה שסותר את `DESIGN.md`:
- `aria-label` בעברית לכל רבע ולכפתורי הניווט; מצב פעיל בניווט מסומן (`aria-current`).
- גודל אזורי מגע סביר בכפתורים ובניווט; אין גלילה אופקית ב-Viewport אנכי (375×812).
- כש-`display: standalone` – ה-`viewport-fit=cover` וה-Safe Area של פס הניווט התחתון לא מסתירים תוכן (בדיקה ב-iPhone/אנדרואיד אמיתי).

## 5. בדיקות

### 5.1 אוטומטיות
- `npm run typecheck`, `npm test`, `npm run build` – עוברים.
- בדיקות ה-Regression הקיימות (`gameReducer.test.ts`, `App.game.test.tsx`, `App.history.test.tsx`, `historyStorage.test.ts`, `audioEngine.test.ts`) מכסות: עשרה שלבים, הפסד ראשון, קונפטי בניצחון בלבד, השהיה וחידוש, עשר תוצאות ומחיקה מאושרת. אין צורך בבדיקות חדשות לקוד המשחק; לא לשנות אותן אלא אם נכשלות בגלל השינוי.
- הבדיקות אינן מייבאות את `main.tsx`, ולכן `virtual:pwa-register` לא נדרש בסביבת Vitest.

### 5.2 בדיקת Build מקומית (`npm run preview`, `http://localhost:4173/simon-game/`)
- `dist/` מכיל `manifest.webmanifest`, `sw.js`, `workbox-*.js` ואת האייקונים.
- `index.html` שבתוצר מפנה ל-Manifest, ל-Favicon ול-Apple Touch Icon תחת `/simon-game/`.
- בדפדפן: שני המסכים נטענים, אין שגיאות בקונסול ואין 404.
- ה-Service Worker נרשם עם Scope `/simon-game/` (נבדק ב-`navigator.serviceWorker`), וה-Manifest נקרא ללא שגיאות (שם `Simon`, `id`, אייקונים).
- **סימולציית Offline:** אחרי טעינה מלאה – עצירת שרת ה-preview, טעינה מחדש של הדף, ווידוא שהבית, האודות, ההיסטוריה ותחילת משחק עובדים מה-Cache. אחר כך הפעלה מחדש של השרת.
- **עדכון בזמן משחק:** Build חדש עם שינוי קטן זמני בזמן שמשחק פעיל בטאב פתוח – הדף אינו מתרענן והמשחק ממשיך; הגרסה החדשה במצב `waiting`. השינוי הזמני מבוטל אחר כך.

### 5.3 בדיקות שדורשות את המשתמש / פריסה
- **Push** נדרש כדי לבדוק את סעיפי ה-DoD של GitHub Pages (HTTPS, Workflow, Offline אמיתי, התקנה). לפי CLAUDE.md – אעצור ואבקש אישור ל-Push; ה-Push הוא גם שלב האישור של ה-Milestone.
- אחרי ה-Push: הדרכה פשוטה, צעד אחר צעד, לבדיקה בטלפון:
  1. פתיחת `https://gamorly.github.io/simon-game/` ב-Chrome (אנדרואיד) או Safari (iPhone).
  2. התקנה: "הוספה למסך הבית" / "התקן אפליקציה"; לוודא שהאייקון והשם `Simon` נכונים.
  3. מצב טיסה, פתיחת האפליקציה המותקנת: משחק, צלילים, מעבר לאודות והיסטוריה.
  4. השהיה (נעילת מסך / מעבר לאפליקציה אחרת) וחידוש ב"המשך משחק".
- הערה: בבדיקה בטלפון דרך ה-Wi-Fi (`npm run dev`) אין Service Worker – זה צפוי, כי דפדפנים מאפשרים אותו רק ב-HTTPS או ב-`localhost`.

## 6. Definition of Done – איך כל סעיף ייבדק

| סעיף | איך נבדק | מתי |
|---|---|---|
| Build מצליח ו-preview תחת `/simon-game/` עובד | 5.1 + 5.2 | בבנייה |
| ה-Workflow עובר ומפרסם עם Manifest ו-SW | צפייה בריצת Actions ובקבצים בכתובת ה-Pages | אחרי Push |
| האתר נטען ב-HTTPS ללא 404 | פתיחת הכתובת + בדיקת רשת | אחרי Push |
| Manifest ו-SW תקינים, התקנה אפשרית | 5.2 מקומית; התקנה בטלפון | בבנייה + אחרי Push |
| Offline אחרי Precache | סימולציה מקומית (5.2); מצב טיסה בטלפון (5.3) | בבנייה + אחרי Push |
| עדכון לא מרענן משחק פעיל | בדיקת עדכון מקומית (5.2) | בבנייה |
| Regression ותצוגת Smartphone בעברית/RTL | 5.1 + אמולציה 375×812 + טלפון | בבנייה + אחרי Push |

סעיפים שתלויים ב-Push יסומנו בסיכום הבנייה כ"ייבדק אחרי ה-Push", ולא כאילו עברו.

## 7. מחוץ לתכולה

- חלונית "גרסה חדשה זמינה" (ADR-6 – דורשת אישור עיצוב).
- Push Notifications, Background Sync, Cache דינמי (§2.7).
- כפתור "התקן אפליקציה" בתוך הממשק – לא מופיע ב-PRD/DESIGN; ההתקנה דרך תפריט הדפדפן.
