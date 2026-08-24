# ⚔️ ArenaVerse: eSports Tournament Management & Community Ecosystem (Features 1–100 Complete)

[![Stack](https://img.shields.io/badge/Stack-MERN-blue.svg)](https://react.dev/)
[![Realtime](https://img.shields.io/badge/Realtime-Socket.io-black.svg)](https://socket.io/)
[![Build Tool](https://img.shields.io/badge/Vite-5.3-purple.svg)](https://vitejs.dev/)
[![Database](https://img.shields.io/badge/Database-MongoDB-green.svg)](https://www.mongodb.com/)
[![Kubernetes](https://img.shields.io/badge/Orchestration-Kubernetes-blue.svg)](https://kubernetes.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**ArenaVerse** is an enterprise-grade, real-time eSports tournament management platform, AI creative engine, and interactive community ecosystem. Built with the MERN stack, Socket.io, Gemini AI, Docker, and Kubernetes, it supports 100 features spanning tournament brackets, live score tracking, team squad formation, AI coaching & asset generation, Arena Coins reward stores, anti-cheat & anti-smurf analytics, community forums, live streaming hubs, and enterprise Kubernetes production deployments.

---

## ✨ Complete Feature Ecosystem (Features 1–100)

### 🏆 1. Tournament Engine & Match Progression (Features 1–15, 62, 65, 66)
- 🏆 **Elimination Brackets**: Single and double-elimination bracket engine with automated seed distribution and winner progression.
- ⚡ **Real-Time Bracket Updates**: Socket.io live score broadcasts and instant node progression without page refreshes.
- ⏰ **Match Check-In & Walkovers**: Check-in badges, check-in buttons, no-show alerts, and automated walkover processing.
- 👑 **Match MVP Awards**: Organizer MVP selection, match node MVP badges, and MVP Honors profile tab.
- 📜 **Tournament PDF Certificates**: PDFKit streaming certificate generator for Champion, Runner-Up, and Participants.
- 🎯 **Practice Rooms & Draft Lobby**: Scrim scheduling, team ready check, and draft lobby attendance.

---

### 👤 2. Player Career, Social & Squad Management (Features 16–30, 61, 63, 64, 67, 68)
- 👤 **Player Career Profile & Game Accounts**: Career stats, match history, badge showcases, and linked Steam/Riot/Epic/Xbox/PSN accounts.
- 🥇 **Ranked Divisions & Seasons**: 7 Competitive Divisions (**Bronze** to **Grandmaster**) and Season reset engine.
- 👥 **Team Squads & Member Roles**: Squad creation, invite codes, member role assignments (**Captain**, **Co-Captain**, **Coach**, **Analyst**, **Substitute**, **Player**), and private squad chat.
- 🎙️ **WebRTC Voice Chat & Screen Share**: In-app WebRTC voice channels for teams, lobbies, and screen sharing during scrims.
- 🎨 **Coach Whiteboard**: Interactive tactical map canvas for strategy drawing and map callouts.
- ➕ **Player Follow System**: Follow players, squad teams, and event organizers with live activity notifications.

---

### 🤖 3. AI Creative Studio, Coaching & Analytics (Features 34–36, 69–83)
- 🤖 **AI Tournament Assistant (ArenaBot)**: Floating AI chatbot widget powered by live MongoDB context and Google Gemini/OpenAI API.
- 🎨 **AI Creative Studio**: Asset generator producing Dynamic Posters, Banners, Esports Team Logos, Rulebooks, Sponsor Proposals, Press Releases, and Social Captions.
- 📊 **AI Match Predictions & Coach**: Win probability %, expected MVP, and AI tactical draft recommendations.
- 🎬 **AI Commentary & Recaps**: Automated post-match commentary narration and video script generator.

---

### 🛍️ 4. Store, Rewards & Community Forums (Features 37–57, 84–87)
- 🛍️ **Arena Coins Reward Store**: Earn Arena Coins through daily missions & tournaments to redeem animated profile frames, titles, and Battle Pass levels.
- 💬 **Community Forums & Polls**: Category discussion boards (**General**, **Tournament Discussion**, **Recruitment**, **Support**) and interactive community polls.
- 👕 **Merchandise Store & Marketplace**: Esports jerseys, hoodies, mousepads, stream overlay graphics, and digital assets.
- 📺 **Live Streaming Hub**: Stream directory featuring live Twitch and YouTube creator broadcasts.
- 🏆 **Hall of Fame & Timeline**: Dedicated Hall of Fame (`/hall-of-fame`) and Platform Milestones (`/milestones`).

---

### 🛡️ 5. Security, Operations & Enterprise Deployment (Features 31–33, 88–100)
- 🕵️ **Anti-Smurf & Anti-Cheat System**: Duplicate account detection (IP, device fingerprint, risk scoring) and match cheat investigation console.
- 📊 **Admin Platform Analytics & Health**: Real-time metrics for DAU, MAU, revenue, server CPU/RAM, DB connection, and audit log history.
- 📦 **Docker & Kubernetes Enterprise Suite**: Multi-container `docker-compose.yml`, Kubernetes deployment manifest ([deployment.yaml](file:///d:/College/Semester%207/UDP/ArenaVerse/k8s/deployment.yaml)), Nginx reverse proxy ([nginx.conf](file:///d:/College/Semester%207/UDP/ArenaVerse/nginx.conf)), and Redis cache adapter.
- 📖 **Swagger OpenAPI 3.0 Documentation**: Interactive API documentation UI available at `/api-docs`.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with Vite 5
- **Routing**: React Router v6 (with `React.lazy` code-splitting & `<Suspense>`)
- **Real-Time Client**: Socket.io-client
- **Real-Time Voice**: WebRTC Client
- **Icons**: Lucide React
- **Styling**: Custom Vanilla CSS with Gaming Theme Design Tokens & Glassmorphic UI

### Backend
- **Runtime**: Node.js & Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-Time Server**: Socket.io
- **Auth**: JSON Web Tokens (JWT) & Bcryptjs
- **Integrations**: Google Gemini API, Nodemailer, PDFKit, QRCode, Swagger UI, Gzip, Rate Limiting, Helmet

### DevOps & Deployment
- **Containerization**: Docker & Docker Compose
- **Orchestration**: Kubernetes (`k8s/deployment.yaml`)
- **Reverse Proxy**: Nginx (`nginx.conf`)
- **Caching Adapter**: Redis (`backend/config/redis.js`)
- **CI/CD**: GitHub Actions (`.github/workflows/ci-cd.yml`)

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18.x or higher)
- MongoDB instance running locally (`mongodb://127.0.0.1:27017/arena_verse`) or MongoDB Atlas URI
- Google Cloud Console account (for OAuth Client ID)

---

### 1. Environment Configuration

You must create a `.env` file in both the `backend` and `frontend` directories.

**backend/.env**:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/arena_verse
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

**frontend/.env**:
```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

### 2. Backend Setup

```bash
cd backend
npm install
npm run dev
```

*(Optional)* To populate the database with initial Esports News and create your first Admin account, you can run the provided scripts in a new terminal:
```bash
cd backend
node scripts/seedNews.js
node scripts/makeAdmin.js
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Visit **http://localhost:5173** in your web browser.
Open API Documentation at **http://localhost:5000/api-docs**.

---

## 🤝 License

Distributed under the **MIT License**.
