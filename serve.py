"""Launch this branch's Spectra app at http://127.0.0.1:8080."""

import os
from pathlib import Path
import shutil
import sys


def main():
    project = Path(__file__).resolve().parent
    npm = shutil.which("npm")
    if npm is None:
        sys.exit("Install Node.js and npm before starting Spectra.")
    if not (project / "spectra/node_modules/vite/bin/vite.js").is_file():
        sys.exit("Install Spectra dependencies first: npm --prefix spectra install")
    os.chdir(project)
    os.execv(npm, [npm, "--prefix", "spectra", "run", "dev"])


if __name__ == "__main__":
    main()
