import { formatFinishedAt } from '../history/formatDate';
import type { GameResult } from '../history/historyStorage';

type Props = { result: GameResult };

export function HistoryCard({ result }: Props) {
  const won = result.outcome === 'win';
  return (
    <li className="card history-card">
      <div className="history-card__main">
        <p className="history-card__rounds">{`שלבים שהושלמו: ${result.completedRounds}`}</p>
        <p className={`history-card__outcome history-card__outcome--${result.outcome}`}>
          {`תוצאה: ${won ? 'ניצחון' : 'הפסד'}`}
        </p>
      </div>
      <time className="history-card__date" dateTime={result.finishedAt}>
        {formatFinishedAt(result.finishedAt)}
      </time>
    </li>
  );
}
