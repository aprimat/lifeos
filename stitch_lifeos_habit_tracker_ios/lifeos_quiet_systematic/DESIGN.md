---
name: LifeOS Quiet Systematic
colors:
  surface: '#f9f9fe'
  surface-dim: '#d9d9df'
  surface-bright: '#f9f9fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f9'
  surface-container: '#ededf3'
  surface-container-high: '#e8e8ed'
  surface-container-highest: '#e2e2e7'
  on-surface: '#1a1c20'
  on-surface-variant: '#434653'
  inverse-surface: '#2e3035'
  inverse-on-surface: '#f0f0f6'
  outline: '#737785'
  outline-variant: '#c3c6d6'
  surface-tint: '#1958c7'
  primary: '#0951c1'
  on-primary: '#ffffff'
  primary-container: '#356bdb'
  on-primary-container: '#f6f5ff'
  inverse-primary: '#b1c5ff'
  secondary: '#006a60'
  on-secondary: '#ffffff'
  secondary-container: '#8cf5e4'
  on-secondary-container: '#007166'
  tertiary: '#933f28'
  on-tertiary: '#ffffff'
  tertiary-container: '#b2563e'
  on-tertiary-container: '#fff4f2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b1c5ff'
  on-primary-fixed: '#001847'
  on-primary-fixed-variant: '#0040a0'
  secondary-fixed: '#8cf5e4'
  secondary-fixed-dim: '#6fd8c8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#ffdbd2'
  tertiary-fixed-dim: '#ffb4a1'
  on-tertiary-fixed: '#3c0800'
  on-tertiary-fixed-variant: '#7c2e19'
  background: '#f9f9fe'
  on-background: '#1a1c20'
  surface-variant: '#e2e2e7'
typography:
  display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.003em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style
The design system embodies a serene, intentional, and distraction-free environment tailored for adult self-actualization, reflective habit tracking, and personal longevity. Drawing deep inspiration from the mechanical restraint of Things 3 and the clinical purity of Apple Health, the aesthetic rejects gamified noise, juvenile badges, aggressive streaks, and garish confetti. Instead, it cultivates visual quiet, emotional maturity, and cognitive clarity.

The visual style is characterized as **Corporate / Modern Minimalist**:
- **Atmosphere:** Airy, pristine, and luminous with ample negative space acting as structural rhythm rather than passive void.
- **Tone:** Empathetic, composed, dependable, and intellectually respectful.
- **Clarity Over Decoration:** Interfaces prioritize raw information architecture, precise typographic scales, and micro-interactions that feel weightless and instantaneous.

## Colors
The color architecture establishes an optical hierarchy rooted in calm neutrals and clinical precision. The palette is strictly calibrated for daylight readability and minimal cognitive fatigue.

- **Background & Canvas:** `#F8F9FA` serves as the primary canvas floor, providing a warm, organic counterbalance to pure digital glass.
- **Surfaces & Cards:** Crisp `#FFFFFF` layers hover above the canvas, framing modular modules cleanly without harsh dividing contrast.
- **Primary Accent (`#356BDB`):** An exacting, focused azure blue reserved strictly for focal actions, active selections, and decisive data points.
- **Supporting Accents:**
  - *Secondary / Growth Sage (`#2A9D8F`):* Reserved for completed states, balanced wellness indicators, and healthy rhythm.
  - *Tertiary / Mindful Amber (`#E07A5F`):* Indicates items requiring attention or gentle reminders without triggering alarmist fight-or-flight responses.
  - *Neutral Accent / Slate (`#6C7A89`):* For auxiliary metrics, inactive tracks, and structural metadata.
- **Typography Scale:**
  - *Primary Headings & Key Data:* `#1A1C20` (Deep obsidian charcoal).
  - *Secondary Copy & Body:* `#5F6368` (Balanced neutral charcoal).
  - *Tertiary & Timestamps:* `#8C9199` (Soft atmospheric slate).

## Typography
Typographic rhythm relies on `Inter` across all structural roles, emphasizing uniform geometry, tall x-height, and precise tabular figure alignments for continuous tracking.

- **Hierarchy:** Primary display values and category section titles leverage tight negative tracking (`-0.02em` to `-0.01em`) to mimic executive Swiss graphic design.
- **Legibility:** Paragraph bodies and quantitative health/growth logs maintain a relaxed line height ratio of 1.45–1.55 to avoid cramped scans during rapid daily logging.
- **Numbers & Metrics:** Tabular numerals (`tnum`) must be enforced for all metric displays, completion counters, and timer modules to preserve vertical column integrity.

