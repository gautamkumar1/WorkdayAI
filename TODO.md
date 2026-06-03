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

## Phase 5 — Chrome Extension

### Manifest V3 Setup
- [ ] Write `manifest.json`:
  - `manifest_version: 3`
  - permissions: `storage`, `activeTab`, `scripting`
  - host_permissions: `*://*.myworkdayjobs.com/*`
  - content_scripts targeting Workday URLs
  - service_worker background script
  - popup action pointing to React popup
- [ ] Configure `@crxjs/vite-plugin` to bundle manifest correctly
- [ ] Set up hot reload for extension development

### Content Script — DOM Module Architecture

#### Parser Module (`src/modules/parser/`)
- [ ] Create `pdfExtractor.ts` — extract text from PDF using pdf-lib + custom renderer
- [ ] Create `docxExtractor.ts` — extract text from DOCX using mammoth
- [ ] Create `resumeTextCleaner.ts` — normalize whitespace, remove headers/footers artifacts
- [ ] Export unified `extractResumeText(file: File): Promise<string>`

#### Mapper Module (`src/modules/mapper/`)
- [ ] Create `formScanner.ts` — scan current page DOM for all visible form fields
  - Extract: label text, input type, element selector path, available options (for dropdowns)
  - Handle shadow DOM traversal
  - Ignore hidden/disabled fields
- [ ] Create `fieldDescriptor.ts` — normalize raw DOM field data into `FieldDescriptor` type
- [ ] Create `apiMapper.ts` — send field descriptors to backend `/api/ai/map-fields`, return fill plan
- [ ] Create `confidenceFilter.ts` — separate high-confidence fills from needs-review items

#### Filler Module (`src/modules/filler/`)
- [ ] Create `textFiller.ts` — fill text inputs with proper React event simulation
  ```js
  // Must fire nativeInputValueSetter, then dispatch 'input' and 'change' events
  // Workday uses React — direct .value = x doesn't trigger React's synthetic events
  ```
- [ ] Create `dropdownFiller.ts` — open dropdown, wait for options to render, click matching option
- [ ] Create `dateFiller.ts` — handle Workday date picker format (MM/DD/YYYY)
- [ ] Create `radioFiller.ts` — find radio group by name, click correct option
- [ ] Create `checkboxFiller.ts` — check/uncheck based on mapped boolean value
- [ ] Create `fileFiller.ts` — programmatic file input using DataTransfer API
- [ ] Create `repeatableSectionFiller.ts` — detect "Add Another" patterns, click to add rows, fill each
- [ ] Create `fillOrchestrator.ts` — execute fill plan in order, skip pre-filled fields, collect errors
- [ ] Add 150-300ms delay between fills to avoid triggering bot detection

#### Navigator Module (`src/modules/navigator/`)
- [ ] Create `stepDetector.ts` — identify current Workday step from page DOM/URL patterns
  - Steps: job details, login/create account, my information, experience, education, application questions, review, submit
- [ ] Create `stepAdvancer.ts` — find and click "Next", "Save and Continue" buttons
- [ ] Create `mutationWatcher.ts` — `MutationObserver` watching for new fields appearing after step transitions
- [ ] Create `retryMechanism.ts` — retry failed fills up to 3 times with exponential backoff
- [ ] Create `pageReadyChecker.ts` — wait for Workday's React app to finish rendering before acting

