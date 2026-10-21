import type { ReactElement } from 'react';

export type Screen = 'home' | 'about';

type Props = {
  current: Screen;
  onNavigate: (screen: Screen) => void;
};

function HomeIcon() {
  return (
    <svg className="nav__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 3 2 11.5h3V21h5.5v-6h3v6H19v-9.5h3L12 3z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="nav__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <rect className="nav__icon-cut" x="10.75" y="10" width="2.5" height="8" rx="1" />
      <circle className="nav__icon-cut" cx="12" cy="7" r="1.5" />
    </svg>
  );
}

const TABS: { id: Screen; label: string; Icon: () => ReactElement }[] = [
  { id: 'home', label: 'בית', Icon: HomeIcon },
  { id: 'about', label: 'אודות', Icon: InfoIcon },
];

export function BottomNav({ current, onNavigate }: Props) {
  return (
    <nav className="nav" aria-label="ניווט ראשי">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`nav__tab${current === id ? ' nav__tab--active' : ''}`}
          aria-current={current === id ? 'page' : undefined}
          onClick={() => onNavigate(id)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
