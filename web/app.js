/* ================================================================
   Luyện trắc nghiệm Tư tưởng Hồ Chí Minh
   Dữ liệu: window.QUIZ_DATA  (sinh ra từ web/data.js)
   ================================================================ */
(function () {
  "use strict";

  var DATA = window.QUIZ_DATA || { chapters: [] };
  var STORE_KEY = "tthcm.quiz.v1";

  /* ---------- tên chương rút gọn cho mục lục ---------- */
  var SHORT = {
    I:   "Khái niệm, đối tượng, phương pháp & ý nghĩa học tập",
    II:  "Cơ sở, quá trình hình thành và phát triển",
    III: "Độc lập dân tộc và chủ nghĩa xã hội",
    IV:  "Đảng Cộng sản Việt Nam & Nhà nước của nhân dân",
    V:   "Đại đoàn kết toàn dân tộc và đoàn kết quốc tế",
    VI:  "Văn hóa, đạo đức, con người"
  };
  var ROMAN_NAME = { I: "Chương I", II: "Chương II", III: "Chương III",
                     IV: "Chương IV", V: "Chương V", VI: "Chương VI" };

  /* ---------- tiện ích ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function fmtTime(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var m = Math.floor(s / 60);
    return (m < 10 ? "0" : "") + m + ":" + ((s % 60) < 10 ? "0" : "") + (s % 60);
  }
  function shortTitle(ch) { return SHORT[ch.id] || ch.title; }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* Mục "chưa chia tiêu đề" (câu nằm trước tiêu đề mục đầu tiên của chương)
     phải có khoá riêng, nếu dùng "" thì trùng với lựa chọn "tất cả các mục". */
  var SEC_NONE = "__chua_chia_muc__";
  function label4sec(k) { return k || "Câu mở đầu chương (chưa chia mục)"; }
  function secOf(q) { return q.sec || ""; }
  function secKey(k) { return k === "" ? SEC_NONE : k; }
  function secLabel(sec) { return sec === SEC_NONE ? label4sec("") : sec; }

  /* ---------- dữ liệu chương ---------- */
  var CHAPTERS = DATA.chapters.map(function (ch) {
    var secs = [], byKey = {};
    ch.questions.forEach(function (q) {
      var k = q.sec || "";
      if (!byKey[k]) { byKey[k] = { key: k, label: label4sec(k), count: 0 }; secs.push(byKey[k]); }
      byKey[k].count++;
    });
    return { id: ch.id, title: ch.title, questions: ch.questions, secs: secs,
             count: ch.questions.length,
             pool: ch.questions.filter(function (q) { return q.answer; }).length };
  });
  var TOTAL = CHAPTERS.reduce(function (s, c) { return s + c.count; }, 0);

  /* ---------- trạng thái ---------- */
  var state = {
    chapterId: CHAPTERS.length ? CHAPTERS[0].id : null,
    sec: "",
    session: null,      // { items, idx, answers, startedAt, elapsed, opts, chapterId, sec }
    ticking: null,
    lastResult: null
  };

  function chapter(id) {
    for (var i = 0; i < CHAPTERS.length; i++) if (CHAPTERS[i].id === id) return CHAPTERS[i];
    return null;
  }
  function poolFor(chId, sec) {
    var ch = chapter(chId);
    if (!ch) return [];
    return ch.questions.filter(function (q) {
      if (!q.answer) return false;
      if (!sec) return true;                              // tất cả các mục
      if (sec === SEC_NONE) return secOf(q) === "";       // nhóm chưa chia mục
      return secOf(q) === sec;
    });
  }

  /* ================================================================
     MỤC LỤC (sidebar)
     ================================================================ */
  function renderTOC() {
    var box = $("toc");
    box.innerHTML = "";
    CHAPTERS.forEach(function (ch) {
      var wrap = document.createElement("div");
      wrap.className = "toc-ch";

      var b = document.createElement("button");
      b.type = "button";
      if (ch.id === state.chapterId) b.className = "active";
      b.innerHTML = '<span class="rn">' + ch.id + '</span>' +
        '<span class="tt"><b></b><span class="toc-sub">' + ch.count + ' câu · ' +
        ch.secs.length + ' mục</span></span>';
      b.querySelector("b").textContent = "Chương " + ch.id + " — " + shortTitle(ch);
      b.addEventListener("click", function () { requestScope(ch.id, null); });
      wrap.appendChild(b);

      var secs = document.createElement("div");
      secs.className = "toc-secs";
      var all = document.createElement("button");
      all.type = "button";
      if (ch.id === state.chapterId && !state.sec) all.className = "active";
      all.innerHTML = '<span>Tất cả các mục</span><span class="n">' + ch.count + '</span>';
      all.addEventListener("click", function () { requestScope(ch.id, ""); });
      secs.appendChild(all);
      ch.secs.forEach(function (s) {
        var sb = document.createElement("button");
        sb.type = "button";
        if (ch.id === state.chapterId && state.sec === secKey(s.key)) sb.className = "active";
        sb.innerHTML = '<span></span><span class="n">' + s.count + '</span>';
        sb.querySelector("span").textContent = s.label;
        sb.addEventListener("click", function () { requestScope(ch.id, secKey(s.key)); });
        secs.appendChild(sb);
      });
      wrap.appendChild(secs);
      box.appendChild(wrap);
    });
  }

  /* ================================================================
     TRANG CHỦ / CÀI ĐẶT
     ================================================================ */
  function renderChapterCards() {
    var box = $("chapterCards");
    box.innerHTML = "";
    CHAPTERS.forEach(function (ch) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ccard" + (ch.id === state.chapterId ? " active" : "");
      b.innerHTML = '<span class="rn">' + ch.id + '</span><h3></h3>' +
                    '<span class="cnt">' + ch.count + ' câu hỏi</span>';
      b.querySelector("h3").textContent = shortTitle(ch);
      b.addEventListener("click", function () { requestScope(ch.id, null); });
      box.appendChild(b);
    });
  }

  function selectChapter(id) {
    state.chapterId = id;
    state.sec = "";
    renderTOC();
    renderChapterCards();
    fillSelects();
    updatePoolInfo();
  }

  function pickSection(chId, sec) {
    state.chapterId = chId;
    state.sec = sec;
    $("selChapter").value = chId;
    fillSections();
    $("selSection").value = sec;
    renderTOC();
    renderChapterCards();
    updatePoolInfo();
  }

  function fillSelects() {
    var sc = $("selChapter");
    sc.innerHTML = "";
    CHAPTERS.forEach(function (ch) {
      var o = document.createElement("option");
      o.value = ch.id;
      o.textContent = "Chương " + ch.id + " — " + shortTitle(ch) + " (" + ch.count + " câu)";
      sc.appendChild(o);
    });
    sc.value = state.chapterId;
    fillSections();
  }

  function fillSections() {
    var ch = chapter(state.chapterId);
    var ss = $("selSection");
    ss.innerHTML = "";
    var o = document.createElement("option");
    o.value = "";
    o.textContent = "Tất cả các mục (" + (ch ? ch.count : 0) + " câu)";
    ss.appendChild(o);
    if (ch) {
      ch.secs.forEach(function (s) {
        var op = document.createElement("option");
        op.value = secKey(s.key);
        op.textContent = s.label + " (" + s.count + " câu)";
        ss.appendChild(op);
      });
    }
    ss.value = state.sec;
  }

  function updatePoolInfo() {
    var pool = poolFor(state.chapterId, state.sec).length;
    var want = wantedCount();
    var n = want === 0 ? pool : Math.min(want, pool);
    var txt = "Sẵn sàng " + pool + " câu trong phạm vi đã chọn — sẽ lấy " + n + " câu.";
    if (want > pool && pool > 0) txt = "Sẵn sàng " + pool + " câu trong phạm vi đã chọn — bạn yêu cầu " +
      want + " câu, chỉ có " + pool + " câu nên sẽ lấy hết.";
    $("poolInfo").textContent = txt;
    var nc = $("numCount");
    if (nc) nc.max = pool > 0 ? pool : 1;
  }

  /* Số câu người dùng muốn: 0 = tất cả, số khác = số cụ thể. */
  function wantedCount() {
    var v = $("selCount").value;
    if (v === "custom") {
      var n = parseInt($("numCount").value, 10);
      if (isNaN(n) || n < 1) return 1;
      return Math.min(n, 9999);
    }
    var p = parseInt(v, 10);
    return isNaN(p) ? 0 : p;
  }

  function syncCountInput() {
    $("numCount").classList.toggle("hidden", $("selCount").value !== "custom");
  }

  /* ================================================================
     BẮT ĐẦU BÀI
     ================================================================ */
  function buildItems(pool, shuffleQ, shuffleO, count) {
    var qs = pool.slice();
    if (shuffleQ) shuffle(qs);
    if (count > 0 && count < qs.length) qs = qs.slice(0, count);
    return qs.map(function (q) {
      var opts = q.options.map(function (o) { return { text: o.text, orig: o.key }; });
      if (shuffleO) shuffle(opts);
      var display = opts.map(function (o, i) {
        return { label: "ABCDEFGH"[i], text: o.text, orig: o.orig };
      });
      var correct = null;
      for (var i = 0; i < display.length; i++) if (display[i].orig === q.answer) correct = display[i].label;
      return { n: q.n, sec: q.sec || "", stem: q.stem, options: display, correct: correct };
    });
  }

  function startSession(pool, count, opts, label) {
    if (!pool.length) return;
    var items = buildItems(pool, opts.shuffleQ, opts.shuffleO, count);
    state.session = {
      chapterId: state.chapterId, chapterLabel: label, sec: state.sec,
      items: items, idx: 0, answers: {},
      startedAt: Date.now(), elapsed: 0, running: true, opts: opts, finished: false
    };
    save();
    showView("quiz");
    startTimer();
    renderQuiz();
  }

  function onStart() {
    var ch = chapter(state.chapterId);
    if (!ch) return;
    var pool = poolFor(state.chapterId, state.sec);
    var count = wantedCount();
    var opts = {
      shuffleQ: $("optShuffleQ").checked,
      shuffleO: $("optShuffleO").checked,
      instant: $("optInstant").checked
    };
    var label = "Chương " + ch.id + (state.sec ? " · " + secLabel(state.sec) : "");
    startSession(pool, count, opts, label);
  }

  /* ================================================================
     LÀM BÀI
     ================================================================ */
  function startTimer() {
    stopTimer();
    state.ticking = setInterval(function () {
      var s = state.session;
      if (!s || !s.running || s.finished) return;
      var t = s.elapsed + (Date.now() - s.startedAt);
      $("quizTimer").textContent = fmtTime(t);
    }, 1000);
  }
  function stopTimer() { if (state.ticking) { clearInterval(state.ticking); state.ticking = null; } }
  function elapsed() {
    var s = state.session;
    if (!s) return 0;
    return s.finished ? s.elapsed : s.elapsed + (Date.now() - s.startedAt);
  }

  function renderQuiz() {
    var s = state.session;
    if (!s) return;
    var it = s.items[s.idx];
    var total = s.items.length;
    var ans = s.answers[s.idx] || null;

    $("quizChapter").textContent = s.chapterLabel;
    $("quizCounter").textContent = "Câu " + (s.idx + 1) + " / " + total;
    $("progressBar").style.width = ((s.idx + 1) / total * 100) + "%";
    $("quizTimer").textContent = fmtTime(elapsed());

    $("qNo").textContent = "Câu " + (s.idx + 1) + "  ·  đề #" + it.n;
    $("qStem").textContent = it.stem;

    var box = $("qOptions");
    box.innerHTML = "";
    it.options.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "opt";
      b.innerHTML = '<span class="k"></span><span class="t"></span>';
      b.querySelector(".k").textContent = o.label;
      b.querySelector(".t").textContent = o.text;

      if (ans) {
        b.classList.add("locked");
        if (s.opts.instant) {
          if (o.label === it.correct) b.classList.add("correct");
          else if (o.label === ans) b.classList.add("wrong");
        } else if (o.label === ans) {
          b.classList.add("picked");
        }
      }
      b.addEventListener("click", function () { answer(o.label); });
      box.appendChild(b);
    });

    var ex = $("qExplain");
    ex.className = "explain";
    ex.innerHTML = "";
    if (ans && s.opts.instant) {
      var good = ans === it.correct;
      if (!good) ex.classList.add("bad");
      var p = document.createElement("div");
      if (good) {
        p.innerHTML = "✅ <b>Chính xác!</b> Đáp án đúng là <b>" + it.correct + "</b>.";
      } else {
        p.innerHTML = "❌ <b>Chưa đúng.</b> Bạn chọn <b>" + ans +
                      "</b> — đáp án đúng là <b>" + it.correct + "</b>.";
      }
      ex.appendChild(p);
      if (!good) {
        var right = null;
        it.options.forEach(function (o) { if (o.label === it.correct) right = o; });
        if (right) {
          var d = document.createElement("div");
          d.style.marginTop = "6px";
          d.textContent = it.correct + ". " + right.text;
          ex.appendChild(d);
        }
      }
    } else {
      ex.classList.add("hidden");
    }
    renderNav();
    renderGrid();
  }

  function renderNav() {
    var s = state.session;
    $("btnPrev").disabled = s.idx === 0;
    $("btnNext").disabled = false;
    $("btnNext").textContent = (s.idx === s.items.length - 1) ? "Câu cuối" : "Câu sau →";
  }

  function renderGrid() {
    var g = $("jumpGrid");
    if (g.classList.contains("hidden")) return;
    var s = state.session;
    g.innerHTML = "";
    s.items.forEach(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = i + 1;
      if (i === s.idx) b.classList.add("cur");
      var a = s.answers[i];
      if (a) {
        if (s.opts.instant) b.classList.add(a === s.items[i].correct ? "right" : "miss");
        else b.classList.add("done");
      }
      b.addEventListener("click", function () { s.idx = i; renderQuiz(); });
      g.appendChild(b);
    });
  }

  function answer(label) {
    var s = state.session;
    if (!s) return;
    var it = s.items[s.idx];
    if (s.answers[s.idx] && s.opts.instant) return;   // đã chốt đáp án
    s.answers[s.idx] = label;
    if (!s.opts.instant) {
      // cho phép đổi đáp án: chỉ ghi nhận
      save();
      renderQuiz();
      return;
    }
    save();
    renderQuiz();
    if (label === it.correct) {
      setTimeout(function () {
        if (state.session === s && s.answers[s.idx] === label && s.idx < s.items.length - 1) {
          s.idx++; renderQuiz();
        }
      }, 620);
    }
  }

  function go(d) {
    var s = state.session;
    if (!s) return;
    var n = s.idx + d;
    if (n < 0 || n >= s.items.length) return;
    s.idx = n;
    renderQuiz();
  }

  function finish() {
    var s = state.session;
    if (!s) return;
    if (s.running) { s.elapsed = elapsed(); s.running = false; }
    s.finished = true;
    stopTimer();
    var ok = 0, no = 0, skip = 0;
    s.items.forEach(function (it, i) {
      var a = s.answers[i];
      if (!a) skip++;
      else if (a === it.correct) ok++;
      else no++;
    });
    state.lastResult = { ok: ok, no: no, skip: skip, total: s.items.length, ms: s.elapsed };
    save();
    renderResult();
    showView("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ================================================================
     XEM TRƯỚC CÂU HỎI & ĐÁP ÁN
     ================================================================ */
  function openPreview() {
    showView("preview");
    renderPreview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function previewHit(q, needle) {
    if (!needle) return true;
    if (("câu " + q.n).indexOf(needle) >= 0) return true;
    if ((q.stem || "").toLowerCase().indexOf(needle) >= 0) return true;
    if ((q.sec || "").toLowerCase().indexOf(needle) >= 0) return true;
    for (var i = 0; i < q.options.length; i++) {
      if ((q.options[i].text || "").toLowerCase().indexOf(needle) >= 0) return true;
    }
    return false;
  }

  function renderPreview() {
    var pool = poolFor(state.chapterId, state.sec);
    var ch = chapter(state.chapterId);
    var needle = ($("previewSearch").value || "").trim().toLowerCase();
    var list = pool.filter(function (q) { return previewHit(q, needle); });

    $("previewTitle").textContent = "Xem trước · " + scopeLabel(state.chapterId, state.sec === "" ? null : state.sec);
    $("previewSub").textContent = needle
      ? "Đang lọc theo “" + $("previewSearch").value.trim() + "” — đáp án đúng được tô xanh."
      : "Toàn bộ câu hỏi và đáp án của phạm vi đang chọn. Đáp án đúng được tô xanh.";
    $("previewCount").textContent = list.length === pool.length
      ? pool.length + " câu"
      : list.length + "/" + pool.length + " câu";

    if (!list.length) {
      $("previewList").innerHTML = '<p class="muted" style="padding:18px">Không tìm thấy câu nào khớp.</p>';
      return;
    }
    $("previewList").innerHTML = list.map(function (q) {
      var opts = q.options.map(function (o) {
        var on = o.key === q.answer;
        return '<li class="' + (on ? "pv-ok" : "") + '"><b>' + esc(o.key) + '.</b>' + esc(o.text) +
               (on ? ' <span aria-label="đáp án đúng">✓</span>' : "") + '</li>';
      }).join("");
      return '<article class="pv-item">' +
        '<div class="pv-stem"><span class="pv-no">Câu ' + esc(q.n) + '</span>' +
        (q.sec ? '<em class="pv-sec">' + esc(q.sec) + '</em>' : "") +
        esc(q.stem) + '</div>' +
        '<ul class="pv-opts">' + opts + '</ul></article>';
    }).join("");
  }

  /* ================================================================
     KẾT QUẢ
     ================================================================ */
  function renderResult() {
    var s = state.session, r = state.lastResult;
    var pct = r.total ? Math.round(r.ok / r.total * 100) : 0;
    $("scoreRing").style.setProperty("--p", pct);
    $("scorePct").textContent = pct + "%";
    $("scoreFrac").textContent = r.ok + "/" + r.total;
    $("resultChapter").textContent = s.chapterLabel + " · " + r.total + " câu";
    $("stOk").textContent = r.ok;
    $("stNo").textContent = r.no;
    $("stSkip").textContent = r.skip;
    $("stTime").textContent = fmtTime(r.ms);

    var t = "Hoàn thành!";
    if (pct === 100) t = "Tuyệt đối! 🎉";
    else if (pct >= 80) t = "Rất tốt! 👏";
    else if (pct >= 50) t = "Khá ổn — cần ôn thêm.";
    else t = "Cần ôn luyện thêm nhé.";
    $("resultTitle").textContent = t;

    $("btnRedoWrong").disabled = r.no + r.skip === 0;
    renderReview(false);
  }

  var showAll = false;
  function renderReview(all) {
    showAll = all;
    var s = state.session;
    var list = $("reviewList");
    list.innerHTML = "";
    var shown = 0;
    s.items.forEach(function (it, i) {
      var a = s.answers[i];
      var good = a === it.correct;
      if (!all && good) return;
      shown++;
      var d = document.createElement("div");
      d.className = "rv" + (good ? " ok" : "");
      var q = document.createElement("p");
      q.className = "rv-q";
      q.textContent = (i + 1) + ". " + it.stem;
      d.appendChild(q);

      var l1 = document.createElement("div");
      l1.className = "rv-line";
      l1.innerHTML = '<span class="tag">' + (good ? "Đúng" : (a ? "Sai" : "Chưa trả lời")) + '</span>';
      d.appendChild(l1);

      if (!good) {
        var ly = document.createElement("div");
        ly.className = "rv-line you";
        var yt = "—";
        it.options.forEach(function (o) { if (o.label === a) yt = o.label + ". " + o.text; });
        ly.innerHTML = "Bạn chọn: <b>" + (a ? yt : "chưa chọn") + "</b>";
        d.appendChild(ly);
      }
      var lr = document.createElement("div");
      lr.className = "rv-line right";
      var rt = "";
      it.options.forEach(function (o) { if (o.label === it.correct) rt = o.label + ". " + o.text; });
      lr.innerHTML = "Đáp án đúng: <b>" + rt + "</b>";
      d.appendChild(lr);
      list.appendChild(d);
    });
    if (!shown) {
      var p = document.createElement("p");
      p.className = "muted";
      p.textContent = "Không có câu nào sai. Quá xuất sắc!";
      list.appendChild(p);
    }
    $("reviewTitle").textContent = all ? "Tất cả " + s.items.length + " câu"
                                       : "Các câu cần xem lại (" + shown + ")";
    var btn = $("btnShowAll");
    if (btn) btn.remove();
    var nb = document.createElement("button");
    nb.id = "btnShowAll";
    nb.className = "btn ghost";
    nb.textContent = all ? "Chỉ xem câu sai" : "Xem tất cả câu";
    nb.addEventListener("click", function () { renderReview(!showAll); });
    $("reviewList").parentNode.insertBefore(nb, $("reviewTitle"));
  }

  /* ================================================================
     ĐIỀU HƯỚNG MÀN HÌNH
     ================================================================ */
  function showView(name) {
    ["setup", "quiz", "result", "preview"].forEach(function (v) {
      $("view" + v.charAt(0).toUpperCase() + v.slice(1))
        .classList.toggle("hidden", v !== name);
    });
    if (name !== "quiz") $("jumpGrid").classList.add("hidden");
  }
  function currentView() {
    if (!$("viewQuiz").classList.contains("hidden")) return "quiz";
    if (!$("viewResult").classList.contains("hidden")) return "result";
    if (!$("viewPreview").classList.contains("hidden")) return "preview";
    return "setup";
  }

  /* ================================================================
     HỘP THOẠI XÁC NHẬN
     ================================================================ */
  var modalCb = null;

  function askConfirm(title, body, okLabel, onOk, danger) {
    $("modalTitle").textContent = title;
    $("modalBody").textContent = body;
    $("modalOk").textContent = okLabel || "Đồng ý";
    $("modalOk").className = "btn " + (danger ? "danger" : "primary");
    modalCb = onOk;
    $("modal").classList.remove("hidden");
    if ($("modalOk").focus) $("modalOk").focus();
  }
  function closeModal() {
    $("modal").classList.add("hidden");
    modalCb = null;
  }
  function initModal() {
    $("modalOk").addEventListener("click", function () {
      var f = modalCb;
      closeModal();
      if (f) f();
    });
    $("modalCancel").addEventListener("click", closeModal);
    $("modal").addEventListener("click", function (e) { if (e.target === this) closeModal(); });
  }

  /* ================================================================
     ĐỔI PHẠM VI ÔN (chương / mục)
     ================================================================ */
  function applyScope(chId, sec) {
    if (sec === null || sec === undefined) selectChapter(chId);
    else pickSection(chId, sec);
    if (currentView() === "preview") renderPreview();
  }

  /* Bấm vào chương/mục ở mục lục. Khi đang làm bài hoặc đang xem kết quả thì
     phải hỏi lại, không im lặng bỏ qua cũng không tự ý đổi. */
  function requestScope(chId, sec) {
    var v = currentView();
    var same = (chId === state.chapterId) &&
               ((sec === null || sec === undefined) ? !state.sec : sec === state.sec);
    if (same) { closeMenu(); return; }

    if (v === "quiz" && state.session) {
      var s = state.session;
      var done = Object.keys(s.answers || {}).length;
      closeMenu();
      askConfirm(
        "Đổi chương đang làm?",
        "Bạn đang làm bài ở " + s.chapterLabel + " (" + done + "/" + s.items.length + " câu đã trả lời). " +
        "Chuyển sang " + scopeLabel(chId, sec) + " sẽ rời bài đang làm — bài làm dở vẫn được lưu để bạn quay lại tiếp tục.",
        "Đổi chương",
        function () { leaveTo(chId, sec, false); }
      );
      return;
    }

    if (v === "result" && state.session) {
      var lbl = state.session.chapterLabel;
      closeMenu();
      askConfirm(
        "Chuyển sang chương khác?",
        "Bạn đang xem kết quả của " + lbl + ". Chuyển sang " + scopeLabel(chId, sec) + "?",
        "Chuyển",
        function () { leaveTo(chId, sec, true); }
      );
      return;
    }

    closeMenu();
    applyScope(chId, sec);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scopeLabel(chId, sec) {
    var ch = chapter(chId);
    if (!ch) return "phần khác";
    var t = "Chương " + ch.id;
    if (sec === null || sec === undefined) return t;
    return t + " · " + (sec === SEC_NONE ? label4sec("") : sec);
  }

  /* Rời bài đang làm / màn hình kết quả rồi chuyển sang phạm vi mới.
     keepSession = true khi bài đã nộp (không còn gì để làm tiếp). */
  function leaveTo(chId, sec, wipe) {
    stopTimer();
    var s = state.session;
    if (s && !s.finished) save();
    state.session = null;
    state.lastResult = null;
    if (wipe) localStorage.removeItem(STORE_KEY);
    showView("setup");
    var b = $("resumeBar"); if (b) b.remove();
    applyScope(chId, sec);
    if (!wipe) {
      var d = load();
      if (d) showResume(d);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    stopTimer();
    state.session = null;
    state.lastResult = null;
    localStorage.removeItem(STORE_KEY);
    showView("setup");
    var b = $("resumeBar"); if (b) b.remove();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ================================================================
     LƯU / KHÔI PHỤC
     ================================================================ */
  function save() {
    try {
      var s = state.session;
      if (!s) return;
      localStorage.setItem(STORE_KEY, JSON.stringify({
        v: 1, chapterId: s.chapterId, chapterLabel: s.chapterLabel, sec: s.sec,
        items: s.items, idx: s.idx, answers: s.answers,
        elapsed: s.finished ? s.elapsed : elapsed(),
        finished: s.finished, running: !s.finished, opts: s.opts,
        res: state.lastResult
      }));
    } catch (e) { /* localStorage đầy hoặc bị chặn */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || d.v !== 1 || !d.items || !d.items.length) return null;
      return d;
    } catch (e) { return null; }
  }

  function showResume(d) {
    var bar = document.createElement("div");
    bar.id = "resumeBar";
    bar.className = "setup-panel";
    bar.style.flexDirection = "row";
    bar.style.alignItems = "center";
    bar.style.justifyContent = "space-between";
    bar.style.gap = "14px";
    var p = document.createElement("p");
    p.className = "pool-info";
    p.style.margin = "0";
    p.textContent = "Bạn có bài làm dở: " + d.chapterLabel + " — " +
      (Object.keys(d.answers || {}).length) + "/" + d.items.length + " câu đã trả lời." +
      (d.finished ? " (đã nộp)" : "");
    bar.appendChild(p);
    var wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.gap = "8px";
    var b1 = document.createElement("button");
    b1.className = "btn primary";
    b1.textContent = d.finished ? "Xem kết quả" : "Tiếp tục";
    b1.addEventListener("click", function () {
      state.session = {
        chapterId: d.chapterId, chapterLabel: d.chapterLabel, sec: d.sec,
        items: d.items, idx: d.idx || 0, answers: d.answers || {},
        startedAt: Date.now(), elapsed: d.elapsed || 0,
        running: !d.finished, opts: d.opts, finished: !!d.finished
      };
      state.lastResult = d.res || null;
      bar.remove();
      if (d.finished) { if (!state.lastResult) finish(); else { renderResult(); showView("result"); } }
      else { showView("quiz"); startTimer(); renderQuiz(); }
    });
    var b2 = document.createElement("button");
    b2.className = "btn ghost";
    b2.textContent = "Bỏ";
    b2.addEventListener("click", function () { localStorage.removeItem(STORE_KEY); bar.remove(); });
    wrap.appendChild(b1); wrap.appendChild(b2);
    bar.appendChild(wrap);
    var main = $("viewSetup");
    main.insertBefore(bar, main.firstChild.nextSibling);
  }

  /* ================================================================
     MENU DI ĐỘNG
     ================================================================ */
  function openMenu() { $("sidebar").classList.add("open"); $("scrim").classList.add("show"); }
  function closeMenu() { $("sidebar").classList.remove("open"); $("scrim").classList.remove("show"); }

  /* ================================================================
     GẮN SỰ KIỆN + KHỞI ĐỘNG
     ================================================================ */
  function bind() {
    $("btnMenu").addEventListener("click", openMenu);
    $("btnCloseMenu").addEventListener("click", closeMenu);
    $("scrim").addEventListener("click", closeMenu);

    $("btnTheme").addEventListener("click", function () {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
      $("btnTheme").textContent = dark ? "🌙" : "☀️";
      try { localStorage.setItem("tthcm.theme", dark ? "light" : "dark"); } catch (e) {}
    });

    $("selChapter").addEventListener("change", function () { selectChapter(this.value); });
    $("selSection").addEventListener("change", function () {
      state.sec = this.value; renderTOC(); updatePoolInfo();
    });
    $("selCount").addEventListener("change", function () { syncCountInput(); updatePoolInfo(); });
    $("numCount").addEventListener("input", updatePoolInfo);
    $("numCount").addEventListener("change", updatePoolInfo);
    $("btnStart").addEventListener("click", onStart);

    $("btnPreview").addEventListener("click", openPreview);
    $("btnPreviewBack").addEventListener("click", function () {
      showView("setup");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    $("btnPreviewStart").addEventListener("click", onStart);
    $("previewSearch").addEventListener("input", renderPreview);
    $("previewSearch").addEventListener("search", renderPreview);

    $("btnPrev").addEventListener("click", function () { go(-1); });
    $("btnNext").addEventListener("click", function () { go(1); });
    $("btnGrid").addEventListener("click", function () {
      var g = $("jumpGrid");
      g.classList.toggle("hidden");
      if (!g.classList.contains("hidden")) renderGrid();
    });
    $("btnFinish").addEventListener("click", function () {
      var s = state.session;
      var un = s ? s.items.length - Object.keys(s.answers).length : 0;
      if (un > 0) {
        askConfirm("Còn " + un + " câu chưa trả lời",
          "Bạn còn " + un + " câu chưa trả lời. Vẫn nộp bài và xem kết quả?",
          "Vẫn nộp bài", finish);
        return;
      }
      finish();
    });
    $("btnQuit").addEventListener("click", function () {
      askConfirm("Thoát bài làm?",
        "Tiến độ bài làm hiện tại sẽ bị xoá và bạn sẽ quay về trang chọn chương.",
        "Thoát bài làm", goHome, true);
    });
    $("btnRedo").addEventListener("click", function () {
      var s = state.session;
      var ch = chapter(s.chapterId);
      var pool = poolFor(s.chapterId, s.sec);
      startSession(pool, s.opts && s.opts.shuffleQ ? pool.length : s.items.length,
                   s.opts, s.chapterLabel);
    });
    $("btnRedoWrong").addEventListener("click", function () {
      var s = state.session;
      var wrong = [];
      s.items.forEach(function (it, i) {
        if (s.answers[i] !== it.correct) wrong.push(it);
      });
      if (!wrong.length) return;
      var opts = { shuffleQ: false, shuffleO: s.opts.shuffleO, instant: s.opts.instant };
      state.session = {
        chapterId: s.chapterId, chapterLabel: "Câu sai · " + s.chapterLabel, sec: s.sec,
        items: wrong, idx: 0, answers: {}, startedAt: Date.now(), elapsed: 0,
        running: true, opts: opts, finished: false
      };
      save(); showView("quiz"); startTimer(); renderQuiz();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    $("btnHome").addEventListener("click", function () {
      if (state.session) { state.session = null; }
      localStorage.removeItem(STORE_KEY);
      showView("setup");
      var b = $("resumeBar"); if (b) b.remove();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    document.addEventListener("keydown", function (e) {
      if (!$("modal").classList.contains("hidden")) {
        if (e.key === "Escape") { closeModal(); e.preventDefault(); }
        return;
      }
      if ($("viewQuiz").classList.contains("hidden")) return;
      var k = e.key.toLowerCase();
      var s = state.session;
      if (!s) return;
      if (k === "arrowright") { go(1); e.preventDefault(); }
      else if (k === "arrowleft") { go(-1); e.preventDefault(); }
      else if (/^[1-4]$/.test(k)) { answer("ABCD"[+k - 1]); }
      else if (/^[a-d]$/.test(k)) { answer(k.toUpperCase()); }
    });

    window.addEventListener("beforeunload", function () { if (state.session) save(); });
  }

  function init() {
    try {
      var th = localStorage.getItem("tthcm.theme");
      if (th) { document.documentElement.setAttribute("data-theme", th); $("btnTheme").textContent = th === "dark" ? "☀️" : "🌙"; }
    } catch (e) {}
    $("subtitle").textContent = TOTAL.toLocaleString("vi-VN") + " câu hỏi · " + CHAPTERS.length + " chương";
    $("heroSub").innerHTML = "Bộ đề gồm <b>" + TOTAL.toLocaleString("vi-VN") +
      " câu hỏi</b> trắc nghiệm, chia thành <b>" + CHAPTERS.length +
      " chương</b> theo đúng mục lục của giáo trình. Mỗi câu đã có sẵn đáp án đúng.";
    if (CHAPTERS.length) state.chapterId = CHAPTERS[0].id;
    initModal();
    bind();
    renderTOC();
    renderChapterCards();
    fillSelects();
    syncCountInput();
    updatePoolInfo();
    showView("setup");
    var d = load();
    if (d) showResume(d);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
