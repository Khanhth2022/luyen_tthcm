# -*- coding: utf-8 -*-
"""
Trich xuat cau hoi trac nghiem Tu tuong Ho Chi Minh tu PDF -> build/quiz.json

Dac diem da xac minh:
  - 6 chuong, danh so cau RESTART o moi chuong: 106 / 196 / 183 / 237 / 120 / 200
  - Dap an dung duoc in DAM  -> font BaseFont chua "Bold"
  - pypdf chen space sai vao giua tu tieng Viet -> sua bang tu-doi-chieu (self-consistency)
"""
import sys, os, re, json, collections

sys.path.insert(0, r"C:\Users\dell\Downloads\luyen_tthcm\.pylibs")
from pypdf import PdfReader

ROOT = r"C:\Users\dell\Downloads\luyen_tthcm"
SRC = os.path.join(ROOT, "B\u1ed8 \u0110A M\u00d4N TTHCM.pdf")
OUT = os.path.join(ROOT, "build")
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- 1. DOC PDF
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


TEXT_PARTS, BOLD = [], []
for page in reader.pages:
    s = ""
    flags = []
    for t, b in page_runs(page):
        s += t
        flags.extend([b] * len(t))
    # bo dong chi chua so trang
    keep = [True] * len(s)
    pos = 0
    for ln in s.split("\n"):
        if re.fullmatch(r"\s*\d{1,3}\s*", ln):
            for k in range(pos, pos + len(ln)):
                keep[k] = False
        pos += len(ln) + 1
    TEXT_PARTS.append("".join(c for c, k in zip(s, keep) if k))
    BOLD.extend(b for b, k in zip(flags, keep) if k)

TEXT = "".join(TEXT_PARTS)
assert len(TEXT) == len(BOLD)
print(f"[1] doc PDF: {len(TEXT)} ky tu")

# ------------------------------------------------- 2. SUA SPACE CHEN SAI
LETTER = re.compile(r"[0-9A-Za-z\u00c0-\u1ef9\u0110\u0111]")
TONE = set("\u00e1\u00e0\u1ea3\u00e3\u1ea1\u00e9\u00e8\u1ebb\u1ebd\u1eb9\u00ed\u00ec\u1ec9\u0129\u1ecb"
           "\u00f3\u00f2\u1ecf\u00f5\u1ecd\u00fa\u00f9\u1ee7\u0169\u1ee5\u00fd\u1ef3\u1ef7\u1ef9\u1ef5"
           "\u1eaf\u1eb1\u1eb3\u1eb5\u1eb7\u1ea5\u1ea7\u1ea9\u1eab\u1ead\u1ebf\u1ec1\u1ec3\u1ec5\u1ec7"
           "\u1ed1\u1ed3\u1ed5\u1ed7\u1ed9\u1edb\u1edd\u1edf\u1ee1\u1ee3\u1ee9\u1eeb\u1eed\u1eef\u1ef1")

words = collections.Counter(re.findall(r"[^\s]+", TEXT))
drop = set()
for m in re.finditer(r" (?=[^\s])", TEXT):
    i = m.start()
    if i == 0 or TEXT[i - 1] == "\n":
        continue
    j = i
    while j > 0 and LETTER.match(TEXT[j - 1]):
        j -= 1
    k = i + 1
    while k < len(TEXT) and LETTER.match(TEXT[k]):
        k += 1
    a, b = TEXT[j:i], TEXT[i + 1:k]
    if not a or not b or b[0] not in TONE or len(a) > 4:
        continue
    if words[a + b] >= 2:
        drop.add(i)

TEXT = "".join(c for i, c in enumerate(TEXT) if i not in drop)
BOLD = [b for i, b in enumerate(BOLD) if i not in drop]
assert len(TEXT) == len(BOLD)
print(f"[2] sua space: noi {len(drop)} cho")

# ------------------------------------------------------ 3. CHIA CAU HOI
Q_RE = re.compile(r"(?:^|\n)\s*C\u00e2u\s*(\d{1,3})\s*[:.]\s*")
marks = [(m.start(), m.end(), int(m.group(1))) for m in Q_RE.finditer(TEXT)]

