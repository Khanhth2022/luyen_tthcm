# -*- coding: utf-8 -*-
"""Sinh web/data.js tu build/quiz.json (nap bang <script> nen mo bang file:// van chay)."""
import io, json, os

ROOT = r"C:\Users\dell\Downloads\luyen_tthcm"
src = os.path.join(ROOT, "build", "quiz.json")
dst = os.path.join(ROOT, "web", "data.js")

with io.open(src, encoding="utf-8") as f:
    data = json.load(f)

data["title"] = "C\u00c2U H\u1eceI TR\u1eaeC NGHI\u1ec6M T\u01af T\u01af\u1edeNG H\u1ed2 CH\u00cd MINH"

with io.open(dst, "w", encoding="utf-8", newline="\n") as f:
    f.write("/* Sinh tu dong tu build/quiz.json - khong sua tay. */\n")
    f.write("window.QUIZ_DATA = ")
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")

n = sum(len(c["questions"]) for c in data["chapters"])
print("wrote %s  (%d bytes, %d chuong, %d cau)"
      % (dst, os.path.getsize(dst), len(data["chapters"]), n))
for c in data["chapters"]:
    print("   %-4s %4d cau" % (c["id"], len(c["questions"])))
