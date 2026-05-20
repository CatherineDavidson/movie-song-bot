# 🎬🎵 Movie Song Bot

A lightweight web app that lets users search for movie soundtracks and songs using the **iTunes Search API**. Built with Node.js and Express, it serves a static frontend and proxies iTunes API requests to avoid CORS issues in the browser.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
- [API Reference](#api-reference)
  - [Health Check](#health-check)
  - [Search Songs / Albums](#search-songs--albums)
  - [Lookup Album Tracks](#lookup-album-tracks)
- [Deployment (Free Options)](#deployment-free-options)
  - [Option 1: Render (Recommended)](#option-1-render-recommended)
  - [Option 2: Railway](#option-2-railway)
  - [Option 3: Vercel](#option-3-vercel)
- [Environment Variables](#environment-variables)
- [How It Works](#how-it-works)
- [Known Limitations](#known-limitations)

---

## ✨ Features

- 🔍 Search for songs or albums by name using the iTunes API
- 💿 Look up all tracks in a specific album by its iTunes collection ID
- ⚡ Built-in request timeout (10 seconds) to handle slow upstream responses
- 🌐 IPv4-first DNS fix for reliable hosting on cloud platforms
- 🖥️ Serves the frontend statically — no separate frontend server needed
- 🏥 `/health` endpoint for deployment platform health checks

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (v18+) |
| Framework | Express.js v4 |
| Module System | ES Modules (`import`/`export`) |
| External API | iTunes Search API (free, no key needed) |
| Frontend | HTML, CSS, JavaScript (static files in `/public`) |

---

## 📁 Project Structure

```
movie-song-bot/
├── public/              # Frontend files (HTML, CSS, JS)
│   └── index.html       # Main UI entry point
├── server.js            # Express server + API proxy
├── package.json         # Dependencies and scripts
├── package-lock.json    # Lockfile
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) **v18 or higher**
- npm (comes with Node.js)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/CatherineDavidson/movie-song-bot.git

# 2. Navigate into the project folder
cd movie-song-bot

# 3. Install dependencies
npm install
```

### Running Locally

```bash
npm start
```

The server will start at **http://localhost:3000**

Open your browser and visit `http://localhost:3000` to use the app.

---

## 📡 API Reference

All API routes are prefixed with `/api/itunes/`. The server acts as a proxy to the iTunes API, so the frontend never makes direct cross-origin requests.

---

### Health Check

```
GET /health
```

Returns a simple status response. Used by hosting platforms to verify the server is running.

**Response:**
```json
{ "ok": true }
```

---

### Search Songs / Albums

```
GET /api/itunes/search
```

Search for songs or albums by name.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `term` | string | ✅ Yes | — | The search keyword (e.g. movie name) |
| `entity` | string | No | `album` | `album` or `song` |
| `attribute` | string | No | auto | `albumTerm` or `songTerm` |
| `limit` | number | No | `10` | Number of results to return (max 200) |

**Example Request:**
```
GET /api/itunes/search?term=interstellar&entity=album&limit=5
```

**Example Response:**
```json
{
  "resultCount": 5,
  "results": [
    {
      "collectionId": 123456789,
      "collectionName": "Interstellar (Original Motion Picture Soundtrack)",
      "artistName": "Hans Zimmer",
      "artworkUrl100": "https://...",
      "trackCount": 24,
      "releaseDate": "2014-11-21T08:00:00Z"
    }
  ]
}
```

**Error Responses:**

| Status | Reason |
|--------|--------|
| `400` | `term` parameter is missing or empty |
| `500` | iTunes API timed out or server error |

---

### Lookup Album Tracks

```
GET /api/itunes/lookup
```

Fetch all songs in a specific album using its iTunes `collectionId`.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✅ Yes | The iTunes `collectionId` of the album |

**Example Request:**
```
GET /api/itunes/lookup?id=123456789
```

**Example Response:**
```json
{
  "resultCount": 25,
  "results": [
    {
      "wrapperType": "collection",
      "collectionName": "Interstellar (Soundtrack)",
      ...
    },
    {
      "wrapperType": "track",
      "trackName": "Cornfield Chase",
      "trackNumber": 1,
      "trackTimeMillis": 152933,
      "previewUrl": "https://audio-preview.itunes.apple.com/..."
    }
  ]
}
```

**Error Responses:**

| Status | Reason |
|--------|--------|
| `400` | `id` parameter is missing or empty |
| `500` | iTunes API timed out or server error |

---

## ☁️ Deployment (Free Options)

This is a standard Node.js/Express app — **yes, it is very easy to deploy for free!** Here are the best options:

---

### Option 1: Render ✅ (Recommended)

Render offers a **free tier** for web services with zero configuration needed.

**Steps:**

1. Go to [https://render.com](https://render.com) and sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select the `movie-song-bot` repository
4. Fill in the settings:

   | Setting | Value |
   |---------|-------|
   | **Environment** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Instance Type** | Free |

5. Click **"Create Web Service"** — Render will deploy automatically!

> ⚠️ **Free tier note:** The server sleeps after 15 minutes of inactivity. The first request after sleep takes ~30 seconds to wake up.

---

### Option 2: Railway

Railway provides **$5 free credit/month** which is enough for a small app like this.

**Steps:**

1. Go to [https://railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select `movie-song-bot`
4. Railway auto-detects Node.js and deploys — no configuration needed!
5. Go to **Settings → Networking** and click **"Generate Domain"** for a public URL

---

### Option 3: Vercel

Vercel is primarily for frontends but can work for simple Express apps using serverless functions.

> ⚠️ Vercel requires extra configuration for Express. Render or Railway are easier for this project.

---

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the server listens on (set automatically by hosting platforms) |

No API keys are required — the iTunes Search API is completely free and open.

---

## 🔍 How It Works

```
User (Browser)
     │
     │  GET /api/itunes/search?term=...
     ▼
Express Server (server.js)
     │
     │  Proxy request with timeout + User-Agent header
     ▼
iTunes Search API (itunes.apple.com)
     │
     │  JSON response
     ▼
Express Server
     │
     │  Forward response to browser
     ▼
User (Browser) — renders results from frontend JS
```

The server acts as a **proxy** between the browser and iTunes API. This is necessary because the iTunes API does not allow direct browser requests from custom domains (CORS restriction).

---

## ⚠️ Known Limitations

- The iTunes API is region-scoped to **India (`/in/`)** in this implementation. To change the region, update the URLs in `server.js` (e.g. replace `/in/` with `/us/`).
- The free tier on Render has a **cold start delay** of ~30 seconds after inactivity.
- iTunes API results and availability may vary by region and are outside the control of this app.
- No authentication or rate limiting is implemented on the proxy endpoints.
