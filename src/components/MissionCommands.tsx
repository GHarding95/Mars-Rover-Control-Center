function IconExecute() {
  return (
    <svg
      className="command-btn-icon"
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path fill="currentColor" d="M8 5v14l11-7-11-7z" />
    </svg>
  )
}

function IconReset() {
  return (
    <svg
      className="command-btn-icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      focusable="false"
    >
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M3 21v-5h5"
      />
    </svg>
  )
}

interface MissionCommandsProps {
  commands: string[];
  error: string;
  onCommandChange: (index: number, value: string) => void;
  onExecute: () => void;
  onReset: () => void;
}

const MissionCommands: React.FC<MissionCommandsProps> = ({
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
      <p className="command-help">Enter up to 5 commands (e.g., "50m", "East", "25m", "South", "4m")</p>
      <form
        className="command-inputs"
        autoComplete="off"
        onSubmit={e => e.preventDefault()}
      >
        {commands.map((command, index) => (
          <input
            key={index}
            type="text"
            name={`mission-command-${index + 1}`}
            value={command}
            onChange={e => onCommandChange(index, e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Command ${index + 1}`}
            className="command-input"
            autoComplete="off"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        ))}
      </form>
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      <div className="command-buttons">
        <button type="button" onClick={onExecute} className="execute-btn">
          <span className="button-content">
            <IconExecute />
            <span>Execute Commands</span>
          </span>
        </button>
        <button type="button" onClick={onReset} className="reset-btn">
          <span className="button-content">
            <IconReset />
            <span>Reset Rover</span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default MissionCommands;
