#!/usr/bin/env bash
# CityCode / opencode environment setup for macOS and Linux.
#
# Installs the base tooling used across this workspace: Git, Bun (the only thing
# actually required to run this repo - see CONTRIBUTING.md), Node.js (which brings
# npm), Python, and - if an NVIDIA GPU is detected - the CUDA Toolkit. Every step is
# skipped if already present, so it's safe to re-run.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/<org>/<repo>/<branch>/script/setup.sh | bash
# or, from a local clone:
#   bash script/setup.sh

set -euo pipefail

has() { command -v "$1" >/dev/null 2>&1; }

echo "==> Checking package manager"
if has brew; then
  PM=brew
elif has apt-get; then
  PM=apt
else
  echo "No supported package manager found (expected Homebrew on macOS or apt on Linux)." >&2
  echo "Install Git, Node.js, and Python manually, then re-run this script for Bun + project setup." >&2
  PM=none
fi

install_pkg() {
  local pkg_brew=$1 pkg_apt=$2 label=$3
  case "$PM" in
    brew) echo "Installing $label..."; brew install "$pkg_brew" ;;
    apt) echo "Installing $label..."; sudo apt-get update -y && sudo apt-get install -y "$pkg_apt" ;;
    none) echo "Skipping $label (no package manager) - install it manually." ;;
  esac
}

# --- Git -----------------------------------------------------------------
if has git; then
  echo "Git already installed: $(git --version)"
else
  install_pkg git git "Git"
fi

# --- Bun (the only requirement actually documented in CONTRIBUTING.md) ---
if has bun; then
  echo "Bun already installed: $(bun --version)"
else
  echo "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
fi

# --- Node.js + npm ---------------------------------------------------------
if has npm; then
  echo "npm already installed: $(npm --version)"
else
  install_pkg node nodejs "Node.js (includes npm)"
fi

# --- Python ------------------------------------------------------------
if has python3; then
  echo "Python already installed: $(python3 --version)"
else
  install_pkg python3 python3 "Python"
fi

# --- CUDA Toolkit (only if an NVIDIA GPU is present) ------------------------
if has nvidia-smi; then
  if has nvcc; then
    echo "CUDA Toolkit already installed: $(nvcc --version | grep release)"
  else
    echo "NVIDIA GPU detected."
    if [ "$PM" = "apt" ]; then
      echo "Installing CUDA Toolkit..."
      sudo apt-get install -y nvidia-cuda-toolkit
    else
      echo "Install the CUDA Toolkit manually from https://developer.nvidia.com/cuda-downloads" >&2
    fi
  fi
else
  echo "No NVIDIA GPU detected - skipping CUDA Toolkit."
fi

# --- Project dependencies ---------------------------------------------------
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$REPO_ROOT/package.json" ]; then
  echo "Running 'bun install' in $REPO_ROOT..."
  (cd "$REPO_ROOT" && bun install)
fi

cat <<'EOF'

Setup complete. Try:
  bun run dev       # launch the terminal UI
  bun run dev:web   # launch the web UI at http://localhost:3000
EOF
