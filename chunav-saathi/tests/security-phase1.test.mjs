import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";

const buildRequest = (url, headers = {}) => new Request(new URL(url, "http://localhost"), { headers });

test("unauthenticated complaints list returns 401", async () => {
  const mongodb = await import("../src/lib/mongodb.js");
  const auth = await import("../src/lib/auth.js");
  const route = await import("../src/app/api/complaints/route.js");

  mock.method(auth.authService, "getUserFromRequest", () => null);
  mock.method(mongodb.database, "getDb", async () => ({ collection: () => ({}) }));

  const res = await route.GET(buildRequest("http://localhost/api/complaints"));
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error, "Authentication required. Please login.");
});

test("complaint creation uses the returned atomic counter document", async () => {
  const mongodb = await import("../src/lib/mongodb.js");
  const auth = await import("../src/lib/auth.js");
  const route = await import("../src/app/api/complaints/route.js");
  let insertedComplaint;

  mock.method(auth.authService, "getUserFromRequest", () => ({
    userId: "user-1",
    role: "citizen",
    name: "Test Citizen",
    phone: "9000000000",
  }));
  mock.method(mongodb.database, "getDb", async () => ({
    collection: (name) => {
      if (name === "complaints") {
        return {
          createIndex: async () => {},
          insertOne: async (complaint) => {
            insertedComplaint = complaint;
            return { insertedId: "complaint-object-id" };
          },
        };
      }
      if (name === "counters") {
        return {
          findOneAndUpdate: async () => ({ _id: "complaintId", value: 42 }),
        };
      }
      return { findOne: async () => null };
    },
  }));

  const res = await route.POST(new Request("http://localhost/api/complaints", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "Other",
      subject: "A sufficiently long subject",
      description: "This complaint description is long enough to pass validation.",
      state: "Karnataka",
      district: "Belthangady",
      priority: "Medium",
    }),
  }));

  assert.equal(res.status, 201);
  assert.equal(insertedComplaint.complaintId, "CMP-00042");
});

test("a non-owner cannot read someone else's complaint", async () => {
  const mongodb = await import("../src/lib/mongodb.js");
  const auth = await import("../src/lib/auth.js");
  const route = await import("../src/app/api/complaints/[id]/route.js");

  mock.method(auth.authService, "getUserFromRequest", () => ({ userId: "owner-2", role: "citizen" }));
  mock.method(mongodb.database, "getDb", async () => ({
    collection: () => ({
      findOne: async () => ({ complaintId: "CMP-00001", userId: "owner-1" }),
    }),
  }));

  const res = await route.GET(
    buildRequest("http://localhost/api/complaints/CMP-00001"),
    { params: Promise.resolve({ id: "CMP-00001" }) }
  );
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error, "You are not allowed to view this complaint.");
});

test("analytics response for non-admins has no phone or userId fields", async () => {
  const mongodb = await import("../src/lib/mongodb.js");
  const auth = await import("../src/lib/auth.js");
  const route = await import("../src/app/api/analytics/route.js");

  mock.method(auth.authService, "getUserFromRequest", () => ({ userId: "u-1", role: "citizen" }));
  mock.method(mongodb.database, "getDb", async () => ({
    collection: (name) => {
      if (name === "complaints") {
        return {
          countDocuments: async () => 2,
          aggregate: () => ({ toArray: async () => [{ _id: "Pending", count: 2 }] }),
          find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [{ userPhone: "9999999999", userId: "u-1", status: "Pending" }] }) }) }),
          distinct: async () => ["Pending"],
        };
      }
      return {
        aggregate: () => ({ toArray: async () => [{ totalBooths: 5, accessibleBooths: 4, avgCapacity: 100 }] }),
        find: () => ({ toArray: async () => [] }),
      };
    },
  }));

  const res = await route.GET(buildRequest("http://localhost/api/analytics"));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.recentComplaints, undefined);
  assert.equal(data.topUsers, undefined);
  assert.equal(JSON.stringify(data).includes("userId"), false);
  assert.equal(JSON.stringify(data).includes("phone"), false);
});

test("login errors are identical for unknown phone and wrong password", async () => {
  const auth = await import("../src/lib/auth.js");
  const route = await import("../src/app/api/auth/login/route.js");
  const mongodb = await import("../src/lib/mongodb.js");

  mock.method(mongodb.database, "getDb", async () => ({
    collection: () => ({
      findOne: async (query) => query.phone === "9999900000" ? { password: "hashedpw" } : null,
    }),
  }));
  mock.method(auth.authService, "verifyPassword", async () => false);

  const res1 = await route.POST(new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "9999999999", password: "secret" }),
  }));
  const res2 = await route.POST(new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "9999900000", password: "wrong" }),
  }));

  assert.equal(res1.status, 401);
  assert.equal(res2.status, 401);
  assert.equal((await res1.json()).error, "Invalid phone number or password");
  assert.equal((await res2.json()).error, "Invalid phone number or password");
});

test("missing JWT_SECRET throws at startup outside tests", async () => {
  const oldValue = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  process.env.NODE_ENV = "development";
  try {
    const mod = await import(new URL("../src/lib/auth.js?missingsecret=" + Date.now(), import.meta.url).href);
    assert.fail("Expected import to throw");
  } catch (error) {
    assert.match(String(error), /JWT_SECRET/i);
  } finally {
    if (oldValue) process.env.JWT_SECRET = oldValue;
    process.env.NODE_ENV = "test";
  }
});
