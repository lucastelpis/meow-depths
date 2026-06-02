/**
 * dungeonGenerator.js — Floor-Aware 2D Grid Generator for Meow Depths
 *
 * Generates a grid-based dungeon map for Mochi to explore.
 * Dimensions and content scale with the current floor number.
 *
 * Key behaviours:
 *   - Floors 1–9: no boss tile; all rooms are combat / rest / treasure / gamble / start.
 *   - Floor 10: boss tile is placed (locked until all other tiles are cleared).
 *   - Combat tiles carry a battleRating (1 / 2 / 3 ★) that drives encounter difficulty.
 *   - Room composition (treasure / gamble density) scales with floor depth.
 *   - Hard constraints are always enforced; soft constraints are relaxed after 50 attempts.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Battle rating distribution per floor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns cumulative probability thresholds for [1★, 2★, 3★] on a given floor.
 * Roll Math.random() against these to pick a rating.
 *
 * @param {number} floorNumber
 * @returns {{ star1: number, star2: number }} cumulative thresholds
 *   roll < star1  → 1★
 *   roll < star2  → 2★
 *   else          → 3★
 */
function getBattleRatingThresholds(floorNumber) {
  if (floorNumber <= 3) return { star1: 0.70, star2: 1.00 }; // 70% 1★ / 30% 2★
  if (floorNumber <= 6) return { star1: 0.20, star2: 0.70 }; // 20% 1★ / 50% 2★ / 30% 3★
  if (floorNumber <= 9) return { star1: 0.00, star2: 0.40 }; // 40% 2★ / 60% 3★
  return { star1: 0.00, star2: 0.00 };                       // floor 10: all 3★
}

function rollBattleRating(floorNumber) {
  const { star1, star2 } = getBattleRatingThresholds(floorNumber);
  const roll = Math.random();
  if (roll < star1) return 1;
  if (roll < star2) return 2;
  return 3;
}

// ─────────────────────────────────────────────────────────────────────────────
// Room composition ratios per floor range
// ─────────────────────────────────────────────────────────────────────────────

function getRoomRatios(floorNumber) {
  if (floorNumber <= 3)  return { restPct: 0.12, treasurePct: 0.10, gamblePct: 0.08 };
  if (floorNumber <= 6)  return { restPct: 0.10, treasurePct: 0.14, gamblePct: 0.12 };
  if (floorNumber <= 9)  return { restPct: 0.08, treasurePct: 0.12, gamblePct: 0.10 };
  return                        { restPct: 0.06, treasurePct: 0.06, gamblePct: 0.06 }; // floor 10
}

// ─────────────────────────────────────────────────────────────────────────────
// BFS pathfinder — verifies a path exists between two grid coordinates
// ─────────────────────────────────────────────────────────────────────────────

