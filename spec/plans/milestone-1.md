# תוכנית – Milestone 1: בסיס אפליקציה ושני מסכים מעוצבים

> מבוסס על `PRD.md`, `ARCHITECTURE.md` (כולל ADR-1, ADR-8), `DESIGN.md` והתמונות `wireframes.png`, `mockups.png`, `style-guide.png`.
> מטרה: פרויקט React + TypeScript + Vite עובד, עם שני מסכים מעוצבים (**בית**, **אודות**) וניווט ביניהם. **אין** עדיין לוגיקת משחק, אודיו, היסטוריה, קונפטי או PWA.

## 0. דרישה מוקדמת – Node.js

Node.js אינו מותקן במחשב (`node`/`npm` לא נמצאו ב-PATH). לפני הבנייה:
- להתקין **Node.js LTS** (גרסה 22 ומעלה) מ-https://nodejs.org (Windows Installer), ולפתוח מחדש את Claude / הטרמינל.
- לוודא ש-`node -v` ו-`npm -v` מחזירים גרסה.
- זו התקנה של המשתמש במחשב שלו; Claude לא מתקין תוכנות מערכת. אם Node עדיין חסר בתחילת הבנייה – לעצור ולבקש.

## 1. הקמת הפרויקט

הקמה ידנית בשורש ה-Repository (לא `npm create vite` לתוך תיקייה חדשה, כי `spec/`, `CLAUDE.md` ו-`.gitignore` כבר קיימים).

### Dependencies

| חבילה | סוג | למה |
|---|---|---|
| `react`, `react-dom` | runtime | ממשק |
| `@fontsource/heebo` | runtime | גופן Heebo ארוז באפליקציה (משקלים 400, 600, 700 בלבד) |
| `vite`, `@vitejs/plugin-react` | dev | שרת פיתוח ו-Build |
| `typescript`, `@types/react`, `@types/react-dom` | dev | TypeScript |
| `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom` | dev | בדיקות |

**לא** מתקינים עכשיו: `canvas-confetti` (M2), `vite-plugin-pwa` / `@vite-pwa/assets-generator` (M5). אין ESLint/Prettier – לא נדרשים ב-spec.

### Scripts ב-`package.json`

| Script | פקודה |
|---|---|
| `dev` | `vite` |
| `build` | `tsc --noEmit && vite build` |
| `preview` | `vite preview` |
| `typecheck` | `tsc --noEmit` |
| `test` | `vitest run` |

### קובצי תצורה

- **`package.json`** – `"type": "module"`, `"private": true`, השם `simon-game`.
- **`tsconfig.json`** – קובץ יחיד: `strict`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`, `noEmit: true`, `types: ["vite/client", "vitest/globals", "@testing-library/jest-dom"]`, `include: ["src", "vite.config.ts"]`.
- **`vite.config.ts`** –
  - `base: '/simon-game/'` כבר עכשיו (ADR-8), כך שכתובת הפיתוח היא `http://localhost:5173/simon-game/`.
  - `server.host: true` – כדי שאפשר יהיה לפתוח את שרת הפיתוח מהטלפון באותה רשת Wi-Fi (דרישה ב-MILESTONES.md).
  - בלוק `test`: `environment: 'jsdom'`, `globals: true`, `setupFiles: './src/test/setup.ts'`, `css: false`.
- **`.gitignore`** – כבר מכסה `node_modules/`, `dist/`, `coverage/`. אין צורך בשינוי. אין `.env` – לא נדרשים משתנים.
- `package-lock.json` נוצר אוטומטית ונשמר ב-Repository (ARCHITECTURE §2.8).

## 2. מבנה קבצים

```text
index.html
src/
  main.tsx                 # mount, font imports, global CSS
  App.tsx                  # app shell: screen state + bottom nav
  App.test.tsx             # render + navigation tests
  game/
    colors.ts              # the 4 colors: id, Hebrew label, grid position
  components/
    SimonBoard.tsx         # round 2x2 board (ADR-1)
    BottomNav.tsx          # "בית" / "אודות" tabs with icons
    PrimaryButton.tsx      # blue full-width button
  screens/
    HomeScreen.tsx
    AboutScreen.tsx
  styles/
    tokens.css             # CSS variables: colors, type scale, spacing, radii
    global.css             # reset, body, layout shell
    board.css
    components.css         # buttons, cards, nav
  test/
    setup.ts               # jest-dom matchers
```

## 3. פירוט לפי רכיב

### `index.html`
- `<html lang="he" dir="rtl">`, `<title>סיימון</title>`.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
- `<meta name="theme-color" content="#0A1628">`.

### `src/main.tsx`
- ייבוא `@fontsource/heebo/400.css`, `600.css`, `700.css`, ואז `tokens.css`, `global.css`, וקובצי ה-CSS האחרים.
- `createRoot(...).render(<StrictMode><App /></StrictMode>)`.

