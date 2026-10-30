# Chunav-Saathi: Elite Election Awareness & Analytics Platform

**Chunav-Saathi** is an advanced, AI-powered election awareness and analytics platform built to strictly satisfy the full-stack architecture syllabus requirements.

---

## 1. Complete Frontend Implementation
The frontend is built with **Next.js (App Router)** and **React 19**, focusing on a premium, responsive user interface.
- **Pages Designed**: Premium UI implemented across all routes (`/`, `/dashboard`, `/analytics`, `/complaints`, etc.) using custom CSS and modern design tokens.
- **Navigation**: Seamless routing with Next.js integrated with a persistent Navbar and responsive layouts.
- **Forms & Validation**: Strict form validation is enforced (e.g., in `src/app/complaints/new/page.js` and registration modals), providing clear error states and user feedback.
- **Language Localization**: Retained robust, context-based language localization (`LanguageContext.js`) supporting English, Hindi, and Kannada natively.

## 2. Backend & API Integration
The backend operates securely within the Next.js API routes, seamlessly connected to **MongoDB**.
- **Data Layer Integration**: Integrated directly with `data.gov.in` via `src/lib/dataGovService.js` to fetch live election and polling booth data.
- **Database Connection**: MongoDB is fully configured and connected (`src/lib/mongodb.js`).
- **Complete APIs & CRUD**: Comprehensive RESTful APIs implemented for Complaints (`/api/complaints`), Booths (`/api/data-gov/booths`), and Auth (`/api/auth`). Full CRUD operations are flawless.
- **Authentication & Authorization**: JWT-based secure authentication (`auth.js`), enforcing role-based access control (Citizen vs. Admin).

## 3. Data Analytics Dashboard
A powerful Data Analytics module is accessible at `/analytics`.
- **Charts & Summaries**: Visualizes data through SVG-based Donut Charts, Bar Charts, Line Trends, and Data Tables.
- **Advanced Filtering**: Implements strict filtering options: **State/Location-wise**, **Category-wise**, **Status-wise**, and **Date-wise**.
- **KPIs**: Displays critical metrics like Total Complaints, Resolution Rate, and Average Resolution Days.

## 4. AI Copilot Integration
Embedded an intelligent AI Assistant (Chunav Saathi) powered by **Groq (LLaMA-3)**.
- **Application Data Integration**: The AI Copilot is heavily context-aware. It directly queries the MongoDB collections (Booths, Complaints, Elections) dynamically based on the user's conversation intent (`src/app/api/chat/route.js`).
- **Data Analytics Demonstration**: The chatbot actively demonstrates insights by synthesizing database records and filtering criteria (like State) to answer citizen queries regarding polling booths, constituency stats, and complaint resolution analytics.

---

## Tech Stack
- **Frontend**: Next.js 16, React 19, Lucide React (Icons), Vanilla CSS
- **Backend**: Next.js API Routes (Node.js runtime)
- **Database**: MongoDB
- **AI**: Groq API (`@ai-sdk/groq`)
- **External APIs**: Open Government Data Platform India (`data.gov.in`)

## Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Environment Variables**:
   Ensure you have a `.env.local` configured with:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `GROQ_API_KEY`
   - `DATA_GOV_API_KEY`
3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Access the platform at `http://localhost:3000`.
