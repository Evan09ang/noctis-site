const variants = ['light_far', 'light_near', 'heavy_far', 'heavy_near'];

export const defaultRain = Object.freeze({ strength: 26, distance: 72 });

export function readRain() {
  const value = new URLSearchParams(location.hash.slice(1)).get('r');
  if (!value || !/^\d{1,3},\d{1,3}$/.test(value)) return null;
  const [strength, distance] = value.split(',').map(Number);
  return strength <= 100 && distance <= 100 ? { strength, distance } : null;
}

export function rainLink(page, { strength, distance }) {
  const url = new URL(page, location.href);
  url.hash = 'r=' + strength + ',' + distance;
  return url;
}

function loopBuffer(context, buffer) {
  // Overlap the cut so a decoded AAC boundary doesn't click when it wraps.
  const overlap = Math.round(buffer.sampleRate * .18);
  const length = buffer.length - overlap;
  const loop = context.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const original = buffer.getChannelData(channel);
    const samples = loop.getChannelData(channel);
    samples.set(original.subarray(0, length));
    for (let i = 0; i < overlap; i++) {
      const blend = .5 - .5 * Math.cos(Math.PI * i / (overlap - 1));
      samples[i] = original[length + i] * (1 - blend) + original[i] * blend;
    }
  }
  return loop;
}

export class RainAudio {
  context = null;
  layers = [];
  volume = .42;
  position = defaultRain;
  master = null;
  playing = false;
  suspendTimer = 0;

  setPosition(position) {
    this.position = position;
    if (!this.layers.length) return;
    const strength = position.strength / 100;
    const far = position.distance / 100;
    const weights = [(1 - strength) * far, (1 - strength) * (1 - far), strength * far, strength * (1 - far)];
    this.layers.forEach((gain, index) => {
      gain.gain.setTargetAtTime(Math.sqrt(weights[index]) * .55, this.context.currentTime, .045);
    });
  }

  setVolume(volume) {
    this.volume = volume;
    if (this.master && this.playing) {
      this.master.gain.setTargetAtTime(volume, this.context.currentTime, .08);
    }
  }

  async play() {
    clearTimeout(this.suspendTimer);
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('Web Audio unavailable');
    if (!this.context) this.context = new Audio();
    const context = this.context;
    if (context.state !== 'running') await context.resume();
    if (!this.master) {
      const buffers = await Promise.all(variants.map(async (variant) => {
        const url = new URL('rain-' + variant + '.m4a', import.meta.url);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Rain layer unavailable');
        return loopBuffer(context, await context.decodeAudioData(await response.arrayBuffer()));
      }));
      this.master = context.createGain();
      this.master.gain.value = 0;
      this.master.connect(context.destination);
      this.layers = buffers.map((buffer) => {
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const gain = context.createGain();
        gain.gain.value = 0;
        source.connect(gain);
        gain.connect(this.master);
        source.start();
        return gain;
      });
    }
    this.setPosition(this.position);
    this.playing = true;
    this.setVolume(this.volume);
  }

  pause() {
    this.playing = false;
    if (!this.master) return;
    clearTimeout(this.suspendTimer);
    this.master.gain.setTargetAtTime(0, this.context.currentTime, .035);
    this.suspendTimer = setTimeout(() => {
      if (!this.playing) this.context.suspend().catch(() => {});
    }, 240);
  }
}

export function bindRainPlayback(audio, button, status, volume) {
  let loading = false;
  let pageVisible = true;
  const render = () => {
    button.disabled = loading;
    button.textContent = loading ? '正在加载雨声…' : audio.playing ? '暂停雨声' : '播放雨声';
  };
  button.addEventListener('click', async () => {
    if (loading) return;
    status.textContent = '';
    if (audio.playing) {
      audio.pause();
      render();
      return;
    }
    loading = true;
    render();
    try {
      await audio.play();
      if (!pageVisible) audio.pause();
    } catch {
      status.textContent = '雨声暂时无法播放，请重试。';
    } finally {
      loading = false;
      render();
    }
  });
  if (volume) {
    const update = () => audio.setVolume(Number(volume.value) / 100);
    volume.addEventListener('input', update);
    update();
  }
  window.addEventListener('pagehide', () => {
    pageVisible = false;
    audio.pause();
    render();
  });
  window.addEventListener('pageshow', () => { pageVisible = true; });
  render();
}
