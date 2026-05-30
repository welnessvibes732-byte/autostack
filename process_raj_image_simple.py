import sys
import os
from PIL import Image, ImageDraw, ImageOps, ImageEnhance

def process_image(input_path, output_path):
    print(f"Processing {input_path}...")
    try:
        img = Image.open(input_path).convert("RGBA")
        
        # Make image square
        min_dim = min(img.size)
        left = (img.width - min_dim) / 2
        top = (img.height - min_dim) / 2
        right = (img.width + min_dim) / 2
        bottom = (img.height + min_dim) / 2
        img = img.crop((left, top, right, bottom))
        
        # Create circular mask
        mask = Image.new("L", img.size, 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, min_dim, min_dim), fill=255)
        
        # Apply mask
        result = Image.new("RGBA", img.size, (0,0,0,0))
        result.paste(img, (0,0), mask=mask)
        
        # Convert to grayscale
        result = result.convert("L")
        
        # Increase contrast
        enhancer = ImageEnhance.Contrast(result)
        result = enhancer.enhance(1.5)
        
        # Convert back to RGBA to apply transparency mask again since convert("L") drops alpha
        final = Image.new("RGBA", result.size)
        final.paste(result, (0,0), mask=mask)
        
        final.save(output_path, "PNG")
        print(f"Saved processed image to {output_path}")
        
    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    brain_path = r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b"
    
    tasks = [
        (os.path.join(brain_path, "media__1779464351679.jpg"), os.path.join(brain_path, "user_image_processed.png")),
        (os.path.join(brain_path, "one_month_free_banner_1779458266569.png"), os.path.join(brain_path, "slide2_img.png")),
        (os.path.join(brain_path, "money_falling_waste_1779458336219.png"), os.path.join(brain_path, "slide3_img.png")),
        (os.path.join(brain_path, "market_data_screen_1779458655346.png"), os.path.join(brain_path, "slide5_img.png"))
    ]
    
    for in_path, out_path in tasks:
        process_image(in_path, out_path)
