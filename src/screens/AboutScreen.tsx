export function AboutScreen() {
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
        <p className="card history__empty">עדיין אין משחקים שמורים.</p>
      </section>
    </main>
  );
}
