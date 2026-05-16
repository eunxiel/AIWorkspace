/* =========================================================
   AI WORKSPACE — Vanilla JS
   Navigation, theme toggle, chat (Gemini-ready), translation
   ========================================================= */

/* ---------- HELPERS ---------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* =========================================================
   1. PAGE NAVIGATION
   ========================================================= */
function showPage(pageId) {
  $$(".page").forEach(p => p.classList.remove("active"));
  const target = $(`#page-${pageId}`);
  if (target) target.classList.add("active");

  // sync sidebar
  $$(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.page === pageId));
  // sync bottom nav
  $$(".bn-item").forEach(n => n.classList.toggle("active", n.dataset.page === pageId));

  // close mobile sidebar
  $("#sidebar")?.classList.remove("open");
  $("#sidebarOverlay")?.classList.remove("show");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Attach navigation to all elements with [data-page]
document.addEventListener("click", (e) => {
  const target = e.target.closest("[data-page]");
  if (target) {
    e.preventDefault();
    showPage(target.dataset.page);
  }
});

/* =========================================================
   2. SIDEBAR (mobile)
   ========================================================= */
$("#menuBtn")?.addEventListener("click", () => {
  $("#sidebar").classList.add("open");
  $("#sidebarOverlay").classList.add("show");
});

/* Mobile topbar user button — open sidebar (user card + login are there) */
$("#topbarUserBtn")?.addEventListener("click", () => {
  $("#sidebar").classList.add("open");
  $("#sidebarOverlay").classList.add("show");
});
$("#sidebarClose")?.addEventListener("click", () => {
  $("#sidebar").classList.remove("open");
  $("#sidebarOverlay").classList.remove("show");
});
$("#sidebarOverlay")?.addEventListener("click", () => {
  $("#sidebar").classList.remove("open");
  $("#sidebarOverlay").classList.remove("show");
});

/* =========================================================
   3. THEME TOGGLE
   ========================================================= */
const themeBtn = $("#themeToggle");
const savedTheme = localStorage.getItem("aiw-theme") || "light";
if (savedTheme === "dark") document.documentElement.setAttribute("data-theme", "dark");
themeBtn?.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("aiw-theme", "light");
    themeBtn.textContent = "🌙";
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("aiw-theme", "dark");
    themeBtn.textContent = "☀️";
  }
});
if (savedTheme === "dark") themeBtn.textContent = "☀️";

/* =========================================================
   4. AI CHAT (Gemini-ready, with mock fallback)
   ========================================================= */
const chatWindow = $("#chatWindow");
const chatInput  = $("#chatInput");
const sendBtn    = $("#sendBtn");

const messageHistory = [];

function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return div;
}

function appendTypingIndicator() {
  const div = document.createElement("div");
  div.className = "msg ai";
  div.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span>`;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return div;
}

/* Typing animation: types text character-by-character */
async function typeText(element, text, speed = 18) {
  element.textContent = "";
  for (let i = 0; i < text.length; i++) {
    element.textContent += text[i];
    chatWindow.scrollTop = chatWindow.scrollHeight;
    await new Promise(r => setTimeout(r, speed));
  }
}

/* Show API key setup card inside chat window */
function _showApiKeyPrompt() {
  if ($("#apiKeyCard")) return; // already shown
  const card = document.createElement("div");
  card.id = "apiKeyCard";
  card.className = "msg ai api-key-card";
  card.innerHTML = `
    <div class="ak-title">🔑 Groq API Key diperlukan</div>
    <div class="ak-sub">Masukkan API key kamu untuk mengaktifkan AI chat.<br>Dapatkan gratis di <b>console.groq.com</b></div>
    <div class="ak-row">
      <input class="ak-input" id="akInput" type="password" placeholder="gsk_..." autocomplete="off" />
      <button class="ak-btn" id="akSaveBtn">Simpan</button>
    </div>
    <div class="ak-hint" id="akHint"></div>
  `;
  chatWindow.appendChild(card);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  $("#akSaveBtn")?.addEventListener("click", _saveKeyFromCard);
  $("#akInput")?.addEventListener("keydown", (e) => { if (e.key === "Enter") _saveKeyFromCard(); });
}

function _saveKeyFromCard() {
  const val = $("#akInput")?.value?.trim();
  if (!val || !val.startsWith("gsk_")) {
    const hint = $("#akHint");
    if (hint) { hint.textContent = "⚠️ Key harus diawali dengan gsk_"; hint.style.color = "#ef4444"; }
    return;
  }
  setGroqApiKey(val);
  const card = $("#apiKeyCard");
  if (card) card.remove();
  appendMessage("ai", "✅ API key berhasil disimpan! Sekarang kamu bisa mulai chat.");
}

async function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;

  /* /setkey command */
  if (text.startsWith("/setkey ")) {
    const key = text.slice(8).trim();
    chatInput.value = "";
    if (setGroqApiKey(key)) {
      appendMessage("user", "/setkey ••••••••");
      appendMessage("ai", "✅ API key berhasil disimpan!");
    } else {
      appendMessage("ai", "⚠️ Key tidak valid. Contoh: /setkey gsk_xxxx");
    }
    return;
  }

  /* Block send if no key — show setup card instead */
  if (!getGroqApiKey()) {
    _showApiKeyPrompt();
    return;
  }

  chatInput.value = "";
  sendBtn.disabled = true;

  appendMessage("user", text);
  messageHistory.push({ role: "user", text });

  const indicator = appendTypingIndicator();
  try {
    const response = await callGemini(messageHistory);
    indicator.remove();
    const aiBubble = appendMessage("ai", "");
    await typeText(aiBubble, response);
    messageHistory.push({ role: "model", text: response });
  } catch (err) {
    indicator.remove();
    appendMessage("ai", "⚠️ Terjadi kesalahan tak terduga. Cek console untuk detail.");
    console.error("sendChat error:", err);
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn?.addEventListener("click", sendChat);
chatInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
});

/* =========================================================
   5. TRANSLATION (mock, Gemini-ready)
   ========================================================= */
const translateBtn = $("#translateBtn");
const srcText = $("#srcText");
const dstText = $("#dstText");
const srcLang = $("#srcLang");
const dstLang = $("#dstLang");
const swapLang = $("#swapLang");

swapLang?.addEventListener("click", () => {
  const tmp = srcLang.value;
  srcLang.value = dstLang.value;
  dstLang.value = tmp;
  const tmpT = srcText.value;
  srcText.value = dstText.value;
  dstText.value = tmpT;
});

async function translateText() {
  const text = srcText.value.trim();
  if (!text) return;
  dstText.value = "Translating...";
  dstText.value = await translateWithGemini(text, srcLang.value, dstLang.value);
}
translateBtn?.addEventListener("click", translateText);

/* =========================================================
   6. PROMPT CARD ON HOME → goes to chat
   ========================================================= */
const promptInput = $(".prompt-card input");
const promptBtn   = $(".prompt-card .send-btn");

function _sendPromptToChat() {
  const val = promptInput?.value.trim();
  promptInput.value = "";
  showPage("chat");
  if (val) {
    setTimeout(() => {
      chatInput.value = val;
      sendChat();
    }, 250);
  }
}

promptBtn?.addEventListener("click", (e) => {
  e.stopPropagation(); // prevent generic [data-page] navigation
  _sendPromptToChat();
});

promptInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") _sendPromptToChat();
});

/* =========================================================
   7. AI IMAGE
   ========================================================= */
const uploadZone        = $("#uploadZone");
const imageInput        = $("#imageInput");
const uploadPlaceholder = $("#uploadPlaceholder");
const sourcePreview     = $("#sourcePreview");
const changeImageBtn    = $("#changeImageBtn");
const resultPlaceholder = $("#resultPlaceholder");
const resultLoading     = $("#resultLoading");
const resultPreview     = $("#resultPreview");
const downloadBtn       = $("#downloadBtn");
const imagePrompt       = $("#imagePrompt");
const transformBtn      = $("#transformBtn");

let _imgBase64 = null, _imgMime = null;

/* Compress image to max 1024px before sending to Vision API */
function _compressToDataURL(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function _loadImage(file) {
  if (!file || !file.type.startsWith("image/")) return;
  _compressToDataURL(file).then(dataUrl => {
    const [meta, b64] = dataUrl.split(",");
    _imgBase64 = b64;
    _imgMime   = meta.match(/:(.*?);/)[1];
    sourcePreview.src = dataUrl;
    sourcePreview.style.display = "block";
    uploadPlaceholder.style.display = "none";
    changeImageBtn.style.display = "inline-block";
    uploadZone.style.borderColor = "";
  });
}

uploadZone?.addEventListener("click",     () => imageInput?.click());
changeImageBtn?.addEventListener("click", () => imageInput?.click());
imageInput?.addEventListener("change",    () => _loadImage(imageInput.files?.[0]));
uploadZone?.addEventListener("dragover",  e => { e.preventDefault(); uploadZone.style.borderColor = "var(--primary)"; });
uploadZone?.addEventListener("dragleave", () => { uploadZone.style.borderColor = ""; });
uploadZone?.addEventListener("drop",      e => { e.preventDefault(); _loadImage(e.dataTransfer?.files?.[0]); });

/* Preset chips */
$$(".preset-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    $$(".preset-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    imagePrompt.value = chip.dataset.prompt || chip.textContent.replace(/^\S+\s/, "");
  });
});

/* Transform button */
transformBtn?.addEventListener("click", async () => {
  if (!_imgBase64) {
    uploadZone.style.borderColor = "rgba(239,68,68,0.6)";
    setTimeout(() => uploadZone.style.borderColor = "", 1500);
    return;
  }
  const prompt = imagePrompt.value.trim() || "enhance and improve this image, high quality";

  resultPlaceholder.style.display = "none";
  resultPreview.style.display = "none";
  downloadBtn.style.display = "none";
  resultLoading.style.display = "flex";
  transformBtn.disabled = true;
  transformBtn.textContent = "Generating…";

  /* Step 1: Groq Vision → enhanced prompt */
  const enhancedPrompt = await analyzeImageWithGroq(_imgBase64, _imgMime, prompt);

  /* Step 2: Pollinations.ai generates the image (free, no API key needed) */
  const seed = Math.floor(Math.random() * 9_999_999);
  const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=768&height=768&nologo=true&seed=${seed}`;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    resultPreview.src = imgUrl;
    resultPreview.style.display = "block";
    resultLoading.style.display = "none";
    downloadBtn.style.display = "inline-block";
    downloadBtn._url = imgUrl;
    transformBtn.disabled = false;
    transformBtn.textContent = "Transform ✨";
  };
  img.onerror = () => {
    resultLoading.style.display = "none";
    resultPlaceholder.style.display = "flex";
    resultPlaceholder.querySelector(".zone-label").textContent = "Generation failed — try again";
    transformBtn.disabled = false;
    transformBtn.textContent = "Transform ✨";
  };
  img.src = imgUrl;
});

