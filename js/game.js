/**
 * Lógica principal del juego: física de la bola, renderizado y flujo de pantallas.
 */
const Game = (() => {
  const LEVELS = [
    { cols: 8, rows: 8 },
    { cols: 10, rows: 10 },
    { cols: 12, rows: 12 },
    { cols: 14, rows: 14 },
    { cols: 16, rows: 16 }
  ];

  const FRICTION = 0.92;
  const MAX_SPEED = 6;
  const ACCEL = 0.35;

  let canvas, ctx;
  let maze = null;
  let cellSize = 40;
  let padding = 10;
  let ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 12 };
  let currentLevel = 0;
  let running = false;
  let startTime = 0;
  let elapsed = 0;
  let animationId = null;

  const screens = {
    start: null,
    game: null,
    win: null,
    pause: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const sec = String(totalSec % 60).padStart(2, '0');
    return `${min}:${sec}`;
  }

  function getMazeDimensions() {
    const level = LEVELS[Math.min(currentLevel, LEVELS.length - 1)];
    return { cols: level.cols, rows: level.rows };
  }

  function resizeCanvas() {
    const wrapper = document.querySelector('.canvas-wrapper');
    const maxW = wrapper.clientWidth - 4;
    const maxH = wrapper.clientHeight - 4;
    const { cols, rows } = getMazeDimensions();

    const sizeByW = Math.floor((maxW - padding * 2) / cols);
    const sizeByH = Math.floor((maxH - padding * 2) / rows);
    cellSize = Math.max(20, Math.min(sizeByW, sizeByH, 50));

    const w = cols * cellSize + padding * 2;
    const h = rows * cellSize + padding * 2;

    canvas.width = w;
    canvas.height = h;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }

  function initLevel() {
    const { cols, rows } = getMazeDimensions();
    maze = MazeGenerator.generate(cols, rows);
    resizeCanvas();

    const start = MazeGenerator.getStartPosition(maze, cellSize, padding);
    ball.x = start.x;
    ball.y = start.y;
    ball.vx = 0;
    ball.vy = 0;
    ball.radius = cellSize * 0.28;

    $('level-display').textContent = `Nivel ${currentLevel + 1}`;
  }

  function updatePhysics() {
    const input = GyroscopeController.getOutput();

    ball.vx += input.x * ACCEL;
    ball.vy += input.y * ACCEL;

    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed > MAX_SPEED) {
      ball.vx = (ball.vx / speed) * MAX_SPEED;
      ball.vy = (ball.vy / speed) * MAX_SPEED;
    }

    ball.vx *= FRICTION;
    ball.vy *= FRICTION;

    ball.x += ball.vx;
    ball.y += ball.vy;

    MazeGenerator.checkWallCollision(ball, maze, cellSize, padding);

    if (MazeGenerator.checkExit(ball, maze, cellSize, padding)) {
      winLevel();
    }
  }

  function drawBall() {
    const gradient = ctx.createRadialGradient(
      ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, 0,
      ball.x, ball.y, ball.radius
    );
    gradient.addColorStop(0, '#ff8fa3');
    gradient.addColorStop(1, '#e94560');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  function updateIndicator() {
    const output = GyroscopeController.getOutput();
    const maxOffset = 20;
    const offsetX = output.x * maxOffset;
    const offsetY = output.y * maxOffset;

    let style = document.getElementById('indicator-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'indicator-style';
      document.head.appendChild(style);
    }
    style.textContent = `#indicator-dot::after { transform: translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)); }`;
  }

  function render() {
    MazeGenerator.draw(ctx, maze, cellSize, padding);
    drawBall();
    updateIndicator();
  }

  function gameLoop(timestamp) {
    if (!running) return;

    elapsed = timestamp - startTime;
    $('timer-display').textContent = formatTime(elapsed);

    updatePhysics();
    render();

    animationId = requestAnimationFrame(gameLoop);
  }

  function startGame() {
    currentLevel = 0;
    initLevel();
    running = true;
    startTime = performance.now();
    showScreen('game');
    GyroscopeController.calibrate();
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
  }

  function resumeGame() {
    running = true;
    startTime = performance.now() - elapsed;
    showScreen('game');
    animationId = requestAnimationFrame(gameLoop);
  }

  function pauseGame() {
    running = false;
    cancelAnimationFrame(animationId);
    showScreen('pause');
  }

  function winLevel() {
    running = false;
    cancelAnimationFrame(animationId);

    $('win-time').textContent = `Tiempo: ${formatTime(elapsed)}`;
    $('win-level').textContent = `Nivel completado: ${currentLevel + 1}`;
    showScreen('win');
  }

  function nextLevel() {
    currentLevel++;
    if (currentLevel >= LEVELS.length) {
      currentLevel = 0;
    }
    initLevel();
    running = true;
    startTime = performance.now();
    showScreen('game');
    GyroscopeController.calibrate();
    animationId = requestAnimationFrame(gameLoop);
  }

  function restartLevel() {
    initLevel();
    running = true;
    startTime = performance.now();
    showScreen('game');
    GyroscopeController.calibrate();
    animationId = requestAnimationFrame(gameLoop);
  }

  function quitToMenu() {
    running = false;
    cancelAnimationFrame(animationId);
    showScreen('start');
  }

  function readConfigFromUI() {
    GyroscopeController.setConfig({
      axisX: $('axis-x').value,
      axisY: $('axis-y').value,
      sensitivity: parseFloat($('sensitivity').value),
      invertX: $('invert-x').checked,
      invertY: $('invert-y').checked,
      useKeyboard: $('use-keyboard').checked
    });
  }

  function bindUI() {
    $('sensitivity').addEventListener('input', (e) => {
      $('sensitivity-value').textContent = e.target.value;
      readConfigFromUI();
    });

    ['axis-x', 'axis-y', 'invert-x', 'invert-y', 'use-keyboard'].forEach(id => {
      $(id).addEventListener('change', readConfigFromUI);
    });

    $('btn-enable-gyro').addEventListener('click', async () => {
      readConfigFromUI();
      const status = $('gyro-status');
      const result = await GyroscopeController.requestPermission();

      if (result.ok) {
        status.textContent = 'Giroscopio: activo ✓';
        status.className = 'status-text active';
      } else {
        status.textContent = result.message;
        status.className = 'status-text error';
      }
    });

    $('btn-start').addEventListener('click', () => {
      readConfigFromUI();
      GyroscopeController.start();
      startGame();
    });

    $('btn-pause').addEventListener('click', pauseGame);
    $('btn-calibrate').addEventListener('click', () => GyroscopeController.calibrate());
    $('btn-resume').addEventListener('click', resumeGame);
    $('btn-restart').addEventListener('click', restartLevel);
    $('btn-quit').addEventListener('click', quitToMenu);
    $('btn-next-level').addEventListener('click', nextLevel);
    $('btn-menu').addEventListener('click', quitToMenu);

    window.addEventListener('resize', () => {
      if (maze && screens.game.classList.contains('active')) {
        resizeCanvas();
        render();
      }
    });
  }

  function init() {
    canvas = $('game-canvas');
    ctx = canvas.getContext('2d');

    screens.start = $('screen-start');
    screens.game = $('screen-game');
    screens.win = $('screen-win');
    screens.pause = $('screen-pause');

    bindUI();
    readConfigFromUI();

    const status = $('gyro-status');
    if (!GyroscopeController.isSupported()) {
      status.textContent = 'Giroscopio no disponible — usa el teclado (WASD)';
      status.className = 'status-text';
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Game.init);
