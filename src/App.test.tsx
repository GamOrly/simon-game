import { fireEvent, render, screen, within } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders the home screen before a game starts', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'סיימון' })).toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
  });

  it('places the four colors in their board positions', () => {
    render(<App />);
    const board = screen.getByRole('group', { name: 'לוח המשחק' });

    const position = (name: string) =>
      within(board).getByRole('button', { name }).getAttribute('data-position');

    expect(within(board).getAllByRole('button')).toHaveLength(4);
    expect(position('ירוק')).toBe('top-left');
    expect(position('אדום')).toBe('top-right');
    expect(position('צהוב')).toBe('bottom-left');
    expect(position('כחול')).toBe('bottom-right');
  });

  it('has exactly two navigation tabs', () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'ניווט ראשי' });

    const tabs = within(nav).getAllByRole('button');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['בית', 'אודות']);
    expect(within(nav).getByRole('button', { name: 'בית' })).toHaveAttribute('aria-current', 'page');
  });

  it('navigates to About and back without reloading the page', () => {
    const hrefBefore = window.location.href;
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'ניווט ראשי' });

    fireEvent.click(within(nav).getByRole('button', { name: 'אודות' }));

    expect(screen.getByRole('heading', { level: 1, name: 'אודות' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'על המשחק' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '10 המשחקים האחרונים' })).toBeInTheDocument();
    expect(screen.getByText('עדיין אין משחקים שמורים.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'לוח המשחק' })).not.toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'אודות' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(within(nav).getByRole('button', { name: 'בית' }));

    expect(screen.getByRole('group', { name: 'לוח המשחק' })).toBeInTheDocument();
    expect(window.location.href).toBe(hrefBefore);
  });
});
