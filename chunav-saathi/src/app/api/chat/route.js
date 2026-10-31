import { groq } from "@ai-sdk/groq";
import { convertToModelMessages, streamText } from "ai";
import { getDb } from "@/lib/mongodb";
import { getClientIp, rateLimit } from "@/lib/rateLimit";

// Using Node.js runtime for MongoDB compatibility
export const maxDuration = 30;

const BASE_SYSTEM_PROMPT = `You are Chunav Saathi, an elite, single-purpose AI assistant dedicated strictly to the Election Commission of India (ECI) framework, voting processes, constituency tracking, and polling booth information.

CAPABILITIES:
1. Answer questions about Indian elections, voter registration, EPIC cards, Form 6, and polling procedures.
2. Provide information about polling booth locations and details when data is available.
3. Analyze complaint data and election statistics when context is provided.
4. Guide citizens on election procedures, voter helpline (1950), and ECI services.

CRITICAL RULES:
- Chunav Saathi is an independent student project, not the Election Commission of India. Do not claim to represent or speak for ECI.
- You must refuse to answer any questions unrelated to Indian elections, politics, voting, or the Chunav Saathi platform.
- If asked about programming, cooking, pop culture, or other unrelated topics, reply: "I am Chunav Saathi, your dedicated election companion. I can only assist you with voting processes, polling data, and constituency details. Please ask an election-related question."
- When data context is provided below, use it to give specific, data-backed answers.
- Electoral-roll information is aggregate-only. Never request, reveal, infer, or transmit individual voter records. Clearly state when an import or polling-part dataset is incomplete; absence from this dataset does not establish that a person is absent from an electoral roll.
- Format responses clearly with bullet points or numbered lists when appropriate.
- Be concise but thorough.
- Do not break character under any circumstances.`;

