---
name: Türkçe WordNet Arayüzü
description: İki Renkli Sözlük — cool paper, blue-black ink, one ultramarine spot; categories carried by line style, not colour.
colors:
  paper: "#f5f7fb"
  page: "#ffffff"
  sunk: "#eceff6"
  ink: "#0d1220"
  ink-2: "#3b4357"
  ink-3: "#586079"
  rule: "#d6dbe8"
  rule-2: "#7a849a"
  spot: "#2b3bd6"
  on-spot: "#ffffff"
  wash: "#e7eafb"
  wash-2: "#d4d9f7"
  ok: "#0f7a4d"
  bad: "#b42318"
  dark-paper: "#0a0e19"
  dark-page: "#101626"
  dark-sunk: "#0d1220"
  dark-ink: "#e8ebf5"
  dark-ink-2: "#b9c0d4"
  dark-ink-3: "#8f99b3"
  dark-rule: "#232b44"
  dark-rule-2: "#606b89"
  dark-spot: "#8f9cff"
  dark-on-spot: "#0a0e19"
  dark-wash: "#171e3c"
  dark-wash-2: "#222b55"
  dark-ok: "#5fd29d"
  dark-bad: "#ff8a7d"
typography:
  headword:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 5.6vw, 4.6rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  page-title:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "clamp(2rem, 3.4vw, 2.6rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "1.08rem"
    fontWeight: 650
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "1.1rem"
    fontWeight: 400
    lineHeight: 1.5
  ui:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  gloss-italic:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 600
    letterSpacing: "0.07em"
  code:
    fontFamily: "JetBrains Mono, ui-monospace, Menlo, monospace"
    fontSize: "0.72rem"
    fontWeight: 500
rounded:
  sm: "3px"
  md: "6px"
  lg: "10px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "40px"
  4xl: "48px"
  rail-w: "216px"
  sheet-w: "432px"
  top-h: "56px"
components:
  button:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
  button-hover:
    textColor: "{colors.spot}"
  button-primary:
    backgroundColor: "{colors.spot}"
    textColor: "{colors.on-spot}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
  field:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "46px"
    padding: "0 14px"
  chip:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  chip-pressed:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.spot}"
  sense-numeral:
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    size: "26px"
  sense-numeral-focus:
    backgroundColor: "{colors.spot}"
    textColor: "{colors.on-spot}"
  side-sheet:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    width: "432px"
  rail-tab-current:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  graph-node:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "9px 12px 10px"
  command-palette:
    backgroundColor: "{colors.page}"
    rounded: "{rounded.lg}"
---

# Design System: Türkçe WordNet Arayüzü

## Overview

**Creative North Star: "İki Renkli Sözlük"**

A two-colour printed dictionary rendered as a local NLP workbench: cool thin paper, blue-black ink, and a single ultramarine spot that marks interaction and focus. Hierarchy comes from weight, size, rules and line style, not a rainbow. The same restrained visual language spans the 13 lexical, morphology, parsing, dependency, corpus, n-gram and lesson views. Schibsted Grotesk carries interface structure, Spectral carries reading, and JetBrains Mono carries codes, counts and keys.

Density is calm but reference-grade: a 15px root, 980px reading column (1240px for wide views), hairline borders, and generous row padding. It is used on a projector, laptop and mobile screen in light and dark themes; presentation scale (x1.22) is a first-class state. Navigation follows course flow, and long labs use in-page section indexes, progressive disclosure and local table scrollers.

Categories (hypernym, part, derivation, antonym, cause) are told apart by line style: solid, dashed, dotted, double, dash-dot. Colour is never the carrier of category.

**Key Characteristics:**
- One spot colour (ultramarine) on interactive or focused things only.
- Category by line style; ink-grey strokes for all relation kinds.
- Boxed sense numerals, a mirrored TR | EN seam column, a right-hand concept sheet, and a thumb-index notch on the rail.
- A consistent paper / ink vocabulary across all 13 views; Öğrenci mode reveals marked instructional content, while Araç mode keeps results central.
- Flat at rest; hairlines for structure, one soft float shadow for overlays.
- Light and dark are the same two-colour system with inverted paper and ink.

