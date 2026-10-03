/* Chạy thử web/app.js qua nhiều luồng sử dụng thật, bằng DOM giả. */
const fs = require("fs");
const path = require("path");
const { createPage, runApp } = require("./domshim.js");

const ROOT = "C:\\Users\\dell\\Downloads\\luyen_tthcm\\web";
const HTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const APP = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const DATA = fs.readFileSync(path.join(ROOT, "data.js"), "utf8");

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "   \u2713 " : "   \u2717 ") + msg); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Mở một trang mới; store dùng lại được để mô phỏng tải lại trang. */
function open(store) {
  const page = createPage(HTML, store);
  new Function("window", DATA)(page.window);
  runApp(page, APP);
  return page;
}

(async function main() {
  let page = open();
  const $ = (id) => page.get(id);
  const secsOf = (i) => new Set(window_data(i).map((q) => q.sec || "")).size + 1;
  function window_data(i) { return page.window.QUIZ_DATA.chapters[i].questions; }

  console.log("A) Khởi động");
  ok($("subtitle").textContent.includes("1.042"), "phụ đề: " + $("subtitle").textContent);
  ok($("toc").children.length === 6, "mục lục có 6 chương");
  ok($("chapterCards").children.length === 6, "6 thẻ chương ở trang chủ");
  ok($("selChapter").children.length === 6, "dropdown chương có 6 mục");
  ok($("selSection").children.length === secsOf(0), "chương I: " + ($("selSection").children.length - 1) + " mục + 'tất cả'");
  ok(!$("viewSetup").classList.contains("hidden"), "đang ở màn hình chọn chương");
  ok($("viewQuiz").classList.contains("hidden") && $("viewResult").classList.contains("hidden"), "hai màn hình kia đang ẩn");

  console.log("B) Chọn chương qua mục lục");
  $("toc").children[2].children[0].click();
  ok($("selChapter").value === "III", "dropdown chương = III");
  ok($("chapterCards").children[2].classList.contains("active"), "thẻ chương III được đánh dấu");
  ok($("selSection").children.length === secsOf(2), "chương III: " + ($("selSection").children.length - 1) + " mục + 'tất cả'");
  ok(/183 câu/.test($("poolInfo").textContent), "gộp câu: " + $("poolInfo").textContent);

  console.log("C) Lọc theo mục nhỏ");
  const vals = $("selSection").children.map((o) => o.value);
  const real = vals.find((v) => v && v !== "__chua_chia_muc__");
  $("selSection").value = real;
  $("selSection").fire("change");
  const inSec = window_data(2).filter((q) => (q.sec || "") === real).length;
  ok($("poolInfo").textContent.includes(String(inSec) + " câu"), "lọc mục: " + $("poolInfo").textContent);
  ok(inSec > 0 && inSec < 183, "mục nhỏ thật sự hẹp hơn cả chương (" + inSec + " < 183)");
  $("selSection").value = "";
  $("selSection").fire("change");
  ok(/183 câu/.test($("poolInfo").textContent), "bỏ lọc quay lại 183 câu");
  // Mục "chưa chia mục" phải KHÁC "tất cả", không được trả về cả chương
  if (vals.includes("__chua_chia_muc__")) {
    $("selSection").value = "__chua_chia_muc__";
    $("selSection").fire("change");
    const none = window_data(2).filter((q) => !q.sec).length;
    ok($("poolInfo").textContent.includes("Sẵn sàng " + none + " câu"),
       "nhóm chưa chia mục tách khỏi 'tất cả': " + $("poolInfo").textContent);
    ok(none < 183, "nhóm chưa chia mục không trả về cả chương (" + none + " < 183)");
  } else {
    console.log("   (chương III không có câu nào ngoài mục)");
  }
  $("selSection").value = "";
  $("selSection").fire("change");

  console.log("D) Chế độ hiện đáp án ngay (khóa lựa chọn)");
  $("selCount").value = "5";
  $("optInstant").checked = true;
  $("btnStart").click();
  ok($("quizCounter").textContent === "Câu 1 / 5", "bộ đếm: " + $("quizCounter").textContent);
  $("qOptions").children[0].click();
  ok($("qOptions").children.every((c) => c.classList.contains("locked")), "mọi lựa chọn bị khóa sau khi trả lời");
  ok($("qOptions").children.filter((c) => c.classList.contains("correct")).length === 1, "có đúng 1 lựa chọn được tô là đáp án đúng");
  ok(!$("qExplain").classList.contains("hidden"), "hiện ngay phần giải thích");
  ok($("qExplain").textContent.trim().length > 0, "giải thích: " + $("qExplain").textContent.trim().slice(0, 70) + "…");

  console.log("E) Tự chuyển câu + phím tắt");
  await sleep(900);
  const afterAuto = $("quizCounter").textContent;
  ok(afterAuto === "Câu 1 / 5" || afterAuto === "Câu 2 / 5", "sau 0,9 giây ở " + afterAuto + " (đúng thì tự sang câu 2, sai thì đứng yên)");
  page.key("1");
  ok($("qOptions").children.every((c) => c.classList.contains("locked")), "phím 1 trả lời được câu hiện tại");
  await sleep(900);
  const cur = $("quizCounter").textContent;
  page.key("ArrowRight");
  ok($("quizCounter").textContent !== cur, "ArrowRight chuyển câu (" + cur + " -> " + $("quizCounter").textContent + ")");
  page.key("ArrowLeft");
  ok($("quizCounter").textContent === cur, "ArrowLeft quay lại " + cur);
  await sleep(900);

  console.log("F) Thoát giữa chừng (có hộp thoại xác nhận)");
  $("btnQuit").click();
  ok(!$("modal").classList.contains("hidden"), "hiện hộp thoại xác nhận thoát");
  ok($("modalTitle").textContent.includes("Thoát"), "tiêu đề hộp thoại: " + $("modalTitle").textContent);
  $("modalCancel").click();
  ok($("modal").classList.contains("hidden"), "bấm Huỷ thì đóng hộp thoại");
  ok(!$("viewQuiz").classList.contains("hidden"), "bấm Huỷ thì vẫn đang làm bài");
  $("btnQuit").click();
  $("modalOk").click();
  ok(!$("viewSetup").classList.contains("hidden"), "đồng ý thì về màn hình chọn chương");

  console.log("G) Làm bài 6 câu rồi nộp");

  $("selCount").value = "6";
  $("optInstant").checked = false;
  $("btnStart").click();
  $("btnGrid").click();
  ok($("jumpGrid").children.length === 6, "lưới có 6 ô");
  for (let i = 0; i < 6; i++) {
    $("jumpGrid").children[i].click();
    $("qOptions").children[0].click();
  }
  ok($("jumpGrid").children.every((c) => c.classList.contains("done")), "cả 6 ô đánh dấu đã trả lời");
  ok(Object.keys(JSON.parse(page.localStorage.getItem("tthcm.quiz.v1")).answers).length === 6, "ghi nhận 6 câu trả lời");
  $("btnFinish").click();
  ok(!$("viewResult").classList.contains("hidden"), "sang màn hình kết quả");
  const okc = +$("stOk").textContent, noc = +$("stNo").textContent, skc = +$("stSkip").textContent;
  ok(okc + noc + skc === 6, `kết quả: đúng ${okc} + sai ${noc} + bỏ ${skc} = 6`);
  ok($("scorePct").textContent === Math.round(okc / 6 * 100) + "%", "phần trăm: " + $("scorePct").textContent);
  ok($("scoreRing").style._p["--p"] === String(Math.round(okc / 6 * 100)), "vòng tròn điểm = " + $("scoreRing").style._p["--p"]);
  ok($("resultChapter").textContent.length > 3, "kết quả ghi rõ chương: " + $("resultChapter").textContent);

  console.log("H) Xem lại / xem tất cả");
  ok($("reviewList").children.length === noc + skc, "danh sách xem lại: " + $("reviewList").children.length + " câu");
  $("btnShowAll").click();
  ok($("reviewList").children.length === 6, "hiện đủ 6 câu");
  ok(/^Tất cả 6 câu/.test($("reviewTitle").textContent), "tiêu đề: " + $("reviewTitle").textContent);
  $("btnShowAll").click();
  ok($("reviewList").children.length === noc + skc, "quay lại chỉ câu sai");

  console.log("I) Làm lại câu sai");
  if (noc > 0) {
    $("btnRedoWrong").click();
    ok($("quizCounter").textContent === "Câu 1 / " + noc, "bộ đếm phiên mới: " + $("quizCounter").textContent);
    ok($("qOptions").children.every((c) => !c.classList.contains("locked")), "câu mới chưa bị khóa");
  } else {
    console.log("   (bỏ qua: phiên này không có câu sai)");
  }

  console.log("J) Đổi giao diện sáng/tối");
  $("btnHome").click();
  const before2 = page.document.documentElement._t;
  $("btnTheme").click();
  const after = page.document.documentElement._t;
  ok(after !== before2, "theme đổi: " + before2 + " -> " + after);
  ok(page.localStorage.getItem("tthcm.theme") === after, "đã lưu theme vào localStorage");

  console.log("K) Tải lại trang giữa lúc làm bài");
  $("selCount").value = "8";
  $("btnStart").click();
  $("qOptions").children[0].click();
  $("btnNext").click();
  $("qOptions").children[1].click();
  const saved = JSON.parse(page.localStorage.getItem("tthcm.quiz.v1"));
  ok(saved.finished !== true && saved.idx === 1, "phiên dở được lưu (idx=" + saved.idx + ")");
  const store2 = page.store;
  page = open(store2);
  const $2 = (id) => page.get(id);
  const bar2 = $2("resumeBar");
  ok(!!bar2, "sau khi tải lại: có thanh 'làm tiếp'");
  ok(!$2("viewSetup").classList.contains("hidden"), "vẫn ở màn hình chọn chương, chờ người dùng bấm tiếp tục");
  ok(bar2.querySelector(".btn").textContent === "Tiếp tục", "nhãn nút: " + bar2.querySelector(".btn").textContent);
  bar2.querySelector(".btn").click();
  ok(!$2("viewQuiz").classList.contains("hidden"), "bấm 'Tiếp tục' thì vào màn hình làm bài");
  ok($2("quizCounter").textContent === "Câu 2 / 8", "đúng câu đang làm: " + $2("quizCounter").textContent);
  ok($2("qOptions").children[1].classList.contains("picked"), "giữ nguyên đáp án đã chọn");

  console.log("L) Tải lại sau khi đã nộp bài");
  $2("btnFinish").click();
  $2("modalOk").click();
  ok(!$2("viewResult").classList.contains("hidden"), "còn câu chưa trả lời thì phải xác nhận mới nộp được");
  page = open(page.store);
  const $3 = (id) => page.get(id);
  const bar3 = $3("resumeBar");
  ok(!!bar3, "phiên đã nộp vẫn hiện thanh khôi phục");
  ok(bar3.querySelector(".btn").textContent === "Xem kết quả", "nhãn nút: " + bar3.querySelector(".btn").textContent);
  ok($3("viewQuiz").classList.contains("hidden"), "không tự vào màn hình làm bài");
  ok(!$3("viewSetup").classList.contains("hidden"), "vẫn ở màn hình chọn chương");
  bar3.querySelector(".btn").click();
  ok(!$3("viewResult").classList.contains("hidden"), "bấm thì mở lại màn hình kết quả");

  /* ================= BA TÍNH NĂNG MỚI ================= */

  console.log("M) Tự nhập số câu");
  page = open();
  const $m = (id) => page.get(id);
  ok($m("numCount").classList.contains("hidden"), "ô nhập số câu ẩn khi chưa chọn 'Số khác…'");
  $m("selCount").value = "custom";
  $m("selCount").fire("change");
  ok(!$m("numCount").classList.contains("hidden"), "chọn 'Số khác…' thì hiện ô nhập");
  ok(String($m("numCount").max) === "106", "max ô nhập = số câu của chương I (" + $m("numCount").max + ")");
  $m("numCount").value = "15";
  $m("numCount").fire("input");
  ok($m("poolInfo").textContent.includes("15 câu"), "báo trước lấy 15 câu: " + $m("poolInfo").textContent);
  $m("btnStart").click();
  ok($m("quizCounter").textContent === "Câu 1 / 15", "vào bài đúng 15 câu: " + $m("quizCounter").textContent);
  $m("btnQuit").click(); $m("modalOk").click();

  console.log("M2) Nhập số lớn hơn số câu đang có");
  $m("selChapter").value = "I";
  $m("selChapter").fire("change");
  $m("selCount").value = "custom";
  $m("selCount").fire("change");
  $m("numCount").value = "500";
  $m("numCount").fire("input");
  ok($m("poolInfo").textContent.includes("chỉ có 106 câu"), "cảnh báo lấy hết: " + $m("poolInfo").textContent);
  $m("btnStart").click();
  ok($m("quizCounter").textContent === "Câu 1 / 106", "lấy hết 106 câu: " + $m("quizCounter").textContent);
  $m("btnQuit").click(); $m("modalOk").click();
  $m("selCount").value = "20";
  $m("selCount").fire("change");

  console.log("N) Xem trước câu hỏi và đáp án");
  $m("toc").children[0].children[0].click();
  $m("btnPreview").click();
  ok(!$m("viewPreview").classList.contains("hidden"), "mở được màn hình xem trước");
  ok($m("viewSetup").classList.contains("hidden"), "màn hình chọn chương đã ẩn");
  const items = $m("previewList").children;
  ok(items.length === 106, "liệt kê đủ 106 câu của chương I (" + items.length + ")");
  const marked = $m("previewList").querySelectorAll(".pv-ok");
  ok(marked.length === 106, "mỗi câu tô đúng 1 đáp án đúng (" + marked.length + "/106)");
  const firstOk = items[0].querySelector(".pv-ok").textContent.trim();
  const ans0 = page.window.QUIZ_DATA.chapters[0].questions[0].answer;
  ok(firstOk.charAt(0) === ans0,
     "đáp án tô xanh khớp dữ liệu (câu 1: " + ans0 + " — " + firstOk.slice(0, 40) + ")");
  ok(items[2].querySelector(".pv-stem").textContent.indexOf("Câu 3") >= 0,
     "câu 3 có nhãn số: " + items[2].querySelector(".pv-stem").textContent.slice(0, 30) + "…");

  console.log("N2) Tìm kiếm trong phần xem trước");
  const needle = "Hồ Chí Minh";
  const low = needle.toLowerCase();
  const expect = page.window.QUIZ_DATA.chapters[0].questions.filter((q) =>
    (q.stem || "").toLowerCase().includes(low) ||
    (q.sec || "").toLowerCase().includes(low) ||
    q.options.some((o) => (o.text || "").toLowerCase().includes(low))
  ).length;
  ok(expect > 0 && expect < 106, "dữ liệu thật có " + expect + " câu chứa “" + needle + "”");
  $m("previewSearch").value = needle;
  $m("previewSearch").fire("input");
  ok($m("previewList").children.length === expect, "hiện đúng " + expect + " câu khớp");
  ok($m("previewCount").textContent === expect + "/106 câu", "bộ đếm: " + $m("previewCount").textContent);
  ok($m("previewList").querySelectorAll(".pv-ok").length === expect, "mỗi câu khớp vẫn tô 1 đáp án");
  $m("previewSearch").value = "zzzqqq";
  $m("previewSearch").fire("input");
  ok($m("previewCount").textContent === "0/106 câu", "không khớp thì đếm 0: " + $m("previewCount").textContent);
  ok($m("previewList").textContent.includes("Không tìm thấy"), "không khớp thì báo trống");
  $m("previewSearch").value = "";
  $m("previewSearch").fire("input");
  ok($m("previewList").children.length === 106, "xoá ô tìm thì hiện lại đủ");

  console.log("N3) Bắt đầu làm bài từ màn hình xem trước");
  $m("selCount").value = "7";
  $m("btnPreviewStart").click();
  ok(!$m("viewQuiz").classList.contains("hidden"), "vào thẳng màn hình làm bài");
  ok($m("quizCounter").textContent === "Câu 1 / 7", "đúng số câu đã chọn: " + $m("quizCounter").textContent);

  console.log("O) Bấm chương khác khi đang làm bài");
  $m("qOptions").children[0].click();
  $m("toc").children[3].children[0].click();
  ok(!$m("modal").classList.contains("hidden"), "hiện hộp thoại xác nhận đổi chương");
  ok($m("modalTitle").textContent.includes("Đổi chương"), "tiêu đề: " + $m("modalTitle").textContent);
  ok($m("modalBody").textContent.includes("1/7 câu"), "nêu rõ tiến độ: " + $m("modalBody").textContent.slice(0, 60) + "…");
  $m("modalCancel").click();
  ok(!$m("viewQuiz").classList.contains("hidden"), "bấm Huỷ thì vẫn ở bài đang làm");
  ok($m("selChapter").value === "I", "phạm vi không đổi sau khi huỷ");

  $m("toc").children[3].children[0].click();
  $m("modalOk").click();
  ok(!$m("viewSetup").classList.contains("hidden"), "đồng ý thì quay về màn hình chọn chương");
  ok($m("selChapter").value === "IV", "đã đổi sang chương IV (" + $m("selChapter").value + ")");
  ok(!!$m("resumeBar"), "bài đang làm dở vẫn được giữ để làm tiếp");
  ok($m("resumeBar").textContent.includes("1/7 câu"), "thanh làm tiếp ghi đúng tiến độ");

  console.log("O2) Bấm chương khác khi đang xem kết quả");
  page = open();
  const $o = (id) => page.get(id);
  $o("selCount").value = "6";
  $o("optInstant").checked = false;
  $o("btnStart").click();
  $o("btnGrid").click();
  for (let i = 0; i < 6; i++) { $o("jumpGrid").children[i].click(); $o("qOptions").children[0].click(); }
  $o("btnFinish").click();
  ok(!$o("viewResult").classList.contains("hidden"), "đang ở màn hình kết quả");
  $o("toc").children[2].children[0].click();
  ok(!$o("modal").classList.contains("hidden"), "cũng hỏi xác nhận khi đang xem kết quả");
  ok($o("modalBody").textContent.includes("kết quả"), "lời thoại nói rõ đang xem kết quả");
  $o("modalCancel").click();
  ok(!$o("viewResult").classList.contains("hidden"), "huỷ thì vẫn ở màn hình kết quả");
  $o("toc").children[2].children[0].click();
  $o("modalOk").click();
  ok(!$o("viewSetup").classList.contains("hidden"), "đồng ý thì về màn hình chọn chương");
  ok($o("selChapter").value === "III", "đã đổi sang chương III (" + $o("selChapter").value + ")");
  ok(!$o("resumeBar"), "bài đã nộp thì không còn thanh làm tiếp");
  ok(page.localStorage.getItem("tthcm.quiz.v1") === null, "đã xoá phiên đã nộp khỏi localStorage");

  console.log("P) Bấm lại đúng chương đang chọn thì không hỏi gì");
  $o("toc").children[2].children[0].click();
  ok($o("modal").classList.contains("hidden"), "không hiện hộp thoại khi bấm lại chính nó");
  ok($o("selChapter").value === "III", "phạm vi giữ nguyên");

  console.log("P2) Đổi mục nhỏ khi đang làm bài");
  $o("selCount").value = "5";
  $o("btnStart").click();
  $o("toc").children[1].children[1].children[3].click();
  ok(!$o("modal").classList.contains("hidden"), "đổi sang mục nhỏ cũng hỏi xác nhận");
  $o("modalOk").click();
  ok($o("selChapter").value === "II", "đã sang chương II");
  ok($o("selSection").value !== "", "và chọn đúng mục nhỏ đã bấm");
  ok($o("poolInfo").textContent.indexOf("196 câu") < 0, "phạm vi đã hẹp lại: " + $o("poolInfo").textContent);

  console.log(fails === 0 ? "\n=== T\u1ea4T C\u1ea2 " + 0 + " L\u1ed6I \u2014 APP CH\u1ea0Y T\u1ed0T ===" : `\n=== ${fails} L\u1ed6I ===`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("LỖI KHÔNG BẮT ĐƯỢC:", e); process.exit(2); });
