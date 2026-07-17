# Build REAL SF Pro woff files for Thinksmart Tool from the fonts installed in Windows.
# Subsets to Latin + full Vietnamese so files stay small but every glyph the proposals
# need (incl. typed Vietnamese client names) renders in the correct weight/style.
import os
from fontTools.subset import Subsetter, Options
from fontTools.ttLib import TTFont

WIN = r"C:\Windows\Fonts"
OUT = r"E:\2026\Thinksmart\Sale\Proposal2026\public\fonts"

# target-name -> source OTF installed in Windows
FONTS = {
    "SFProDisplay-Black":         "SF-Pro-Display-Black.otf",
    "SFProDisplay-Bold":          "SF-Pro-Display-Bold.otf",
    "SFProDisplay-Heavy":         "SF-Pro-Display-Heavy.otf",
    "SFProDisplay-Medium":        "SF-Pro-Display-Medium.otf",
    "SFProDisplay-Regular":       "SF-Pro-Display-Regular.otf",
    "SFProText-Bold":             "SF-Pro-Text-Bold.otf",
    "SFProText-Regular":          "SF-Pro-Text-Regular.otf",
    "SFProDisplay-RegularItalic": "SF-Pro-Display-RegularItalic.otf",
    "SFProDisplay-MediumItalic":  "SF-Pro-Display-MediumItalic.otf",
    "SFProDisplay-BoldItalic":    "SF-Pro-Display-BoldItalic.otf",
}

# Latin + Latin Ext + combining marks + Vietnamese (Latin Extended Additional)
# + punctuation/currency/misc symbols
UNICODES = "U+0000-024F,U+0300-036F,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2100-214F,U+2212"

for name, src in FONTS.items():
    path = os.path.join(WIN, src)
    font = TTFont(path)
    opts = Options()
    opts.flavor = "woff"
    opts.with_zopfli = True          # best woff (zlib) compression
    opts.layout_features = ["*"]     # keep kerning/ligatures so metrics match design
    opts.name_IDs = ["*"]            # keep full name table (local() matching, PDF metadata)
    opts.notdef_outline = True
    s = Subsetter(options=opts)
    s.populate(unicodes=[u for r in UNICODES.split(",")
                         for u in (range(int(r[2:].split("-")[0], 16),
                                         int(r.split("-")[1], 16) + 1)
                                   if "-" in r else [int(r[2:], 16)])])
    s.subset(font)
    out = os.path.join(OUT, name + ".woff")
    font.save(out)
    print(f"{name}.woff  {os.path.getsize(out):,} bytes  (from {src})")
print("DONE")
