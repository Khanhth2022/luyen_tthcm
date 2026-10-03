# -*- coding: utf-8 -*-
"""Probe spurious intra-word spaces produced by the PDF text layer."""
import re, sys, collections, unicodedata

sys.path.insert(0, r"C:\Users\dell\Downloads\luyen_tthcm\.pylibs")
from pypdf import PdfReader

PDF = "C:\\Users\\dell\\Downloads\\luyen_tthcm\\B\u1ed8 \u0110A M\u00d4N TTHCM.pdf"

TONE = set("áàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵ"
           "ắằẳẵặấầẩẫậếềểễệốồổỗộớờởỡợứừửữự")

reader = PdfReader(PDF)
full = "\n".join((p.extract_text() or "") for p in reader.pages)
print("chars:", len(full))

WORDCH = re.compile(r"[0-9A-Za-zÀ-ỹĐđ]")
pairs = collections.Counter()
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
    if a and b and b[0] in TONE:
        pairs[(a, b)] += 1

print("distinct pairs:", len(pairs), "total occ:", sum(pairs.values()))
for (a, b), n in pairs.most_common(120):
    print(f"{n:5d}  {a!r:22} + {b!r}")
