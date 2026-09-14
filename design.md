# Trainy Design System

## 1. Design thesis

Trainy is a calm, trustworthy workspace for internship coordination. It should feel
simple enough to open every day, clear enough to reveal the next action immediately,
and durable enough to avoid looking tied to a short-lived visual trend.

The visual system combines four ideas:

- **Quiet precision:** restrained surfaces, strong hierarchy, and minimal decoration.
- **Familiar structure:** settings-like grouping and predictable navigation.
- **Gentle momentum:** visible progress and one obvious next action without guilt,
  pressure, or manipulative streak mechanics.
- **Institutional trust:** accessible contrast, explicit status language, and consistent
  behavior across student, university, and company workspaces.

The product should be calm on the outside and motivating on the inside.

## 2. Brand palette

| Name         | Value     | Purpose                                                |
| ------------ | --------- | ------------------------------------------------------ |
| Trainy Ink   | `#10110F` | Primary text, high-emphasis actions, dark surfaces     |
| Trainy Lime  | `#C8FF48` | Brand accent, progress, active moments, focus emphasis |
| Trainy Paper | `#F3F1E9` | Main light background                                  |
| Trainy Card  | `#FBFAF5` | Cards, sheets, and raised light surfaces               |
| Trainy Stone | `#E5E5DD` | Secondary controls and grouped surfaces                |
| Trainy Gray  | `#5F615A` | Secondary text on light surfaces                       |

### Color character

Trainy Lime is the memorable color, but it is not a general-purpose text color. Use it
for progress, selected moments, focus, small brand details, and high-emphasis actions
on dark surfaces. Trainy Ink carries most of the interface and prevents the product
from becoming visually loud or dependent on a trend.

Do not introduce a different accent color for each navigation item or user role.
Roles are communicated by labels, permissions, and content—not by color alone.

## 3. shadcn/ui theme contract

Trainy uses shadcn/ui components as owned source code, with CSS variables enabled in
`client/components.json`. Components must consume semantic utilities such as
`bg-background`, `text-foreground`, `bg-primary`, and `border-border`. Feature code
must not reproduce these palette values with arbitrary hex classes.

The base `new-york` component style remains the structural starting point. Trainy's
identity comes from the tokens, typography, spacing, composition, and product-specific
states below—not from editing vendored primitives for each screen.

### Light theme

| Token                    | Value     | Intended use                                                 |
| ------------------------ | --------- | ------------------------------------------------------------ |
| `background`             | `#F3F1E9` | App shell and page background                                |
| `foreground`             | `#10110F` | Default text and icons                                       |
| `card`                   | `#FBFAF5` | Cards and grouped content                                    |
| `card-foreground`        | `#10110F` | Content on cards                                             |
| `popover`                | `#FFFFFF` | Menus, popovers, and floating panels                         |
| `popover-foreground`     | `#10110F` | Content on floating panels                                   |
| `primary`                | `#10110F` | Primary buttons and highest-emphasis actions                 |
| `primary-foreground`     | `#FFFFFF` | Content on primary actions                                   |
| `secondary`              | `#E5E5DD` | Secondary buttons and supporting surfaces                    |
| `secondary-foreground`   | `#1B1D18` | Content on secondary surfaces                                |
| `muted`                  | `#EAE9E2` | Subdued areas and disabled-looking surfaces                  |
| `muted-foreground`       | `#5F615A` | Helper text and non-critical metadata                        |
| `accent`                 | `#C8FF48` | Selected items, progress highlights, and purposeful emphasis |
| `accent-foreground`      | `#10110F` | Content on the lime accent                                   |
| `destructive`            | `#B42332` | Destructive actions and critical errors                      |
| `destructive-foreground` | `#FFFFFF` | Content on destructive surfaces                              |
| `border`                 | `#D6D5CD` | Dividers and card borders                                    |
| `input`                  | `#C9CAC1` | Input borders                                                |
| `ring`                   | `#75A800` | Keyboard focus ring on light surfaces                        |

### Dark theme

