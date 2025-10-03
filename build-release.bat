@echo off
echo Stopping Gradle daemons...
cd android
call gradlew --stop

echo.
echo Deleting cache directories...
if exist .gradle rmdir /s /q .gradle
if exist app\build rmdir /s /q app\build
if exist build rmdir /s /q build

echo.
echo Building Release APK...
call gradlew assembleRelease

echo.
if %ERRORLEVEL% EQU 0 (
    echo ✅ BUILD SUCCESSFUL!
    echo.
    echo 📍 APK Location: android\app\build\outputs\apk\release\app-release.apk
) else (
    echo ❌ BUILD FAILED!
)

pause
