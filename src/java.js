const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const extract = require('extract-zip');
const tar = require('tar');

const JAVA_DIR = path.join(os.homedir(), '.proclient', 'java');

// Adoptium Temurin JRE 21 download URLs per platform
const JAVA_URLS = {
  win32: {
    url: 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.2%2B13/OpenJDK21U-jre_x64_windows_hotspot_21.0.2_13.zip',
    type: 'zip'
  },
  darwin: {
    url: 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.2%2B13/OpenJDK21U-jre_x64_mac_hotspot_21.0.2_13.tar.gz',
    type: 'tar'
  },
  linux: {
    url: 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.2%2B13/OpenJDK21U-jre_x64_linux_hotspot_21.0.2_13.tar.gz',
    type: 'tar'
  }
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function ensureJava() {
  const javaExe = process.platform === 'win32' ? 'bin\\java.exe' : 'bin/java';
  
  // Check if already downloaded
  if (fs.existsSync(JAVA_DIR)) {
    const entries = fs.readdirSync(JAVA_DIR).filter(e => e.startsWith('jdk-') || e.startsWith('OpenJDK'));
    if (entries.length > 0) {
      const javaPath = path.join(JAVA_DIR, entries[0], javaExe);
      if (fs.existsSync(javaPath)) {
        console.log('[Java] Found local JRE at', javaPath);
        return javaPath;
      }
    }
  }

  // Download
  console.log('[Java] Downloading JRE 21...');
  fs.mkdirSync(JAVA_DIR, { recursive: true });

  const { url, type } = JAVA_URLS[process.platform];
  const archive = path.join(JAVA_DIR, type === 'zip' ? 'jre.zip' : 'jre.tar.gz');

  await downloadFile(url, archive);
  console.log('[Java] Downloaded. Extracting...');

  if (type === 'zip') {
    await extract(archive, { dir: JAVA_DIR });
  } else {
    await tar.x({ file: archive, cwd: JAVA_DIR });
  }

  fs.unlinkSync(archive);

  // Find extracted folder
  const entries = fs.readdirSync(JAVA_DIR).filter(e => e.startsWith('jdk-') || e.startsWith('OpenJDK'));
  if (!entries.length) throw new Error('Java extraction failed');

  const javaPath = path.join(JAVA_DIR, entries[0], javaExe);
  console.log('[Java] Ready at', javaPath);
  return javaPath;
}

module.exports = { ensureJava };
