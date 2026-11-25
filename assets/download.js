const downloadStatus = document.querySelector('#download-status');
const downloadLink = document.querySelector('#download-apk');
const digest = document.querySelector('#apk-digest');

async function showLatestDownload() {
  try {
    const response = await fetch('https://api.github.com/repos/Evan09ang/noctis-site/releases/latest', { cache: 'no-cache' });
    if (!response.ok) return;

    const release = await response.json();
    const expectedUrl = 'https://github.com/Evan09ang/noctis-site/releases/download/' +
      encodeURIComponent(release.tag_name) + '/NOCTIS-Android.apk';
    const apk = release.assets.find((asset) =>
      asset.name === 'NOCTIS-Android.apk' && asset.state === 'uploaded' &&
      asset.size > 0 && asset.browser_download_url === expectedUrl);
    if (!apk) return;

    const size = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(apk.size / 1_048_576);
    downloadStatus.textContent = release.tag_name.replace(/^v/, '') + ' · ' + size + ' MiB · 包含离线音视频素材';
    downloadLink.href = expectedUrl;
    digest.hidden = !/^sha256:[a-f0-9]{64}$/i.test(apk.digest ?? '');
    if (!digest.hidden) digest.textContent = 'SHA-256 ' + apk.digest.slice(7);
  } catch {
    // The verified release link remains available if the API is unreachable.
  }
}

showLatestDownload();
