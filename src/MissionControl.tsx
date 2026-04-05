import type { Dispatch, SetStateAction } from 'react'
import './App.css'
import marsLogo from './assets/Mars.png'
import RoverStatus from './components/RoverStatus'
import DirectionCompass from './components/DirectionCompass'
import MissionCommands from './components/MissionCommands'
import MarsGrid from './components/MarsGrid'
import MissionLog from './components/MissionLog'
import type { Direction, GridCell, MissionLogEntry, RoverState } from './missionTypes'

type MissionControlProps = {
  rover: RoverState
  grid: GridCell[]
  roverGridPos: { row: number; col: number }
  gridViewCenter: { row: number; col: number }
  setGridViewCenter: Dispatch<SetStateAction<{ row: number; col: number }>>
  gridViewSize: number
  commands: string[]
  error: string
  history: MissionLogEntry[]
  elapsedDays: number
  elapsedHours: number
  elapsedMins: number
  elapsedSecs: number
  missionClockLondon: string
  executeCompassDirection: (direction: Direction) => void
  handleCommandChange: (index: number, value: string) => void
  executeCommands: () => void
  resetRover: () => void
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export default function MissionControl({
  rover,
  grid,
  roverGridPos,
  gridViewCenter,
  setGridViewCenter,
  gridViewSize,
  commands,
  error,
  history,
  elapsedDays,
  elapsedHours,
  elapsedMins,
  elapsedSecs,
  missionClockLondon,
  executeCompassDirection,
  handleCommandChange,
  executeCommands,
  resetRover,
}: MissionControlProps) {
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <h1>Mars Rover Control</h1>
          <p>Mission Control Center</p>
        </div>
        <div className="app-header-timer" aria-live="polite" aria-atomic="true">
          <p className="app-header-timer__title">Mars Rover Mission Elapsed Time</p>
          <div
            className="app-header-timer__elapsed"
            role="timer"
            aria-label={`Mission elapsed: ${elapsedDays} days, ${elapsedHours} hours, ${elapsedMins} minutes, ${elapsedSecs} seconds`}
          >
            <div className="app-header-timer__elapsed-grid" aria-hidden="true">
              <span className="app-header-timer__num">{pad2(elapsedDays)}</span>
              <span className="app-header-timer__colon" aria-hidden="true">
                <span className="app-header-timer__colon-dot" />
                <span className="app-header-timer__colon-dot" />
              </span>
              <span className="app-header-timer__num">{pad2(elapsedHours)}</span>
              <span className="app-header-timer__colon" aria-hidden="true">
                <span className="app-header-timer__colon-dot" />
                <span className="app-header-timer__colon-dot" />
              </span>
              <span className="app-header-timer__num">{pad2(elapsedMins)}</span>
              <span className="app-header-timer__colon" aria-hidden="true">
                <span className="app-header-timer__colon-dot" />
                <span className="app-header-timer__colon-dot" />
              </span>
              <span className="app-header-timer__num">{pad2(elapsedSecs)}</span>
              <span className="app-header-timer__label">Days</span>
              <span className="app-header-timer__label-gap" />
              <span className="app-header-timer__label">Hrs</span>
              <span className="app-header-timer__label-gap" />
              <span className="app-header-timer__label">Mins</span>
              <span className="app-header-timer__label-gap" />
              <span className="app-header-timer__label">Secs</span>
            </div>
          </div>
          <p className="app-header-timer__datetime">{missionClockLondon}</p>
        </div>
        <div className="app-header-mars" aria-hidden="true">
          <img src={marsLogo} alt="" className="app-header-mars__img" />
        </div>
      </header>

      <main className="app-main">
        <div className="dashboard-row">
          <div className="dashboard-left-column">
            <RoverStatus
              position={rover.position}
              direction={rover.direction}
              isAtPerimeter={rover.isAtPerimeter}
              gridPos={roverGridPos}
            />
            <DirectionCompass direction={rover.direction} onDirectionExecute={executeCompassDirection} />
          </div>
          <MarsGrid
            grid={grid}
            roverPosition={rover.position}
            gridViewCenter={gridViewCenter}
            setGridViewCenter={setGridViewCenter}
            onReturnToRover={() => setGridViewCenter(roverGridPos)}
            gridViewSize={gridViewSize}
          />
          <MissionCommands
            commands={commands}
            error={error}
            onCommandChange={handleCommandChange}
            onExecute={executeCommands}
            onReset={resetRover}
          />
        </div>
        <MissionLog history={history} />
      </main>

      <footer className="app-footer">
        <p className="app-footer__credit">
          © {new Date().getFullYear()} Glen Harding
        </p>
      </footer>
    </div>
  )
}
