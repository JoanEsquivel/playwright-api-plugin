# Snapshot element → locator

| Snapshot line | Preferred | Fallback |
|---|---|---|
| `textbox "Label"` | `page.getByRole('textbox', { name: 'Label' })` | `page.getByLabel('Label')` |
| `button "Label"` | `page.getByRole('button', { name: 'Label' })` | `page.locator('[data-test="…"]')` |
| `link "Label"` | `page.getByRole('link', { name: 'Label' })` | `page.getByText('Label', { exact: true })` |
| `heading "Label" [level=N]` | `page.getByRole('heading', { name: 'Label' })` | `page.locator('[data-test="title"]')` |
| `checkbox "Label"` / `radio "Label"` / `switch "Label"` | `page.getByRole('<role>', { name: 'Label' })` | `page.getByLabel('Label')` |
| `combobox "Label"` | `page.getByRole('combobox', { name: 'Label' })` | `page.getByLabel('Label')` |
| `img "alt"` | `page.getByRole('img', { name: 'alt' })` | `page.getByAltText('alt')` |
| `alert` / `status` | `page.getByRole('alert')` | `page.locator('[data-test="error"]')` |
| Repeated cards/rows | `page.locator('[data-test="item"]')` | `page.getByRole('listitem')` |
| Only `data-test`/`data-testid` | `page.locator('[data-test="value"]')` | — |
| Prefixed ids (`add-to-cart-<slug>`) | `page.locator('[data-test^="add-to-cart"]')` | — |
| Text only | `page.getByText('text', { exact: true })` | request a test id |

Rules: chain `.describe('<Accessible name> <role>')`; narrow with `.filter({ hasText })` rather than `.nth()`; never CSS classes, ids, XPath.

`waitLoad()` anchor: the page heading or primary action; unique to the page; never a spinner or shared header element.
