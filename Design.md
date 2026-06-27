# NEXTPOST Design System

## Direction
NEXTPOST is a defense-career analysis product for transitioning military personnel. The interface should feel calm, precise, and operational: more like a trusted professional report than a marketing site. Use real defense imagery as the first impression, then move into clean white analytical surfaces.

## Visual Principles
- Lead with actual defense context: KF-21 or defense hardware imagery, never abstract gradients as the main visual.
- Keep operational screens dense but readable. Use cards for grouped tools and report items, not decorative nesting.
- Use restrained color. The system is mostly light gray, white, graphite text, and muted steel-blue accents.
- Make the report feel exportable: clear section dividers, compact evidence rows, gauges, and labeled metrics.

## Core Tokens
- Page background: `#F4F6F8`
- Surface: `#FFFFFF`
- Text primary: `#191F28`
- Text body: `#4E5968`
- Text muted: `#8B95A1`
- Border: `#E8EBEE`
- Border strong: `#DDE3EA`
- Brand steel: `#849BBA`
- Brand steel light: `#EBEFF5`
- CTA green: `#099A21`
- Success: `#047A3D`
- Blue score: `#1442B0`
- Warning: `#D98A00`
- Danger: `#C32A2A`
- Required: `#F04452`

## Typography
- Font: `Noto Sans KR`, fallback `-apple-system, BlinkMacSystemFont, sans-serif`
- Hero title: 52-64px desktop, 38-44px mobile, weight 900, tight line-height
- Page title: 32-40px, weight 900
- Section title: 20-28px, weight 800-900
- Body: 14-16px, weight 500, line-height 1.7-1.9
- Captions and labels: 12-13px, weight 700

## Layout
- Max content width: 1180px for landing, 980px for form, 920px for report.
- Card radius: 16-18px.
- Inputs/buttons radius: 9-12px.
- Cards use `0 10px 34px rgba(20,40,38,.05)`.
- Use a sticky, image-backed or white top nav depending on page context.
- Mobile layouts collapse to one column with 24px page padding.

## Components
- Primary button: white on hero, green on operational screens.
- Secondary button: white surface, steel border, graphite text.
- Form sections use numbered steel badges.
- Chips use steel-light background; selected state uses steel border/text.
- Score gauges use `conic-gradient`, with grade colors:
  - 85+: success green
  - 78-84: blue
  - 70-77: warning
  - below 70: danger
- Glossary rows are collapsed by default and expand on click.
- Report evidence should be visible as compact pills or small metric rows.

## Assets
- Hero and form/report nav: `/assets/kf21-hero.jpg`
- Data/source proof band: `/assets/defense-data.jpg`

## Screens
- Home: full-viewport image hero with left-aligned copy and CTA. Show data summary below as unframed sections, not a marketing split hero.
- Analyze: KF-21 background, centered white form card, three numbered form sections, progress overlay during analysis.
- Results: sticky image-backed nav, one integrated white report card with summary, recommended companies, skill gap, discharge timing, education, glossary, centers, and AI chat.
- Data audit: internal utility screen; do not link from the public home hero.
