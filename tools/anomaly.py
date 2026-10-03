# -*- coding: utf-8 -*-
"""Bao cao bat thuong ngan gon."""
import sys, os, re, json
from collections import Counter
ROOT = r"C:\Users\dell\Downloads\luyen_tthcm"
qs = json.load(open(os.path.join(ROOT, "build", "quiz_raw.json"), encoding="utf-8"))

print("TONG SO CAU:", len(qs))
print("do dam cao nhat:", dict(sorted(Counter(round(max(o["bold"] for o in q["options"]), 1) for q in qs).items())))

print("\n--- cau != 4 phuong an ---")
for q in qs:
    if len(q["options"]) != 4:
        print("Cau", q["soCau"], "ans=", q["answer"], "n=", len(q["options"]))
        print("   stem:", q["stem"][:160].replace("\n", " | "))
        for o in q["options"]:
            print("    ", o["key"], o["bold"], repr(o["text"][:60]))

print("\n--- cau khong ro dap an ---")
for q in qs:
    if not q["answer"]:
        print("Cau", q["soCau"])
        print("   stem:", q["stem"][:200].replace("\n", " | "))
        for o in q["options"]:
            print("    ", o["key"], o["bold"], repr(o["text"][:80]))

print("\n--- cau co 2 phuong an dam >= 0.5 ---")
for q in qs:
    hi = [o for o in q["options"] if o["bold"] >= 0.5]
    if len(hi) > 1:
        print("Cau", q["soCau"], "->", [(o["key"], o["bold"]) for o in hi])

print("\n--- so cau theo chuong (theo so cau) ---")
prev = None
runs = []
cur = []
for q in qs:
    if prev is not None and q["soCau"] != prev + 1:
        runs.append(cur)
        cur = []
    cur.append(q["soCau"])
    prev = q["soCau"]
runs.append(cur)
for r in runs:
    print(f"  {r[0]}..{r[-1]}  ({len(r)} cau)")
