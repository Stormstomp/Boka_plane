const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const welcomeTitle = document.getElementById('welcomeTitle');
const welcomeText = document.getElementById('welcomeText');
const statusEl = document.getElementById('status');
const scoreEl = document.getElementById('score');
const restartBtn = document.getElementById('restartBtn');

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const GRAVITY = 0.57;
const JUMP_STRENGTH = -10.4;
const MAX_FALL_SPEED = 12;
const PIPE_WIDTH = 70;
const PIPE_GAP = 150;
const PIPE_SPACING = 200;
const PIPE_SPEED = 2.0;
const MAX_DELTA = 2;
// Прощающий хитбокс: уменьшаем радиус столкновения птицы на 15%
const BIRD_HITBOX_SCALE = 0.85;
// Размер первых труб: начинаем с чуть более мягкой, широкой щели
const INITIAL_PIPE_GAP = Math.round(PIPE_GAP * 1.2);
// Время койота и буфер ввода
const INPUT_BUFFER_FRAMES = 5;
const COYOTE_TIME_FRAMES = 3;
const COYOTE_IMMUNITY_FRAMES = 2;

let lastTime = 0;

let bird;
let pipes;
let frameCount;
let score;
let running;
let gameOver;
let animationId;
let faceLoaded = false;
let faceEndLoaded = false;
let jumpBufferFrames = 0;
let coyoteFrames = 0;
let coyoteImmuneFrames = 0;
let showEndFace = false;
let displayFPS = 0;
let displayDelta = 0;
const faceImage = new Image();
faceImage.src = 'face.png';
faceImage.onload = () => {
  faceLoaded = true;
};
faceImage.onerror = () => {
  faceLoaded = false;
};

const faceEndImage = new Image();
faceEndImage.src = 'face_end.jpg';
faceEndImage.onload = () => {
  faceEndLoaded = true;
};
faceEndImage.onerror = () => {
  // Если GitHub Pages ещё не успели развернуть asset, пробуем raw-URL.
  if (!faceEndLoaded && faceEndImage.src.indexOf('raw.githubusercontent.com') === -1) {
    faceEndImage.src = 'https://raw.githubusercontent.com/Stormstomp/Boka_plane/main/face_end.jpg';
  } else {
    faceEndLoaded = false;
  }
};

let backgroundLoaded = false;
const backgroundImage = new Image();
backgroundImage.src = 'background.jpg';
backgroundImage.onload = () => {
  backgroundLoaded = true;
};
backgroundImage.onerror = () => {
  backgroundLoaded = false;
};

let cernovarBadgeLoaded = false;
const cernovarBadgeImage = new Image();
cernovarBadgeImage.src = 'beer.svg.svg';
cernovarBadgeImage.onload = () => {
  cernovarBadgeLoaded = true;
};
cernovarBadgeImage.onerror = () => {
  cernovarBadgeLoaded = false;
};

let audioContext;
const crashAudio = new Audio('dzing.mp3');
crashAudio.preload = 'auto';
crashAudio.load();

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playJumpSound() {
  const ac = getAudioContext();
  const now = ac.currentTime;
  const oscillator = ac.createOscillator();
  const gain = ac.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(240, now);
  oscillator.frequency.exponentialRampToValueAtTime(620, now + 0.16);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.24, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  oscillator.connect(gain);
  gain.connect(ac.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.18);
}

function unlockAudio() {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  if (crashAudio && crashAudio.paused && crashAudio.readyState >= 2) {
    crashAudio.play().then(() => {
      crashAudio.pause();
      crashAudio.currentTime = 0;
    }).catch(() => {});
  }
}

window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

function playCrashSound() {
  crashAudio.currentTime = 0;
  crashAudio.volume = 0.6;
  crashAudio.play().catch(() => {
    // sound playback may be blocked until user interaction
  });
}

function createBird() {
  return {
    x: 80,
    y: GAME_HEIGHT / 2,
    radius: 14,
    velocity: 0,
    rotation: 0,
  };
}

function createPipe(x, gap = PIPE_GAP) {
  const topHeight = 80 + Math.random() * 180;
  const style = Math.random() < 0.4 ? 'green' : 'cream';
  return {
    x,
    width: PIPE_WIDTH,
    topHeight,
    bottomY: topHeight + gap,
    style,
    passed: false,
  };
}