| Token                    | Value     | Intended use                              |
| ------------------------ | --------- | ----------------------------------------- |
| `background`             | `#10110F` | App shell and page background             |
| `foreground`             | `#F3F1E9` | Default text and icons                    |
| `card`                   | `#1A1C17` | Cards and grouped content                 |
| `card-foreground`        | `#F3F1E9` | Content on cards                          |
| `popover`                | `#21231D` | Menus, popovers, and floating panels      |
| `popover-foreground`     | `#F3F1E9` | Content on floating panels                |
| `primary`                | `#C8FF48` | Primary buttons and active moments        |
| `primary-foreground`     | `#10110F` | Content on primary actions                |
| `secondary`              | `#2A2D25` | Secondary buttons and supporting surfaces |
| `secondary-foreground`   | `#F3F1E9` | Content on secondary surfaces             |
| `muted`                  | `#24261F` | Subdued areas                             |
| `muted-foreground`       | `#A8AAA1` | Helper text and metadata                  |
| `accent`                 | `#C8FF48` | Selected and focused states               |
| `accent-foreground`      | `#10110F` | Content on the lime accent                |
| `destructive`            | `#FF6B72` | Destructive actions and critical errors   |
| `destructive-foreground` | `#10110F` | Content on destructive surfaces           |
| `border`                 | `#34362F` | Dividers and card borders                 |
| `input`                  | `#3F4239` | Input borders                             |
| `ring`                   | `#C8FF48` | Keyboard focus ring                       |

### CSS token reference

The following palette is implemented in `client/src/index.css`. Treat these semantic
tokens as the source of truth for new UI, and keep visual and accessibility regression
tests aligned whenever the palette changes.

```css
:root {
  --radius: 0.875rem;
  --background: #f3f1e9;
  --foreground: #10110f;
  --card: #fbfaf5;
  --card-foreground: #10110f;
  --popover: #ffffff;
  --popover-foreground: #10110f;
  --primary: #10110f;
  --primary-foreground: #ffffff;
  --secondary: #e5e5dd;
  --secondary-foreground: #1b1d18;
  --muted: #eae9e2;
  --muted-foreground: #5f615a;
  --accent: #c8ff48;
  --accent-foreground: #10110f;
  --destructive: #b42332;
  --destructive-foreground: #ffffff;
  --border: #d6d5cd;
  --input: #c9cac1;
  --ring: #75a800;
  --chart-1: #75a800;
  --chart-2: #276e72;
  --chart-3: #3468c0;
  --chart-4: #b86518;
  --chart-5: #7652a8;
  --sidebar: #10110f;
  --sidebar-foreground: #f3f1e9;
  --sidebar-primary: #c8ff48;
  --sidebar-primary-foreground: #10110f;
  --sidebar-accent: #2a2d25;
  --sidebar-accent-foreground: #f3f1e9;
  --sidebar-border: #34362f;
  --sidebar-ring: #c8ff48;
}

.dark {
  --background: #10110f;
  --foreground: #f3f1e9;
  --card: #1a1c17;
  --card-foreground: #f3f1e9;
  --popover: #21231d;
  --popover-foreground: #f3f1e9;
  --primary: #c8ff48;
  --primary-foreground: #10110f;
  --secondary: #2a2d25;
  --secondary-foreground: #f3f1e9;
  --muted: #24261f;
  --muted-foreground: #a8aaa1;
  --accent: #c8ff48;
  --accent-foreground: #10110f;
  --destructive: #ff6b72;
  --destructive-foreground: #10110f;
  --border: #34362f;
  --input: #3f4239;
  --ring: #c8ff48;
  --chart-1: #c8ff48;
  --chart-2: #6ed3d5;
  --chart-3: #80a9ff;
  --chart-4: #ffad5c;
  --chart-5: #c19aef;
  --sidebar: #151711;
  --sidebar-foreground: #f3f1e9;
  --sidebar-primary: #c8ff48;
  --sidebar-primary-foreground: #10110f;
  --sidebar-accent: #2a2d25;
  --sidebar-accent-foreground: #f3f1e9;
  --sidebar-border: #34362f;
  --sidebar-ring: #c8ff48;
}
```

If additional semantic tokens are added, expose them through `@theme inline` so the
same Tailwind utility contract is available everywhere.

## 4. Workflow status colors

Status colors supplement a written label and icon; they never carry meaning alone.
Use the soft background for badges and notices, the foreground for text and icons,
and the strong color only for small indicators or charts.

