# -*- coding: utf-8 -*-
"""Trich xuat text tung trang tu PDF de phan tich cau truc chuong/muc."""
import sys, os, json, io
sys.path.insert(0, r"C:\Users\dell\Downloads\luyen_tthcm\.pylibs")
from pypdf import PdfReader

SRC = r"C:\Users\dell\Downloads\luyen_tthcm\BỘ ĐA MÔN TTHCM.pdf"
OUT_DIR = r"C:\Users\dell\Downloads\luyen_tthcm\build"
os.makedirs(OUT_DIR, exist_ok=True)

reader = PdfReader(SRC)
print("pages:", len(reader.pages))
pages = []
for i, p in enumerate(reader.pages):
    try:
        t = p.extract_text() or ""
    except Exception as e:
        t = ""
        print("ERR page", i + 1, e)
    pages.append(t)

with open(os.path.join(OUT_DIR, "pages.json"), "w", encoding="utf-8") as f:
    json.dump(pages, f, ensure_ascii=False)

with open(os.path.join(OUT_DIR, "pages.txt"), "w", encoding="utf-8") as f:
    for i, t in enumerate(pages):
        f.write("\n\n===== PAGE %d =====\n" % (i + 1))
        f.write(t)

# Thong ke nhanh
empty = sum(1 for t in pages if len(t.strip()) < 20)
print("empty/near-empty pages:", empty)
print("total chars:", sum(len(t) for t in pages))
