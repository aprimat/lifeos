#!/bin/zsh
# npm run release:ios — build LifeOS locally (Release, signed with the paid team's development
# profile) and install it on the iPhone over the cable. Only needed the first time and after a
# native change; everything else goes over the air with `npm run update:ios`.
#
# Needs: Xcode signed in to the Apple ID (Xcode → Settings → Accounts), CocoaPods, and the iPhone
# connected by cable, unlocked, with Developer Mode on. ios/ is generated (CNG) and gitignored.
set -e
cd "$(dirname "$0")/.."

TEAM=7DMHB3BMGW
DEVICE=${LIFEOS_DEVICE:-00008150-0019651A0A43C01C}   # xctrace UDID (`xcrun xctrace list devices`)
BUNDLE_ID=com.aprimat.lifeos

# Same flags as the EAS preview environment (sample data, design gallery) for the embedded bundle.
export EXPO_PUBLIC_DEV_TOOLS=1

npx expo prebuild --platform ios --clean --no-install
(cd ios && pod install)

WS=$(ls -d ios/*.xcworkspace | head -1)
SCHEME=$(basename "$WS" .xcworkspace)
xcodebuild -workspace "$WS" -scheme "$SCHEME" -configuration Release \
  -destination 'generic/platform=iOS' \
  -allowProvisioningUpdates -allowProvisioningDeviceRegistration \
  -derivedDataPath ios/build/release \
  DEVELOPMENT_TEAM=$TEAM CODE_SIGN_STYLE=Automatic PRODUCT_BUNDLE_IDENTIFIER=$BUNDLE_ID \
  build 2>&1 | grep -E "error:|BUILD (SUCCEEDED|FAILED)" | head -20

APP=ios/build/release/Build/Products/Release-iphoneos/$SCHEME.app
[ -d "$APP" ] || { echo "Build failed: $APP not found"; exit 1; }

# The channel must be baked in, or the app won't receive the preview updates.
/usr/libexec/PlistBuddy -c "Print :EXUpdatesRequestHeaders:expo-channel-name" "$APP/Expo.plist"

xcrun devicectl device install app --device "$DEVICE" "$APP" 2>&1 | tail -2
xcrun devicectl device process launch --terminate-existing --device "$DEVICE" $BUNDLE_ID 2>&1 | tail -1
echo DONE
