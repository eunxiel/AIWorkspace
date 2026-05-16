/* =========================================================
   CONFIG EXAMPLE — Salin file ini menjadi config.js
   ---------------------------------------------------------
   1. Duplikat file ini → rename jadi config.js
   2. Isi semua nilai di bawah dengan key milikmu
   3. JANGAN upload config.js ke GitHub
   ========================================================= */

window.AIW_CONFIG = {
  // ── Groq API ──────────────────────────────────────────
  // Dapatkan di: https://console.groq.com/keys
  GROQ_API_KEY: "ISI_GROQ_API_KEY_KAMU",
  GROQ_MODEL: "llama-3.3-70b-versatile",
  GROQ_BASE_URL: "https://api.groq.com/openai/v1/chat/completions",

  // ── Firebase Auth ──────────────────────────────────────
  // Langkah setup:
  // 1. Buka https://console.firebase.google.com
  // 2. Buat project baru (atau gunakan yang sudah ada)
  // 3. Project Settings → Add App → Web → salin firebaseConfig
  // 4. Authentication → Sign-in method → aktifkan "Google"
  // 5. Authentication → Settings → Authorized domains → tambahkan domain kamu
  FIREBASE: {
    apiKey:            "ISI_FIREBASE_API_KEY",
    authDomain:        "ISI_FIREBASE_AUTH_DOMAIN",
    projectId:         "ISI_FIREBASE_PROJECT_ID",
    storageBucket:     "ISI_FIREBASE_STORAGE_BUCKET",
    messagingSenderId: "ISI_FIREBASE_MESSAGING_SENDER_ID",
    appId:             "ISI_FIREBASE_APP_ID",
    measurementId:     "ISI_FIREBASE_MEASUREMENT_ID"
  }
};
