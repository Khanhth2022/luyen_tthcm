/* Sinh các trang HTML tạm để chụp ảnh giao diện bằng Chrome headless. */
const fs = require("fs");
const path = require("path");
const WEB = "C:\\Users\\dell\\Downloads\\luyen_tthcm\\web";
const OUT = "C:\\Users\\dell\\Downloads\\luyen_tthcm\\build";

const html = fs.readFileSync(path.join(WEB, "index.html"), "utf8");
const fileUrl = (p) => "file:///" + p.replace(/\\/g, "/");

const base = html
  .replace(/(src|href)="style\.css"/, '$1="' + fileUrl(path.join(WEB, "style.css")) + '"')
  .replace(/(src|href)="data\.js"/, '$1="' + fileUrl(path.join(WEB, "data.js")) + '"')
  .replace(/(src|href)="app\.js"/, '$1="' + fileUrl(path.join(WEB, "app.js")) + '"');

const DRIVERS = {
  "01-home": "",
  "02-quiz": `
    var g = function (i) { return document.getElementById(i); };
    g("selCount").value = "10";
    g("optInstant").checked = false;
    g("btnStart").click();
    document.querySelectorAll("#qOptions .opt")[1].click();
  `,
  "03-quiz-instant": `
    var g = function (i) { return document.getElementById(i); };
    g("selCount").value = "10";
    g("optInstant").checked = true;
    g("btnStart").click();
    document.querySelectorAll("#qOptions .opt")[2].click();
  `,
  "04-result": `
    var g = function (i) { return document.getElementById(i); };
    g("selCount").value = "10";
    g("optInstant").checked = false;
    g("btnStart").click();
    for (var i = 0; i < 10; i++) {
      var o = document.querySelectorAll("#qOptions .opt");
      o[i % o.length].click();
      g("btnNext").click();
    }
    g("btnFinish").click();
  `,
  "05-toc": `
    var g = function (i) { return document.getElementById(i); };
    g("btnMenu").click();
    g("sidebar").classList.add("open");
  `,
  "06-dark": `
    document.getElementById("btnTheme").click();
    document.getElementById("selChapter").value = "VI";
    document.getElementById("selChapter").dispatchEvent(new Event("change"));
  `,
  "07-phone": `
    var g = function (i) { return document.getElementById(i); };
    g("selCount").value = "10";
    g("btnStart").click();
    document.querySelectorAll("#qOptions .opt")[0].click();
  `,
  "08-diag": `
    var g = function (i) { return document.getElementById(i); };
    g("selCount").value = "10";
    g("btnStart").click();
    window.setTimeout(function () {
      var vw = document.documentElement.clientWidth;
      var bad = [];
      document.querySelectorAll("*").forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > vw + 1) {
          var tag = el.tagName.toLowerCase();
          var id = el.id ? "#" + el.id : "";
          var cl = (typeof el.className === "string" && el.className) ? "." + el.className.trim().split(/\\s+/).join(".") : "";
          bad.push(tag + id + cl + " | right=" + Math.round(r.right) + " w=" + Math.round(r.width));
        }
      });
      document.body.innerHTML = "<pre id='diag' style='white-space:pre-wrap;font:12px monospace;padding:8px'>viewport=" + vw +
        " scrollWidth=" + document.documentElement.scrollWidth + "\\n" + bad.join("\\n") + "</pre>";
    }, 400);
  `,
  "09-custom-count": `
    var g = function (i) { return document.getElementById(i); };
    g("selCount").value = "custom";
    g("selCount").dispatchEvent(new Event("change"));
    g("numCount").value = "75";
    g("numCount").dispatchEvent(new Event("input"));
  `,
  "10-preview": `
    document.getElementById("btnPreview").click();
  `,
  "11-preview-search": `
    var g = function (i) { return document.getElementById(i); };
    g("btnPreview").click();
    g("previewSearch").value = "đạo đức";
    g("previewSearch").dispatchEvent(new Event("input"));
  `,
  "12-modal-quiz": `
    var g = function (i) { return document.getElementById(i); };
    g("selCount").value = "10";
    g("optInstant").checked = false;
    g("btnStart").click();
    document.querySelectorAll("#qOptions .opt")[0].click();
    g("btnNext").click();
    document.querySelectorAll("#qOptions .opt")[1].click();
    document.querySelectorAll("#toc .toc-ch > button")[3].click();
  `,
  "13-modal-result": `
    var g = function (i) { return document.getElementById(i); };
    g("selCount").value = "10";
    g("optInstant").checked = false;
    g("btnStart").click();
    for (var i = 0; i < 10; i++) {
      var o = document.querySelectorAll("#qOptions .opt");
      o[i % o.length].click();
      g("btnNext").click();
    }
    g("btnFinish").click();
    document.querySelectorAll("#toc .toc-ch > button")[2].click();
  `,
  "14-preview-dark": `
    document.getElementById("btnTheme").click();
    document.getElementById("selChapter").value = "VI";
    document.getElementById("selChapter").dispatchEvent(new Event("change"));
    document.getElementById("btnPreview").click();
  `
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, driver] of Object.entries(DRIVERS)) {
  const inject = driver
    ? `<script>window.addEventListener("load", function(){ ${driver} });</script>`
    : "";
  const out = name === "07-phone"
    ? base.replace("</body>", inject + "</body>")
    : base.replace("</body>", inject + "</body>");
  fs.writeFileSync(path.join(OUT, "shot_" + name + ".html"), out, "utf8");
}
console.log("đã tạo " + Object.keys(DRIVERS).length + " trang chụp ảnh trong " + OUT);