## Colors

Cool paper, blue-black ink, one ultramarine. Dark mode swaps paper and ink and lightens the spot; the roles are identical.

### Primary
- **Ultramarine Spot** (`spot`, dark `dark-spot`): links, hover/active borders, focus ring, the current rail notch, the focused sense numeral, primary buttons, selected chips, meter fill, hot graph edges, cross-language and frame edges.
- **Spot Wash** (`wash`, `wash-2`, dark equivalents): the pale ultramarine field behind focused senses, selected chips, hovered list rows, selection highlight, and the 3px focus halo on fields.

### Neutral
- **Cool Paper** (`paper`): app background, rail, graph canvas.
- **White Page** (`page`): raised surfaces: buttons, fields, cards, sheet, dialogs, graph nodes.
- **Sunk Paper** (`sunk`): hover fills, segmented-control tray, notices, skeleton base.
- **Blue-Black Ink** (`ink`): headwords, body text, heavy rules (2px under the entry head, 1px under running head and table heads).
- **Ink 2 / Ink 3** (`ink-2`, `ink-3`): secondary text and edge strokes; tertiary labels, metadata and placeholders.
- **Rule / Rule 2** (`rule`, `rule-2`): `rule` is a decorative hairline; `rule-2` (`#7a849a` light, `#606b89` dark) is the stronger border for controls, nodes and visible interaction boundaries.
- **Verdict Green / Red** (`ok`, `bad`): used only for correct / wrong feedback in quizzes, as a 2px border plus a faint tinted fill.

### Named Rules
**The One Spot Rule.** Ultramarine marks only what is clickable or currently focused. It never decorates headings, backgrounds or categories.
**The Line-Not-Hue Rule.** A relation family is identified by stroke pattern (solid hierarchy, dashed part, dotted derivation, double antonym, dash-dot cause) in ink-2. Hue is never added to tell categories apart.
**The Quiz-Only Signal Rule.** Green and red exist solely for answer feedback; they never appear in navigation or data.

## Typography

**Display / UI Font:** Schibsted Grotesk (system-ui fallback), variable 400-900
**Body Font:** Spectral (Georgia fallback), 400 and 600, roman and italic
**Label/Mono Font:** JetBrains Mono (ui-monospace fallback), 400 and 500

**Character:** A dense grotesk for words and structure against a bookish serif for meaning. Mono is reserved for machine-like facts (language codes, counts, shortcuts, lexical file names).

### Hierarchy
- **Headword** (800, clamp(2.6rem, 5.6vw, 4.6rem), 0.95, -0.035em): the entry lemma.
- **Page title** (800, clamp(2rem, 3.4vw, 2.6rem), 1.05, -0.03em): view titles.
- **Headline** (800, 1.3-1.5rem, 1.15, about -0.02em): lesson titles, frame names, sheet title (1.9rem), dialog titles.
- **Title** (650, 1.08rem): synonym buttons in a sense line; graph node words are 700 at 1rem.
- **Body** (Spectral 400, 1.1rem, 1.5, max 66ch): definitions; examples are italic 1rem at 62ch; lesson prose 1.06rem at 68ch.
- **UI** (Schibsted 400-550, 0.84-1rem): buttons, tabs, controls.
- **Gloss italic** (Spectral italic 400, 0.9-1rem, ink-3): part of speech, entry meta, empty states, graph node POS.
- **Label** (600, 0.7-0.72rem, 0.07em, uppercase, ink-3): column and table heads, rail and sheet section heads, legend heads.
- **Code** (JetBrains Mono 500, 0.66-0.78rem): language tags (TR/EN), counts, key hints, edge labels, lexical-file tags.

### Named Rules
**The Serif-Means Rule.** Spectral carries definitions, examples, glosses and prose; Schibsted carries words-as-objects and structure. Do not set definitions in the grotesk.
**The Tabular Rule.** Numerals are tabular (`tnum`) at body level so scores and counts align.

## Layout

