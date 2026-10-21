import { PrimaryButton } from '../components/PrimaryButton';
import { SimonBoard } from '../components/SimonBoard';

export function HomeScreen() {
  return (
    <main className="screen screen--home">
      <header className="screen__header">
        <h1 className="screen__title">סיימון</h1>
      </header>
      <p className="stage" role="status">
        שלב 1 מתוך 10
      </p>
      <SimonBoard />
      <div className="home__actions">
        {/* Game logic is wired up in Milestone 2 */}
        <PrimaryButton>התחל משחק</PrimaryButton>
      </div>
    </main>
  );
}
