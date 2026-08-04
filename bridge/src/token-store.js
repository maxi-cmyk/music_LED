const fs = require('node:fs');
const path = require('node:path');

class TokenStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  load() {
    if (!fs.existsSync(this.filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
  }

  save(tokens) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(this.filePath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  }
}

module.exports = { TokenStore };