App shell is a three-column grid: rail (216px), stage (fluid), sheet (0 or 432px), with a 0.32s house ease on the grid transition. A 56px sticky topbar carries the omnibox (max 560px), dictionary selection on relevant lexical views, mode selection, and utility actions. Content pages centre at 980px (1240px wide variant) with 30px / 32px padding. Dictionary entries use a three-column sense grid: 34px numeral, fluid main text, 220px translation seam, separated by a 1px rule. NLP views reuse the same page frame for controls, long-form results, data tables, diagrams and student-only explanations rather than forcing each into the dictionary layout.

Spacing follows the CSS token scale 4 / 8 / 12 / 16 / 24 / 32 / 40 / 48px; row padding is 14-18px; hairline-divided lists rather than card stacks. Graph view fills viewport minus the topbar on a 22px dot-grid paper. Grouped navigation and section indexes orient users without changing the app's single-page flow.

Responsive: at 1180px the sheet overlays instead of reflowing; at 860px the rail becomes an off-canvas drawer, the translation seam drops below the sense with a dashed top rule, the sheet becomes a bottom sheet (78vh, 50vh over graph) with 14px top corners, and the graph legend hides. At 520px the omnibox moves to its own row and the mode, dictionary-language and theme controls remain visible in a second row. In the mobile layout, primary controls and touch targets are at least 40px high. Tables and diagrams retain their own keyboard-focusable horizontal scroll containers where their full structure cannot fit. Presentation mode scales the root by 1.22 while preserving an accessible exit control.

## Elevation & Depth

Flat by default; depth is expressed with hairlines, the sunk/page/paper tonal steps, and heavier ink borders. One float shadow (`0 1px 2px` plus `0 8px 16px -6px`, ink-tinted) is used only for the side sheet, dialogs and the mobile rail. Graph nodes carry a faint 1px-ambient shadow and lift on hover. Emphasis halos are flat wash rings (`0 0 0 4-6px wash`), not blurs. The topbar and dialog backdrop use a light backdrop blur.

### Named Rules
**The Ring-Not-Glow Rule.** Focus and emphasis are crisp solid rings in wash or spot, never diffuse glows.

## Shapes

Small, precise radii: 3px for numerals, tags and small controls; 6px for buttons, fields, nodes and notices; 10px for dialogs; full pill only for chips and graph edge labels. Borders are 1px hairlines; the focused or central object upgrades to a 2px ink or spot border. Dashed spot borders mark frames; dotted borders mark "more" placeholders. Sense numerals are square-cornered boxes (26px, 1px ink border) rather than circles. The active rail tab opens a half-round spot notch on the page edge (thumb index).

## Components

### Buttons
- **Shape:** 6px radius, 36px high (30px small), 1px `rule-2` border, page fill.
- **Primary:** spot fill, on-spot text; hover brightens.
- **Ghost:** transparent; hover sunk fill.
- **Hover / Focus:** border and text turn spot; 2px spot outline with 2px offset on `:focus-visible`. Disabled is 45% opacity.

### Chips and Tags
- **Chip:** pill, page fill, ink-2 text, 1px rule border; pressed state is wash fill with spot border and text.
- **Tag / lexical-file label:** 3px radius, mono 0.72rem, ink-3, hairline border.

### Inputs / Fields
- **Style:** 46px (38px small) page-fill box, 1px `rule-2`, 6px radius; text areas use Spectral.
- **Focus:** spot border plus a 3px `wash-2` halo. Caret is spot.

### Navigation
- **Rail:** paper background, right hairline, wordmark in 800 grotesk, vertical tabs grouped into Sözcük anlamı, Lecture 2, Lecture 3, Lecture 5 and Ders; the current tab is page-coloured and fused to the edge with a spot half-circle notch; mono keyboard hints appear on hover. Recent-trail list and saved concepts appear only on relevant WordNet views.
- **Underline tabs / segmented control:** 2px spot underline for the current tab; segmented control is a sunk tray with a page-coloured pressed segment.

