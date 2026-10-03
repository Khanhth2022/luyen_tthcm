# -*- coding: utf-8 -*-
"""
Trich xuat cau hoi trac nghiem tu PDF (ban 2 - da sua loi offset bold).
Dap an dung = phuong an duoc in DAM.
"""
import sys, os, re, json
sys.path.insert(0, r"C:\Users\dell\Downloads\luyen_tthcm\.pylibs")
from pypdf import PdfReader

ROOT = r"C:\Users\dell\Downloads\luyen_tthcm"
SRC = os.path.join(ROOT, "BỘ ĐA MÔN TTHCM.pdf")
OUT = os.path.join(ROOT, "build")
os.makedirs(OUT, exist_ok=True)

reader = PdfReader(SRC)


def page_runs(page):
    out, buf, state = [], [], False

    def flush():
        if buf:
            out.append(("".join(buf), state))
            buf.clear()

    def visitor(text, cm, tm, font_dict, font_size):
        nonlocal state
        if not text:
            return
        if text.strip() == "":
            buf.append(text)
            return
        bold = "Bold" in str((font_dict or {}).get("/BaseFont") or "")
        if bold != state:
            flush()
            state = bold
        buf.append(text)

    page.extract_text(visitor_text=visitor)
    flush()
    return out


PAGES_TEXT = []
PAGES_BOLD = []
for pno, page in enumerate(reader.pages, 1):
    runs = page_runs(page)
    s = "".join(t for t, _ in runs)
    flags = []
    for t, b in runs:
        flags.extend([b] * len(t))
    assert len(s) == len(flags)
    # Bo dong chi chua so (so trang)
    keep = [True] * len(s)
    pos = 0
    for ln in s.split("\n"):
        if re.fullmatch(r"\s*\d{1,3}\s*", ln):
            for k in range(pos, pos + len(ln)):
                keep[k] = False
        pos += len(ln) + 1
    PAGES_TEXT.append("".join(c for c, k in zip(s, keep) if k))
    PAGES_BOLD.append([b for b, k in zip(flags, keep) if k])
    assert len(PAGES_TEXT[-1]) == len(PAGES_BOLD[-1])

# Gop, chuan hoa newline va giu dong bo
TEXT_PARTS, BOLD = [], []
for p, b in zip(PAGES_TEXT, PAGES_BOLD):
    out_p, out_b = [], []
    i, n = 0, len(p)
    while i < n:
        if p[i] == "\n":
            j = i
            while j < n and p[j] == "\n":
                j += 1
            out_p.append("\n")
            out_b.append(False)
            i = j
        else:
            out_p.append(p[i])
            out_b.append(b[i])
            i += 1
    TEXT_PARTS.append("".join(out_p))
    BOLD.extend(out_b)

TEXT = "".join(TEXT_PARTS)
assert len(TEXT) == len(BOLD)
print("chars:", len(TEXT))

# Ghi file co marker de kiem tra bang mat
with open(os.path.join(OUT, "annotated.txt"), "w", encoding="utf-8") as f:
    cur = None
    for ch, b in zip(TEXT, BOLD):
        if b != cur:
            f.write("\n[[B]]" if b else "\n[[/B]]")
            cur = b
        f.write(ch)


def ratio(a, b):
    seg = BOLD[a:b]
    if not seg:
        return 0.0
    return sum(1 for x in seg if x) / len(seg)


# ---------------- Muc luc tu trang 2-5 ----------------
TOC = "".join(TEXT_PARTS[:5])
toc_lines = [l.strip() for l in TOC.split("\n") if l.strip()]
with open(os.path.join(OUT, "toc.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(toc_lines))

# ---------------- Chuong ----------------
CH_RE = re.compile(r"(?:^|\n)\s*Chương\s+([IVX]+)\s*\n")
ch_positions = [(m.start(), m.group(1), m.end()) for m in CH_RE.finditer(TEXT)]
print("chapters:", [(c[1], c[0]) for c in ch_positions])

# ---------------- Cau hoi ----------------
Q_RE = re.compile(r"(?:^|\n)\s*Câu\s+(\d{1,3})\s*[:.]\s*")
qmatches = list(Q_RE.finditer(TEXT))
print("questions found:", len(qmatches))

body_start = ch_positions[0][0] if ch_positions else 0
qmatches = [m for m in qmatches if m.start() >= body_start]

OPT_RE = re.compile(r"(?:^|\n)\s*([A-H])\s*[.:]\s*")


def first_line_span(chunk, ostart, oend):
    """Tra ve (bat dau, ket thuc) cua dong khong rong dau tien trong chunk[ostart:oend]."""
    seg = chunk[ostart:oend]
    idx = 0
    while idx < len(seg):
        nl = seg.find("\n", idx)
        if nl == -1:
            nl = len(seg)
        line = seg[idx:nl]
        if line.strip():
            return ostart + idx, ostart + nl
        idx = nl + 1
    return ostart, oend


questions = []
for i, m in enumerate(qmatches):
    start = m.start()
    end = qmatches[i + 1].start() if i + 1 < len(qmatches) else len(TEXT)
    chunk = TEXT[start:end]
    opts = list(OPT_RE.finditer(chunk))
    if not opts:
        continue
    stem = chunk[:opts[0].start()].strip()
    options = []
    for j, om in enumerate(opts):
        ostart = om.end()
        oend = opts[j + 1].start() if j + 1 < len(opts) else len(chunk)
        otext = chunk[ostart:oend]
        la, lb = first_line_span(chunk, ostart, oend)
        options.append(dict(
            key=om.group(1),
            text=otext.strip(),
            bold=round(ratio(start + la, start + lb), 3),
        ))
    best = max(options, key=lambda o: o["bold"])
    answer = best["key"] if best["bold"] > 0.6 else None
    questions.append(dict(
        soCau=int(m.group(1)), pos=start, stem=stem, options=options,
        answer=answer, raw=chunk,
    ))

print("parsed:", len(questions))
from collections import Counter
print("phan bo dap an:", Counter(q["answer"] for q in questions))
print("so phuong an:", Counter(len(q["options"]) for q in questions))
noans = [q["soCau"] for q in questions if not q["answer"]]
print("khong co dap an:", noans[:40], "tong:", len(noans))

with open(os.path.join(OUT, "quiz_raw.json"), "w", encoding="utf-8") as f:
    json.dump(questions, f, ensure_ascii=False, indent=1)

# In thu vai cau co marker bold
for q in questions[:3]:
    print("---", q["soCau"], "ans=", q["answer"])
    print(q["stem"][:120].replace("\n", " | "))
    for o in q["options"]:
        print("   ", o["key"], o["bold"], o["text"][:90].replace("\n", " | "))
