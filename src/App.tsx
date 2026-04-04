import { useState, useEffect, useRef } from 'react';
import { Analytics } from "@vercel/analytics/react";
import './App.css';
import RoverStatus from './components/RoverStatus';
import DirectionCompass from './components/DirectionCompass';
import MissionCommands from './components/MissionCommands';
import MarsGrid from './components/MarsGrid';
import MissionLog from './components/MissionLog';

// Types for the Mars Rover app
export type Direction = 'North' | 'South' | 'East' | 'West'

interface RoverState {
  position: number
  direction: Direction
  isAtPerimeter: boolean
}

interface GridCell {
  id: number
  isRoverHere: boolean
  isPerimeter: boolean
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
  const [rover, setRover] = useState<RoverState>(() => {
    const saved = localStorage.getItem('rover')
    return saved
      ? JSON.parse(saved)
      : { position: 1, direction: 'South', isAtPerimeter: isPerimeterSquare(1) }
  })
  
  const [commands, setCommands] = useState<string[]>(['', '', '', '', ''])
  const [history, setHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('history')
    return saved ? JSON.parse(saved) : []
  })
  const [error, setError] = useState<string>('')
  const [grid, setGrid] = useState<GridCell[]>([])

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

  // Initialize the 100x100 grid (10,000 squares)
  useEffect(() => {
    const newGrid: GridCell[] = []
    for (let i = 1; i <= 10000; i++) {
      newGrid.push({
        id: i,
        isRoverHere: i === 1,
        isPerimeter: isPerimeterSquare(i)
      })
    }
    setGrid(newGrid)
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

  function missionStartLogLine(r: RoverState): string {
    let line = `#1: Mission start — square ${r.position}, facing ${r.direction}`
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
      let line = `#${seq}: Changed direction — square ${sq}, facing ${face}`
      if (roverAfter.isAtPerimeter) line += perimeterEdgesSuffix(sq)
      return line
    }
    const requestedM = parseMovementDistance(rawTrimmed)
    const movedLabel =
      cutShort && requestedM !== null ? `${actualDistance}m` : cmdLog
    let line = `#${seq}: Moved ${movedLabel} to square ${sq}, facing ${face}`
    if (cutShort && requestedM !== null) {
      line += ` (command shortened from ${requestedM}m to ${actualDistance}m)`
      line += perimeterEdgesSuffix(sq)
    } else if (roverAfter.isAtPerimeter) {
      line += perimeterEdgesSuffix(sq)
    }
    return line
  }

  function missionLogLineBlocked(seq: number, cmdLog: string, roverAt: RoverState): string {
    return `#${seq}: ${cmdLog} blocked — square ${roverAt.position}, facing ${roverAt.direction}`
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
    const commandHistory: string[] = []
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
          const line = missionLogLineBlocked(seq, cmdLog, currentRover)
          errorMsg = line
          commandHistory.push(line)
          // Do not update rover state for this command
          continue
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
          missionLogLineForResult(seq, rawTrimmed, cmdLog, currentRover, cutShort, actualDistance)
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
    setHistory((prev: string[]) => [
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
    let line = `#${seq}: Compass, changed direction — square ${newRover.position}, facing ${newRover.direction}`
    if (newRover.isAtPerimeter) line += perimeterEdgesSuffix(newRover.position)
    setHistory((prev: string[]) => [line, ...prev])
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
    setHistory([missionStartLogLine(start)])
    nextLogNumberRef.current = 2
    setError('')
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
      return [missionStartLogLine(rover)]
    })
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <h1>🚀 Mars Rover Control</h1>
          <p>Mission Control Center</p>
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
      <Analytics />
    </div>
  )
}

export default App
