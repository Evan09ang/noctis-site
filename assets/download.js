const downloadStatus = document.querySelector('#download-status');
const downloadLink = document.querySelector('#download-apk');

async function showLatestDownload() {
  try {
    const response = await fetch('https://api.github.com/repos/Evan09ang/noctis-site/releases/latest', { cache: 'no-cache' });
    if (response.status === 404) {
      downloadStatus.textContent = '公开安装包准备中。';
      downloadLink.hidden = true;
      return;
    }
    if (!response.ok) throw new Error(`Release lookup returned ${response.status}`);

    const release = await response.json();
    const apk = release.assets.find((asset) => asset.name === 'NOCTIS-Android.apk' && asset.state === 'uploaded' && asset.size > 0);
    if (!apk) {
      downloadStatus.textContent = '当前版本的安装包暂未发布。';
      downloadLink.hidden = true;
      return;
    }
    const size = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(apk.size / 1_048_576);
    downloadStatus.textContent = `${release.tag_name.replace(/^v/, '')} · ${size} MiB · 包含离线音视频素材`;
    const digest = document.querySelector('#apk-digest');
    if (digest && /^sha256:[a-f0-9]{64}$/i.test(apk.digest ?? '')) {
      digest.textContent = `SHA-256 ${apk.digest.slice(7)}`;
      digest.hidden = false;
    }
    downloadLink.hidden = false;
  } catch {
    downloadStatus.textContent = '暂时无法核对最新版本与大小，可直接前往 GitHub 下载或查看发布记录。';
  }
}

showLatestDownload();
