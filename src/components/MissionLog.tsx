import type { ReactNode } from 'react';
import type { MissionLogEntry } from '../App';

interface MissionLogProps {
  history: MissionLogEntry[];
}

/** Left-border accent: mission start = green; blocked / shortened path = red; else default blue (see App.css). */
function historyEntryAccentClass(message: string): string {
  if (/^#1:\s*Mission start\b/.test(message)) return 'history-entry--start'
  if (/\bblocked\b/i.test(message)) return 'history-entry--alert'
  if (/command shortened from/i.test(message)) return 'history-entry--alert'
  return ''
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

/** Highlights “Mission start:” in #1 lines using --mission-log-start (see App.css). */
function missionLogMessageContent(message: string): ReactNode {
  const withColon = message.match(/^(#1:\s*)(Mission start:)(.*)$/);
  if (withColon) {
    return (
      <>
        {withColon[1]}
        <span className="history-entry__mission-start-label">{withColon[2]}</span>
        {withColon[3]}
      </>
    );
  }
  const legacyEmDash = message.match(/^(#1:\s*)(Mission start)( —.*)$/);
  if (legacyEmDash) {
    return (
      <>
        {legacyEmDash[1]}
        <span className="history-entry__mission-start-label">{legacyEmDash[2]}</span>
        {legacyEmDash[3]}
      </>
    );
  }
  return message;
}

const MissionLog: React.FC<MissionLogProps> = ({ history }) => (
  <div className="history-section">
    <h2>Mission Log</h2>
    <div className="history-container">
      {history.length === 0 ? (
        <p className="no-history">No commands executed yet.</p>
      ) : (
        history.map((entry, index) => (
          <div
            key={index}
            className={`history-entry ${historyEntryAccentClass(entry.message)}`.trim()}
          >
            <span className="history-entry__text">{missionLogMessageContent(entry.message)}</span>
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
