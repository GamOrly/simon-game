# תוכנית – Milestone 3: השהיה וחידוש משחק

מקורות: `MILESTONES.md` (Milestone 3), `PRD.md` §3 ("מעבר למסך אודות והמשך משחק"), §4.3, §4ב (Edge Cases), §163; `DESIGN.md` §1.1 (מצב "מושהה", טבלת הקצב), §1.4; `ARCHITECTURE.md` §2.3–2.6, ADR-3, ADR-10. נקודת המוצא: הקוד של Milestone 2 (`gameReducer`, `useGame`, `sequenceController`, `HomeScreen`, `App`).

**מחוץ לתכולה באבן דרך זו:** היסטוריה ב-`localStorage` (Milestone 4), PWA/Offline ופריסה (Milestone 5). אין שינוי בכללי המשחק, בקצב ההצגה או במבנה המסכים.

---

## 1. מבנה כללי

```text
App ── useGame()
 │      ├── gameReducer       ← מצב חדש 'paused'; Actions חדשים pause / resume; abandon מוסר
 │      ├── pause()           ← נקודת השהיה אחת: ניווט ל"אודות", visibilitychange→hidden, pagehide
 │      ├── resumeGame()      ← רק מתוך לחיצה על "המשך משחק": unlockAudio() ואז resume
 │      └── Visibility Handler (useEffect על document/window)
 ├── HomeScreen  ← מצב "מושהה": לוח מעומעם, "המשחק מושהה", כפתור "המשך משחק"
 └── BottomNav   ← מעבר ל"אודות" קורא ל-game.pause() (במקום abandon)
```

## 2. קבצים

| קובץ | פעולה | תוכן |
|---|---|---|
| `src/game/gameReducer.ts` | שינוי | `'paused'` ב-`GameStatus`; Actions `pause` ו-`resume`; הסרת `abandon` (סעיף 3) |
| `src/game/useGame.ts` | שינוי | `pause()`, `resumeGame()`, Visibility Handler, הסרת `abandon()` (סעיף 4) |
| `src/App.tsx` | שינוי | ניווט ל"אודות" → `game.pause()` |
| `src/screens/HomeScreen.tsx` | שינוי | טקסטים וכפתור למצב `paused`; הודעת כשל אודיו גם לחידוש (סעיף 5) |
| `src/game/sequenceController.ts` | ללא שינוי צפוי | כבר תומך ב-`AbortSignal` ומבטל Timers והארה מיד |
| `src/styles/board.css` / `components.css` | שינוי קל לפי הצורך | עמעום מלא של הלוח במצב מושהה (`board--dimmed` הקיים כנראה מספיק) |
| `src/game/gameReducer.test.ts` | שינוי | בדיקות `pause`/`resume` במקום `abandon` |
| `src/App.game.test.tsx` | שינוי | החלפת קבוצת הבדיקות "temporary until Milestone 3" בבדיקות השהיה/חידוש (סעיף 6) |
| `spec/ARCHITECTURE.md` | הוספה | ADR-11 – השהיה בחלון שבין שלבים (סעיף 3.3) |
| `spec/MILESTONES.md` | סימון | 🟡 בסיום הבנייה |

## 3. Game Reducer

### 3.1 State
```ts
type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'paused' | 'won' | 'lost';
```
שאר השדות ללא שינוי. `isGameActive()` נשאר `presenting || awaitingInput` (מצב "פעיל" = שניתן להשהות). מוסיפים פונקציית עזר `isPaused` רק אם נוח ל-UI.

### 3.2 Actions (כל Action מתקבל רק במצב המותר לו; אחרת מוחזר אותו State)

| Action | מותר מ- | תוצאה |
|---|---|---|
| `pause` | `presenting`, `awaitingInput` | `status: 'paused'`, `inputIndex: 0`, `round: sequence.length` (סעיף 3.3), `presentationId + 1` (כל Callback מיושן – `presentationDone` / `showNextRound` – יתעלם). `sequence`, `completedRounds`, `gameId` ללא שינוי |
| `resume` | `paused` | `status: 'presenting'`, `inputIndex: 0`, `presentationId + 1`; אותו `sequence` ואותו `round` – אין צבע חדש |
| `press` | `awaitingInput` בלבד (קיים) | לחיצה ב-`paused` מתעלמת אוטומטית |
| `start` | `idle` בלבד (קיים) | אין "התחל משחק" במצב מושהה |
| `abandon` | — | **מוסר** (הפתרון הזמני של Milestone 2, לפי ADR-3) |

השהיה של `idle`, `won`, `lost` או `paused` אינה משנה דבר (ADR-3). ריבוי `resume` לא אפשרי: רק הראשון מ-`paused` מתקבל.