/* Download via blob (handles cross-origin) */
downloadBtn?.addEventListener("click", async () => {
  const url = downloadBtn._url || resultPreview.src;
  try {
    const blob = await fetch(url).then(r => r.blob());
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ai-image-${Date.now()}.jpg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  } catch {
    window.open(url, "_blank");
  }
});

/* =========================================================
   8. HELPERS
   ========================================================= */
function escHtml(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function todayStr() {
  return new Date().toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"});
}

/* =========================================================
   8b. LANGUAGE SWITCHER
   ========================================================= */
let _lang = localStorage.getItem("aiw-lang") || "en";

const TRANSLATIONS = {
  en: {
    lang_label:"🌐 EN",
    nav_home:"Home", nav_chat:"AI Chat", nav_image:"AI Image", nav_notes:"AI Notes",
    nav_trans:"Translation", nav_slides:"AI Slides", nav_docs:"AI Docs",
    search_ph:"Search anything...",
    home_title:"Welcome to AI Workspace", home_sub:"Your all-in-one intelligent productivity hub",
    chat_hero:"Hi there, what can I help with?", chat_ph:"Ask anything, create anything...",
    chip1:"📝 AI Notes", chip2:"🎞️ AI Slides", chip3:"📊 AI Sheets",
    chip4:"📄 AI Docs", chip5:"💬 AI Chat", chip6:"🌐 Translation",
    prompt_ph:"What are your thoughts for today?",
    notes_title:"AI Notes", notes_sub:"Your intelligent note collection", new_note:"New Note",
    trans_title:"AI Translation", trans_sub:"Translate instantly with context", translate_btn:"Translate",
    slides_title:"AI Slides", slides_sub:"Generate beautiful decks in seconds",
    slides_ph:"Describe your presentation topic...", generate_btn:"Generate",
    docs_title:"AI Docs", docs_sub:"Create, upload, and edit documents with AI",
    upload_file:"📁 Upload File", new_doc:"+ New Doc",
    image_title:"AI Image", image_sub:"Upload a photo and transform it with AI",
    image_ph:"Describe the transformation... e.g. anime style, oil painting, cyberpunk",
    transform_btn:"Transform ✨",
    upgrade_title:"Upgrade to Pro", upgrade_sub:"Unlock unlimited AI",
    save:"Save", back_docs:"← Docs", export_txt:"⬇ .txt",
    ai_summarize:"✨ Summarize", ai_improve:"🔧 Improve", ai_expand:"📝 Expand",
    ai_translate:"🌐 Translate…",
    modal_new_note:"New Note", note_title_ph:"Note title...",
    note_body_ph:"Write your note here...", save_note:"Save Note", cancel:"Cancel",
    original:"Original", result:"Result",
    click_upload:"Click or drag image here", upload_sub:"PNG · JPG · WEBP · max 10 MB",
    result_here:"Result appears here", generating:"Generating image…",
    change_img:"↩ Change Image", download:"⬇ Download",
  },
  id: {
    lang_label:"🌐 ID",
    nav_home:"Beranda", nav_chat:"AI Chat", nav_image:"AI Gambar", nav_notes:"AI Catatan",
    nav_trans:"Terjemahan", nav_slides:"AI Slide", nav_docs:"AI Dokumen",
    search_ph:"Cari apa saja...",
    home_title:"Selamat Datang di AI Workspace", home_sub:"Pusat produktivitas cerdas semua dalam satu",
    chat_hero:"Halo! Ada yang bisa saya bantu?", chat_ph:"Tanyakan apa saja, buat apa saja...",
    chip1:"📝 AI Catatan", chip2:"🎞️ AI Slide", chip3:"📊 AI Sheet",
    chip4:"📄 AI Dokumen", chip5:"💬 AI Chat", chip6:"🌐 Terjemahan",
    prompt_ph:"Apa yang ada di pikiranmu hari ini?",
    notes_title:"AI Catatan", notes_sub:"Koleksi catatan cerdasmu", new_note:"Catatan Baru",
    trans_title:"Terjemahan AI", trans_sub:"Terjemahkan dengan konteks secara instan", translate_btn:"Terjemahkan",
    slides_title:"AI Slide", slides_sub:"Buat presentasi indah dalam hitungan detik",
    slides_ph:"Jelaskan topik presentasimu...", generate_btn:"Buat",
    docs_title:"AI Dokumen", docs_sub:"Buat, upload, dan edit dokumen dengan AI",
    upload_file:"📁 Upload File", new_doc:"+ Dokumen Baru",
    image_title:"AI Gambar", image_sub:"Upload foto dan transformasikan dengan AI",
    image_ph:"Jelaskan transformasi yang diinginkan...", transform_btn:"Transformasi ✨",
    upgrade_title:"Upgrade ke Pro", upgrade_sub:"Buka AI tanpa batas",
    save:"Simpan", back_docs:"← Dokumen", export_txt:"⬇ .txt",
    ai_summarize:"✨ Ringkas", ai_improve:"🔧 Perbaiki", ai_expand:"📝 Kembangkan",
    ai_translate:"🌐 Terjemahkan…",
    modal_new_note:"Catatan Baru", note_title_ph:"Judul catatan...",
    note_body_ph:"Tulis catatanmu di sini...", save_note:"Simpan Catatan", cancel:"Batal",
    original:"Asli", result:"Hasil",
    click_upload:"Klik atau seret gambar ke sini", upload_sub:"PNG · JPG · WEBP · maks 10 MB",
    result_here:"Hasil muncul di sini", generating:"Membuat gambar…",
    change_img:"↩ Ganti Gambar", download:"⬇ Unduh",
  },
  th: {
    lang_label:"🌐 TH",
    nav_home:"หน้าแรก", nav_chat:"AI แชท", nav_image:"AI รูปภาพ", nav_notes:"AI บันทึก",
    nav_trans:"แปลภาษา", nav_slides:"AI สไลด์", nav_docs:"AI เอกสาร",
    search_ph:"ค้นหาอะไรก็ได้...",
    home_title:"ยินดีต้อนรับสู่ AI Workspace", home_sub:"ศูนย์กลางผลิตภาพอัจฉริยะครบวงจร",
    chat_hero:"สวัสดี! ฉันช่วยอะไรได้บ้าง?", chat_ph:"ถามอะไรก็ได้ สร้างอะไรก็ได้...",
    chip1:"📝 AI บันทึก", chip2:"🎞️ AI สไลด์", chip3:"📊 AI ชีต",
    chip4:"📄 AI เอกสาร", chip5:"💬 AI แชท", chip6:"🌐 แปลภาษา",
    prompt_ph:"คุณคิดอะไรอยู่วันนี้?",
    notes_title:"AI บันทึก", notes_sub:"คอลเลกชันบันทึกอัจฉริยะของคุณ", new_note:"บันทึกใหม่",
    trans_title:"AI แปลภาษา", trans_sub:"แปลทันทีพร้อมบริบท", translate_btn:"แปล",
    slides_title:"AI สไลด์", slides_sub:"สร้างงานนำเสนอสวยงามในไม่กี่วินาที",
    slides_ph:"อธิบายหัวข้อการนำเสนอของคุณ...", generate_btn:"สร้าง",
    docs_title:"AI เอกสาร", docs_sub:"สร้าง อัปโหลด และแก้ไขเอกสารด้วย AI",
    upload_file:"📁 อัปโหลดไฟล์", new_doc:"+ เอกสารใหม่",
    image_title:"AI รูปภาพ", image_sub:"อัปโหลดรูปภาพและแปลงด้วย AI",
    image_ph:"อธิบายการแปลงที่ต้องการ...", transform_btn:"แปลง ✨",
    upgrade_title:"อัปเกรดเป็น Pro", upgrade_sub:"ปลดล็อค AI ไม่จำกัด",
    save:"บันทึก", back_docs:"← เอกสาร", export_txt:"⬇ .txt",
    ai_summarize:"✨ สรุป", ai_improve:"🔧 ปรับปรุง", ai_expand:"📝 ขยาย",
    ai_translate:"🌐 แปล…",
    modal_new_note:"บันทึกใหม่", note_title_ph:"ชื่อบันทึก...",
    note_body_ph:"เขียนบันทึกของคุณที่นี่...", save_note:"บันทึก", cancel:"ยกเลิก",
    original:"ต้นฉบับ", result:"ผลลัพธ์",
    click_upload:"คลิกหรือลากรูปภาพมาที่นี่", upload_sub:"PNG · JPG · WEBP · สูงสุด 10 MB",
    result_here:"ผลลัพธ์จะปรากฏที่นี่", generating:"กำลังสร้างรูปภาพ…",
    change_img:"↩ เปลี่ยนรูปภาพ", download:"⬇ ดาวน์โหลด",
  },
  zh: {
    lang_label:"🌐 ZH",
    nav_home:"首页", nav_chat:"AI聊天", nav_image:"AI图像", nav_notes:"AI笔记",
    nav_trans:"翻译", nav_slides:"AI幻灯片", nav_docs:"AI文档",
    search_ph:"搜索任何内容...",
    home_title:"欢迎使用 AI Workspace", home_sub:"您的一体化智能生产力中心",
    chat_hero:"你好！我能帮你什么？", chat_ph:"问任何问题，创作任何内容...",
    chip1:"📝 AI笔记", chip2:"🎞️ AI幻灯片", chip3:"📊 AI表格",
    chip4:"📄 AI文档", chip5:"💬 AI聊天", chip6:"🌐 翻译",
    prompt_ph:"今天有什么想法？",
    notes_title:"AI笔记", notes_sub:"您的智能笔记集合", new_note:"新建笔记",
    trans_title:"AI翻译", trans_sub:"即时翻译，带上下文", translate_btn:"翻译",
    slides_title:"AI幻灯片", slides_sub:"几秒内生成精美演示文稿",
    slides_ph:"描述您的演示主题...", generate_btn:"生成",
    docs_title:"AI文档", docs_sub:"使用AI创建、上传和编辑文档",
    upload_file:"📁 上传文件", new_doc:"+ 新建文档",
    image_title:"AI图像", image_sub:"上传照片并用AI转换",
    image_ph:"描述您想要的转换效果...", transform_btn:"转换 ✨",
    upgrade_title:"升级到专业版", upgrade_sub:"解锁无限AI",
    save:"保存", back_docs:"← 文档", export_txt:"⬇ .txt",
    ai_summarize:"✨ 总结", ai_improve:"🔧 改进", ai_expand:"📝 展开",
    ai_translate:"🌐 翻译…",
    modal_new_note:"新建笔记", note_title_ph:"笔记标题...",
    note_body_ph:"在此写下您的笔记...", save_note:"保存笔记", cancel:"取消",
    original:"原图", result:"结果",
    click_upload:"点击或拖拽图片到此处", upload_sub:"PNG · JPG · WEBP · 最大 10 MB",
    result_here:"结果将在此显示", generating:"正在生成图片…",
    change_img:"↩ 更换图片", download:"⬇ 下载",
  },
  ja: {
    lang_label:"🌐 JA",
    nav_home:"ホーム", nav_chat:"AIチャット", nav_image:"AI画像", nav_notes:"AIノート",
    nav_trans:"翻訳", nav_slides:"AIスライド", nav_docs:"AI文書",
    search_ph:"何でも検索...",
    home_title:"AI Workspaceへようこそ", home_sub:"オールインワンのインテリジェントな生産性ハブ",
    chat_hero:"こんにちは！何かお手伝いできますか？", chat_ph:"何でも聞いて、何でも作って...",
    chip1:"📝 AIノート", chip2:"🎞️ AIスライド", chip3:"📊 AIシート",
    chip4:"📄 AI文書", chip5:"💬 AIチャット", chip6:"🌐 翻訳",
    prompt_ph:"今日は何を考えていますか？",
    notes_title:"AIノート", notes_sub:"あなたのインテリジェントなノートコレクション", new_note:"新しいノート",
    trans_title:"AI翻訳", trans_sub:"文脈を考慮した即時翻訳", translate_btn:"翻訳",
    slides_title:"AIスライド", slides_sub:"数秒で美しいデッキを生成",
    slides_ph:"プレゼンテーションのトピックを説明...", generate_btn:"生成",
    docs_title:"AI文書", docs_sub:"AIを使って文書を作成・アップロード・編集",
    upload_file:"📁 ファイルアップロード", new_doc:"+ 新しい文書",
    image_title:"AI画像", image_sub:"写真をアップロードしてAIで変換",
    image_ph:"変換内容を説明...", transform_btn:"変換 ✨",
    upgrade_title:"Proにアップグレード", upgrade_sub:"無制限AIをアンロック",
    save:"保存", back_docs:"← 文書", export_txt:"⬇ .txt",
    ai_summarize:"✨ 要約", ai_improve:"🔧 改善", ai_expand:"📝 拡張",
    ai_translate:"🌐 翻訳…",
    modal_new_note:"新しいノート", note_title_ph:"ノートのタイトル...",
    note_body_ph:"ここにノートを書いてください...", save_note:"ノートを保存", cancel:"キャンセル",
    original:"元の画像", result:"結果",
    click_upload:"クリックまたは画像をドラッグ", upload_sub:"PNG · JPG · WEBP · 最大 10 MB",
    result_here:"結果はここに表示されます", generating:"画像を生成中…",
    change_img:"↩ 画像を変更", download:"⬇ ダウンロード",
  },
  ko: {
    lang_label:"🌐 KO",
    nav_home:"홈", nav_chat:"AI 채팅", nav_image:"AI 이미지", nav_notes:"AI 노트",
    nav_trans:"번역", nav_slides:"AI 슬라이드", nav_docs:"AI 문서",
    search_ph:"무엇이든 검색...",
    home_title:"AI Workspace에 오신 것을 환영합니다", home_sub:"올인원 지능형 생산성 허브",
    chat_hero:"안녕하세요! 무엇을 도와드릴까요?", chat_ph:"무엇이든 물어보고, 만들어보세요...",
    chip1:"📝 AI 노트", chip2:"🎞️ AI 슬라이드", chip3:"📊 AI 시트",
    chip4:"📄 AI 문서", chip5:"💬 AI 채팅", chip6:"🌐 번역",
    prompt_ph:"오늘 어떤 생각이 있으신가요?",
    notes_title:"AI 노트", notes_sub:"당신의 지능형 노트 컬렉션", new_note:"새 노트",
    trans_title:"AI 번역", trans_sub:"문맥과 함께 즉시 번역", translate_btn:"번역",
    slides_title:"AI 슬라이드", slides_sub:"몇 초 만에 아름다운 데크 생성",
    slides_ph:"프레젠테이션 주제를 설명하세요...", generate_btn:"생성",
    docs_title:"AI 문서", docs_sub:"AI로 문서 생성, 업로드 및 편집",
    upload_file:"📁 파일 업로드", new_doc:"+ 새 문서",
    image_title:"AI 이미지", image_sub:"사진을 업로드하고 AI로 변환",
    image_ph:"원하는 변환을 설명하세요...", transform_btn:"변환 ✨",
    upgrade_title:"Pro로 업그레이드", upgrade_sub:"무제한 AI 잠금 해제",
    save:"저장", back_docs:"← 문서", export_txt:"⬇ .txt",
    ai_summarize:"✨ 요약", ai_improve:"🔧 개선", ai_expand:"📝 확장",
    ai_translate:"🌐 번역…",
    modal_new_note:"새 노트", note_title_ph:"노트 제목...",
    note_body_ph:"여기에 노트를 작성하세요...", save_note:"노트 저장", cancel:"취소",
    original:"원본", result:"결과",
    click_upload:"클릭하거나 이미지를 드래그하세요", upload_sub:"PNG · JPG · WEBP · 최대 10 MB",
    result_here:"결과가 여기에 표시됩니다", generating:"이미지 생성 중…",
    change_img:"↩ 이미지 변경", download:"⬇ 다운로드",
  },
  vi: {
    lang_label:"🌐 VI",
    nav_home:"Trang chủ", nav_chat:"AI Chat", nav_image:"AI Hình ảnh", nav_notes:"AI Ghi chú",
    nav_trans:"Dịch thuật", nav_slides:"AI Slides", nav_docs:"AI Tài liệu",
    search_ph:"Tìm kiếm bất cứ điều gì...",
    home_title:"Chào mừng đến với AI Workspace", home_sub:"Trung tâm năng suất thông minh tất cả trong một",
    chat_hero:"Xin chào! Tôi có thể giúp gì cho bạn?", chat_ph:"Hỏi bất cứ điều gì, tạo bất cứ điều gì...",
    chip1:"📝 AI Ghi chú", chip2:"🎞️ AI Slides", chip3:"📊 AI Bảng tính",
    chip4:"📄 AI Tài liệu", chip5:"💬 AI Chat", chip6:"🌐 Dịch thuật",
    prompt_ph:"Bạn đang nghĩ gì hôm nay?",
    notes_title:"AI Ghi chú", notes_sub:"Bộ sưu tập ghi chú thông minh của bạn", new_note:"Ghi chú mới",
    trans_title:"AI Dịch thuật", trans_sub:"Dịch ngay lập tức với ngữ cảnh", translate_btn:"Dịch",
    slides_title:"AI Slides", slides_sub:"Tạo bài thuyết trình đẹp trong vài giây",
    slides_ph:"Mô tả chủ đề thuyết trình...", generate_btn:"Tạo",
    docs_title:"AI Tài liệu", docs_sub:"Tạo, tải lên và chỉnh sửa tài liệu với AI",
    upload_file:"📁 Tải file lên", new_doc:"+ Tài liệu mới",
    image_title:"AI Hình ảnh", image_sub:"Tải ảnh lên và biến đổi với AI",
    image_ph:"Mô tả sự biến đổi mong muốn...", transform_btn:"Biến đổi ✨",
    upgrade_title:"Nâng cấp lên Pro", upgrade_sub:"Mở khóa AI không giới hạn",
    save:"Lưu", back_docs:"← Tài liệu", export_txt:"⬇ .txt",
    ai_summarize:"✨ Tóm tắt", ai_improve:"🔧 Cải thiện", ai_expand:"📝 Mở rộng",
    ai_translate:"🌐 Dịch…",
    modal_new_note:"Ghi chú mới", note_title_ph:"Tiêu đề ghi chú...",
    note_body_ph:"Viết ghi chú của bạn ở đây...", save_note:"Lưu ghi chú", cancel:"Hủy",
    original:"Bản gốc", result:"Kết quả",
    click_upload:"Nhấp hoặc kéo hình ảnh vào đây", upload_sub:"PNG · JPG · WEBP · tối đa 10 MB",
    result_here:"Kết quả xuất hiện ở đây", generating:"Đang tạo hình ảnh…",
    change_img:"↩ Thay ảnh", download:"⬇ Tải xuống",
  }
};

function _t(key) {
  return (TRANSLATIONS[_lang] || TRANSLATIONS.en)[key] ?? TRANSLATIONS.en[key] ?? key;
}

function applyLang(code) {
  _lang = code;
  localStorage.setItem("aiw-lang", code);

  const set   = (sel, key)  => { const e = document.querySelector(sel); if (e) e.textContent = _t(key); };
  const setPh = (sel, key)  => { const e = document.querySelector(sel); if (e) e.placeholder  = _t(key); };
  const setAll = (sel, key) => { document.querySelectorAll(sel).forEach(e => e.textContent = _t(key)); };

  // Topbar lang button
  set("#langBtn", "lang_label");
  $$(".lang-option").forEach(o => o.classList.toggle("active", o.dataset.lang === code));

  // Sidebar nav labels
  const navLabels = [".nav-item:nth-child(1) span:last-child",".nav-item:nth-child(2) span:last-child",
    ".nav-item:nth-child(3) span:last-child",".nav-item:nth-child(4) span:last-child",
    ".nav-item:nth-child(5) span:last-child",".nav-item:nth-child(6) span:last-child",
    ".nav-item:nth-child(7) span:last-child"];
  const navKeys = ["nav_home","nav_chat","nav_image","nav_notes","nav_trans","nav_slides","nav_docs"];
  navLabels.forEach((sel, i) => set(sel, navKeys[i]));

  // Search
  setPh(".search-input", "search_ph");

  // Home page
  set(".hero-title", "home_title"); set(".hero-sub", "home_sub");
  setPh(".prompt-card input", "prompt_ph");

  // Chat
  set(".chat-hero h2", "chat_hero"); setPh("#chatInput", "chat_ph");
  const chips = document.querySelectorAll(".chat-suggestions .chip");
  ["chip1","chip2","chip3","chip4","chip5","chip6"].forEach((k, i) => { if(chips[i]) chips[i].textContent = _t(k); });

  // Notes
  set("#page-notes h2", "notes_title"); set("#page-notes .muted", "notes_sub");

  // Translation
  set("#page-translation h2", "trans_title"); set("#page-translation .muted", "trans_sub");
  set("#translateBtn", "translate_btn");

  // Slides
  set("#page-slides h2", "slides_title"); set("#page-slides .muted", "slides_sub");
  setPh(".slides-prompt input", "slides_ph"); set(".slides-prompt .primary-btn", "generate_btn");

  // Docs list view
  set("#docsListView h2", "docs_title"); set("#docsListView .muted", "docs_sub");
  set("#newDocBtn", "new_doc");
  const uploadLabel = document.querySelector("label.upload-file-btn");
  if (uploadLabel) uploadLabel.childNodes[0].textContent = _t("upload_file");

  // Docs editor
  set("#editorBackBtn", "back_docs"); set("#exportTxtBtn", "export_txt");
  set("#saveEditorBtn", "save");
  set("#aiSummarizeBtn", "ai_summarize"); set("#aiImproveBtn", "ai_improve");
  set("#aiExpandBtn", "ai_expand");
  const aiTransOpt = document.querySelector("#aiTranslateSelect option[value='']");
  if (aiTransOpt) aiTransOpt.textContent = _t("ai_translate");

  // AI Image
  set("#page-files h2", "image_title"); set("#page-files .muted", "image_sub");
  setPh("#imagePrompt", "image_ph"); set("#transformBtn", "transform_btn");
  set("#changeImageBtn", "change_img"); set("#downloadBtn", "download");
  const uploadPlaceholderLabel = document.querySelector("#uploadPlaceholder .zone-label");
  const uploadPlaceholderSub   = document.querySelector("#uploadPlaceholder .zone-sub");
  const resultPlaceholderLabel = document.querySelector("#resultPlaceholder .zone-label");
  if (uploadPlaceholderLabel) uploadPlaceholderLabel.textContent = _t("click_upload");
  if (uploadPlaceholderSub)   uploadPlaceholderSub.textContent   = _t("upload_sub");
  if (resultPlaceholderLabel) resultPlaceholderLabel.textContent = _t("result_here");
  set("#resultLoading span", "generating");
  set(".img-panel:first-child .panel-label", "original");
  set(".img-panel:last-child .panel-label",  "result");

  // Notes modal
  set("#noteModal h3", "modal_new_note");
  setPh("#noteTitle", "note_title_ph"); setPh("#noteBody", "note_body_ph");
  set("#saveNoteBtn", "save_note");
  setAll(".modal-cancel", "cancel");

  // Re-render dynamic elements so "new note / new doc" text updates
  renderNotes(); renderDocs();
}

/* Lang switcher toggle */
const langBtn      = $("#langBtn");
const langDropdown = $("#langDropdown");

langBtn?.addEventListener("click", e => {
  e.stopPropagation();
  langDropdown.classList.toggle("show");
});
document.addEventListener("click", e => {
  if (!e.target.closest("#langSwitcher")) langDropdown?.classList.remove("show");
});
$$(".lang-option").forEach(opt => {
  opt.addEventListener("click", () => {
    applyLang(opt.dataset.lang);
    langDropdown.classList.remove("show");
  });
});

/* =========================================================
   9. MODAL
   ========================================================= */
const modalOverlay = $("#modalOverlay");

function openModal(id) {
  modalOverlay.classList.add("show");
  $$(".modal-box").forEach(b => b.style.display = "none");
  $(`#${id}`).style.display = "block";
}
function closeModal() {
  modalOverlay?.classList.remove("show");
}
modalOverlay?.addEventListener("click", e => { if (e.target === modalOverlay) closeModal(); });
$$(".modal-cancel, .modal-close").forEach(btn => {
  if (btn.closest("#authOverlay")) return;
  btn.addEventListener("click", closeModal);
});

/* =========================================================
   10. NOTES
   ========================================================= */
const DEFAULT_NOTES = [
  { id:1, title:"Meeting Recap", body:"Discussed product roadmap, Q3 milestones, and team velocity improvements...", date:"Today" },
  { id:2, title:"Research Notes", body:"Glassmorphism in modern UI: pros, cons, and accessibility considerations...", date:"Yesterday" },
  { id:3, title:"Ideas & Brainstorms", body:"A workspace that feels alive — soft motion, ambient orbs, focus mode...", date:"2 days ago" }
];
let notes = JSON.parse(localStorage.getItem("aiw-notes") || "null") ?? DEFAULT_NOTES;

function saveNotes() { localStorage.setItem("aiw-notes", JSON.stringify(notes)); }

function renderNotes() {
  const grid = $(".notes-grid");
  if (!grid) return;
  grid.innerHTML = "";
  notes.forEach(n => {
    const div = document.createElement("div");
    div.className = "note-card";
    div.innerHTML =
      `<div class="card-head"><div class="note-title">${escHtml(n.title)}</div>` +
      `<button class="del-btn" data-type="note" data-id="${n.id}">✕</button></div>` +
      `<p>${escHtml(n.body)}</p><div class="note-meta">${escHtml(n.date)}</div>`;
    grid.appendChild(div);
  });
  const add = document.createElement("div");
  add.className = "note-card add"; add.id = "addNoteBtn";
  add.innerHTML = `＋<span>${_t("new_note")}</span>`;
  grid.appendChild(add);
}

$("#saveNoteBtn")?.addEventListener("click", () => {
  const title = $("#noteTitle").value.trim();
  if (!title) { $("#noteTitle").focus(); return; }
  notes.unshift({ id: Date.now(), title, body: $("#noteBody").value.trim() || "...", date: todayStr() });
  saveNotes(); renderNotes();
  $("#noteTitle").value = ""; $("#noteBody").value = "";
  closeModal();
});

/* =========================================================
   11. DOCS — editor, upload (PDF/DOCX/TXT), AI tools
   ========================================================= */
const DOC_ICONS = { txt:"📄", md:"📝", pdf:"📕", docx:"📘", doc:"📘" };

const DEFAULT_DOCS = [
  { id:1, title:"Project Proposal",  content:"<h2>Project Proposal</h2><p>Click to start editing this document with AI assistance...</p>", type:"txt", edited:"2h ago",    words:14 },
  { id:2, title:"Marketing Plan",    content:"<h2>Marketing Plan</h2><p>Define your marketing strategy here...</p>",                       type:"txt", edited:"Yesterday", words:10 },
  { id:3, title:"Technical Specs",   content:"<h2>Technical Specifications</h2><p>Document your technical requirements...</p>",              type:"txt", edited:"3 days ago",words:9  }
];

let docs = (() => {
  const stored = JSON.parse(localStorage.getItem("aiw-docs") || "null");
  if (!stored) return DEFAULT_DOCS;
  return stored.map(d => ({ content:"", type:"txt", words:0, ...d }));
})();

let _currentDocId = null;

function saveDocs() { localStorage.setItem("aiw-docs", JSON.stringify(docs)); }

function _countWords(html) {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.split(" ").length : 0;
}

/* Render document grid */
function renderDocs() {
  const grid = $("#docsGrid") || $(".docs-grid");
  if (!grid) return;
  grid.innerHTML = "";
  docs.forEach(d => {
    const icon = DOC_ICONS[d.type] || "📄";
    const div = document.createElement("div");
    div.className = "doc-card";
    div.innerHTML =
      `<div class="card-head"><div class="doc-icon">${icon}</div>` +
      `<button class="del-btn" data-type="doc" data-id="${d.id}">✕</button></div>` +
      `<div class="doc-title">${escHtml(d.title)}</div>` +
      `<div class="doc-card-type">${(d.type||"txt").toUpperCase()} · ${d.words||0} words</div>` +
      `<div class="muted">${escHtml(d.edited)}</div>`;
    div.addEventListener("click", e => { if (!e.target.closest(".del-btn")) openDocEditor(d.id); });
    grid.appendChild(div);
  });
}

/* Open editor */
function openDocEditor(docId) {
  _currentDocId = docId;
  const doc = docs.find(d => d.id === docId);
  if (!doc) return;
  $("#editorTitle").value = doc.title || "";
  $("#editorContent").innerHTML = doc.content || "";
  $("#editorFileType").textContent = (doc.type || "txt").toUpperCase();
  _updateWordCount();
  $("#aiPanel").style.display = "none";
  $("#docsListView").style.display = "none";
  $("#docEditorView").style.display = "block";
  $("#editorContent").focus();
}

function _saveCurrentDoc() {
  if (_currentDocId === null) return;
  const content = $("#editorContent").innerHTML;
  docs = docs.map(d => d.id !== _currentDocId ? d : {
    ...d,
    title:   $("#editorTitle").value.trim() || "Untitled",
    content, edited: "Just now", words: _countWords(content)
  });
  saveDocs(); renderDocs();
}

function _updateWordCount() {
  const n = _countWords($("#editorContent")?.innerHTML || "");
  const el = $("#editorWordCount");
  if (el) el.textContent = `${n} word${n !== 1 ? "s" : ""}`;
}

/* Back button */
$("#editorBackBtn")?.addEventListener("click", () => {
  _saveCurrentDoc();
  $("#docsListView").style.display = "block";
  $("#docEditorView").style.display = "none";
});

/* Save button */
$("#saveEditorBtn")?.addEventListener("click", _saveCurrentDoc);

/* Word count on input */
$("#editorContent")?.addEventListener("input", _updateWordCount);

/* New document */
$("#newDocBtn")?.addEventListener("click", () => {
  const d = { id:Date.now(), title:"Untitled Document", content:"", type:"txt", edited:"Just now", words:0 };
  docs.unshift(d); saveDocs(); renderDocs(); openDocEditor(d.id);
});

/* Export as .txt */
$("#exportTxtBtn")?.addEventListener("click", () => {
  _saveCurrentDoc();
  const text = $("#editorContent").innerText || "";
  const name = ($("#editorTitle").value.trim() || "document") + ".txt";
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([text], { type:"text/plain" })),
    download: name
  });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
});

