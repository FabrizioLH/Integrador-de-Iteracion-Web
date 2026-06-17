/**
 * Módulo de control por giroscopio (DeviceOrientation API)
 * Permite seleccionar qué ejes (alpha, beta, gamma) controlan el movimiento.
 */
const GyroscopeController = (() => {
  const AXIS_KEYS = ['alpha', 'beta', 'gamma'];

  let config = {
    axisX: 'gamma',
    axisY: 'beta',
    sensitivity: 1.5,
    invertX: false,
    invertY: false,
    useKeyboard: true
  };

  let calibration = { alpha: 0, beta: 0, gamma: 0 };
  let raw = { alpha: 0, beta: 0, gamma: 0 };
  let output = { x: 0, y: 0 };
  let enabled = false;
  let permissionGranted = false;

  const keyboard = { up: false, down: false, left: false, right: false };

  const KEY_MAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right'
  };

  function normalizeAngle(value) {
    if (value === null || value === undefined || isNaN(value)) return 0;
    return value;
  }

  function getAxisValue(axis) {
    if (axis === 'none') return 0;
    const rawVal = normalizeAngle(raw[axis]) - calibration[axis];
    return Math.max(-45, Math.min(45, rawVal));
  }

  function applyAxis(value, invert) {
    const v = value / 45;
    return invert ? -v : v;
  }

  function updateOutput() {
    let x = getAxisValue(config.axisX);
    let y = getAxisValue(config.axisY);

    x = applyAxis(x, config.invertX) * config.sensitivity;
    y = applyAxis(y, config.invertY) * config.sensitivity;

    if (config.useKeyboard) {
      const kbSpeed = 0.8 * config.sensitivity;
      if (keyboard.left) x -= kbSpeed;
      if (keyboard.right) x += kbSpeed;
      if (keyboard.up) y -= kbSpeed;
      if (keyboard.down) y += kbSpeed;
    }

    output.x = Math.max(-1, Math.min(1, x));
    output.y = Math.max(-1, Math.min(1, y));
  }

  function onOrientation(event) {
    raw.alpha = normalizeAngle(event.alpha);
    raw.beta = normalizeAngle(event.beta);
    raw.gamma = normalizeAngle(event.gamma);
    updateOutput();
  }

  function onKeyDown(e) {
    const action = KEY_MAP[e.key];
    if (action) {
      keyboard[action] = true;
      e.preventDefault();
      updateOutput();
    }
  }

  function onKeyUp(e) {
    const action = KEY_MAP[e.key];
    if (action) {
      keyboard[action] = false;
      updateOutput();
    }
  }

  function needsPermission() {
    return typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function';
  }

  function isSupported() {
    return 'DeviceOrientationEvent' in window;
  }

  async function requestPermission() {
    if (!isSupported()) {
      return { ok: false, message: 'Giroscopio no disponible en este navegador' };
    }

    if (needsPermission()) {
      try {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== 'granted') {
          return { ok: false, message: 'Permiso de giroscopio denegado' };
        }
        permissionGranted = true;
      } catch {
        return { ok: false, message: 'Error al solicitar permiso del giroscopio' };
      }
    } else {
      permissionGranted = true;
    }

    window.addEventListener('deviceorientation', onOrientation, true);
    enabled = true;
    return { ok: true, message: 'Giroscopio activo' };
  }

  let keyboardBound = false;

  function start() {
    if (config.useKeyboard && !keyboardBound) {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      keyboardBound = true;
    }
  }

  function stop() {
    window.removeEventListener('deviceorientation', onOrientation, true);
    if (keyboardBound) {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      keyboardBound = false;
    }
    enabled = false;
    output = { x: 0, y: 0 };
    Object.keys(keyboard).forEach(k => { keyboard[k] = false; });
  }

  function calibrate() {
    calibration = { ...raw };
    updateOutput();
  }

  function setConfig(newConfig) {
    config = { ...config, ...newConfig };
    updateOutput();
  }

  function getConfig() {
    return { ...config };
  }

  function getOutput() {
    return { ...output };
  }

  function getRaw() {
    return { ...raw };
  }

  function isEnabled() {
    return enabled;
  }

  return {
    AXIS_KEYS,
    isSupported,
    needsPermission,
    requestPermission,
    start,
    stop,
    calibrate,
    setConfig,
    getConfig,
    getOutput,
    getRaw,
    isEnabled
  };
})();
