# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, r"C:\Users\dell\Downloads\luyen_tthcm\.pylibs")
from pypdf import PdfReader

reader = PdfReader(r"C:\Users\dell\Downloads\luyen_tthcm\BỘ ĐA MÔN TTHCM.pdf")
for pno in (5, 6):
    page = reader.pages[pno]
    print("########## PAGE", pno + 1)
    runs = []

    def visitor(text, cm, tm, font_dict, font_size):
        if text and text.strip():
            runs.append((text, str((font_dict or {}).get("/BaseFont") or "?")))

    page.extract_text(visitor_text=visitor)
    joined = "".join(t for t, _ in runs)
    k = joined.find("A.")
    print("found A at", k)
    for t, f in runs:
        print(repr(t[:40]), "|", f)
    print()
