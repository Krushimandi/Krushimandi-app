# Auth Bootstrap Setup Script (PowerShell)
# Run this script to ensure all bootstrap components are properly integrated

Write-Host "🚀 Setting up Auth Bootstrap System..." -ForegroundColor Green

# Check if all required files exist
Write-Host "📋 Checking required files..." -ForegroundColor Cyan

$requiredFiles = @(
    "src/utils/authBootstrap.ts",
    "src/components/common/AppBootstrapScreen.tsx", 
    "src/components/providers/AuthStateProvider.tsx",
    "src/hooks/useAuthBootstrap.ts",
    "AUTH_BOOTSTRAP_SYSTEM.md"
)

$missingFiles = @()

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "❌ Missing files:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "  - $file" -ForegroundColor Red
    }
    Write-Host "Please ensure all bootstrap files are created." -ForegroundColor Red
    exit 1
}

Write-Host "✅ All required files present" -ForegroundColor Green

# Check if App.tsx has been updated
Write-Host "📋 Checking App.tsx integration..." -ForegroundColor Cyan
if (Select-String -Path "App.tsx" -Pattern "AppBootstrapScreen" -Quiet) {
    Write-Host "  ✅ AppBootstrapScreen integrated in App.tsx" -ForegroundColor Green
} else {
    Write-Host "  ❌ App.tsx not updated - please integrate AppBootstrapScreen" -ForegroundColor Red
    exit 1
}

# Check if AppNavigator has been updated
Write-Host "📋 Checking AppNavigator integration..." -ForegroundColor Cyan
if (Select-String -Path "src/navigation/AppNavigator.tsx" -Pattern "AuthBootstrapState" -Quiet) {
    Write-Host "  ✅ AppNavigator uses bootstrap state" -ForegroundColor Green
} else {
    Write-Host "  ❌ AppNavigator not updated - please integrate bootstrap state" -ForegroundColor Red
    exit 1
}

# Test TypeScript compilation
Write-Host "📋 Testing TypeScript compilation..." -ForegroundColor Cyan
if (Get-Command npx -ErrorAction SilentlyContinue) {
    try {
        npx tsc --noEmit --skipLibCheck
        Write-Host "  ✅ TypeScript compilation successful" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ TypeScript compilation failed - please fix errors" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  ⚠️ npx not found - skipping TypeScript check" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Auth Bootstrap System setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📖 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run 'npm start' or 'yarn start' to test the app"
Write-Host "  2. Check the console for bootstrap debug logs"
Write-Host "  3. Verify auth state persists after app restart"
Write-Host "  4. Test development build/install flow"
Write-Host ""
Write-Host "📚 Documentation: See AUTH_BOOTSTRAP_SYSTEM.md for detailed usage" -ForegroundColor Cyan
Write-Host ""
