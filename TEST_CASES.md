# 🧪 Mars Rover Application Test Cases

This document outlines comprehensive test cases to verify the Mars Rover application functionality.

**Position numbering**: Square numbers follow the app formula: `position = (row - 1) × 100 + col`, with rows and columns from 1–100. South increases row; East increases column.

## 🎯 Core Functionality Tests

### 1. Initial State Verification
- [ ] Rover starts at Square 1
- [ ] Rover faces South direction
- [ ] Grid shows rover at position (1,1)
- [ ] No perimeter warning is displayed
- [ ] Mission log shows "No commands executed yet"

### 2. Basic Movement Tests

#### Test Case 1: Simple Forward Movement
**Commands**: `50m`
**Expected Result**: 
- Rover moves to Square 5001 (row 51, column 1)
- Direction remains South
- Mission log includes `50m` and shows position **5001** and **South**

#### Test Case 2: Multiple Movement Commands
**Commands**: `10m`, `20m`, `15m`
**Expected Result**:
- Rover ends at Square 4501 (row 46, column 1)
- Direction remains South
- Mission log shows 3 separate entries

### 3. Direction Change Tests

#### Test Case 3: Face East
**Commands**: `East`
**Expected Result**:
- Position remains the same
- Direction changes from South to East
- Mission log: `Command 1: East → Position [current] East` (or lowercase `east` if you typed that)

#### Test Case 4: Face West
**Commands**: `West`
**Expected Result**:
- Position remains the same
- Direction changes from South to West
- Mission log: `Command 1: West → Position [current] West`

#### Test Case 5: Multiple Direction Commands
**Commands**: `East`, `West`, `North`
**Expected Result**:
- Facing ends as **North** (each command sets heading: South → East → West → North)
- Position unchanged
- Mission log shows 3 direction updates

### 4. Combined Movement and Direction Tests

#### Test Case 6: Move and Change Heading
**Commands**: `25m`, `East`, `30m`
**Expected Result**:
1. Move 25m South: Square 1 → Square 2501 (row 26, col 1)
2. Face East
3. Move 30m East: row 26, col 31 → Square **2531**
- Final position: Square **2531**, facing East

#### Test Case 7: Complex Sequence (From Problem Description)
**Commands**: `50m`, `East`, `23m`, `North`, `4m`
**Expected Result**:
1. Move 50m South: Square 1 → Square 5001 (row 51, col 1)
2. Face East
3. Move 23m East: col 24 → Square **5024** (row 51, col 24)
4. Face North
5. Move 4m North: row 47, col 24 → Square **4624**
- Final position: Square **4624**, facing North

### 5. Boundary and Perimeter Tests

#### Test Case 8: Move to Perimeter
**Commands**: `99m` (from Square 1)
**Expected Result**:
- Rover moves to Square **9901** (row 100, col 1 — perimeter)
- Perimeter warning displayed
- Mission log: includes `Position 9901` and `ROVER HAS REACHED THE PERIMETER!`

#### Test Case 9: Move Beyond Boundary
**Commands**: `150m` (from Square 1)
**Expected Result**:
- Rover stops at Square **9901** (south edge; row clamped to 100)
- Perimeter warning displayed
- Move may be cut short vs requested distance

#### Test Case 10: Perimeter from Different Starting Position
**Starting**: Square 50 (row 1, col 50), facing East  
**Commands**: `60m`
**Expected Result**:
- East column would exceed 100; column clamps to 100
- Rover ends at Square **100** (row 1, col 100 — perimeter)
- Perimeter warning displayed

### 6. Command Validation Tests

#### Test Case 11: Invalid Movement Command
**Commands**: `50` (missing 'm')
**Expected Result**:
- Error message displayed
- Commands not executed
- Rover position unchanged

#### Test Case 12: Invalid Direction Command
**Commands**: `up`
**Expected Result**:
- Error message displayed
- Commands not executed
- Rover position unchanged

