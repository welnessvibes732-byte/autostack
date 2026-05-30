from PIL import Image
import sys
import os

def remove_dark_bg(input_path, output_path):
    print(f"Processing {input_path}...")
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            # item is (R, G, B, A)
            # The background of generated images is dark navy/black.
            # Let's detect pixels that are very dark blue/black.
            r, g, b, a = item
            if r < 40 and g < 40 and b < 60:
                newData.append((255, 255, 255, 0)) # fully transparent
            else:
                newData.append(item)

        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Saved transparent image to {output_path}")
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

if __name__ == "__main__":
    images = [
        "C:\\Users\\DELL\\.gemini\\antigravity\\brain\\1e1a770e-60c5-45bf-af7c-93e9dd74650b\\agentic_ai_chatbot_toy_1780067845248.png",
        "C:\\Users\\DELL\\.gemini\\antigravity\\brain\\1e1a770e-60c5-45bf-af7c-93e9dd74650b\\agentic_ai_workflow_1780067911413.png",
        "C:\\Users\\DELL\\.gemini\\antigravity\\brain\\1e1a770e-60c5-45bf-af7c-93e9dd74650b\\agentic_ai_approve_btn_1780067961478.png"
    ]
    
    for img_path in images:
        if os.path.exists(img_path):
            out_path = img_path.replace(".png", "_transparent.png")
            remove_dark_bg(img_path, out_path)
        else:
            print(f"File not found: {img_path}")
