# Chunav Saathi

Chunav Saathi is an AI-enabled election awareness and analytics platform that helps citizens find election information, access voter services, and follow complaints.

## Features

- Election guidance and voter-service links
- Multilingual interface with English, Hindi, and Kannada support
- Polling booth information backed by Open Government Data
- Citizen and admin authentication
- Complaint submission, tracking, and analytics
- AI assistant for questions about election services and application data

## Technology

- Next.js App Router and React
- MongoDB
- Groq API for the AI assistant
- Open Government Data Platform India for booth information

## Run Locally

From the `chunav-saathi` directory, install dependencies and start the development server:

```bash
npm install
npm run dev
```

Configure these values in `chunav-saathi/.env.local` as needed:

- `MONGODB_URI`
- `JWT_SECRET`
- `GROQ_API_KEY`
- `DATA_GOV_API_KEY`

Then open `http://localhost:3000`.