import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Analytics } from "@vercel/analytics/react";
import './App.css';
import type { Direction, GridCell, MissionLogEntry, RoverState } from './missionTypes'

export type { Direction, MissionLogEntry } from './missionTypes'

const LandingPage = lazy(() => import('./components/Landing Page/LandingPage'))
const MissionControl = lazy(() => import('./MissionControl'))

const MISSION_START_LOG_RE = /^#1: Mission start/

function backfillMissionStartAt(entry: MissionLogEntry): MissionLogEntry {
  if (entry.at != null) return entry
  if (MISSION_START_LOG_RE.test(entry.message)) {
    return { ...entry, at: Date.now() }
  }
  return entry
}

function parseHistoryFromStorage(raw: string | null): MissionLogEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item: unknown): MissionLogEntry => {
        if (typeof item === 'string') return { message: item, at: null }
        if (item && typeof item === 'object' && item !== null && 'message' in item) {
          const m = (item as { message: unknown; at?: unknown }).message
          const at = (item as { at?: unknown }).at
          if (typeof m === 'string') {
            return { message: m, at: typeof at === 'number' ? at : null }
          }
        }
        return { message: String(item), at: null }
      })
      .map(backfillMissionStartAt)
  } catch {
    return []
  }
}

function logEntry(message: string): MissionLogEntry {
  return { message, at: Date.now() }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** UK local time (BST in summer, GMT in winter), e.g. APR 01, 2026 22:35 BST */
function formatMissionClockLondon(d: Date): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  })
  const parts = fmt.formatToParts(d)
  const pick = (type: Intl.DateTimeFormatPart['type']) =>
    parts.find((p) => p.type === type)?.value ?? ''
  const month = pick('month')
  const dayRaw = pick('day')
  const year = pick('year')
  const hour = pick('hour')
  const minute = pick('minute')
  const tz = pick('timeZoneName')
  const day = dayRaw.length <= 1 ? pad2(parseInt(dayRaw, 10)) : dayRaw
  return `${month} ${day}, ${year} ${hour}:${minute} ${tz}`.toUpperCase()
}

