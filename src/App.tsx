import { useState } from 'react';
import { BottomNav, type Screen } from './components/BottomNav';
import { AboutScreen } from './screens/AboutScreen';
import { HomeScreen } from './screens/HomeScreen';

export function App() {
  // Screen switching is in-memory only: no router, no page reload
  const [screen, setScreen] = useState<Screen>('home');

  const navigate = (next: Screen) => {
    if (next === screen) return;
    setScreen(next);
    window.scrollTo(0, 0);
  };

  return (
    <div className="app">
      {screen === 'home' ? <HomeScreen /> : <AboutScreen />}
      <BottomNav current={screen} onNavigate={navigate} />
    </div>
  );
}
