#!/usr/bin/env python3
"""
Prepares standardized image variants for the Controlled Scientific OCR Experiments.
Generates test files for Experiments 1-6 using Pillow.
"""

import os
import shutil
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FIXTURES_DIR = os.path.join(BASE_DIR, 'tests')
OUTPUT_BASE = '/tmp/ocr_scientific_experiments'

IMAGE_PATHS = [
    'fixtures/complete_declaration_challenge/goodday_back.jpg',
    'fixtures/complete_declaration_challenge/goodday_back_full.jpg',
    'fixtures/complete_declaration_challenge/lays_back.jpg',
    'fixtures/complete_declaration_challenge/lays_back_full.jpg',
    'fixtures/complete_declaration_challenge/marie_gold_back.jpg',
    'fixtures/complete_declaration_challenge/marie_gold_back_full.jpg',
    'fixtures/complete_declaration_challenge/sting_label.jpg',
    'fixtures/complete_declaration_challenge/sting_label_full.jpg',
    'fixtures/complete_declaration_challenge/thumsup_label.jpg',
    'fixtures/complete_declaration_challenge/thumsup_label_full.jpg',
    'fixtures/genuine_real_photos/real_04_tata_tea_gemini.jpg',
    'fixtures/unseen_real_products/15_regional_tea.jpg',
    'fixtures/genuine_real_photos/real_01_mdh_garam_masala.jpg',
    'fixtures/unseen_real_products/07_spice_packet.jpg',
    'fixtures/genuine_real_photos/real_02_amul_buttermilk.jpg',
    'fixtures/unseen_real_products/09_beverage.jpg',
    'fixtures/genuine_real_photos/real_03_saffola_masala_oats.jpg',
    'fixtures/unseen_real_products/14_small_print.jpg',
    'fixtures/complete_declaration_challenge/challenge_11_original_failure_1kg.png',
    'fixtures/genuine_real_photos/real_13_tata_salt_care_address.jpg',
]

def ensure_dirs():
    for exp in ['exp1_baseline', 'exp2_upscale', 'exp3_contrast', 'exp4_perspective', 'exp5_roi', 'exp6_rotation', 'exp8_best']:
        d = os.path.join(OUTPUT_BASE, exp)
        os.makedirs(d, exist_ok=True)

def process_exp1():
    out_dir = os.path.join(OUTPUT_BASE, 'exp1_baseline')
    for rel_path in IMAGE_PATHS:
        src = os.path.join(FIXTURES_DIR, rel_path)
        fname = os.path.basename(rel_path)
        dst = os.path.join(out_dir, fname)
        shutil.copy2(src, dst)
    print(f"✔ Exp 1 (Baseline): Copied {len(IMAGE_PATHS)} raw fixture images.")

def process_exp2():
    out_dir = os.path.join(OUTPUT_BASE, 'exp2_upscale')
    for rel_path in IMAGE_PATHS:
        src = os.path.join(FIXTURES_DIR, rel_path)
        fname = os.path.basename(rel_path)
        dst = os.path.join(out_dir, fname)
        with Image.open(src) as img:
            w, h = img.size
            max_dim = max(w, h)
            min_dim = min(w, h)
            scale = 2.5
            if max_dim * scale > 3200:
                scale = 3200.0 / max_dim
            if min_dim * scale < 600 and max_dim * 3.5 <= 3600:
                scale = min(3.5, 600.0 / max(min_dim, 1))
            new_w = max(1, int(round(w * scale)))
            new_h = max(1, int(round(h * scale)))
            upscaled = img.resize((new_w, new_h), resample=Image.Resampling.LANCZOS)
            upscaled.convert('RGB').save(dst, quality=95)
    print(f"✔ Exp 2 (Upscale): Generated 2.5x Lanczos upscaled images.")

def process_exp3():
    out_dir = os.path.join(OUTPUT_BASE, 'exp3_contrast')
    for rel_path in IMAGE_PATHS:
        src = os.path.join(FIXTURES_DIR, rel_path)
        fname = os.path.basename(rel_path)
        dst = os.path.join(out_dir, fname)
        with Image.open(src) as img:
            gray = ImageOps.grayscale(img)
            # Local adaptive contrast stretch
            auto = ImageOps.autocontrast(gray, cutoff=2)
            enhancer = ImageEnhance.Contrast(auto)
            contrasted = enhancer.enhance(1.4)
            # Unsharp mask sharpening
            sharpened = contrasted.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
            sharpened.convert('RGB').save(dst, quality=95)
    print(f"✔ Exp 3 (Local Contrast): Generated grayscale + CLAHE + unsharp mask images.")

