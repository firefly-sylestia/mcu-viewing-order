#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
ANDROID_DIR="$REPO_ROOT/android"

export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}"
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME="${ANDROID_HOME:-$REPO_ROOT/android-sdk}"

required_env_vars=(
  "KEYSTORE_PATH"
  "KEYSTORE_PASSWORD"
  "KEY_ALIAS"
  "KEY_PASSWORD"
)

for var_name in "${required_env_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    echo "❌ Missing required environment variable: $var_name"
    echo "Set all required values before running build-release.sh"
    exit 1
  fi
done

if [ ! -f "$KEYSTORE_PATH" ]; then
  echo "❌ KEYSTORE_PATH does not point to an existing file: $KEYSTORE_PATH"
  exit 1
fi

cd "$REPO_ROOT"

echo "🔨 Building web assets..."
npm run build

echo "📱 Syncing with Capacitor..."
npx cap sync android

echo "⚙️ Patching Gradle files..."
find "$REPO_ROOT/node_modules/@capacitor" "$REPO_ROOT/node_modules/@capacitor-community" -name "*.gradle" -type f -exec sed -i \
  -e 's/JavaVersion.VERSION_21/JavaVersion.VERSION_17/g' \
  -e 's/jvmTarget = "21"/jvmTarget = "17"/g' \
  -e "s/jvmTarget = '21'/jvmTarget = '17'/g" \
  -e 's/jvmToolchain(21)/jvmToolchain(17)/g' {} \;

find "$ANDROID_DIR" -name "*.gradle" -type f -exec sed -i \
  -e 's/JavaVersion.VERSION_21/JavaVersion.VERSION_17/g' \
  -e 's/jvmToolchain(21)/jvmToolchain(17)/g' {} \;

echo "🔑 Building signed release APK..."
cd "$ANDROID_DIR"
./gradlew assembleRelease

echo ""
echo "✅ Release APK built successfully!"
echo "📦 Renaming APK..."

APK_PATH=$(find "$ANDROID_DIR" -name "app-release.apk" 2>/dev/null | head -1)
if [ -n "$APK_PATH" ]; then
  NEW_NAME="Luminary-Panels-1.1.6-release.apk"
  cp "$APK_PATH" "$REPO_ROOT/$NEW_NAME"
  echo "✨ Final APK: $REPO_ROOT/$NEW_NAME"
  ls -lh "$REPO_ROOT/$NEW_NAME"
else
  echo "Could not find app-release.apk"
fi