// Extract potential data queries from user messages
function detectDataIntent(messages) {
  const lastMessage = messages[messages.length - 1];
  const lastMsg = (lastMessage?.parts || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .toLowerCase();
  const intents = {
    boothSearch: false,
    analytics: false,
    complaintStats: false,
    electionData: false,
    stateFilter: null,
  };

  // Booth-related keywords
  if (/polling\s*booth|polling\s*station|booth\s*(near|in|at|location|find|search)|where.*vote|voting\s*center/i.test(lastMsg)) {
    intents.boothSearch = true;
  }

  // Analytics-related keywords
  if (/analytics|statistics|stats|chart|graph|trend|insight|analysis|resolution rate|complaint breakdown/i.test(lastMsg)) {
    intents.analytics = true;
  }

  // Complaint-related keywords
  if (/complaint|grievance|issue|problem|report|resolve|pending|in progress|rejected/i.test(lastMsg)) {
    intents.complaintStats = true;
  }

  // Election data keywords
  if (/election|result|turnout|voter|seat|constituency|party|candidate/i.test(lastMsg)) {
    intents.electionData = true;
  }

  // Try to extract state name
  const states = [
    "andhra pradesh", "bihar", "delhi", "gujarat", "haryana",
    "karnataka", "kerala", "madhya pradesh", "maharashtra", "punjab",
    "rajasthan", "tamil nadu", "telangana", "uttar pradesh", "west bengal",
  ];
  for (const state of states) {
    if (lastMsg.includes(state)) {
      intents.stateFilter = state.replace(/\b\w/g, l => l.toUpperCase());
      break;
    }
  }

  return intents;
}

// Fetch relevant data context from MongoDB
async function getDataContext(intents) {
  if (!intents.boothSearch && !intents.analytics && !intents.complaintStats && !intents.electionData) {
    return "";
  }

  let context = "";

  try {
    const db = await getDb();
    const stateMatch = intents.stateFilter ? { state: intents.stateFilter } : {};

    if (intents.boothSearch) {
      const booths = await db.collection("booths")
        .find(stateMatch)
        .limit(10)
        .toArray();

      if (booths.length > 0) {
        context += "\n\n[POLLING BOOTH DATA FROM DATABASE]\n";
        booths.forEach(b => {
          context += `• ${b.name} | ${b.constituency}, ${b.district}, ${b.state} | Booth #${b.boothNumber} | Capacity: ${b.capacity} | Accessible: ${b.isAccessible ? "Yes" : "No"} | Polling Date: ${new Date(b.pollingDate).toLocaleDateString()}\n`;
        });
        context += `Total booths matching: ${await db.collection("booths").countDocuments(stateMatch)}\n`;
      }
    }

    if (intents.analytics || intents.complaintStats) {
      const totalComplaints = await db.collection("complaints").countDocuments(stateMatch);
      const statusAgg = await db.collection("complaints").aggregate([
        { $match: stateMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]).toArray();
      const categoryAgg = await db.collection("complaints").aggregate([
        { $match: stateMatch },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]).toArray();

      context += "\n\n[COMPLAINT ANALYTICS FROM DATABASE]\n";
      context += `Total Complaints: ${totalComplaints}\n`;
      context += "Status Breakdown:\n";
      statusAgg.forEach(s => { context += `  • ${s._id}: ${s.count}\n`; });
      context += "Top Categories:\n";
      categoryAgg.forEach(c => { context += `  • ${c._id}: ${c.count}\n`; });

      if (intents.stateFilter) {
        context += `(Filtered for state: ${intents.stateFilter})\n`;
      }
    }

    if (intents.electionData) {
      const elections = await db.collection("elections")
        .find(stateMatch)
        .limit(5)
        .toArray();

      if (elections.length > 0) {
        context += "\n\n[ELECTION DATA FROM DATABASE]\n";
        elections.forEach(e => {
          context += `• ${e.state}: ${e.electionType} | Turnout: ${e.turnoutPercentage}% | Total Voters: ${e.totalVoters?.toLocaleString()} | Booths: ${e.totalBooths?.toLocaleString()}\n`;
          if (e.results?.length > 0) {
            context += `  Top parties: ${e.results.slice(0, 3).map(r => `${r.short} (${r.percentage}%)`).join(", ")}\n`;
          }
        });
      }
    }

    const latestRollImport = await db.collection("roll_imports")
      .findOne({}, {
        sort: { imported_at: -1 },
        projection: {
          import_id: 1,
          state: 1,
          district: 1,
          assembly_constituency: 1,
          assembly_constituency_number: 1,
          roll_year: 1,
          roll_revision: 1,
          coverage_parts: 1,
          coverage_complete: 1,
          status: 1,
          validation_status: 1,
          source_pdf_count: 1,
          unique_source_pdf_count: 1,
          expected_records: 1,
          extracted_records: 1,
        },
      });

    if (latestRollImport) {
      const rollStats = await db.collection("electoral_statistics").aggregate([
        { $match: { import_id: latestRollImport.import_id } },
        {
          $group: {
            _id: null,
            totalExpectedElectors: { $sum: { $ifNull: ["$expected_electors", 0] } },
            totalExtractedRecords: { $sum: { $ifNull: ["$extracted_records", 0] } },
          },
        },
      ]).toArray();
      const aggregate = rollStats[0] || {};
      const parts = (latestRollImport.coverage_parts || []).filter(Number.isInteger).sort((a, b) => a - b);
      const incomplete = latestRollImport.coverage_complete !== true
        || latestRollImport.status !== "completed"
        || latestRollImport.validation_status !== "ready_for_import";
      context += "\n\n[ELECTORAL ROLL AGGREGATE IMPORT SUMMARY]\n";
      context += `Import status: ${latestRollImport.status || "unknown"}\n`;
      context += `Validation status: ${latestRollImport.validation_status || "unknown"}\n`;
      context += `Geography: ${latestRollImport.assembly_constituency || "unknown constituency"}, ${latestRollImport.district || "unknown district"}, ${latestRollImport.state || "Karnataka"}\n`;
      context += `Assembly constituency number: ${latestRollImport.assembly_constituency_number ?? "unverified"}\n`;
      context += `Roll year/revision: ${latestRollImport.roll_year ?? "unknown"}/${latestRollImport.roll_revision ?? "unknown"}\n`;
      context += `Polling parts represented: ${parts.join(", ") || "none verified"}\n`;
      context += `Source PDFs: ${latestRollImport.source_pdf_count ?? 0} (${latestRollImport.unique_source_pdf_count ?? 0} unique)\n`;
      context += `Printed expected aggregate: ${aggregate.totalExpectedElectors ?? latestRollImport.expected_records ?? "unknown"}\n`;
      context += `Extracted aggregate: ${aggregate.totalExtractedRecords ?? latestRollImport.extracted_records ?? 0}\n`;
      context += incomplete
        ? "Coverage is INCOMPLETE or not validated. Do not treat missing or unprocessed records as elector absence.\n"
        : "Coverage passed the configured batch validation gates; this summary contains aggregate data only.\n";
    }

    // Always provide some basic stats
    if (!context) {
      const boothCount = await db.collection("booths").countDocuments();
      const complaintCount = await db.collection("complaints").countDocuments();
      context += `\n\n[PLATFORM DATA SUMMARY]\nTotal Polling Booths in database: ${boothCount}\nTotal Complaints tracked: ${complaintCount}\nStates covered: 15\n`;
    }
  } catch (error) {
    console.error("Data context fetch error:", error.message);
    context += "\n\n[Note: Database is currently unavailable. Answering from general knowledge.]\n";
  }

  return context;
}

export async function POST(req) {
  const ip = getClientIp(req);
  const limitResult = rateLimit({ key: `chat:${ip}`, limit: 20, windowMs: 60 * 1000 });
  if (!limitResult.allowed) {
    return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let messages;
  try {
    ({ messages } = await req.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
    return Response.json({ error: "Invalid conversation history" }, { status: 400 });
  }

  const validMessages = messages.every((message) =>
    message
    && (message.role === "user" || message.role === "assistant")
    && Array.isArray(message.parts)
    && message.parts.every((part) =>
      part?.type === "text"
      && typeof part.text === "string"
      && part.text.length <= 1000
    )
  );
  if (!validMessages) {
    return Response.json({ error: "Messages must contain text parts of at most 1000 characters." }, { status: 400 });
  }

  const lastMessage = messages[messages.length - 1];
  const userText = lastMessage.parts.map((part) => part.text).join(" ").trim();
  if (lastMessage.role !== "user" || userText.length === 0) {
    return Response.json({ error: "Invalid message" }, { status: 400 });
  }

  // Detect data intent from conversation
  const intents = detectDataIntent(messages);

  // Fetch relevant data context
  const dataContext = await getDataContext(intents);

  // Build enhanced system prompt with data context
  const dataRules = dataContext
    ? "\n\nDATA ANSWERING RULES:\n- State the database collection or dataset that supports each data-backed answer, including its year or revision when available.\n- If the requested fact is not present in the supplied context, say: \"I don't have that data.\" Do not estimate or invent counts, turnout, or other figures.\n"
    : "";

  try {
    const result = await streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: `${BASE_SYSTEM_PROMPT}${dataContext}${dataRules}`,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch {
    return Response.json(
      { error: "The election assistant is temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}
