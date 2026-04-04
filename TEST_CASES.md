# Mars Rover — test cases

Manual checks for the Mars Rover Control Center. Align expected copy with **Mission Log** (newest entries appear **at the top** of the list).

**Position math**: `position = (row − 1) × 100 + col`, with `row`, `col` ∈ 1…100. South increases row; North decreases row; East increases column; West decreases column.

---

## Command syntax (mission inputs)

| Type | Accepted forms |
|------|------------------|
| Move | `50m`, `50M`, or bare **`50`** (treated as 50 meters) |
| Face | `North`, `South`, `East`, `West` (case-insensitive matching) |
| Empty slot | Ignored |

Invalid commands in **any** filled slot cause **no** execution for the whole batch (validation runs before the run).

---

## Mission log numbering and order

- Entries use **`#1`, `#2`, `#3`, …** = **total** commands logged this session (not “slot 1–5” in the batch).
- After **Reset Rover**, numbering restarts: next substantive line after the seeded start is **`#2`**.
- If **history** was restored from **localStorage** with existing lines, new entries continue **`#(previous count + 1)`**.
- **Newest** log lines appear **first** in the Mission Log UI.

---

## Mission log line patterns (reference)

Use these to spot-check UI text (exact `#` depends on session).

| Event | Pattern |
|--------|---------|
| Mission start | `#1: Mission start — square {pos}, facing {dir}` — optional ` — at {North\|East\|South\|West} perimeter` or corner ` — at {Edge} and {Edge} perimeters` |
| Move (full) | `#{n}: Moved {X}m to square {pos}, facing {dir}` — optional ` — at {edge} perimeter` |
| Move (cut short by map edge) | `#{n}: Moved {actual}m to square {pos}, facing {dir} (command shortened from {requested}m to {actual}m) — at {edge} perimeter` |
| Direction (mission commands) | `#{n}: Changed direction — square {pos}, facing {dir}` — optional perimeter suffix |
| Blocked move (already on edge, ordered through edge) | `#{n}: {X}m blocked — square {pos}, facing {dir}` |
| Compass | `#{n}: Compass — square {pos}, facing {dir}` — optional perimeter suffix |

**Error banner** (red area under mission commands), when a move is shortened by the perimeter:

- `#{n}: Perimeter reached — command shortened from {requested}m to {actual}m`

In the log, bare distances are normalized with **`m`** (e.g. input `5` → `5m` in text).

---

## Persistence (`localStorage`)

- **`rover`**: position, direction, perimeter flag — restored on reload.
- **`history`**: mission log strings — restored on reload; **#** sequence for new lines continues after saved count.

