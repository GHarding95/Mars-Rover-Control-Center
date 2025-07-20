interface CommandPanelProps {
  commands: string[];
  error: string;
  onCommandChange: (index: number, value: string) => void;
  onExecute: () => void;
  onReset: () => void;
}

const CommandPanel: React.FC<CommandPanelProps> = ({
  commands,
  error,
  onCommandChange,
  onExecute,
  onReset,
}) => {
  // Handler for Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onExecute();
    }
  };

  return (
    <div className="command-section">
      <h2>Mission Commands</h2>
      <p className="command-help">Enter up to 5 commands (e.g., "50m", "left", "23m, left, 4m")</p>
      <div className="command-inputs">
        {commands.map((command, index) => (
          <input
            key={index}
            type="text"
            value={command}
            onChange={e => onCommandChange(index, e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Command ${index + 1}`}
            className="command-input"
          />
        ))}
      </div>
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      <div className="command-buttons">
        <button onClick={onExecute} className="execute-btn">
          <span className="button-content">
            <span className="execute-emoji">🚀</span>
            <span>Execute Commands</span>
          </span>
        </button>
        <button onClick={onReset} className="reset-btn">
          <span className="button-content">
            <span className="reset-emoji">🔄</span>
            <span>Reset Rover</span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default CommandPanel; 