## Layout & Spacing
The layout philosophy centers on a fluid, edge-to-edge systematic frame designed for touch agility on mobile devices and centered architectural cards on wider viewports.

- **Mobile Rhythm (Base):** Single-column stacked lists with `1rem` margins and `1rem` vertical intervals, maximizing thumb reach and focal immersion.
- **Tablet / Large Screens:** A 6-to-12 column fluid layout constrained to a maximum content width of `840px` for focused journaling views, and `1140px` for macro health and productivity dashboard views.
- **Rhythm Cadence:** Vertical spacing enforces deliberate white space pauses. Habit groups are delineated by `space-lg` (24px) or `space-xl` (32px), creating distinct psychological compartments for morning, afternoon, and evening rituals.

## Elevation & Depth
Depth in the system is tactile, subtle, and nearly imperceptible. The interface eschews heavy dropped shadows in favor of low-contrast hairline borders paired with ambient diffused light.

- **Base Card Elevation:** `#FFFFFF` cards sit on `#F8F9FA` with a perimeter stroke of `1px solid #EAEAEC` and an ultra-soft shadow: `0 2px 8px rgba(0, 0, 0, 0.03)`.
- **Raised / Interactive Modules (Hover/Active):** Elevate subtly with `0 4px 16px rgba(0, 0, 0, 0.05)`, scaling the visual focus without breaking the planar field.
- **Floating Modals & Sheets:** Retain a clean `1px solid #EAEAEC` boundary with a diffused ambient shadow: `0 12px 32px rgba(26, 28, 32, 0.08)`.
- **Segmented / Inset Containers:** Habits embedded within groups employ an inset layer using a background of `#F4F5F7` with zero border or shadow, establishing visual nesting naturally.

## Shapes
Roundedness level `2` sets standard radius metrics:
- **Base Components (Inputs, Buttons, Cards):** `1rem` (16px) corners establish a modern, ergonomic hand-feel across all primary interactive surfaces.
- **Large Contextual Blocks (Sheets, Modals):** `1.5rem` (24px) corners soften the transition of overlays rising from the bottom viewport.
- **Micro Elements (Chips, Tags, Radio Nodes):** `0.5rem` (8px) corners provide compact precision without becoming fully round or pill-shaped, keeping elements feeling structured rather than toy-like.

## Components

### Buttons
- **Primary:** Solid `#356BDB` fill with crisp white Inter Medium text (`label-lg`), height `48px`, border radius `16px`. On press, slight micro-scale reduction (`scale(0.98)`) and opacity shift to `0.92`.
- **Secondary / Subtle:** `#FFFFFF` background with `1px solid #EAEAEC`, `#1A1C20` typography, and the default elevation shadow (`0 2px 8px rgba(0, 0, 0, 0.03)`).
- **Ghost:** Transparent background, `#5F6368` text, transitioning to `#F1F3F5` on hover/active states.

### Cards & Habit Containers
- Surface: `#FFFFFF`.
- Border: `1px solid #EAEAEC`.
- Corner Radius: `16px`.
- Padding: `space-md` (16px) to `space-lg` (24px).
- Internal layout cleanly groups metrics: Left icon or category glyph, center title with supporting frequency badge, right completion node.

### Checkboxes & Check Circles (Habit Nodes)
- Inspired by Things 3: Habit completion is an unhurried, crisp tactile toggle.
- Idle state: Subtle 2px stroke circle in `#D0D3D8` with transparent interior.
- Completed state: Fills smoothly with `#356BDB` (or category-specific `#2A9D8F`), showing a sharp white checkmark accompanied by a subtle 100ms haptic feedback impulse on supported devices.

### Chips & Category Filters
- Compact horizontal filter chips with `8px` corner radius.
- Inactive: `#FFFFFF` surface, `1px solid #EAEAEC`, `#5F6368` text.
- Active: `#1A1C20` background with `#FFFFFF` text, providing grounding without neon saturation.

### Input Fields
- Height: `48px`, radius `16px`.
- Background: `#FFFFFF` with `1px solid #EAEAEC`.
- Focus state: Border transitions to `#356BDB` with an ambient ring: `0 0 0 3px rgba(53, 107, 219, 0.12)`.
- Placeholder text: `#8C9199`.

### Progress Rings & Visual Trackers
- Inspired by Apple Health: Multi-day concentric or horizontal segmented bar trackers using non-fluorescent tones (`#356BDB`, `#2A9D8F`, `#E07A5F`).
- Inactive segments: `#EAEAEC`.
- Bar stroke thickness: Constant 4px to 6px with rounded cap ends for an organic, human cadence.