/**
 * Chunav-Saathi Database Seed Script
 * Run with: node --experimental-modules src/lib/seed.js
 * Or via the API: POST /api/seed
 */
import { getDb } from "./mongodb.js";
import { hashPassword } from "./auth.js";

// ── Indian States & Districts ────────────────────────────────────────────
const STATES_DATA = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Kurnool"],
  "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal"],
  "Karnataka": ["Bengaluru Urban", "Mysuru", "Mangaluru", "Hubli-Dharwad", "Belagavi"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  "Telangana": ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam"],
  "Uttar Pradesh": ["Lucknow", "Varanasi", "Agra", "Kanpur", "Prayagraj"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur", "Asansol"],
};

const CONSTITUENCIES = [
  "Central", "North", "South", "East", "West",
  "Rural", "Urban", "Cantonment", "Sadar", "Town",
];

const BOOTH_NAMES = [
  "Government Primary School", "Community Hall", "Town Hall",
  "Government High School", "Panchayat Bhawan", "Government College",
  "Municipal Office", "Anganwadi Centre", "Community Centre",
  "Government Hospital Complex", "Public Library Hall", "District Court Complex",
];

const COMPLAINT_CATEGORIES = [
  "Booth Accessibility", "Booth Distance", "Staff Behavior",
  "EVM Malfunction", "Queue Management", "Voter ID Issues",
  "Misinformation", "Infrastructure", "Transportation", "Other",
];

const COMPLAINT_STATUSES = ["Pending", "In Progress", "Resolved", "Rejected"];
const PRIORITIES = ["Low", "Medium", "High"];

// ── Helper functions ─────────────────────────────────────────────────────
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateEpicNumber(stateCode) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const prefix = stateCode.substring(0, 3).toUpperCase();
  const num = String(randomInt(1000000, 9999999));
  return `${prefix}${randomPick([...letters])}${num}`;
}