function resetGame() {
  bird = createBird();
  pipes = [
    createPipe(GAME_WIDTH + 20, INITIAL_PIPE_GAP),
    createPipe(GAME_WIDTH + 20 + PIPE_SPACING, INITIAL_PIPE_GAP),
  ];
  frameCount = 0;
  score = 0;
  running = false;
  gameOver = false;
  jumpBufferFrames = 0;
  coyoteFrames = 0;
  coyoteImmuneFrames = 0;
  showEndFace = false;
  welcomeTitle.textContent = 'Привет големчик 👋';
  welcomeText.textContent = 'Помоги Бокичу встать на путь ЗОЖа и избежать столкновения с соблазнами.';
  statusEl.classList.add('hidden');
  scoreEl.textContent = `Счёт: ${score}`;
  restartBtn.textContent = 'Начать';
  overlay.style.display = 'flex';
  overlay.style.pointerEvents = 'auto';
}

function startGame() {
  if (running) return;
  running = true;
  overlay.style.display = 'none';
  overlay.style.pointerEvents = 'none';
  if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.MainButton.hide();
  }
  lastTime = 0;
  window.requestAnimationFrame(loop);
}

function jump() {
  if (gameOver) return;
  if (!running) {
    startGame();
    // Если игра только запустилась, продолжаем и применяем прыжок сразу.
  }

  if (coyoteFrames > 0) {
    // Прыжок внутри окна койота спасает игрока от столкновения
    bird.y = Math.min(bird.y, GAME_HEIGHT - bird.radius - 1);
    bird.y = Math.max(bird.y, bird.radius + 1);
    bird.velocity = JUMP_STRENGTH;
    coyoteFrames = 0;
    coyoteImmuneFrames = COYOTE_IMMUNITY_FRAMES;
    playJumpSound();
    return;
  }

  if (bird.velocity < 0) {
    // Игрок нажал чуть раньше, пока птица ещё летела вверх;
    // запоминаем на несколько кадров
    jumpBufferFrames = INPUT_BUFFER_FRAMES;
    return;
  }

  bird.velocity = JUMP_STRENGTH;
  playJumpSound();
}

function endGame() {
  running = false;
  gameOver = true;
  showEndFace = true;
  playCrashSound();
  welcomeTitle.textContent = '';
  welcomeText.textContent = '';
  statusEl.textContent = 'О нет, попытка ЗОЖа провалилась!';
  statusEl.classList.remove('hidden');
  restartBtn.textContent = 'Начать заново';
  overlay.style.display = 'flex';
  overlay.style.pointerEvents = 'auto';
  if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.MainButton.show();
    window.Telegram.WebApp.MainButton.setText('Начать заново');
  }
}

function update(delta = 1) {
  if (!running) return;

  if (jumpBufferFrames > 0) {
    if (bird.velocity >= 0) {
      bird.velocity = JUMP_STRENGTH;
      playJumpSound();
      jumpBufferFrames = 0;
    } else {
      jumpBufferFrames -= 1;
    }
  }

  // Ограничиваем delta, чтобы при лагах птица не пролетала сквозь текстуры
  const limitedDelta = Math.min(delta, MAX_DELTA);

  // 1. Физика перемещения
  bird.velocity += GRAVITY * limitedDelta;
  bird.velocity = Math.min(bird.velocity, MAX_FALL_SPEED);
  bird.y += bird.velocity * limitedDelta;

  // 2. Аутентичный поворот (Тангаж)
  if (bird.velocity < 2) {
    // Если птица летит вверх или только начала падать:
    // Мгновенно или очень быстро задираем клюв вверх (~ -25 градусов)
    bird.rotation = -0.42;
  } else {
    // Когда птица набрала скорость падения (> 2):
    // Плавно заваливаем нос вниз по ходу падения
    bird.rotation += 0.07 * limitedDelta;
    // Ограничиваем угол, чтобы она не сделала сальто (1.2 радиана ≈ 70 градусов)
    bird.rotation = Math.min(bird.rotation, 1.2);
  }

  if (bird.y + bird.radius >= GAME_HEIGHT || bird.y - bird.radius <= 0) {
    if (coyoteFrames === 0 && coyoteImmuneFrames === 0) {
      coyoteFrames = COYOTE_TIME_FRAMES;
      return;
    }
  }

  pipes.forEach((pipe) => {
    pipe.x -= PIPE_SPEED * delta;
  });

  if (pipes[0].x + PIPE_WIDTH < 0) {
    pipes.shift();
    pipes.push(createPipe(pipes[pipes.length - 1].x + PIPE_SPACING));
  }

  const hitboxRadius = bird.radius * BIRD_HITBOX_SCALE;
  pipes.forEach((pipe) => {
    if (!pipe.passed && bird.x > pipe.x + pipe.width) {
      pipe.passed = true;
      score += 1;
      scoreEl.textContent = `Счёт: ${score}`;
    }

    if (coyoteImmuneFrames > 0) {
      return;
    }

    const hitTop = bird.x + hitboxRadius > pipe.x && bird.x - hitboxRadius < pipe.x + pipe.width && bird.y - hitboxRadius < pipe.topHeight;
    const hitBottom = bird.x + hitboxRadius > pipe.x && bird.x - hitboxRadius < pipe.x + pipe.width && bird.y + hitboxRadius > pipe.bottomY;

    if (hitTop || hitBottom) {
      if (coyoteFrames === 0) {
        coyoteFrames = COYOTE_TIME_FRAMES;
      }
    }
  });

  if (coyoteFrames > 0) {
    coyoteFrames -= 1;
    if (coyoteFrames === 0) {
      endGame();
      return;
    }
  }

  if (coyoteImmuneFrames > 0) {
    coyoteImmuneFrames -= 1;
  }

  frameCount += 1;
}

