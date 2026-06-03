# WorkdayAI — Development Roadmap

AI-powered Chrome Extension that automates Workday job application filling using resume parsing, OpenAI/LangChain field mapping, and robust DOM automation.

**Stack:** Node.js · Express · PostgreSQL · Prisma · OpenAI · LangChain · React · Zustand · TanStack Query · shadcn/ui · Tailwind CSS · pnpm

---

## Phase 0 — Architecture & Design ✅

- [x] Define monorepo structure (extension + backend + shared types) — see folder structure below
- [x] Map Workday DOM structure across 4 target job postings (NVIDIA, Remitly, PNC, Netflix) — `docs/WORKDAY_DOM.md`
- [x] Document all Workday field types encountered: text, dropdown, date, radio, checkbox, file upload, repeatable sections — `docs/WORKDAY_DOM.md`
- [x] Define resume JSON schema (name, email, phone, location, experience[], education[], skills[], certifications[], links{}) — `packages/shared/src/types/resume.ts`
- [x] Define AI prompt contracts: resume parsing prompt, field mapping prompt, answer generation prompt — `docs/AI_PROMPTS.md`
- [x] Design database schema (users, resumes, applications, field_mappings) — `docs/ARCHITECTURE.md` + `apps/backend/prisma/schema.prisma`
- [x] Draw request/response flow: popup → content script → background → backend API → OpenAI → back — `docs/ARCHITECTURE.md`
- [x] Choose API key storage strategy (backend-only, never exposed to extension frontend) — `docs/ARCHITECTURE.md`
- [x] Define error taxonomy: parse errors, mapping errors, fill errors, navigation errors — `docs/ARCHITECTURE.md`

### Folder Structure

```
workday-ai/
├── apps/
│   ├── extension/          # Chrome Extension (React + Vite)
│   │   ├── src/
│   │   │   ├── popup/      # Extension popup UI
│   │   │   ├── content/    # Content scripts (DOM manipulation)
│   │   │   ├── background/ # Service worker
│   │   │   ├── modules/
│   │   │   │   ├── parser/     # Resume text extraction
│   │   │   │   ├── mapper/     # AI field mapping
│   │   │   │   ├── filler/     # DOM fill engine
│   │   │   │   └── navigator/  # Step detection & navigation
│   │   │   └── store/      # Zustand stores
│   │   └── manifest.json
│   └── backend/            # Express API
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   │   ├── ai/         # OpenAI + LangChain
│       │   │   ├── resume/     # Parsing service
│       │   │   └── mapping/    # Field mapping service
│       │   ├── middleware/
│       │   └── utils/
│       └── prisma/
│           └── schema.prisma
└── packages/
    └── shared/             # Shared TypeScript types
```

---

## Phase 1 — Environment Setup ✅

### System Prerequisites
- [x] Install Node.js 20 LTS (v24.12.0 installed)
- [x] Install pnpm globally (v10.26.1 installed)
- [x] Install PostgreSQL 15+ (v16.14 installed)
- [x] Install Chrome browser (for extension testing)

### Monorepo Initialization
- [x] `mkdir workday-ai && cd workday-ai`
- [x] `pnpm init`
- [x] Create `pnpm-workspace.yaml`
- [x] Create root `tsconfig.base.json` with strict settings
- [x] Create root `.gitignore` (node_modules, dist, .env, *.pem)
- [x] Initialize git repository

