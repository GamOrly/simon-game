# תוכנית – Milestone 4: היסטוריית משחקים ומחיקה מאושרת

מקורות: `MILESTONES.md` (Milestone 4), `PRD.md` §3ב ("סיום משחק" סעיף 4, "צפייה בהיסטוריה ומחיקתה"), §4.4, §4ב (Edge Cases); `DESIGN.md` §1.2, §1.3, §2.3 (History Cards, Dialog, Secondary/Destructive Button), §2.7 (כרטיס היסטוריה); `ARCHITECTURE.md` §2.5, §2.6 ("אודות"), §2.8, ADR-4, ADR-5, ADR-10; `mockups.png` (מסכי "אודות" ו"אודות – אישור מחיקה"). נקודת המוצא: הקוד של Milestone 3.

**מחוץ לתכולה באבן דרך זו:** PWA/Offline (Milestone 5). הפריסה האוטומטית הוקדמה לאבן דרך זו לבקשת המשתמש (ADR-13). אין שינוי בכללי המשחק, בקצב, בהשהיה/חידוש או במסך הבית (מלבד הודעת כשל שמירה בהודעת הסיום, סעיף 6.3).

**הכרעה בין מקורות:** `MILESTONES.md` כותב תוצאה `won`/`lost`, ו-`ARCHITECTURE.md` §2.5 מגדיר `outcome: 'win' | 'loss'`. לפי כלל הסתירות, ARCHITECTURE קובע בנושאי נתונים, ולכן נשמר `'win' | 'loss'`. בתצוגה: **"ניצחון"** / **"הפסד"**.

---

## 1. מבנה כללי

```text
App ── useGame()                     ← ללא שינוי בלוגיקת המשחק
 │  ── useHistory()                  ← חדש: רשימה + מצבי כשל (טעינה / שמירה / מחיקה)
 │  ── Effect: רישום תוצאה בכניסה ל-won/lost, Guard לפי gameId (ADR-4)
 ├── HomeScreen ── ResultDialog      ← שורת כשל שמירה (אם נכשלה)
 └── AboutScreen(history)
        ├── HistoryList / HistoryCard
        ├── כפתור "מחק היסטוריה" (רק כשיש רשומות)
        └── ConfirmDialog ("ביטול" / "מחק")

src/history/historyStorage.ts       ← מודול טהור, ללא React, היחיד שנוגע ב-localStorage
```

## 2. קבצים

| קובץ | פעולה | תוכן |
|---|---|---|
| `src/history/historyStorage.ts` | חדש | טיפוסים, קריאה+Validation, הוספה עם מגבלת 10, מחיקה, יצירת `id` (סעיף 3) |
| `src/history/useHistory.ts` | חדש | Hook המחזיק את הרשימה ומצבי הכשל (סעיף 4) |
| `src/history/formatDate.ts` | חדש | עיצוב תאריך ושעה ב-`he-IL` ובזמן המקומי (סעיף 6.1) |
| `src/App.tsx` | שינוי | `useHistory()`, Effect רישום התוצאה, העברת props ל-`AboutScreen` ול-`HomeScreen` (סעיף 5) |
| `src/screens/AboutScreen.tsx` | שינוי | רשימת כרטיסים, חיווי ריק, הודעות כשל, כפתור מחיקה ו-Dialog (סעיף 6) |
| `src/components/HistoryCard.tsx` | חדש | כרטיס תוצאה בודד |
| `src/components/ConfirmDialog.tsx` | חדש | Dialog אישור מחיקה (סעיף 6.2) |
| `src/components/ResultDialog.tsx` | שינוי | שורת "התוצאה לא נשמרה בהיסטוריה" אם השמירה נכשלה |
| `src/screens/HomeScreen.tsx` | שינוי קל | העברת דגל כשל השמירה ל-`ResultDialog` |
| `src/styles/components.css` | שינוי | כרטיסי היסטוריה, כפתור משני, Dialog בהיר, הודעות כשל (סעיף 7) |
| `src/history/historyStorage.test.ts` | חדש | בדיקות יחידה למודול האחסון (סעיף 8.1) |
| `src/App.history.test.tsx` | חדש | בדיקות שילוב: רישום, Strict Mode, מסך אודות, מחיקה, כשל (סעיף 8.2) |
| `spec/ARCHITECTURE.md` | הוספה | ADR-12 – היכן מוצגות הודעות כשל ההיסטוריה (סעיף 9) |
| `spec/MILESTONES.md` | סימון | 🟡 בסיום הבנייה |

