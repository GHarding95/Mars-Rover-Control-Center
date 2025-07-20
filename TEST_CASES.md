# 🧪 Mars Rover Application Test Cases

This document outlines comprehensive test cases to verify the Mars Rover application functionality.

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
- Rover moves to Square 51
- Direction remains South
- Grid coordinates: Row 1, Col 51
- Mission log: "Command 1: 50m → Position 51 South"

#### Test Case 2: Multiple Movement Commands
**Commands**: `10m`, `20m`, `15m`
**Expected Result**:
- Rover moves to Square 46 (10+20+15+1)
- Direction remains South
- Mission log shows 3 separate entries

### 3. Direction Change Tests

#### Test Case 3: Turn Left
**Commands**: `left`
**Expected Result**:
- Position remains the same
- Direction changes from South to East
- Mission log: "Command 1: left → Position [current] East"

#### Test Case 4: Turn Right
**Commands**: `right`
**Expected Result**:
- Position remains the same
- Direction changes from South to West
- Mission log: "Command 1: right → Position [current] West"

#### Test Case 5: Multiple Direction Changes
**Commands**: `left`, `right`, `left`
**Expected Result**:
- South → East → West → North
- Position remains the same
- Mission log shows 3 direction changes

### 4. Combined Movement and Direction Tests

#### Test Case 6: Move and Turn
**Commands**: `25m`, `left`, `30m`
**Expected Result**:
1. Move 25m South: Square 1 → Square 26
2. Turn left: South → East
3. Move 30m East: Square 26 → Square 56
- Final position: Square 56, facing East

#### Test Case 7: Complex Sequence (From Problem Description)
**Commands**: `50m`, `left`, `23m`, `left`, `4m`
**Expected Result**:
1. Move 50m South: Square 1 → Square 51
2. Turn left: South → East
3. Move 23m East: Square 51 → Square 74
4. Turn left: East → North
5. Move 4m North: Square 74 → Square 70
- Final position: Square 70, facing North

### 5. Boundary and Perimeter Tests

#### Test Case 8: Move to Perimeter
**Commands**: `99m` (from Square 1)
**Expected Result**:
- Rover moves to Square 100 (perimeter)
- Perimeter warning displayed
- Mission log: "Position 100 South - ROVER HAS REACHED THE PERIMETER!"

#### Test Case 9: Move Beyond Boundary
**Commands**: `150m` (from Square 1)
**Expected Result**:
- Rover stops at Square 100 (boundary)
- Perimeter warning displayed
- No further movement beyond boundary

#### Test Case 10: Perimeter from Different Starting Position
**Starting**: Square 50, facing East
**Commands**: `60m`
**Expected Result**:
- Rover moves to Square 110 (perimeter)
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
1. Execute commands: `50m`, `left`
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
- Grid shows 10x10 representative view
- Square numbers displayed correctly (1, 2, 3... 101, 102, 103...)
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
**Commands**: `50m`, `invalid`, `left`
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
2. **Complex Tests**: Test combined movements and direction changes
3. **Boundary Tests**: Test perimeter detection and boundary handling
4. **Validation Tests**: Test error handling with invalid commands
5. **UI Tests**: Verify visual updates and responsive design
6. **Reset Tests**: Test reset functionality after various states

### Expected Behaviors Summary
- ✅ Rover starts at Square 1, facing South
- ✅ Movement commands: `[number]m` format
- ✅ Direction commands: `left` or `right`
- ✅ Grid: 100x100 squares (1-10000)
- ✅ Perimeter detection and stopping
- ✅ Command validation with error messages
- ✅ Visual grid representation
- ✅ Mission log with command history
- ✅ Reset functionality
- ✅ Responsive design

## 🐛 Common Issues to Check

1. **Grid Numbering**: Ensure squares follow the correct pattern
2. **Direction Logic**: Verify left/right turns work correctly
3. **Boundary Detection**: Check perimeter detection accuracy
4. **Command Validation**: Test various invalid input formats
5. **Visual Updates**: Ensure grid and status updates in real-time
6. **Error Handling**: Verify proper error messages display
7. **Reset Functionality**: Test reset from various states

## 📊 Success Criteria

All test cases should pass with the following criteria:
- ✅ Correct movement calculations
- ✅ Proper direction changes
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