### Backend Setup
- [x] `mkdir -p apps/backend && cd apps/backend && pnpm init`
- [x] Install production deps (express, prisma, openai, langchain, zod, cors, helmet, morgan, multer, pdf-parse, mammoth, jsonwebtoken, bcryptjs, uuid)
- [x] Install dev deps (typescript, @types/*, ts-node, nodemon, tsx, jest, supertest, ts-jest)
- [x] Create `tsconfig.json` extending base config
- [x] Create `nodemon.json` for dev server
- [x] Create `.env.example` with all required env vars
- [x] Copy `.env.example` to `.env` and populate
- [x] 12 tests passing (health endpoint, ApiError, errorHandler, Prisma DB integration)

### Extension Setup
- [x] `mkdir -p apps/extension && cd apps/extension && pnpm init`
- [x] Install deps (react, react-dom, zustand, @tanstack/react-query, axios)
- [x] Install dev deps (vite, @vitejs/plugin-react, typescript, @types/react, @types/react-dom, @types/chrome, tailwindcss, vitest)
- [x] Configure `vite.config.ts` with manifest copy plugin for Chrome Extension MV3
- [x] Create `manifest.json` (Manifest V3 structure)
- [x] Configure Tailwind CSS v4 via `@tailwindcss/vite`
- [ ] Set up shadcn/ui: `pnpm dlx shadcn@latest init`
- [ ] Add shadcn components: `pnpm dlx shadcn@latest add button card progress badge toast dialog`

### Shared Package
- [x] `mkdir -p packages/shared && cd packages/shared && pnpm init`
- [x] Create shared TypeScript types: `ResumeData`, `FieldMapping`, `ApplicationState`, `APIResponse`
- [x] Export from `packages/shared/src/index.ts`
- [x] Add shared package to backend and extension as workspace dep

### Database Setup
- [x] Create PostgreSQL database: `createdb workday_ai`
- [x] Create PostgreSQL test database: `createdb workday_ai_test`
- [x] Add `DATABASE_URL` and `DATABASE_URL_TEST` to backend `.env`
- [x] Prisma schema written and migrated (User, Resume, Application, FieldMapping)

---

## Phase 2 — Database Design & Prisma ✅

### Schema Design
- [x] Define `User` model (id, email, passwordHash, createdAt, updatedAt)
- [x] Define `Resume` model (id, userId, filename, rawText, parsedData JSON, createdAt)
- [x] Define `Application` model (id, userId, resumeId, jobUrl, jobTitle, company, status, steps JSON, createdAt, updatedAt)
- [x] Define `FieldMapping` model (id, applicationId, fieldLabel, fieldType, mappedValue, confidence float, source enum)
- [x] Add proper indexes: `User.email`, `Application.userId`, `FieldMapping.applicationId`
- [x] Add foreign key cascades where appropriate

### Prisma Setup
- [x] Write complete `schema.prisma`
- [x] Run `pnpm prisma migrate dev --name init`
- [x] Verify migration ran cleanly
- [x] Run `pnpm prisma generate` to generate client
- [x] Create `src/prisma/client.ts` as singleton Prisma client
- [x] Create seed script `prisma/seed.ts` with test user and sample resume
- [x] Add seed script to `package.json`: `"prisma": { "seed": "tsx prisma/seed.ts" }`
- [x] Run `pnpm prisma db seed` to verify seed works

---

## Phase 3 — Backend API ✅

### Project Structure
- [x] Create `src/app.ts` (Express app, middleware registration)
- [x] Create `src/server.ts` (HTTP server, port binding)
- [x] Create `src/middleware/auth.ts` (JWT verification middleware)
- [x] Create `src/middleware/errorHandler.ts` (global error handler)
- [x] Create `src/middleware/validate.ts` (Zod request validation)
- [x] Create `src/utils/logger.ts` (structured logging with morgan)
- [x] Create `src/utils/apiError.ts` (typed error class hierarchy)

### Authentication Routes (`/api/auth`)
- [x] `POST /register` — create user, hash password with bcrypt (rounds=12), return JWT
- [x] `POST /login` — verify credentials, return JWT
- [x] `GET /me` — return current user profile (requires auth middleware)
- [x] Write Zod schemas for all auth request bodies

### Resume Routes (`/api/resumes`)
- [x] `POST /upload` — accept PDF or DOCX via multipart/form-data (max 5MB), store file, trigger parsing
- [x] `GET /` — list user's resumes
- [x] `GET /:id` — get resume with parsed data
- [x] `DELETE /:id` — soft delete resume
- [x] Configure multer: memory storage, file type filter (PDF/DOCX only), size limit
- [x] Write resume parsing service (PDF → pdf-parse, DOCX → mammoth)

### AI Routes (`/api/ai`)
- [x] `POST /parse-resume` — send raw resume text to OpenAI, return structured JSON
- [x] `POST /map-fields` — send form fields snapshot + resume JSON, return field→value mapping
- [x] `POST /answer-question` — send custom question + resume context, return generated answer
- [x] Add request/response logging for all AI calls (morgan in app.ts)

### Application Routes (`/api/applications`)
- [x] `POST /` — create application record (jobUrl, resumeId)
- [x] `GET /` — list user applications with status
- [x] `GET /:id` — get application with all field mappings
- [x] `PATCH /:id/status` — update application status
- [x] `GET /:id/field-mappings` — return field mappings for review screen
- [x] `POST /:id/submit-confirm` — record user confirmed submission

### Security
- [x] Add `helmet()` middleware (CSP, HSTS, X-Frame-Options)
- [x] Add `cors()` with explicit origin whitelist (extension ID + localhost)
- [x] Validate all request bodies with Zod before hitting service layer
- [x] Never log raw resume text or API keys
- [x] Store JWT secret in env only

---

## Phase 4 — AI Integration ✅

### OpenAI Setup
- [x] Create `src/services/ai/openaiClient.ts` — singleton with retry logic (3 retries, 30s timeout)
- [x] Store API key in env, never in code or logs
- [x] Set default model to `gpt-4o` with fallback to `gpt-4o-mini` for cost control (via env vars)
- [x] Add token budget guard (max tokens per request via `OPENAI_MAX_TOKENS` env)

### Resume Parsing Chain (LangChain)
- [x] Create `src/services/ai/resumeParsingChain.ts`
- [x] Build LangChain chain: `ChatPromptTemplate → ChatOpenAI → JsonOutputParser`
- [x] Write system prompt: instructs model to extract resume fields into defined JSON schema
- [x] Write user prompt template: inserts raw resume text
- [x] Use Zod schema to validate output structure
- [x] Handle partial/missing fields gracefully (nullable fields, not failures)
- [x] Add retry on malformed JSON output (max 3 attempts)
- [x] Write unit tests with mock resume texts

### Field Mapping Chain (LangChain) — Critical
- [x] Create `src/services/ai/fieldMappingChain.ts`
- [x] Build chain that accepts: `{ fields: [{label, type, options?}][], resumeData }`
- [x] Write system prompt: semantic matching instructions, examples of "Given Name" → firstName
- [x] Include field type context in prompt (dropdown options, confidence thresholds)
- [x] Output: `{ fieldLabel: string, value: string, confidence: number, reasoning: string }[]`
- [x] Add confidence threshold: values below 0.6 flagged for user review
- [x] Write unit tests covering: standard fields, unusual labels, missing data cases, dropdown options

### Answer Generation Chain
- [x] Create `src/services/ai/answerGenerationChain.ts`
- [x] Handle custom application questions (work authorization, salary expectations, referral source)
- [x] Prompt includes resume context + question + field constraints
- [x] Return answer + confidence + fallback suggestion when uncertain
- [x] Detect sensitive questions (salary, visa, clearance) and force `needsReview=true`

### LangChain Orchestration
- [x] Create `src/services/ai/applicationOrchestrator.ts`
- [x] Sequence: parse resume → map fields → generate answers → return fill plan
- [x] `buildFillPlan()` composes all three chains, returns `{ parsedResume, fieldMappings, generatedAnswers, needsReview }`

---

## Phase 5 — Chrome Extension ✅

### Manifest V3 Setup
- [x] Write `manifest.json`: MV3, permissions (storage/activeTab/scripting), host_permissions, content_scripts, service_worker, popup action
- [x] Configure Vite to bundle manifest (custom `copy-manifest` plugin in `vite.config.ts`)
- [x] Set up hot reload for extension development (`pnpm --filter extension dev`)

### Content Script — DOM Module Architecture

#### Parser Module (`src/modules/parser/`)
- [x] Create `pdfExtractor.ts` — client-side binary read + ASCII extraction
- [x] Create `docxExtractor.ts` — binary read + XML tag strip + entity decode
- [x] Create `resumeTextCleaner.ts` — normalize whitespace, remove page numbers and Confidential artifacts
- [x] Export unified `extractResumeText(file: File): Promise<string>` with typed `UnsupportedFileTypeError`

#### Mapper Module (`src/modules/mapper/`)
- [x] Create `formScanner.ts` — DOM scan with data-automation-id → aria-label → label text priority; shadow DOM traversal; skips hidden/disabled
- [x] Create `fieldDescriptor.ts` — normalize raw DOM data into `FieldDescriptor`, strip asterisks, map input types
- [x] Create `apiMapper.ts` — POST to `/api/ai/map-fields` with Bearer auth
- [x] Create `confidenceFilter.ts` — split at 0.6 threshold; honour `needsReview` flag

#### Filler Module (`src/modules/filler/`)
- [x] Create `textFiller.ts` — nativeInputValueSetter + input/change/blur events
- [x] Create `dropdownFiller.ts` — native select + Workday combobox (click → wait → role="option")
- [x] Create `dateFiller.ts` — YYYY-MM-DD and "Month YYYY" → MM/DD/YYYY normalisation
- [x] Create `radioFiller.ts` — find by name/data-automation-id, match by label text
- [x] Create `checkboxFiller.ts` — click if state differs, dispatch change
- [x] Create `fileFiller.ts` — DataTransfer API file injection
- [x] Create `repeatableSectionFiller.ts` — find "Add Another" by text/aria-label, click + wait
- [x] Create `fillOrchestrator.ts` — ordered execution, 150-300ms random delay, 3-attempt retry, manual_required fallback

#### Navigator Module (`src/modules/navigator/`)
- [x] Create `stepDetector.ts` — URL pattern + DOM signature detection for all 8 Workday steps
- [x] Create `stepAdvancer.ts` — tries 5 button selectors in priority order
- [x] Create `mutationWatcher.ts` — MutationObserver on body, 300ms debounce, cleanup function returned
- [x] Create `retryMechanism.ts` — generic `withRetry<T>` with exponential backoff
- [x] Create `pageReadyChecker.ts` — polls readyState + loading indicators, 10s timeout

### Background Service Worker (`src/background/`)
- [x] Create `serviceWorker.ts` — typed discriminated union for all message types
- [x] Handle GET/SET/CLEAR_TOKEN via `chrome.storage.session`
- [x] Route API_REQUEST via `fetch()` with Bearer auth
- [x] Forward STEP_CHANGED from content script
- [x] Handle extension install event

### Popup UI (`src/popup/`)
- [x] Tabbed layout (Resume/Status/Review/Settings) at 600×500px
- [x] Build `ResumeUpload` — drag-drop or click, progress spinner, error display
- [x] Build `ResumePreview` — name/email/skills pills/experience+education counts, clear button
- [x] Build `ApplicationStatus` — step label, progress bar, fill result badges, low-confidence warning
- [x] Build `FieldReviewPanel` — inline edits, confidence %, per-field and bulk approve
- [x] Build `FinalReviewScreen` — full mapping table, explicit confirm gate, Go Back button
- [x] Build `SettingsPanel` — API URL, fill delay, auto-advance, debug mode
- [x] Build `ErrorPanel` — lists failed/manual_required fills with guidance

### Zustand Store Architecture
- [x] Create `src/store/resumeStore.ts` — file, rawText, parsedData, parseStatus
- [x] Create `src/store/applicationStore.ts` — currentStep, fillPlan, fillResults, lowConfidenceFields
- [x] Create `src/store/settingsStore.ts` — persisted to `chrome.storage.sync`
- [x] Create `src/store/authStore.ts` — token via background service worker

### TanStack Query Integration
- [x] Set up `QueryClient` — no retry on 4xx, exponential backoff on 5xx
- [x] Create `src/hooks/useResumeUpload.ts` — useMutation → updates resumeStore
- [x] Create `src/hooks/useFieldMapping.ts` — useMutation with auth header
- [x] Create `src/hooks/useApplicationStatus.ts` — useQuery polling every 5s, staleTime: 0

---

## Phase 6 — Workday-Specific Automation ✅

### DOM Strategy (No Hardcoded Selectors)
- [x] Attribute-based selection: `[data-automation-id]` → `[aria-label]` → label text → `[placeholder]`
- [x] Label text matching as primary strategy with Workday `*Label` div pattern
- [x] ARIA roles as fallback in formScanner (`role="combobox"`, `role="radio"`, `role="listbox"`)
- [x] `findFieldByLabel(labelText: string): Element | null` — `src/modules/dom/fieldFinder.ts`
- [x] `findFieldByAriaLabel(ariaLabel: string): Element | null`
- [x] `findFieldByPlaceholder(placeholder: string): Element | null`

### React Event Simulation (Critical for Workday)
- [x] nativeInputValueSetter + input/change/blur events in `textFiller.ts`
- [x] textarea handled with same pattern via `HTMLTextAreaElement.prototype`
- [x] Select elements use `selectedIndex` + `change` event in `dropdownFiller.ts`
- [x] Wired into `fillOrchestrator.ts` as primary fill strategy

### Multi-Step Navigation
- [x] All 8 Workday step URL patterns + DOM signatures in `stepDetector.ts`
- [x] Login wall detected via `loginWatcher.ts` — sends `LOGIN_REQUIRED` to popup
- [x] `waitForLoginCompletion()` polls until step leaves login (5 min timeout)
- [x] `stepAdvancer.ts` handles "Save and Continue" and "Next" variants
- [x] Polling step-change detection (200ms intervals, 5s max) after advance
- [x] `REVIEW_READY` notification sent when review step detected

### Error Recovery
- [x] Fill verification after each attempt (check element value after 100ms)
- [x] 3-strategy fallback: nativeInputValueSetter → keyboard events → execCommand
- [x] Failed fields marked `status: 'manual_required'` and highlighted red on page
- [x] Visual highlighting: pending=blue, success=green, failed=red via `fieldHighlighter.ts`

---

## Phase 7 — Testing ✅

### Backend Unit Tests
- [x] Set up Jest with `ts-jest`
- [x] Create test database (separate `workday_ai_test` PostgreSQL DB)
- [x] Add `DATABASE_URL_TEST` to `.env`
- [x] Write `prisma/test-setup.ts` — truncate tables before each test suite
- [x] Test resume parsing service with sample PDFs and DOCX files
- [x] Test AI chains with mocked OpenAI responses (jest mock)
- [x] Test field mapping with 20+ varied field label inputs — `fieldMappingLabels.test.ts`
- [x] Test auth routes: register, login, invalid credentials

### Backend Integration Tests
- [x] Use `supertest` for HTTP-level tests against running Express app
- [x] Test full resume upload → parse → store flow
- [x] Test field mapping API with realistic form field payloads
- [x] Test authentication middleware blocks unauthenticated requests
- [x] Test file type validation rejects non-PDF/DOCX

### Extension Unit Tests
- [x] Set up Vitest for extension (with `vitest.setup.ts` chrome global stub)
- [x] Test `formScanner.ts` against mocked Workday DOM snapshots
- [x] Test `textFiller.ts` event dispatch logic
- [x] Test `dropdownFiller.ts` option selection logic (native select + Workday combobox)
- [x] Test `radioFiller.ts`, `checkboxFiller.ts`, `fillOrchestrator.ts`
- [x] Test `stepDetector.ts` against known Workday URL patterns
- [x] Test `stepAdvancer.ts` button priority and step-change detection
- [x] Test `mutationWatcher.ts` debounce and cleanup
- [x] Test Zustand stores: resumeStore, applicationStore, settingsStore, authStore

### E2E Tests
- [ ] Write Playwright scripts that load Workday job postings and verify extension behavior
- [ ] Test across all 4 target job postings (NVIDIA, Remitly, PNC, Netflix)
- [ ] Test with 3 different resume formats (simple, complex multi-page, career change)
- [ ] Test error recovery: fill a field, simulate failure, verify retry
- [ ] Test MutationObserver triggers on dynamic field appearance
- [ ] Test final review screen appears before submission
- [ ] Verify no actual submission occurs without user confirmation

---

## Phase 8 — Code Quality ✅

### Linting & Formatting
- [x] Install ESLint + Prettier in backend and extension packages
- [x] Create `eslint.config.mjs` (flat config, ESLint v9) with `@typescript-eslint/no-explicit-any`, no-unused-vars, no-console rules
- [x] Create `.prettierrc` at root (single quotes, no semicolons, 100 char line width)
- [x] `lint` and `format` scripts in both `package.json` files, `pnpm lint` at root runs both
- [x] Configure pre-commit hook with lint-staged + Husky — runs prettier + eslint --fix on staged files
- [x] Fix all existing lint violations across codebase
- [x] Run `pnpm format` to apply Prettier to all existing files

---

## Phase 9 — Build & Deliverables

### Extension Build
- [x] `pnpm build` script exists in extension package (Vite build)
- [x] Build output goes to `apps/extension/dist/` (manifest + icons + JS bundles)
- [ ] Verify extension loads correctly in Chrome (`chrome://extensions` → Load unpacked) — **manual**
- [ ] Test all 4 target job postings with the built extension — **manual**
- [ ] Zip `dist/` folder for submission — **manual** (run: `cd apps/extension && zip -r ../../workday-ai-extension.zip dist/`)

### Documentation
- [x] Write `README.md`: project overview, local setup steps, how to load the extension
- [x] `docs/ARCHITECTURE.md`: request/response flow, DB schema, error taxonomy — already complete
- [x] `docs/AI_PROMPTS.md`: full prompt templates for resume parsing, field mapping, answer generation
- [x] Write `docs/LIMITATIONS.md`: known Workday UI variants that don't work, unsupported field types
- [x] Document all env vars in `.env.example` with descriptions

### Demo Video
- [ ] Record resume upload and parsing — **manual**
- [ ] Record autofill across all form steps on one target job posting — **manual**
- [ ] Show low-confidence field review and manual override — **manual**
- [ ] Show final review screen before submission — **manual**
- [ ] Show user confirmation step (do not submit a real application) — **manual**

---

## Dependency Reference

### Backend
| Package | Purpose |
|---------|---------|
| `express` | HTTP server |
| `prisma` + `@prisma/client` | PostgreSQL ORM |
| `openai` | OpenAI API client |
| `langchain` + `@langchain/openai` | LLM chain orchestration |
| `zod` | Runtime schema validation |
| `jsonwebtoken` | JWT auth tokens |
| `bcryptjs` | Password hashing |
| `multer` | File upload handling |
| `pdf-parse` | PDF text extraction |
| `mammoth` | DOCX text extraction |
| `helmet` | HTTP security headers |
| `cors` | CORS policy |

### Extension
| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | Popup UI |
| `zustand` | State management |
| `@tanstack/react-query` | Server state + caching |
| `tailwindcss` | Utility CSS |
| `shadcn/ui` | UI components |
| `@crxjs/vite-plugin` | Chrome Extension bundling |
| `pdf-lib` | Client-side PDF reading |
| `mammoth` | Client-side DOCX reading |

---

## Evaluation Criteria Alignment

| Criteria | Weight | Phases Covering It |
|----------|--------|--------------------|
| Automation correctness (end-to-end) | 60% | 5, 6, 7 |
| AI-based field mapping accuracy | 25% | 4, 5 (mapper module) |
| Resume parsing quality | 5% | 3, 4 |
| Code quality & architecture | 5% | 0, 8 |
| User experience | 5% | 5 (popup UI) |

---

*Start Phase 0 before writing any code. The architecture decisions made there determine how hard Phases 5 and 6 are.*
