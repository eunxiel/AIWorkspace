/* =========================================================
   API — Groq AI calls
   ========================================================= */

function _getConfig() {
  const cfg = window.AIW_CONFIG || {};
  /* localStorage key overrides config.js — useful for deployed/hosted version */
  const key = localStorage.getItem("aiw-groq-key") || cfg.GROQ_API_KEY || "";
  return {
    key,
    model: cfg.GROQ_MODEL    || "llama-3.3-70b-versatile",
    url:   cfg.GROQ_BASE_URL || "https://api.groq.com/openai/v1/chat/completions"
  };
}

/* Save key to localStorage — called from UI */
function setGroqApiKey(key) {
  if (key && key.trim()) {
    localStorage.setItem("aiw-groq-key", key.trim());
    return true;
  }
  return false;
}

function getGroqApiKey() {
  return localStorage.getItem("aiw-groq-key") || (window.AIW_CONFIG || {}).GROQ_API_KEY || "";
}

async function callGemini(messageHistory) {
  const { key, model, url } = _getConfig();

  if (!key) {
    await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
    return _mockResponse(messageHistory[messageHistory.length - 1]?.text || "");
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages: messageHistory.map(m => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.text
        }))
      })
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || `HTTP ${res.status}`;
      console.error("Groq API error:", data);
      return `⚠️ API Error: ${errMsg}`;
    }

    return data?.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
  } catch (err) {
    console.error("Groq fetch error:", err);
    return "⚠️ Network error. Pastikan koneksi internet aktif dan API key valid.";
  }
}

async function translateWithGemini(text, fromLang, toLang) {
  const { key, model, url } = _getConfig();

  if (!key) {
    await new Promise(r => setTimeout(r, 700));
    return `[${toLang}] ${text}\n\n(Demo translation — tambahkan Groq API key untuk hasil nyata.)`;
  }

  try {
    const prompt = `Translate the following text from ${fromLang} to ${toLang}. Return only the translated text, nothing else.\n\nText: ${text}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || `HTTP ${res.status}`;
      return `⚠️ Translation error: ${errMsg}`;
    }

    return data?.choices?.[0]?.message?.content || "Translation failed.";
  } catch (err) {
    console.error("Translation fetch error:", err);
    return "⚠️ Translation error.";
  }
}

async function analyzeImageWithGroq(base64Image, mimeType, userRequest) {
  const { key, url } = _getConfig();

  if (!key) {
    return `${userRequest}, high quality, detailed, 8k`;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            { type: "text", text: `Analyze this image and write a detailed image generation prompt that takes the main subject and applies this transformation: "${userRequest}". Describe: subject, style, lighting, composition, colors. Return ONLY the prompt, max 120 words.` }
          ]
        }]
      })
    });

    const data = await res.json();
    if (!res.ok) { console.error("Groq Vision error:", data); return `${userRequest}, high quality, detailed`; }
    return data?.choices?.[0]?.message?.content?.trim() || `${userRequest}, high quality`;
  } catch (err) {
    console.error("Groq Vision fetch error:", err);
    return `${userRequest}, high quality, detailed`;
  }
}

/* Mock response saat tidak ada API key */
function _mockResponse(prompt) {
  const lower = prompt.toLowerCase();
  if (/hi|hello|hai|halo/.test(lower))
    return "Hi there! 👋 I'm your AI assistant. How can I help you today?";
  if (/who|siapa/.test(lower))
    return "I'm an AI assistant in your AI Workspace — ready to help with notes, docs, slides, translation, and more.";
  if (/help|bantu/.test(lower))
    return "Sure! I can help draft notes, summarize docs, translate text, generate slide outlines, and chat about ideas. What would you like to start with?";
  if (/translate|terjemah/.test(lower))
    return "Open the Translation page and I'll translate text between languages with context.";
  return `Saya dalam mode demo. Untuk jawaban AI nyata, ketik /setkey gsk_xxxx di chat ini. Dapatkan key gratis di console.groq.com 🔑`;
}
