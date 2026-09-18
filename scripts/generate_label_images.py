import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'lmcc-web', 'tests', 'fixtures', 'real_images')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_label_image(filename, lines, font_path, font_size=28, bg_color=(255, 255, 255), text_color=(20, 20, 20), add_noise=False):
    width = 900
    height = 50 + len(lines) * 44 + 40
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype(font_path, font_size)
    except Exception as e:
        print(f"Warning: Could not load {font_path}, falling back to default font: {e}")
        font = ImageFont.load_default()

    # Draw border simulating packaging label panel
    draw.rectangle([(15, 15), (width - 15, height - 15)], outline=(180, 180, 180), width=2)

    y = 40
    for line in lines:
        draw.text((40, y), line, fill=text_color, font=font)
        y += 44

    if add_noise:
        # Simulate slight blur and noise
        img = img.filter(ImageFilter.GaussianBlur(radius=0.7))

    filepath = os.path.join(OUTPUT_DIR, filename)
    img.save(filepath, format='PNG')
    print(f"Generated label image: {filepath} ({width}x{height})")
    return filepath

def main():
    # 1. Clear English Label (Biscuit)
    create_label_image(
        '01_english_biscuit.png',
        [
            "PARLE-G ORIGINAL GLUCOSE BISCUITS",
            "MFD BY: PARLE PRODUCTS PVT LTD",
            "PLOT NO 14, INDUSTRIAL AREA, MUMBAI, MAHARASHTRA 400057",
            "NET WEIGHT: 250 g",
            "MFD: 08/2024",
            "MRP: Rs. 35.00 (INCL. OF ALL TAXES)",
            "CONSUMER CARE: 1800222211, care@parle.biz"
        ],
        font_path="/System/Library/Fonts/Supplemental/Arial.ttf"
    )

    # 2. Hindi Devanagari Label (Ghee)
    create_label_image(
        '02_hindi_ghee.png',
        [
            "पतंजलि गाय का शुद्ध देशी घी",
            "निर्माता: पतंजलि आयुर्वेद लिमिटेड",
            "कार्यालय: औद्योगिक क्षेत्र, हरिद्वार, उत्तराखंड 249401",
            "शुद्ध मात्रा: 1 लीटर",
            "पैकिंग तिथि: 08/2024",
            "अधिकतम खुदरा मूल्य: Rs. 650.00 (सभी कर सहित)",
            "ग्राहक सेवा: 18001804104, feedback@patanjaliayurved.org"
        ],
        font_path="/System/Library/Fonts/Supplemental/DevanagariMT.ttc"
    )

    # 3. Malayalam Script Label (Coconut Oil)
    create_label_image(
        '03_malayalam_oil.png',
        [
            "കേരള വെളിച്ചെണ്ണ (PURE COCONUT OIL)",
            "MFD BY: KERA AGRO OIL MILLS",
            "INDUSTRIAL ESTATE, ALAPPUZHA 688001, KERALA",
            "NET QTY: 1 l",
            "MFD: 07/2024",
            "MRP: Rs. 230.00",
            "CONSUMER CARE: 1800425425, kera@oilkerala.gov.in"
        ],
        font_path="/System/Library/Fonts/Supplemental/Malayalam Sangam MN.ttc"
    )

    # 4. Tamil Script Label (Milk)
    create_label_image(
        '04_tamil_milk.png',
        [
            "ஆரோக்கிய பால் (AROKYA FULL CREAM MILK)",
            "PACKED BY: HATSUN AGRO PRODUCT LTD",
            "PLOT 14, CHENNAI 600001, TAMIL NADU",
            "NET VOL: 500 ml",
            "PKD: 08/2024",
            "MRP: Rs. 34.00 (INCL OF ALL TAXES)",
            "CUSTOMER CARE: 1800120120, info@hatsun.com"
        ],
        font_path="/System/Library/Fonts/Supplemental/Tamil Sangam MN.ttc"
    )

    # 5. Noisy Foil Stamped Label (Dot-matrix MFD & MRP)
    create_label_image(
        '05_noisy_foil_snack.png',
        [
            "ROASTED MASALA PEANUTS",
            "M.R.P : Rs. 30.00 ( INCL OF ALL TAXES )",
            "NET WT : 70 g",
            "MFD : 06/2024",
            "MFD BY : DESI CRUNCH AGRO FOODS",
            "UNIT 3, INDUSTRIAL ESTATE, JAIPUR 302013, RAJASTHAN",
            "CARE CELL : 1800233445, support@desicrunch.com"
        ],
        font_path="/System/Library/Fonts/Supplemental/Arial.ttf",
        bg_color=(240, 240, 235),
        text_color=(60, 60, 60),
        add_noise=True
    )

if __name__ == '__main__':
    main()
