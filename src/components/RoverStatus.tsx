interface RoverStatusProps {
  position: number;
  direction: 'North' | 'South' | 'East' | 'West';
  isAtPerimeter: boolean;
  gridPos: { row: number; col: number };
}

const RoverStatus: React.FC<RoverStatusProps> = ({ position, direction, isAtPerimeter, gridPos }) => (
  <div className="rover-status">
    <h2>Rover Status</h2>
    <div className="status-display">
      <div className="status-item">
        <span className="label">Position:</span>
        <span className="value">Square {position}</span>
      </div>
      <div className="status-item">
        <span className="label">Direction:</span>
        <span className="value">{direction}</span>
      </div>
      <div className="status-item">
        <span className="label">Grid Coordinates:</span>
        <span className="value">Row {gridPos.row}, Col {gridPos.col}</span>
      </div>
      {isAtPerimeter && (
        <div className="status-item warning">
          <span className="label"><span className="warning-emoji">⚠️</span> Status:</span>
          <span className="value">PERIMETER REACHED</span>
        </div>
      )}
    </div>
  </div>
);

export default RoverStatus; 