function draw() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  if (backgroundLoaded) {
    ctx.drawImage(backgroundImage, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = 'rgba(10, 18, 34, 0.45)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  } else {
    ctx.fillStyle = '#0a1930';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  drawGround();
  drawPipes();
  drawBird();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 14px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`FPS: ${displayFPS}`, 12, 12);
  ctx.fillText(`delta: ${displayDelta.toFixed(3)}`, 12, 30);
}

function drawGround() {
  const lineY = GAME_HEIGHT - 40;
  ctx.fillStyle = '#102a42';
  ctx.fillRect(0, lineY, GAME_WIDTH, 40);
  ctx.fillStyle = '#17334d';
  for (let x = 0; x < GAME_WIDTH; x += 24) {
    ctx.fillRect(x, lineY + 24, 12, 16);
  }
}

function drawPipes() {
  pipes.forEach((pipe) => {
    const isGreen = pipe.style === 'green';
    const bodyColor = isGreen ? '#1f4f29' : '#e1d8b2';
    const edgeColor = isGreen ? '#305f3a' : '#c6b48b';
    const textColor = isGreen ? '#f5f4e6' : '#2b2b24';
    const shadowColor = isGreen ? 'rgba(0, 0, 0, 0.25)' : 'rgba(80, 60, 30, 0.18)';
    const capHeight = 18;
    const topBodyHeight = pipe.topHeight - capHeight;
    const bottomBodyY = pipe.bottomY + capHeight;
    const bottomBodyHeight = GAME_HEIGHT - bottomBodyY - 40;

    const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
    gradient.addColorStop(0, bodyColor);
    gradient.addColorStop(0.4, bodyColor);
    gradient.addColorStop(0.85, isGreen ? '#256237' : '#f0e6cb');
    gradient.addColorStop(1, isGreen ? '#1d4125' : '#d5c292');

    ctx.fillStyle = gradient;
    if (topBodyHeight > 0) {
      ctx.fillRect(pipe.x, 0, pipe.width, topBodyHeight);
    }
    if (bottomBodyHeight > 0) {
      ctx.fillRect(pipe.x, bottomBodyY, pipe.width, bottomBodyHeight);
    }

    ctx.fillStyle = shadowColor;
    if (topBodyHeight > 0) {
      ctx.fillRect(pipe.x, 0, 6, topBodyHeight);
    }
    if (bottomBodyHeight > 0) {
      ctx.fillRect(pipe.x, bottomBodyY, 6, bottomBodyHeight);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    if (topBodyHeight > 0) {
      ctx.fillRect(pipe.x + pipe.width - 8, 0, 4, topBodyHeight);
    }
    if (bottomBodyHeight > 0) {
      ctx.fillRect(pipe.x + pipe.width - 8, bottomBodyY, 4, bottomBodyHeight);
    }

    ctx.fillStyle = edgeColor;
    ctx.fillRect(pipe.x - 8, pipe.topHeight - capHeight, pipe.width + 16, capHeight);
    ctx.fillRect(pipe.x - 8, pipe.bottomY, pipe.width + 16, capHeight);

    const middleX = pipe.x + pipe.width / 2;
    const topCenterY = pipe.topHeight / 2;
    const bottomCenterY = pipe.bottomY + (GAME_HEIGHT - pipe.bottomY - 40) / 2;

    drawPipeBadge(middleX, topCenterY - 20, isGreen);
    drawPipeName(middleX, topCenterY + 10, isGreen);
    drawPipeBadge(middleX, bottomCenterY - 20, isGreen);
    drawPipeName(middleX, bottomCenterY + 10, isGreen);
  });
}

function drawPipeName(x, centerY, isGreen) {
  const line = isGreen ? 'JAMESON' : 'ČERNOVAR';
  const textColor = isGreen ? '#f5f4e6' : '#2b2b24';

  ctx.fillStyle = textColor;
  ctx.font = '700 12px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(line, x, centerY);
}

function drawPipeBadge(x, y, isGreen) {
  ctx.lineWidth = 3;
  if (isGreen) {
    ctx.fillStyle = '#8b1f1f';
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f5f4e6';
    ctx.font = '700 10px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JJS', x, y);
  } else {
    if (cernovarBadgeLoaded) {
      const size = 26;
      ctx.drawImage(cernovarBadgeImage, x - size / 2, y - size / 2, size, size);
    } else {
      ctx.strokeStyle = '#2b2b24';
      ctx.beginPath();
      ctx.arc(x, y, 13, Math.PI * 0.2, Math.PI * 0.8, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 1);
      ctx.lineTo(x - 6, y + 9);
      ctx.lineTo(x + 6, y + 9);
      ctx.lineTo(x + 10, y - 1);
      ctx.stroke();
    }
  }
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);

  ctx.fillStyle = '#fec601';
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();

  if (showEndFace && faceEndLoaded) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius - 1, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(faceEndImage, -bird.radius, -bird.radius, bird.radius * 2, bird.radius * 2);
    ctx.restore();
  } else if (showEndFace && !faceEndLoaded) {
    ctx.fillStyle = '#8b0000';
    ctx.font = '700 10px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('X', 0, 0);
  } else if (faceLoaded) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius - 1, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(faceImage, -bird.radius, -bird.radius, bird.radius * 2, bird.radius * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(5, -4, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3c2d0c';
    ctx.beginPath();
    ctx.arc(6, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const frameTime = timestamp - lastTime;
  const rawDelta = frameTime / (1000 / 60);
  const delta = Math.min(MAX_DELTA, rawDelta);
  lastTime = timestamp;

  displayDelta = delta;
  displayFPS = Math.round(1000 / Math.max(frameTime, 1));

  update(delta);
  draw();
  if (running) {
    animationId = window.requestAnimationFrame(loop);
  }
}

canvas.addEventListener('click', jump);
// Use GetKeyDown semantics: ignore repeated keydown events while key is held.
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'ArrowUp') {
    // `event.repeat` is true for auto-repeated keydown events while key is held.
    if (event.repeat) return; // act only once per physical press
    event.preventDefault();
    jump();
  }
});

restartBtn.addEventListener('click', () => {
  resetGame();
  draw();
  if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.MainButton.hide();
  }
  jump();
});

function handleStartInput(event) {
  if (event.target.closest('button')) {
    return;
  }
  if (!running && !gameOver) {
    if (event.cancelable) {
      event.preventDefault();
    }
    jump();
  }
}

overlay.addEventListener('click', handleStartInput);
overlay.addEventListener('pointerup', handleStartInput, { passive: false });
overlay.addEventListener('touchend', handleStartInput, { passive: false });

canvas.addEventListener('click', handleStartInput);
canvas.addEventListener('pointerup', handleStartInput, { passive: false });
canvas.addEventListener('touchend', handleStartInput, { passive: false });

window.addEventListener('telegramStart', () => {
  if (!running) {
    if (gameOver) {
      resetGame();
      draw();
    }
    jump();
  }
});

resetGame();
draw();
