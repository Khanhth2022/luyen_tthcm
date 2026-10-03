# -*- coding: utf-8 -*-
import sys, re, os
sys.path.insert(0, r"C:\Users\dell\Downloads\luyen_tthcm\.pylibs")
from pypdf import PdfReader

reader = PdfReader(r"C:\Users\dell\Downloads\luyen_tthcm\BỘ ĐA MÔN TTHCM.pdf")
page = reader.pages[5]
runs = []
state = False
buf = []


def flush():
    if buf:
        runs.append(("".join(buf), state))
        buf.clear()


def visitor(text, cm, tm, font_dict, font_size):
    global state
    if not text:
        return
    if text.strip() == "":
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
s = "".join(t for t, _ in runs)
flags = []
for t, b in runs:
    flags.extend([b] * len(t))
print("len s", len(s), "len flags", len(flags))
i = s.find("A. ")
print("--- context around A. ---")
print(repr(s[i - 120:i + 200]))
print("--- flags ---")
print("".join("B" if f else "." for f in flags[i - 120:i + 200]))
print("--- bold count in whole page:", sum(flags), "/", len(flags))