#### Test Case 13: Invalid Format
**Commands**: `abc`, `50km`, `leftt`
**Expected Result**:
- Error message with proper format instructions
- Commands not executed

### 7. Reset Functionality Tests

#### Test Case 14: Reset After Movement
**Steps**:
1. Execute commands: `50m`, `East`
2. Click "Reset Rover"
**Expected Result**:
- Rover returns to Square 1
- Direction resets to South
- Mission log cleared
- Command inputs cleared
- No perimeter warning

### 8. Grid Visualization Tests

#### Test Case 15: Grid Display
**Verification**:
- Grid shows a representative viewport (size varies by screen)
- Square numbers match app numbering
- Perimeter squares highlighted
- Rover position clearly marked with direction arrow

#### Test Case 16: Grid Updates
**Steps**:
1. Execute movement commands
2. Observe grid updates
**Expected Result**:
- Grid cell highlighting moves with rover
- Direction arrow updates correctly
- Smooth visual transitions

### 9. Responsive Design Tests

#### Test Case 17: Desktop View
**Verification**:
- Full layout displays correctly
- Grid size appropriate for desktop
- All panels visible

#### Test Case 18: Mobile View
**Verification**:
- Layout adapts to smaller screens
- Grid cells resize appropriately
- Buttons remain accessible
- Text remains readable

### 10. Edge Cases

#### Test Case 19: Empty Commands
**Commands**: Leave all command fields empty
**Expected Result**:
- No error message
- No movement
- Mission log unchanged

#### Test Case 20: Mixed Valid/Invalid Commands
**Commands**: `50m`, `invalid`, `East`
**Expected Result**:
- Error message displayed
- No commands executed
- Rover position unchanged

#### Test Case 21: Maximum Commands
**Commands**: Fill all 5 command fields with valid commands
**Expected Result**:
- All 5 commands execute
- Mission log shows all 5 entries
- Commands clear after execution

## 🎮 Manual Testing Instructions

### Setup
1. Start the development server: `npm run dev`
2. Open browser to the provided URL
3. Verify initial state

### Testing Process
1. **Basic Tests**: Start with simple movement and direction commands
2. **Complex Tests**: Test combined movements and heading changes
3. **Boundary Tests**: Test perimeter detection and boundary handling
4. **Validation Tests**: Test error handling with invalid commands
5. **UI Tests**: Verify visual updates and responsive design
6. **Reset Tests**: Test reset functionality after various states

### Expected Behaviors Summary
- ✅ Rover starts at Square 1, facing South
- ✅ Movement commands: `[number]m` format
- ✅ Direction commands: `North`, `South`, `East`, or `West` (set facing to match Rover Status)
- ✅ Grid: 100×100 squares, positions 1–10,000
- ✅ Perimeter detection and stopping
- ✅ Command validation with error messages
- ✅ Visual grid representation
- ✅ Mission log with command history
- ✅ Reset functionality
- ✅ Responsive design

## 🐛 Common Issues to Check

1. **Grid Numbering**: Positions use `(row - 1) × 100 + col` with row/col 1–100
2. **Direction Logic**: Cardinal commands set heading directly (not incremental turns)
3. **Boundary Detection**: Check perimeter detection accuracy
4. **Command Validation**: Test various invalid input formats
5. **Visual Updates**: Ensure grid and status updates in real-time
6. **Error Handling**: Verify proper error messages display
7. **Reset Functionality**: Test reset from various states

## 📊 Success Criteria

All test cases should pass with the following criteria:
- ✅ Correct movement calculations
- ✅ Proper direction / heading updates
- ✅ Accurate boundary detection
- ✅ Valid error handling
- ✅ Responsive UI updates
- ✅ Complete mission logging
- ✅ Visual grid representation
- ✅ Reset functionality
- ✅ Mobile responsiveness

---

**Test Status**: 🟡 Ready for Execution  
**Coverage**: Comprehensive functionality testing  
**Priority**: High - All core features must work correctly
