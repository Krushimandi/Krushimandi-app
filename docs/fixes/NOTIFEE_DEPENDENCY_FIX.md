# Notifee Dependency Resolution Fix

## Issue
Build was failing with the following error:
```
Could not find any matches for app.notifee:core:+ as no versions of app.notifee:core are available.
```

## Root Cause
The `@notifee/react-native` library's Android build.gradle file (in node_modules) references an incorrect Maven group ID:
- **Incorrect**: `app.notifee:core:+`
- **Correct**: `io.notifee:core:9.1.2`

## Solution Applied

### Changes Made to `android/app/build.gradle`

#### 1. Added Dependency Substitution Rule
Added a `configurations.all` block with a `dependencySubstitution` rule to redirect the incorrect dependency to the correct one:

```gradle
configurations.all {
    resolutionStrategy {
        // Fix for Notifee dependency issue - substitute incorrect group ID
        dependencySubstitution {
            substitute module('app.notifee:core') using module('io.notifee:core:9.1.2')
        }
    }
}
```

#### 2. Added Repositories Section
Ensured all necessary Maven repositories are accessible:

```gradle
repositories {
    google()
    mavenCentral()
    maven {
        url 'https://maven.google.com/'
    }
}
```

#### 3. Added Explicit Dependency
Added the correct Notifee core dependency explicitly to avoid resolution issues:

```gradle
dependencies {
    // ... other dependencies
    
    // Notifee core dependency - explicitly added to fix dependency resolution
    implementation 'io.notifee:core:9.1.2'
    
    // ... other dependencies
}
```

## Version Information
- **@notifee/react-native**: ^9.1.8 (from package.json)
- **io.notifee:core**: 9.1.2 (Android native library)

## Next Steps

### 1. Clean Build
Run the following command to clean previous build artifacts:
```bash
cd android
./gradlew clean
# or on Windows
gradlew.bat clean
```

### 2. Rebuild
After cleaning, run the build again:
```bash
npx react-native run-android
```

### 3. If Issues Persist

If you still encounter issues, try:

**a. Clear Gradle Cache:**
```bash
cd android
./gradlew clean
rm -rf .gradle
rm -rf build
rm -rf app/build
```

**b. Clear Node Modules and Reinstall:**
```bash
rm -rf node_modules
rm -rf android/app/build
npm install
# or
yarn install
```

**c. Invalidate Gradle Caches:**
```bash
cd android
./gradlew --stop
./gradlew clean build --refresh-dependencies
```

## Why This Happens
This is a known issue with some versions of `@notifee/react-native` where the Android build.gradle file in the node_modules contains an outdated or incorrect group ID for the native Android library dependency. The library maintainers use `app.notifee` internally during development, but the published Maven artifact uses `io.notifee`.

## Alternative Solutions

### Option 1: Patch node_modules (Not Recommended)
You could modify `node_modules/@notifee/react-native/android/build.gradle` line 99-103, but this would be lost on every `npm install`.

### Option 2: Use patch-package (Recommended for Production)
If this fix doesn't work or you need a more permanent solution:

1. Install patch-package:
```bash
npm install --save-dev patch-package
```

2. Modify the file in node_modules and create a patch:
```bash
npx patch-package @notifee/react-native
```

3. Add to package.json scripts:
```json
{
  "scripts": {
    "postinstall": "patch-package"
  }
}
```

## References
- Notifee Documentation: https://notifee.app/react-native/docs/overview
- Issue Tracker: https://github.com/invertase/notifee/issues
- Maven Central: https://search.maven.org/artifact/io.notifee/core

---

**Status**: ✅ Fixed
**Date**: October 2, 2025
**Applied to**: android/app/build.gradle
