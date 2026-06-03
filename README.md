# WorkdayAI

AI-powered Chrome Extension that automates Workday job application filling. Upload your resume once — the extension parses it, maps fields using GPT-4o, and fills every step of the Workday application form automatically.

## What it does

1. You upload a PDF or DOCX resume in the extension popup
2. The backend parses it into structured JSON (name, email, experience, education, skills, etc.)
3. GPT-4o semantically maps your resume fields to whatever Workday form fields are on screen
4. The extension fills every visible field with a 150–300ms delay between fills (mimicking human input)
5. Low-confidence mappings (below 0.6) are flagged for your review before filling
6. A final review screen shows every mapped value — you confirm before anything is submitted

Workday authentication is never bypassed. You log in yourself; the extension only acts after you're authenticated.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Extension | Chrome MV3, React 19, Vite, TypeScript |
| UI | shadcn/ui, Tailwind CSS v4 |
| State | Zustand + `chrome.storage.sync` |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL 16 + Prisma |
| AI | OpenAI GPT-4o, LangChain |
| Package manager | pnpm (workspace monorepo) |

---

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+
- Chrome browser
- OpenAI API key

---

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd workday-ai
pnpm install
```

### 2. Configure the backend

```bash
cp apps/backend/.env.example apps/backend/.env
```

Open `apps/backend/.env` and fill in:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_URL_TEST` | Separate test database URL |
| `JWT_SECRET` | Long random string (min 32 chars) |
| `OPENAI_API_KEY` | Your OpenAI API key (`sk-...`) |
| `OPENAI_MODEL` | Model to use (default: `gpt-4o`) |
| `PORT` | Backend port (default: `3000`) |
| `EXTENSION_ORIGIN` | Chrome extension ID (fill after step 5) |

### 3. Set up the database

```bash
# Create the databases
createdb workday_ai
createdb workday_ai_test

# Run migrations
pnpm --filter backend prisma migrate dev

# Seed with a test user (optional)
pnpm --filter backend prisma db seed
```

### 4. Start the backend

```bash
pnpm --filter backend dev
# → running on http://localhost:3000
```

### 5. Build and load the extension

```bash
pnpm --filter extension build
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select `apps/extension/dist/`

Copy the extension ID shown on the card (e.g. `abcdefghijklmnopqrstuvwxyzabcdef`) and paste it into `EXTENSION_ORIGIN` in your `.env`:

```
EXTENSION_ORIGIN=chrome-extension://abcdefghijklmnopqrstuvwxyzabcdef
```

Restart the backend after updating `.env`.

---

## Development

```bash
# Backend with hot reload
pnpm --filter backend dev

# Extension with watch mode (rebuilds on save)
pnpm --filter extension dev

# Run all tests
pnpm test:backend
pnpm test:extension

# Lint everything
pnpm lint

# Format everything
pnpm format
```

---

## Using the Extension

1. Navigate to a Workday job posting and click **Apply**
2. Log in to Workday when prompted (the extension waits)
3. Click the extension icon to open the popup
4. Go to the **Resume** tab and upload your PDF or DOCX
5. Click **Start Autofill** — the extension begins filling fields
6. Any low-confidence fields appear in the **Review** tab for manual input
7. When all steps are filled, the **Final Review** screen shows every value
8. Click **Confirm & Submit** — only then does the extension proceed to submit

---

## Project Structure

```
workday-ai/
├── apps/
│   ├── backend/          # Express API (port 3000)
│   │   ├── src/
│   │   │   ├── routes/       # /api/auth, /api/resumes, /api/ai, /api/applications
│   │   │   ├── services/ai/  # LangChain chains (resume parsing, field mapping, answer gen)
│   │   │   ├── middleware/   # JWT auth, Zod validation, error handling
│   │   │   └── prisma/       # Singleton Prisma client
│   │   └── prisma/
│   │       └── schema.prisma
│   └── extension/        # Chrome Extension (MV3)
│       └── src/
│           ├── popup/        # React UI (600×500px)
│           ├── content/      # Content script — DOM automation only
│           ├── background/   # Service worker — all API calls
│           └── modules/
│               ├── parser/   # PDF/DOCX text extraction
│               ├── mapper/   # Form field scanning + AI mapping
│               ├── filler/   # Field fill engine (text/dropdown/date/radio/checkbox)
│               ├── navigator/ # Step detection, navigation, error recovery
│               └── dom/      # Field finder, field highlighter
└── packages/
    └── shared/           # Shared TypeScript types
```

---

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full request/response flow, component diagram, and module responsibilities.

## AI Prompts

See [docs/AI_PROMPTS.md](docs/AI_PROMPTS.md) for the full prompt templates used for resume parsing, field mapping, and answer generation.

## Workday DOM Notes

See [docs/WORKDAY_DOM.md](docs/WORKDAY_DOM.md) for the DOM structure of the 4 target job postings and all field types encountered.

## Known Limitations

See [docs/LIMITATIONS.md](docs/LIMITATIONS.md) for unsupported field types and known Workday UI variants.
