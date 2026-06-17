/**
 * Generador de laberintos con algoritmo de backtracking (DFS).
 */
const MazeGenerator = (() => {
  function createGrid(cols, rows) {
    const grid = [];
    for (let y = 0; y < rows; y++) {
      grid[y] = [];
      for (let x = 0; x < cols; x++) {
        grid[y][x] = { top: true, right: true, bottom: true, left: true, visited: false };
      }
    }
    return grid;
  }

  function getNeighbors(x, y, cols, rows) {
    const neighbors = [];
    if (y > 0) neighbors.push({ x, y: y - 1, wall: 'top', opposite: 'bottom' });
    if (x < cols - 1) neighbors.push({ x: x + 1, y, wall: 'right', opposite: 'left' });
    if (y < rows - 1) neighbors.push({ x, y: y + 1, wall: 'bottom', opposite: 'top' });
    if (x > 0) neighbors.push({ x: x - 1, y, wall: 'left', opposite: 'right' });
    return neighbors;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function generate(cols, rows) {
    const grid = createGrid(cols, rows);
    const stack = [{ x: 0, y: 0 }];
    grid[0][0].visited = true;

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = shuffle(
        getNeighbors(current.x, current.y, cols, rows).filter(n => !grid[n.y][n.x].visited)
      );

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const next = neighbors[0];
        grid[current.y][current.x][next.wall] = false;
        grid[next.y][next.x][next.opposite] = false;
        grid[next.y][next.x].visited = true;
        stack.push({ x: next.x, y: next.y });
      }
    }

    return { grid, cols, rows };
  }

  function cellToPixel(cellX, cellY, cellSize, padding) {
    return {
      x: padding + cellX * cellSize + cellSize / 2,
      y: padding + cellY * cellSize + cellSize / 2
    };
  }

  function getStartPosition(maze, cellSize, padding) {
    return cellToPixel(0, 0, cellSize, padding);
  }

  function getExitPosition(maze, cellSize, padding) {
    return cellToPixel(maze.cols - 1, maze.rows - 1, cellSize, padding);
  }

  function draw(ctx, maze, cellSize, padding) {
    const { grid, cols, rows } = maze;
    const width = cols * cellSize + padding * 2;
    const height = rows * cellSize + padding * 2;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#0f3460';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid[y][x];
        const px = padding + x * cellSize;
        const py = padding + y * cellSize;

        if (cell.top) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + cellSize, py);
          ctx.stroke();
        }
        if (cell.right) {
          ctx.beginPath();
          ctx.moveTo(px + cellSize, py);
          ctx.lineTo(px + cellSize, py + cellSize);
          ctx.stroke();
        }
        if (cell.bottom) {
          ctx.beginPath();
          ctx.moveTo(px, py + cellSize);
          ctx.lineTo(px + cellSize, py + cellSize);
          ctx.stroke();
        }
        if (cell.left) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + cellSize);
          ctx.stroke();
        }
      }
    }

    const exit = getExitPosition(maze, cellSize, padding);
    const exitRadius = cellSize * 0.35;
    const gradient = ctx.createRadialGradient(exit.x, exit.y, 0, exit.x, exit.y, exitRadius);
    gradient.addColorStop(0, 'rgba(78, 204, 163, 0.9)');
    gradient.addColorStop(1, 'rgba(78, 204, 163, 0.2)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, exitRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#4ecca3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, exitRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  function checkWallCollision(ball, maze, cellSize, padding) {
    const { grid, cols, rows } = maze;
    const r = ball.radius;
    const bx = ball.x;
    const by = ball.y;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid[y][x];
        const px = padding + x * cellSize;
        const py = padding + y * cellSize;

        const walls = [
          { active: cell.top, x1: px, y1: py, x2: px + cellSize, y2: py },
          { active: cell.right, x1: px + cellSize, y1: py, x2: px + cellSize, y2: py + cellSize },
          { active: cell.bottom, x1: px, y1: py + cellSize, x2: px + cellSize, y2: py + cellSize },
          { active: cell.left, x1: px, y1: py, x2: px, y2: py + cellSize }
        ];

        for (const wall of walls) {
          if (!wall.active) continue;
          resolveCircleLineCollision(ball, wall.x1, wall.y1, wall.x2, wall.y2);
        }
      }
    }

    const outerWalls = [
      { x1: padding, y1: padding, x2: padding + cols * cellSize, y2: padding },
      { x1: padding + cols * cellSize, y1: padding, x2: padding + cols * cellSize, y2: padding + rows * cellSize },
      { x1: padding, y1: padding + rows * cellSize, x2: padding + cols * cellSize, y2: padding + rows * cellSize },
      { x1: padding, y1: padding, x2: padding, y2: padding + rows * cellSize }
    ];

    for (const wall of outerWalls) {
      resolveCircleLineCollision(ball, wall.x1, wall.y1, wall.x2, wall.y2);
    }
  }

  function resolveCircleLineCollision(ball, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return;

    let t = ((ball.x - x1) * dx + (ball.y - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    const distX = ball.x - closestX;
    const distY = ball.y - closestY;
    const distSq = distX * distX + distY * distY;
    const r = ball.radius;

    if (distSq < r * r && distSq > 0) {
      const dist = Math.sqrt(distSq);
      const overlap = r - dist;
      const nx = distX / dist;
      const ny = distY / dist;

      ball.x += nx * overlap;
      ball.y += ny * overlap;

      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        ball.vx -= 1.6 * dot * nx;
        ball.vy -= 1.6 * dot * ny;
      }
    }
  }

  function checkExit(ball, maze, cellSize, padding) {
    const exit = getExitPosition(maze, cellSize, padding);
    const dx = ball.x - exit.x;
    const dy = ball.y - exit.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < cellSize * 0.4;
  }

  return {
    generate,
    draw,
    getStartPosition,
    getExitPosition,
    checkWallCollision,
    checkExit
  };
})();
