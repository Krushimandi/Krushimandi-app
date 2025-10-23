# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Keep Firebase App Check and Play Integrity classes to avoid runtime issues when code is minified
-keep class com.google.firebase.appcheck.** { *; }
-dontwarn com.google.firebase.appcheck.**

# Play Integrity / Play Core
-keep class com.google.android.play.core.integrity.** { *; }
-dontwarn com.google.android.play.core.integrity.**

# Keep RNFirebase app-check native classes (if referenced)
-keep class io.invertase.firebase.appcheck.** { *; }
-dontwarn io.invertase.firebase.appcheck.**