| State       | Strong    | Soft background | Foreground | Examples                              |
| ----------- | --------- | --------------- | ---------- | ------------------------------------- |
| Success     | `#24845A` | `#DDF7E9`       | `#155C3A`  | Approved, complete, on schedule       |
| Information | `#367DB5` | `#DDEEFF`       | `#174B7A`  | Draft, general update, neutral review |
| Warning     | `#C78316` | `#FFF0C2`       | `#6B4500`  | Due soon, incomplete, needs attention |
| Critical    | `#B42332` | `#FCE4E7`       | `#7B1823`  | Rejected, overdue, blocking error     |
| Neutral     | `#74776E` | `#EAE9E2`       | `#4B4D47`  | Not started, archived, unavailable    |

Do not use the critical palette for ordinary validation guidance or a missed day. Use
warning for recoverable attention and critical only when an action is blocked,
destructive, rejected, or materially overdue.

## 5. Color application rules

### Primary actions

- Show one default `Button` as the primary action in a task region.
- Use `variant="secondary"`, `variant="outline"`, or `variant="ghost"` for supporting
  actions.
- Use `variant="destructive"` only for actions that remove, revoke, reject, or cause
  similarly serious consequences.
- On light pages, the primary action is Trainy Ink. On dark pages, it is Trainy Lime.

### Progress and motivation

- Lime marks forward movement: current steps, completed progress, an active date, or a
  positive milestone.
- A progress bar must include a number or label such as `128 / 480 hours`.
- Do not color every completed item lime. In dense histories, reserve lime for the
  current summary and use the success palette for status badges.
- Never use red to shame inactivity or break a habit streak.

### Surfaces

- Prefer background, card, border, and spacing hierarchy over heavy shadows.
- Cards group related information; they are not wrappers for every line of content.
- Use a maximum of three surface levels in one view: page, grouped surface, and
  floating overlay.
- Lime surfaces should occupy only a small portion of a normal working screen.

### Data visualization

- Charts use `chart-1` through `chart-5` in order.
- Do not assign permanent chart colors to user roles; the same role may appear in
  several unrelated data sets.
- Pair color with a legend, direct label, pattern, or marker shape.
- Status charts should use the workflow status palette instead of the categorical
  chart palette.

## 6. shadcn/ui component guidance

Use the existing components under `client/src/components/ui` first. Add a shadcn/ui
component only when the product needs that interaction; do not add components to fill
out a catalog.

| Need               | shadcn/ui primitive      | Trainy treatment                                        |
| ------------------ | ------------------------ | ------------------------------------------------------- |
| Main action        | `Button`                 | One primary action per task region                      |
| Grouped content    | `Card`                   | Quiet border, no oversized shadow                       |
| Status             | `Badge`                  | Semantic soft background plus explicit text             |
| Confirmation       | `AlertDialog`            | Required for destructive or irreversible actions        |
| Short choice       | `RadioGroup` or `Select` | Use labels that describe the consequence                |
| Boolean setting    | `Switch`                 | Use only when the change applies immediately            |
| Additional details | `Sheet`                  | Prefer on mobile and for non-blocking context           |
| Focused decision   | `Dialog`                 | Keep one clear decision and an obvious close action     |
| Progress           | `Progress`               | Always pair with readable progress text                 |
| Temporary feedback | `Sonner`                 | Confirm success briefly; keep errors near the source    |
| Loading            | `Skeleton`               | Match the final layout and avoid layout shifts          |
| Empty state        | `Empty`                  | Explain what is missing and offer the next valid action |

Compose and restyle primitives at the feature level. Avoid one-off overrides that
change the meaning of semantic tokens, such as using `bg-accent` for a destructive
button or `text-destructive` for ordinary metadata.

## 7. Accessibility requirements

- Normal text must meet WCAG AA contrast of at least `4.5:1`; large text and essential
  non-text UI must meet at least `3:1`.
- Trainy Ink on Trainy Paper is `16.74:1`; Trainy Ink on Trainy Lime is `16.10:1`;
  Trainy Gray on Trainy Paper is `5.55:1`.
- Lime text must not be placed directly on Trainy Paper or white. Use Trainy Ink text
  on a lime surface instead.
- Every focusable control must retain a visible focus ring. Never remove shadcn/ui
  focus styles without an equivalent replacement.
- Hover, focus, selected, disabled, error, and success states must differ by more than
  color alone when the distinction affects the task.
- Check color pairs in both light and dark themes during implementation.

## 8. References

- [shadcn/ui theming](https://ui.shadcn.com/docs/theming)
- [shadcn/ui dark mode for Vite](https://ui.shadcn.com/docs/dark-mode/vite)
- [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)