function findPathBFS(gridWidth, gridHeight, start, target) {
  const queue = [start];
  const visited = new Set([`${start.x},${start.y}`]);

  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr.x === target.x && curr.y === target.y) return true;

    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y:  1 },
      { x: -1, y: 0 },
      { x:  1, y: 0 },
    ];

    for (const d of dirs) {
      const nx = curr.x + d.x;
      const ny = curr.y + d.y;
      if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
        const key = `${nx},${ny}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// validateGrid
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a generated grid against hard and soft rules.
 *
 * @param {Array}   grid
 * @param {number}  gridWidth
 * @param {number}  gridHeight
 * @param {boolean} hasBoss – true only on floor 10
 * @returns {{ isValid: boolean, passSoft: boolean, report: string[] }}
 */
export function validateGrid(grid, gridWidth, gridHeight, hasBoss = false) {
  const report = [];
  let startTile = null;
  let bossTile  = null;
  const restTiles = [];

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const tile = grid[y][x];
      if (tile.type === 'start')  startTile = tile;
      if (tile.type === 'boss')   bossTile  = tile;
      if (tile.type === 'rest')   restTiles.push(tile);
    }
  }

  let hardPassed = true;

  // 1. Start always bottom-left
  const isStartAtBottomLeft = startTile && startTile.x === 0 && startTile.y === gridHeight - 1;
  report.push(`[HARD] Start at bottom-left: ${isStartAtBottomLeft ? 'PASS' : 'FAIL'}`);
  if (!isStartAtBottomLeft) hardPassed = false;

  if (hasBoss) {
    // 2. Boss not adjacent to start
    let isBossAdjacentToStart = false;
    if (startTile && bossTile) {
      const dist = Math.abs(startTile.x - bossTile.x) + Math.abs(startTile.y - bossTile.y);
      isBossAdjacentToStart = (dist === 1);
    }
    report.push(`[HARD] Boss not adjacent to start: ${!isBossAdjacentToStart ? 'PASS' : 'FAIL'}`);
    if (isBossAdjacentToStart) hardPassed = false;

    // 3. Boss in top row or rightmost column
    const isBossOnEdge = bossTile && (bossTile.y === 0 || bossTile.x === gridWidth - 1);
    report.push(`[HARD] Boss in top row or rightmost col: ${isBossOnEdge ? 'PASS' : 'FAIL'}`);
    if (!isBossOnEdge) hardPassed = false;

    // 4. Path exists from start to boss
    const hasPath = (startTile && bossTile)
      ? findPathBFS(gridWidth, gridHeight, startTile, bossTile)
      : false;
    report.push(`[HARD] Path from start to boss: ${hasPath ? 'PASS' : 'FAIL'}`);
    if (!hasPath) hardPassed = false;
  } else {
    // No boss — just ensure the grid is fully connected from start
    // (BFS from start must reach at least one non-start corner cell)
    const anyCorner = [
      { x: gridWidth - 1, y: 0 },
      { x: gridWidth - 1, y: gridHeight - 1 },
    ].filter(c => !(c.x === 0 && c.y === gridHeight - 1));

    const reachable = anyCorner.some(c =>
      startTile ? findPathBFS(gridWidth, gridHeight, startTile, c) : false
    );
    report.push(`[HARD] Grid reachable from start: ${reachable ? 'PASS' : 'FAIL'}`);
    if (!reachable) hardPassed = false;
  }

  // ── Soft rules ─────────────────────────────────────────────────────────────
  let softPassed = true;

  // No two rest tiles adjacent
  let restAdjacent = false;
  for (let i = 0; i < restTiles.length; i++) {
    for (let j = i + 1; j < restTiles.length; j++) {
      const dist = Math.abs(restTiles[i].x - restTiles[j].x) + Math.abs(restTiles[i].y - restTiles[j].y);
      if (dist === 1) restAdjacent = true;
    }
  }
  report.push(`[SOFT] No adjacent rest tiles: ${!restAdjacent ? 'PASS' : 'FAIL'}`);
  if (restAdjacent) softPassed = false;

  // No rest tile adjacent to start
  let restAdjacentToStart = false;
  if (startTile) {
    for (const rest of restTiles) {
      const dist = Math.abs(rest.x - startTile.x) + Math.abs(rest.y - startTile.y);
      if (dist === 1) restAdjacentToStart = true;
    }
  }
  report.push(`[SOFT] No rest adjacent to start: ${!restAdjacentToStart ? 'PASS' : 'FAIL'}`);
  if (restAdjacentToStart) softPassed = false;

  // No treasure adjacent to start
  let treasureAdjacentToStart = false;
  if (startTile) {
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (grid[y][x].type === 'treasure') {
          const dist = Math.abs(x - startTile.x) + Math.abs(y - startTile.y);
          if (dist === 1) treasureAdjacentToStart = true;
        }
      }
    }
  }
  report.push(`[SOFT] No treasure adjacent to start: ${!treasureAdjacentToStart ? 'PASS' : 'FAIL'}`);
  if (treasureAdjacentToStart) softPassed = false;

  // No gamble adjacent to start
  let gambleAdjacentToStart = false;
  if (startTile) {
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (grid[y][x].type === 'gamble') {
          const dist = Math.abs(x - startTile.x) + Math.abs(y - startTile.y);
          if (dist === 1) gambleAdjacentToStart = true;
        }
      }
    }
  }
  report.push(`[SOFT] No gamble adjacent to start: ${!gambleAdjacentToStart ? 'PASS' : 'FAIL'}`);
  if (gambleAdjacentToStart) softPassed = false;

  return { isValid: hardPassed, passSoft: softPassed, report };
}

// ─────────────────────────────────────────────────────────────────────────────
// generateDungeonGrid — main entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a floor-aware dungeon grid.
 *
 * @param {number} gridWidth
 * @param {number} gridHeight
 * @param {string} zoneId
 * @param {number} floorNumber – 1-indexed (1–10). Drives room composition and battle ratings.
 * @returns {Array} 2D array of tile objects (tiles[y][x]).
 */
export function generateDungeonGrid(gridWidth, gridHeight, _zoneId, floorNumber = 1) {
  const MAX_ATTEMPTS    = 100;
  const SOFT_RELAX_LIMIT = 50;
  const hasBoss = floorNumber === 10;

  const totalTiles   = gridWidth * gridHeight;
  // Start tile + boss tile (only on floor 10) are reserved
  const reservedTiles = hasBoss ? 2 : 1;
  const nonReserved   = totalTiles - reservedTiles;

  const { restPct, treasurePct, gamblePct } = getRoomRatios(floorNumber);

  const numRest     = Math.max(1, Math.min(Math.floor(nonReserved * 0.4), Math.round(nonReserved * restPct)));
  const numTreasure = Math.max(1, Math.min(Math.floor(nonReserved * 0.4), Math.round(nonReserved * treasurePct)));
  const numGamble   = Math.max(1, Math.min(Math.floor(nonReserved * 0.3), Math.round(nonReserved * gamblePct)));
  const numCombat   = nonReserved - numRest - numTreasure - numGamble;

  let bestGrid = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // 1. Initialise empty grid
    const grid = [];
    for (let y = 0; y < gridHeight; y++) {
      const row = [];
      for (let x = 0; x < gridWidth; x++) {
        row.push({ x, y, type: 'combat', revealed: false, cleared: false, contents: null, battleRating: 1 });
      }
      grid.push(row);
    }

    // 2. Place start (bottom-left, always revealed + cleared)
    const startX = 0;
    const startY = gridHeight - 1;
    grid[startY][startX].type    = 'start';
    grid[startY][startX].revealed = true;
    grid[startY][startX].cleared  = true;

    // 3. Place boss (floor 10 only — top row or rightmost column, not adjacent to start)
    if (hasBoss) {
      const bossPositions = [];
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          if (x === startX && y === startY) continue;
          if (y === 0 || x === gridWidth - 1) {
            const dist = Math.abs(x - startX) + Math.abs(y - startY);
            if (dist > 1) bossPositions.push({ x, y });
          }
        }
      }
      const bossPos = bossPositions[Math.floor(Math.random() * bossPositions.length)];
      grid[bossPos.y][bossPos.x].type = 'boss';
    }

    // 4. Collect remaining empty coordinates
    const emptyCoords = [];
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const t = grid[y][x];
        if (t.type !== 'start' && t.type !== 'boss') emptyCoords.push({ x, y });
      }
    }

    // 5. Build and shuffle room pool
    const roomPool = [];
    for (let i = 0; i < numRest;     i++) roomPool.push('rest');
    for (let i = 0; i < numTreasure; i++) roomPool.push('treasure');
    for (let i = 0; i < numGamble;   i++) roomPool.push('gamble');
    for (let i = 0; i < numCombat;   i++) roomPool.push('combat');

    for (let i = roomPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roomPool[i], roomPool[j]] = [roomPool[j], roomPool[i]];
    }

    // 6. Assign types and battle ratings
    emptyCoords.forEach((coord, idx) => {
      const type = roomPool[idx];
      grid[coord.y][coord.x].type = type;
      if (type === 'combat') {
        grid[coord.y][coord.x].battleRating = rollBattleRating(floorNumber);
      }
    });

    // 7. Validate
    const { isValid, passSoft, report } = validateGrid(grid, gridWidth, gridHeight, hasBoss);

    if (isValid) {
      if (passSoft || attempt >= SOFT_RELAX_LIMIT) {
        console.log(`[DungeonGenerator] Floor ${floorNumber} grid ready on attempt ${attempt}.`);
        console.log(report.join('\n'));
        return grid;
      }
      if (!bestGrid) bestGrid = grid;
    }
  }

  if (bestGrid) {
    console.warn(`[DungeonGenerator] Returning hard-valid grid (soft rules relaxed).`);
    return bestGrid;
  }

  throw new Error(`[DungeonGenerator] Failed after ${MAX_ATTEMPTS} attempts.`);
}

export default generateDungeonGrid;