/* File upload */
const docUploadInput = $("#docUploadInput");
docUploadInput?.addEventListener("change", async () => {
  const file = docUploadInput.files?.[0];
  if (!file) return;
  const ext = file.name.split(".").pop().toLowerCase();
  let content = "";

  try {
    if (ext === "txt" || ext === "md") {
      const raw = await file.text();
      content = "<p>" + raw.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>") + "</p>";
    } else if (ext === "pdf") {
      content = await _parsePDF(file);
    } else if (ext === "docx" || ext === "doc") {
      content = await _parseDOCX(file);
    } else {
      alert(`Format .${ext} belum didukung.\nGunakan: .txt · .md · .pdf · .docx`);
      docUploadInput.value = ""; return;
    }
  } catch (err) {
    content = `<p>[Error membaca file: ${escHtml(err.message)}]</p>`;
  }

  const d = { id:Date.now(), title:file.name.replace(/\.[^.]+$/,""), content, type:ext, edited:"Just now", words:_countWords(content) };
  docs.unshift(d); saveDocs(); renderDocs(); openDocEditor(d.id);
  docUploadInput.value = "";
});

async function _parsePDF(file) {
  if (typeof pdfjsLib === "undefined") return "<p>[PDF.js belum dimuat — pastikan internet aktif]</p>";
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    pages.push("<p>" + escHtml(tc.items.map(x => x.str).join(" ")) + "</p>");
  }
  return pages.join("") || "<p>[PDF kosong atau terenkripsi]</p>";
}

