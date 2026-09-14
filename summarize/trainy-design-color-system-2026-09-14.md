# Trainy design color system

## Scope and outcome

Added the initial English-language Trainy design system specification. The document
defines the brand palette, light and dark semantic color tokens, workflow status
colors, chart colors, shadcn/ui usage rules, and accessibility requirements.

## Files changed

- `design.md`: added the product design thesis, color system, ready-to-implement CSS
  token reference, component guidance, and accessibility rules.
- `summarize/trainy-design-color-system-2026-09-14.md`: added this task summary.

## Important decisions

- Trainy Ink and Trainy Paper carry the calm, durable interface.
- Trainy Lime is a controlled brand accent for progress and active moments rather
  than a general-purpose text color.
- shadcn/ui semantic CSS variables are the implementation contract.
- Workflow states use a separate accessible palette and always include a written
  label; user roles are not identified by color alone.
- The existing application theme was not changed in this task. The document defines
  a target contract for a later, separately tested UI migration.

## Dependency changes

None.

## Verification

- `bunx prettier --check design.md summarize/trainy-design-color-system-2026-09-14.md`:
  passed after formatting the new document.
- `git diff --check`: passed.
- `bun audit`: passed; no vulnerabilities were found in 310 checked packages.
- Color contrast calculations: completed for the documented core foreground and
  background pairs using the WCAG relative-luminance formula.

## Known limitations

- The target tokens have not yet been applied to `client/src/index.css`.
- Component-level light and dark visual regression testing remains part of the future
  implementation task.

## Commit information

Local commit message: `docs(design): define Trainy color system`.

## Suggested next step

Apply the documented tokens to the client theme, add semantic status tokens through
`@theme inline`, then review the dashboard, forms, tables, dialogs, and mobile
navigation in both light and dark modes.
