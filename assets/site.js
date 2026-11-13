const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.querySelector('.hero-video');
const motion = document.querySelector('.cinema-toggle');

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
  const chapters = [...document.querySelectorAll('.chapter')];
  const header = document.querySelector('.top');
  const feature = document.querySelector('.features');
  const storyTabs = [...feature.querySelectorAll('[role="tab"]')];
  let visible = true;
  let userPaused = false;
  let frame = 0;
  const clampProgress = (value) => Math.max(0, Math.min(1, value));

  function renderStory() {
    frame = 0;
    const viewport = window.innerHeight;
    const navHeight = header.offsetHeight;
    const scroll = window.scrollY;
    const scrollLimit = document.documentElement.scrollHeight - viewport;
    const positions = chapters.map((chapter) => chapter.getBoundingClientRect());
    chapters.forEach((chapter, index) => {
      const { top, bottom } = positions[index];
      const stage = chapter.querySelector('.chapter-stage');
      const hold = chapter.classList.contains('is-pinned') ? chapter.offsetHeight - stage.offsetHeight : 0;
      const travel = hold > 0 ? clampProgress((navHeight - top) / hold)
        : index === 0 ? clampProgress((navHeight - top) / (viewport * .6))
        : clampProgress((viewport - top) / (viewport - navHeight));
      const arrive = clampProgress((top - navHeight) / (viewport - navHeight));
      const leave = clampProgress((viewport - bottom) / (viewport - navHeight));
      chapter.style.setProperty('--arrive', arrive);
      chapter.style.setProperty('--travel', travel);
      chapter.style.setProperty('--leave', leave);
      if (chapter === feature && hold > 0 && !feature.hasAttribute('data-manual') && !feature.contains(document.activeElement)) {
        const tab = storyTabs[Math.min(storyTabs.length - 1, Math.floor(travel * storyTabs.length))];
        if (tab.getAttribute('aria-selected') !== 'true') selectFeature(tab);
      }
    });
    header.style.setProperty('--reading-progress', scrollLimit > 0 ? scroll / scrollLimit : 0);
  }

  function scheduleStory() {
    if (!userPaused && !reducedMotion.matches && !frame) frame = requestAnimationFrame(renderStory);
  }

  function sizeChapters() {
    const room = window.innerHeight - header.offsetHeight;
    for (const chapter of chapters) {
      const stage = chapter.querySelector('.chapter-stage');
      if (!stage) continue;
      const pin = room >= 500 && stage.offsetHeight <= room + 1;
      chapter.classList.toggle('is-pinned', pin);
      const distance = chapter === feature ? room * 1.13 : room * .57;
      chapter.style.setProperty('--hold', `${Math.round(distance)}px`);
    }
    scheduleStory();
  }

  function updateStory(keepPlace = false) {
    const current = keepPlace ? chapters.find((chapter) => chapter.getBoundingClientRect().bottom > header.offsetHeight + 2) : null;
    const position = current?.getBoundingClientRect().top;
    const active = !reducedMotion.matches && !userPaused;
    document.body.classList.toggle('cinema', active);
    document.body.classList.toggle('cinema-off', !active);
    motion.hidden = reducedMotion.matches;
    motion.textContent = active ? '暂停动效' : '开启动效';
    if (!active && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    sizeChapters();
    if (current) {
      const newPosition = current.getBoundingClientRect().top;
      window.scrollBy({ top: newPosition - Math.max(-100, position), behavior: 'instant' });
    }
    updateBackground();
  }

  async function updateBackground() {
    if (reducedMotion.matches || userPaused || document.hidden || !visible) {
      hero.pause();
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
    } catch {
      // Keep the poster visible if autoplay is unavailable.
    }
  }

  motion.addEventListener('click', () => {
    userPaused = !userPaused;
    updateStory(true);
  });
  reducedMotion.addEventListener('change', () => updateStory(true));
  window.addEventListener('scroll', scheduleStory, { passive: true });
  window.addEventListener('resize', sizeChapters);
  feature.addEventListener('focusin', () => feature.setAttribute('data-manual', ''));
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
  updateStory();
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
    if (!reducedMotion.matches && !document.body.classList.contains('cinema-off') && caption.animate) {
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
