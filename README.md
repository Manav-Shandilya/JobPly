<div align="center">

# ⚡ JobPly

### Search less. Apply faster.

**One platform to search Indian tech jobs from multiple sources, filter smartly, and apply in one click.**

[![Live App](https://img.shields.io/badge/Live_Demo-jobply.pages.dev-1A1A1A?style=for-the-badge&logo=cloudflare&logoColor=white)](https://jobply.pages.dev)

[![License](https://img.shields.io/badge/License-MIT-C17817?style=for-the-badge)](#license)

</div>

---

## 🎯 What is JobPly?

JobPly is an open-source job search aggregator built for **Indian tech professionals**. Instead of checking 5 different job boards every day, search them all at once — Adzuna, LinkedIn, Indeed, Glassdoor, and Naukri — from a single clean interface.

<div align="center">

| 🔍 Search | ⚡ Apply | 📊 Track |
|:---------:|:-------:|:--------:|
| Query multiple job sources in parallel | One click opens the application | Monitor all applications in one dashboard |

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔍 Aggregated Search
Search Adzuna, LinkedIn, Indeed, Glassdoor & Naukri simultaneously. Results show the **original source** for each listing.

### 🎛️ Smart Filters
Filter by **city** (any Indian city), **salary range** (₹ INR), **job type**, **work mode** (remote/hybrid/on-site), **experience level**, and **posting date**.

### ⚡ Quick Apply
One click opens the employer's application page.

</td>
<td width="50%">

### 📊 Application Tracker
Dashboard to monitor all applications. Update status: *submitted → under review → interview → offer*.

### 🔖 Saved Jobs
Bookmark listings for later. Automatic **expiry detection** when a listing is taken down.

### 💬 QA Library
Save answers to common application questions. **Fuzzy-match search** finds your best answer instantly.

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Tech |
|:------|:-----|
| **Frontend** | React 18 · Vite · React Router v6 |
| **Backend** | Cloudflare Workers · itty-router |
| **Database** | Cloudflare D1 (SQLite at the edge) |
| **Auth** | JWT (jose + bcryptjs) |
| **Job Sources** | Adzuna India API · JSearch (RapidAPI) |
| **Testing** | Vitest · fast-check · Testing Library |

</div>

---

## 📁 Project Structure

```
JobPly/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/         # Login, Register, Profile Setup
│   │   │   ├── jobs/         # Search, Filters, Cards, Detail
│   │   │   ├── qa/           # QA Library CRUD + Match
│   │   │   ├── applications/ # Application Tracker
│   │   │   ├── saved/        # Saved Jobs + Save Button
│   │   │   └── layout/       # Nav Bar + Layout
│   │   ├── hooks/            # useAuth, useJobs, useApplications
│   │   └── services/         # API client with JWT interceptor
│   └── vite.config.js
│
└── worker/                   # Cloudflare Worker API
    ├── src/
    │   ├── routes/            # auth, profile, jobs, qa, applications, saved
    │   ├── services/          # aggregator, deduplicator, similarity, auto-apply
    │   │   └── sources/       # adzunaAdapter, jsearchAdapter
    │   ├── middleware/        # JWT auth
    │   └── utils/             # validation, error helpers
    ├── schema.sql
    └── wrangler.toml
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** and **npm**
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) — `npm install -g wrangler`

### Get API Keys

| Service | Where to sign up | What you get |
|---------|-----------------|--------------|
| **Adzuna** | [developer.adzuna.com](https://developer.adzuna.com) | `APP_ID` + `APP_KEY` |
| **JSearch** | [rapidapi.com/jsearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) | `RAPIDAPI_KEY` |

### Install & Configure

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/JobPly.git
cd JobPly

# Install dependencies
cd worker && npm install && cd ..
cd frontend && npm install && cd ..

# Create your local secrets file
cat > worker/.dev.vars << 'EOF'
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
RAPIDAPI_KEY=your_rapidapi_key
JWT_SECRET=any_random_string
EOF

# Set up the local database
cd worker && npx wrangler d1 execute jobply-db --local --file=schema.sql
```

### Run Locally

```bash
# Terminal 1 — Backend (port 8787)
cd worker
npx wrangler dev --local

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** 🎉

### Run Tests

```bash
cd worker && npm test     # 171 backend tests
cd frontend && npm test   # 118 frontend tests
```

---

## 📡 API Reference

<details>
<summary><strong>Auth</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Log in → JWT |
| `POST` | `/api/auth/logout` | Log out |

</details>

<details>
<summary><strong>Profile</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/profile` | Get user profile |
| `PUT` | `/api/profile` | Update profile |
| `POST` | `/api/profile/resume` | Upload resume |

</details>

<details>
<summary><strong>Jobs</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/jobs/search` | Search with filters |
| `GET` | `/api/jobs/:id` | Job detail |
| `POST` | `/api/jobs/:id/auto-apply` | Quick apply |

</details>

<details>
<summary><strong>Applications</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/applications` | List all (paginated) |
| `PATCH` | `/api/applications/:id/status` | Update status |

</details>

<details>
<summary><strong>QA Library</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/qa` | List QA pairs |
| `POST` | `/api/qa` | Create pair |
| `PUT` | `/api/qa/:id` | Update pair |
| `DELETE` | `/api/qa/:id` | Delete pair |
| `POST` | `/api/qa/match` | Find matching answer |

</details>

<details>
<summary><strong>Saved Jobs</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/saved-jobs` | List saved |
| `POST` | `/api/saved-jobs` | Save/unsave (toggle) |
| `DELETE` | `/api/saved-jobs/:id` | Remove saved |

</details>

---

## 📄 License

MIT — do whatever you want with it.

---

<div align="center">

**If this helped you, consider giving it a ⭐**

[Live Demo](https://jobply.pages.dev)

</div>
