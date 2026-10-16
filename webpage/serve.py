"""Compatibility entry point: this branch launches Spectra."""

from pathlib import Path
import runpy


if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).resolve().parents[1] / "serve.py"),
                   run_name="__main__")
