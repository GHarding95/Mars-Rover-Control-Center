export type Direction = 'North' | 'South' | 'East' | 'West'

export interface RoverState {
  position: number
  direction: Direction
  isAtPerimeter: boolean
}

export interface GridCell {
  id: number
  isRoverHere: boolean
  isPerimeter: boolean
}

export interface MissionLogEntry {
  message: string
  /** Wall time when the entry was recorded; `null` only for legacy rows without a stored time. */
  at: number | null
}
