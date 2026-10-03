# -*- coding: utf-8 -*-
"""Structure probe: chapter offsets vs question-number runs, and space-repair viability."""
import re, sys, collections

sys.path.insert(0, r"C:\Users\dell\Downloads\luyen_tthcm\.pylibs")
from pypdf import PdfReader

PDF = "C:\\Users\\dell\\Downloads\\luyen_tthcm\\B\u1ed8 \u0110A M\u00d4N TTHCM.pdf"

reader = PdfReader(PDF)
pages = []
for i, p in enumerate(reader.pages, 1):
    pages.append((i, p.extract_text() or ""))
full = "\n".join(t for _, t in pages)
print("chars:", len(full))

# page index -> char offset
offsets, pos = [], 0
for n, t in pages:
    offsets.append((pos, n))
    pos += len(t) + 1

def page_of(idx):
    best = None
    for o, n in offsets:
        if o <= idx:
            best = n
    return best

# chapter headings
print("\n=== CHUONG headings ===")
for m in re.finditer(r"Ch\u01b0\u01a1ng\s+([IVX]+)\b", full):
    seg = full[m.start():m.start() + 90].replace("\n", " | ")
    print(f"off={m.start():7d} page={page_of(m.start()):4d}  {seg}")

# question markers
print("\n=== CAU runs ===")
qms = [(m.start(), int(m.group(1))) for m in re.finditer(r"C\u00e2u\s*(\d+)\s*[:.]", full)]
print("total question markers:", len(qms))
runs, cur = [], [qms[0]]
for off, n in qms[1:]:
    if n == cur[-1][1] + 1:
        cur.append((off, n))
    else:
        runs.append(cur)
        cur = [(off, n)]
runs.append(cur)
for r in runs:
    print(f"  run {r[0][1]}..{r[-1][1]}  n={len(r)}  page {page_of(r[0][0])}..{page_of(r[-1][0])}")

# space repair viability
WORDCH = re.compile(r"[0-9A-Za-z\u00c0-\u1ef9\u0110\u0111]")
TONE = set("\u00e1\u00e0\u1ea3\u00e3\u1ea1\u00e9\u00e8\u1ebb\u1ebd\u1eb9\u00ed\u00ec\u1ec9\u0129\u1ecb"
           "\u00f3\u00f2\u1ecf\u00f5\u1ecd\u00fa\u00f9\u1ee7\u0169\u1ee5\u00fd\u1ef3\u1ef7\u1ef9\u1ef5"
           "\u1eaf\u1eb1\u1eb3\u1eb5\u1eb7\u1ea5\u1ea7\u1ea9\u1eab\u1ead\u1ebf\u1ec1\u1ec3\u1ec5\u1ec7"
           "\u1ed1\u1ed3\u1ed5\u1ed7\u1ed9\u1edb\u1edd\u1edf\u1ee1\u1ee3\u1ee9\u1eeb\u1eed\u1eef\u1ef1")

words = collections.Counter(re.findall(r"[^\s]+", full))
joins = 0
kept = 0
samples = []
for m in re.finditer(r" (?=[^\s])", full):
    i = m.start()
    if i == 0:
        continue
    j = i
    while j > 0 and WORDCH.match(full[j - 1]):
        j -= 1
    k = i + 1
    while k < len(full) and WORDCH.match(full[k]):
        k += 1
    a, b = full[j:i], full[i + 1:k]
    if not a or not b or b[0] not in TONE:
        continue
    if words[a + b] > 0:
        joins += 1
        if len(samples) < 25:
            samples.append(f"{a}|{b} -> {a+b} (count={words[a+b]})")
    else:
        kept += 1
print(f"\n=== space repair: joinable={joins} keep={kept} ===")
for s in samples:
    print("  ", s)
