# LearnifAI — Know Your Gaps. Fill Them Fast.

[![Frontend: React](https://img.shields.io/badge/Frontend-React-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Backend: Node.js/Express](https://img.shields.io/badge/Backend-Node.js/Express-339933?style=flat-square&logo=node.js)](https://expressjs.com/)
[![Database: Supabase](https://img.shields.io/badge/DB-Supabase-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![AI: Ollama](https://img.shields.io/badge/AI-Ollama-000000?style=flat-square&logo=ollama)](https://ollama.com/)
[![Styling: TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-06B6D4?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Animations: GSAP/Framer](https://img.shields.io/badge/FX-GSAP/Framer-green?style=flat-square&logo=greensock)](https://gsap.com/)

---

## Project Structure

```text
LearnifAI/
├── backend/                # Express.js Server & Business Logic
│   ├── controllers/        # Route handlers (auth, data management)
│   ├── data/               # Knowledge graph datasets & question banks
│   ├── services/           # Core Engines (BKT, AI, Diagnostic Engine)
│   │   ├── diagnosticEngine.js  # Adaptive quiz flow logic
│   │   ├── llmService.js        # Ollama LLM Orchestration
│   │   ├── narratorService.js   # Personalized AI-driven feedback
│   │   └── dataLoader.js        # Knowledge graph graph-seeding
│   ├── routes/             # API Endpoint definitions
│   ├── supabase/           # PostgreSQL/Supabase Schemas
│   └── index.js            # Backend Entry Point
│
├── src/                    # React Frontend (Vite)
│   ├── components/         # UI Components
│   │   ├── KnowledgeGraph.jsx # D3.js/ReactFlow Knowledge Web
│   │   ├── Hero.jsx           # Animated GSAP Intro
│   │   ├── Library.jsx        # Resource recommendation engine
│   │   ├── TestSection.jsx    # Real-time adaptive testing interface
│   │   ├── ui/                # Reusable shadcn/primitive components
│   │   └── layout/            # Navigation & Layout wrappers
│   ├── pages/              # Routing views
│   │   ├── Dashboard.jsx      # Central hub for student mastery
│   │   ├── AuthPage.jsx       # Login/Register with Framer Motion
│   │   └── GraphPage.jsx      # Full-screen interactive concept map
│   ├── styles/             # Global Tailwind & Custom CSS
│   ├── App.jsx             # Main Routing & Provider setup
│   └── main.jsx            # Frontend Entry Point
│
├── public/                 # Static assets & 3D Models
│   └── assets/             # GLTF/GLB models for immersive UI
│
├── tailwind.config.js      # Styling Design System
├── vite.config.js          # Build tool configuration
├── vercel.json             # Vercel deployment settings
└── README.md               # You are here!
```

---

## Key Features

- **Diagnostic Mastery Engine**: Powered by Bayesian Knowledge Tracing (BKT) to dynamically estimate mastery level across connected prerequisites.
- **Interactive Knowledge Graph**: A visual map of the curriculum where nodes change color as you master them, showing exactly where you stand.
- **AI Learning Narrator**: Real-time personalized feedback that explains *why* you got a question wrong, powered by local **Ollama** models.
- **Root Cause Tracer**: If you fail a topic, LearnifAI scans your prerequisite mastery and discovers the *original* missing concept that caused the failure.
- **Immersive UX**: Integrated Three.js 3D models and GSAP cinematic transitions create a premium, gamified learning environment.

---

## How It Works

1. **Mapping**: The platform connects concepts through a prerequisite graph (Knowledge Graph).
2. **Diagnosis**: Students take adaptive tests. The **BKT Engine** updates mastery probabilities based on performance.
3. **Tracing**: When failure occurs, the **Root Cause Tracer** navigates down the graph to find the weakest link.
4. **Action**: The **Narrator** and **Library** services recommend the specific book, chapter, and shelf location to fix the gap.

---

## Tech Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Visuals**: Three.js (3D), GSAP (Cinematics), Framer Motion (Micro-interactions)
- **Data Visualization**: React Flow (Graphs), Recharts (Analytics)
- **State**: Zustand (Persistence)
- **Style**: TailwindCSS, Lenis (Smooth Scroll)

### Backend
- **Environment**: Node.js / Express
- **Database**: Supabase (PostgreSQL)
- **AI**: Ollama (Llama 3.2 / Phi 3) for on-device/local LLM execution
- **Authentication**: JWT-based auth via Supabase

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm / yarn
- **Ollama** installed locally (https://ollama.com/)

### Installation & Run
1. **Clone & Install**:
   ```bash
   git clone https://github.com/paramsavla06/LearnifAI.git
   cd scoe
   npm install
   ```
2. **Config Environment**:
   Create a `.env` in the root:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   OLLAMA_MODEL=llama3.2
   PORT=5000
   ```
3. **Launch**:
   ```bash
   npm run dev:all  # Automatically starts frontend and backend
   ```

---

## Future Roadmap

- **Mobile Companion App**: Study on the go with persistent knowledge sync.
- **Collaboration Mode**: Form study groups based on complementary mastery gaps.
- **Exam Prediction**: Predicting potential performance on university finals based on historical tracking.
- **Gamified Rewards**: Unlocking 3D badge trophies for concept mastery.

---

## Team

- **Lead Developer**: Param Savla
- **Contributors**: The LearnifAI Engineering Team

---

## License

Copyright (c) 2026 LearnifAI. Distributed for educational purposes.

---

Designed with excellence by **Param Savla**.
