# Bug report template

Write to `bug-reports/<yyyy-mm-dd>-<slug>.md` (create the folder if missing) and reference it from the test with `test.fixme('BUG-<n>: <title>')` only when the user agrees to skip the test.

```markdown
### BUG-<n> — <one-line title>

**Summary:** <what is wrong, in one sentence>

**Environment:** <BASE_URL or API_BASE_URL>, user/role `<E2E_USERNAME or API role>`, browser <chromium version>, date <yyyy-mm-dd>

**Steps to reproduce:**
1. …
2. …
3. …

**Expected result:** <from the requirement / previous behavior>

**Actual result:** <what happens; include exact text, status code, payload excerpt>

**Evidence:** `test-results/<dir>/test-failed-1.png`, trace `test-results/<dir>/trace.zip`, playwright-cli snapshot excerpt

**Severity:** <blocker | high | medium | low> — <why>

**Automated test:** `<spec path>` › `<test title>` (currently failing / marked fixme)
```
