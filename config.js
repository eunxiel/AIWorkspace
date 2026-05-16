/* =========================================================
   CONFIG — API KEYS & SETTINGS
   ---------------------------------------------------------
   File ini berisi API key dan konfigurasi.
   JANGAN upload file ini ke GitHub publik atau hosting publik.
   Tambahkan ke .gitignore jika pakai Git.
   ========================================================= */

window.AIW_CONFIG = {
  // ── Groq API ──────────────────────────────────────────
  // Dapatkan di: https://console.groq.com/keys
  GROQ_API_KEY: "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",
  GROQ_MODEL: "llama-3.3-70b-versatile",
  GROQ_BASE_URL: "https://api.groq.com/openai/v1/chat/completions",

  // ── Firebase Auth ──────────────────────────────────────
  // Langkah setup:
  // 1. Buka https://console.firebase.google.com
  // 2. Buat project baru (atau gunakan yang sudah ada)
  // 3. Project Settings → Add App → Web → salin firebaseConfig
  // 4. Authentication → Sign-in method → aktifkan "Google" dan "Phone"
  // 5. Authentication → Settings → Authorized domains → tambahkan domain kamu
  //    (untuk localhost: sudah otomatis; untuk file:// pakai Live Server di VS Code)
  FIREBASE: {
    apiKey:            "AIzaSyB4DOzZdApemvn4D1Hqd2QsEjlH9bVohrk",
    authDomain:        "ai-workspace-64a77.firebaseapp.com",
    projectId:         "ai-workspace-64a77",
    storageBucket:     "ai-workspace-64a77.firebasestorage.app",
    messagingSenderId: "916776540624",
    appId:             "1:916776540624:web:84d7d9d3c5f8eaee4201d5",
    measurementId:     "G-K9L3BPK49Q"
  }
};
