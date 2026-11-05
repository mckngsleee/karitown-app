# Karitown brand

## Logo

| File | Use it on |
|---|---|
| `logo/wordmark-regular.png` | Dark green backgrounds (the app header) |
| `logo/wordmark-light.png` | Light backgrounds (documents, slides) |
| `logo/wordmark-dark.png` | Near-black backgrounds |
| `logo/icon-dark.png` | App icon on the phone's home screen |
| `logo/icon-light.png` | App icon on light backgrounds |

The arrow in the "o" stands for the kariton coming back around: buy, load, sell, repeat.

## Colours

| Name | Hex | Role |
|---|---|---|
| Main | `#103B28` | Header, main buttons, body text on light backgrounds |
| Secondary | `#92E46B` | Highlights: active tab, "Online" chip, progress |
| Accent | `#FF7951` | Warnings: offline, old price, truck almost full |
| Off-white | `#F7F9F8` | Light background; text on dark green |
| Near-black | `#0E1D17` | Dark-mode background |

Three palettes, as in the logo files:

| Palette | Text | Background | Secondary | Accent |
|---|---|---|---|---|
| Regular | `#F7F9F8` | `#103B28` | `#92E46B` | `#FF7951` |
| Light (app default) | `#103B28` | `#F7F9F8` | `#92E46B` | `#FF7951` |
| Dark (follows the phone's setting) | `#92E46B` | `#0E1D17` | `#F7F9F8` | `#FF7951` |

### Readability rules (owners use the app outdoors)

Contrast ratios, where 4.5:1 is the minimum for normal text:

| Combination | Ratio | Use |
|---|---|---|
| Main on off-white | 11.8:1 | ✅ Body text |
| Off-white on main | 11.8:1 | ✅ Header, buttons |
| Main on secondary | 8.1:1 | ✅ Text on green chips |
| Main on accent | 4.8:1 | ✅ Text on orange warnings |
| Secondary on near-black | 11.2:1 | ✅ Dark-mode text |
| Secondary on off-white | 1.5:1 | ❌ Never green text on light backgrounds |
| Off-white on accent | 2.5:1 | ❌ Never white text on orange |

So green and orange are used only as **fills with dark text on top**.

## Typography

**Open Sans**, bundled with the app (not loaded from Google), so it works offline. Weights 400, 600, 700, 800.

| Text | Size | Weight |
|---|---|---|
| Screen title | 19px | 800 |
| Big numbers (money, weight) | 28px | 800 |
| Body | 16px | 400 |
| Tagalog sublabels, notes | 12.5–13px | 400 |

## Layout

- Phone first: designed at 360×800 (mid-range Android).
- Touch targets at least 48px tall; main actions 56px.
- Corners rounded 10px.
- English labels with Tagalog sublabels, as in the prototype.

## Reference

The full screen-by-screen behaviour is in `prototype/karitown-prototype-v1.0.html`. Open it in Chrome. It uses the older red-and-grey palette; this brand guide replaces the colours, and everything else still applies.
