import { useEffect, useRef, useState } from 'react';
import { BottomNav, type Screen } from './components/BottomNav';
import { useGame } from './game/useGame';
import { useHistory } from './history/useHistory';
import { AboutScreen } from './screens/AboutScreen';
import { HomeScreen } from './screens/HomeScreen';

export function App() {
  // Screen switching is in-memory only: no router, no page reload
  const [screen, setScreen] = useState<Screen>('home');
  // Game state lives here so it survives screen switches
  const game = useGame();
  const history = useHistory();
  const { record } = history;

  // Record each finished game once, on entering won/lost (ADR-4).
  // The gameId guard also covers StrictMode's double effect run.
  const recordedGameId = useRef(0);
  const { status, gameId, completedRounds } = game.state;
  useEffect(() => {
    if (status !== 'won' && status !== 'lost') return;
    if (recordedGameId.current === gameId) return;
    recordedGameId.current = gameId;
    record(status === 'won' ? 'win' : 'loss', completedRounds);
  }, [status, gameId, completedRounds, record]);

  const navigate = (next: Screen) => {
    if (next === screen) return;
    if (next === 'about') game.pause();
    setScreen(next);
    window.scrollTo(0, 0);
  };

  return (
    <div className="app">
      {screen === 'home' ? (
        <HomeScreen game={game} saveFailed={history.saveFailed} />
      ) : (
        <AboutScreen history={history} />
      )}
      <BottomNav current={screen} onNavigate={navigate} />
    </div>
  );
}
