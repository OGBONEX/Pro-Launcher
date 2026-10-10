const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const { extract } = require('extract-zip'); // You'll need to add this dependency

const JAVA_DIR = path.join(os.homedir(), '.proclient', 'java');

// Adoptium JRE 21 download URLs per platform
const JAVA_URLS = {
  win32: 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.2%2B13/OpenJDK21U-jre_x64_windows_hotspot_21.0.2_13.zip',
  darwin: 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.2%2B13/OpenJDK21U-jre_x64_mac_hotspot_21.0.2_13.tar.gz',
  linux: 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.2%2B13/OpenJDK21U-jre_x64_linux_hotspot_21.0.2_13.tar.gz'
};

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

async function ensureJava() {
  // Check if already downloaded
  const javaExe = process.platform === 'win32' ? 'bin\\java.exe' : 'bin/java';
  const javaPath = path.join(JAVA_DIR, javaExe);
  
  if (fs.existsSync(javaPath)) {
    console.log('[Java] Found local JRE at', javaPath);
    return javaPath;
  }

  // Download if missing
  console.log('[Java] Downloading JRE 21...');
  fs.mkdirSync(JAVA_DIR, { recursive: true });
  
  const url = JAVA_URLS[process.platform];
  const archive = path.join(JAVA_DIR, 'java-archive');
  
  await downloadFile(url, archive);
  
  // Extract archive (needs extract-zip or similar for .zip, tar for .tar.gz)
  console.log('[Java] Extracting...');
  await extract(archive, { dir: JAVA_DIR });
  
  // The extracted folder has a versioned name; find the actual java binary
  const entries = fs.readdirSync(JAVA_DIR);
  const jreFolder = entries.find(e => e.startsWith('jdk-') || e.startsWith('OpenJDK'));
  
  const realJavaPath = path.join(JAVA_DIR, jreFolder, javaExe);
  console.log('[Java] Ready at', realJavaPath);
  return realJavaPath;
}

module.exports = { ensureJava };
