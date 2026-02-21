# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the community landing page for **$MEMDEX**, a community-driven memecoin on Solana. The site is reproduced from [thememdex100.com](https://www.thememdex100.com) (originally Wix-hosted) as a standalone vanilla site.

**$MEMDEX is the community memecoin.** The team behind $MEMDEX is actively building the **MemDex Automated Portfolio** — an AI-powered platform that will provide diversified exposure to 100 digital assets across Blue Chips, Memecoins, RWA, AI, DeFi, and Gaming sectors. The portfolio product is in development, not live. The site should always distinguish between the coin (community, live now) and the portfolio product (what the team is building).

## Tech Stack

- **Pure vanilla HTML, CSS, and JavaScript** — no frameworks, no build tools
- **CSS Design System** — custom properties (variables) in `css/main.css` for colors, spacing, typography, etc.
- **Snipcart** — e-commerce (cart/checkout) for the shop pages (to be integrated)
- **Inter** — primary web font loaded from Google Fonts

## Project Structure

```
md100/
├── index.html              # Home / landing page
├── about.html              # About page
├── gmm.html                # GMM page
├── coffee.html             # Buy us a coffee page
├── terms.html              # Terms of Service
├── privacy.html            # Privacy Policy
├── refund.html             # Refund Policy
├── thank-you.html          # Post-purchase thank you
├── .gitignore
├── CLAUDE.md               # This file
├── css/
│   ├── main.css            # Design system: variables, reset, typography, layout utilities
│   ├── components.css      # UI components: nav, buttons, cards, modals, footer, forms
│   ├── animations.css      # Scroll reveal, keyframes, parallax, loading states
│   └── shop.css            # Shop-specific: product grid, detail, filters, Snipcart overrides
├── js/
│   ├── main.js             # Navigation, modals, smooth scroll, back-to-top
│   ├── animations.js       # IntersectionObserver scroll reveal, parallax, counter, typewriter
│   └── shop.js             # Shop filtering, sorting, quantity, variant selector, cart
├── shop/
│   ├── index.html          # Shop listing page
│   └── product.html        # Product detail page (query param ?id=)
├── data/
│   └── pages/              # JSON data files for page content
├── assets/
│   ├── images/             # Site images
│   ├── fonts/              # Custom fonts (e.g., MemDexHero)
│   ├── logos/              # Logo files (memdex-logo.svg, etc.)
│   └── products/           # Product images
```

## Development

There is no build step. To develop locally:

```bash
# Option 1: Python HTTP server (recommended)
cd /mnt/c/dev/md/md100
python3 -m http.server 8000
# Then open http://localhost:8000

# Option 2: Open index.html directly in a browser
# Note: some features (fetch, ES modules) may not work with file:// protocol

# Option 3: VS Code Live Server extension
# Right-click index.html -> Open with Live Server
```

## Design System

All design tokens are defined as CSS custom properties in `css/main.css`:

- **Colors**: `--color-bg-*`, `--color-accent-*`, `--color-text-*`, `--color-border*`
- **Typography**: `--font-heading`, `--font-body`
- **Spacing**: `--space-xs` through `--space-4xl` (0.25rem to 6rem)
- **Layout**: `--max-width` (1200px), `--max-width-wide` (1400px), `--nav-height` (70px)
- **Borders**: `--radius-sm` through `--radius-full`
- **Shadows**: `--shadow-sm` through `--shadow-glow`
- **Transitions**: `--transition-fast` (150ms), `--transition-base` (250ms), `--transition-slow` (400ms)

### Color Palette (10 colors)
- `--ink-black: #03091E` — Darkest background
- `--prussian-blue: #00012F` — Deep background
- `--deep-navy: #0D1C57` — Card/panel backgrounds
- `--steel-azure: #0E5099` — Mid-blue accent
- `--steel-azure-2: #0C4B9B` — Mid-blue variant
- `--blue: #0029FE` — Vivid accent / gradients
- `--blue-bell: #209EE0` — Primary readable accent
- `--steel-blue: #007FD2` — Medium blue
- `--radioactive-grass: #0BE404` — Green pop / CTA accent (replaces gold)
- `--bright-snow: #F9FBFC` — Text / light color

## Key CSS Classes

### Layout
- `.container` / `.container-wide` / `.container-narrow` — centered max-width wrappers
- `.section` / `.section-alt` — page sections with padding (alt = secondary bg)
- `.grid` / `.grid-2` / `.grid-3` / `.grid-4` — CSS Grid layouts
- `.flex` / `.flex-center` / `.flex-between` — Flexbox utilities

### Components
- `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-gold` — buttons
- `.card` / `.feature-card` / `.product-card` / `.stat-card` / `.info-card` — cards
- `.nav` / `.nav-scrolled` — sticky navigation
- `.modal` / `.modal-overlay` / `.modal-content` — modals
- `.footer` / `.footer-grid` — site footer
- `.prose` — long-form content styling
- `.badge` / `.divider` / `.alert` / `.tabs` / `.accordion` — misc UI

### Animations
- `.reveal` / `.reveal-left` / `.reveal-right` / `.reveal-scale` — scroll-triggered reveals
- `.reveal-stagger` — staggered child animations
- `.anim-float` / `.anim-pulse` / `.anim-glow` / `.anim-shimmer` — continuous animations
- `.parallax-container` / `.parallax-bg` — parallax scrolling

## Conventions

- All pages share the same nav and footer (copy-pasted, not templated)
- Shop pages (`shop/`) use relative `../` paths for CSS/JS/assets
- Internal links use relative paths (e.g., `shop/index.html`, not absolute)
- External links use `target="_blank" rel="noopener noreferrer"`
- Images use `onerror` fallback handlers for missing assets
- JavaScript is vanilla ES6+ — no transpilation needed
- Scroll reveal elements need the `.reveal` (or variant) class; `js/animations.js` handles the rest via IntersectionObserver
- The `body.modal-open` class prevents background scroll when modals/mobile menu are open

## Target Site Content & Sections

The site to reproduce includes these key areas:

- **Hero section** — Product tagline ("Automated Portfolio"), primary CTA
- **Feature highlights** — AI-powered management, 100-token diversification, cross-chain compatibility, cost efficiency (70-90% gas reduction on NEAR)
- **How it works** — 101 AI agents, automatic rebalancing (every 6 hours or on 5% deviation, emergency at 20%), on-chain oracles
- **Asset sectors** — Blue Chips, Memecoins, RWA, AI, DeFi, Gaming, Stablecoins
- **Governance** — MEMDEX token holder voting on index adjustments
- **Token utility** — Index access, staking/liquidity rewards, governance voting
- **Pricing/comparison** — Cost advantages vs traditional approaches
- **Community/social links** — Twitter [@MemdexSociety](https://x.com/MemdexSociety), [@TheMemdex100](https://x.com/TheMemdex100)

## Reference Links

- Live site: https://www.thememdex100.com
- Token info: https://www.coingecko.com/en/coins/memdex100
- Product overview: https://bondfinance.io/memdex-ai-powered-portfolio-management/
- Explainer: https://www.bitrue.com/blog/what-is-memdex100-meme-token-nasdaq100
