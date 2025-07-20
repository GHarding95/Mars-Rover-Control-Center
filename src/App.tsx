import { useState, useEffect } from 'react'
import './App.css'
import RoverStatus from './components/RoverStatus';
import CommandPanel from './components/CommandPanel';
import MarsGrid from './components/MarsGrid';
import MissionLog from './components/MissionLog';

// Types for the Mars Rover app
type Direction = 'North' | 'South' | 'East' | 'West'

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

  // Validate command format
  function validateCommand(command: string): boolean {
    const trimmed = command.trim()
    if (!trimmed) return true // Empty commands are valid (ignored)
    
    // Check for movement command (number + 'm')
    if (/^\d+m$/i.test(trimmed)) return true
    
    // Check for direction command
    if (trimmed.toLowerCase() === 'left' || trimmed.toLowerCase() === 'right') return true
    
    return false
  }

  // Get proper command format message
  function getCommandFormatMessage(): string {
    return "Valid commands: '50m' (move 50 meters), 'left' (turn left), 'right' (turn right)"
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
    const lowerCommand = trimmed.toLowerCase()
    if (lowerCommand === 'left') {
      // Turn left: South -> East -> North -> West -> South
      switch (newRover.direction) {
        case 'South': newRover.direction = 'East'; break
        case 'East': newRover.direction = 'North'; break
        case 'North': newRover.direction = 'West'; break
        case 'West': newRover.direction = 'South'; break
      }
    } else if (lowerCommand === 'right') {
      // Turn right: South -> West -> North -> East -> South
      switch (newRover.direction) {
        case 'South': newRover.direction = 'West'; break
        case 'West': newRover.direction = 'North'; break
        case 'North': newRover.direction = 'East'; break
        case 'East': newRover.direction = 'South'; break
      }
    } else if (/^\d+m$/i.test(trimmed)) {
      // Movement command
      const distance = parseInt(trimmed.slice(0, -1))
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
        const prevAtPerimeter = currentRover.isAtPerimeter
        const { newRover, blocked, cutShort, actualDistance } = executeCommand(commands[i], currentRover)
        if (blocked) {
          errorMsg = `Command ${i + 1}: ${commands[i]} → Move blocked: would exit grid at perimeter.`
          commandHistory.push(errorMsg)
          // Do not update rover state for this command
          continue
        } else {
          currentRover = newRover
        }
        // If the rover just now reached the perimeter, stop further commands
        if (!prevAtPerimeter && currentRover.isAtPerimeter) {
          perimeterReachedThisBatch = true
        }
        // Add to history
        let status = currentRover.isAtPerimeter 
          ? `Position ${currentRover.position} ${currentRover.direction} - ROVER HAS REACHED THE PERIMETER!`
          : `Position ${currentRover.position} ${currentRover.direction}`
        if (cutShort) {
          status += ` (Move cut short by perimeter, moved ${actualDistance}m)`
        }
        commandHistory.push(`Command ${i + 1}: ${commands[i]} → ${status}`)
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

  // Reset rover to starting position
  function resetRover() {
    setRover({
      position: 1,
      direction: 'South',
      isAtPerimeter: isPerimeterSquare(1)
    })
    setCommands(['', '', '', '', ''])
    setHistory([])
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
          <RoverStatus
            position={rover.position}
            direction={rover.direction}
            isAtPerimeter={rover.isAtPerimeter}
            gridPos={roverGridPos}
          />
          <MarsGrid
            grid={grid}
            roverPosition={rover.position}
            gridViewCenter={gridViewCenter}
            setGridViewCenter={setGridViewCenter}
            onReturnToRover={() => setGridViewCenter(roverGridPos)}
            gridViewSize={gridViewSize}
          />
          <CommandPanel
            commands={commands}
            error={error}
            onCommandChange={handleCommandChange}
            onExecute={executeCommands}
            onReset={resetRover}
          />
        </div>
        <MissionLog history={history} />
      </main>
    </div>
  )
}

export default App
