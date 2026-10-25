import { useCallback, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { HistoryCard } from '../components/HistoryCard';
import type { History } from '../history/useHistory';

type Props = { history: History };

export function AboutScreen({ history }: Props) {
  const { results, loadFailed, saveFailed, clearFailed } = history;
  // Local state: leaving About closes the dialog
  const [confirming, setConfirming] = useState(false);

  const cancel = useCallback(() => setConfirming(false), []);
  const confirm = () => {
    history.clear();
    setConfirming(false);
  };

  return (
    <main className="screen screen--about">
      <header className="screen__header">
        <h1 className="screen__title">אודות</h1>
      </header>

      <section className="card about__intro" aria-labelledby="about-game-title">
        <h2 id="about-game-title" className="card__title">
          על המשחק
        </h2>
        <p>
          סיימון הוא משחק זיכרון: המשחק מציג רצף של צבעים וצלילים, ואתם צריכים לחזור עליו
          בדיוק באותו סדר.
        </p>
        <ul className="about__steps">
          <li>לחצו על "התחל משחק".</li>
          <li>צפו והקשיבו לרצף הצבעים.</li>
          <li>הקישו על הצבעים באותו סדר.</li>
          <li>בכל שלב מתווסף צבע אחד לרצף.</li>
          <li>טעות אחת מסיימת את המשחק.</li>
          <li>השלימו את שלב 10 כדי לנצח!</li>
        </ul>
        <p className="about__note">
          שימו לב: ודאו שהטלפון אינו במצב שקט. במכשירים מסוימים (למשל iPhone) הצלילים לא
          נשמעים במצב שקט.
        </p>
      </section>

      <section className="history" aria-labelledby="history-title">
        <h2 id="history-title" className="history__title">
          10 המשחקים האחרונים
        </h2>

        {loadFailed && (
          <p className="notice notice--error" role="alert">
            לא ניתן לקרוא את ההיסטוריה השמורה. אפשר להמשיך לשחק, אבל ייתכן שתוצאות לא יישמרו.
          </p>
        )}
        {saveFailed && (
          <p className="notice notice--error" role="alert">
            שמירת התוצאה האחרונה נכשלה.
          </p>
        )}
        {clearFailed && (
          <p className="notice notice--error" role="alert">
            מחיקת ההיסטוריה נכשלה. נסו שוב.
          </p>
        )}

        {results.length > 0 ? (
          <>
            <ol className="history__list" aria-labelledby="history-title">
              {results.map((result) => (
                <HistoryCard key={result.id} result={result} />
              ))}
            </ol>
            <div className="history__actions">
              <button type="button" className="btn-secondary" onClick={() => setConfirming(true)}>
                מחק היסטוריה
              </button>
            </div>
          </>
        ) : (
          <p className="card history__empty">עדיין אין משחקים שמורים.</p>
        )}
      </section>

      {confirming && <ConfirmDialog onCancel={cancel} onConfirm={confirm} />}
    </main>
  );
}
