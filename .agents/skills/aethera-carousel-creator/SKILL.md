---
name: aethera-carousel-creator
description: Use this skill whenever the user asks to generate a LinkedIn carousel, slide deck, or multi-page visual asset for Aethera/PropIQ. This ensures the output matches the established, high-end "Operational Intelligence" brand design guidelines without looking like a generic template.
---

# Aethera Carousel Creator

This skill guides the creation of high-end, institutional-grade LinkedIn carousels for Aethera. Aethera carousels are generated using a Python script that outputs a single HTML file with embedded base64 images and CSS, which can be downloaded as a high-res PDF.

## Core Design Architecture

Aethera carousels MUST strictly follow this design architecture:
1. **Dimensions:** 1080x1350 per slide (displayed at 45% scale via CSS `transform: scale(0.45)` for preview, and `scale(1)` for printing).
2. **Color Palette:** 
   - Background (`--bg`): `#07090F` (Always use deep, professional dark themes. Alternatives: Deep Navy `#0A0F1C` or Charcoal `#121212`).
   - Card Background (`--card`): `#0D111A` (Or a matching elevated surface).
   - **Accent Colors (Rotate these per carousel to prevent banner blindness, but keep them professional):**
     - *Neon Cyan (Standard Tech):* `#00F0FF`
     - *Electric Indigo (Authority):* `#6366F1`
     - *Emerald Green (Yield/Profit):* `#10B981`
     - *Amber (Warnings/Alerts):* `#F59E0B`
     - *Crimson (Loss/Bleed):* `#FF3366`
   - Text colors: White `#FFFFFF` for primary, Muted `#8B949E` for subtitles.
3. **Typography:** 'Inter' for body/titles, 'JetBrains Mono' for numbers, system IDs, tags, and code elements.
4. **Visual Effects:** 
   - Dotted/Grid background using linear gradients.
   - Large, absolute positioned radial gradients (`.glow`) to create a subtle colored atmosphere in the corners.
   - Large watermark numbers (`.bg-num`) at the bottom right of slides.
5. **PDF Export:** The HTML must include `<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>` and `jspdf` to allow 1-click downloading of the carousel into a PDF.

## Standard Slide Anatomy

1. **Header Row (`.hdr`):** Contains the Aethera logo, a `.sys-id` (e.g., `SYS.DIAGNOSTIC` or `THE REALITY`), and a `.swipe` indicator.
2. **Content Area:** 
   - `.title`: 72px-108px font size, `-2px` letter spacing, with strategic colored `<span>` elements for emphasis.
   - `.subtitle`: 26px font size, muted text explaining the problem.
   - `.cards` or `.stats`: For list elements, use thick left-borders (cyan or red) to create distinct blocks of information.
3. **Footer Row (`.footer`):** Bottom border, author profile image + name + role ("FOUNDER · AETHERA") on the left, and Aethera logo + page number (`01 / 07`) on the right.

## Narrative Structure

Aethera is not "just a property management app"—it is "Operational Intelligence". The narrative must be aggressive, financial-focused, and authoritative:
- **Slide 1:** The Hook (often pointing out a massive flaw in how operators run their business).
- **Slide 2-3:** The Bleed (identifying the "Valuation Tax", "Invisible Tax", or "Post-Onboarding Gap" causing cash loss).
- **Slide 4-5:** The Aethera Solution (Architecture, Live Ledger, Approvals Engine).
- **Final Slide:** The Call to Action (e.g., "Software shouldn't just record decisions. It should protect your yield. propiq.in / aethera").

## Implementation Method

When asked to create a carousel, always generate a Python script named `build_XYZ_carousel.py`. The script should:
1. Load `assets_b64.txt` (which contains `logo_b64` and `profile_b64`).
2. Construct a massive `HTML` string containing all CSS and slide `div`s.
3. Write the HTML to an `.html` file.
4. NEVER invent generic design systems—stick strictly to the Aethera variables and layout conventions.
