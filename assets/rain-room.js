import { RainAudio, bindRainPlayback, defaultRain, rainLink, readRain } from './rain-audio.js?v=1';

const pad = document.querySelector('#rain-pad');
const canvas = document.querySelector('#rain-canvas');
const paint = canvas.getContext('2d');
const strengthInput = document.querySelector('#rain-strength');
const distanceInput = document.querySelector('#rain-distance');
const strengthValue = document.querySelector('#strength-value');
const distanceValue = document.querySelector('#distance-value');
const title = document.querySelector('#rain-title');
const status = document.querySelector('#rain-status');
const clockLink = document.querySelector('#rain-to-clock');
const shareBox = document.querySelector('#rain-share-box');
const shareUrl = document.querySelector('#rain-share-url');
const presets = [...document.querySelectorAll('[data-preset]')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const audio = new RainAudio();

let position = readRain() ?? defaultRain;
let pointer = null;
let width = 1;
let height = 1;
let frame = 0;
let onScreen = true;
let shareAttempt = 0;
const drops = Array.from({ length: 150 }, () => ({
  x: Math.random(),
  y: Math.random(),
  depth: Math.random(),
}));

function draw(time) {
  frame = 0;
  if (!paint) return;
  const power = position.strength / 100;
  const near = 1 - position.distance / 100;
  const pointX = width * power;
  const pointY = height * near;
  paint.clearRect(0, 0, width, height);
  paint.lineWidth = 1;

  for (let index = 0; index < Math.round(24 + power * 126); index++) {
    const drop = drops[index];
    const y = ((drop.y + time * (.000028 + drop.depth * .0001) * (.58 + power)) % 1.13 - .06) * height;
    const x = drop.x * width + y * .13 - width * .06;
    const length = (4 + drop.depth * 16) * (.65 + near);
    paint.strokeStyle = 'rgba(195, 222, 209, ' + (.05 + drop.depth * .32) + ')';
    paint.beginPath();
    paint.moveTo(x, y);
    paint.lineTo(x + length * .28, y + length);
    paint.stroke();
  }

  for (let ring = 0; ring < 3; ring++) {
    const phase = (time / (2350 - near * 600) + ring / 3) % 1;
    const radius = 13 + phase * (40 + power * 70);
    paint.strokeStyle = 'rgba(247, 218, 165, ' + (.23 * (1 - phase)) + ')';
    paint.beginPath();
    paint.ellipse(pointX, pointY, radius, radius * .72, 0, 0, Math.PI * 2);
    paint.stroke();
  }
  if (!reducedMotion.matches && !document.hidden && onScreen) frame = requestAnimationFrame(draw);
}

function redraw() {
  cancelAnimationFrame(frame);
  draw(reducedMotion.matches ? 0 : performance.now());
}

function resize() {
  const box = pad.getBoundingClientRect();
  width = Math.max(1, box.width);
  height = Math.max(1, box.height);
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  paint?.setTransform(scale, 0, 0, scale, 0, 0);
  redraw();
}

function update(next) {
  shareAttempt++;
  shareBox.hidden = true;
  status.textContent = '';
  position = next;
  const { strength, distance } = next;
  strengthInput.value = strength;
  distanceInput.value = distance;
  strengthValue.value = strength + '%';
  distanceValue.value = distance + '%';
  const amount = strength < 35 ? '轻雨' : strength < 67 ? '雨声' : '大雨';
  const space = distance > 65 ? '远处' : distance < 35 ? '窗边' : '窗外';
  title.textContent = space + amount;
  pad.style.setProperty('--point-x', strength + '%');
  pad.style.setProperty('--point-y', 100 - distance + '%');
  for (const button of presets) {
    button.setAttribute('aria-pressed', String(button.dataset.preset === strength + ',' + distance));
  }
  clockLink.href = rainLink('clock.html', next);
  audio.setPosition(next);
  if (reducedMotion.matches) redraw();
}

function fromPointer(event) {
  const box = pad.getBoundingClientRect();
  const percent = (value) => Math.round(Math.max(0, Math.min(1, value)) * 100);
  update({
    strength: percent((event.clientX - box.left) / box.width),
    distance: 100 - percent((event.clientY - box.top) / box.height),
  });
}

pad.addEventListener('pointerdown', (event) => {
  if (pointer !== null || event.button !== 0) return;
  pointer = event.pointerId;
  pad.setPointerCapture(pointer);
  fromPointer(event);
});
pad.addEventListener('pointermove', (event) => {
  if (event.pointerId === pointer) fromPointer(event);
});
pad.addEventListener('lostpointercapture', (event) => {
  if (event.pointerId === pointer) pointer = null;
});
for (const input of [strengthInput, distanceInput]) {
  input.addEventListener('input', () => update({
    strength: Number(strengthInput.value), distance: Number(distanceInput.value),
  }));
}
for (const button of presets) {
  button.addEventListener('click', () => {
    const [strength, distance] = button.dataset.preset.split(',').map(Number);
    update({ strength, distance });
  });
}

document.querySelector('#rain-share').addEventListener('click', async () => {
  const attempt = ++shareAttempt;
  const url = rainLink('rain.html', position).href;
  try {
    await navigator.clipboard.writeText(url);
    if (attempt === shareAttempt) status.textContent = '链接已复制，打开后可以听到你调的雨。';
  } catch {
    if (attempt !== shareAttempt) return;
    shareBox.hidden = false;
    shareUrl.value = url;
    shareUrl.focus();
    shareUrl.select();
    status.textContent = '请复制上方链接。';
  }
});

bindRainPlayback(audio, document.querySelector('#rain-play'), status, document.querySelector('#rain-volume'));
window.addEventListener('hashchange', () => {
  if (location.hash.startsWith('#r=')) update(readRain() ?? defaultRain);
});
document.addEventListener('visibilitychange', redraw);
reducedMotion.addEventListener('change', redraw);
new ResizeObserver(resize).observe(pad);
new IntersectionObserver(([entry]) => {
  onScreen = entry.isIntersecting;
  redraw();
}).observe(pad);
update(position);