runs, cur = [], [marks[0]]
for mk in marks[1:]:
    if mk[2] == cur[-1][2] + 1:
        cur.append(mk)
    else:
        runs.append(cur)
        cur = [mk]
runs.append(cur)
print(f"[3] {len(marks)} cau -> {len(runs)} nhom: " + ", ".join(f"{len(r)}" for r in runs))

CH_TITLES = [
    "KH\u00c1I NI\u1ec6M, \u0110\u1ed0I T\u01af\u1ee2NG, PH\u01af\u01a0NG PH\u00c1P NGHI\u00caN C\u1ee8U V\u00c0 \u00dd NGH\u0128A H\u1eccC T\u1eacP M\u00d4N T\u01af T\u01af\u1edeNG H\u1ed2 CH\u00cd MINH",
    "C\u01a0 S\u1ede, QU\u00c1 TR\u00ccNH H\u00ccNH TH\u00c0NH V\u00c0 PH\u00c1T TRI\u1ec2N T\u01af T\u01af\u1edeNG H\u1ed2 CH\u00cd MINH",
    "T\u01af T\u01af\u1edeNG H\u1ed2 CH\u00cd MINH V\u1ec0 \u0110\u1ed8C L\u1eacP D\u00c2N T\u1ed8C V\u00c0 CH\u1ee6 NGH\u0128A X\u00c3 H\u1ed8I",
    "T\u01af T\u01af\u1edeNG H\u1ed2 CH\u00cd MINH V\u1ec0 \u0110\u1ea2NG C\u1ed8NG S\u1ea2N VI\u1ec6T NAM V\u00c0 NH\u00c0 N\u01af\u1edaC C\u1ee6A NH\u00c2N D\u00c2N, DO NH\u00c2N D\u00c2N, V\u00cc NH\u00c2N D\u00c2N",
    "T\u01af T\u01af\u1edeNG H\u1ed2 CH\u00cd MINH V\u1ec0 \u0110\u1ea0I \u0110O\u00c0N K\u1ebeT TO\u00c0N D\u00c2N T\u1ed8C V\u00c0 \u0110O\u00c0N K\u1ebeT QU\u1ed0C T\u1ebe",
    "T\u01af T\u01af\u1edeNG H\u1ed2 CH\u00cd MINH V\u1ec0 V\u0102N H\u00d3A, \u0110\u1ea0O \u0110\u1ee8C, CON NG\u01af\u1edcI",
]
ROMAN = ["I", "II", "III", "IV", "V", "VI"]

# ------------------------------------------------------ 4. TACH PHUONG AN
UPPER = ("A-Z\u0110\u00c0\u00c1\u1ea2\u00c3\u1ea0\u0102\u1eae\u1eb0\u1eb2\u1eb4\u1eb6\u00c2"
         "\u1ea6\u1ea4\u1ea8\u1eaa\u1eac\u00c8\u00c9\u1eba\u1ebc\u1eb8\u00ca\u1ec0\u1ebe\u1ec2"
         "\u1ec4\u1ec6\u00cc\u00cd\u1ec8\u0128\u1eca\u00d2\u00d3\u1ece\u00d5\u1ecc\u00d4\u1ed2"
         "\u1ed0\u1ed4\u1ed6\u1ed8\u01a0\u1edc\u1eda\u1ede\u1ee0\u1ee2\u00d9\u00da\u1ee6\u0168"
         "\u1ee4\u01af\u1eea\u1ee8\u1eee\u1ef0\u1ef2\u00dd\u1ef6\u1ef8\u1ef4\u201c\"'(")