### Background Service Worker (`src/background/`)
- [ ] Create `serviceWorker.ts`
- [ ] Handle messages from popup and content script
- [ ] Manage JWT token storage in `chrome.storage.session`
- [ ] Coordinate API calls (content scripts can't directly call external APIs in MV3 — route through background)
- [ ] Handle extension install/update events

### Popup UI (`src/popup/`)
- [ ] Create React app entry point for popup (600×500px)
- [ ] Build `ResumeUpload` component — drag-drop or click to upload PDF/DOCX
- [ ] Build `ResumePreview` component — show parsed resume data, allow inline edits
- [ ] Build `ApplicationStatus` component — current step, progress bar, field fill count
- [ ] Build `FieldReviewPanel` component — list low-confidence mappings, allow manual override
- [ ] Build `FinalReviewScreen` component — show ALL filled values before submission, require explicit confirm
- [ ] Build `SettingsPanel` component — API key entry, autofill speed, auto-advance toggle
- [ ] Build `ErrorPanel` component — show fill failures with manual fill guidance

### Zustand Store Architecture
- [ ] Create `src/store/resumeStore.ts`
  - State: `file`, `rawText`, `parsedData`, `parseStatus`
  - Actions: `uploadResume`, `parsedResume`, `clearResume`
- [ ] Create `src/store/applicationStore.ts`
  - State: `currentStep`, `fillPlan`, `fillResults`, `lowConfidenceFields`
  - Actions: `startFill`, `updateFillResult`, `confirmSubmit`
- [ ] Create `src/store/settingsStore.ts`
  - State: `apiBaseUrl`, `fillDelay`, `autoAdvance`, `debugMode`
  - Actions: `updateSettings`
  - Persist to `chrome.storage.sync`
- [ ] Create `src/store/authStore.ts`
  - State: `token`, `user`, `isAuthenticated`
  - Actions: `login`, `logout`

### TanStack Query Integration
- [ ] Set up `QueryClient` with retry config (no retry on 4xx, 3 retries on 5xx)
- [ ] Create `src/hooks/useResumeUpload.ts` — `useMutation` for resume upload + parse
- [ ] Create `src/hooks/useFieldMapping.ts` — `useMutation` for AI field mapping
- [ ] Create `src/hooks/useApplicationStatus.ts` — `useQuery` for polling application state
- [ ] Configure staleTime: 5min for resume data, 0 for live field mappings

---

## Phase 6 — Workday-Specific Automation

### DOM Strategy (No Hardcoded Selectors)
- [ ] Use attribute-based selection: `[data-automation-id]`, `[aria-label]`, `[placeholder]`
- [ ] Use label text matching as primary selector strategy
- [ ] Use ARIA roles as fallback: `role="combobox"`, `role="radio"`, `role="listbox"`
- [ ] Build `findFieldByLabel(labelText: string): Element | null` utility
- [ ] Build `findFieldByAriaLabel(ariaLabel: string): Element | null` utility
- [ ] Build `findFieldByPlaceholder(placeholder: string): Element | null` utility

### React Event Simulation (Critical for Workday)
- [ ] Implement native input value setter override to bypass React's synthetic event system:
  ```js
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  ).set;
  nativeInputValueSetter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
  ```
- [ ] Test this pattern on each of the 4 target job postings
- [ ] Handle textarea fields with same pattern
- [ ] Handle Select elements differently (dispatchEvent with 'change')

### Multi-Step Navigation
- [ ] Map known Workday step URLs and DOM signatures
- [ ] Detect login wall → pause and notify user to log in
- [ ] Detect "Create Account" vs "Sign In" and notify user
- [ ] After login, resume autofill from last known step
- [ ] Handle "Save and Continue" vs "Next" button text variants
- [ ] Detect final review page, pause, show review UI

### Error Recovery
- [ ] Catch fills that didn't register (field still empty after fill attempt)
- [ ] Retry with alternate fill strategy (keyboard events vs mouse events)
- [ ] After 3 failures, mark field as "manual fill required" and highlight it on page
- [ ] Log all failures with field selector, attempted value, error message

---

## Phase 7 — Testing

### Backend Unit Tests
- [ ] Set up Jest with `ts-jest`
- [ ] Create test database (separate `workday_ai_test` PostgreSQL DB)
- [ ] Add `DATABASE_URL_TEST` to `.env`
- [ ] Write `prisma/test-setup.ts` — truncate tables before each test suite
- [ ] Test resume parsing service with sample PDFs and DOCX files
- [ ] Test AI chains with mocked OpenAI responses (jest mock)
- [ ] Test field mapping with 20+ varied field label inputs
- [ ] Test auth routes: register, login, invalid credentials

### Backend Integration Tests
- [ ] Use `supertest` for HTTP-level tests against running Express app
- [ ] Test full resume upload → parse → store flow
- [ ] Test field mapping API with realistic form field payloads
- [ ] Test authentication middleware blocks unauthenticated requests
- [ ] Test file type validation rejects non-PDF/DOCX

### Extension Unit Tests
- [ ] Set up Vitest for extension
- [ ] Test `formScanner.ts` against mocked Workday DOM snapshots
- [ ] Test `textFiller.ts` event dispatch logic
- [ ] Test `dropdownFiller.ts` option selection logic
- [ ] Test `stepDetector.ts` against known Workday URL patterns
- [ ] Test Zustand stores: state transitions, action side effects

### E2E Tests
- [ ] Write Playwright scripts that load Workday job postings and verify extension behavior
- [ ] Test across all 4 target job postings (NVIDIA, Remitly, PNC, Netflix)
- [ ] Test with 3 different resume formats (simple, complex multi-page, career change)
- [ ] Test error recovery: fill a field, simulate failure, verify retry
- [ ] Test MutationObserver triggers on dynamic field appearance
- [ ] Test final review screen appears before submission
- [ ] Verify no actual submission occurs without user confirmation

---

## Phase 8 — Code Quality

### Linting & Formatting
- [ ] Install ESLint + Prettier:
  ```
  pnpm add -D eslint prettier eslint-config-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
  ```
- [ ] Create `.eslintrc.json` with TypeScript rules, no-any rule
- [ ] Create `.prettierrc` (single quotes, no semicolons, 100 char line width)
- [ ] Add `lint` and `format` scripts to `package.json`
- [ ] Configure pre-commit hook with lint-staged + Husky:
  ```
  pnpm add -D husky lint-staged
  pnpm dlx husky init
  ```

---

## Phase 9 — Build & Deliverables

### Extension Build
- [ ] Add `pnpm build` script to extension (Vite build)
- [ ] Build output goes to `apps/extension/dist/`
- [ ] Verify extension loads correctly in Chrome (`chrome://extensions` → Load unpacked)
- [ ] Test all 4 target job postings with the built extension
- [ ] Zip `dist/` folder for submission

### Documentation
- [ ] Write `README.md`: project overview, local setup steps, how to load the extension
- [ ] Write `docs/ARCHITECTURE.md`: component diagram, data flow, module responsibilities
- [ ] Write `docs/AI_PROMPTING.md`: full prompt templates for resume parsing, field mapping, answer generation with rationale
- [ ] Write `docs/LIMITATIONS.md`: known Workday UI variants that don't work, unsupported field types
- [ ] Document all env vars in `.env.example` with descriptions

### Demo Video
- [ ] Record resume upload and parsing
- [ ] Record autofill across all form steps on one target job posting
- [ ] Show low-confidence field review and manual override
- [ ] Show final review screen before submission
- [ ] Show user confirmation step (do not submit a real application)

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
