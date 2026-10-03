/* Kiểm tra dữ liệu + tính nhất quán giữa app.js và index.html */
const fs = require("fs");
const path = require("path");
const ROOT = "C:\\Users\\dell\\Downloads\\luyen_tthcm\\web";

/* ---- nạp data.js ---- */
const sandbox = { window: {} };
const code = fs.readFileSync(path.join(ROOT, "data.js"), "utf8");
new Function("window", code)(sandbox.window);
const DATA = sandbox.window.QUIZ_DATA;

let fails = 0;
const bad = (m) => { console.log("  ✗ " + m); fails++; };

/* ---- 1. cấu trúc chương ---- */
const expect = { I: 106, II: 196, III: 183, IV: 237, V: 120, VI: 200 };
console.log("1) Cấu trúc chương");
let total = 0;
DATA.chapters.forEach((c) => {
  total += c.questions.length;
  const e = expect[c.id];
  const okc = e === c.questions.length;
  console.log(`   ${okc ? "✓" : "✗"} Chương ${c.id}: ${c.questions.length} câu (mong đợi ${e})`);
  if (!okc) fails++;
  if (!c.title || c.title.length < 5) bad("Chương " + c.id + " thiếu tiêu đề");
});
console.log(`   ${total === 1042 ? "✓" : "✗"} Tổng: ${total} câu`);
if (total !== 1042) fails++;

/* ---- 2. tính hợp lệ của từng câu ---- */
console.log("2) Tính hợp lệ của câu hỏi");
let nOpt = {}, nSec = 0, three = 0, secMissing = 0;
DATA.chapters.forEach((c) => {
  c.questions.forEach((q, i) => {
    const tag = `${c.id}#${q.n}`;
    if (!q.stem || q.stem.trim().length < 6) bad(tag + " thiếu đề bài");
    if (!q.options || q.options.length < 3) bad(tag + " ít hơn 3 lựa chọn");
    if (q.options.length === 3) three++;
    nOpt[q.options.length] = (nOpt[q.options.length] || 0) + 1;
    const keys = q.options.map((o) => o.key);
    if (!q.answer) bad(tag + " không có đáp án");
    else if (!keys.includes(q.answer)) bad(tag + " đáp án " + q.answer + " không nằm trong " + keys.join(","));
    q.options.forEach((o) => {
      if (!o.text || o.text.trim().length < 1) bad(tag + " lựa chọn " + o.key + " rỗng");
    });
    const uniq = new Set(keys);
    if (uniq.size !== keys.length) bad(tag + " khoá lựa chọn trùng");
    if (!q.sec) secMissing++; else nSec++;
  });
});
console.log("   phân bố số lựa chọn:", JSON.stringify(nOpt));
console.log(`   ${secMissing <= 60 ? "✓" : "!"} có mục con: ${nSec}, không có: ${secMissing}`);
console.log(`   ${three === 1 ? "✓" : "!"} số câu chỉ có 3 lựa chọn: ${three}`);

/* ---- 3. mô phỏng trộn đáp án (giống buildItems trong app.js) ---- */
console.log("3) Mô phỏng trộn đáp án ×300 vòng");
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
let mism = 0;
for (let r = 0; r < 300; r++) {
  for (const c of DATA.chapters) {
    for (const q of c.questions) {
      const opts = shuffle(q.options.map((o) => ({ text: o.text, orig: o.key })));
      const display = opts.map((o, i) => ({ label: "ABCDEFGH"[i], text: o.text, orig: o.orig }));
      let correct = null;
      for (const d of display) if (d.orig === q.answer) correct = d.label;
      if (!correct) { mism++; continue; }
      const txt = display.find((d) => d.label === correct);
      const want = q.options.find((o) => o.key === q.answer);
      if (!txt || !want || txt.text !== want.text) mism++;
    }
  }
}
console.log(`   ${mism === 0 ? "✓" : "✗"} sai lệch ánh xạ đáp án: ${mism}`);
if (mism) fails++;

/* ---- 4. app.js tham chiếu id nào ---- */
console.log("4) Đối chiếu id giữa app.js và index.html");
const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const used = new Set([...app.matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]));
const have = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
const dynamic = new Set(["btnShowAll", "resumeBar"]);
let miss = 0;
used.forEach((u) => {
  if (!have.has(u) && !dynamic.has(u)) { bad("app.js dùng #" + u + " nhưng index.html không có"); miss++; }
});
console.log(`   ${miss === 0 ? "✓" : "✗"} app.js dùng ${used.size} id, thiếu ${miss}`);
have.forEach((h) => { /* id thừa trong html là bình thường */ });

/* ---- 5. mẫu hiển thị ---- */
console.log("5) Mẫu câu hỏi");
const s = DATA.chapters[1].questions[47];
console.log("   " + s.stem.slice(0, 110));
s.options.forEach((o) => console.log("     " + (o.key === s.answer ? "➜ " : "  ") + o.key + ". " + o.text.slice(0, 80)));
console.log("   đáp án: " + s.answer);

console.log(fails === 0 ? "\n=== TẤT CẢ KIỂM TRA ĐỀU ĐẠT ===" : `\n=== ${fails} LỖI ===`);
process.exit(fails ? 1 : 0);
