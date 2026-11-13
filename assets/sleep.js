const breathStage = document.querySelector('#breath-stage');
const breathToggle = document.querySelector('#breath-toggle');
const breathReset = document.querySelector('#breath-reset');
const breathClock = document.querySelector('#breath-clock');
const breathPhase = document.querySelector('#breath-phase');
const sessionLength = 60_000;
let elapsed = 0;
let startedAt = 0;
let breathInterval = 0;

function renderBreathing() {
  const running = breathStage.dataset.state === 'running';
  const duration = Math.min(sessionLength, elapsed + (running ? performance.now() - startedAt : 0));
  if (duration === sessionLength && running) {
    clearInterval(breathInterval);
    elapsed = duration;
    breathStage.dataset.state = 'idle';
  }
  const remaining = Math.ceil((sessionLength - duration) / 1000);
  const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  if (breathClock.textContent !== clock) breathClock.textContent = clock;
  const state = breathStage.dataset.state;
  const phase = duration === sessionLength ? '练习完成'
    : state === 'running' ? (duration % 10_000 < 4000 ? '吸气' : '呼气')
    : state === 'paused' ? '已暂停' : '准备好后开始';
  if (breathPhase.textContent !== phase) breathPhase.textContent = phase;
  const label = state === 'running' ? '暂停' : state === 'paused' ? '继续' : '开始呼吸';
  if (breathToggle.textContent !== label) breathToggle.textContent = label;
  breathReset.disabled = state === 'idle' && elapsed === 0;
}

function pauseBreathing() {
  elapsed = Math.min(sessionLength, elapsed + performance.now() - startedAt);
  clearInterval(breathInterval);
  breathStage.dataset.state = elapsed === sessionLength ? 'idle' : 'paused';
  renderBreathing();
}

breathToggle.addEventListener('click', () => {
  if (breathStage.dataset.state === 'running') {
    pauseBreathing();
    return;
  }
  if (elapsed === sessionLength) elapsed = 0;
  startedAt = performance.now();
  breathStage.dataset.state = 'running';
  breathInterval = setInterval(renderBreathing, 100);
  renderBreathing();
});

breathReset.addEventListener('click', () => {
  clearInterval(breathInterval);
  elapsed = 0;
  breathStage.dataset.state = 'idle';
  renderBreathing();
  breathToggle.focus();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && breathStage.dataset.state === 'running') pauseBreathing();
});

const sleepForm = document.querySelector('#sleep-form');
const wakeTime = document.querySelector('#wake-time');
const sleepHours = document.querySelector('#sleep-hours');
const sleepLatency = document.querySelector('#sleep-latency');
const sleepResult = document.querySelector('#sleep-result');

sleepForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const [hours, minutes] = wakeTime.value.split(':').map(Number);
  const bedtime = hours * 60 + minutes - sleepHours.valueAsNumber * 60 - sleepLatency.valueAsNumber;
  const minuteOfDay = (bedtime + 1440) % 1440;
  const time = [Math.floor(minuteOfDay / 60), minuteOfDay % 60].map((part) => String(part).padStart(2, '0')).join(':');
  sleepResult.textContent = `建议在${bedtime < 0 ? '前一晚' : '当天'} ${time} 上床。`;
});
sleepForm.addEventListener('input', () => { sleepResult.textContent = ''; });

const checklist = document.querySelector('#checklist');
const checks = [...checklist.querySelectorAll('input')];
const progress = document.querySelector('#check-progress');
const storageKey = 'noctis-sleep-checklist';

function checklistDate() {
  const now = new Date();
  if (now.getHours() < 12) now.setDate(now.getDate() - 1);
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()].join('-');
}

let checklistDay = checklistDate();

function renderProgress() {
  const completed = checks.filter((check) => check.checked).length;
  progress.style.setProperty('--completed', completed / checks.length);
  progress.setAttribute('aria-valuenow', completed);
}

try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved?.day === checklistDay && Array.isArray(saved.items)) {
    checks.forEach((check) => { check.checked = saved.items.includes(check.id); });
  }
} catch { /* The checklist still works if storage is unavailable. */ }
renderProgress();

function updateChecklistDay(changed) {
  const today = checklistDate();
  if (today === checklistDay) return;
  checklistDay = today;
  checks.forEach((check) => { if (check !== changed) check.checked = false; });
  renderProgress();
}

checklist.addEventListener('change', (event) => {
  updateChecklistDay(event.target);
  renderProgress();
  try {
    const items = checks.filter((check) => check.checked).map((check) => check.id);
    localStorage.setItem(storageKey, JSON.stringify({ day: checklistDay, items }));
  } catch { /* Keep the in-page state. */ }
});
window.addEventListener('focus', () => updateChecklistDay());

function scheduleChecklistReset() {
  const nextNoon = new Date();
  if (nextNoon.getHours() >= 12) nextNoon.setDate(nextNoon.getDate() + 1);
  nextNoon.setHours(12, 0, 0, 0);
  setTimeout(() => {
    updateChecklistDay();
    scheduleChecklistReset();
  }, nextNoon.getTime() - Date.now());
}
scheduleChecklistReset();
