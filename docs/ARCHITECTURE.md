# Architecture

## Request / Response Flow

```
User clicks "Autofill" in popup
        │
        ▼
[Popup] sendMessage({ type: 'START_FILL' })
        │
        ▼
[Background Service Worker]
  - Reads JWT from chrome.storage.session
  - Calls backend POST /api/applications (creates record)
  - Returns applicationId to popup
        │
        ▼
[Background] sendMessage({ type: 'SCAN_FIELDS' }) → content script
        │
        ▼
[Content Script — formScanner.ts]
  - Walks DOM, extracts all visible fields (label, type, automationId, options)
  - Returns FieldDescriptor[] to background
        │
        ▼
[Background] POST /api/ai/map-fields
  - Sends { fields, resumeJson } to backend
        │
        ▼
[Backend — fieldMappingChain.ts]
  - LangChain: PromptTemplate → ChatOpenAI(gpt-4o) → JsonOutputParser → Zod
  - Returns FieldMapping[] with confidence scores
        │
        ▼
[Background]
  - Splits into highConfidence (>= 0.6) and needsReview (< 0.6)
  - Sends fill plan to popup for display
  - Sends { type: 'EXECUTE_FILL', plan } to content script
        │
        ▼
[Content Script — fillOrchestrator.ts]
  - Executes fills in order with 150–300ms delay
  - Collects FillResult[] (success / failed / skipped)
  - Reports results back to background
        │
        ▼
[Background → Popup]
  - Updates application status in DB
  - Surfaces low-confidence fields for user review
        │
        ▼
[Popup — FinalReviewScreen]
  - Shows all filled values
  - User reviews and confirms
  - On confirm: background records submission
```

## Database Schema

```
User
  id           UUID PK
  email        UNIQUE
  passwordHash
  createdAt / updatedAt

Resume
  id           UUID PK
  userId       FK → User
  filename
  rawText
  parsedData   JSON (ResumeData shape)
  createdAt

Application
  id           UUID PK
  userId       FK → User
  resumeId     FK → Resume
  jobUrl
  jobTitle / company
  status       not_started | in_progress | pending_review | submitted | failed
  steps        JSON
  createdAt / updatedAt

FieldMapping
  id           UUID PK
  applicationId FK → Application
  fieldLabel
  fieldType
  mappedValue
  confidence   Float
  source       ai_generated | resume | user_override
  createdAt
```

## API Key Storage Strategy

- OpenAI API key lives in backend `.env` only
- Never sent to the extension — all OpenAI calls go through backend routes
- Extension authenticates with a JWT stored in `chrome.storage.session` (cleared on browser close)
- JWT is issued by the backend after login, never stored in localStorage or cookies
- Content scripts have no access to credentials — only the background service worker holds the JWT

## Error Taxonomy

| Category | Code | Description |
|----------|------|-------------|
| **Parse errors** | `PARSE_PDF_FAILED` | pdf-parse could not extract text |
| | `PARSE_DOCX_FAILED` | mammoth could not extract text |
| | `PARSE_AI_MALFORMED` | OpenAI returned invalid JSON for resume parse |
| **Mapping errors** | `MAPPING_AI_FAILED` | Field mapping chain threw or returned invalid output |
| | `MAPPING_LOW_CONFIDENCE` | All fields below 0.6 threshold — user must review |
| | `MAPPING_NO_FIELDS` | Form scanner found zero fillable fields |
| **Fill errors** | `FILL_ELEMENT_NOT_FOUND` | Selector found no matching element |
| | `FILL_VALUE_NOT_APPLIED` | Element found but value did not stick after 3 retries |
| | `FILL_DROPDOWN_NO_MATCH` | No option matched the mapped value |
| | `FILL_DATE_FORMAT_INVALID` | Date value could not be formatted for picker |
| **Navigation errors** | `NAV_LOGIN_WALL` | Login page detected — user must authenticate |
| | `NAV_STEP_UNKNOWN` | Current step could not be identified |
| | `NAV_NEXT_NOT_FOUND` | "Next" / "Save and Continue" button not found |
| | `NAV_TIMEOUT` | Page did not reach ready state within timeout |
| **Auth errors** | `AUTH_INVALID_CREDENTIALS` | Wrong email/password |
| | `AUTH_TOKEN_EXPIRED` | JWT expired — re-login required |
| **API errors** | `OPENAI_RATE_LIMITED` | 429 from OpenAI |
| | `OPENAI_CONTEXT_EXCEEDED` | Resume too long for model context |