For a “clean” first-run test, use private browsing or clear site data, or rely on **Reset Rover** (resets rover and replaces history with a fresh **#1 Mission start**).

---

## 1. Initial load and mission start

- [ ] Rover Status: **Square 1**, **South**, grid **Row 1, Col 1** (or persisted state if saved).
- [ ] With **empty** saved history: Mission Log ends up with **`#1: Mission start — square …, facing …`** (and perimeter suffix if start square is on an edge — default square 1 is **North and West perimeters**).
- [ ] Mission Log is **not** stuck on “No commands executed yet” once the start line is seeded (after first effect).
- [ ] **Direction Compass** shows heading consistent with Rover Status; **N/E/S/W** are clickable.

---

## 2. Movement

### 2.1 Simple move

**Commands**: `50m` (one field), Execute.

- [ ] Rover at square **5001** (row 51, col 1), facing **South** (unchanged).
- [ ] Log includes something like: `Moved 50m to square 5001, facing South` with **`#2`** if mission start was `#1` (numbers depend on session).

### 2.2 Bare number = meters

**Commands**: `50` (no `m`), Execute.

- [ ] Same behavior as `50m`; log shows **`50m`** in the Moved line.

### 2.3 Multiple moves in one batch

**Commands**: `10m`, `20m`, `15m` in three fields, Execute.

- [ ] Final square **4501** (row 46, col 1), **South**.
- [ ] Three new log lines (numbers consecutive), newest first in the panel.

---

## 3. Direction changes (mission commands)

### 3.1 Face East

**Commands**: `East`, Execute.

- [ ] Position unchanged; facing **East**.
- [ ] Log: `Changed direction — square {pos}, facing East` (with `#n` and perimeter suffix if on an edge).

### 3.2 Sequence East → West → North

**Commands**: `East`, `West`, `North`.

- [ ] Final facing **North** (each command sets absolute heading).
- [ ] Three `Changed direction` lines in log.

---

## 4. Combined move + direction

**Commands**: `25m`, `East`, `30m`, Execute.

1. Move 25 South: 1 → **2501** (row 26, col 1).
2. Face East.
3. Move 30 East: → **2531** (row 26, col 31).

- [ ] Final **square 2531**, **East**; log lines match patterns above.

### Complex sequence (from README-style scenario)

**Commands**: `50m`, `East`, `23m`, `North`, `4m`.

- [ ] Final square **4624**, **North** (verify with Rover Status).

---

## 5. Perimeter and boundaries

### 5.1 Move to south edge

**Commands**: `99m` from square 1 (South).

- [ ] Ends **9901** (row 100, col 1); Rover Status shows perimeter / grid on south edge.
- [ ] Log: `Moved … to square 9901, facing South` with **` — at South perimeter`** (or combined corner wording if applicable).

### 5.2 Overshoot (clamp)

**Commands**: `150m` from square 1.

- [ ] Stops at **9901**; move is **cut short** (actual distance 99).
- [ ] Log shows **actual** meters in “Moved”, plus `(command shortened from 150m to 99m)` and **perimeter edge** suffix.
- [ ] Error area may show: **`Perimeter reached — command shortened from 150m to 99m`**.

### 5.3 Batch stops after first perimeter hit

From an interior square, use a sequence that reaches the perimeter mid-batch.

- [ ] Commands **after** the one that first reaches the perimeter **do not run** (perimeter stop rule).

### 5.4 Blocked move (already on perimeter, drive outward)

Position rover on an edge square facing **outward**, command a move (e.g. `10m`).

- [ ] Rover does not leave the map; log line **`… blocked — square …, facing …`**.
- [ ] Error text reflects blocked move (same line may appear in error region).

---

## 6. Compass

- [ ] Click **N / E / S / W**: heading updates **immediately** (no need to press Execute).
- [ ] Mission log adds: **`Compass — square {pos}, facing {dir}`** (plus perimeter suffix when on edge).
- [ ] Next **#** increments like any other action.
- [ ] Compass needle and active letter match **Rover Status** facing.

---

## 7. Validation and errors

### 7.1 Invalid token

**Commands**: `up`, `abc`, `50km`, Execute.

- [ ] Error lists invalid slot / format; **no** rover change.

### 7.2 Mixed batch (invalid in one slot)

**Commands**: `50m`, `invalid`, `East`, Execute.

- [ ] **No** execution; rover unchanged.

### 7.3 Empty batch

All fields empty, Execute.

- [ ] No error; rover unchanged; no new lines (except any prior state).

---

## 8. Reset Rover

1. Move or change heading so state ≠ start.
2. Click **Reset Rover**.

- [ ] Rover: square **1**, **South**, grid 1,1.
- [ ] Mission log replaced by **`#1: Mission start — square 1, facing South`** (plus north/west corner perimeter suffix for square 1).
- [ ] `nextLogNumberRef` behavior: next logged action should be **`#2`**.
- [ ] Command inputs cleared; error cleared.

---

## 9. Grid and layout

- [ ] Viewport size follows breakpoints (e.g. 7 / 10 / 20 cells per side by width).
- [ ] Rover cell and direction indicator update after moves / compass.
- [ ] Perimeter cells visually distinct; **Return to rover** (or equivalent) recenters when panned away.
- [ ] **Rover Status** and **Compass** sit in the left column; layout stacks on narrow screens.

---

## 10. Responsiveness and UX

- [ ] Dashboard readable on small widths; mission log lines **wrap** (no clipped “square” text).
- [ ] Execute / Reset remain usable touch targets.

---

## 11. Edge cases

- [ ] **Maximum five** non-empty commands per Execute all run in order (until perimeter stop).
- [ ] **localStorage**: reload preserves rover and history where expected.

---

## Success criteria summary

- Correct movement and clamping on a 100×100 grid.
- Absolute cardinal facing (not turn-by-turn).
- Perimeter detection, cut-short moves, blocked moves, and batch stop at perimeter.
- Mission log formats and **`#`** sequencing as documented.
- Compass applies facing immediately with correct log line.
- Validation blocks the whole batch on any invalid command.
- Reset restores start state and mission start log line.

---

**Document status**: aligned with current app behavior (mission log wording, compass, bare distances, perimeter labels, `localStorage`, reset + `#1` mission start).
