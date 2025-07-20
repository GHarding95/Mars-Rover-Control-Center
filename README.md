# 🚀 Mars Rover Control Center

This is a fully mobile responsive React + TypeScript app where you can command a virtual Mars Rover across a 100x100 meter grid, track the Rover status, send up to 5 commands at once, browse a draggable grid & review commands in the Mission Log.

## 🎮 How to Use

### Getting Started
1. Install dependencies: `npm install`
2. Start the app: `npm run dev`
3. Open your browser to the provided URL

### Controlling the Rover
- **Movement**: `[number]m` (e.g., `50m`, `23m`)
- **Direction**: `left` or `right` (case-insensitive, spaces are automatically removed)
- **Up to 5 commands at once**: Each command gets its own input field, enter several and execute them in sequence.

### Grid System
- **100x100 squares**: Each square is 1 meter. The grid is fully numbered.
- **Perimeter detection**: The rover can't leave the grid, commands that would take the Rover out of bounds are cut short at the perimeter and blocked from going further.
- **Draggable grid**: Drag to explore the grid around your rover.
- **Return to Rover**: Click to return to the Rover after dragging the map around.

### Mission Log
- **Latest at the top**: Every command you send (even in a batch) appears at the top of the log, so you always see the most recent action first.
- **Clear feedback**: See exactly what happened after each command, including blocked moves and perimeter warnings.
- **Persistent**: Your mission log is saved in your browser until Rover is reset with local storage.

### Reset & Error Handling
- **Reset**: Click the reset button to start a new mission from square 1, facing South.
- **Validation**: Invalid commands (like typos or out-of-bounds moves) are caught and explained before anything happens.

## 🛠️ Technical Highlights
- **React 19 + TypeScript**: Modern, type-safe, and fast.
- **Hooks**: All state and effects managed with React hooks/props.
- **Local Storage**: Rover status and Mission Log is saved in the browser until Rover is reset.
- **Responsive CSS**: Fully mobile responsive.
- **User Experience**: UX improvements like input trimming, instant feedback, and a clear mission log.

## Potential Improvements
- More thorough testing with Jest (refer to TEST_CASES.md).
- Out of bounds logic for real world application, return to grid in the event of outside forces etc.
