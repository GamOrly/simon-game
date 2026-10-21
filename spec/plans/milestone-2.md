# תוכנית – Milestone 2: משחק מלא מקצה לקצה

מקורות: `MILESTONES.md` (Milestone 2), `PRD.md` §3–4.2, `DESIGN.md` §1.1 (כולל טבלת "קצב הצגת הרצף" ו-§2.7), `ARCHITECTURE.md` §2.3–2.6 ו-ADR-1 עד ADR-5. נקודת המוצא: הקוד של Milestone 1 (App Shell, לוח סטטי, מסך אודות).

**מחוץ לתכולה באבן דרך זו:** מצב `paused` ו-"המשך משחק" (Milestone 3), היסטוריה ב-`localStorage` (Milestone 4), PWA (Milestone 5).

---

## 1. מבנה כללי

```text
App ── useGame()  (מוחזק ב-App, כדי שמעבר מסכים לא יפרק אותו – ADR-2)
 │      ├── useReducer(gameReducer)      ← לוגיקה טהורה, בלי אודיו/Timers
 │      ├── Sequence Controller          ← הצגת הרצף, AbortController + presentationId
 │      ├── Audio Engine (Web Audio)     ← צלילים, unlock מתוך Gesture, stopAll
 │      └── Timers של משוב לחיצה וחשיפת תוצאה
 ├── HomeScreen  ← מקבל את מצב המשחק ופעולותיו כ-Props
 │      ├── SimonBoard (הארה / עמעום / חסימה)
 │      └── ResultDialog (ניצחון/הפסד + "אישור", קונפטי בניצחון)
 └── BottomNav   ← מעבר ל"אודות" במשחק פעיל = abandon (פתרון זמני)
```

## 2. קבצים

| קובץ | פעולה | תוכן |
|---|---|---|
| `package.json` | שינוי | הוספת `canvas-confetti` (+ `@types/canvas-confetti` ב-dev) |
| `src/game/constants.ts` | חדש | `MAX_ROUNDS = 10`, ואובייקט `TIMING` עם ערכי הטבלה ב-DESIGN.md (600 / 250 / 1000 / 1000 / 1000 / 1000 / 1000 / 300ms) |
| `src/game/random.ts` | חדש | `randomColor()` – `Math.random()` לאינדקס 0–3 (ADR-2); מוחלף ב-Mock בבדיקות |
| `src/game/gameReducer.ts` | חדש | State, Actions ו-Reducer טהור (סעיף 3) |
| `src/game/sequenceController.ts` | חדש | `sleep(ms, signal)` שניתן לביטול ו-`playSequence(...)` (סעיף 4) |
| `src/audio/audioEngine.ts` | חדש | `unlockAudio`, `startTone`/`stopTone`, `playWin`, `playLose`, `stopAll` (סעיף 5) |
| `src/game/useGame.ts` | חדש | חיבור Reducer + Controller + אודיו + Timers; חושף מצב ופעולות ל-UI (סעיף 6) |
| `src/components/SimonBoard.tsx` | שינוי | Props: `activeColor`, `dimmed`, `inputEnabled`, `onPadDown`, `onPadUp`; `pointerdown` + מקלדת |
| `src/components/ResultDialog.tsx` | חדש | Overlay מעל הלוח, הודעת ניצחון/הפסד, "אישור", קונפטי |
| `src/screens/HomeScreen.tsx` | שינוי | חיווי שלב דינמי, שורת סטטוס, הנחיה מתחת ללוח, כפתור לפי מצב, הודעת כשל אודיו |
| `src/App.tsx` | שינוי | `useGame()` ב-App; ניווט ל"אודות" קורא ל-`abandon()` |
| `src/styles/board.css` | שינוי | מצבי Glow (`--lit`), עמעום (`--dimmed`), חסימה |
| `src/styles/components.css` | שינוי | שורת סטטוס/הנחיה בגובה קבוע, Overlay/Dialog תוצאה, הודעת שגיאה |
| `src/game/gameReducer.test.ts` | חדש | בדיקות יחידה ל-Reducer |
| `src/App.game.test.tsx` | חדש | בדיקות אינטגרציה של משחק מלא (Fake Timers, Mock ל-random/אודיו/קונפטי) |
| `src/App.test.tsx` | שינוי קל לפי הצורך | הבדיקות הקיימות ממשיכות לעבור |
| `spec/ARCHITECTURE.md` | הוספה | ADR-10 על מעבר בין שלבים (סעיף 3.3) |
| `spec/MILESTONES.md` | סימון | 🟡 בסיום הבנייה |