### `src/App.tsx` – App Shell
- `const [screen, setScreen] = useState<'home' | 'about'>('home')`.
- מציג `HomeScreen` או `AboutScreen` לפי ה-State, ומתחת `BottomNav`.
- המעבר הוא החלפת State בלבד – בלי Router, בלי `<a href>`, בלי טעינת דף (ARCHITECTURE §2.1). ה-State יישב ב-`App`, כך שב-M2/M3 מצב המשחק לא יתאפס במעבר.
- בעת מעבר מסך: גלילה לראש העמוד (`window.scrollTo(0, 0)`).

### `src/game/colors.ts`
מקור יחיד לצבעי הלוח (ADR-1):

| id | `aria-label` | מיקום (`grid-area`) |
|---|---|---|
| `green` | ירוק | למעלה משמאל |
| `red` | אדום | למעלה מימין |
| `yellow` | צהוב | למטה משמאל |
| `blue` | כחול | למטה מימין |

הסידור לפי ה-Mockups (DESIGN §1.1 מכריע שהוא גובר על ה-Wireframes).

### `SimonBoard`
- מיכל עגול (`border-radius: 50%`, `aspect-ratio: 1`) עם `direction: ltr` (כדי שה-RTL לא יהפוך את הצבעים), CSS Grid 2×2.
- ארבעה `<button type="button">` עם `aria-label` בעברית, **ללא טקסט גלוי** (DESIGN §2.7). לכל רבע פינה חיצונית אחת מעוגלת ב-100% → רבע עיגול.
- פסי ההפרדה הכהים = `gap` של הגריד על רקע `Charcoal`; מסגרת כהה חיצונית עם קו `Border` עדין.
- דיסק מרכזי כהה, ריק מטקסט, `aria-hidden`, `pointer-events: none`.
- גודל: `width: min(84vw, 340px, 46dvh)` – גדול בטלפון ולא דוחף את הכפתור והניווט מחוץ למסך.
- ב-M1 הכפתורים לא עושים דבר (אין `onClick`). מצב ברירת המחדל = "לפני תחילת משחק": צבעים מלאים, בלי עמעום ובלי Glow.
- `touch-action: manipulation`, `user-select: none`, `-webkit-tap-highlight-color: transparent` – הכנה למגע (ARCHITECTURE §2.4).
- Props מינימליים בלבד (אין props למצבים שעוד לא קיימים).

### `HomeScreen`
מלמעלה למטה, לפי Wireframe "בית – התחלה" ו-Mockup:
1. כותרת מותג `<h1>` **"סיימון"** (32px Bold), עם קו הפרדה עדין (`Border`) מתחתיה.
2. חיווי שלב **"שלב 1 מתוך 10"** (H3 – 20px Semibold). מסומן כ-`role="status"` כבר עכשיו.
3. `SimonBoard`.
4. כפתור ראשי כחול **"התחל משחק"**. ב-M1 `onClick` ריק (ללא פעולה) – הכפתור יחובר ב-M2.

אין טקסט סטטוס נוסף במצב התחלה (גם ב-Wireframe וגם ב-Mockup אין).

### `AboutScreen`
לפי Wireframe "אודות" ו-DESIGN §1.2:
1. כותרת `<h1>` **"אודות"** (ה-Mockup מציג "סיימון", אך ה-Wireframes מכריעים על תוכן ו-DESIGN §1.2 מגדיר "אודות").
2. כרטיס **"על המשחק"** (`<h2>`) – תיאור קצר והוראות בעברית, למשל:
   - "סיימון הוא משחק זיכרון: המשחק מציג רצף של צבעים וצלילים, ואתם צריכים לחזור עליו."
   - רשימת הוראות: לחצו "התחל משחק" · צפו והקשיבו לרצף · הקישו על הצבעים באותו סדר · בכל שלב נוסף צבע אחד · טעות אחת מסיימת את המשחק · השלימו את שלב 10 כדי לנצח.
   - הערה (PRD §4.4): "ודאו שהטלפון אינו במצב שקט – במכשירים מסוימים (למשל iPhone) הצלילים לא נשמעים במצב שקט."
3. כותרת `<h2>` **"10 המשחקים האחרונים"**.
4. חיווי ריק בכרטיס מאופק: **"עדיין אין משחקים שמורים."**
5. **אין** כפתור "מחק היסטוריה" (מוצג רק כשיש רשומות – יגיע ב-M4).

המסך גולל אנכית אם התוכן ארוך; פס הניווט נשאר גלוי.

### `BottomNav`
- `<nav aria-label="ניווט ראשי">` עם שני `<button>`: **"בית"** (אייקון בית) ו-**"אודות"** (אייקון i בעיגול). אייקונים כ-SVG inline פשוט עם `aria-hidden`, הטקסט תמיד מוצג (DESIGN §2.7).
- הסדר ב-RTL: "בית" מימין, "אודות" משמאל (כמו בכל ההמחשות) – מתקבל טבעית מ-`dir="rtl"`.
- הלשונית הפעילה: `aria-current="page"`, רקע כחול מלא וטקסט לבן (כמו ב-Style Guide "Navigation (Tabs)"); הלא-פעילה: טקסט `Soft Gray` מעומעם.
- הפס כהה (`Surface`), פינות מעוגלות, קו `Border`, קבוע בתחתית (`position: sticky; bottom: 0`) עם `padding-bottom: env(safe-area-inset-bottom)`.

