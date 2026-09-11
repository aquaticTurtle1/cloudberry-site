"""Alpha cutout for compositing planes.

usage: python cut.py in.png out.png [model] [--gamma 0.45] [--crop x0,y0,x1,y1]

The mask is computed on a brightened copy (dark subjects on dark night
backgrounds otherwise vanish into the ground) and applied to the original
pixels, so the delivered plane keeps the real grade.
"""
import sys
from PIL import Image, ImageOps
from rembg import remove, new_session

args = [a for a in sys.argv[1:]]
def opt(name, default=None):
    if name in args:
        i = args.index(name); v = args[i + 1]; del args[i:i + 2]; return v
    return default

gamma = float(opt("--gamma", "1"))
crop = opt("--crop")
src, dst = args[0], args[1]
model = args[2] if len(args) > 2 else "isnet-general-use"

orig = Image.open(src).convert("RGB")
work = orig
if crop:
    box = tuple(int(v) for v in crop.split(","))
    work = orig.crop(box)
probe = work
if gamma != 1:
    lut = [round(255 * (i / 255) ** gamma) for i in range(256)]
    probe = ImageOps.autocontrast(work.point(lut * 3), cutoff=0.5)

mask = remove(probe, session=new_session(model), only_mask=True, post_process_mask=True)
full = Image.new("L", orig.size, 0)
full.paste(mask, box[:2] if crop else (0, 0))
out = orig.copy(); out.putalpha(full)
out.save(dst)
print(dst, model, "alpha bbox:", full.getbbox())
