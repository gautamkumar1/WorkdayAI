# WorkdayAI

Chrome extension that fills Workday job applications from your resume. Upload a PDF or DOCX once. The backend parses it, GPT-4o maps form fields, and the extension fills each step. You review everything before anything gets submitted.

Workday login is never bypassed. You sign in yourself.

---

## Deliverables

| Item | Location |
|------|----------|
| Source code | [github.com/gautamkumar1/WorkdayAI](https://github.com/gautamkumar1/WorkdayAI) |
| Chrome extension build | Run `pnpm build:extension`, output is in `apps/extension/dist/` |
| Documentation | This README (setup) + [Notion docs](https://app.notion.com/p/376af28c5334815f8f86d0ee7c442b88) |
| Demo video | [Google Drive](https://drive.google.com/file/d/14gNct13FM6TR7m6VXi8jfEvwnyq27ZzN/view?usp=sharing) |

### Documentation links

- [Architecture design](https://app.notion.com/p/376af28c5334818b9870fa887a1b6017)
- [AI prompting strategy](https://app.notion.com/p/376af28c5334810ba62ff60cda49e7df)
- [Limitations](https://app.notion.com/p/376af28c53348143af2ec464c32e4bd6)

Local copies also live in `docs/` if you prefer reading in the repo.

---

## What it does

1. Upload a PDF or DOCX resume in the extension popup
2. Backend parses it into JSON (name, email, experience, education, skills, etc.)
3. GPT-4o maps resume fields to whatever Workday form fields are on screen
4. Extension fills visible fields with a 150 to 300 ms delay between each (mimics human typing)
5. Mappings below 0.6 confidence go to the Review tab instead of auto-fill
6. Final review screen shows every value. Nothing submits until you confirm

---

## Stack

| Layer | Technology |
|-------|------------|
| Extension | Chrome MV3, React 19, Vite, TypeScript |
| UI | shadcn/ui, Tailwind CSS v4 |
| State | Zustand + `chrome.storage.sync` |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL 16 + Prisma |
| AI | OpenAI GPT-4o, LangChain |
| Package manager | pnpm (workspace monorepo) |

---

## Prerequisites

Install these before you start:

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm` if you do not have it)
- PostgreSQL 16+
- Google Chrome
- OpenAI API key ([platform.openai.com](https://platform.openai.com))

---

## Setup (first time)

### 1. Clone and install dependencies

```bash
git clone https://github.com/gautamkumar1/WorkdayAI.git
cd WorkdayAI
pnpm install
```

### 2. Configure the backend

Copy the example env file:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Open `apps/backend/.env` and set these values:

| Variable | What to put |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string for main DB |
| `DATABASE_URL_TEST` | Separate DB URL for tests |
| `JWT_SECRET` | Random string, at least 32 chars (`openssl rand -hex 32`) |
| `OPENAI_API_KEY` | Your OpenAI key (`sk-...`) |
| `OPENAI_MODEL` | `gpt-4o` (default) |
| `PORT` | `3000` |
| `EXTENSION_ORIGIN` | Leave blank for now. Fill in after step 5. |

### 3. Create databases and run migrations

```bash
createdb workday_ai
createdb workday_ai_test

pnpm --filter backend prisma migrate dev
pnpm --filter backend prisma db seed
```

The seed creates a test account:

- Email: `test@example.com`
- Password: `password123`

You can also register a new account from the extension popup.

### 4. Start the backend

```bash
pnpm dev:backend
```

API runs at `http://localhost:3000`. Leave this terminal open.

### 5. Build and load the extension in Chrome

In a second terminal:

```bash
pnpm build:extension
```

Then in Chrome:

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the folder `apps/extension/dist/`

Copy the extension ID from the card (32-character string under the extension name).

Update `EXTENSION_ORIGIN` in `apps/backend/.env`:

```
EXTENSION_ORIGIN=chrome-extension://YOUR_EXTENSION_ID_HERE
```

Restart the backend (`Ctrl+C`, then `pnpm dev:backend` again). CORS will block API calls until this matches your loaded extension.

### 6. Point the extension at the backend

1. Click the WorkdayAI icon in Chrome
2. Open **Settings**
3. Set API URL to `http://localhost:3000`
4. Log in with `test@example.com` / `password123` (or your own account)

---

## How to run (day to day)

You need two things running: the backend and a loaded extension.

**Terminal 1: backend**

```bash
pnpm dev:backend
```

**Terminal 2: extension (development with hot reload)**

```bash
pnpm dev:extension
```

After code changes in dev mode, go to `chrome://extensions` and click the refresh icon on the WorkdayAI card.

For a production-style build (what you submit):

```bash
pnpm build:extension
```

Then reload the extension in Chrome.

---

## Package the extension build (for submission)

After `pnpm build:extension`:

```bash
cd apps/extension
zip -r ../../workday-ai-extension.zip dist/
```

Send `workday-ai-extension.zip` along with the GitHub link. The reviewer unzips it and loads the `dist/` folder via **Load unpacked**.

---

## Using the extension on a Workday job

1. Go to a Workday job posting and click **Apply**
2. Log in to Workday when prompted (the extension waits)
3. Click the WorkdayAI icon
4. Upload your resume on the **Resume** tab
5. Click **Start Autofill**
6. Check the **Review** tab for any low-confidence fields
7. When all steps are done, read the **Final Review** screen
8. Click **Confirm & Submit** only when you are ready

---

## Development commands

```bash
# Backend with hot reload
pnpm dev:backend

# Extension with watch mode
pnpm dev:extension

# Production extension build
pnpm build:extension

# Tests
pnpm test:backend
pnpm test:extension

# Lint and format
pnpm lint
pnpm format

# Prisma
pnpm --filter backend prisma studio    # DB browser
pnpm --filter backend prisma generate  # after schema changes
```

---

## Project structure

```
WorkdayAI/
├── apps/
│   ├── backend/              # Express API (port 3000)
│   │   ├── src/
│   │   │   ├── routes/       # /api/auth, /api/resumes, /api/ai, /api/applications
│   │   │   ├── services/ai/  # LangChain chains
│   │   │   └── middleware/   # JWT, Zod validation, errors
│   │   └── prisma/
│   └── extension/            # Chrome MV3 extension
│       ├── dist/             # Built extension (after pnpm build:extension)
│       └── src/
│           ├── popup/        # React UI
│           ├── content/      # DOM automation
│           ├── background/   # API calls, JWT
│           └── modules/      # parser, mapper, filler, navigator
└── packages/
    └── shared/               # Shared TypeScript types
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error in extension console | Set `EXTENSION_ORIGIN` to your extension ID and restart backend |
| Extension cannot reach API | Check Settings: API URL should be `http://localhost:3000` |
| Database connection failed | Confirm PostgreSQL is running and `DATABASE_URL` is correct |
| OpenAI errors | Check `OPENAI_API_KEY` in `.env` and your OpenAI account balance |
| Fields not filling | Log in to Workday first, then start autofill on an application page |