# phuong an co cham/dau ngoac, o dau dong
OPT_STRICT = re.compile(r"(?:^|\n)\s*([A-D])\s*[.):]\s*")
# phuong an bi dinh vao cau truoc (khong co cham) hoac nam giua dong
OPT_LOOSE = re.compile(
    r"(?:^|\n)\s*([A-D])(?:\s*[.):]\s*|\s+)"
    r"|(?<=\s)([A-D])\s*[.):]\s*"
    r"|(?<=\s)([A-D])\s+(?=[" + UPPER + r"])"
)
# tieu de muc (I., II., 1., 2., ...) bi dinh vao cuoi doan van
HEAD_ANY = re.compile(
    r"\s(?:\d{1,2}\.\s+[" + UPPER + r"]"
    r"|(?:I{1,3}|IV|V|VI|VII|VIII|IX|X)\s*[.\u2013-]\s+[" + UPPER + r"])"
)
# vai loi lap chu trong lop van ban PDF (da kiem tra thu cong)
ARTIFACT = [("s\u00e2u s\u1eafc s\u1eafc", "s\u00e2u s\u1eafc")]
fix_log = []


def pick_options(chunk):
    """Tra ve danh sach (start, end, key) cua 4 phuong an A-D."""
    strict = [(m.start(), m.end(), m.group(1)) for m in OPT_STRICT.finditer(chunk)]
    if len(strict) == 4 and strict[0][2] == "A" and strict[-1][2] == "D":
        return strict
    cand = []
    for m in OPT_LOOSE.finditer(chunk):
        cand.append((m.start(), m.end(), m.group(1) or m.group(2) or m.group(3)))
    want, kept, ei = ["A", "B", "C", "D"], [], 0
    for c in cand:
        if ei < 4 and c[2] == want[ei]:
            kept.append(c)
            ei += 1
    if len(kept) == 4:
        return kept
    return strict if len(strict) >= 2 else kept


def pretty(t, f):
    """Chuan hoa van ban + cat tieu de dinh vao; tra ve (text, do dam)."""
    m = HEAD_ANY.search(t)
    if m and m.start() > 0:
        t, f = t[:m.start()], f[:m.start()]
    while t and t[-1] in " \t\n":
        t, f = t[:-1], f[:-1]
    txt = re.sub(r"\s*\n\s*", " ", re.sub(r"[ \t]+", " ", t)).strip()
    for a, b in ARTIFACT:
        if a in txt:
            txt = txt.replace(a, b)
            fix_log.append(b)
    chars = [(c, b) for c, b in zip(t, f) if not c.isspace()]
    score = round(sum(b for _, b in chars) / len(chars), 3) if chars else 0.0
    return txt, score


questions = []
for ci, run in enumerate(runs):
    chap = ROMAN[ci] if ci < len(ROMAN) else f"?{ci}"
    for qi, (mk_start, mk_end, num) in enumerate(run):
        nxt = run[qi + 1][0] if qi + 1 < len(run) else None
        if nxt is None:
            # het chuong: cat truoc heading chuong ke tiep hoac het van ban
            nxt = len(TEXT)
            m2 = re.search(r"\n\s*Ch\u01b0\u01a1ng\s+[IVX]+\s*\n", TEXT[mk_end:])
            if m2:
                nxt = mk_end + m2.start()
        chunk = TEXT[mk_end:nxt]
        opts = pick_options(chunk)
        if len(opts) < 2:
            st, _ = pretty(chunk, BOLD[mk_end:mk_end + len(chunk)])
            questions.append(dict(chap=chap, n=num, stem=st, options=[], answer=None,
                                  warn="no-options"))
            continue
        stem_txt, _ = pretty(chunk[:opts[0][0]], BOLD[mk_end:mk_end + opts[0][0]])
        options = []
        for j, (s0, s1, key) in enumerate(opts):
            e = opts[j + 1][0] if j + 1 < len(opts) else len(chunk)
            txt, sc = pretty(chunk[s1:e], BOLD[mk_end + s1:mk_end + e])
            options.append(dict(key=key, text=txt, bold=sc))
        scored = sorted(options, key=lambda o: -o["bold"])
        answer = scored[0]["key"] if scored and scored[0]["bold"] >= 0.5 else None
        if len(scored) > 1 and scored[1]["bold"] >= 0.5:
            answer = None
        questions.append(dict(chap=chap, n=num, stem=stem_txt,
                              options=[dict(key=o["key"], text=o["text"], bold=o["bold"])
                                       for o in options],
                              answer=answer, pos=mk_start, raw=chunk[:600]))