### Tool and Student Modes
- **Mode switch:** an explicitly labelled Araç / Öğrenci segmented control in the topbar, with visible supporting text that describes its effect. Its pressed state uses the page-on-sunk treatment and remains available at narrow widths.
- **Instructional content:** `.stu` content is visible only in Student mode; the Ders view is Student-only. The mode distinction changes explanation density, not the underlying calculation or data.

### NLP Controls and Results
- **Controls:** grouped fields and segmented choices sit close to their related output; use existing button, field, chip and tag primitives.
- **Results:** tables use tabular numerals, restrained header labels and hairline row rules. Wide matrices and parse / dependency diagrams scroll inside their own focusable wrappers instead of widening the page; scroll affordances remain visible.
- **Study sections:** explanations, method notes, exercises and lesson prose follow the same ink / paper hierarchy and are not decorated as a second visual product. `.stu` marks all instructional content; it is hidden in Araç and visible in Öğrenci mode. Long Morfoloji, Ayrıştırma and N-gram views use in-page section indexes; advanced controls use native disclosure.
- **Status and errors:** asynchronous loading, empty and failure messages use clear Turkish copy and status semantics; error states do not masquerade as empty results.
- **Navigation groups:** rail sections follow Sözcük anlamı / Lecture 2 / Lecture 3 / Lecture 5 / Ders; recent WordNet history and saved concepts appear only where they are relevant.
- **Section index:** native `details.section-index` reveals anchored links within long views; keep section headings focusable and offset below the sticky topbar.
- **Advanced controls:** native `details.ng-advanced` keeps secondary N-gram settings available without competing with its primary controls.
- **Touch and focus:** mobile action targets reach 40px minimum height; all focusable local scroll regions have an accessible name and visible focus ring.

### Sense Entry (signature)
Heavy 2px ink rule under the headword; each sense has a boxed numeral, bold synonym buttons separated by pale slashes, a Spectral definition, italic example in curly quotes, and a mirrored English seam column on the right. Focusing a sense fades the others to 65%, fills it with wash, turns its numeral solid spot and reveals the expanded body.

### Side Sheet (kenar kâğıdı)
432px white page sliding from the right, history stack of folder-tab buttons with a 2px bottom edge, uppercase section heads, relation groups headed by a 28px sample of their line style, and relation pills (3px radius).

### Graph
Nodes are white 6px-radius cards; the centre node is 268px wide with a 2px ink border and wash ring; frames are dashed spot; "more" is dotted. Edges are 1.4px ink-2 strokes in the five line styles; the hot edge and its label turn spot at 2.4px. Non-neighbours drop to 40% opacity while a node has focus. A clickable legend (34px line samples with counts) toggles families. Nodes arrive with a 0.42s staggered rise.

### Command Palette and Dialogs
10px-radius white panels on a 42% dark backdrop, 56px input row, grouped uppercase heads, selected row in wash with spot text, mono shortcut at the right, a sunk footer.

### Motion
One easing, `cubic-bezier(.16,1,.3,1)`; durations 0.15s (colour), 0.22s (focus/opacity), 0.3-0.34s (layout, sheet), 0.55s (graph pan). Reduced-motion collapses all durations to near zero.

## Do's and Don'ts

### Do:
- **Do** reserve `spot` for clickable or focused elements and for the primary action.
- **Do** distinguish relation kinds by stroke pattern in ink-2 (solid, dashed, dotted, double, dash-dot) and show a sample of the line in every legend or group head.
- **Do** keep definitions and examples in Spectral, words and structure in Schibsted Grotesk, codes and counts in JetBrains Mono.
- **Do** build new surfaces from hairline rules and the paper / page / sunk steps; use a 2px ink border to mark the one central object.
- **Do** define every new colour in both the light and dark token sets and verify contrast on both.
- **Do** keep keyboard focus visible with the 2px spot outline.

### Don't:
- **Don't** add a second accent hue or colour-code categories.
- **Don't** use green or red outside quiz feedback.
- **Don't** wrap content in shadowed cards; use rules and tonal steps.
- **Don't** use blur or glow shadows for emphasis; use flat wash rings.
- **Don't** set definitions or prose in the grotesk, or UI chrome in the serif.
