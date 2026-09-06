# JobPly

A job search aggregator for Indian tech jobs. Search listings from multiple sources, filter by city/salary/experience, save jobs, and quick-apply — all from one place.

## Features

- **Aggregated search** — Queries Adzuna India and JSearch (LinkedIn, Indeed, Glassdoor, Naukri) in parallel, deduplicates results, and shows the original source for each listing
- **Smart filters** — Filter by location (any Indian city), salary range (INR), job type, work mode (remote/hybrid/on-site), experience level, and posting date
- **Quick Apply** — One click opens the employer's application page with your name, email, and phone pre-filled via URL parameters
- **Application tracking** — Dashboard to monitor all applications with status updates (submitted, under review, interview scheduled, etc.)
- **Saved jobs** — Bookmark listings for later, with automatic expiry detection when a listing is taken down
- **QA Library** — Save answers to common application questions for quick reference while applying
- **Profile management** — Store your details and resume once, use them across all applications

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, React Router v6 |
| Backend | Cloudflare Workers + itty-router |
| Database | Cloudflare D1 (SQLite at the edge) |
| File storage | Cloudflare R2 (resume uploads) |
| Auth | JWT (jose + bcryptjs) |
| Job sources | Adzuna India API, JSearch API (RapidAPI) |
| Testing | Vitest, fast-check, Testing Library |

## Project structure

```
JobPly/
├── frontend/                # React SPA
│   ├── src/
│   │   ├── components/      # UI components by feature
│   │   │   ├── auth/        # Login, Register, ProfileSetup
│   │   │   ├── jobs/        # Search, filters, cards, detail
│   │   │   ├── qa/          # QA Library CRUD + match
│   │   │   ├── applications/# Application tracking dashboard
│   │   │   ├── saved/       # Saved jobs list + save button
│   │   │   └── layout/      # Nav bar + layout wrapper
│   │   ├── hooks/           # useAuth, useJobs, useApplications, useAutoApply
│   │   └── services/        # Axios API client with JWT interceptor
│   └── vite.config.js       # Dev proxy to worker on :8787
│
└── worker/                  # Cloudflare Worker API
    ├── src/
    │   ├── routes/           # auth, profile, jobs, qa, applications, saved
    │   ├── services/         # jobAggregator, deduplicator, textSimilarity, autoApply
    │   │   └── sources/      # adzunaAdapter, jsearchAdapter
    │   ├── middleware/       # JWT auth
    │   └── utils/            # validation, error helpers
    ├── schema.sql            # D1 database schema
    └── wrangler.toml         # Cloudflare config
```

## Getting started

### Prerequisites

- Node.js 18+
- npm
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)

### API keys

You need:
- **Adzuna** — Sign up at [developer.adzuna.com](https://developer.adzuna.com) for `APP_ID` and `APP_KEY`
- **JSearch** — Subscribe at [rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) for a `RAPIDAPI_KEY`

### Setup

```bash
# Clone and install
cd JobPly
cd worker && npm install && cd ..
cd frontend && npm install && cd ..

# Create local secrets file
cat > worker/.dev.vars << EOF
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
RAPIDAPI_KEY=your_rapidapi_key
JWT_SECRET=any_random_string_for_dev
EOF

# Set up the local database
cd worker
npx wrangler d1 execute jobply-db --local --file=schema.sql
```

### Run locally

Open two terminals:

```bash
# Terminal 1 — Backend (port 8787)
cd worker
npx wrangler dev --local

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Run tests

```bash
# Backend (171 tests)
cd worker && npm test

# Frontend (118 tests)
cd frontend && npm test
```


## License

MIT