## 3. History Repository – `historyStorage.ts`

### 3.1 טיפוסים וקבועים (לפי ARCHITECTURE §2.5)
```ts
export const HISTORY_KEY = 'simon.history.v1';
export const MAX_RESULTS = 10;

export type GameResult = {
  id: string;
  finishedAt: string;      // ISO 8601
  completedRounds: number; // 0–10
  outcome: 'win' | 'loss';
};

type HistoryData = { schemaVersion: 1; results: GameResult[] };

// Every function returns a result object instead of throwing
export type LoadResult = { ok: true; results: GameResult[] } | { ok: false; results: GameResult[] };
export type WriteResult = { ok: true; results: GameResult[] } | { ok: false };
```

### 3.2 פונקציות
- **`loadHistory(): LoadResult`** – `localStorage.getItem` בתוך `try/catch`.
  - אין מפתח → `{ ok: true, results: [] }`.
  - חריגה בגישה (אחסון חסום) או JSON פגום / `schemaVersion` שגוי / `results` שאינו מערך → `{ ok: false, results: [] }`.
  - רשומות בודדות לא תקינות (שדה חסר, `completedRounds` מחוץ ל-0–10 או לא שלם, `outcome` לא מוכר, `finishedAt` שאינו תאריך תקין) מסוננות בשקט; השאר מוחזרות. חיתוך ל-10 הראשונות.
- **`addResult(current: GameResult[], result: GameResult): WriteResult`** – בונה `[result, ...current].slice(0, 10)`, כותב `JSON.stringify({ schemaVersion: 1, results })` ב-`try/catch`. הצלחה מחזירה את הרשימה החדשה. הרשימה הנוכחית מגיעה מהזיכרון (ה-Hook), כך שאחרי קריאה פגומה השמירה הבאה כותבת רשימה תקינה חדשה (ADR-4).
- **`clearHistory(): WriteResult`** – `localStorage.removeItem(HISTORY_KEY)` ב-`try/catch`; הצלחה → `{ ok: true, results: [] }`.
- **`createResult(outcome, completedRounds, now = new Date()): GameResult`** – `id` מזמן + מספר אקראי (`${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`), לא `crypto.randomUUID` (ADR-4); `finishedAt = now.toISOString()`.

## 4. `useHistory()`

```ts
const [results, setResults] = useState(() => initial.results); // lazy, reads once
const [loadFailed, setLoadFailed] = useState(...);
const [saveFailed, setSaveFailed] = useState(false);
const [clearFailed, setClearFailed] = useState(false);
```
- טעינה פעם אחת באתחול (Lazy initializer משותף לשני ה-States, כדי שלא תתבצע קריאה כפולה).
- **`record(outcome, completedRounds)`** – קורא ל-`addResult(resultsRef.current, ...)`. הצלחה → עדכון הרשימה, `saveFailed = false`, `loadFailed = false`. כשל → `saveFailed = true`, הרשימה בזיכרון **לא** משתנה (אין להציג תוצאה כאילו נשמרה).
- **`clear()`** – קורא ל-`clearHistory()`. הצלחה → רשימה ריקה, `clearFailed = false`. כשל → `clearFailed = true`, הרשימה נשארת כמו שהיא (אין טשטוש כישלון כהצלחה).
- `resultsRef` מתעדכן בכל רינדור, כדי שהוספות רצופות לא יאבדו רשומה.
- מחזיר `{ results, loadFailed, saveFailed, clearFailed, record, clear }`.

## 5. רישום תוצאה ב-`App` (ADR-4)

