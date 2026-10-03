# -*- coding: utf-8 -*-
"""Kiem tra xem visitor_text co nhan duoc ky tu xuong dong khong."""
import sys
sys.path.insert(0, r"C:\Users\dell\Downloads\luyen_tthcm\.pylibs")
from pypdf import PdfReader

reader = PdfReader(r"C:\Users\dell\Downloads\luyen_tthcm\BỘ ĐA MÔN TTHCM.pdf")
page = reader.pages[5]
runs = []


def visitor(text, cm, tm, font_dict, font_size):
    runs.append((text, tm))


page.extract_text(visitor_text=visitor)
for t, tm in runs[:40]:
    print(repr(t), "| tm=", tm)
print("...")
print("has newline in any run:", any("\n" in t for t, _ in runs))
print("num runs:", len(runs))
