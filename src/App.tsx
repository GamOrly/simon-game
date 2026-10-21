import { useState } from 'react';
import { BottomNav, type Screen } from './components/BottomNav';
import { useGame } from './game/useGame';
import { AboutScreen } from './screens/AboutScreen';
import { HomeScreen } from './screens/HomeScreen';

export function App() {
  // Screen switching is in-memory only: no router, no page reload
  const [screen, setScreen] = useState<Screen>('home');
  // Game state lives here so it survives screen switches
  const game = useGame();

  const navigate = (next: Screen) => {
    if (next === screen) return;
    if (next === 'about') game.pause();
    setScreen(next);
    window.scrollTo(0, 0);
  };

  return (
    <div className="app">
      {screen === 'home' ? <HomeScreen game={game} /> : <AboutScreen />}
      <BottomNav current={screen} onNavigate={navigate} />
    </div>
  );
}