async function _parseDOCX(file) {
  if (typeof mammoth === "undefined") return "<p>[Mammoth.js belum dimuat — pastikan internet aktif]</p>";
  const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  return result.value || "<p>[Dokumen kosong]</p>";
}

/* AI tools in editor */
async function _runDocAI(prompt) {
  const text = ($("#editorContent")?.innerText || "").trim();
  if (!text) { alert("Dokumen kosong. Tulis sesuatu dulu."); return; }
  const panel = $("#aiPanel");
  const body  = $("#aiPanelContent");
  panel.style.display = "flex";
  body.textContent = "Generating…";
  body.textContent = await callGemini([{ role:"user", text:`${prompt}\n\n---\n${text}` }]);
}

$("#aiSummarizeBtn")?.addEventListener("click", () =>
  _runDocAI("Summarize this document concisely in 3–5 bullet points. Return only the summary:"));

$("#aiImproveBtn")?.addEventListener("click", () =>
  _runDocAI("Improve the writing quality, clarity, and professionalism. Return only the improved text:"));

$("#aiExpandBtn")?.addEventListener("click", () =>
  _runDocAI("Expand this document with more details and examples. Return only the expanded version:"));

$("#aiTranslateSelect")?.addEventListener("change", function() {
  const lang = this.value; if (!lang) return;
  _runDocAI(`Translate this document to ${lang}. Return only the translated text:`);
  this.value = "";
});