function useResponsiveGridSize() {
  const [gridViewSize, setGridViewSize] = useState(
    window.innerWidth <= 400 ? 7 : window.innerWidth <= 768 ? 10 : 20
  );
  useEffect(() => {
    const handleResize = () => {
      setGridViewSize(
        window.innerWidth <= 400 ? 7 : window.innerWidth <= 768 ? 10 : 20
      );
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return gridViewSize;
}

function App() {
  /** Full reload shows the intro; in-session state — reset rover does not remount App. */
  const [showLanding, setShowLanding] = useState(true)

  const [rover, setRover] = useState<RoverState>(() => {
    const saved = localStorage.getItem('rover')
    return saved
      ? JSON.parse(saved)
      : { position: 1, direction: 'South', isAtPerimeter: isPerimeterSquare(1) }
  })
  
  const [commands, setCommands] = useState<string[]>(['', '', '', '', ''])
  const [history, setHistory] = useState<MissionLogEntry[]>(() =>
    parseHistoryFromStorage(localStorage.getItem('history'))
  )
  const [error, setError] = useState<string>('')
  const [grid, setGrid] = useState<GridCell[]>([])
  const [sessionStartMs, setSessionStartMs] = useState(() => Date.now())
  const [nowMs, setNowMs] = useState(() => Date.now())

  /** Running mission-log index (#1, #2, …); continues after saved history; reset with rover. */
  const nextLogNumberRef = useRef(
    (() => {
      try {
        const saved = localStorage.getItem('history')
        const h = saved ? JSON.parse(saved) : []
        return Array.isArray(h) ? h.length + 1 : 1
      } catch {
        return 1
      }
    })()
  )

  // Add useEffect to save rover to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('rover', JSON.stringify(rover))
  }, [rover])

  // Add useEffect to save history to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('history', JSON.stringify(history))
  }, [history])

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Add useEffect to update grid when rover position changes
  useEffect(() => {
    setGrid((prevGrid: GridCell[]) =>
      prevGrid.map((cell: GridCell) => ({
        ...cell,
        isRoverHere: cell.id === rover.position
      }))
    )
  }, [rover.position])

  // Check if a square is on the perimeter
  function isPerimeterSquare(square: number): boolean {
    const row = Math.floor((square - 1) / 100) + 1
    const col = ((square - 1) % 100) + 1
    return row === 1 || row === 100 || col === 1 || col === 100
  }

  /** Mission-log suffix for perimeter cells (which map edge(s): North, East, South, West). */
  function perimeterEdgesSuffix(position: number): string {
    const row = Math.floor((position - 1) / 100) + 1
    const col = ((position - 1) % 100) + 1
    const edges: string[] = []
    if (row === 1) edges.push('North')
    if (row === 100) edges.push('South')
    if (col === 1) edges.push('West')
    if (col === 100) edges.push('East')
    if (edges.length === 0) return ' — at perimeter'
    if (edges.length === 1) return ` — at ${edges[0]} perimeter`
    return ` — at ${edges[0]} and ${edges[1]} perimeters`
  }

  /** Wording for rover place + heading in mission log lines (e.g. after em dash). */
  function missionLogPositionDirection(square: number, direction: Direction): string {
    return `Square ${square}, Facing ${direction}`
  }

  function missionStartLogLine(r: RoverState): string {
    let line = `#1: Mission start: ${missionLogPositionDirection(r.position, r.direction)}`
    if (r.isAtPerimeter) line += perimeterEdgesSuffix(r.position)
    return line
  }

  function parseCardinalDirection(trimmed: string): Direction | null {
    switch (trimmed.toLowerCase()) {
      case 'north': return 'North'
      case 'south': return 'South'
      case 'east': return 'East'
      case 'west': return 'West'
      default: return null
    }
  }

  /** Distance in meters from `50m` / `50M` or a bare integer `50` (same as `50m`). */
  function parseMovementDistance(trimmed: string): number | null {
    if (/^\d+m$/i.test(trimmed)) return parseInt(trimmed.slice(0, -1), 10)
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10)
    return null
  }

  /** How a command appears in the mission log (bare distances shown with `m`, e.g. `5` → `5m`). */
  function formatCommandForMissionLog(command: string): string {
    const trimmed = command.trim()
    if (!trimmed) return ''
    const meters = parseMovementDistance(trimmed)
    if (meters !== null) return `${meters}m`
    return trimmed
  }

  function missionLogLineForResult(
    seq: number,
    rawTrimmed: string,
    cmdLog: string,
    roverAfter: RoverState,
    cutShort: boolean,
    actualDistance: number
  ): string {
    const sq = roverAfter.position
    const face = roverAfter.direction
    if (parseCardinalDirection(rawTrimmed) !== null) {
      let line = `#${seq}: Changed direction — ${missionLogPositionDirection(sq, face)}`
      if (roverAfter.isAtPerimeter) line += perimeterEdgesSuffix(sq)
      return line
    }
    const requestedM = parseMovementDistance(rawTrimmed)
    const movedLabel =
      cutShort && requestedM !== null ? `${actualDistance}m` : cmdLog
    let line = `#${seq}: Moved ${movedLabel} to ${missionLogPositionDirection(sq, face)}`
    if (cutShort && requestedM !== null) {
      line += ` (command shortened from ${requestedM}m to ${actualDistance}m)`
      line += perimeterEdgesSuffix(sq)
    } else if (roverAfter.isAtPerimeter) {
      line += perimeterEdgesSuffix(sq)
    }
    return line
  }

  function missionLogLineBlocked(
    seq: number,
    cmdLog: string,
    roverAt: RoverState,
    skippedFurtherCommands: boolean
  ): string {
    const posDir = missionLogPositionDirection(roverAt.position, roverAt.direction)
    if (skippedFurtherCommands) {
      return `#${seq}: Blocked: ${cmdLog}, PERIMETER REACHED, no further commands were executed in the sequence — ${posDir}`
    }
    return `#${seq}: Blocked: ${cmdLog}, PERIMETER REACHED — ${posDir}`
  }

  /** True if any slot after `index` has a non-empty command (remaining sequence would have run). */
  function hasNonEmptyCommandsAfter(commandsList: string[], index: number): boolean {
    for (let j = index + 1; j < commandsList.length; j++) {
      if (commandsList[j].trim()) return true
    }
    return false
  }

  // Validate command format
  function validateCommand(command: string): boolean {
    const trimmed = command.trim()
    if (!trimmed) return true // Empty commands are valid (ignored)

    if (parseMovementDistance(trimmed) !== null) return true

    if (parseCardinalDirection(trimmed) !== null) return true

    return false
  }

  // Get proper command format message
  function getCommandFormatMessage(): string {
    return "Valid commands: '50m' or '50' (move 50 meters), 'North', 'South', 'East', or 'West' (face that direction)"
  }

  // Calculate new position based on current position, direction, and distance
  function calculateNewPosition(currentPos: number, direction: Direction, distance: number): number {
    const row = Math.floor((currentPos - 1) / 100) + 1
    const col = ((currentPos - 1) % 100) + 1
    
    let newRow = row
    let newCol = col
    
    switch (direction) {
      case 'North':
        newRow = row - distance
        break
      case 'South':
        newRow = row + distance
        break
      case 'East':
        newCol = col + distance
        break
      case 'West':
        newCol = col - distance
        break
    }
    
    // Check boundaries
    if (newRow < 1) newRow = 1
    if (newRow > 100) newRow = 100
    if (newCol < 1) newCol = 1
    if (newCol > 100) newCol = 100
    
    return (newRow - 1) * 100 + newCol
  }

  // Execute a single command
  function executeCommand(command: string, currentRoverState: RoverState): { newRover: RoverState, blocked: boolean, cutShort: boolean, actualDistance: number } {
    const newRover = { ...currentRoverState }
    let blocked = false
    let cutShort = false
    let actualDistance = 0
    const trimmed = command.trim()
    if (!trimmed) return { newRover, blocked, cutShort, actualDistance }
    const facing = parseCardinalDirection(trimmed)
    if (facing !== null) {
      newRover.direction = facing
    } else {
      const distance = parseMovementDistance(trimmed)
      if (distance !== null) {
        const oldPosition = newRover.position
        const newPosition = calculateNewPosition(newRover.position, newRover.direction, distance)
        // If move is blocked (would go out of bounds)
        if (newPosition === oldPosition && isPerimeterSquare(oldPosition)) {
          blocked = true
        } else {
          newRover.position = newPosition
          newRover.isAtPerimeter = isPerimeterSquare(newPosition)
          // Calculate actual distance moved
          const oldRow = Math.floor((oldPosition - 1) / 100) + 1
          const oldCol = ((oldPosition - 1) % 100) + 1
          const newRow = Math.floor((newPosition - 1) / 100) + 1
          const newCol = ((newPosition - 1) % 100) + 1
          switch (newRover.direction) {
            case 'North':
            case 'South':
              actualDistance = Math.abs(newRow - oldRow)
              break
            case 'East':
            case 'West':
              actualDistance = Math.abs(newCol - oldCol)
              break
          }
          if (actualDistance < distance) {
            cutShort = true
          }
        }
      }
    }
    return { newRover, blocked, cutShort, actualDistance }
  }

  // Execute all commands
  function executeCommands() {
    setError('')
    let errorMsg = ''
    // Validate all commands
    for (let i = 0; i < commands.length; i++) {
      if (commands[i].trim() && !validateCommand(commands[i])) {
        setError(`Invalid command at position ${i + 1}: "${commands[i]}"\n${getCommandFormatMessage()}`)
        return
      }
    }
    // Reset isAtPerimeter at the start of the batch
    let currentRover = { ...rover, isAtPerimeter: isPerimeterSquare(rover.position) }
    const commandHistory: MissionLogEntry[] = []
    let perimeterReachedThisBatch = false
    // Execute each command
    for (let i = 0; i < commands.length; i++) {
      if (commands[i].trim()) {
        const rawTrimmed = commands[i].trim()
        const cmdLog = formatCommandForMissionLog(commands[i])
        const seq = nextLogNumberRef.current++
        const prevAtPerimeter = currentRover.isAtPerimeter
        const { newRover, blocked, cutShort, actualDistance } = executeCommand(commands[i], currentRover)
        if (blocked) {
          const skippedFurther = hasNonEmptyCommandsAfter(commands, i)
          const line = missionLogLineBlocked(seq, cmdLog, currentRover, skippedFurther)
          commandHistory.push(logEntry(line))
          errorMsg = skippedFurther
            ? `Blocked: ${cmdLog}, PERIMETER REACHED, no further commands were executed in the sequence — ${missionLogPositionDirection(currentRover.position, currentRover.direction)}`
            : line
          // Do not update rover state for this command; abort rest of sequence
          break
        } else {
          currentRover = newRover
        }
        // If the rover just now reached the perimeter, stop further commands
        if (!prevAtPerimeter && currentRover.isAtPerimeter) {
          perimeterReachedThisBatch = true
        }
        if (cutShort) {
          const req = parseMovementDistance(rawTrimmed)
          errorMsg =
            req !== null
              ? `#${seq}: Perimeter reached — command shortened from ${req}m to ${actualDistance}m`
              : `#${seq}: Perimeter reached — completed ${actualDistance}m of ${cmdLog}`
        }
        commandHistory.push(
          logEntry(
            missionLogLineForResult(seq, rawTrimmed, cmdLog, currentRover, cutShort, actualDistance)
          )
        )
        if (perimeterReachedThisBatch) {
          break
        }
      }
    }
    setRover(currentRover)
    setGrid((prevGrid: GridCell[]) => 
      prevGrid.map((cell: GridCell) => ({
        ...cell,
        isRoverHere: cell.id === currentRover.position
      }))
    )
    setGridViewCenter({
      row: Math.floor((currentRover.position - 1) / 100) + 1,
      col: ((currentRover.position - 1) % 100) + 1
    })
    setHistory((prev: MissionLogEntry[]) => [
      ...[...commandHistory].reverse(),
      ...prev
    ])
    setCommands(['', '', '', '', ''])
    if (errorMsg) {
      setError(errorMsg)
    }
  }

  // Handle command input change
  function handleCommandChange(index: number, value: string) {
    const newCommands = [...commands]
    newCommands[index] = value
    setCommands(newCommands)
  }

  /** Apply a facing change immediately (same effect as executing that cardinal in Mission Commands). */
  function executeCompassDirection(dir: Direction) {
    setError('')
    const currentRover = { ...rover, isAtPerimeter: isPerimeterSquare(rover.position) }
    const { newRover, blocked } = executeCommand(dir, currentRover)
    if (blocked) {
      return
    }
    setRover(newRover)
    setGrid((prevGrid: GridCell[]) =>
      prevGrid.map((cell: GridCell) => ({
        ...cell,
        isRoverHere: cell.id === newRover.position,
      }))
    )
    setGridViewCenter({
      row: Math.floor((newRover.position - 1) / 100) + 1,
      col: ((newRover.position - 1) % 100) + 1,
    })
    const seq = nextLogNumberRef.current++
    let line = `#${seq}: Compass — ${missionLogPositionDirection(newRover.position, newRover.direction)}`
    if (newRover.isAtPerimeter) line += perimeterEdgesSuffix(newRover.position)
    setHistory((prev: MissionLogEntry[]) => [logEntry(line), ...prev])
  }

  // Reset rover to starting position
  function resetRover() {
    const start: RoverState = {
      position: 1,
      direction: 'South',
      isAtPerimeter: isPerimeterSquare(1),
    }
    setRover(start)
    setCommands(['', '', '', '', ''])
    setHistory([logEntry(missionStartLogLine(start))])
    nextLogNumberRef.current = 2
    setError('')
    setSessionStartMs(Date.now())
    setGrid((prevGrid: GridCell[]) => 
      prevGrid.map((cell: GridCell) => ({
        ...cell,
        isRoverHere: cell.id === 1
      }))
    )
    setGridViewCenter({ row: 1, col: 1 })
  }

  // Get rover position in grid coordinates for display
  function getRoverGridPosition(): { row: number; col: number } {
    const row = Math.floor((rover.position - 1) / 100) + 1
    const col = ((rover.position - 1) % 100) + 1
    return { row, col }
  }

  const roverGridPos = getRoverGridPosition();
  const [gridViewCenter, setGridViewCenter] = useState<{ row: number; col: number }>(roverGridPos);
  const gridViewSize = useResponsiveGridSize();

  // First visit or empty saved log: seed #1 mission start at current rover (persisted or default).
  useEffect(() => {
    setHistory((prev) => {
      if (prev.length > 0) return prev
      nextLogNumberRef.current = 2
      return [logEntry(missionStartLogLine(rover))]
    })
  }, [])

  const elapsedSec = Math.max(0, Math.floor((nowMs - sessionStartMs) / 1000))
  const elapsedDays = Math.floor(elapsedSec / 86400)
  const elapsedHours = Math.floor((elapsedSec % 86400) / 3600)
  const elapsedMins = Math.floor((elapsedSec % 3600) / 60)
  const elapsedSecs = elapsedSec % 60
  const missionClockLondon = formatMissionClockLondon(new Date(nowMs))

  function enterMission() {
    const pos = rover.position
    const newGrid: GridCell[] = []
    for (let i = 1; i <= 10000; i++) {
      newGrid.push({
        id: i,
        isRoverHere: i === pos,
        isPerimeter: isPerimeterSquare(i),
      })
    }
    setGrid(newGrid)
    setShowLanding(false)
  }

  if (showLanding) {
    return (
      <>
        <Suspense
          fallback={<div className="landing-suspense-fallback" role="presentation" aria-hidden />}
        >
          <LandingPage onEnter={enterMission} />
        </Suspense>
        <Analytics />
      </>
    )
  }

  return (
    <>
      <Suspense
        fallback={
          <div className="mission-control-fallback" role="status">
            Loading mission control…
          </div>
        }
      >
        <MissionControl
          rover={rover}
          grid={grid}
          roverGridPos={roverGridPos}
          gridViewCenter={gridViewCenter}
          setGridViewCenter={setGridViewCenter}
          gridViewSize={gridViewSize}
          commands={commands}
          error={error}
          history={history}
          elapsedDays={elapsedDays}
          elapsedHours={elapsedHours}
          elapsedMins={elapsedMins}
          elapsedSecs={elapsedSecs}
          missionClockLondon={missionClockLondon}
          executeCompassDirection={executeCompassDirection}
          handleCommandChange={handleCommandChange}
          executeCommands={executeCommands}
          resetRover={resetRover}
        />
      </Suspense>
      <Analytics />
    </>
  )
}

export default App
