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
// Zone Floor Configurations & Combat Pools
// ─────────────────────────────────────────────────────────────────────────────

export const ZONE_FLOOR_CONFIGS = {
  zone1: {
    1:  { gridWidth: 3, gridHeight: 3, numCombat: 4,  numRest: 2, numGamble: 1, numTreasure: 1, hasBoss: false },
    2:  { gridWidth: 3, gridHeight: 3, numCombat: 5,  numRest: 1, numGamble: 1, numTreasure: 1, hasBoss: false },
    3:  { gridWidth: 3, gridHeight: 3, numCombat: 5,  numRest: 1, numGamble: 1, numTreasure: 1, hasBoss: false },
    4:  { gridWidth: 3, gridHeight: 4, numCombat: 7,  numRest: 2, numGamble: 1, numTreasure: 1, hasBoss: false },
    5:  { gridWidth: 3, gridHeight: 4, numCombat: 8,  numRest: 1, numGamble: 1, numTreasure: 1, hasBoss: false },
    6:  { gridWidth: 3, gridHeight: 4, numCombat: 8,  numRest: 1, numGamble: 1, numTreasure: 1, hasBoss: false },
    7:  { gridWidth: 4, gridHeight: 4, numCombat: 11, numRest: 2, numGamble: 1, numTreasure: 1, hasBoss: false },
    8:  { gridWidth: 4, gridHeight: 4, numCombat: 11, numRest: 2, numGamble: 1, numTreasure: 1, hasBoss: false },
    9:  { gridWidth: 4, gridHeight: 4, numCombat: 11, numRest: 2, numGamble: 1, numTreasure: 1, hasBoss: false },
    10: { gridWidth: 4, gridHeight: 5, numCombat: 13, numRest: 2, numGamble: 1, numTreasure: 2, hasBoss: true  },
  }
};

export const ZONE_COMBAT_POOLS = {
  zone1: {
    1:  { ratings: [1, 1, 1, 1], enemyCounts: [1, 1, 1, 2] },
    2:  { ratings: [1, 1, 2, 2, 2], enemyCounts: [1, 1, 2, 2, 2] },
    3:  { ratings: [2, 2, 2, 2, 2], enemyCounts: [2, 2, 2, 3, 3] },
    4:  { ratings: [2, 2, 2, 3, 3, 3, 3], enemyCounts: [2, 2, 3, 3, 3, 3, 3] },
    5:  { ratings: [3, 3, 3, 3, 3, 3, 3, 3], enemyCounts: [2, 2, 3, 3, 3, 3, 3, 3] },
    6:  { ratings: [3, 3, 3, 3, 4, 4, 4, 4], enemyCounts: [2, 2, 3, 3, 3, 3, 4, 4] },
    7:  { ratings: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], enemyCounts: [3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4] },
    8:  { ratings: [4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5], enemyCounts: [3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4] },
    9:  { ratings: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], enemyCounts: [3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4] },
    10: { ratings: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], enemyCounts: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4] },
  }
};

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
export function generateDungeonGrid(gridWidth, gridHeight, zoneId, floorNumber = 1) {
  const MAX_ATTEMPTS    = 100;
  const SOFT_RELAX_LIMIT = 50;

  // Retrieve configurations for this specific zone & floor (fall back to zone1 if undefined)
  const zoneConfig = ZONE_FLOOR_CONFIGS[zoneId] || ZONE_FLOOR_CONFIGS.zone1;
  const config = zoneConfig[floorNumber] || zoneConfig[1];

  const w = config.gridWidth;
  const h = config.gridHeight;
  const hasBoss = config.hasBoss;

  const numRest = config.numRest;
  const numTreasure = config.numTreasure;
  const numGamble = config.numGamble;
  const numCombat = config.numCombat;

  let bestGrid = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // 1. Initialise empty grid
    const grid = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        row.push({ x, y, type: 'combat', revealed: false, cleared: false, contents: null, battleRating: 1, enemyCount: 1 });
      }
      grid.push(row);
    }

    // 2. Place start (bottom-left, always revealed + cleared)
    const startX = 0;
    const startY = h - 1;
    grid[startY][startX].type    = 'start';
    grid[startY][startX].revealed = true;
    grid[startY][startX].cleared  = true;

    // 3. Place boss (top row or rightmost column, not adjacent to start)
    if (hasBoss) {
      const bossPositions = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (x === startX && y === startY) continue;
          if (y === 0 || x === w - 1) {
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
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
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

    const shuffledRoomPool = shuffle(roomPool);

    // 6. Assign types, battle ratings, and enemy counts
    const zoneCombatPool = ZONE_COMBAT_POOLS[zoneId] || ZONE_COMBAT_POOLS.zone1;
    const combatPool = zoneCombatPool[floorNumber] || zoneCombatPool[1];

    const ratingsPool = shuffle(combatPool.ratings);
    const enemyCountsPool = shuffle(combatPool.enemyCounts);

    emptyCoords.forEach((coord, idx) => {
      const type = shuffledRoomPool[idx];
      grid[coord.y][coord.x].type = type;
      if (type === 'combat') {
        grid[coord.y][coord.x].battleRating = ratingsPool.pop() || 1;
        grid[coord.y][coord.x].enemyCount = enemyCountsPool.pop() || 1;
      }
    });

    // 7. Validate
    const { isValid, passSoft, report } = validateGrid(grid, w, h, hasBoss);

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