## 3. Game Reducer (`gameReducer.ts`)

### 3.1 State

```ts
type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'won' | 'lost';

type GameState = {
  status: GameStatus;
  sequence: SimonColor[];   // 0–10
  round: number;            // השלב המוצג, 1–10 (ב-idle: 1)
  inputIndex: number;
  completedRounds: number;  // 0–10
  gameId: number;           // עולה בכל "התחל משחק" (ישמש את ה-Guard ב-M4)
  presentationId: number;   // עולה בכל כניסה להצגה; מזהה Callbacks מיושנים
};
```

`initialGameState`: `idle`, רצף ריק, `round: 1`, שאר המונים 0.

### 3.2 Actions (כל Action מתקבל רק במצב המותר לו; אחרת מוחזר אותו State)

| Action | מצב מותר | תוצאה |
|---|---|---|
| `start { firstColor }` | `idle` | `presenting`, `sequence=[firstColor]`, `round=1`, `completedRounds=0`, `inputIndex=0`, `gameId+1`, `presentationId+1` |
| `press { color, nextColor }` | `awaitingInput` | שגוי → `lost` (completedRounds נשאר `round-1`). נכון ולא אחרון → `inputIndex+1`. נכון ואחרון: בשלב 10 → `won`, `completedRounds=10`; אחרת → `presenting`, `completedRounds=round`, `sequence` + `nextColor`, `inputIndex=0`, `presentationId+1` (ה-`round` עדיין הישן) |
| `showNextRound { presentationId }` | `presenting`, ורק אם `presentationId` תואם ו-`round < sequence.length` | `round = sequence.length` |
| `presentationDone { presentationId }` | `presenting`, ורק אם `presentationId` תואם | `awaitingInput`, `inputIndex=0` |
| `abandon` | `presenting` / `awaitingInput` | חזרה ל-`initialGameState` תוך שמירת `gameId`, `presentationId+1` (פתרון זמני – מוסר ב-M3, ADR-3) |
| `dismiss` | `won` / `lost` | חזרה ל-`initialGameState` תוך שמירת `gameId` ו-`presentationId` (ADR-5) |

הצבע האקראי נוצר מחוץ ל-Reducer ומגיע בתוך ה-Action (ADR-2), כך שה-Reducer דטרמיניסטי ובטוח ל-Strict Mode.

### 3.3 מעבר בין שלבים (→ ADR-10)
DESIGN.md דורש שאחרי שחזור נכון חיווי השלב שהושלם יישאר `1000ms`, ורק אז יוצג מספר השלב הבא, ואחרי עוד `1000ms` יתחיל הרצף. לכן הלחיצה האחרונה הנכונה כבר מעדכנת `completedRounds` ומוסיפה צבע (כנדרש ב-ARCHITECTURE §2.3 כלל 2), ומעבירה ל-`presenting` (קלט חסום), אבל `round` מתעדכן רק ב-`showNextRound` שה-Controller שולח אחרי `1000ms`. כך אין מצב נוסף מעבר לחמשת המצבים שבאבן הדרך.

## 4. Sequence Controller (`sequenceController.ts`)

- `sleep(ms, signal)` – Promise שנדחה (AbortError) מיד כש-`signal` מבוטל, ומנקה את ה-`setTimeout`.
- ב-`useGame`, Effect שתלוי ב-`presentationId` (ורץ רק כש-`status === 'presenting'`) יוצר `AbortController` ומריץ ציר זמן:
  1. אם `round < sequence.length` (מעבר שלב): `sleep(1000)` → `showNextRound` → `sleep(1000)`.
     אחרת (תחילת משחק): `sleep(1000)`.
  2. לכל צבע: הארה + `startTone` → `sleep(600)` → כיבוי + `stopTone` → אם לא האחרון `sleep(250)`.
  3. `presentationDone { presentationId }`.
