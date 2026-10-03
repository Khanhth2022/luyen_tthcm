# -*- coding: utf-8 -*-
"""Kiem tra dinh dang (font/bold/color) va annotation de tim dap an dung."""
import sys, os, json
sys.path.insert(0, r"C:\Users\dell\Downloads\luyen_tthcm\.pylibs")
from pypdf import PdfReader

SRC = r"C:\Users\dell\Downloads\luyen_tthcm\BỘ ĐA MÔN TTHCM.pdf"
reader = PdfReader(SRC)

# 1) Annotations
print("=== ANNOTATIONS ===")
found = 0
for i, p in enumerate(reader.pages):
    annots = p.get("/Annots")
    if annots:
        for a in annots:
            try:
                o = a.get_object()
                sub = o.get("/Subtype")
                if sub not in ("/Link",):
                    print(i + 1, sub, dict(o))
                    found += 1
            except Exception as e:
                pass
print("non-link annots:", found)

# 2) Font info per text run on sample page
print("\n=== FONT RUNS page 6 ===")
page = reader.pages[5]


def visitor(text, cm, tm, font_dict, font_size):
    if text.strip():
        base = None
        if font_dict:
            base = font_dict.get("/BaseFont")
        print(repr(text[:60]), "| font=", base, "| size=", font_size)


page.extract_text(visitor_text=visitor)
