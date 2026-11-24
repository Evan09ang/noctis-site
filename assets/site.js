const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const player = document.querySelector('.player');

if (player) {
  const scenery = player.querySelector('.hero-video');
  const motion = player.querySelector('.motion-toggle');
  let inView = true;
  let motionPaused = false;

  async function updateMotion() {
    const forest = player.querySelector('[data-scene="forest"]').getAttribute('aria-pressed') === 'true';
    const animate = !reducedMotion.matches && !motionPaused && !document.hidden && inView;
    motion.hidden = reducedMotion.matches;
    motion.setAttribute('aria-pressed', String(motionPaused));
    motion.setAttribute('aria-label', motionPaused ? '播放背景动效' : '暂停背景动效');
    player.classList.toggle('motion-paused', !animate);
    if (!animate || !forest) {
      scenery.pause();
      scenery.classList.remove('is-ready');
      return;
    }
    if (!scenery.hasAttribute('src')) scenery.src = scenery.dataset.src;
    try {
      await scenery.play();
      scenery.classList.toggle('is-ready', !scenery.paused && !reducedMotion.matches);
    } catch {
      scenery.classList.remove('is-ready');
    }
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateMotion();
    });
    observer.observe(player);
  }
  motion.addEventListener('click', () => {
    motionPaused = !motionPaused;
    updateMotion();
  });
  player.addEventListener('click', (event) => {
    if (event.target.closest('[data-scene]')) updateMotion();
  });
  reducedMotion.addEventListener('change', updateMotion);
  document.addEventListener('visibilitychange', updateMotion);
  updateMotion();
}

const buttons = [...document.querySelectorAll('[data-scene]')];
const preview = document.querySelector('#preview');

if (preview && buttons.length) {
  const tracks = [document.querySelector('#sample'), document.querySelector('#sample-next')];
  const photos = [...document.querySelectorAll('[data-photo]')];
  const volume = document.querySelector('#preview-volume');
  const name = document.querySelector('#scene-name');
  const caption = name;
  const status = document.querySelector('#audio-status');
  const scenes = { forest: '林风', stream: '溪流', ocean: '海浪' };

  let selection = 'forest';
  let active = tracks[0];
  let requested = false;
  let revision = 0;
  let animation = 0;
  let fading = false;
  let captionAnimation;
  const level = () => Number(volume.value) / 100;

  function updateButton() {
    preview.setAttribute('aria-pressed', String(requested));
    preview.setAttribute('aria-label', (requested ? '暂停' : '试听') + scenes[selection]);
  }

  function stop() {
    revision++;
    cancelAnimationFrame(animation);
    fading = false;
    requested = false;
    tracks.forEach((track) => track.pause());
    updateButton();
  }

  async function playSelection() {
    const id = ++revision;
    const previous = active.paused ? null : active;
    const next = tracks.find((track) => track !== previous);
    cancelAnimationFrame(animation);
    fading = false;
    tracks.forEach((track) => {
      if (track !== previous) track.pause();
    });
    if (previous) previous.volume = level();
    status.textContent = '';
    next.src = 'assets/' + selection + '.ogg';
    next.volume = previous ? 0 : level();
    try {
      await next.play();
    } catch {
      if (id !== revision) return;
      stop();
      status.textContent = '声音暂时无法播放，请重试。';
      return;
    }
    if (id !== revision) return;
    active = next;
    if (!previous) return;

    fading = true;
    const start = performance.now();
    function crossfade(now) {
      const progress = Math.min((now - start) / 420, 1);
      previous.volume = level() * (1 - progress);
      next.volume = level() * progress;
      if (progress < 1) {
        animation = requestAnimationFrame(crossfade);
      } else {
        previous.pause();
        fading = false;
      }
    }
    animation = requestAnimationFrame(crossfade);
  }

  preview.addEventListener('click', () => {
    if (requested) {
      stop();
    } else {
      requested = true;
      updateButton();
      playSelection();
    }
  });

  buttons.forEach((button) => button.addEventListener('click', () => {
    if (selection === button.dataset.scene) return;
    selection = button.dataset.scene;
    buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    photos.forEach((photo) => photo.classList.toggle('is-current', photo.dataset.photo === selection));
    name.textContent = scenes[selection];
    if (!reducedMotion.matches && !player.classList.contains('motion-paused') && caption.animate) {
      captionAnimation?.cancel();
      captionAnimation = caption.animate([
        { opacity: .35, transform: 'translateY(7px)' },
        { opacity: 1, transform: 'none' },
      ], { duration: 240, easing: 'cubic-bezier(.2, .65, .3, 1)' });
    }
    status.textContent = '';
    updateButton();
    if (requested) playSelection();
  }));

  volume.addEventListener('input', () => {
    if (!fading) active.volume = level();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });
}

const featureTabs = [...document.querySelectorAll('[role="tab"]')];
const screens = [...document.querySelectorAll('[data-screen]')];

function selectFeature(tab) {
  const feature = tab.id.replace('tab-', '');
  featureTabs.forEach((item) => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
  screens.forEach((screen) => {
    const selected = screen.dataset.screen === feature;
    screen.classList.toggle('is-current', selected);
    screen.setAttribute('aria-hidden', String(!selected));
  });
  tab.closest('.product').dataset.feature = feature;
}

featureTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectFeature(tab));
  tab.addEventListener('keydown', (event) => {
    let target;
    if (event.key === 'ArrowRight') target = (index + 1) % featureTabs.length;
    if (event.key === 'ArrowLeft') target = (index + featureTabs.length - 1) % featureTabs.length;
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = featureTabs.length - 1;
    if (target === undefined) return;
    event.preventDefault();
    featureTabs[target].focus();
    selectFeature(featureTabs[target]);
  });
});
