#!/usr/bin/env bash

set -euo pipefail

echo "Checking adb availability..."
command -v adb >/dev/null 2>&1 || {
  echo "adb is not installed or not on PATH."
  exit 1
}

echo
echo "Connected Android devices:"
adb devices

echo
echo "Applying reverse port mapping for Metro and Wizard dashboard..."
adb reverse tcp:8081 tcp:8081
adb reverse tcp:7007 tcp:7007

echo
echo "Active adb reverse rules:"
adb reverse --list

echo
echo "Wizard of Oz USB workflow is ready."
echo "Next steps:"
echo "  1. npm run wizard:dashboard"
echo "  2. npx expo start --dev-client --clear"
echo "  3. Open http://localhost:7007 on the laptop"