### 3.3 השהיה בחלון שבין שלבים (→ ADR-11)
לפי ADR-10, אחרי שחזור נכון של שלב המצב הוא `presenting` כשהצבע החדש כבר נוסף, אבל `round` עדיין מציג את השלב שהושלם (במשך 1000ms, עד `showNextRound`). אם ההשהיה קורית בדיוק בחלון הזה – השלב הקודם כבר הושלם בהצלחה, ולכן `pause` מקבע `round = sequence.length` (השלב הבא). בחידוש: `round === sequence.length`, ולכן ה-Controller מציג את הרצף כרגיל עם המתנה של `1000ms` (`leadIn`) – בלי החזקה כפולה של מספר השלב. בשאר המקרים `round` כבר שווה ל-`sequence.length` והשורה הזו לא משנה דבר.

> חלופה שנדחתה: להסיר את הצבע שנוסף ולחזור על השלב שהושלם – הייתה מבטלת שלב שהשחקן כבר שחזר נכון.

## 4. `useGame`

### 4.1 `pause()` – נקודת השהיה אחת
משמשת את הניווט, את `visibilitychange` ואת `pagehide`:
1. ביטול התחלה/חידוש שבתהליך (`startToken.current++`, איפוס דגלי `starting`/`resuming`) – כך ש-`unlockAudio()` שמסתיים מאוחר לא יתחיל הצגה.
2. `endPress()` – עצירת לחיצה מוחזקת (Timer + צליל).
3. אם `isGameActive(stateRef.current)`: `stopAll()`, `setActiveColor(null)`, ו-`dispatch({ type: 'pause' })`.
4. ה-`useEffect` של ההצגה תלוי ב-`status`/`presentationId`, ולכן שינוי ל-`paused` מריץ את ה-Cleanup שלו (`controller.abort()`), שמבטל מיד את כל ה-Timers של ההצגה וקורא ל-`onColorOff` של הצבע הדולק.

### 4.2 `resumeGame()` – רק מתוך הלחיצה על "המשך משחק"
אותו דפוס של `startGame()`: בדיקה ש-`status === 'paused'` ושאין חידוש בתהליך; `unlockAudio()` נקרא סינכרונית בתוך ה-Click (מדיניות Autoplay); בהצלחה – `dispatch({ type: 'resume' })`; בכשל – נשארים `paused` ומוצגת הודעה (ARCHITECTURE §2.5). Token מבטל חידוש שהתיישן (למשל, הסתרה בזמן ש-`unlockAudio` עדיין רץ). לחיצה כפולה מהירה מייצרת הצגה אחת בלבד (Guard ב-Hook + Guard ב-Reducer).

### 4.3 Visibility Handler
`useEffect` אחד ב-`useGame`:
- `document` `visibilitychange`: אם `document.visibilityState === 'hidden'` → `pause()`. חזרה ל-`visible` – **לא עושה דבר** (אין Resume אוטומטי).
- `window` `pagehide` → `pause()` (Safety Net; ממילא אין שמירה מתמידה, ו-Refresh מאפס).
- הסרת המאזינים ב-Cleanup.

### 4.4 הסרת `abandon()`
מוסרים הפונקציה, ה-Action והבדיקות שלה. `App.navigate` קורא ל-`game.pause()` במעבר ל"אודות". חזרה ל"בית" לא קוראת לשום פעולת משחק.

### 4.5 מה לא משתנה
- משחק שהסתיים (`won`/`lost`) לא מושפע מניווט/הסתרה – ההודעה תופיע כרגיל (ADR-3).
- אין כתיבה ל-`localStorage`; מצב מושהה חי ב-Memory בלבד, ו-Refresh מחזיר ל"לפני תחילת משחק".
- `AudioContext` נפתח/מחודש רק ב-"התחל משחק" וב-"המשך משחק".

## 5. UI – HomeScreen

| מצב | חיווי שלב | שורת סטטוס | לוח | אזור פעולה |
|---|---|---|---|---|
| `paused` | `שלב X מתוך 10` (השלב הנוכחי, ללא שינוי) | **"המשחק מושהה"** | כל הרבעים מעומעמים, ללא Glow, קלט חסום (`dimmed`, `inputEnabled=false`) | כפתור ראשי כחול **"המשך משחק"** |

- הכפתור **"המשך משחק"** מוצג רק ב-`paused`; **"התחל משחק"** רק ב-`idle`.
- כשל אודיו בחידוש: **"לא הצלחנו להפעיל את הצלילים. לחצו שוב על "המשך משחק"."** (`role="alert"`), באותו סגנון של הודעת ההתחלה הקיימת. ההודעה מתאימה את שם הכפתור למצב.
- אחרי לחיצה על "המשך משחק" – חזרה למצב "הצגת רצף" הרגיל ("המשחק מציג את הרצף").

## 6. בדיקות

### 6.1 Reducer (`gameReducer.test.ts`)
- `pause` מ-`presenting` ומ-`awaitingInput` (אחרי קלט חלקי): `status='paused'`, `inputIndex=0`, אותו `sequence`, אותו `round`, `presentationId` עלה.
- `pause` בחלון שבין שלבים מקבע `round = sequence.length`; `completedRounds` נשאר.
- `pause` מ-`idle` / `won` / `lost` / `paused` מחזיר את אותו State.
- `presentationDone` / `showNextRound` עם `presentationId` ישן אחרי `pause` – מתעלמים.
- `press` ב-`paused` – מתעלם.
- `resume` מ-`paused`: `presenting`, אותו `sequence` ו-`round`, `presentationId` חדש; `resume` שני / `resume` מכל מצב אחר – מתעלם.

