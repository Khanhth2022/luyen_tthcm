# -*- coding: utf-8 -*-
"""Dump raw text for sample questions to confirm formatting."""
import re, sys

sys.path.insert(0, r"C:\Users\dell\Downloads\luyen_tthcm\.pylibs")
from pypdf import PdfReader

PDF = "C:\\Users\\dell\\Downloads\\luyen_tthcm\\B\u1ed8 \u0110A M\u00d4N TTHCM.pdf"
reader = PdfReader(PDF)
full = "\n".join((p.extract_text() or "") for p in reader.pages)

def show(pattern, before=0, after=700, label=""):
    print("=" * 70)
    print("### ", label or pattern)
    for m in re.finditer(pattern, full):
        s = full[max(0, m.start() - before): m.start() + after]
        print("-" * 50)
        print(repr(s))
        break

show(r"C\u00e2u\s*1\s*[:.]", 0, 900, "first question of doc")
show(r"C\u00e2u\s*165\s*[:.]", 0, 900, "Cau 165 (8 options bug)")
show(r"C\u00e2u\s*2\s*[:.]", 0, 700, "Cau 2 (no bold answer)")
show(r"C\u00e2u\s*106\s*[:.]", 0, 700, "Cau 106 last of ch1")
show(r"C\u00e2u\s*107\s*[:.]", 0, 700, "Cau 107 ch2 first")