print(f"[4] parse {len(questions)} cau")

# ------------------------------------------------------ 5. KIEM TRA
prob = [q for q in questions if not q["answer"] or len(q["options"]) != 4]
print(f"[5] cau bat thuong: {len(prob)}")
cnt = collections.Counter((q["chap"], len(q["options"])) for q in questions)
print("    so phuong an theo chuong:", dict(cnt))
for q in prob[:25]:
    print(f"    - {q['chap']} cau {q['n']}: ans={q['answer']} n={len(q['options'])} | {q['stem'][:70]}")

dist = collections.Counter(q["answer"] for q in questions)
print("    phan bo dap an:", dict(dist))

with open(os.path.join(OUT, "debug_problems.txt"), "w", encoding="utf-8") as f:
    for q in prob:
        f.write("=" * 70 + "\n")
        f.write(f"{q['chap']} cau {q['n']} ans={q['answer']} n={len(q['options'])}\n")
        f.write(f"STEM: {q['stem']!r}\n")
        f.write(f"RAW: {q.get('raw','')!r}\n")
        for o in q["options"]:
            f.write(f"  {o['key']} bold={o['bold']} :: {o['text']!r}\n")
    f.write(f"\nARTIFACT-FIX ({len(fix_log)}): {fix_log}\n")

# ------------------------------------------------------ 6. MUC CON (section)
HEADS = []
for m in HEAD_ANY.finditer(TEXT):
    le = TEXT.find("\n", m.end())
    if le < 0:
        le = len(TEXT)
    ttl = re.sub(r"\s+", " ", TEXT[m.start() + 1:le]).strip()
    if 6 <= len(ttl) <= 120:
        HEADS.append((m.start(), ttl))
print(f"[6] tim thay {len(HEADS)} tieu de muc")

bnds = []
for ci, run in enumerate(runs):
    lo = run[0][0]
    hi = run[-1][0] + 4000 if ci == len(runs) - 1 else runs[ci + 1][0][0]
    bnds.append((lo, hi))
for q in questions:
    i = ROMAN.index(q["chap"]) if q["chap"] in ROMAN else -1
    lo, hi = bnds[i] if i >= 0 else (0, len(TEXT))
    cand = [h for h in HEADS if lo <= h[0] < q["pos"] and h[0] < hi]
    q["sec"] = cand[-1][1] if cand else ""

# ------------------------------------------------------ 7. XUAT JSON
out = {"title": "C\u00c2U H\u1eceI TR\u1eaeC NGHI\u1ec6M T\u01af T\u01af\u1edeNG H\u1ed2 CH\u00cd MINH",
       "chapters": []}
for ci, run in enumerate(runs):
    chap = ROMAN[ci] if ci < len(ROMAN) else f"?{ci}"
    qs = [dict(n=q["n"], sec=q.get("sec", ""), stem=q["stem"], answer=q["answer"],
               options=[dict(key=o["key"], text=o["text"]) for o in q["options"]])
          for q in questions if q["chap"] == chap and q["options"]]
    out["chapters"].append(dict(id=chap, title=CH_TITLES[ci] if ci < len(CH_TITLES) else chap,
                                questions=qs))
with open(os.path.join(OUT, "quiz.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False)
tot = sum(len(c["questions"]) for c in out["chapters"])
print(f"[7] ghi build/quiz.json: {tot} cau / {len(out['chapters'])} chuong")
for c in out["chapters"]:
    secs = []
    for q in c["questions"]:
        if not secs or secs[-1][0] != q["sec"]:
            secs.append([q["sec"], 1])
        else:
            secs[-1][1] += 1
    print(f"    {c['id']:>4}: {len(c['questions']):4d} cau | {len(secs)} muc")
    for s, n in secs[:9]:
        print(f"            {n:4d}  {s[:72]}")
