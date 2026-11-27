const fs = require("node:fs");
const path = require("node:path");
const MarkdownIt = require("markdown-it");

const [source, output] = process.argv.slice(2);
if (!source || !output) throw new Error("Usage: prepare-journal.cjs source.md private-output.sql");
const root = path.resolve(__dirname, "..");
const target = path.resolve(output);
if (target === root || target.startsWith(root + path.sep)) throw new Error("Private export must stay outside the website directory");
const md = new MarkdownIt({ html: false, linkify: false });
const esc = (s) => md.utils.escapeHtml(s);
md.renderer.rules.table_open = () => '<div class="journal-table" role="region" aria-label="研究結果表格" tabindex="0"><table>';
md.renderer.rules.table_close = () => '</table></div>';
const text = fs.readFileSync(source, "utf8").replace(/（建議分類，待確認）/g, "");
const tokens = md.parse(text, {});
const headings = tokens.map((t, i) => t.type === "heading_open" ? i : -1).filter((i) => i >= 0);
const details = headings.filter((i) => tokens[i].tag === "h3" && tokens[i + 1].content.startsWith("["));
const overview = headings.filter((i) => tokens[i].tag === "h3" && /^\d\. PtNiPTA/.test(tokens[i + 1].content));
if (details.length !== 4 || overview.length !== 4) throw new Error("Expected four summaries and four journal topics");
const topics = [
  ["vacuum", "真空氫吸附與熱化學基線"],
  ["implicit-water", "隱式水效應與數值驗證"],
  ["single-water", "單水配對與真空能量比較"],
  ["hydrogen-ab", "H 重分配 A／B 對照"],
];
const summaries = overview.map((start, n) => {
  const end = overview[n + 1] ?? headings.find((i) => i > start && tokens[i].tag === "h2");
  const items = tokens.slice(start, end).filter((t) => t.type === "inline").map((t) => t.content);
  const summary = items.find((s) => s.startsWith("精簡摘要："));
  if (!summary) throw new Error("Missing summary");
  return summary.slice("精簡摘要：".length);
});
let body = '<header class="journal-heading"><p class="eyebrow">合作案 · Research Journal</p><h1>PtNiPTA</h1><p class="journal-period">首次回溯整理｜2026 / 09 / 16 – 2026 / 11 / 27</p></header>';
body += '<details><summary>紀錄範圍與名詞定義</summary>';
for (const token of tokens.slice(0, overview[0]).filter((t) => t.type === "inline" && /^(本次為首次|資料範圍|文中 Pt|電子吸附能)/.test(t.content))) {
  body += `<p>${md.renderInline(token.content)}</p>`;
}
body += '</details>';
body += '<section class="journal-topic" id="overview"><h2>目前研究摘要</h2><p>本次整理由可核實的接手紀錄回溯至目前工作。歷史計算成果與本期整理分開標示；詳細驗證範圍與限制見各主題。</p>';
for (const [n, [, title]] of topics.entries()) body += `<h3>${esc(title)}</h3><p>${md.renderInline(summaries[n])}</p>`;
body += '</section><nav class="journal-topics" aria-label="研究主題"><a href="#overview">目前研究摘要</a>';
for (const [id, title] of topics) body += `<a href="#${id}">${esc(title)}</a>`;
body += '</nav>';
for (const [n, start] of details.entries()) {
  const end = details[n + 1] ?? tokens.findIndex((t, i) => i > start && t.type === "hr");
  const chapter = tokens.slice(start + 3, end < 0 ? undefined : end);
  const sourceStart = chapter.findIndex((t, i) => t.type === "heading_open" && chapter[i + 1]?.content.startsWith("8. 依據"));
  if (sourceStart < 0) throw new Error("Missing source section");
  for (const t of chapter) if (["heading_open", "heading_close"].includes(t.type) && t.tag === "h4") t.tag = "h3";
  const [id, title] = topics[n];
  body += `<section class="journal-topic" id="${id}"><h2>${esc(title)}</h2><p class="journal-period">${esc(tokens[start + 1].content)}</p><details><summary>展開完整工作日誌</summary>${md.renderer.render(chapter.slice(0, sourceStart), md.options, {})}<details><summary>依據與相關紀錄</summary>${md.renderer.render(chapter.slice(sourceStart + 3), md.options, {})}</details></details></section>`;
}
if (/<script|<iframe|<img|onerror=/i.test(body)) throw new Error("Unexpected active content");
const sqlString = (s) => "'" + s.replace(/'/g, "''") + "'";
const sql = `INSERT INTO journal_documents (slug,title,body_html,updated_at) VALUES ('ptnipta','PtNiPTA',${sqlString(body)},'2026-11-27') ON CONFLICT(slug) DO UPDATE SET title=excluded.title, body_html=excluded.body_html, updated_at=excluded.updated_at;\n`;
fs.writeFileSync(target, sql, { mode: 0o600 });
console.log("Prepared four private research topics; no research text printed.");