- Cleanup של ה-Effect: `abort()`, כיבוי הארה ו-`stopAll()`. גם אם Callback מאחר – ה-Reducer מתעלם ממנו לפי `presentationId`.
- הקצב זהה בכל השלבים (קבועים בלבד, ללא חישוב לפי שלב).

## 5. Audio Engine (`audioEngine.ts`)

- `AudioContext` יחיד, נוצר בעצלות. `unlockAudio(): Promise<boolean>` – יוצר/קורא ל-`resume()` **באופן סינכרוני בתוך ה-Handler של הלחיצה** (דרישת iOS), ומחזיר `true` רק אם `state === 'running'`; כל חריגה → `false`.
- צליל לכל צבע: Oscillator + GainNode עם Envelope קצר (Attack/Release של כמה ms) למניעת קליקים. גבהים שונים, בהשראת המכשיר המקורי: ירוק ≈415Hz, אדום ≈310Hz, צהוב ≈252Hz, כחול ≈209Hz. מוגדרים בטבלה אחת (`TONE_FREQUENCIES`).
- `startTone(color)` / `stopTone(color)` – לשימוש גם בהצגה וגם בלחיצה ממושכת.
- `playWin()` – מוטיב עולה קצר (ארפג'יו של 3–4 צלילים). `playLose()` – צליל נמוך יורד (גל Sawtooth/Square). שניים שונים זה מזה ומצלילי הצבעים.
- `stopAll()` – עוצר מיד כל Oscillator פעיל.
- אם אין `AudioContext` (למשל jsdom) הפונקציות לא קורסות; בבדיקות המודול מוחלף ב-Mock.

## 6. `useGame` – Hook מרכזי

חושף: `state`, `activeColor`, `resultVisible`, `audioError`, `startGame()`, `padDown(color)`, `padUp(color)`, `abandon()`, `dismiss()`.

- **`startGame()`** (מ-"התחל משחק"): `unlockAudio()`; הצלחה → `dispatch(start{firstColor: randomColor()})`; כשל → נשארים ב-`idle`, `audioError=true`, ומוצגת הודעה (ראה סעיף 8). אין התחלת רצף שקט.
- **`padDown(color)`**: רק ב-`awaitingInput` (אחרת לא קורה כלום – ללא צליל וללא הארה). מפעיל מיד הארה + `startTone`, ושולח `press{color, nextColor: randomColor()}`. השחרור: `max(300ms, משך הלחיצה)` – Timer של 300ms ומעקב אחרי `pointerup`/`pointercancel` ב-`window` (ADR-2). לחיצה חדשה מבטלת משוב קודם.
- **חשיפת תוצאה:** בכניסה ל-`won`/`lost` – Timer של `1000ms` ואז `resultVisible=true`, `playWin()`/`playLose()`. כך בלחיצה שגויה צליל הצבע נשמע מיד, וצליל ההפסד וההודעה מגיעים יחד שנייה אחר כך.
- **`abandon()`**: אם המשחק פעיל – ביטול כל Timer, `abort`, כיבוי הארה, `stopAll()`, `dispatch(abandon)`.
- **`dismiss()`** ("אישור"): `resultVisible=false`, `dispatch(dismiss)`. אינו Gesture אודיו (ADR-5).
- כל ה-Timers נשמרים ב-`ref` ומנוקים ב-Unmount וב-`abandon`.

## 7. UI

### 7.1 HomeScreen – לפי מצב

| מצב | חיווי שלב | שורת סטטוס (מתחת לחיווי, מעל הלוח) | מתחת ללוח | לוח |
|---|---|---|---|---|
| `idle` | "שלב 1 מתוך 10" | — (שטח שמור) | כפתור **"התחל משחק"** | צבעים מלאים, לא מגיב |
| `presenting` | "שלב X מתוך 10" | **"המשחק מציג את הרצף"** | **"המתן…"** | מעומעם, הצבע המוצג מואר עם Glow, חסום |
| `awaitingInput` | "שלב X מתוך 10" | **"התור שלך"** | **"הקש על הצבעים לפי הסדר"** | צבעים מלאים, פעיל |
| `won`/`lost` | השלב האחרון שהיה פעיל | — | — | חסום; אחרי 1000ms Overlay התוצאה |

- מיקום הסטטוס מעל הלוח וההנחיה מתחתיו – לפי ה-Wireframes וה-Mockups (שמסכימים ביניהם), ותואם את "האזור המשתנה מתחת ללוח" ב-DESIGN.md. לשורות גובה קבוע כדי שהלוח לא "יקפוץ".
- חיווי השלב ממשיך להיות `role="status"`; ההודעות בעברית.

### 7.2 SimonBoard
- `onPointerDown` (ולא `click`), `preventDefault` למניעת Ghost Click/בחירת טקסט; Enter/Space במקלדת.
- Classes: `board__pad--lit` (בהירות + Glow בצבע הרבע), `board--dimmed` (Filter brightness/saturate נמוך לכל הרבעים פרט ל-lit), `aria-disabled` כשהקלט חסום (לא `disabled`, כדי שהשחרור ב-`window` יעבוד ושהמראה לא ישתנה).
- `prefers-reduced-motion`: ביטול Transitions בלבד; ההארה עצמה נשארת.

### 7.3 ResultDialog
- שכבה מעל אזור הלוח (Scrim חלקי, הלוח מזוהה ברקע), כרטיס Surface עם גבול כחול, `role="dialog"` + `aria-modal`, פוקוס על "אישור".
- ניצחון: **"כל הכבוד! ניצחת!"** + כפתור **"אישור"**; קונפטי.
- הפסד: **"נפסלת!"**, מתחתיו **"השלמת N שלבים"** (N=1 → **"השלמת שלב אחד"**), כפתור **"אישור"**; ללא קונפטי.
- הכפתור בתוך הכרטיס – לפי ה-Wireframes (שקובעים מבנה); בכיתוב "אישור" לפי DESIGN §2.7.
- קונפטי: `canvas-confetti` עם `disableForReducedMotion: true`, מופעל פעם אחת כש-`resultVisible` הופך ל-true במצב `won`; `confetti.reset()` ב-Cleanup (סגירה/Unmount).

### 7.4 App / ניווט
`navigate('about')` קורא קודם ל-`game.abandon()` (פועל רק במשחק פעיל). במשחק שהסתיים (`won`/`lost`) אין שינוי.

## 8. טיפול בכשל אודיו
אם `unlockAudio()` נכשל – המשחק לא מתחיל, ומתחת לכפתור "התחל משחק" מוצגת הודעה (`role="alert"`) בנוסח: **"לא הצלחנו להפעיל את הצלילים. לחצו שוב על "התחל משחק"."** ההודעה נעלמת בניסיון הבא שמצליח. (ARCHITECTURE §2.4 מחייב הודעה קצרה בעברית; הנוסח המדויק אינו מוגדר במסמכים – זה הנוסח המוצע.)

## 9. בדיקות

**`gameReducer.test.ts` (יחידה):**
- `start` יוצר רצף באורך 1; כל השלמת שלב מוסיפה בדיוק צבע אחד בסוף (תחילית); אורכים 1, 2, 10 בשלבים 1, 2, 10; צבע חוזר מותר.
- `press` ב-`presenting`/`idle`/`won`/`lost` לא משנה את ה-State.
- שגיאה בשלב 1 → `lost`, `completedRounds=0`; שגיאה בשלב 5 → `completedRounds=4`.
- השלמת שלב 10 → `won`, `completedRounds=10`, אורך רצף 10, אין שלב 11 (`press` נוסף מתעלם).
- `presentationDone`/`showNextRound` עם `presentationId` ישן – מתעלמים.
- `abandon` ו-`dismiss` מחזירים ל-`idle` רק מהמצבים המותרים.

**`App.game.test.tsx` (אינטגרציה, Fake Timers + `advanceTimersByTimeAsync`, Mock ל-`random`, `audioEngine`, `canvas-confetti`):**
- לחיצה על "התחל משחק" → "המשחק מציג את הרצף", לחיצות על הלוח לא משפיעות ולא משמיעות צליל.
- ציר זמן: 1000ms המתנה, הארה 600ms, הפסקה 250ms; זהה בשלב 1 ובשלב 3. מעבר שלב: חיווי השלב הקודם 1000ms ואז השלב הבא, ועוד 1000ms עד הצבע הראשון.
- הפסד בשלב 1: צליל הצבע מיד, "נפסלת!" + צליל הפסד רק אחרי 1000ms, "השלמת 0 שלבים", ללא קונפטי.
- הפסד בשלב מתקדם: מספר שלבים נכון (כולל "השלמת שלב אחד").
- ניצחון אחרי שלב 10: אחרי 1000ms "כל הכבוד! ניצחת!", צליל ניצחון, קונפטי פעם אחת; אין שלב 11.
- "אישור" → "התחל משחק" ו-"שלב 1 מתוך 10"; משחק חדש מקבל רצף חדש (מה-Mock).
- צלילים: ארבעת הצבעים קוראים ל-`startTone` עם צבעים שונים; בדיקת יחידה קטנה ש-`TONE_FREQUENCIES` מכיל 4 ערכים שונים.
- כשל `unlockAudio` → נשארים ב-idle עם הודעת השגיאה.
- מעבר ל"אודות" באמצע הצגה ובאמצע קלט → `stopAll` נקרא, `vi.getTimerCount() === 0`, וחזרה ל"בית" מציגה "התחל משחק" ו"שלב 1 מתוך 10".
- רענון: Render חדש מתחיל ב-idle; `localStorage` לא נכתב בכלל במהלך משחק.

**ידני (שלי, בדפדפן באמולציית מובייל):** משחק מלא, הארה/עמעום, Overlay, קונפטי, אין גלילה אופקית. בדיקת צלילים אמיתית – בטלפון של המשתמש (הוראות ב"הרץ כדי שאבדוק").

## 10. סדר עבודה
1. התקנת `canvas-confetti` + Types.
2. `constants`, `random`, `gameReducer` + בדיקות יחידה.
3. `audioEngine`, `sequenceController`.
4. `useGame`, חיבור ל-`App`.
5. UI: `SimonBoard`, `HomeScreen`, `ResultDialog`, CSS.
6. בדיקות אינטגרציה; `npm test`, `npm run typecheck`, `npm run build`.
7. בדיקה ידנית בדפדפן מול כל סעיפי ה-Definition of Done; תיקונים.
8. ADR-10 ב-ARCHITECTURE.md, סימון 🟡 ב-MILESTONES.md, סגירת שרת הבדיקה.

## 11. מיפוי ל-Definition of Done

| תנאי | איך מכוסה |
|---|---|
| התחלה, אורכים 1/2/10, תחילית | Reducer + בדיקות יחידה ואינטגרציה |
| צלילים והארה שונים לכל צבע, קצב קבוע | `TONE_FREQUENCIES`, Classes לכל צבע, `TIMING` קבוע + בדיקת ציר זמן |
| חסימה ב-`presenting`, טעות אחת = הפסד | Reducer + `padDown` + בדיקות |
| הפסד שלב 1/מתקדם, ניצחון, אין שלב 11, רצף חדש | בדיקות אינטגרציה |
| טקסט + צליל סיום, קונפטי בניצחון בלבד | `ResultDialog`, `playWin/playLose`, Mock לקונפטי |
| Refresh מאפס, אין אחסון מתמיד | State בזיכרון בלבד + בדיקה ש-`localStorage` לא נכתב |
| קצב לפי טבלת DESIGN, צליל שגוי מיד והפסד אחרי שנייה | `TIMING` + Timer חשיפה + בדיקה |
| "אודות" באמצע משחק – בלי הארה/צליל/Timer | `abandon` + בדיקת `getTimerCount` ו-`stopAll` |