```ts
const recordedGameId = useRef(0);
useEffect(() => {
  const { status, gameId, completedRounds } = game.state;
  if (status !== 'won' && status !== 'lost') return;
  if (recordedGameId.current === gameId) return; // StrictMode double effect / re-render guard
  recordedGameId.current = gameId;
  history.record(status === 'won' ? 'win' : 'loss', completedRounds);
}, [game.state.status, game.state.gameId]);
```
- הרישום מתבצע **בכניסה** ל-`won`/`lost` (מיד, ולא אחרי השהיית ההודעה של `1000ms`), כך שגם Refresh בתוך השנייה הזו לא מאבד תוצאה של משחק שכבר הסתיים.
- `paused`, `idle`, `presenting`, `awaitingInput` אינם רושמים דבר; Refresh של משחק פעיל מאפס את המצב בזיכרון ולכן אין מה לרשום. "אישור" (`dismiss`) אינו נוגע בהיסטוריה (ADR-5).
- `completedRounds` כבר נכון ב-Reducer: 0 בהפסד בשלב 1, `round - 1` בהפסד מתקדם, 10 בניצחון.
- `saveFailed` מתאפס בתחילת משחק חדש? לא – הוא מתאפס רק בשמירה מוצלחת הבאה. בהודעת הסיום מוצג הדגל של השמירה האחרונה, שהיא של המשחק הנוכחי.

## 6. ממשק

### 6.1 מסך "אודות"
סדר מלמעלה למטה (כמו ב-Mockup):
1. כותרת **"אודות"** וכרטיס **"על המשחק"** – ללא שינוי.
2. כותרת **"10 המשחקים האחרונים"**.
3. הודעות כשל (אם רלוונטי), כ-`role="alert"`, בעברית:
   - טעינה נכשלה: **"לא ניתן לקרוא את ההיסטוריה השמורה. אפשר להמשיך לשחק, אבל ייתכן שתוצאות לא יישמרו."**
   - שמירה נכשלה: **"שמירת התוצאה האחרונה נכשלה."**
   - מחיקה נכשלה: **"מחיקת ההיסטוריה נכשלה. נסו שוב."**
4. רשימה (`<ol>`) של כרטיסים מהחדש לישן, או חיווי ריק **"עדיין אין משחקים שמורים."** (הקיים) כשאין רשומות.
5. כפתור **"מחק היסטוריה"** – רק כש-`results.length > 0`.

**HistoryCard** (לפי DESIGN §2.7 ו-Mockup): בצד ימין (תחילת השורה ב-RTL) שתי שורות – **"שלבים שהושלמו: N"** (מודגש) ומתחתיה **"תוצאה: ניצחון"** / **"תוצאה: הפסד"** בגוון ירוק/אדום מאופק (הטקסט עצמו נושא את המידע, לא רק הצבע); בצד שמאל התאריך והשעה ב-Caption.
תאריך: `new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(finishedAt))` – זמן מקומי של המכשיר, לדוגמה "21.10.2026, 14:05". התאריך עטוף ב-`<time dateTime={finishedAt}>`. אין `dangerouslySetInnerHTML` (ARCHITECTURE §2.8).

### 6.2 Dialog אישור מחיקה – `ConfirmDialog`
- Scrim כהה על כל המסך, כרטיס **בהיר** במרכז (כמו ב-Mockup), פינות מעוגלות.
- כותרת **"למחוק את ההיסטוריה?"**, הסבר **"כל תוצאות המשחקים יימחקו."**
- שני כפתורים בשורה: **"מחק"** (אדום) מימין ו-**"ביטול"** (אפור בהיר) משמאל, כמו ב-Mockup.
- `role="alertdialog"`, `aria-modal`, `aria-labelledby`/`aria-describedby`; Focus ראשוני על **"ביטול"** (הפעולה הבטוחה); מקש Escape ולחיצה על ה-Scrim = **"ביטול"**.
- **"ביטול"** → סגירה בלבד, בלי לגעת באחסון. **"מחק"** → `history.clear()`, סגירה, והרשימה מתעדכנת (חיווי ריק בהצלחה, או הודעת כשל והרשימה כפי שהייתה).
- מצב פתיחת ה-Dialog הוא State מקומי של `AboutScreen` – מעבר ל"בית" סוגר אותו. זו שכבה בתוך "אודות", לא מסך שלישי.

