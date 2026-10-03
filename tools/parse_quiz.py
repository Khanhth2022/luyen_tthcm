# -*- coding: utf-8 -*-
"""
Trich xuat cau hoi trac nghiem tu PDF.
Dap an dung = phuong an duoc in DAM (font chua 'Bold').

Ket qua: build/quiz.json
  {
    "chapters": [ {id, title, soCau, questions:[...]}, ... ],
    "questions": [ {id, soCau, chapter, chapterTitle, section, stem, options:[{key,text,bold}], answer} ]
  }
"""
import sys, os, re, json, unicodedata
sys.path.insert(0, r"C:\Users\dell\Downloads\luyen_tthcm\.pylibs")
from pypdf import PdfReader

ROOT = r"C:\Users\dell\Downloads\luyen_tthcm"
SRC = os.path.join(ROOT, "BỘ ĐA MÔN TTHCM.pdf")
OUT = os.path.join(ROOT, "build")
os.makedirs(OUT, exist_ok=True)

reader = PdfReader(SRC)


def page_runs(page):
    """Tra ve list (text, bold) theo thu tu doc."""
    out = []
    state = False
    buf = []

    def flush():
        if buf:
            out.append(("".join(buf), state))
            buf.clear()

    def visitor(text, cm, tm, font_dict, font_size):
        nonlocal state
        if not text:
            return
        if text == "\n" or text.strip() == "":
            buf.append(text)
            return
        font = str((font_dict or {}).get("/BaseFont") or "")
        bold = "Bold" in font
        if bold != state:
            flush()
            state = bold
        buf.append(text)

    page.extract_text(visitor_text=visitor)
    flush()
    return out


def build_plain_bold(pages):
    plain_parts, bold_parts = [], []
    for pno, page in enumerate(pages, 1):
        runs = page_runs(page)
        ptext = "".join(t for t, _ in runs)
        # bo so trang: dong chi gom chu so
        lines = ptext.split("\n")
        # tinh lai: can map vi tri -> bold, nen lam theo tung ky tu
        chars, flags = [], []
        for t, b in runs:
            chars.append(t)
            flags.extend([b] * len(t))
        s = "".join(chars)
        assert len(s) == len(flags)
        # Xoa cac dong chi chua so (so trang)
        keep = [True] * len(s)
        pos = 0
        for ln in s.split("\n"):
            if re.fullmatch(r"\s*\d{1,3}\s*", ln):
                for k in range(pos, pos + len(ln)):
                    keep[k] = False
            pos += len(ln) + 1
        s2 = "".join(c for c, k in zip(s, keep) if k)
        f2 = [b for b, k in zip(flags, keep) if k]
        # bo cac dong trong lien tiep
        s2 = re.sub(r"\n{2,}", "\n", s2)
        # can lai flags sau khi gop newline: lam don gian bang cach rebuild
        plain_parts.append(s2)
        bold_parts.append(f2)
    return plain_parts, bold_parts


def merge(plain_parts, bold_parts):
    """Gop nhung phai dam bao plain va bold dong bo sau khi regex sua newline."""
    # Don gian: khong sua gi them, chi ghep
    P, B = [], []
    for p, b in zip(plain_parts, bold_parts):
        P.append(p)
        B.extend(b)
        B = B  # noop
    return "".join(P), B


def clean_and_align(plain_parts, bold_parts):
    """Chuan hoa plain va giu boldflags tuong ung tung ky tu."""
    P = []
    B = []
    for p, b in zip(plain_parts, bold_parts):
        assert len(p) == len(b), (len(p), len(b))
        # gop nhieu newline lien tiep thanh 1
        out_p, out_b = [], []
        i = 0
        n = len(p)
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
        P.append("".join(out_p))
        B.extend(out_b)
    return "".join(P), B


pages = list(reader.pages)
print("pages:", len(pages))
plain_parts, bold_parts = build_plain_bold(pages)
TEXT, BOLD = clean_and_align(plain_parts, bold_parts)
print("chars:", len(TEXT))

with open(os.path.join(OUT, "annotated.txt"), "w", encoding="utf-8") as f:
    # dump co marker
    cur = None
    for ch, b in zip(TEXT, BOLD):
        if b != cur:
            f.write("\n[[B]]" if b else "\n[[/B]]")
            cur = b
        f.write(ch)

# ---------- Tim chuong ----------
CH_RE = re.compile(r"Chương\s+([IVX]+)\s*\n")
chapters = []
for m in CH_RE.finditer(TEXT):
    chapters.append((m.start(), m.group(1)))
print("chapter markers:", len(chapters))

# ---------- Tim cau hoi ----------
Q_RE = re.compile(r"Câu\s+(\d{1,3})\s*[:.]\s*")
qmatches = list(Q_RE.finditer(TEXT))
print("question markers:", len(qmatches))

# Loc bo cac "Câu" trong muc luc (trang 2-5) va trong phan gioi thieu
body_start = TEXT.find("Chương I")
qmatches = [m for m in qmatches if m.start() > body_start]
print("question markers in body:", len(qmatches))

# Kiem tra so cau lien tuc
nums = [int(m.group(1)) for m in qmatches]
gaps = [(nums[i], nums[i + 1]) for i in range(len(nums) - 1) if nums[i + 1] != nums[i] + 1]
print("gaps:", gaps[:20])

OPT_RE = re.compile(r"(?:^|\n)\s*([A-D])\s*[.:]\s*")


def bold_ratio(a, b):
    seg = BOLD[a:b]
    if not seg:
        return 0.0
    return sum(1 for x in seg if x) / len(seg)


questions = []
for i, m in enumerate(qmatches):
    start = m.start()
    end = qmatches[i + 1].start() if i + 1 < len(qmatches) else len(TEXT)
    chunk = TEXT[start:end]
    opts = list(OPT_RE.finditer(chunk))
    if not opts:
        questions.append(dict(soCau=int(m.group(1)), stem=chunk[:400], options=[], answer=None, raw=chunk))
        continue
    stem = chunk[:opts[0].start()]
    options = []
    for j, om in enumerate(opts):
        ostart = om.end()
        oend = opts[j + 1].start() if j + 1 < len(opts) else len(chunk)
        otext = chunk[ostart:oend]
        # cat phan heading cua muc tiep theo neu co (dong bat dau bang I/II/III/IV/V/VI hoac so.)
        gpos = ostart - start
        b = bold_ratio(start + gpos, start + gpos + min(len(otext), 200))
        options.append(dict(key=om.group(1), text=otext, bold=round(b, 3)))
    # dap an = phuong an co bold ratio cao nhat
    best = max(options, key=lambda o: o["bold"])
    answer = best["key"] if best["bold"] > 0.5 else None
    questions.append(dict(soCau=int(m.group(1)), stem=stem, options=options, answer=answer, raw=chunk))

print("parsed questions:", len(questions))
noans = [q["soCau"] for q in questions if not q["answer"]]
print("khong xac dinh duoc dap an:", noans)
from collections import Counter
print("so phuong an:", Counter(len(q["options"]) for q in questions))
print("phan bo dap an:", Counter(q["answer"] for q in questions))

with open(os.path.join(OUT, "quiz_raw.json"), "w", encoding="utf-8") as f:
    json.dump(questions, f, ensure_ascii=False, indent=1)

# in thu vai cau
for q in questions[:2] + questions[104:107]:
    print("---", q["soCau"], "ans=", q["answer"])
    print(q["stem"][:150].replace("\n", " | "))
    for o in q["options"]:
        print("   ", o["key"], o["bold"], o["text"][:80].replace("\n", " | "))
