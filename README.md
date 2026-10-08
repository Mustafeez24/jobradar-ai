# JobRadar AI

> **Find the right developer jobs. Know why you match.**

JobRadar AI helps developers discover relevant jobs using live Google Jobs data from SerpApi and AI-powered job matching using NVIDIA Nemotron.

---

## 🎯 Problem

Finding a developer job is not only about searching for job listings.

Developers need to understand:

- Is this job actually relevant to my skills?
- What skills am I missing?
- Should I apply?
- What should I prepare for?
- What interview questions might I face?

Traditional job boards primarily show listings. JobRadar AI adds an AI-powered understanding layer on top of live job data.

---

## 💡 Solution

User enters:

- Role
- Location
- Experience
- Skills

JobRadar AI:

1. Searches live Google Jobs through SerpApi.
2. Retrieves relevant job listings.
3. Sends the user's profile and selected job information to NVIDIA Nemotron.
4. Generates an AI match score.
5. Identifies matching skills.
6. Identifies missing skills.
7. Explains why the user should or should not apply.
8. Generates interview questions.
9. Generates a preparation plan.

```text
User Profile
     ↓
SerpApi Google Jobs
     ↓
Live Job Listings
     ↓
NVIDIA Nemotron
     ↓
AI Job Analysis
     ↓
Match Score
Skill Gaps
Why Apply / Skip
Interview Questions
Preparation Plan
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔎 **Live Google Jobs search** | Real-time job listings via SerpApi Google Jobs API |
| 🤖 **NVIDIA Nemotron-powered analysis** | AI job matching using `nvidia/nemotron-3-ultra-550b-a55b` |
| 📊 **0–100 AI match score** | Quantified fit between profile and job |
| ✅ **Matching skills** | Skills you have that align with requirements |
| ⚠️ **Missing skills** | Skills the job requires that you lack |
| 💡 **Why apply / why skip** | Contextual recommendation with reasoning |
| 🎯 **Recommendation levels** | Highly Recommended · Recommended · Consider · Not Recommended |
| 💬 **AI-generated interview questions** | 5 tailored technical/behavioral questions |
| 📚 **Personalized preparation plan** | 4 actionable steps for this specific role |
| 🔄 **Retry handling** | Graceful handling of AI service overload |
| 📱 **Responsive interface** | Works on desktop, tablet, and mobile |
| ✨ **Motion-powered UI** | Polished animations with Framer Motion |
| ♿ **Accessibility** | Keyboard navigation, reduced-motion support, ARIA labels |
| 📍 **Location normalization** | Common city aliases supported |

---

## 🧠 AI Analysis

The application uses **NVIDIA Nemotron** (`nvidia/nemotron-3-ultra-550b-a55b`) through NVIDIA's API to analyze job fit.

### Input to the model:
- Candidate profile (role, experience, skills)
- Job title, company, location
- Job description
- Job highlights (qualifications, responsibilities, benefits)

### Structured output:
```text
Match Score          (0–100)
Recommendation       (Highly Recommended / Recommended / Consider / Not Recommended)
Matching Skills      (array)
Missing Skills       (array)
Why Apply            (2–3 sentences)
Why Skip             (1–2 sentences or empty)
Interview Questions  (5 questions)
Preparation Plan     (4 actionable steps)
```

The analysis is performed server-side. API keys are never exposed to the client.

---

## 🔍 SerpApi Integration

**SerpApi = Live Job Discovery**  
**NVIDIA Nemotron = AI Job Analysis**

These are separate concerns. SerpApi provides the raw job data; Nemotron analyzes the fit.

### Flow

```text
User enters role + location
        ↓
JobRadar AI builds search query (role + top skills)
        ↓
SerpApi Google Jobs API
        ↓
Live job listings
        ↓
JobRadar AI displays results
        ↓
User clicks "Analyze Match"
        ↓
