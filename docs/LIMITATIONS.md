# Known Limitations

## Unsupported Field Types

### File Upload (resume re-upload inside Workday)
Workday sometimes shows a file upload field for the resume itself inside the application form. The `fileFiller.ts` module uses the `DataTransfer` API to inject a file, but Workday's own file upload component uses a custom drag-drop zone that does not respond to programmatic `DataTransfer` injection in all browsers. These fields are automatically marked `manual_required` and highlighted red — the user must upload manually.

### CAPTCHA / Bot Detection
If Workday detects automated input and shows a CAPTCHA challenge, the extension halts. There is no CAPTCHA solving. The user must solve it manually; the extension resumes on the next step detection.

### Multi-Page Modals
Some Workday postings open additional questions inside a modal dialog (e.g. EEO disclosures, voluntary self-identification). The content script scans `document` but not modal-specific containers with non-standard shadow DOM boundaries. Fields inside these modals may be missed.

### Repeatable Sections Beyond Two Entries
`repeatableSectionFiller.ts` handles clicking "Add Another" for experience and education entries, but only up to the number of entries in the resume. If Workday imposes a maximum number of entries that is lower than the resume has, the extra entries are silently skipped — no error is shown.

### Date Pickers with Custom Calendar Widgets
Some Workday postings use a calendar widget (month/year dropdowns) instead of a plain text date input. `dateFiller.ts` fills plain `<input type="text">` fields with `MM/DD/YYYY` format. Calendar widgets require separate interaction (open → select month → select year) which is not currently implemented.

---

## Known Workday UI Variants That May Cause Issues

### Workday Version Differences
Workday rolls out UI updates to tenants at different times. The `data-automation-id` attributes used for field detection are generally stable across versions, but Workday occasionally renames them (e.g. `firstName` vs `legalNameFirstName`). If a field is not found, the extension falls back to `aria-label` then label text matching.

### SSO / Federated Login
If a company uses SSO (e.g. Okta, Microsoft SSO) for Workday authentication, the login flow goes through a third-party domain. `loginWatcher.ts` detects the login step by URL pattern and DOM signature — it will wait up to 5 minutes for the step to advance past login, which covers most SSO flows. However, MFA steps that require a hardware key or push notification beyond 5 minutes will time out.

### Embedded Workday (iFrame)
Some company career pages embed the Workday application form in an `<iframe>`. Content scripts run in the top-level document by default. If the Workday form is in a cross-origin iframe, the content script cannot access it. The manifest declares host permissions for `*.myworkdayjobs.com` and `*.wd5.myworkdayjobs.com` which covers direct Workday domains, but not parent pages with embedded iframes.

### Dynamic Field Visibility
Some fields only appear after another field is filled (e.g. a "Country" dropdown that reveals "State/Province"). `mutationWatcher.ts` uses a `MutationObserver` to detect new fields appearing in the DOM, which handles most cases. However, fields that appear after a network request (rather than immediate DOM change) may have a race condition if the request takes more than 300ms.

### Long Application Forms (30+ Fields)
The fill engine processes fields sequentially with a 150–300ms delay between fills. A form with 30 fields takes roughly 6–9 seconds to fill. During this time, if the user interacts with the page or Workday auto-saves and re-renders fields, some fills may land on stale elements. The 3-attempt retry with element re-lookup handles most cases.

---

## AI Mapping Limitations

### Unusual or Ambiguous Field Labels
Field labels like "Source" (referral source), "Availability" (start date or availability to work), or "Level" (seniority level or education level) are ambiguous. The confidence threshold of 0.6 means these are usually flagged for review rather than auto-filled.

### Resume Gaps and Non-Standard Formats
Functional resumes (skills-first, no dates), academic CVs, or resumes with heavy use of tables and columns may produce lower-quality parsing output from `pdf-parse` and `mammoth`. The raw text extraction is line-by-line — complex layouts lose their structure.

### Custom Application Questions
Open-ended questions like "Why do you want to work here?" or "Describe a challenge you overcame" have `needsReview: true` forced regardless of confidence, since generated answers require human review before submission.
