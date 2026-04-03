import type { KeyboardEvent } from 'react';
import type { Direction } from '../App';

interface DirectionCompassProps {
  direction: Direction;
  onDirectionExecute?: (direction: Direction) => void;
}

/** SVG rotation (degrees): 0° = East (+x), 90° = South, etc. */
const directionNeedleAngle: Record<Direction, number> = {
  East: 0,
  South: 90,
  West: 180,
  North: -90,
};

/** Letter position and generous hit rect (x, y, w, h) in viewBox units */
const CARDINALS: {
  dir: Direction;
  letter: string;
  tx: number;
  ty: number;
  hit: [number, number, number, number];
}[] = [
  { dir: 'North', letter: 'N', tx: 100, ty: 28, hit: [68, 2, 64, 40] },
  { dir: 'East', letter: 'E', tx: 176, ty: 106, hit: [142, 76, 58, 52] },
  { dir: 'South', letter: 'S', tx: 100, ty: 182, hit: [68, 158, 64, 40] },
  { dir: 'West', letter: 'W', tx: 24, ty: 106, hit: [0, 76, 58, 52] },
];

function DirectionCompass({ direction, onDirectionExecute }: DirectionCompassProps) {
  const needleAngle = directionNeedleAngle[direction];
  const interactive = Boolean(onDirectionExecute);

  const handleKeyDown = (e: KeyboardEvent, dir: Direction) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDirectionExecute?.(dir);
    }
  };

  return (
    <div className={`direction-compass${interactive ? ' direction-compass--interactive' : ''}`}>
      <h2>Compass</h2>
      <div className="direction-compass__body">
        <svg
          className="direction-compass__svg"
          viewBox="0 0 200 200"
          role="img"
          aria-label={`Compass showing rover facing ${direction}`}
        >
          <defs>
            <linearGradient id="compass-ring" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 107, 53, 0.35)" />
              <stop offset="100%" stopColor="rgba(42, 82, 152, 0.45)" />
            </linearGradient>
            <linearGradient id="compass-needle" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff8f5a" />
              <stop offset="100%" stopColor="#ff6b35" />
            </linearGradient>
            <filter id="compass-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx="100" cy="100" r="92" fill="rgba(0, 0, 0, 0.22)" stroke="url(#compass-ring)" strokeWidth="3" />
          <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255, 255, 255, 0.07)" strokeWidth="1" />

          {[0, 90, 180, 270].map((deg) => (
            <line
              key={deg}
              x1="100"
              y1="100"
              x2={100 + 78 * Math.cos((deg * Math.PI) / 180)}
              y2={100 + 78 * Math.sin((deg * Math.PI) / 180)}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
            />
          ))}

          <g style={{ pointerEvents: 'none' }} transform={`rotate(${needleAngle} 100 100)`} filter="url(#compass-glow)">
            <polygon points="168,100 100,91 100,109" fill="url(#compass-needle)" />
            <polygon points="32,100 100,91 100,109" fill="rgba(30, 60, 114, 0.9)" />
          </g>

          <g style={{ pointerEvents: 'none' }}>
            <circle cx="100" cy="100" r="8" fill="#1a1a2e" stroke="#ff6b35" strokeWidth="2" />
            <circle cx="100" cy="100" r="3" fill="#ff6b35" />
          </g>

          <g className="direction-compass__labels">
            {CARDINALS.map(({ dir, letter, tx, ty, hit }) => {
              const isActive = direction === dir;
              const [hx, hy, hw, hh] = hit;
              return (
                <g
                  key={dir}
                  className={`direction-compass__dir ${interactive ? 'direction-compass__dir--clickable' : ''}`}
                  role={interactive ? 'button' : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  aria-label={interactive ? `Face ${dir} (execute now)` : undefined}
                  onClick={interactive ? () => onDirectionExecute?.(dir) : undefined}
                  onKeyDown={interactive ? (e) => handleKeyDown(e, dir) : undefined}
                >
                  <rect
                    x={hx}
                    y={hy}
                    width={hw}
                    height={hh}
                    fill="transparent"
                    className="direction-compass__hit"
                  />
                  <text
                    x={tx}
                    y={ty}
                    textAnchor="middle"
                    className={`direction-compass__letter ${isActive ? 'direction-compass__letter--active' : ''}`}
                  >
                    {letter}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
        <p className="direction-compass__caption">Facing {direction}</p>
        {interactive && (
          <p className="direction-compass__hint">Click N · E · S · W to face that direction</p>
        )}
      </div>
    </div>
  );
}

export default DirectionCompass;
