import os
import base64

def image_to_b64(path):
    try:
        with open(path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        print(f"Failed to load image {path}: {e}")
        return ""

img_sarah = r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b\sarah_leasing_manager_1779458072044.png"
sarah_b64 = image_to_b64(img_sarah)

HTML = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Format 4: Single Story Image</title>
<link href="https://api.fontshare.com/v2/css?f[]=switzer@400,600,700&display=swap" rel="stylesheet">
<style>
    body {{
        background-color: #f0f2f5;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        font-family: 'Switzer', sans-serif;
    }}
    .post-image {{
        width: 1080px;
        height: 1350px;
        position: relative;
        background-image: url('data:image/png;base64,{sarah_b64}');
        background-size: cover;
        background-position: center;
        transform: scale(0.5); /* Scale down for preview */
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }}
    .overlay {{
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 50%;
        background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%);
    }}
    .text-box {{
        position: absolute;
        bottom: 100px;
        left: 80px;
        right: 80px;
        background-color: #ffffff;
        padding: 50px;
        border-left: 10px solid #e53e3e; /* Red accent */
    }}
    .headline {{
        font-size: 64px;
        font-weight: 700;
        color: #1a202c;
        line-height: 1.1;
        letter-spacing: -1px;
    }}
    .subheadline {{
        font-size: 32px;
        color: #4a5568;
        margin-top: 20px;
        font-weight: 400;
    }}
</style>
</head>
<body>
    <div class="post-image">
        <div class="overlay"></div>
        <div class="text-box">
            <div class="headline">The $750,000 Panic Move.</div>
            <div class="subheadline">Why offering "One Month Free" is destroying your portfolio valuation.</div>
        </div>
    </div>
</body>
</html>'''

output_path = os.path.join(os.path.dirname(__file__), "format4_story_image.html")
with open(output_path, "w", encoding="utf-8") as f:
    f.write(HTML)

print(f"Created: {output_path}")
