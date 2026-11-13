const downloadStatus = document.querySelector('#download-status');
const downloadLink = document.querySelector('#download-apk');

async function showLatestDownload() {
  try {
    const response = await fetch('https://api.github.com/repos/Evan09ang/noctis-site/releases/latest', { cache: 'no-cache' });
    if (response.status === 404) {
      downloadStatus.textContent = '公开安装包准备中。';
      return;
    }
    if (!response.ok) throw new Error(`Release lookup returned ${response.status}`);

    const release = await response.json();
    const apk = release.assets.find((asset) => asset.name === 'NOCTIS-Android.apk' && asset.state === 'uploaded' && asset.size > 0);
    if (!apk) {
      downloadStatus.textContent = '当前版本的安装包暂未发布。';
      return;
    }
    const size = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(apk.size / 1_048_576);
    downloadStatus.textContent = `${release.tag_name.replace(/^v/, '')} · ${size} MB`;
    downloadLink.hidden = false;
  } catch {
    downloadStatus.textContent = '暂时无法读取最新版本，请查看版本发布记录。';
  }
}

showLatestDownload();