// ── Generate Polling Booths ──────────────────────────────────────────────
function generateBooths() {
  const booths = [];
  let id = 1;

  for (const [state, districts] of Object.entries(STATES_DATA)) {
    for (const district of districts) {
      const boothCount = randomInt(5, 12);
      for (let i = 0; i < boothCount; i++) {
        const constituency = `${district} ${randomPick(CONSTITUENCIES)}`;
        booths.push({
          boothId: `BOOTH-${String(id).padStart(5, "0")}`,
          boothNumber: randomInt(1, 300),
          name: `${randomPick(BOOTH_NAMES)}, Ward ${randomInt(1, 50)}`,
          state,
          district,
          constituency,
          pincode: String(randomInt(100000, 999999)),
          address: `${randomInt(1, 500)}, Main Road, ${district}, ${state}`,
          latitude: 8.0 + Math.random() * 29.0,
          longitude: 68.0 + Math.random() * 29.0,
          capacity: randomInt(500, 2500),
          isAccessible: Math.random() > 0.2,
          hasRamp: Math.random() > 0.3,
          hasToilet: Math.random() > 0.15,
          hasDrinkingWater: Math.random() > 0.2,
          hasElectricity: Math.random() > 0.05,
          electionPhase: randomInt(1, 7),
          pollingDate: randomDate(new Date("2024-04-19"), new Date("2024-06-01")),
          status: randomPick(["Active", "Active", "Active", "Under Maintenance", "Relocated"]),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        id++;
      }
    }
  }
  return booths;
}

// ── Generate Complaints ──────────────────────────────────────────────────
function generateComplaints(users, booths) {
  const complaints = [];
  const subjects = [
    "Polling booth too far from residence",
    "No wheelchair ramp at booth",
    "Long queue with no shade",
    "EVM not working properly",
    "Staff refused to provide voter slip",
    "Booth location changed without notice",
    "No drinking water facility available",
    "Incorrect voter list at booth",
    "Booth not accessible for elderly",
    "Misleading signage near booth",
    "Overcrowded booth conditions",
    "No proper lighting at booth",
    "Staff not following protocol",
    "Transportation issue to reach booth",
    "Voter ID name mismatch",
    "Booth infrastructure in poor condition",
    "No separate queue for women",
    "EVM seal appeared tampered",
    "Booth opened late on polling day",
    "No toilet facility available",
  ];

  const descriptions = [
    "The polling booth assigned to me is more than 5 km from my residence. Elderly voters and those without personal transport face significant difficulty. Request relocation or arrangement of transport.",
    "The booth at the government school does not have a wheelchair ramp. This makes it impossible for disabled voters to access the polling station independently.",
    "During the last election, voters had to wait for over 3 hours in the sun. There is no shade or seating arrangement near the booth.",
    "The EVM machine at booth number displayed error messages multiple times. Several voters could not cast their votes due to this malfunction.",
    "The booth staff was rude and refused to provide voter slips to multiple voters. They were not following the proper verification protocol.",
    "The booth location was changed just 2 days before polling. Many voters went to the old location and were unable to vote on time.",
    "No drinking water facility is available at or near the booth. Voters, especially children and elderly accompanying them, face extreme discomfort.",
    "My name is listed incorrectly on the voter roll at the booth. Despite applying for correction months ago, it has not been updated.",
    "The booth is on the second floor with no elevator. Elderly voters and those with mobility issues cannot reach the polling room.",
    "There are misleading political banners and signs near the booth premises, violating the model code of conduct.",
  ];

  for (let i = 0; i < 200; i++) {
    const user = randomPick(users);
    const booth = randomPick(booths);
    const status = randomPick(COMPLAINT_STATUSES);
    const createdAt = randomDate(new Date("2024-01-01"), new Date("2024-09-01"));

    complaints.push({
      complaintId: `CMP-${String(i + 1).padStart(5, "0")}`,
      userId: user._id || user.odId,
      userName: user.name,
      userPhone: user.phone,
      category: randomPick(COMPLAINT_CATEGORIES),
      subject: randomPick(subjects),
      description: randomPick(descriptions),
      state: booth.state,
      district: booth.district,
      constituency: booth.constituency,
      boothId: booth.boothId,
      boothName: booth.name,
      priority: randomPick(PRIORITIES),
      status,
      adminNotes: status === "Resolved" ? "Issue has been addressed and resolved." : status === "Rejected" ? "Complaint found to be outside jurisdiction." : "",
      resolvedAt: status === "Resolved" ? randomDate(createdAt, new Date("2024-09-05")) : null,
      createdAt,
      updatedAt: randomDate(createdAt, new Date("2024-09-05")),
    });
  }
  return complaints;
}

// ── Generate Users ───────────────────────────────────────────────────────
async function generateUsers() {
  const defaultPassword = await hashPassword("citizen123");
  const adminPassword = await hashPassword("admin123");

  const names = [
    "Aarav Sharma", "Priya Patel", "Vikram Singh", "Ananya Reddy",
    "Rahul Kumar", "Sneha Gupta", "Arjun Nair", "Kavitha Menon",
    "Rohan Das", "Meera Joshi", "Aditya Rao", "Divya Iyer",
    "Sanjay Tiwari", "Pooja Verma", "Karthik Suresh", "Nandini Hegde",
    "Amit Mishra", "Lakshmi Pillai", "Rajesh Kulkarni", "Swati Deshmukh",
  ];

  const users = [];

  // Admin user
  users.push({
    odId: "admin-001",
    name: "Admin ECI",
    phone: "9999900000",
    email: "admin@chunavsaathi.in",
    password: adminPassword,
    role: "admin",
    state: "Delhi",
    district: "New Delhi",
    constituency: "New Delhi Central",
    epicNumber: "DLX0000001",
    isVerified: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  });

  // Citizen users
  const states = Object.keys(STATES_DATA);
  for (let i = 0; i < names.length; i++) {
    const state = states[i % states.length];
    const district = randomPick(STATES_DATA[state]);
    users.push({
      odId: `citizen-${String(i + 1).padStart(3, "0")}`,
      name: names[i],
      phone: `98${String(randomInt(10000000, 99999999))}`,
      email: `${names[i].split(" ")[0].toLowerCase()}@example.com`,
      password: defaultPassword,
      role: "citizen",
      state,
      district,
      constituency: `${district} ${randomPick(CONSTITUENCIES)}`,
      epicNumber: generateEpicNumber(state),
      isVerified: true,
      createdAt: randomDate(new Date("2024-01-01"), new Date("2024-06-01")),
      updatedAt: new Date(),
    });
  }

  return users;
}

// ── Election Results Data ────────────────────────────────────────────────
function generateElectionData() {
  const elections = [];
  const parties = [
    { name: "Bharatiya Janata Party", short: "BJP", color: "#FF9933" },
    { name: "Indian National Congress", short: "INC", color: "#00BFFF" },
    { name: "Aam Aadmi Party", short: "AAP", color: "#0066CC" },
    { name: "All India Trinamool Congress", short: "AITC", color: "#20C020" },
    { name: "Dravida Munnetra Kazhagam", short: "DMK", color: "#FF0000" },
    { name: "Others", short: "OTH", color: "#888888" },
  ];

  for (const [state, districts] of Object.entries(STATES_DATA)) {
    const totalVoters = randomInt(800000, 5000000);
    const turnout = 55 + Math.random() * 25;
    const votesPolled = Math.floor(totalVoters * (turnout / 100));

    let remainingVotes = votesPolled;
    const partyResults = parties.map((party, idx) => {
      const isLast = idx === parties.length - 1;
      const votes = isLast ? remainingVotes : Math.floor(remainingVotes * (0.1 + Math.random() * 0.35));
      remainingVotes -= votes;
      if (remainingVotes < 0) remainingVotes = 0;
      return {
        ...party,
        votes,
        percentage: ((votes / votesPolled) * 100).toFixed(1),
        seatsWon: randomInt(0, 15),
      };
    });

    elections.push({
      state,
      electionType: "Lok Sabha 2024",
      totalConstituencies: districts.length * 2,
      totalVoters,
      votesPolled,
      turnoutPercentage: turnout.toFixed(1),
      totalBooths: randomInt(2000, 15000),
      phases: randomInt(1, 7),
      pollingDate: randomDate(new Date("2024-04-19"), new Date("2024-06-01")),
      results: partyResults.sort((a, b) => b.votes - a.votes),
      createdAt: new Date(),
    });
  }

  return elections;
}

// ── Main Seed Function ───────────────────────────────────────────────────
export async function seedDatabase() {
  const db = await getDb();

  console.log("🌱 Seeding Chunav-Saathi database...\n");

  // Clear existing data
  await db.collection("users").deleteMany({});
  await db.collection("booths").deleteMany({});
  await db.collection("complaints").deleteMany({});
  await db.collection("elections").deleteMany({});

  // 1. Users
  console.log("👤 Creating users...");
  const users = await generateUsers();
  await db.collection("users").insertMany(users);
  console.log(`   ✓ ${users.length} users created`);

  // 2. Booths
  console.log("🏛️  Creating polling booths...");
  const booths = generateBooths();
  await db.collection("booths").insertMany(booths);
  console.log(`   ✓ ${booths.length} booths created`);

  // 3. Complaints
  console.log("📝 Creating complaints...");
  const complaints = generateComplaints(users, booths);
  await db.collection("complaints").insertMany(complaints);
  console.log(`   ✓ ${complaints.length} complaints created`);

  // 4. Election data
  console.log("🗳️  Creating election data...");
  const elections = generateElectionData();
  await db.collection("elections").insertMany(elections);
  console.log(`   ✓ ${elections.length} state records created`);

  // 5. Create indexes
  console.log("📇 Creating indexes...");
  await db.collection("users").createIndex({ phone: 1 }, { unique: true });
  await db.collection("users").createIndex({ epicNumber: 1 });
  await db.collection("users").createIndex({ role: 1 });
  await db.collection("booths").createIndex({ state: 1, district: 1 });
  await db.collection("booths").createIndex({ constituency: 1 });
  await db.collection("booths").createIndex({ boothId: 1 }, { unique: true });
  await db.collection("complaints").createIndex({ userId: 1 });
  await db.collection("complaints").createIndex({ status: 1 });
  await db.collection("complaints").createIndex({ state: 1 });
  await db.collection("complaints").createIndex({ category: 1 });
  await db.collection("complaints").createIndex({ createdAt: -1 });
  await db.collection("elections").createIndex({ state: 1 });
  console.log("   ✓ Indexes created\n");

  console.log("✅ Database seeded successfully!");
  console.log(`   Admin login: phone=9999900000, password=admin123`);
  console.log(`   Citizen login: phone=(see any user), password=citizen123`);

  return {
    users: users.length,
    booths: booths.length,
    complaints: complaints.length,
    elections: elections.length,
  };
}
