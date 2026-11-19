import { RainAudio, bindRainPlayback, defaultRain, rainLink, readRain } from './rain-audio.js?v=1';

const stage = document.querySelector('#clock-stage');
const time = document.querySelector('#clock-time');
const hours = document.querySelector('#clock-hours');
const minutes = document.querySelector('#clock-minutes');
const date = document.querySelector('#clock-date');
const daypart = document.querySelector('#clock-daypart');
const status = document.querySelector('#clock-status');
const wakeButton = document.querySelector('#clock-wake');
const fullButton = document.querySelector('#clock-full');
const showDate = document.querySelector('#show-date');
const hours24 = document.querySelector('#hours-24');
const brightness = document.querySelector('#clock-brightness');
const faces = [...document.querySelectorAll('[name="face"]')];
const dateFormat = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
const storageKey = 'noctis-web-clock';
const pad = (value) => String(value).padStart(2, '0');
let timer;
let wake;
let wantsWake = false;
let requestingWake = false;

try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  const face = faces.find((option) => option.value === saved?.face);
  if (face) face.checked = true;
  if (saved?.date === false) showDate.checked = false;
  if (saved?.hours24 === false) hours24.checked = false;
  if (typeof saved?.brightness === 'number') brightness.value = saved.brightness;
} catch {
  // Clock settings still work for this visit if storage is restricted.
}

function updateTime() {
  clearTimeout(timer);
  const now = new Date();
  const localHour = now.getHours();
  const hour = hours24.checked ? localHour : localHour % 12 || 12;
  hours.textContent = pad(hour);
  minutes.textContent = pad(now.getMinutes());
  time.dateTime = pad(localHour) + ':' + minutes.textContent;
  daypart.textContent = localHour >= 12 ? '下午' : '上午';
  daypart.hidden = hours24.checked;
  date.textContent = dateFormat.format(now);
  date.hidden = !showDate.checked;
  if (!document.hidden) {
    timer = setTimeout(updateTime, (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 40);
  }
}

function applySettings(save) {
  const face = faces.find((option) => option.checked).value;
  stage.dataset.face = face;
  stage.style.setProperty('--clock-brightness', Number(brightness.value) / 100);
  updateTime();
  if (!save) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      face, date: showDate.checked, hours24: hours24.checked, brightness: Number(brightness.value),
    }));
  } catch {
    // Save is optional.
  }
}

function renderWake() {
  wakeButton.setAttribute('aria-pressed', String(Boolean(wake && !wake.released)));
  wakeButton.disabled = requestingWake;
}

async function requestWake() {
  if (!wantsWake || document.hidden || requestingWake || (wake && !wake.released)) return;
  requestingWake = true;
  renderWake();
  try {
    const lock = await navigator.wakeLock.request('screen');
    if (!wantsWake || document.hidden) {
      await lock.release();
      return;
    }
    wake = lock;
    lock.addEventListener('release', () => {
      if (wake === lock) wake = null;
      if (wantsWake && !document.hidden) {
        wantsWake = false;
        status.textContent = '设备已结束常亮。';
      }
      renderWake();
    });
    status.textContent = '屏幕常亮已开启。';
  } catch {
    wantsWake = false;
    status.textContent = '当前设备或浏览器无法开启常亮。';
  } finally {
    requestingWake = false;
    renderWake();
  }
}

wakeButton.addEventListener('click', async () => {
  wantsWake = !wantsWake;
  if (wantsWake) {
    await requestWake();
  } else {
    await wake?.release().catch(() => {});
    status.textContent = '已关闭常亮。';
    renderWake();
  }
});
fullButton.hidden = !document.fullscreenEnabled || !stage.requestFullscreen;
fullButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement === stage) await document.exitFullscreen();
    else await stage.requestFullscreen();
  } catch {
    status.textContent = '当前浏览器无法进入全屏。';
  }
});
document.addEventListener('fullscreenchange', () => {
  fullButton.textContent = document.fullscreenElement === stage ? '退出全屏' : '全屏';
});
document.addEventListener('visibilitychange', () => {
  updateTime();
  if (!document.hidden) void requestWake();
});
window.addEventListener('pagehide', () => {
  wantsWake = false;
  wake?.release().catch(() => {});
  clearTimeout(timer);
});
window.addEventListener('pageshow', updateTime);
for (const control of [showDate, hours24, brightness, ...faces]) {
  control.addEventListener('input', () => applySettings(true));
}

const audio = new RainAudio();
const linked = readRain();
audio.setPosition(linked ?? defaultRain);
bindRainPlayback(audio, document.querySelector('#clock-play'), status);
if (linked) {
  const link = document.querySelector('#clock-to-rain');
  link.href = rainLink('rain.html', linked);
  link.textContent = '返回编辑这场雨 ↗';
}
applySettings(false);
