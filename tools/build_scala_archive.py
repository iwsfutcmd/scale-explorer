#!/usr/bin/env python3
"""
Parses the Scala scale archive (.scl files, https://www.huygens-fokker.org/docs/scales.zip)
into a compact JSON asset for scale-explorer's Scala Archive browser.

Usage: python3 build_scala_archive.py <scl_directory> <output.json>

Format reference: https://www.huygens-fokker.org/scala/scl_format.html
"""
import json
import math
import re
import sys
from math import gcd
from pathlib import Path


def parse_pitch_token(token):
    """Returns (cents, ratio_or_None) for one pitch line's leading token."""
    if "." in token:
        return float(token), None
    if "/" in token:
        num_s, den_s = token.split("/", 1)
        num, den = int(num_s), int(den_s)
    else:
        num, den = int(token), 1
    if num <= 0 or den <= 0:
        raise ValueError(f"non-positive ratio: {token}")
    g = gcd(num, den)
    num, den = num // g, den // g
    cents = 1200 * math.log2(num / den)
    return cents, [num, den]


def parse_scl(path):
    raw_lines = path.read_text(encoding="latin-1").splitlines()
    lines = [l for l in raw_lines if not l.lstrip().startswith("!")]
    if len(lines) < 2:
        raise ValueError("too few non-comment lines")
    desc = lines[0].strip()
    count = int(lines[1].strip())
    pitch_lines = lines[2 : 2 + count]
    if len(pitch_lines) != count:
        raise ValueError(f"expected {count} pitch lines, got {len(pitch_lines)}")
    cents_list = []
    ratio_list = []
    for line in pitch_lines:
        token = line.strip().split()[0]
        cents, ratio = parse_pitch_token(token)
        cents_list.append(round(cents, 5))
        ratio_list.append(ratio)
    return {
        "id": path.stem,
        "desc": desc,
        "n": count,
        "cents": cents_list,
        "ratio": ratio_list,
    }


def main():
    scl_dir = Path(sys.argv[1])
    out_path = Path(sys.argv[2])
    entries = []
    errors = []
    for f in sorted(scl_dir.glob("*.scl")):
        try:
            entries.append(parse_scl(f))
        except Exception as e:
            errors.append((f.name, str(e)))
    print(f"parsed {len(entries)} scales, {len(errors)} errors", file=sys.stderr)
    for name, err in errors[:30]:
        print(f"  ERROR {name}: {err}", file=sys.stderr)
    out_path.write_text(json.dumps(entries, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {out_path} ({out_path.stat().st_size:,} bytes)", file=sys.stderr)


if __name__ == "__main__":
    main()