### `PrimaryButton`
כפתור כחול מלא (`#00A3FF`), רחב (עד ~320px), פינות עגולות (pill), טקסט לבן 16px Semibold, צל רך. מצב `:active` מעט כהה/מוקטן. `:focus-visible` עם טבעת בולטת.

## 4. שפה חזותית – `tokens.css`

```css
--color-green: #00D26A;  --color-red: #FF3B30;
--color-yellow: #FFD600; --color-blue: #00A3FF;
--color-charcoal: #0F0F0F; --color-soft-gray: #E5E5E5; --color-white: #FFFFFF;
--color-bg: #0A1628; --color-surface: #12213A; --color-border: #1E3556;
--space-8: 8px; --space-12: 12px; --space-16: 16px; --space-24: 24px;
--font-family: 'Heebo', Arial, sans-serif;
/* type scale: h1 32/700, h2 24/700, h3 20/600, body 16/400, caption 14/400, button 16/600 */
```

- `body`: רקע `--color-bg`, טקסט לבן/`Soft Gray`, גופן Heebo.
- מעטפת האפליקציה: עמודה אנכית, `min-height: 100dvh`, `max-width: 480px` במרכז, ריווח צד 16px.
- `overflow-x: hidden` אינו מחליף בדיקה – אף אלמנט לא יהיה רחב מה-Viewport (רוחבים ב-`min()`/`%`).
- אין כפתורי הגדרות, מתג צליל או אלמנטים שלא ב-PRD.

## 5. בדיקות אוטומטיות – `src/App.test.tsx`

1. **Render בית:** כותרת "סיימון", "שלב 1 מתוך 10", כפתור "התחל משחק", וארבעה כפתורים בשמות "ירוק", "אדום", "צהוב", "כחול".
2. **מיקום הצבעים:** כל רבע מקבל את ה-`grid-area`/class הנכון לפי `colors.ts` (ירוק למעלה-שמאל, אדום למעלה-ימין, צהוב למטה-שמאל, כחול למטה-ימין).
3. **ניווט לאודות וחזרה:** לחיצה על "אודות" מציגה "אודות", "על המשחק", "10 המשחקים האחרונים" ו"עדיין אין משחקים שמורים", בלי כפתור "מחק היסטוריה"; `aria-current` עובר ללשונית אודות; `window.location.href` לא השתנה. לחיצה על "בית" מחזירה את הלוח.
4. **אין מסך שלישי:** בפס הניווט בדיוק שני כפתורים.

## 6. אימות בזמן הבנייה (על ידי Claude)

1. `npm install`, ואז `npm run typecheck`, `npm test`, `npm run build` – כולם עוברים.
2. הרצת `npm run dev` ובדיקה בדפדפן המובנה ב-`http://localhost:5173/simon-game/`:
   - Viewport מובייל (375×812) וגם רוחב 360: אין גלילה אופקית (`document.documentElement.scrollWidth <= innerWidth`).
   - השוואה חזותית מול ה-Mockups: צבעים, סידור הלוח, כפתור כחול, פס ניווט, מסך אודות.
   - מעבר בית ↔ אודות בלי טעינת דף (אין בקשת רשת למסמך חדש).
   - אין שגיאות בקונסול.
3. סגירת שרת הפיתוח בסיום.
4. מילוי **פקודות הרצה** ב-`CLAUDE.md`: הרצה `npm run dev`, בדיקות `npm test`.
5. סימון 🟡 ליד כותרת Milestone 1 ב-`MILESTONES.md`. בלי commit.

## 7. בדיקה בטלפון (להדרכת המשתמש בשלב "הרץ כדי שאבדוק")

שרת הפיתוח רץ עם `host: true`, ולכן Vite מדפיס גם כתובת Network (למשל `http://192.168.1.23:5173/simon-game/`). הטלפון צריך להיות באותה רשת Wi-Fi. בפעם הראשונה Windows עשוי לשאול אם לאפשר ל-Node גישה לרשת – לאשר עבור רשת **פרטית**.

## 8. מחוץ לתחום ב-Milestone זה

לוגיקת משחק, הצגת רצף, צלילים, מצבי עמעום/Glow, הודעות ניצחון/הפסד, קונפטי, השהיה, `localStorage`, חלונית מחיקה, PWA, אייקונים ו-GitHub Actions – כולם ב-Milestones 2–5.

## 9. ADRs

אין החלטה טכנית חדשה מעבר ל-ADR-1 ו-ADR-8 הקיימים. אם תתקבל החלטה משמעותית במהלך הבנייה – תתועד כ-ADR-10 ואילך.