NVIDIA Nemotron analyzes fit
```

### Details

- **Engine**: `google_jobs`
- **Location**: Passed as a separate parameter for search reliability
- **Query**: Built from role + top 4 normalized skills (avoids overly long queries)
- **Normalization**: Skills are trimmed, deduplicated, punctuation cleaned (`SQL.` → `SQL`), limited to 8

---

## 🏗️ Architecture

```text
Next.js Frontend
       │
       ├── /api/jobs
       │       │
       │       └── SerpApi Google Jobs
       │
       └── /api/analyze
               │
               └── NVIDIA Nemotron
```

### Layer Responsibilities

| Layer | Responsibility |
|-------|----------------|
| Frontend (`app/page.tsx`) | User input, job list display, AI analysis panel, animations |
| `/api/jobs` | SerpApi request, query building, timeout handling, response formatting |
| `/api/analyze` | Nemotron request, prompt engineering, response parsing, retry logic |

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|--------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, TypeScript, Tailwind CSS 4 |
| Animation | Motion (Framer Motion) |
| Job Data | SerpApi Google Jobs API |
| AI Analysis | NVIDIA Nemotron (`nvidia/nemotron-3-ultra-550b-a55b`) |
| Runtime | Node.js |
| Linting | ESLint 9 |

---

## 🎨 UI / UX

- **Responsive design** — Mobile-first grid, touch-friendly targets
- **Animated job cards** — Staggered entrance, hover lift, expandable details
- **Animated match score** — Circular progress with count-up animation
- **Staggered AI sections** — Match score → Recommendation → Why Apply → Skills → Questions → Plan
- **Loading states** — Custom AI spinner with pulsing dots
- **Error states** — Friendly messages with retry actions
- **Reduced-motion support** — Respects `prefers-reduced-motion`
- **Accessibility** — Semantic HTML, ARIA labels, keyboard focus, contrast

---

## 🚀 Getting Started

```bash
git clone https://github.com/Mustafeez24/jobradar-ai.git
cd jobradar-ai
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 🔐 Environment Variables

Create a `.env.local` file in the project root:

```env
SERPAPI_KEY=your_serpapi_key
NVIDIA_API_KEY=your_nvidia_api_key
```

> **Never commit `.env.local` or expose API keys in client-side code.**  
> Both keys are used only in server-side API routes (`/api/jobs`, `/api/analyze`).

---

## 🧪 Testing

```bash
npm run build
```

The application has been validated for:

- Job search (SerpApi integration)
- AI analysis (Nemotron integration)
- Match scoring (0–100)
- Skill gap analysis (matching + missing)
- Interview question generation (5 questions)
- Preparation plan generation (4 steps)
- Error handling (timeouts, retries, 429/503)
- Timeout handling (30s SerpApi, 90s Nemotron)
- Build/type checking

---

## 📸 Screenshots

### Job Search

![Job Search](./docs/screenshots/job-search.png)

### AI Match Analysis

![AI Match Analysis](./docs/screenshots/ai-analysis.png)

> **Note:** Screenshot files should be added to `docs/screenshots/` before the hackathon submission.

---

## 🏆 Hackathon

### SerpApi India Hackathon 2026

**Track: Knowledge & Public Interest**

JobRadar AI uses Google Jobs data to help developers—especially early-career developers—understand which opportunities fit their current skills and what they need to improve to become better candidates.

By combining live job discovery (SerpApi) with AI-powered fit analysis (NVIDIA Nemotron), the project transforms raw job listings into actionable career intelligence.

---

## 🤖 AI Tools Used

### Runtime AI
- **NVIDIA Nemotron** (`nvidia/nemotron-3-ultra-550b-a55b`) — Job fit analysis

### Development Assistance
- AI coding assistant used during development for code generation, debugging, and refactoring

---

## 🔮 Future Improvements

- Additional job sources (LinkedIn, Indeed, company career pages)
- Saved jobs and job alerts
- User accounts with profile persistence
- Resume parsing for automatic profile creation
- Personalized learning resource recommendations
- Company insights and salary benchmarks

> These features are not currently implemented.

---

## 📄 License

License information will be added separately.