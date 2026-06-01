/**
 * dungeonGenerator.js — Standalone 2D Grid Generator for Meow Depths
 *
 * Generates a grid-based dungeon map for Mochi to explore.
 * Dimensions are configurable per zone.
 * Enforces five hard constraints and five soft constraints (relaxed after 50 attempts).
 */

// BFS pathfinder helper to verify that a path exists between two coordinates
function findPathBFS(gridWidth, gridHeight, start, target) {
  const queue = [start];
  const visited = new Set([`${start.x},${start.y}`]);

  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr.x === target.x && curr.y === target.y) {
      return true;
    }

    const dirs = [
      { x: 0, y: -1 }, // Up
      { x: 0, y: 1 },  // Down
      { x: -1, y: 0 }, // Left
      { x: 1, y: 0 },  // Right
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

/**
 * Validate a generated dungeon grid against hard and soft rules.
 *
 * @param {Array} grid - The 2D array of tile objects (grid[y][x]).
 * @param {number} gridWidth - Width of the grid.
 * @param {number} gridHeight - Height of the grid.
 * @returns {Object} { isValid: boolean, passSoft: boolean, report: string[] }
 */
export function validateGrid(grid, gridWidth, gridHeight) {
  const report = [];
  let startTile = null;
  let bossTile = null;
  const restTiles = [];

  // Find start, boss, and rest tiles
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const tile = grid[y][x];
      if (tile.type === 'start') startTile = tile;
      if (tile.type === 'boss') bossTile = tile;
      if (tile.type === 'rest') restTiles.push(tile);
    }
  }

  // --- HARD RULES (Must always pass) ---
  let hardPassed = true;

  // 1. Start is always bottom-left (0, gridHeight-1)
  const isStartAtBottomLeft = (startTile && startTile.x === 0 && startTile.y === gridHeight - 1);
  report.push(`[HARD] Start at bottom-left: ${isStartAtBottomLeft ? 'PASS' : 'FAIL'}`);
  if (!isStartAtBottomLeft) hardPassed = false;

  // 2. Boss is never orthogonally adjacent to start
  let isBossAdjacentToStart = false;
  if (startTile && bossTile) {
    const dist = Math.abs(startTile.x - bossTile.x) + Math.abs(startTile.y - bossTile.y);
    isBossAdjacentToStart = (dist === 1);
  }
  report.push(`[HARD] Boss not adjacent to start: ${!isBossAdjacentToStart ? 'PASS' : 'FAIL'}`);
  if (isBossAdjacentToStart) hardPassed = false;

  // 3. Boss placed in top row (y === 0) OR rightmost column (x === gridWidth-1)
  const isBossOnEdge = (bossTile && (bossTile.y === 0 || bossTile.x === gridWidth - 1));
  report.push(`[HARD] Boss in top row or rightmost col: ${isBossOnEdge ? 'PASS' : 'FAIL'}`);
  if (!isBossOnEdge) hardPassed = false;

  // 4 & 5. Path exists from start to boss (connected orthogonally)
  const hasPath = (startTile && bossTile) ? findPathBFS(gridWidth, gridHeight, startTile, bossTile) : false;
  report.push(`[HARD] Path exists from start to boss: ${hasPath ? 'PASS' : 'FAIL'}`);
  if (!hasPath) hardPassed = false;

  // --- SOFT RULES (Try to pass, can relax) ---
  let softPassed = true;

  // 6. No two rest tiles orthogonally adjacent
  let restAdjacent = false;
  for (let i = 0; i < restTiles.length; i++) {
    for (let j = i + 1; j < restTiles.length; j++) {
      const dist = Math.abs(restTiles[i].x - restTiles[j].x) + Math.abs(restTiles[i].y - restTiles[j].y);
      if (dist === 1) restAdjacent = true;
    }
  }
  report.push(`[SOFT] No adjacent rest tiles: ${!restAdjacent ? 'PASS' : 'FAIL'}`);
  if (restAdjacent) softPassed = false;

  // 7. No rest tile orthogonally adjacent to start
  let restAdjacentToStart = false;
  if (startTile) {
    for (const rest of restTiles) {
      const dist = Math.abs(rest.x - startTile.x) + Math.abs(rest.y - startTile.y);
      if (dist === 1) restAdjacentToStart = true;
    }
  }
  report.push(`[SOFT] No rest tile adjacent to start: ${!restAdjacentToStart ? 'PASS' : 'FAIL'}`);
  if (restAdjacentToStart) softPassed = false;

  // 8. No treasure tile orthogonally adjacent to start
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

  // 9. ??? (gamble) tiles not adjacent to start
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

  // 10. Boss is not the only tile in its row
  let bossAloneInRow = true;
  if (bossTile) {
    for (let x = 0; x < gridWidth; x++) {
      if (x !== bossTile.x) {
        bossAloneInRow = false;
        break;
      }
    }
  }
  report.push(`[SOFT] Boss not alone in row: ${!bossAloneInRow ? 'PASS' : 'FAIL'}`);
  if (bossAloneInRow) softPassed = false;

  return {
    isValid: hardPassed,
    passSoft: softPassed,
    report,
  };
}

