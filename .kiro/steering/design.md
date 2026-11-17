# Design direction

Reference: dark, premium SaaS landing page style (grid-tile background, grain, glass cards, real product shown in the hero). The look must feel crafted, not like a template. Accent is BLUE, never violet or purple.

## Palette
- Background: #08090d (near black with a faint blue tint)
- Surface: #0e1016, raised surface #141722
- Border: rgba(255,255,255,0.08), strong border rgba(255,255,255,0.14)
- Text: #f3f5f9, muted #9aa3b5
- Accent blue: #3b82f6, bright #60a5fa, deep #1d4ed8 (hue 215-225 only)
- Success #34d399, warning #fbbf24, danger #f87171 (used only for small status pills)

## Background (most important detail)
- Full-page grid of rounded squares (about 60px tiles, 14px radius, 1px border at 6-8% white, very slightly lighter fill than the page).
- The grid fades out toward the edges and the bottom using a radial mask.
- A soft blue glow behind the hero title.
- A subtle film-grain noise overlay (2-4% opacity) over the whole page, and stronger grain on gradient cards.

## Typography
- Geist or Inter Tight for UI and headings, tight tracking (-0.03em) on large titles.
- Hero title about 72px; one key phrase of the title in the blue gradient (#93c5fd to #3b82f6).
- Section eyebrows: small uppercase monospace, wide letter spacing, accent blue (for example "INSIDE THE STUDIO").
- Section titles about 48px, with the last words in accent blue.

## Components
- Navbar: 72px, sticky, backdrop blur, 1px bottom border. Ghost button plus a light button with a soft bevel and inner glow.
- Cards: radius 16-24px, 1px subtle border, dark surface, generous padding.
- Hero stat card: blue gradient (#3b82f6 to #1d4ed8) with grain, ring chart and a mini bar chart in a glass panel.
- Stat cards: big number, small colored delta pill, thin sparkline.
- Pills and badges: tiny, rounded full, tinted background matching the status color.
- Image or screenshot cards: large radius, glass chips floating on top with a metric.
- Floating round accent button, bottom right.
- Testimonial or feature rows: horizontal marquee with fade at both edges.

## Hero layout
1. Logo mark, then the title, a short muted subtitle.
2. An input-style bar (drop or paste schema.prisma) with a light button.
3. Below it, a real dashboard preview (the generated University demo with sidebar, stat cards, table, and the role switcher) cropped at the bottom of the first screen, with a 1px border and big radius.

## Motion
- Subtle: fade and rise on scroll, hover lift on cards, role switcher animates between roles.
- Respect prefers-reduced-motion.

## Rules
- All UI text in English.
- Contrast must stay readable: muted text never below #8b94a7 on the dark background.
- No emojis, no stock illustrations. Icons are line icons only.