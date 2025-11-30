# 📸 Screenshot Copy Helper Script
# This script helps you copy screenshots from your source directory

$sourceDir = "D:\Projects\App images"
$targetDir = "d:\Krushimandi-app\docs\screenshots"

Write-Host "🌾 Krushimandi Screenshot Copy Tool" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

# Check if source directory exists
if (-not (Test-Path $sourceDir)) {
    Write-Host "❌ Source directory not found: $sourceDir" -ForegroundColor Red
    Write-Host "Please update the `$sourceDir variable in this script." -ForegroundColor Yellow
    exit
}

Write-Host "📁 Source: $sourceDir" -ForegroundColor Cyan
Write-Host "📁 Target: $targetDir" -ForegroundColor Cyan
Write-Host ""

# List available images
Write-Host "Available images in source:" -ForegroundColor Yellow
Get-ChildItem -Path $sourceDir -Filter *.png,*.jpg | ForEach-Object { Write-Host "  - $($_.Name)" }
Write-Host ""

# Required screenshot mappings
$requiredScreenshots = @{
    "farmer-home.png" = "Farmer dashboard with product listings"
    "add-product.png" = "Add product screen with image upload"
    "browse-products.png" = "Product catalog (buyer view)"
    "chat.png" = "Real-time messaging interface"
    "orders.png" = "Order management dashboard"
    "product-details.png" = "Product detail page with farmer info"
    "notifications.png" = "Notification center"
    "profile.png" = "User profile with ratings"
}

Write-Host "🎯 Required Screenshots (8 essential):" -ForegroundColor Green
Write-Host ""

foreach ($screenshot in $requiredScreenshots.GetEnumerator()) {
    $targetPath = Join-Path $targetDir $screenshot.Key
    $exists = Test-Path $targetPath
    $status = if ($exists -and (Get-Item $targetPath).Length -gt 1KB) { "✅" } else { "❌" }
    
    Write-Host "$status $($screenshot.Key)" -ForegroundColor $(if ($status -eq "✅") { "Green" } else { "Yellow" })
    Write-Host "   Description: $($screenshot.Value)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📋 Manual Copy Instructions:" -ForegroundColor Cyan
Write-Host "1. Open File Explorer to: $sourceDir" -ForegroundColor White
Write-Host "2. Select the images you want to use" -ForegroundColor White
Write-Host "3. Copy them to: $targetDir" -ForegroundColor White
Write-Host "4. Rename them according to the list above" -ForegroundColor White
Write-Host ""

# Option to open directories
Write-Host "Would you like to open both directories in File Explorer? (Y/N): " -NoNewline -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "Y" -or $response -eq "y") {
    Start-Process explorer.exe -ArgumentList $sourceDir
    Start-Process explorer.exe -ArgumentList $targetDir
    Write-Host "✅ Directories opened!" -ForegroundColor Green
}

Write-Host ""
Write-Host "💡 Tip: Compress images using https://tinypng.com before adding" -ForegroundColor Magenta
Write-Host "💡 Recommended size: 1080x2400 pixels, < 500KB each" -ForegroundColor Magenta
