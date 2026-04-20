#!/usr/bin/env bash
# =============================================================================
# NutriPulse — Render Build Script
# =============================================================================
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt
