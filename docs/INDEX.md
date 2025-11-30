# 📚 Krushimandi Documentation Index

This directory contains all technical documentation, implementation guides, and development notes for the Krushimandi Agricultural Marketplace app.

## 📂 Documentation Structure

### 🎨 [Features](./features/)
Documentation for major feature implementations and additions.

- [Badge Implementation Summary](./features/BADGE_IMPLEMENTATION_SUMMARY.md)
- [Unseen Orders Badge Implementation](./features/UNSEEN_ORDERS_BADGE_IMPLEMENTATION.md)
- [Sort Modal Implementation](./features/SORT_MODAL_IMPLEMENTATION.md)
- [Stallion Update Implementation](./features/STALLION_UPDATE_IMPLEMENTATION.md)
- [Loading Overlay Utility](./features/LOADING_OVERLAY_UTILITY.md)

### ⚡ [Optimizations](./optimizations/)
Performance improvements and code optimization documentation.

- [App Optimization Summary](./optimizations/APP_OPTIMIZATION_SUMMARY.md)
- [App Optimization Results](./optimizations/APP_OPTIMIZATION_RESULTS.md)
- [Chat Detail Optimization Summary](./optimizations/CHATDETAIL_OPTIMIZATION_SUMMARY.md)
- [Notification Screen Optimizations](./optimizations/NOTIFICATION_SCREEN_OPTIMIZATIONS.md)
- [Notification Preferences Optimization](./optimizations/NOTIFICATION_PREFERENCES_OPTIMIZATION.md)
- [Requests Screen Optimization Progress](./optimizations/REQUESTS_SCREEN_OPTIMIZATION_PROGRESS.md)
- [Render Optimization Fix](./optimizations/RENDER_OPTIMIZATION_FIX.md)
- [Add Fruit Cleanup Summary](./optimizations/ADDFRUIT_CLEANUP_SUMMARY.md)
- [Add Fruit Before/After](./optimizations/ADDFRUIT_BEFORE_AFTER.md)

### 🔧 [Implementations](./implementations/)
Technical implementation details for core systems.

- [Chat FCM Notification Implementation](./implementations/CHAT_FCM_NOTIFICATION_IMPLEMENTATION.md)
- [Chat Notification Deployment](./implementations/CHAT_NOTIFICATION_DEPLOYMENT.md)
- [Chat Notification System](./implementations/CHAT_NOTIFICATION_SYSTEM.md)
- [Notification Action URL Implementation](./implementations/NOTIFICATION_ACTION_URL_IMPLEMENTATION.md)
- [Keyboard Controller Implementation](./implementations/KEYBOARD_CONTROLLER_IMPLEMENTATION.md)
- [Keyboard Controller Full Implementation](./implementations/KEYBOARD_CONTROLLER_FULL_IMPLEMENTATION.md)
- [Keyboard Aware ScrollView Integration](./implementations/KEYBOARD_AWARE_SCROLLVIEW_INTEGRATION.md)
- [Keyboard Implementation Summary](./implementations/KEYBOARD_IMPLEMENTATION_SUMMARY.md)
- [Haptic Installation](./implementations/HAPTIC_INSTALLATION.md)

### 📖 [Guides](./guides/)
Developer guides and system documentation.

- [Haptic Feedback Guide](./guides/HAPTIC_FEEDBACK_GUIDE.md)
- [Haptic Feedback Summary](./guides/HAPTIC_FEEDBACK_SUMMARY.md)
- [Haptic Cheat Sheet](./guides/HAPTIC_CHEAT_SHEET.md)
- [Haptic Quick Start](./guides/HAPTIC_QUICK_START.md)
- [Notification System Guide](./guides/NOTIFICATION_SYSTEM_GUIDE.md)
- [Network Status Guide](./guides/NETWORK_STATUS_GUIDE.md)
- [Online Status Flow Diagram](./guides/ONLINE_STATUS_FLOW_DIAGRAM.md)

### 🐛 [Fixes](./fixes/)
Bug fixes and issue resolutions.

