/**
 * Cloudflare Worker — Groq API Proxy
 *
 * Deploy steps:
 * 1. cloudflare.com → Workers & Pages → Create application → Create Worker
 * 2. Paste this entire file, klik Deploy
 * 3. Settings → Variables & Secrets → Add Secret:
 *      Name : GROQ_API_KEY
 *      Value: gsk_xxxxxxxxxxxx   ← key kamu yang baru
 * 4. Ganti ALLOWED_ORIGIN di bawah dengan domain kamu
 */

const ALLOWED_ORIGIN = "https://eunxiel.github.io";
const GROQ_URL       = "https://api.groq.com/openai/v1/chat/completions";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    const cors = {
      "Access-Control-Allow-Origin":  ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    /* Preflight */
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    /* Blokir origin lain */
    if (origin !== ALLOWED_ORIGIN) {
      return new Response("Forbidden", { status: 403 });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    try {
      const body = await request.text();

      const groqRes = await fetch(GROQ_URL, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        },
        body,
      });

      const text = await groqRes.text();
      return new Response(text, {
        status:  groqRes.status,
        headers: { "Content-Type": "application/json", ...cors },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: { message: err.message } }),
        { status: 500, headers: { "Content-Type": "application/json", ...cors } }
      );
    }
  },
};