### 6.3 הודעת הסיום
אם `saveFailed` אמת כשהודעת הניצחון/הפסד מוצגת, מתווספת בה שורת Caption: **"התוצאה לא נשמרה בהיסטוריה."** המשחק, הצליל, הקונפטי וכפתור **"אישור"** – ללא שינוי.

## 7. עיצוב (`components.css`)
- `.history__list` – רשימה ללא סימני מספור, `gap: 12px`.
- `.history-card` – על בסיס `.card` (Surface + Border + `--radius-card`), Flex בין שני הצדדים; `.history-card__rounds` Body Semibold, `.history-card__outcome--win` ירוק / `--loss` אדום ב-Caption, `.history-card__date` Caption בגוון Soft Gray.
- `.btn-secondary` – כפתור Pill בגובה 52px, רקע Surface וגבול `--color-border` (כמו "מחק היסטוריה" ב-Mockup).
- `.confirm` – שכבה `position: fixed; inset: 0` עם Scrim כהה (`rgba(0,0,0,0.6)`); `.confirm__card` רקע לבן, טקסט כהה (Charcoal); `.btn-danger` אדום עם טקסט לבן; `.btn-cancel` אפור בהיר עם טקסט כהה.
- `.notice--error` – טקסט אדום ב-Caption על משטח עם גבול, ממורכז.
- הרשימה גוללת עם העמוד; פס הניווט הדביק נשאר מתחת. ללא גלילה אופקית ברוחב 360px.

## 8. בדיקות

### 8.1 `historyStorage.test.ts` (jsdom `localStorage`, נמחק לפני כל בדיקה)
- אחסון ריק → `ok: true` ורשימה ריקה.
- `addResult` שומר בראש הרשימה; Round-trip: אחרי שמירה, `loadHistory` מחזיר את אותן רשומות (מדמה Refresh).
- 11 הוספות → 10 רשומות, החדשה ראשונה והראשונה שנוספה הוסרה.
- JSON פגום / `schemaVersion` אחר → `ok: false`, רשימה ריקה, ללא חריגה; שמירה אחרי זה כותבת קובץ תקין חדש.
- רשומה לא תקינה בתוך מערך תקין מסוננת, והשאר נשמרות.
- `clearHistory` מסיר את המפתח.
- `getItem` / `setItem` / `removeItem` שזורקים (`vi.spyOn(Storage.prototype, ...)`) → `ok: false` בלי חריגה החוצה.

### 8.2 `App.history.test.tsx` (Fake Timers ו-Mock לאודיו כמו ב-`App.game.test.tsx`; רינדור בתוך `<StrictMode>`)
- הפסד בשלב 1 → בדיוק רשומה אחת עם `completedRounds: 0`, `outcome: 'loss'`; במסך "אודות": "שלבים שהושלמו: 0", "תוצאה: הפסד" ותאריך.
- ניצחון → רשומה אחת עם 10 ו"תוצאה: ניצחון".
- **Strict Mode:** לאחר סיום משחק יש רשומה אחת בלבד, וגם לא נוספת אחרי "אישור", מעבר מסכים ורינדורים חוזרים.
- השהיה (מעבר ל"אודות" באמצע משחק), Hidden/`pagehide`, וחידוש – אינם מוסיפים רשומה; Unmount ורינדור מחדש של `App` באמצע משחק (מדמה Refresh) – אין רשומה, וההיסטוריה הקודמת נשארת.
- היסטוריה שמורה מראש (Seed ב-`localStorage`) מוצגת אחרי רינדור חדש, בסדר מהחדש לישן.
- כפתור "מחק היסטוריה" אינו קיים בהיסטוריה ריקה וקיים כשיש רשומות.
- "ביטול" → Dialog נסגר, הרשומות והאחסון ללא שינוי. "מחק" → אחסון ריק, חיווי ריק, הכפתור נעלם.
- כשל שמירה (`setItem` זורק) → המשחק מסתיים כרגיל, הודעת הסיום מציגה "התוצאה לא נשמרה בהיסטוריה.", ו"אודות" מציג הודעת כשל; משחק חדש מתחיל כרגיל.
- כשל מחיקה (`removeItem` זורק) → הודעת כשל, הרשומות עדיין מוצגות.
- כשל קריאה (`getItem` זורק) → "אודות" מציג הודעת כשל קריאה, ו"התחל משחק" עדיין עובד.

