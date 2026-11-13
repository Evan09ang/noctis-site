const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.querySelector('.hero-video');
const motion = document.querySelector('.motion');

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.remove('reveal-pending');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -30px' });

  document.querySelectorAll('[data-reveal]').forEach((element) => {
    if (element.getBoundingClientRect().top < window.innerHeight) return;
    element.classList.add('reveal-pending');
    revealObserver.observe(element);
  });
}

if (hero && motion) {
  let visible = true;
  let userPaused = false;

  async function updateBackground() {
    motion.hidden = reducedMotion.matches;
    if (reducedMotion.matches || userPaused || document.hidden || !visible) {
      hero.pause();
      motion.textContent = '播放背景';
      return;
    }
    if (!hero.hasAttribute('src')) hero.src = hero.dataset.src;
    try {
      await hero.play();
      if (userPaused || reducedMotion.matches || document.hidden || !visible) {
        hero.pause();
        return;
      }
      hero.classList.add('is-ready');
      motion.textContent = '暂停背景';
    } catch {
      motion.textContent = '播放背景';
    }
  }

  motion.addEventListener('click', () => {
    userPaused = !hero.paused;
    updateBackground();
  });
  reducedMotion.addEventListener('change', updateBackground);
  document.addEventListener('visibilitychange', updateBackground);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateBackground();
    });
    observer.observe(hero);
  } else {
    updateBackground();
  }
}

const buttons = [...document.querySelectorAll('[data-scene]')];
const preview = document.querySelector('#preview');

if (preview && buttons.length) {
  const tracks = [document.querySelector('#sample'), document.querySelector('#sample-next')];
  const photos = [...document.querySelectorAll('[data-photo]')];
  const volume = document.querySelector('#preview-volume');
  const name = document.querySelector('#scene-name');
  const caption = name.parentElement;
  const description = document.querySelector('#scene-description');
  const status = document.querySelector('#audio-status');
  const scenes = {
    forest: { name: '林风', description: '林间的风穿过树梢。' },
    stream: { name: '溪流', description: '水声从山石间落下。' },
    ocean: { name: '海浪', description: '潮水一层层涌上岸。' },
  };

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
    preview.setAttribute('aria-label', (requested ? '暂停' : '试听') + scenes[selection].name);
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
    name.textContent = scenes[selection].name;
    description.textContent = scenes[selection].description;
    if (!reducedMotion.matches && caption.animate) {
      captionAnimation?.cancel();
      captionAnimation = caption.animate([
        { opacity: .35, transform: 'translateY(7px)' },
        { opacity: 1, transform: 'none' },
      ], { duration: 460, easing: 'cubic-bezier(.22, .75, .22, 1)' });
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
