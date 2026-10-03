# -*- coding: utf-8 -*-
"""Tai wheel (kem phu thuoc) tu PyPI va giai nen vao .pylibs - chi trong thu muc lam viec."""
import sys, os, json, io, zipfile, urllib.request

DEST = r"C:\Users\dell\Downloads\luyen_tthcm\.pylibs"
os.makedirs(DEST, exist_ok=True)

PY_TAGS = ["cp312", "cp311", "cp310", "cp39", "cp38", "py3", "abi3"]
PLAT_TAGS = ["win_amd64", "win32", "any"]


def pick_file(meta):
    ver = meta["info"]["version"]
    files = meta["releases"][ver]
    wheels = [f for f in files if f["filename"].endswith(".whl")]
    # uu tien wheel thuan python / abi3 / win_amd64
    def score(fn):
        n = fn["filename"]
        s = 0
        if "win_amd64" in n:
            s += 100
        elif "win32" in n:
            s += 50
        if "cp312" in n:
            s += 40
        elif "abi3" in n or "py3-none-any" in n:
            s += 30
        if n.endswith("py3-none-any.whl"):
            s += 35
        return s
    wheels.sort(key=score, reverse=True)
    return wheels[0] if wheels else None


def get_meta(name):
    url = "https://pypi.org/pypi/%s/json" % name
    return json.load(urllib.request.urlopen(url, timeout=60))


def download(name):
    meta = get_meta(name)
    f = pick_file(meta)
    if not f:
        print("!! no wheel for", name)
        return None, meta
    print("  ->", f["filename"])
    data = urllib.request.urlopen(f["url"], timeout=300).read()
    z = zipfile.ZipFile(io.BytesIO(data))
    z.extractall(DEST)
    return f["filename"], meta


for pkg in sys.argv[1:]:
    print("PKG", pkg)
    fn, meta = download(pkg)
    if meta:
        deps = [d for d in (meta["info"].get("requires_dist") or []) if "extra ==" not in d]
        print("   requires:", deps)
print("DONE")
