interface MissionLogProps {
  history: string[];
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
            {entry}
          </div>
        ))
      )}
    </div>
  </div>
);

export default MissionLog; 