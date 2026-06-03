# Workday DOM Structure

## Target Job Postings

| Company | URL Pattern |
|---------|-------------|
| NVIDIA | `nvidia.wd5.myworkdayjobs.com` |
| Remitly | `remitly.wd5.myworkdayjobs.com` |
| PNC | `pnc.wd1.myworkdayjobs.com` |
| Netflix | `netflix.wd5.myworkdayjobs.com` |

## Application Steps (in order)

1. **Job Details** — read-only job info, "Apply" button
2. **Login / Create Account** — Workday SSO or new account
3. **My Information** — name, contact, address, work authorization
4. **Experience** — work history (repeatable section)
5. **Education** — degrees (repeatable section)
6. **Application Questions** — custom per-employer questions
7. **Review** — summary of all filled values
8. **Submit** — final confirmation

## Field Types Encountered

| Field Type | Selector Strategy | Notes |
|------------|------------------|-------|
| Text input | `[data-automation-id]` → `[aria-label]` → label text | React-controlled — must use nativeInputValueSetter |
| Textarea | Same as text input | Multi-line, same event pattern |
| Dropdown (combobox) | `role="combobox"` + `[data-automation-id]` | Must click to open, wait for listbox, click option |
| Date picker | `[data-automation-id="dateSectionDay"]` etc. | Three separate inputs: month/day/year |
| Radio group | `role="radio"` within `role="radiogroup"` | Click the label or input directly |
| Checkbox | `role="checkbox"` | Toggle via click, not `.checked =` |
| File upload | `input[type="file"]` | Use DataTransfer API to set files |
| Repeatable section | "Add Another" button pattern | Click to add row, fill row, repeat |

## Selector Priority (no hardcoded class names)

1. `[data-automation-id]` — most stable, Workday-specific
2. `[aria-label]` — semantic, stable across deploys
3. Label text matching — find `<label>` by text, get associated input
4. `[placeholder]` — fallback for text inputs
5. ARIA role (`role="combobox"`, `role="radio"`, `role="listbox"`)

## React Event Simulation (required for all text fields)

Workday uses React's synthetic event system. Direct `.value =` assignment does not trigger React state updates.

```js
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype, 'value'
).set
nativeInputValueSetter.call(input, value)
input.dispatchEvent(new Event('input', { bubbles: true }))
input.dispatchEvent(new Event('change', { bubbles: true }))
input.dispatchEvent(new Event('blur', { bubbles: true }))
```

## Known DOM Patterns

### Step Detection
- URL contains `/job/` + step slug
- `[data-automation-id="progressStep"]` elements indicate current step
- Step title visible in `h2` or `[data-automation-id="formLabel"]`

### Dropdown Option Selection
```
1. Click combobox to open
2. Wait for [role="listbox"] to appear
3. Find [role="option"] matching target text
4. Click option
5. Verify combobox value updated
```

### Repeatable Section (Experience / Education)
```
1. Fill existing empty row
2. If more entries needed, find button with text "Add Another" or aria-label containing "Add"
3. Wait for new row to render (MutationObserver)
4. Fill new row
```