/* Apply AI result to editor */
$("#aiApplyBtn")?.addEventListener("click", () => {
  const result = $("#aiPanelContent").textContent;
  if (!result || result === "Generating…") return;
  $("#editorContent").innerHTML = result.split("\n").filter(l => l.trim())
    .map(l => `<p>${escHtml(l)}</p>`).join("");
  _updateWordCount();
  $("#aiPanel").style.display = "none";
});

$("#aiClosePanelBtn")?.addEventListener("click", () => { $("#aiPanel").style.display = "none"; });

/* =========================================================
   12. SLIDES (AI generation)
   ========================================================= */
const DEFAULT_SLIDES = [
  {num:"01",title:"Cover"},{num:"02",title:"Introduction"},{num:"03",title:"Problem"},
  {num:"04",title:"Solution"},{num:"05",title:"Demo"},{num:"06",title:"Conclusion"}
];
let slides = JSON.parse(localStorage.getItem("aiw-slides") || "null") ?? DEFAULT_SLIDES;

function saveSlides() { localStorage.setItem("aiw-slides", JSON.stringify(slides)); }

function renderSlides(arr) {
  const grid = $(".slides-grid");
  if (!grid) return;
  grid.innerHTML = "";
  arr.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "slide-card";
    div.innerHTML = `<div class="slide-num">${s.num || String(i+1).padStart(2,"0")}</div><div class="slide-title">${escHtml(s.title)}</div>`;
    grid.appendChild(div);
  });
}

