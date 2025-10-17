package com.krushimandi.app

import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.zoontek.rnbootsplash.RNBootSplash

class MainActivity : ReactActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING)
        RNBootSplash.init(this, R.style.BootTheme)
        super.onCreate(savedInstanceState)
    }

    override fun getMainComponentName(): String = "Krushimandi"
}
