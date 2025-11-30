# 📸 Screenshots Guide

This directory contains screenshots for the main README.md file.

## Required Screenshots (8 Essential Images)

Add these screenshots from your app to showcase the most important features:

### 🎯 Priority 1 - Core User Flows (4 screenshots)
1. **farmer-home.png** - Farmer dashboard showing product listings and sales stats
2. **add-product.png** - Add product screen with image upload and form fields
3. **browse-products.png** - Product catalog with search/filter options (buyer view)
4. **chat.png** - Real-time messaging interface between farmer and buyer

### 🎯 Priority 2 - Essential Features (4 screenshots)
5. **orders.png** - Order management dashboard with order statuses
6. **product-details.png** - Detailed product page with farmer profile and reviews
7. **notifications.png** - Notification center showing order and chat alerts
8. **profile.png** - User profile with ratings, reviews, and settings

## Screenshot Guidelines

### 📐 Dimensions
- **Resolution**: 1080x2400 (or your device's native resolution)
- **Aspect Ratio**: 9:16 or 9:19.5 (standard phone ratios)
- **Format**: PNG (preferred) or JPG
- **File Size**: < 500 KB per image (compressed)

### 📱 Capture Tips
1. Use a real Android device or high-quality emulator
2. Remove status bar information (time, battery) if possible
3. Show meaningful content (not empty states)
4. Use good lighting and clear UI
5. Capture in portrait mode
6. Avoid personal/sensitive information

### 🎨 Editing Tips
- Add device frame using [mockuphone.com](https://mockuphone.com) or [Screely](https://www.screely.com)
- Compress images using [TinyPNG](https://tinypng.com) or [Squoosh](https://squoosh.app)
- Ensure consistent styling across all screenshots

## 🚀 Quick Copy Instructions

### Option 1: Use the Helper Script (Easiest)
```powershell
cd docs/screenshots
.\copy-screenshots.ps1
```
This script will:
- List available images from your source folder
- Show which screenshots are needed
- Open both directories in File Explorer

### Option 2: Manual Copy
1. Navigate to: `D:\Projects\App images\`
2. Select your best 8 screenshots
3. Copy them to: `d:\Krushimandi-app\docs\screenshots\`
4. Rename according to the list above

## Screenshot Sources

Your original screenshots are located at:
```
D:\Projects\App images\*
```

**After adding screenshots:** The README will automatically display them in a professional grid layout!

## How to Add Screenshots

1. Copy screenshots from `D:\Projects\App images\` to this directory
2. Rename them according to the required names above
3. Optimize/compress images if needed
4. The main README.md will automatically display them

## Alternative: Using Mockups

If you want professional mockups, consider these tools:
- [Figma](https://www.figma.com) - Design mockups
- [Canva](https://www.canva.com) - Quick mockup templates
- [Smartmockups](https://smartmockups.com) - Device mockups
- [MockDrop](https://mockdrop.io) - Free mockup generator

## Example Layout

Once added, screenshots will appear in the main README like this:

```markdown
| Home Screen | Product Listing | Order Management |
|-------------|----------------|------------------|
| ![Farmer Home](./docs/screenshots/farmer-home.png) | ![Add Product](./docs/screenshots/add-product.png) | ![Orders](./docs/screenshots/orders.png) |
```

---

**Note**: Make sure all screenshots are added before sharing the repository or publishing the README on GitHub.
