const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const extract = require('extract-zip');

const JAVA_BASE_DIR = path.join(os.homedir(), '.proclient', 'java');

// Adoptium Temurin JRE download URLs per major version
const JAVA_URLS = {
  8: {
    win32:  'https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u422-b05/OpenJDK8U-jre_x64_windows_hotspot_8u422b05.zip',
    darwin: 'https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u422-b05/OpenJDK8U-jre_x64_mac_hotspot_8u422b05.zip',
    linux:  'https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u422-b05/OpenJDK8U-jre_x64_linux_hotspot_8u422b05.zip'
  },
  17: {
    win32:  'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.12%2B7/OpenJDK17U-jre_x64_windows_hotspot_17.0.12_7.zip',
    darwin: 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.12%2B7/OpenJDK17U-jre_x64_mac_hotspot_17.0.12_7.zip',
    linux:  'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.12%2B7/OpenJDK17U-jre_x64_linux_hotspot_17.0.12_7.zip'
  },
  21: {
    win32:  'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.4%2B7/OpenJDK21U-jre_x64_windows_hotspot_21.0.4_7.zip',
    darwin: 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.4%2B7/OpenJDK21U-jre_x64_mac_hotspot_21.0.4_7.zip',
    linux:  'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.4%2B7/OpenJDK21U-jre_x64_linux_hotspot_21.0.4_7.zip'
  }
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const follow = (u) => {
      https.get(u, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          file.close();
          fs.unlink(dest, () => {});
          return follow(response.headers.location);
        }
        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(dest, () => {});
          return reject(new Error(`HTTP ${response.statusCode}`));
        }
        response.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', (err) => {
        file.close();
        fs.unlink(dest, () => {});
        reject(err);
      });
    };
    follow(url);
  });
}

async function ensureJava(majorVersion = 21) {
  const javaExe = process.platform === 'win32' ? 'bin\\java.exe' : 'bin/java';
  const javaDir = path.join(JAVA_BASE_DIR, `jre${majorVersion}`);

  // Check if already downloaded
  if (fs.existsSync(javaDir)) {
    const entries = fs.readdirSync(javaDir).filter(e => e.startsWith('jdk') || e.startsWith('OpenJDK'));
    if (entries.length) {
      const javaPath = path.join(javaDir, entries[0], javaExe);
      if (fs.existsSync(javaPath)) {
        console.log(`[Java] Found local JRE ${majorVersion} at`, javaPath);
        return javaPath;
      }
    }
  }

  // Download
  const urls = JAVA_URLS[majorVersion];
  if (!urls) throw new Error(`No download URL for Java ${majorVersion}`);
  const url = urls[process.platform];
  if (!url) throw new Error(`Unsupported platform: ${process.platform}`);

  console.log(`[Java] Downloading JRE ${majorVersion}...`);
  fs.mkdirSync(javaDir, { recursive: true });
  const archive = path.join(javaDir, 'jre.zip');
  await downloadFile(url, archive);

  console.log('[Java] Extracting...');
  await extract(archive, { dir: javaDir });
  fs.unlinkSync(archive);

  const entries = fs.readdirSync(javaDir).filter(e => e.startsWith('jdk') || e.startsWith('OpenJDK'));
  if (!entries.length) throw new Error('Java extraction failed');

  const javaPath = path.join(javaDir, entries[0], javaExe);
  console.log(`[Java] Ready at`, javaPath);
  return javaPath;
}

module.exports = { ensureJava };
