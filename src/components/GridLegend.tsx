import React from 'react';

const GridLegend: React.FC = () => (
  <div className="grid-legend">
    <div className="legend-item">
      <div className="legend-color rover-here"></div>
      <span>Rover Position</span>
    </div>
    <div className="legend-item">
      <div className="legend-color perimeter"></div>
      <span>Perimeter</span>
    </div>
  </div>
);

export default GridLegend; 