- [FCM Token Cleanup on Logout](./fixes/FCM_TOKEN_CLEANUP_ON_LOGOUT.md)
- [Continue Button Styling Improvements](./fixes/CONTINUE_BUTTON_STYLING_IMPROVEMENTS.md)
- [Continue Button Keyboard Fix](./fixes/CONTINUE_BUTTON_KEYBOARD_FIX.md)
- [Consent Text Underline Update](./fixes/CONSENT_TEXT_UNDERLINE_UPDATE.md)
- [Collapsible Header Reset Fix](./fixes/COLLAPSIBLE_HEADER_RESET_FIX.md)
- [Switch Clickability Fix](./fixes/SWITCH_CLICKABILITY_FIX.md)
- [Notifee Dependency Fix](./fixes/NOTIFEE_DEPENDENCY_FIX.md)
- [Network Error Auto Logout Fix](./fixes/NETWORK_ERROR_AUTO_LOGOUT_FIX.md)
- [Online Status Moved to Chat List](./fixes/ONLINE_STATUS_MOVED_TO_CHATLIST.md)
- [Online Status RTDB Only](./fixes/ONLINE_STATUS_RTDB_ONLY.md)

### 🌐 [Translations](./translations/)
Internationalization and localization documentation.

- [Farmer Requests Translations](./translations/FARMER_REQUESTS_TRANSLATIONS.md)
- [Translation Updates Complete](./translations/TRANSLATION_UPDATES_COMPLETE.md)
- [Translation Keys Notification](./translations/TRANSLATION_KEYS_NOTIFICATION.md)
- [Translation Keys Added](./translations/TRANSLATION_KEYS_ADDED.md)
- [Requests Translations](./translations/REQUESTS_TRANSLATIONS.md)
- [Privacy Screen Translations](./translations/PRIVACY_SCREEN_TRANSLATIONS.md)

### 📱 [Screenshots](./screenshots/)
App screenshots and visual assets.

- [Screenshot Guide](./screenshots/README.md)
- [Copy Screenshots Helper Script](./screenshots/copy-screenshots.ps1)

### 📋 [Project Documentation](.)
General project documentation.

- [Play Store Listing](./PLAY_STORE_LISTING.md)
- [README Checklist](./README_CHECKLIST.md)

---

## 🔍 Quick Reference

### By Topic

#### Notifications
- [Notification System Guide](./guides/NOTIFICATION_SYSTEM_GUIDE.md)
- [Chat FCM Notification Implementation](./implementations/CHAT_FCM_NOTIFICATION_IMPLEMENTATION.md)
- [Notification Screen Optimizations](./optimizations/NOTIFICATION_SCREEN_OPTIMIZATIONS.md)
- [Notification Action URL Implementation](./implementations/NOTIFICATION_ACTION_URL_IMPLEMENTATION.md)

#### Chat System
- [Chat Notification System](./implementations/CHAT_NOTIFICATION_SYSTEM.md)
- [Chat Detail Optimization](./optimizations/CHATDETAIL_OPTIMIZATION_SUMMARY.md)
- [Online Status Flow Diagram](./guides/ONLINE_STATUS_FLOW_DIAGRAM.md)

#### Haptic Feedback
- [Haptic Quick Start](./guides/HAPTIC_QUICK_START.md)
- [Haptic Cheat Sheet](./guides/HAPTIC_CHEAT_SHEET.md)
- [Haptic Feedback Guide](./guides/HAPTIC_FEEDBACK_GUIDE.md)

#### Keyboard Handling
- [Keyboard Implementation Summary](./implementations/KEYBOARD_IMPLEMENTATION_SUMMARY.md)
- [Keyboard Controller Full Implementation](./implementations/KEYBOARD_CONTROLLER_FULL_IMPLEMENTATION.md)

#### Performance
- [App Optimization Summary](./optimizations/APP_OPTIMIZATION_SUMMARY.md)
- [Render Optimization Fix](./optimizations/RENDER_OPTIMIZATION_FIX.md)

---

## 📝 Documentation Guidelines

When adding new documentation:

1. **Choose the right category:**
   - `features/` - New feature implementations
   - `optimizations/` - Performance improvements
   - `implementations/` - System implementations
   - `guides/` - How-to guides and tutorials
   - `fixes/` - Bug fixes and patches
   - `translations/` - i18n/l10n updates

2. **Use descriptive names:**
   - Format: `FEATURE_NAME_TYPE.md`
   - Example: `PUSH_NOTIFICATIONS_IMPLEMENTATION.md`

3. **Include in this index:**
   - Add entry to appropriate section
   - Update quick reference if relevant
   - Keep alphabetical order within sections

---

**Last Updated:** November 30, 2025

For the main project README, see [../README.md](../README.md)
