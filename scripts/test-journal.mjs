import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { onRequest } from "../server/journal.mjs";

const sqlite = new DatabaseSync(":memory:");
sqlite.exec(await readFile("server/schema.sql", "utf8"));
if (process.env.JOURNAL_TEST_SQL) sqlite.exec(await readFile(process.env.JOURNAL_TEST_SQL, "utf8"));
else sqlite.prepare("INSERT INTO journal_documents VALUES (?, ?, ?, ?)").run("ptnipta", "PtNiPTA", '<header class="journal-heading"><h1>PtNiPTA</h1></header><p>PRIVATE_TEST_CONTENT</p>', "2026-11-27");
class Statement {
  constructor(sql, args = []) { this.sql = sql; this.args = args; }
  bind(...args) { return new Statement(this.sql, args); }
  async first() { return sqlite.prepare(this.sql).get(...this.args) ?? null; }
  async run() { return sqlite.prepare(this.sql).run(...this.args); }
}
const env = { JOURNAL_PASSWORD: randomBytes(24).toString("base64url"), JOURNAL_DB: {
  prepare: (sql) => new Statement(sql),
  batch: async (statements) => { for (const s of statements) await s.run(); },
} };
const origin = "https://studio.example";
const request = (path, options = {}) => new Request(origin + path, options);
const post = (path, password, ip = "test-ip", cookie = "") => request(path, { method: "POST", headers: {
  Origin: origin, "Content-Type": "application/x-www-form-urlencoded", "CF-Connecting-IP": ip, Cookie: cookie,
}, body: new URLSearchParams({ password }) });
const call = (req, bindings = env) => onRequest({ request: req, env: bindings });
let r = await call(request("/journal/ptnipta"), {});
assert.equal(r.status, 503);
r = await call(request("/journal/ptnipta"));
assert.equal(r.status, 200);
assert.match(await r.text(), /type="password"/);
assert.equal(r.headers.get("cache-control"), "private, no-store, max-age=0");
assert.equal((await call(request("/journal/ptnipta/raw"))).status, 404);
assert.equal((await call(request("/journal/login", { method: "POST", body: "password=x" }))).status, 403);
assert.equal((await call(post("/journal/login", "wrong"))).status, 401);
for (let i = 0; i < 7; i++) assert.equal((await call(post("/journal/login", "wrong"))).status, 401);
assert.equal((await call(post("/journal/login", env.JOURNAL_PASSWORD))).status, 429);
r = await call(post("/journal/login", env.JOURNAL_PASSWORD, "valid-ip"));
assert.equal(r.status, 303);
const cookie = r.headers.get("set-cookie");
assert.match(cookie, /HttpOnly; Secure; SameSite=Strict/);
r = await call(request("/journal/ptnipta", { headers: { Cookie: cookie } }));
assert.match(await r.text(), /PtNiPTA/);
assert.equal(sqlite.prepare("SELECT count(*) AS n FROM journal_sessions").get().n, 1);
assert.equal((await call(post("/journal/logout", "", "valid-ip", cookie))).status, 303);
r = await call(request("/journal/ptnipta", { headers: { Cookie: cookie } }));
assert.match(await r.text(), /type="password"/);
r = await call(post("/journal/login", env.JOURNAL_PASSWORD, "rotation-ip"));
const oldCookie = r.headers.get("set-cookie");
r = await call(request("/journal/ptnipta", { headers: { Cookie: oldCookie } }), { ...env, JOURNAL_PASSWORD: randomBytes(24).toString("hex") });
assert.match(await r.text(), /type="password"/);
sqlite.prepare("UPDATE journal_sessions SET expires_at = 0").run();
r = await call(request("/journal/ptnipta", { headers: { Cookie: oldCookie } }));
assert.match(await r.text(), /type="password"/);
console.log("PASS: fail-closed, login, rate limit, CSRF, no-store, protected document, logout, rotation and expiry");

if (process.argv.includes("--browser")) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/journal/")) {
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        const input = new Request(`http://localhost:${server.address().port}${req.url}`, {
          method: req.method, headers: req.headers,
          ...(["GET", "HEAD"].includes(req.method) ? {} : { body: Buffer.concat(chunks) }),
        });
        const result = await call(input);
        res.writeHead(result.status, Object.fromEntries(result.headers));
        res.end(Buffer.from(await result.arrayBuffer()));
      } else {
        const filename = "dist" + decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
        if (filename.includes("..")) { res.writeHead(404); res.end(); return; }
        await stat(filename);
        res.setHeader("Content-Type", filename.endsWith(".css") ? "text/css" : filename.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8");
        res.end(await readFile(filename));
      }
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const require = createRequire(import.meta.url);
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    // Test-only bypass permits axe injection; production CSP remains script-free.
    const page = await browser.newPage({ reducedMotion: "reduce", bypassCSP: true });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const base = `http://localhost:${server.address().port}`;
    await page.goto(base + "/journal/ptnipta");
    await page.addScriptTag({ path: process.env.JOURNAL_AXE });
    let violations = await page.evaluate(async () => (await axe.run()).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
    assert.deepEqual(violations, []);
    await page.getByLabel("共用密碼").fill(env.JOURNAL_PASSWORD);
    await page.getByRole("button", { name: "進入研究日誌" }).click();
    await page.getByRole("heading", { name: "PtNiPTA", exact: true }).waitFor();
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const control of await page.locator(".journal-topic > details").all()) {
        if (!(await control.getAttribute("open"))) await control.locator(":scope > summary").click();
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      console.log(`PASS: journal reflow ${width}px`);
    }
    await page.addScriptTag({ path: process.env.JOURNAL_AXE });
    violations = await page.evaluate(async () => (await axe.run()).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
    assert.deepEqual(violations, []);
    assert.deepEqual(errors, []);
    await page.getByRole("button", { name: "登出", exact: true }).click();
    await page.getByLabel("共用密碼").waitFor();
    console.log("PASS: browser login/logout, native disclosure, axe login/document zero violations, no page errors");
  } finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
}
sqlite.close();
