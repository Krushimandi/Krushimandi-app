package com.myapp

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.zoontek.rnbootsplash.RNBootSplash

class MainActivity : ReactActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        RNBootSplash.init(this, R.style.BootTheme) // Initialize RNBootSplash
        super.onCreate(savedInstanceState)
    }

    override fun getMainComponentName(): String = "MyApp"
}