const slidesInput = $(".slides-prompt input");
const genBtn      = $(".slides-prompt .primary-btn");
genBtn?.addEventListener("click", async () => {
  const topic = slidesInput?.value.trim();
  if (!topic) return;
  genBtn.textContent = "Generating..."; genBtn.disabled = true;
  const resp = await callGemini([{
    role: "user",
    text: `Create a 6-slide presentation outline for: "${topic}". Return ONLY a numbered list in this format:\n1. Slide Title\n2. Slide Title\n...and so on. No extra explanation.`
  }]);
  const lines = resp.split("\n").filter(l => /^\d+[.)]\s/.test(l.trim()));
  if (lines.length >= 2) {
    slides = lines.slice(0, 6).map((l, i) => ({
      num: String(i+1).padStart(2,"0"),
      title: l.replace(/^\d+[.)]\s*/, "").trim()
    }));
    while (slides.length < 6) slides.push({ num: String(slides.length+1).padStart(2,"0"), title:"..." });
    saveSlides(); renderSlides(slides);
    slidesInput.value = "";
  }
  genBtn.textContent = "Generate"; genBtn.disabled = false;
});

/* =========================================================
   13. DELEGATION — dynamic elements (add / delete)
   ========================================================= */
document.addEventListener("click", e => {
  if (e.target.closest("#addNoteBtn")) { openModal("noteModal"); return; }
  const del = e.target.closest(".del-btn");
  if (del) {
    e.stopPropagation();
    const id = Number(del.dataset.id);
    if (del.dataset.type === "note") { notes = notes.filter(n => n.id !== id); saveNotes(); renderNotes(); }
    if (del.dataset.type === "doc")  { docs  = docs.filter(d => d.id !== id);  saveDocs();  renderDocs();  }
  }
});

