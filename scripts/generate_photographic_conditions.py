import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'lmcc-web', 'tests', 'fixtures')
PHOTO_DIR = os.path.join(BASE_DIR, 'photographic_conditions')
os.makedirs(PHOTO_DIR, exist_ok=True)

def render_base_label(lines, font_path="/System/Library/Fonts/Supplemental/Arial.ttf", font_size=26):
    width = 900
    height = 50 + len(lines) * 44 + 40
    img = Image.new('RGB', (width, height), (248, 248, 246))
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype(font_path, font_size)
    except Exception:
        font = ImageFont.load_default()

    # Draw packaging border
    draw.rectangle([(15, 15), (width - 15, height - 15)], outline=(190, 190, 190), width=2)

    y = 40
    for line in lines:
        draw.text((40, y), line, fill=(25, 25, 25), font=font)
        y += 44
    return img

STANDARD_LINES = [
    "PARLE-G ORIGINAL GLUCOSE BISCUITS",
    "MFD BY: PARLE PRODUCTS PVT LTD",
    "PLOT NO 14, INDUSTRIAL AREA, MUMBAI, MAHARASHTRA 400057",
    "NET WEIGHT: 250 g",
    "MFD: 08/2024",
    "MRP: Rs. 35.00 (INCL. OF ALL TAXES)",
    "CONSUMER CARE: 1800222211, care@parle.biz"
]

def main():
    base = render_base_label(STANDARD_LINES)

    # 1. Flat Real Packaging Simulation
    flat_path = os.path.join(PHOTO_DIR, 'condition_A_flat_label.png')
    base.save(flat_path)
    print("Generated:", flat_path)

    # 2. Reflective / Foil Specular Glare
    foil = base.copy()
    glare = Image.new('RGBA', foil.size, (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glare)
    # Draw an elliptical bright glare hotspot across the price/date lines
    g_draw.ellipse([(200, 180), (600, 320)], fill=(255, 255, 255, 175))
    glare = glare.filter(ImageFilter.GaussianBlur(radius=25))
    foil.paste(glare, (0, 0), glare)
    foil_path = os.path.join(PHOTO_DIR, 'condition_B_reflective_foil.png')
    foil.save(foil_path)
    print("Generated:", foil_path)

    # 3. Perspective / Angled Packaging (Camera held at 25-degree pitch/yaw)
    w, h = base.size
    # Quad transform: (x0, y0, x1, y1, x2, y2, x3, y3)
    # top-left, bottom-left, bottom-right, top-right
    coeffs = (40, 20, 0, h - 20, w, h - 60, w - 80, 50)
    perspective = base.transform((w, h), Image.QUAD, coeffs, Image.BILINEAR)
    persp_path = os.path.join(PHOTO_DIR, 'condition_C_perspective_angled.png')
    perspective.save(persp_path)
    print("Generated:", persp_path)

    # 4. Low-Light Packaging Photo (Underexposed, gamma reduced, shadow noise)
    low_light = base.copy()
    enhancer = ImageEnhance.Brightness(low_light)
    low_light = enhancer.enhance(0.42) # 42% brightness
    contrast_enhancer = ImageEnhance.Contrast(low_light)
    low_light = contrast_enhancer.enhance(0.85)
    low_path = os.path.join(PHOTO_DIR, 'condition_D_low_light.png')
    low_light.save(low_path)
    print("Generated:", low_path)

    # 5. Blurred / Out-of-Focus Packaging (Motion blur / defocus)
    blurred = base.copy().filter(ImageFilter.GaussianBlur(radius=2.8))
    blur_path = os.path.join(PHOTO_DIR, 'condition_E_blurred.png')
    blurred.save(blur_path)
    print("Generated:", blur_path)

    # 6. Curved Bottle / Can (Cylindrical distortion along x-axis)
    curved = Image.new('RGB', (w, h), (230, 230, 230))
    # Map vertical slices with sinusoidal compression towards edges
    for x in range(w):
        # Normalized x [-1, 1]
        nx = (x - w / 2) / (w / 2)
        # Squeeze edges
        src_x = int(w / 2 + math.sin(nx * math.pi / 2.3) * (w / 2))
        src_x = max(0, min(w - 1, src_x))
        slice_img = base.crop((src_x, 0, src_x + 1, h))
        curved.paste(slice_img, (x, 0))
    curved_path = os.path.join(PHOTO_DIR, 'condition_F_curved_can.png')
    curved.save(curved_path)
    print("Generated:", curved_path)

if __name__ == '__main__':
    main()
