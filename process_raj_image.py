import sys
import io
from pathlib import Path

# Need to install rembg and Pillow
try:
    from rembg import remove
    from PIL import Image, ImageEnhance
except ImportError:
    print("Dependencies not found. Run: pip install rembg pillow")
    sys.exit(1)

def process_image(input_path, output_path):
    print(f"Processing {input_path}...")
    try:
        # Load image
        input_image = Image.open(input_path)
        
        # Remove background
        print("Removing background...")
        output_image = remove(input_image)
        
        # Convert to grayscale
        print("Converting to grayscale...")
        output_image = output_image.convert("L")
        
        # Increase contrast slightly
        enhancer = ImageEnhance.Contrast(output_image)
        output_image = enhancer.enhance(1.2)
        
        # Save as PNG to preserve transparency
        output_image.save(output_path, "PNG")
        print(f"Saved processed image to {output_path}")
        
    except Exception as e:
        print(f"Error processing image: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python process_image.py <input> <output>")
        sys.exit(1)
    process_image(sys.argv[1], sys.argv[2])