/* =========================================================
   14. SPEECH RECOGNITION — Chat & Notes
   ========================================================= */
const _SR = window.SpeechRecognition || window.webkitSpeechRecognition;

function _speechLang() {
  return ({ en:"en-US", id:"id-ID", th:"th-TH", zh:"zh-CN", ja:"ja-JP", ko:"ko-KR", vi:"vi-VN" })[_lang] || "en-US";
}

function _showMicUnsupported() {
  alert("Mic tidak tersedia di browser ini.\nGunakan Google Chrome atau Microsoft Edge terbaru.");
}

/* ── CHAT MIC ── */
const chatMicBtn = $("#chatMicBtn");
let _chatRec     = null;
let _chatStopped = false;

chatMicBtn?.addEventListener("click", () => {
  /* Stop jika sedang recording */
  if (_chatRec) {
    _chatStopped = true;
    _chatRec.stop();
    return;
  }

  if (!_SR) { _showMicUnsupported(); return; }

  _chatStopped = false;
  _chatRec     = new _SR();
  _chatRec.lang            = _speechLang();
  _chatRec.interimResults  = true;
  _chatRec.continuous      = false;
  _chatRec.maxAlternatives = 1;

  let finalText = "";

  /* Mic benar-benar mulai */
  _chatRec.onstart = () => {
    chatMicBtn.classList.add("mic-active");
    chatMicBtn.textContent   = "⏹";
    chatInput.placeholder    = "🔴 Mendengarkan...";
    chatInput.value          = "";
  };

  /* Terima hasil suara */
  _chatRec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      else                      interim    = e.results[i][0].transcript;
    }
    chatInput.value = finalText + interim;
  };

  /* Error: tampilkan pesan jelas */
  _chatRec.onerror = (e) => {
    console.error("Chat mic error:", e.error);
    if      (e.error === "not-allowed")  alert("Akses mikrofon ditolak.\nKlik ikon kunci di address bar lalu izinkan mikrofon.");
    else if (e.error === "no-speech")    { chatInput.placeholder = "Tidak ada suara. Coba lagi."; }
    else if (e.error === "network")      { chatInput.placeholder = "Error jaringan. Periksa koneksi."; }
    else if (e.error !== "aborted")      console.warn("Mic:", e.error);
  };

  /* Selesai (otomatis atau manual) */
  _chatRec.onend = () => {
    chatMicBtn.classList.remove("mic-active");
    chatMicBtn.textContent = "🎤";
    chatInput.placeholder  = _t("chat_ph") || "Ask anything, create anything...";
    const captured = chatInput.value.trim();
    _chatRec = null;
    /* Kirim otomatis jika ada teks */
    if (captured && !_chatStopped) sendChat();
  };

  _chatRec.start();
});

/* ── NOTES MIC (continuous) ── */
const noteMicBtn = $("#noteMicBtn");
let _noteRec     = null;
let _noteActive  = false;

noteMicBtn?.addEventListener("click", () => {
  if (_noteRec && _noteActive) {
    _noteActive = false;
    _noteRec.stop();
    return;
  }

  if (!_SR) { _showMicUnsupported(); return; }

  const noteBody   = $("#noteBody");
  let committed    = noteBody.value;

  function _startNoteRec() {
    _noteRec               = new _SR();
    _noteRec.lang          = _speechLang();
    _noteRec.interimResults  = true;
    _noteRec.continuous    = true;
    _noteRec.maxAlternatives = 1;

    _noteRec.onstart = () => {
      _noteActive = true;
      noteMicBtn.classList.add("mic-active");
      noteMicBtn.textContent = "⏹";
    };

    _noteRec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          committed += (committed ? " " : "") + e.results[i][0].transcript;
        } else {
          interim = e.results[i][0].transcript;
        }
      }
      noteBody.value = committed + (interim ? " " + interim : "");
    };

    _noteRec.onerror = (e) => {
      console.error("Notes mic error:", e.error);
      if (e.error === "not-allowed") {
        _noteActive = false;
        alert("Akses mikrofon ditolak.\nKlik ikon kunci di address bar lalu izinkan mikrofon.");
      } else if (e.error === "network") {
        console.warn("Network error, akan coba restart...");
      }
    };

    /* Untuk continuous: restart otomatis jika masih aktif */
    _noteRec.onend = () => {
      if (_noteActive) {
        try { _startNoteRec(); return; } catch {}
      }
      noteMicBtn.classList.remove("mic-active");
      noteMicBtn.textContent = "🎤";
      _noteRec   = null;
      _noteActive = false;
    };

    _noteRec.start();
  }

  _startNoteRec();
});

/* =========================================================
   15. AUTH — Firebase (Google + Phone OTP)
   ========================================================= */
let _user = null;
let _fbAuth = null;
let _confirmationResult = null;
let _recaptchaVerifier  = null;

/* Init Firebase if config is present */
(function _initFirebase() {
  const cfg = window.AIW_CONFIG?.FIREBASE;
  if (!cfg || cfg.apiKey === "YOUR_API_KEY") return;
  try {
    firebase.initializeApp(cfg);
    _fbAuth = firebase.auth();
    _fbAuth.onAuthStateChanged(fbUser => {
      if (fbUser) {
        _user = {
          name:  fbUser.displayName || fbUser.phoneNumber || "User",
          email: fbUser.email || fbUser.phoneNumber || "",
          photo: fbUser.photoURL || null
        };
        localStorage.setItem("aiw-user", JSON.stringify(_user));
      } else {
        _user = null;
        localStorage.removeItem("aiw-user");
      }
      _renderUser();
    });
  } catch (e) { console.warn("Firebase init failed:", e); }
})();

