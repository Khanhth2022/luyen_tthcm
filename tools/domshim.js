/* DOM giả tối thiểu dùng để chạy thử web/ (không cần trình duyệt). */
const fs = require("fs");
const VOID = new Set(["input", "br", "img", "meta", "link", "hr", "source"]);

class Style {
  constructor() { this._p = {}; }
  setProperty(k, v) { this._p[k] = String(v); }
}

class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = []; this.parentNode = null; this.attrs = {};
    this._cls = []; this._listeners = {}; this._value = undefined;
    this.style = new Style(); this.disabled = false; this.checked = false;
  }
  get classList() {
    const self = this;
    return {
      add(...c) { c.forEach((x) => { if (!self._cls.includes(x)) self._cls.push(x); }); },
      remove(...c) { self._cls = self._cls.filter((x) => !c.includes(x)); },
      contains(c) { return self._cls.includes(c); },
      toggle(c, force) {
        const on = force === undefined ? !self._cls.includes(c) : !!force;
        if (on) { if (!self._cls.includes(c)) self._cls.push(c); } else self._cls = self._cls.filter((x) => x !== c);
      }
    };
  }
  set className(v) { this._cls = String(v || "").split(/\s+/).filter(Boolean); }
  get className() { return this._cls.join(" "); }
  get value() {
    if (this._value !== undefined) return this._value;
    if (this.tagName === "SELECT") {
      const o = this.children.find((c) => typeof c !== "string" && c.tagName === "OPTION");
      return o ? (o.attrs.value || "") : "";
    }
    return "";
  }
  set value(v) { this._value = String(v); }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
    if (k === "id") this.id = v;
    if (k === "class") this._cls = String(v).split(/\s+/).filter(Boolean);
  }
  getAttribute(k) { return this.attrs[k]; }
  hasAttribute(k) { return k in this.attrs; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  insertBefore(n, ref) {
    n.parentNode = this;
    const i = ref ? this.children.indexOf(ref) : -1;
    if (i < 0) this.children.push(n); else this.children.splice(i, 0, n);
    return n;
  }
  remove() {
    if (!this.parentNode) return;
    const i = this.parentNode.children.indexOf(this);
    if (i >= 0) this.parentNode.children.splice(i, 1);
    this.parentNode = null;
  }
  get firstChild() { return this.children[0] || null; }
  get nextSibling() {
    if (!this.parentNode) return null;
    const i = this.parentNode.children.indexOf(this);
    return this.parentNode.children[i + 1] || null;
  }
  get textContent() { return this.children.map((c) => (typeof c === "string" ? c : c.textContent)).join(""); }
  set textContent(v) {
    this.children = v === "" || v == null ? [] : [String(v)];
  }
  set innerHTML(html) { this.children = parseHTML(String(html == null ? "" : html), this); }
  get innerHTML() { return this.children.map((c) => (typeof c === "string" ? c : "<" + c.tagName.toLowerCase() + ">")).join(""); }
  querySelector(sel) { return this._find(sel, false)[0] || null; }
  querySelectorAll(sel) { return this._find(sel, true); }
  _find(sel, all) {
    const out = [];
    const walk = (node) => {
      for (const c of node.children) {
        if (typeof c === "string") continue;
        let hit = false;
        if (sel.startsWith(".")) hit = c._cls.includes(sel.slice(1));
        else if (sel.startsWith("#")) hit = c.id === sel.slice(1);
        else hit = c.tagName === sel.toUpperCase();
        if (hit) {
          out.push(c);
          if (!all) return;
        }
        walk(c);
        if (!all && out.length) return;
      }
    };
    walk(this);
    return out;
  }
  addEventListener(t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn); }
  fire(t, ev) {
    (this._listeners[t] || []).forEach((f) => f.call(this, Object.assign({ type: t, preventDefault() {} }, ev || {})));
  }
  click() { this.fire("click"); }
}

function parseHTML(html, parent) {
  const nodes = [];
  const stack = [{ kids: nodes }];
  const re = /<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>/g;
  let last = 0, m;
  const text = (s) => { if (s) stack[stack.length - 1].kids.push(s); };
  while ((m = re.exec(html))) {
    text(html.slice(last, m.index));
    last = re.lastIndex;
    if (m[1] === "/") { if (stack.length > 1) stack.pop(); continue; }
    const el = new El(m[2]);
    for (const a of m[3].matchAll(/([a-zA-Z0-9_-]+)(?:="([^"]*)")?/g)) {
      if (!a[1]) continue;
      el.setAttribute(a[1], a[2] === undefined ? "" : a[2]);
    }
    stack[stack.length - 1].kids.push(el);
    if (!VOID.has(m[2].toLowerCase()) && m[4] !== "/") stack.push({ el, kids: (el.children = []) });
  }
  text(html.slice(last));
  const link = (ns, par) => { for (const n of ns) if (typeof n !== "string") { n.parentNode = par; link(n.children, n); } };
  link(nodes, parent);
  return nodes;
}

/* Tạo một "trang" mới. store có thể được truyền vào để mô phỏng tải lại trang. */
function createPage(html, store) {
  const root = new El("html");
  const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  root.children = parseHTML(bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, ""), root);

  const docListeners = {};
  const document = {
    readyState: "complete",
    documentElement: {
      _t: "light",
      setAttribute(k, v) { if (k === "data-theme") this._t = v; },
      getAttribute(k) { return k === "data-theme" ? this._t : null; }
    },
    getElementById(id) {
      let hit = null;
      (function walk(n) {
        for (const c of n.children) {
          if (typeof c === "string" || hit) continue;
          if (c.id === id) { hit = c; return; }
          walk(c);
        }
      })(root);
      return hit;
    },
    createElement: (t) => new El(t),
    addEventListener(t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); },
    body: root
  };

  const storage = store || new Map();
  const localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k)
  };

  const winListeners = {};
  const window = {
    QUIZ_DATA: null,
    scrollTo() {},
    addEventListener(t, fn) { (winListeners[t] = winListeners[t] || []).push(fn); }
  };

  const api = {
    document, window, localStorage, store: storage,
    get: (id) => document.getElementById(id),
    key(k) { (docListeners.keydown || []).forEach((f) => f({ type: "keydown", key: k, preventDefault() {} })); },
    unload() { (winListeners.beforeunload || []).forEach((f) => f({ type: "beforeunload" })); }
  };
  return api;
}

function runApp(page, appCode) {
  const g = {
    window: page.window, document: page.document, localStorage: page.localStorage,
    console, confirm: () => true, setTimeout, clearTimeout, setInterval, clearInterval,
    Math, JSON, Object, Array, String, Number, Boolean, parseInt, parseFloat, Date,
    RegExp, Error, isNaN, Set, Map
  };
  const names = Object.keys(g);
  new Function(...names, appCode)(...names.map((n) => g[n]));
}

module.exports = { createPage, runApp, El, parseHTML };
