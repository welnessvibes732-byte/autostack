---
name: rajshamani-carousel-creator
description: Create Raj Shamani-style educational carousels for Instagram, LinkedIn, or PDF/HTML delivery. Use when the user asks for a Raj Shamani inspired carousel, editorial grid-paper carousel, swipe deck, visual slide thread, or wants a carousel matching the provided circadian-trough reference PDF style.
---

# Rajshamani Carousel Creator

## Overview

Create concise educational carousels with a white grid-paper background, black editorial typography, yellow marker highlights, grayscale cutout/spot visuals, tiny header labels, swipe footer, and numbered yellow pagination.

## Workflow

1. Define the core insight in one sentence: what surprising behavior, mistake, mental model, or business truth the carousel teaches.
2. Write 5-8 slides with one idea per slide: hook, setup, mechanism, example, implication, practical action, closing.
3. Use the visual rules in `references/style-guide.md`. Keep copy sparse and let whitespace carry the frame.
4. Generate HTML with `scripts/build_carousel.py` when the user wants an artifact. Export from HTML to PNG/PDF with browser screenshots or Chrome print when needed.
5. Before delivering, inspect the carousel visually. Confirm every slide is 4:5, readable, non-overlapping, and has a strong yellow highlight or annotation.

## Copy Pattern

- Cover: a direct question or counterintuitive claim, with 1-2 words circled or underlined in yellow.
- Slide 2: show the ordinary situation and name the concept.
- Middle slides: explain the mechanism with short lines, arrows, and tiny examples.
- Final slide: give a behavioral reset or next action, not a motivational quote.
- Voice: conversational, plain, curious. Avoid hype, dense paragraphs, and generic productivity advice.

## Artifact Generation

Use the script for a fast first artifact:

```powershell
python .agents\skills\rajshamani-carousel-creator\scripts\build_carousel.py spec.json output.html
```

The JSON spec must include:

```json
{
  "title": "My Carousel",
  "kicker": "FIGURING OUT HUMANS",
  "author": "RAJ SHAMANI",
  "slides": [
    {
      "headline": "Why is 3pm the most dangerous hour of your day?",
      "body": "Have you ever noticed how every afternoon, without fail, your brain just stops cooperating?",
      "highlight": "3pm",
      "is_cover": true,
      "img_path": "path/to/author_image.png"
    },
    {
      "headline": "The Circadian Trough.",
      "body": "Your core temperature drops, signaling your brain to power down. It's biological.",
      "highlight": "Circadian Trough",
      "callouts": ["Temperature Drops", "Melatonin Spikes"],
      "img_path": "path/to/icon.png"
    }
  ]
}
```

Never copy protected text, portraits, or exact layouts from a reference carousel unless the user explicitly owns or provides those assets for reuse. Recreate the system: grid, pacing, highlight language, and editorial rhythm.

## Quality Bar

- Readable at phone size.
- One primary thought per slide.
- No cards inside cards; slides are full-bleed white grid pages.
- Yellow is used as a marker layer, not a background theme.
- Visuals support the sentence on the page; they do not decorate randomly.
