/* =========================================================
   API — Groq AI calls
   - Jika user punya key sendiri (localStorage) → langsung ke Groq
   - Jika tidak → pakai proxy Cloudflare Worker (key aman di server)
   ========================================================= */

/* Ganti dengan URL Worker kamu setelah deploy */
const _PROXY_URL = "https://YOUR_WORKER_NAME.workers.dev";

function _getConfig() {
  const stored  = localStorage.getItem("aiw-groq-key") || "";
  const userKey = (stored && stored.startsWith("gsk_")) ? stored : "";

  return {
    key:   userKey,
    model: (window.AIW_CONFIG || {}).GROQ_MODEL || "llama-3.3-70b-versatile",
    url:   userKey
             ? "https://api.groq.com/openai/v1/chat/completions"
             : _PROXY_URL,
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
  return localStorage.getItem("aiw-groq-key") || "";
}

function _authHeader(key) {
  return key ? { "Authorization": `Bearer ${key}` } : {};
}

async function callGemini(messageHistory) {
  const { key, model, url } = _getConfig();

  if (!key && url === _PROXY_URL && _PROXY_URL.includes("YOUR_WORKER")) {
    await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
    return _mockResponse(messageHistory[messageHistory.length - 1]?.text || "");
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ..._authHeader(key) },
      body: JSON.stringify({
        model,
        messages: messageHistory.map(m => ({
          role:    m.role === "user" ? "user" : "assistant",
          content: m.text
        }))
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Groq API error:", data);
      return `⚠️ API Error: ${data?.error?.message || `HTTP ${res.status}`}`;
    }
    return data?.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
  } catch (err) {
    console.error("Groq fetch error:", err);
    return "⚠️ Network error. Pastikan koneksi internet aktif.";
  }
}

async function translateWithGemini(text, fromLang, toLang) {
  const { key, model, url } = _getConfig();

  if (!key && url === _PROXY_URL && _PROXY_URL.includes("YOUR_WORKER")) {
    await new Promise(r => setTimeout(r, 700));
    return `[${toLang}] ${text}\n\n(Demo — proxy belum dikonfigurasi.)`;
  }

  try {
    const prompt = `Translate the following text from ${fromLang} to ${toLang}. Return only the translated text, nothing else.\n\nText: ${text}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ..._authHeader(key) },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] })
    });

    const data = await res.json();
    if (!res.ok) return `⚠️ Translation error: ${data?.error?.message || `HTTP ${res.status}`}`;
    return data?.choices?.[0]?.message?.content || "Translation failed.";
  } catch (err) {
    console.error("Translation fetch error:", err);
    return "⚠️ Translation error.";
  }
}

async function analyzeImageWithGroq(base64Image, mimeType, userRequest) {
  const { key, url } = _getConfig();

  /* Vision hanya bisa lewat Groq langsung (butuh key), proxy tidak support multipart */
  const visionUrl = "https://api.groq.com/openai/v1/chat/completions";
  const visionKey = key || (window.AIW_CONFIG || {}).GROQ_API_KEY || "";

  if (!visionKey) return `${userRequest}, high quality, detailed, 8k`;

  try {
    const res = await fetch(visionUrl, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${visionKey}`,
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

/* Mock response saat proxy belum dikonfigurasi */
function _mockResponse(prompt) {
  const lower = prompt.toLowerCase();
  if (/hi|hello|hai|halo/.test(lower))
    return "Hi there! 👋 I'm your AI assistant. How can I help you today?";
  if (/who|siapa/.test(lower))
    return "I'm an AI assistant in your AI Workspace — ready to help with notes, docs, slides, translation, and more.";
  if (/help|bantu/.test(lower))
    return "Sure! I can help draft notes, summarize docs, translate text, generate slide outlines, and chat about ideas.";
  return "Saya dalam mode demo. Proxy belum dikonfigurasi — deploy worker.js ke Cloudflare untuk mengaktifkan AI.";
}