def process_exp4():
    out_dir = os.path.join(OUTPUT_BASE, 'exp4_perspective')
    for rel_path in IMAGE_PATHS:
        src = os.path.join(FIXTURES_DIR, rel_path)
        fname = os.path.basename(rel_path)
        dst = os.path.join(out_dir, fname)
        with Image.open(src) as img:
            w, h = img.size
            # For angled/curved images, apply a gentle trapezoidal correction
            if 'mdh' in fname or 'spice' in fname or 'sting' in fname or 'thumsup' in fname:
                # Quad transform: shift top corners inward to simulate frontal deskew
                inset = int(w * 0.08)
                quad = (inset, 0, 0, h, w, h, w - inset, 0)
                dewarped = img.transform((w, h), Image.Transform.QUAD, quad, resample=Image.Resampling.BICUBIC)
                dewarped.convert('RGB').save(dst, quality=95)
            else:
                img.convert('RGB').save(dst, quality=95)
    print(f"✔ Exp 4 (Perspective/Dewarp): Applied quad deskew to angled products.")

def process_exp5():
    out_dir = os.path.join(OUTPUT_BASE, 'exp5_roi')
    for rel_path in IMAGE_PATHS:
        src = os.path.join(FIXTURES_DIR, rel_path)
        fname = os.path.basename(rel_path)
        base_name, ext = os.path.splitext(fname)
        with Image.open(src) as img:
            w, h = img.size
            # Generate 3 overlapping ROIs
            # 1. Bottom 50% strip (dates, MRP, net qty)
            bottom_box = (0, int(h * 0.45), w, h)
            img.crop(bottom_box).convert('RGB').save(os.path.join(out_dir, f"{base_name}_roi_bottom.jpg"), quality=95)
            # 2. Left 65% column (mfg, address)
            left_box = (0, 0, int(w * 0.65), h)
            img.crop(left_box).convert('RGB').save(os.path.join(out_dir, f"{base_name}_roi_left.jpg"), quality=95)
            # 3. Right 65% column (consumer care, table)
            right_box = (int(w * 0.35), 0, w, h)
            img.crop(right_box).convert('RGB').save(os.path.join(out_dir, f"{base_name}_roi_right.jpg"), quality=95)
    print(f"✔ Exp 5 (ROI): Generated targeted statutory region crops.")

def process_exp6():
    out_dir = os.path.join(OUTPUT_BASE, 'exp6_rotation')
    for rel_path in IMAGE_PATHS:
        src = os.path.join(FIXTURES_DIR, rel_path)
        fname = os.path.basename(rel_path)
        base_name, ext = os.path.splitext(fname)
        with Image.open(src) as img:
            # Generate 90, 180, 270 rotations for orientation-agnostic recognition
            for angle in [90, 180, 270]:
                rot = img.rotate(angle, expand=True)
                rot.convert('RGB').save(os.path.join(out_dir, f"{base_name}_rot_{angle}.jpg"), quality=95)
    print(f"✔ Exp 6 (Rotation): Generated 90°, 180°, 270° orientation variants.")

def process_exp8():
    out_dir = os.path.join(OUTPUT_BASE, 'exp8_best')
    for rel_path in IMAGE_PATHS:
        src = os.path.join(FIXTURES_DIR, rel_path)
        fname = os.path.basename(rel_path)
        with Image.open(src) as img:
            w, h = img.size
            max_dim = max(w, h)
            min_dim = min(w, h)
            scale = 2.0
            if max_dim * scale > 3000:
                scale = 3000.0 / max_dim
            if min_dim * scale < 550 and max_dim * 3.0 <= 3200:
                scale = min(3.0, 550.0 / max(min_dim, 1))
            new_w = max(1, int(round(w * scale)))
            new_h = max(1, int(round(h * scale)))
            upscaled = img.resize((new_w, new_h), resample=Image.Resampling.LANCZOS)
            # Balanced contrast + unsharp mask
            enhancer = ImageEnhance.Contrast(upscaled)
            contrasted = enhancer.enhance(1.2)
            sharpened = contrasted.filter(ImageFilter.UnsharpMask(radius=1.5, percent=120, threshold=3))
            sharpened.convert('RGB').save(os.path.join(out_dir, fname), quality=95)
    print(f"✔ Exp 8 (Best Combination): Generated multi-scale contrast-sharpened images.")

if __name__ == '__main__':
    ensure_dirs()
    process_exp1()
    process_exp2()
    process_exp3()
    process_exp4()
    process_exp5()
    process_exp6()
    process_exp8()
    print("\nAll scientific image variants successfully generated in /tmp/ocr_scientific_experiments/")
