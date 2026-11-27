import { timingSafeEqual } from "node:crypto";

const COOKIE = "__Host-studio-journal";
const WEEK = 7 * 24 * 60 * 60;
const encoder = new TextEncoder();
const hex = (bytes) => Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
const digest = async (value) => hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function response(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, no-store, max-age=0",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'none'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    ...extra,
  } });
}

function layout(title, body, loggedIn = false) {
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}｜My Studio</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+TC:wght@300;400;500;600&display=swap"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/research-progress/journal.css"></head><body>
  <a class="journal-skip" href="#journal-main">跳至主要內容</a>
  <header class="site-header"><a class="brand" href="/">Studio</a><nav class="nav" aria-label="主要導覽"><a href="/index.html#about">關於</a><a href="/index.html#projects">作品</a><a href="/research-progress/index.html">研究進度總覽</a><a href="/research-log/index.html">進度報告</a><a href="/index.html#contact">聯絡</a></nav></header>
  <main id="journal-main" class="journal-page" tabindex="-1"><div class="journal-toolbar"><a href="/research-progress/index.html#collaborations">← 返回研究進度總覽</a>${loggedIn ? '<form action="/journal/logout" method="post"><button class="journal-text-button" type="submit">登出</button></form>' : ""}</div>${body}</main>
  <footer class="footer"><p>Sheng-Kai Lin Studio</p><p>Research, tools and reproducible workflows.</p><p>©2026</p></footer></body></html>`;
}

function login(message = "", status = 200) {
  return response(layout("研究日誌登入", `<header class="journal-heading"><p class="eyebrow">Research Journal</p><h1>研究日誌</h1><p>此區內容僅供研究討論，請輸入共用密碼。</p></header><form class="journal-login" action="/journal/login" method="post"><label for="journal-password">共用密碼</label><input id="journal-password" name="password" type="password" autocomplete="current-password" required maxlength="256" aria-describedby="login-message"><p id="login-message" role="status">${escape(message)}</p><button class="project-button" type="submit">進入研究日誌</button></form>`), status);
}

async function readForm(request) {
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  let length = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 2048) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new URLSearchParams(new TextDecoder().decode(bytes));
}

async function handler({ request, env }) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");
  if (!["/journal", "/journal/login", "/journal/logout", "/journal/ptnipta"].includes(path)) return response("Not found", 404);
  if (!env.JOURNAL_DB || !env.JOURNAL_PASSWORD || env.JOURNAL_PASSWORD.length < 12) {
    return response(layout("研究日誌", '<header class="journal-heading"><h1>研究日誌暫未開放</h1><p>私人內容尚在設定中，請稍後再試。</p></header>'), 503);
  }
  const db = env.JOURNAL_DB;
  const now = Math.floor(Date.now() / 1000);
  const credentialHash = await digest(env.JOURNAL_PASSWORD);
  const token = request.headers.get("cookie")?.split(";").map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const tokenHash = token && /^[a-f0-9]{64}$/.test(token) ? await digest(token) : null;
  if (request.method === "POST") {
    if (request.headers.get("origin") !== url.origin) return response("Forbidden", 403);
    if (path === "/journal/logout") {
      if (tokenHash) await db.prepare("DELETE FROM journal_sessions WHERE token_hash = ?").bind(tokenHash).run();
      return response(null, 303, { Location: "/journal/ptnipta", "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
    }
    if (path !== "/journal/login") return response("Method not allowed", 405, { Allow: "GET, HEAD" });
    const form = await readForm(request);
    if (!form) return response("Invalid request", 400);
    const ip = request.headers.get("CF-Connecting-IP") || "local";
    const clientHash = await digest(`${credentialHash}:${ip}`);
    // One atomic upsert prevents parallel attempts from bypassing the limit.
    const attempt = await db.prepare(`INSERT INTO journal_attempts (client_hash, window_start, attempts) VALUES (?1, ?2, 1)
      ON CONFLICT(client_hash) DO UPDATE SET
      attempts = CASE WHEN window_start <= ?2 - 900 THEN 1 ELSE attempts + 1 END,
      window_start = CASE WHEN window_start <= ?2 - 900 THEN ?2 ELSE window_start END RETURNING attempts`)
      .bind(clientHash, now).first();
    if (attempt.attempts > 8) return login("嘗試次數過多，請在 15 分鐘後再試。", 429);
    const submitted = form.get("password") || "";
    const submittedHash = await digest(submitted);
    if (!timingSafeEqual(encoder.encode(credentialHash), encoder.encode(submittedHash))) return login("密碼不正確，請再試一次。", 401);
    const session = hex(crypto.getRandomValues(new Uint8Array(32)));
    await db.batch([
      db.prepare("DELETE FROM journal_sessions WHERE expires_at <= ?").bind(now),
      db.prepare("DELETE FROM journal_attempts WHERE window_start < ?").bind(now - 86400),
      db.prepare("INSERT INTO journal_sessions (token_hash, credential_hash, expires_at) VALUES (?, ?, ?)").bind(await digest(session), credentialHash, now + WEEK),
    ]);
    return response(null, 303, { Location: "/journal/ptnipta", "Set-Cookie": `${COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${WEEK}` });
  }
  if (!["GET", "HEAD"].includes(request.method)) return response("Method not allowed", 405, { Allow: "GET, HEAD, POST" });
  const authenticated = tokenHash && await db.prepare("SELECT token_hash FROM journal_sessions WHERE token_hash = ? AND credential_hash = ? AND expires_at > ?").bind(tokenHash, credentialHash, now).first();
  if (!authenticated) return login();
  const document = await db.prepare("SELECT title, body_html FROM journal_documents WHERE slug = ?").bind("ptnipta").first();
  if (!document) return response(layout("研究日誌", '<header class="journal-heading"><h1>尚未加入日誌</h1></header>', true), 404);
  return response(request.method === "HEAD" ? null : layout(document.title, document.body_html, true));
}

export async function onRequest(context) {
  try { return await handler(context); }
  catch { return response(layout("研究日誌", '<header class="journal-heading"><h1>暫時無法讀取日誌</h1><p>請稍後再試。</p></header>'), 503); }
}