### 6.2 אינטגרציה (`App.game.test.tsx`, Fake Timers ו-Mocks קיימים)
- מעבר ל"אודות" **בזמן הצגת רצף**: `stopAll` נקרא, אין רבע דולק, `vi.getTimerCount() === 0`. חזרה ל"בית": "המשחק מושהה", "המשך משחק", אין "התחל משחק", אותו שלב. המתנה ארוכה (Timers) – שום דבר לא מתחיל מעצמו.
- מעבר ל"אודות" **בזמן תור השחקן**, אחרי חלק מהקלט ועם אצבע מוחזקת: הצליל נעצר; אחרי "המשך משחק" מוצג **כל** הרצף מההתחלה (אותם צבעים, אותו אורך, אין צבע חדש), ואז השחקן משחזר מההתחלה ומתקדם לשלב הבא כרגיל.
- `visibilitychange` ל-`hidden` משהה באותו אופן; חזרה ל-`visible` לא מחדשת. `pagehide` משהה.
- השהיה בחלון שבין שלבים: אחרי חידוש מוצג השלב הבא, הרצף שלו מוצג במלואו, ומספר השלב לא קופץ פעמיים.
- לחיצות על הלוח במצב מושהה – לא משפיעות.
- לחיצה כפולה מהירה על "המשך משחק" – הצגה אחת בלבד (מספר קריאות `startTone` תואם לאורך הרצף).
- כשל `unlockAudio` בחידוש – נשארים מושהים עם הודעה; ניסיון חוזר מצליח.
- הסתרה בזמן ש-`unlockAudio` של "המשך משחק" עוד לא הסתיים – אין הצגה; המשחק נשאר מושהה.
- השהיה לא מסיימת משחק: אין הודעת הפסד/ניצחון, ו-`completedRounds` ללא שינוי.
- ניווט/הסתרה ב-`idle` וב-`won`/`lost` – ללא שינוי (אין "המשך משחק"; הודעת התוצאה מופיעה כרגיל).
- טעינה מחדש (Render חדש) – מצב התחלתי.
- מסירים את קבוצת הבדיקות "leaving to About mid-game (temporary until Milestone 3)".

### 6.3 בדיקה ידנית (דפדפן מובייל/אמולציה, ובטלפון האמיתי דרך ה-Wi-Fi)
- מעבר ל"אודות" באמצע הצגה ובאמצע שחזור, חזרה, "המשך משחק".
- נעילת הטלפון ומעבר לאפליקציה אחרת באמצע משחק, חזרה – מושהה, ללא צליל, ללא המשך אוטומטי; "המשך משחק" מחזיר את הצלילים.
- מה שלא ניתן לבדוק בפועל (למשל התנהגות מערכת הפעלה מסוימת) – יסומן כלא נבדק, לא כעובר.

## 7. סדר עבודה
1. Reducer: `paused`, `pause`, `resume`, הסרת `abandon` + בדיקות יחידה.
2. `useGame`: `pause()`, `resumeGame()`, Visibility Handler.
3. `App` ו-`HomeScreen`: חיבור הניווט, מצב "מושהה" וכפתור "המשך משחק".
4. בדיקות אינטגרציה; הסרת הבדיקות הזמניות.
5. `npm test`, `npm run typecheck`, `npm run build`; בדיקה בדפדפן (כולל אמולציית מובייל והסתרת טאב).
6. ADR-11 ב-`ARCHITECTURE.md`; סימון 🟡 ב-`MILESTONES.md`.

## 8. מיפוי ל-Definition of Done

| תנאי | איך מתקיים / נבדק |
|---|---|
| מעבר ל"אודות" בזמן הצגה ובזמן שחזור משהה ועוצר מיד הארה וצליל | `pause()` → `stopAll`, `endPress`, Abort של ההצגה; בדיקות 6.2 (שני המקרים) + בדיקה ידנית |
| חזרה ל"בית" לא מפעילה את הרצף; "המשך משחק" רק במשחק מושהה | אין פעולה בחזרה; כפתור לפי `status === 'paused'`; בדיקות 6.2 (כולל `idle`/`won`/`lost`) |
| "המשך משחק" מציג את כל הרצף, גם אם חלק הוקש; שלב ללא שינוי ובלי צבע חדש | `resume` שומר `sequence`/`round` ומאפס `inputIndex`; בדיקות 6.1 + 6.2 |
| הסתרת האפליקציה וחזרה – אותו כלל, ללא שינוי מ-Callback שבוטל | Visibility Handler → אותה `pause()`; `presentationId` + Abort; בדיקות 6.2 (`visibilitychange`, `pagehide`, Timers ריקים, חידוש מיושן) |
| השהיה אינה הפסד; Refresh מאפס | אין מעבר ל-`lost`; אין אחסון מתמיד; בדיקות 6.2 |
