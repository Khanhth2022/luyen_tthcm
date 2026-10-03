# -*- coding: utf-8 -*-
"""Chan doan: cau truc muc, cau hoi bat thuong, do tin cay cua dau hieu bold."""
import sys, os, re, json
from collections import Counter
ROOT = r"C:\Users\dell\Downloads\luyen_tthcm"
sys.path.insert(0, os.path.join(ROOT, ".pylibs"))

# Tai lai TEXT/BOLD bang cach chay lai phan dau cua parse_quiz2
exec(open(os.path.join(ROOT, "tools", "parse_quiz2.py"), encoding="utf-8").read().split("# ---------------- Muc luc")[0])

print("\n===== DONG DAM NGAN (ung vien tieu de muc) =====")
lines = []
pos = 0
for ln in TEXT.split("\n"):
    lines.append((pos, ln))
    pos += len(ln) + 1

for p, ln in lines:
    t = ln.strip()
    if not t or len(t) > 90:
        continue
    if not t[0].isupper():
        continue
    b = BOLD[p:p + len(ln)]
    if not b or sum(b) / len(b) < 0.9:
        continue
    if re.match(r"^Câu\s+\d+", t):
        continue
    if re.match(r"^[A-H]\s*[.:]\s", t):
        continue
    print(f"{p:>7} | {t}")

print("\n===== PHAN BO DO DAM CAO NHAT =====")
qs = json.load(open(os.path.join(ROOT, "build", "quiz_raw.json"), encoding="utf-8"))
c = Counter()
for q in qs:
    c[round(max(o["bold"] for o in q["options"]), 1)] += 1
for k in sorted(c):
    print(f"  {k}: {c[k]}")

print("\n===== CAU CO != 4 PHUONG AN =====")
for q in qs:
    if len(q["options"]) != 4:
        print("---", q["soCau"], "ans=", q["answer"], "n=", len(q["options"]))
        print("   ", q["stem"][:150].replace("\n", " | "))
        for o in q["options"]:
            print("    ", o["key"], o["bold"], o["text"][:70].replace("\n", " | "))

print("\n===== CAU KHONG XAC DINH DUOC DAP AN =====")
for q in qs:
    if not q["answer"]:
        print("---", q["soCau"])
        print("   ", q["stem"][:200].replace("\n", " | "))
        for o in q["options"]:
            print("    ", o["key"], o["bold"], o["text"][:90].replace("\n", " | "))
