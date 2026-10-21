import { PrimaryButton } from '../components/PrimaryButton';
import { ResultDialog } from '../components/ResultDialog';
import { SimonBoard } from '../components/SimonBoard';
import { MAX_ROUNDS } from '../game/constants';
import type { Game } from '../game/useGame';

type Props = { game: Game };

const START_LABEL = 'התחל משחק';
const RESUME_LABEL = 'המשך משחק';

export function HomeScreen({ game }: Props) {
  const { state, activeColor, resultVisible, audioError } = game;
  const { status } = state;

  const statusText =
    status === 'presenting'
      ? 'המשחק מציג את הרצף'
      : status === 'awaitingInput'
        ? 'התור שלך'
        : status === 'paused'
          ? 'המשחק מושהה'
          : '';
  const hintText =
    status === 'presenting' ? 'המתן…' : status === 'awaitingInput' ? 'הקש על הצבעים לפי הסדר' : '';

  return (
    <main className="screen screen--home">
      <header className="screen__header">
        <h1 className="screen__title">סיימון</h1>
      </header>
      <div className="home__info">
        <p className="stage" role="status">
          {`שלב ${state.round} מתוך ${MAX_ROUNDS}`}
        </p>
        <p className="home__status" aria-live="polite">
          {statusText}
        </p>
      </div>

      <SimonBoard
        activeColor={activeColor}
        dimmed={status === 'presenting' || status === 'paused'}
        inputEnabled={status === 'awaitingInput'}
        onPadDown={game.padDown}
        onPadUp={game.padUp}
      />

      <div className="home__actions">
        {status === 'idle' || status === 'paused' ? (
          <>
            {status === 'idle' ? (
              <PrimaryButton onClick={game.startGame}>{START_LABEL}</PrimaryButton>
            ) : (
              <PrimaryButton onClick={game.resumeGame}>{RESUME_LABEL}</PrimaryButton>
            )}
            {audioError && (
              <p className="home__error" role="alert">
                {`לא הצלחנו להפעיל את הצלילים. לחצו שוב על "${status === 'idle' ? START_LABEL : RESUME_LABEL}".`}
              </p>
            )}
          </>
        ) : (
          <p className="home__hint">{hintText}</p>
        )}
      </div>

      {resultVisible && (status === 'won' || status === 'lost') && (
        <ResultDialog outcome={status} completedRounds={state.completedRounds} onConfirm={game.dismiss} />
      )}
    </main>
  );
}