הבדיקות הקיימות (`App.test.tsx`, `App.game.test.tsx`, `gameReducer.test.ts`, `audioEngine.test.ts`) ממשיכות לעבור; `localStorage` נמחק ב-`afterEach` ב-`src/test/setup.ts` כדי שבדיקות לא ישפיעו זו על זו.

### 8.3 בדיקה ידנית שלי (Dev Server, אמולציית מובייל 360–390px)
משחק עד הפסד ועד ניצחון → כרטיסים ב"אודות"; Refresh → הכרטיסים נשמרים; Refresh באמצע משחק → אין כרטיס; Dialog מחיקה – ביטול ומחיקה; מראה ה-Dialog והכרטיסים מול ה-Mockup; RTL וללא גלילה אופקית.

## 9. ADR חדש
**ADR-12: הודעות כשל ההיסטוריה – בהודעת הסיום ובמסך "אודות"**
- **הקשר:** ה-PRD דורש הודעה ברורה כששמירה או מחיקה נכשלות, בלי לחסום משחק, אבל אינו קובע היכן היא מוצגת.
- **החלטה:** כשל שמירה מוצג כשורה בהודעת הסיום (שם השחקן נמצא ברגע השמירה) וגם כהודעה במסך "אודות"; כשל קריאה וכשל מחיקה מוצגים במסך "אודות" בלבד. ההודעות נעלמות אחרי פעולה מוצלחת מאותו סוג. אין הודעות במסך הבית מחוץ להודעת הסיום.
- **השלכות:** אין רכיב Toast או שכבת הודעות כללית; מסך הבית נשאר כמו שהוא.

## 10. Definition of Done – איך ייבדק כל סעיף

| סעיף DoD | אימות |
|---|---|
| ניצחון/הפסד מוסיפים רשומה אחת עם זמן, שלבים ותוצאה | 8.2 (הפסד, ניצחון, Strict Mode) + בדיקה ידנית |
| מעבר מסכים, השהיה, Refresh או יציאה לא מוסיפים רשומה | 8.2 (השהיה, Hidden, Unmount) + Refresh ידני |
| מקסימום 10, מהחדש לישן, נשמרות אחרי Refresh | 8.1 (11 הוספות, Round-trip) + 8.2 (Seed) + ידני |
| "ביטול" לא משנה; "מחק" מרוקן ומחזיר חיווי ריק | 8.2 + ידני |
| כשל אחסון לא מונע משחק ומציג הודעה בעברית | 8.1 + 8.2 (שלושת סוגי הכשל) |
| בדיקות אוטומטיות להיסטוריה, עשר, מחיקה, כשל ושמירה כפולה | `npm test`, `npm run typecheck`, `npm run build` עוברים |
| Build עובד לפריסה (נוסף לבקשת המשתמש) | `npm run build`, ואז `npm run preview` ב-`http://localhost:4173/simon-game/`: שני המסכים, משחק, היסטוריה ומחיקה, ללא שגיאות קונסול או 404 |
| פריסה אוטומטית (הוקדמה מ-Milestone 5, ADR-13) | `.github/workflows/deploy.yml`; אחרי ה-Push: ה-Workflow ירוק ב-Actions ו-`https://gamorly.github.io/simon-game/` נטען כמשחק עובד |