/**
 * Generate a grid-based dungeon map.
 *
 * @param {number} gridWidth - Width of the grid.
 * @param {number} gridHeight - Height of the grid.
 * @param {string} zoneId - Identifier of the zone (zone1, zone2, zone3).
 * @returns {Array} 2D array of tile objects (tiles[y][x]).
 */
export function generateDungeonGrid(gridWidth, gridHeight, zoneId) {
  const MAX_ATTEMPTS = 100;
  const SOFT_RELAX_LIMIT = 50;

  const totalTiles = gridWidth * gridHeight;
  const nonStartNonBoss = totalTiles - 2;

  // Determine compositions
  const numRest = Math.max(2, Math.min(4, Math.round(nonStartNonBoss * 0.12)));
  const numTreasure = Math.max(2, Math.min(4, Math.round(nonStartNonBoss * 0.12)));
  const numGamble = Math.max(1, Math.min(3, Math.round(nonStartNonBoss * 0.12)));
  const numCombat = nonStartNonBoss - numRest - numTreasure - numGamble;

  let bestGrid = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // 1. Initialize grid template
    const grid = [];
    for (let y = 0; y < gridHeight; y++) {
      const row = [];
      for (let x = 0; x < gridWidth; x++) {
        row.push({
          x,
          y,
          type: 'combat', // placeholder
          revealed: false,
          cleared: false,
          contents: null,
        });
      }
      grid.push(row);
    }

    // 2. Place Start Room: always bottom-left (0, gridHeight-1)
    const startX = 0;
    const startY = gridHeight - 1;
    grid[startY][startX].type = 'start';
    grid[startY][startX].revealed = true;
    grid[startY][startX].cleared = true; // start is always visited

    // 3. Find potential boss positions (top row OR rightmost column)
    const bossPositions = [];
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        // Exclude start position
        if (x === startX && y === startY) continue;

        // Boss must be in top row (y === 0) or rightmost column (x === gridWidth-1)
        if (y === 0 || x === gridWidth - 1) {
          // Exclude orthogonal adjacent positions to start
          const dist = Math.abs(x - startX) + Math.abs(y - startY);
          if (dist > 1) {
            bossPositions.push({ x, y });
          }
        }
      }
    }

    // Pick a random boss position
    const bossPos = bossPositions[Math.floor(Math.random() * bossPositions.length)];
    grid[bossPos.y][bossPos.x].type = 'boss';

    // 4. Gather empty coordinates for other room assignments
    const emptyCoords = [];
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (grid[y][x].type !== 'start' && grid[y][x].type !== 'boss') {
          emptyCoords.push({ x, y });
        }
      }
    }

    // Create pool of room types
    const roomPool = [];
    for (let i = 0; i < numRest; i++) roomPool.push('rest');
    for (let i = 0; i < numTreasure; i++) roomPool.push('treasure');
    for (let i = 0; i < numGamble; i++) roomPool.push('gamble');
    for (let i = 0; i < numCombat; i++) roomPool.push('combat');

    // Shuffle the pool using Fisher-Yates
    for (let i = roomPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roomPool[i], roomPool[j]] = [roomPool[j], roomPool[i]];
    }

    // Assign room types
    emptyCoords.forEach((coord, index) => {
      grid[coord.y][coord.x].type = roomPool[index];
    });

    // 5. Validate Grid
    const { isValid, passSoft, report } = validateGrid(grid, gridWidth, gridHeight);

    if (isValid) {
      if (passSoft || attempt >= SOFT_RELAX_LIMIT) {
        console.log(`[DungeonGenerator] Grid generated successfully on attempt ${attempt}.`);
        console.log(report.join('\n'));
        return grid;
      }
      // Save valid hard grid as fallback
      if (!bestGrid) {
        bestGrid = grid;
      }
    }
  }

  // Fallback to the first hard-valid grid we found
  if (bestGrid) {
    console.warn(`[DungeonGenerator] Could not satisfy all soft rules. Returning hard-valid grid.`);
    return bestGrid;
  }

  throw new Error(`[DungeonGenerator] Failed to generate valid dungeon grid after ${MAX_ATTEMPTS} attempts.`);
}

export default generateDungeonGrid;
