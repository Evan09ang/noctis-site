const hero = document.querySelector('.hero-video');
const motion = document.querySelector('.motion');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let userPaused = false;

async function updateBackground() {
  if (preference.matches || userPaused || document.hidden) {
    hero.pause();
    motion.textContent = '播放背景';
    return;
  }
  try {
    await hero.play();
    motion.textContent = '暂停背景';
  } catch {
    motion.textContent = '播放背景';
  }
}

if (hero && motion) {
  motion.hidden = preference.matches;
  motion.addEventListener('click', () => {
    userPaused = !hero.paused;
    updateBackground();
  });
  preference.addEventListener('change', () => {
    motion.hidden = preference.matches;
    updateBackground();
  });
  document.addEventListener('visibilitychange', updateBackground);
  updateBackground();
}

const tabs = [...document.querySelectorAll('[data-scene]')];
const sample = document.querySelector('#sample');
const preview = document.querySelector('#preview');
if (sample && preview && tabs.length) {
  let current = tabs[0].dataset.scene;
  const photo = document.querySelector('#scene-photo');
  const name = document.querySelector('#scene-name');
  const status = document.querySelector('#audio-status');
  const descriptions = { forest: '薄雾中的河岸', stream: '林间落下的水流', ocean: '迎岸涌动的海浪' };
  sample.volume = 0.42;
  function updateButton() {
    preview.textContent = sample.paused ? '▷ 试听' : 'Ⅱ 暂停';
    preview.setAttribute('aria-pressed', String(!sample.paused));
  }
  async function play() {
    status.textContent = '';
    try {
      await sample.play();
    } catch (error) {
      if (error.name !== 'AbortError') status.textContent = '声音暂时无法播放，请重试。';
    }
  }
  preview.addEventListener('click', () => {
    if (!sample.paused) return sample.pause();
    if (!sample.getAttribute('src')) sample.src = 'assets/' + current + '.ogg';
    play();
  });
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    if (current === tab.dataset.scene) return;
    const wasPlaying = !sample.paused;
    current = tab.dataset.scene;
    tabs.forEach((item) => item.setAttribute('aria-pressed', String(item === tab)));
    photo.src = 'assets/' + current + '.jpg';
    photo.alt = descriptions[current];
    name.textContent = tab.textContent;
    status.textContent = '';
    sample.src = 'assets/' + current + '.ogg';
    if (wasPlaying) play();
  }));
  sample.addEventListener('play', updateButton);
  sample.addEventListener('pause', updateButton);
  document.addEventListener('visibilitychange', () => { if (document.hidden) sample.pause(); });
}
