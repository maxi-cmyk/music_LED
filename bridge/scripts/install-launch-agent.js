const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const label = 'com.maxi.music-led-bridge';
const bridgeDirectory = path.resolve(__dirname, '..');
const agentDirectory = path.join(os.homedir(), 'Library', 'LaunchAgents');
const plistPath = path.join(agentDirectory, `${label}.plist`);
const domain = `gui/${process.getuid()}`;

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function bootout() {
  spawnSync('launchctl', ['bootout', domain, plistPath], { stdio: 'ignore' });
}

if (process.argv.includes('--uninstall')) {
  bootout();
  fs.rmSync(plistPath, { force: true });
  console.log(`Removed ${label}.`);
  process.exit(0);
}

fs.mkdirSync(agentDirectory, { recursive: true });
const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(process.execPath)}</string>
    <string>${escapeXml(path.join(bridgeDirectory, 'src', 'index.js'))}</string>
  </array>
  <key>WorkingDirectory</key><string>${escapeXml(bridgeDirectory)}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${escapeXml(path.join(bridgeDirectory, 'bridge.log'))}</string>
  <key>StandardErrorPath</key><string>${escapeXml(path.join(bridgeDirectory, 'bridge-error.log'))}</string>
</dict>
</plist>
`;
fs.writeFileSync(plistPath, plist, { mode: 0o600 });
bootout();
const result = spawnSync('launchctl', ['bootstrap', domain, plistPath], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
console.log(`Installed ${label}. The bridge will start at login and restart after failure.`);
