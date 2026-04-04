import type { MissionLogEntry } from '../App';

interface MissionLogProps {
  history: MissionLogEntry[];
}

function formatMissionLogTimestamp(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  })
    .format(new Date(ms))
    .toUpperCase();
}

const MissionLog: React.FC<MissionLogProps> = ({ history }) => (
  <div className="history-section">
    <h2>Mission Log</h2>
    <div className="history-container">
      {history.length === 0 ? (
        <p className="no-history">No commands executed yet.</p>
      ) : (
        history.map((entry, index) => (
          <div key={index} className="history-entry">
            <span className="history-entry__text">{entry.message}</span>
            <span className="history-entry__time">
              {entry.at != null ? (
                <time dateTime={new Date(entry.at).toISOString()}>
                  {formatMissionLogTimestamp(entry.at)}
                </time>
              ) : (
                <span className="history-entry__time-placeholder">—</span>
              )}
            </span>
          </div>
        ))
      )}
    </div>
  </div>
);

export default MissionLog;
