package com.podyumplus

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import androidx.appcompat.app.AppCompatActivity

class SplashActivity : AppCompatActivity() {

    private val minimumSplashDuration: Long = 1500 // Minimum gösterim
    private val checkInterval: Long = 100 // Her 100ms kontrol et
    private var handler: Handler? = null
    private var startTime: Long = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.splash_screen)
        
        startTime = System.currentTimeMillis()
        handler = Handler(mainLooper)
        
        // Periyodik kontrol başlat
        startPeriodicCheck()
    }

    private fun startPeriodicCheck() {
        handler?.postDelayed({
            checkConditionsAndProceed()
        }, checkInterval)
    }

    private fun checkConditionsAndProceed() {
        val elapsedTime = System.currentTimeMillis() - startTime
        val prefs = getSharedPreferences("podyumplus_prefs", MODE_PRIVATE)
        val isWebViewReady = prefs.getBoolean("webview_ready", false)
        
        if (elapsedTime >= minimumSplashDuration && isWebViewReady) {
            // WebView hazır ve minimum süre geçti
            proceedToMain()
        } else if (elapsedTime >= 5000) {
            // 5 saniye geçtiyse zorla geç
            proceedToMain()
        } else {
            // Tekrar kontrol et
            startPeriodicCheck()
        }
    }

    private fun proceedToMain() {
        if (!isFinishing) {
            startActivity(Intent(this, MainActivity::class.java))
            finish()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        handler?.removeCallbacksAndMessages(null)
    }
}