/* Restore cached session when Firebase not configured */
if (!_fbAuth) _user = JSON.parse(localStorage.getItem("aiw-user") || "null");

/* Update sidebar user card */
function _renderUser() {
  const avatarEl  = $("#userAvatarEl");
  const nameEl    = $("#userNameEl");
  const statusEl  = $("#userStatusEl");
  const loginBtn  = $("#loginMenuBtn");
  const logoutBtn = $("#logoutBtn");
  const mobileBtn = $("#topbarUserBtn");
  if (_user) {
    if (_user.photo && avatarEl) {
      avatarEl.style.cssText = `background:url(${_user.photo}) center/cover no-repeat`;
      avatarEl.textContent = "";
    } else if (avatarEl) {
      avatarEl.style.cssText = "";
      avatarEl.textContent = _user.name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
    }
    if (nameEl)    nameEl.textContent   = _user.name;
    if (statusEl)  statusEl.textContent = _user.email;
    if (loginBtn)  loginBtn.style.display  = "none";
    if (logoutBtn) logoutBtn.style.display = "";
    if (mobileBtn) { mobileBtn.textContent = "✓"; mobileBtn.classList.add("logged-in"); }
  } else {
    if (avatarEl)  { avatarEl.style.cssText = ""; avatarEl.textContent = "?"; }
    if (nameEl)    nameEl.textContent   = "Guest";
    if (statusEl)  statusEl.textContent = "Not signed in";
    if (loginBtn)  loginBtn.style.display  = "";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (mobileBtn) { mobileBtn.textContent = "👤"; mobileBtn.classList.remove("logged-in"); }
  }
}

/* Modal helpers */
function _openAuthModal() {
  _showStep(1);
  $("#authOverlay")?.classList.add("show");
  $(".auth-box").style.display = "block";
}
function _closeAuthModal() {
  $("#authOverlay")?.classList.remove("show");
  setTimeout(() => {
    _showStep(1);
    const p = $("#authPhone"); if (p) p.value = "";
    const o = $("#otpInput");  if (o) o.value = "";
    _setErr(""); _setOtpErr("");
    _confirmationResult = null;
  }, 250);
}
function _showStep(n) {
  $("#authStep1").style.display = n === 1 ? "" : "none";
  $("#authStep2").style.display = n === 2 ? "" : "none";
}
function _setErr(msg)    { const e = $("#authError"); if (e) e.textContent = msg; }
function _setOtpErr(msg) { const e = $("#otpError");  if (e) e.textContent = msg; }

/* ── User card dropdown ── */
$("#userMenuBtn")?.addEventListener("click", e => {
  e.stopPropagation();
  const open = $("#userDropdown")?.classList.toggle("show");
  $("#userMenuBtn")?.classList.toggle("open", !!open);
});
document.addEventListener("click", e => {
  if (!e.target.closest("#userCard") && !e.target.closest("#userDropdown")) {
    $("#userDropdown")?.classList.remove("show");
    $("#userMenuBtn")?.classList.remove("open");
  }
});

/* Open modal from dropdown */
$("#loginMenuBtn")?.addEventListener("click", () => {
  $("#userDropdown")?.classList.remove("show");
  $("#userMenuBtn")?.classList.remove("open");
  _openAuthModal();
});

/* Sign out */
$("#logoutBtn")?.addEventListener("click", async () => {
  if (_fbAuth) await _fbAuth.signOut().catch(() => {});
  _user = null; localStorage.removeItem("aiw-user");
  _renderUser();
  $("#userDropdown")?.classList.remove("show");
  $("#userMenuBtn")?.classList.remove("open");
});

/* Close modal */
$("#cancelAuthBtn")?.addEventListener("click", _closeAuthModal);
$("#authOverlay")?.addEventListener("click", e => { if (e.target === $("#authOverlay")) _closeAuthModal(); });

/* ── Google Sign-In ── */
$("#googleSignInBtn")?.addEventListener("click", async () => {
  if (!_fbAuth) {
    _setErr("Firebase belum dikonfigurasi. Isi FIREBASE config di config.js terlebih dahulu.");
    return;
  }
  _setErr("");
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await _fbAuth.signInWithPopup(provider);
    _closeAuthModal();
  } catch (err) {
    if (err.code === "auth/popup-closed-by-user") _setErr("Login dibatalkan.");
    else if (err.code === "auth/popup-blocked") _setErr("Pop-up diblokir browser. Izinkan pop-up dan coba lagi.");
    else _setErr(err.message || "Gagal login. Coba lagi.");
  }
});

/* ── Phone / OTP ── */
$("#sendOtpBtn")?.addEventListener("click", async () => {
  if (!_fbAuth) {
    _setErr("Firebase belum dikonfigurasi. Isi FIREBASE config di config.js terlebih dahulu.");
    return;
  }
  const digits = ($("#authPhone")?.value || "").replace(/[\s\-()]/g, "");
  const phone  = ($("#phoneCountry")?.value || "+62") + digits;
  if (digits.length < 7) { _setErr("Masukkan nomor telepon yang valid."); return; }
  _setErr("");
  const btn = $("#sendOtpBtn");
  btn.textContent = "Mengirim…"; btn.disabled = true;
  try {
    if (!_recaptchaVerifier) {
      _recaptchaVerifier = new firebase.auth.RecaptchaVerifier("recaptcha-container", { size: "invisible" });
    }
    _confirmationResult = await _fbAuth.signInWithPhoneNumber(phone, _recaptchaVerifier);
    if ($("#phoneSent")) $("#phoneSent").textContent = phone;
    _showStep(2);
    setTimeout(() => $("#otpInput")?.focus(), 100);
  } catch (err) {
    _setErr(err.message || "Gagal mengirim kode. Pastikan nomor valid dan coba lagi.");
    if (_recaptchaVerifier) { _recaptchaVerifier.clear(); _recaptchaVerifier = null; }
  } finally {
    btn.textContent = "Send Verification Code"; btn.disabled = false;
  }
});

/* Verify OTP */
$("#verifyOtpBtn")?.addEventListener("click", async () => {
  const otp = ($("#otpInput")?.value || "").trim();
  if (otp.length < 6) { _setOtpErr("Masukkan 6 digit kode verifikasi."); return; }
  _setOtpErr("");
  const btn = $("#verifyOtpBtn");
  btn.textContent = "Memverifikasi…"; btn.disabled = true;
  try {
    await _confirmationResult.confirm(otp);
    _closeAuthModal();
  } catch {
    _setOtpErr("Kode salah atau kadaluarsa. Periksa dan coba lagi.");
  } finally {
    btn.textContent = "Verify & Sign in"; btn.disabled = false;
  }
});

/* Back to step 1 */
$("#backToStep1Btn")?.addEventListener("click", () => {
  _showStep(1); _setOtpErr(""); _confirmationResult = null;
});

/* Enter shortcuts */
$("#authPhone")?.addEventListener("keydown", e => { if (e.key === "Enter") $("#sendOtpBtn")?.click(); });
$("#otpInput")?.addEventListener("keydown",  e => { if (e.key === "Enter") $("#verifyOtpBtn")?.click(); });

/* =========================================================
   16. INIT
   ========================================================= */
renderSlides(slides);
applyLang(_lang);
_renderUser();
console.log("%cAI Workspace ready ✨", "color:#3b82f6;font-weight:bold;font-size:14px");
