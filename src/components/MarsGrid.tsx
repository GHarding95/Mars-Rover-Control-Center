import { useRef, useState, useEffect } from 'react';

interface GridCell {
  id: number;
  isRoverHere: boolean;
  isPerimeter: boolean;
}

interface MarsGridProps {
  grid: GridCell[];
  roverPosition: number;
  gridViewCenter: { row: number; col: number };
  setGridViewCenter: (center: { row: number; col: number }) => void;
  onReturnToRover: () => void;
  gridViewSize: number;
}

const MarsGrid: React.FC<MarsGridProps> = ({ grid, roverPosition, gridViewCenter, setGridViewCenter, onReturnToRover, gridViewSize }) => {
  const dragging = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const gridViewCenterRef = useRef(gridViewCenter);
  const [, setDraggingState] = useState(false); // for re-render
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  /** Measured CSS cell size so pan sensitivity matches responsive grid-cell dimensions. */
  const cellSizePx = useRef(25);

  gridViewCenterRef.current = gridViewCenter;

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => {
      const cell = grid.querySelector('.grid-cell');
      if (cell instanceof HTMLElement) {
        const w = cell.getBoundingClientRect().width;
        if (w > 0) cellSizePx.current = w;
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [gridViewSize]);

  // Calculate rover's actual position
  const roverRow = Math.floor((roverPosition - 1) / 100) + 1;
  const roverCol = ((roverPosition - 1) % 100) + 1;

  // Calculate view window based on gridViewCenter and gridViewSize
  let viewStartRow = gridViewCenter.row - Math.floor(gridViewSize / 2) + 1;
  let viewStartCol = gridViewCenter.col - Math.floor(gridViewSize / 2) + 1;
  if (viewStartRow < 1) viewStartRow = 1;
  if (viewStartRow > 101 - gridViewSize) viewStartRow = 101 - gridViewSize;
  if (viewStartCol < 1) viewStartCol = 1;
  if (viewStartCol > 101 - gridViewSize) viewStartCol = 101 - gridViewSize;

  // Mouse/touch drag handlers (same as before)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setDraggingState(true);
  };
  const handleMouseUp = () => {
    dragging.current = false;
    lastPos.current = null;
    setDraggingState(false);
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging.current || !lastPos.current) return;
    e.preventDefault();
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    const cellSize = Math.max(1, cellSizePx.current);
    if (Math.abs(dx) >= cellSize || Math.abs(dy) >= cellSize) {
      const dCol = -Math.round(dx / cellSize);
      const dRow = -Math.round(dy / cellSize);
      let newRow = gridViewCenter.row + dRow;
      let newCol = gridViewCenter.col + dCol;
      if (newRow < 1) newRow = 1;
      if (newRow > 100) newRow = 100;
      if (newCol < 1) newCol = 1;
      if (newCol > 100) newCol = 100;
      setGridViewCenter({ row: newRow, col: newCol });
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  };
  // Touch: React's delegated listeners are passive, so preventDefault() fails.
  // Native listeners with { passive: false } allow blocking scroll while panning.
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      dragging.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setDraggingState(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current || !lastPos.current) return;
      e.preventDefault();
      const center = gridViewCenterRef.current;
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;
      const cellSize = Math.max(1, cellSizePx.current);
      if (Math.abs(dx) >= cellSize || Math.abs(dy) >= cellSize) {
        const dCol = -Math.round(dx / cellSize);
        const dRow = -Math.round(dy / cellSize);
        let newRow = center.row + dRow;
        let newCol = center.col + dCol;
        if (newRow < 1) newRow = 1;
        if (newRow > 100) newRow = 100;
        if (newCol < 1) newCol = 1;
        if (newCol > 100) newCol = 100;
        setGridViewCenter({ row: newRow, col: newCol });
        lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchEnd = () => {
      dragging.current = false;
      lastPos.current = null;
      setDraggingState(false);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [setGridViewCenter]);

  // Prevent scroll when mouse/touch is over grid
  useEffect(() => {
    const gridEl = gridContainerRef.current;
    if (!gridEl) return;
    const preventScroll = (e: Event) => {
      e.preventDefault();
    };
    const scrollBlockOpts: AddEventListenerOptions = { passive: false };
    const enable = () => {
      window.addEventListener('wheel', preventScroll, scrollBlockOpts);
      window.addEventListener('touchmove', preventScroll, scrollBlockOpts);
    };
    const disable = () => {
      window.removeEventListener('wheel', preventScroll, scrollBlockOpts);
      window.removeEventListener('touchmove', preventScroll, scrollBlockOpts);
    };
    gridEl.addEventListener('mouseenter', enable);
    gridEl.addEventListener('mouseleave', disable);
    gridEl.addEventListener('touchstart', enable);
    gridEl.addEventListener('touchend', disable);
    gridEl.addEventListener('touchcancel', disable);
    return () => {
      disable();
      gridEl.removeEventListener('mouseenter', enable);
      gridEl.removeEventListener('mouseleave', disable);
      gridEl.removeEventListener('touchstart', enable);
      gridEl.removeEventListener('touchend', disable);
      gridEl.removeEventListener('touchcancel', disable);
    };
  }, []);

  // Disable scrolling when mouse is over the grid
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="grid-section">
      <h2>Mars Surface Grid (100x100)</h2>
      <p className="grid-info">
        Drag to pan and explore the grid, Rover is in the blue cell.
      </p>
      <div
        className="grid-container"
        ref={gridContainerRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        // onMouseEnter/onMouseLeave handled by event listeners; touch uses native listeners (see useEffect)
      >
        <div
          ref={gridRef}
          className="grid"
          style={{ cursor: dragging.current ? 'grabbing' : 'grab', gridTemplateColumns: `repeat(${gridViewSize}, 1fr)` }}
        >
          {Array.from({ length: gridViewSize }, (_, rowIndex) => (
            <div key={rowIndex} className="grid-row">
              {Array.from({ length: gridViewSize }, (_, colIndex) => {
                const actualRow = viewStartRow + rowIndex;
                const actualCol = viewStartCol + colIndex;
                const squareNumber = (actualRow - 1) * 100 + actualCol;
                const isValidSquare = actualRow >= 1 && actualRow <= 100 && actualCol >= 1 && actualCol <= 100;
                if (!isValidSquare) return null;
                const cell = grid.find(c => c.id === squareNumber);
                const isRoverHere = actualRow === roverRow && actualCol === roverCol;
                const isPerimeter = isValidSquare && cell?.isPerimeter;
                return (
                  <div
                    key={colIndex}
                    className={`grid-cell ${
                      isRoverHere ? 'rover-here' : ''
                    } ${
                      isPerimeter ? 'perimeter' : ''
                    }`}
                    title={`Square ${squareNumber} (Row ${actualRow}, Col ${actualCol})`}
                  >
                    {isRoverHere && null}
                    <span className="square-number">{squareNumber}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
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
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
        <button
          className="return-to-rover-btn"
          onClick={onReturnToRover}
        >
          Return to Rover
        </button>
      </div>
    </div>
  );
};

export default MarsGrid; 