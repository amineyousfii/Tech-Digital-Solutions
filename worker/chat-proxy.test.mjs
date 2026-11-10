// Tests for the chat proxy. Gemini is mocked: no network, no real key.
// Run from the repository root: node --test worker/
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker, { rateLimitKey } from "./chat-proxy.js";

const ORIGIN = "https://amineyousfii.github.io";
const allow = { limit: async () => ({ success: true }) };
const deny = { limit: async () => ({ success: false }) };
const baseEnv = { GEMINI_API_KEY: "test-key-not-real", RATE_LIMITER: allow, GLOBAL_RATE_LIMITER: allow };

const geminiReply = (text) => new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }] }));

let lastCall;
let respond;
beforeEach(() => {
  lastCall = null;
  respond = () => geminiReply("We build websites from 299€.");
  globalThis.fetch = async (url, init) => {
    lastCall = { url, init, body: JSON.parse(init.body) };
    return respond(init);
  };
});

const call = (body, { origin = ORIGIN, method = "POST", headers = {}, env = baseEnv } = {}) =>
  worker.fetch(new Request("https://tds-chat.example.workers.dev/", {
    method,
    headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: method === "POST" ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  }), env);

test("preflight from the site origin returns 204 with CORS", async () => {
  const r = await call(null, { method: "OPTIONS" });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), ORIGIN);
});

test("other origins get 403 and no CORS header", async () => {
  const r = await call({ message: "hi" }, { origin: "https://evil.example" });
  assert.equal(r.status, 403);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), null);
  assert.equal(lastCall, null);
});

test("GET is rejected with 405", async () => {
  assert.equal((await call(null, { method: "GET" })).status, 405);
});

test("missing API key secret returns 500 without calling Gemini", async () => {
  const r = await call({ message: "hi" }, { env: { ...baseEnv, GEMINI_API_KEY: undefined } });
  assert.equal(r.status, 500);
  assert.equal(lastCall, null);
});

test("missing rate limiter bindings fail closed", async () => {
  assert.equal((await call({ message: "hi" }, { env: { ...baseEnv, RATE_LIMITER: undefined } })).status, 500);
  assert.equal((await call({ message: "hi" }, { env: { ...baseEnv, GLOBAL_RATE_LIMITER: undefined } })).status, 500);
  assert.equal(lastCall, null);
});

test("per-visitor and site-wide limits return 429", async () => {
  assert.equal((await call({ message: "hi" }, { env: { ...baseEnv, RATE_LIMITER: deny } })).status, 429);
  assert.equal((await call({ message: "hi" }, { env: { ...baseEnv, GLOBAL_RATE_LIMITER: deny } })).status, 429);
  assert.equal(lastCall, null);
});

test("IPv6 visitors are rate limited per /64", () => {
  assert.equal(rateLimitKey("2001:db8:abcd:12:1::5"), "2001:0db8:abcd:0012::/64");
  assert.equal(rateLimitKey("2001:db8:abcd:12:ffff:ffff:ffff:ffff"), "2001:0db8:abcd:0012::/64");
  assert.equal(rateLimitKey("203.0.113.7"), "203.0.113.7");
  assert.equal(rateLimitKey("::ffff:203.0.113.7"), "203.0.113.7");
});

test("a valid message returns the model reply", async () => {
  const r = await call({ message: "How much is a website?" });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { reply: "We build websites from 299€." });
});

test("the key goes in a header, never the URL", async () => {
  await call({ message: "hi" });
  assert.equal(lastCall.init.headers["x-goog-api-key"], "test-key-not-real");
  assert.ok(!lastCall.url.includes("key="));
});

test("the request carries the system prompt, an output cap and a timeout", async () => {
  await call({ message: "hi" });
  assert.ok(lastCall.body.system_instruction.parts[0].text.includes("299€"));
  assert.equal(lastCall.body.generationConfig.maxOutputTokens, 1024);
  assert.ok(lastCall.init.signal instanceof AbortSignal);
});

test("history is capped at 10 turns and empty turns are dropped", async () => {
  const history = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "model" : "user", text: `t${i}` }));
  await call({ message: "next", history });
  assert.equal(lastCall.body.contents.length, 11);
  await call({ message: "next", history: [{ role: "user", text: "a" }, { role: "model", text: "  " }] });
  assert.deepEqual(lastCall.body.contents.map((c) => c.role), ["user", "user"]);
});

test("invalid bodies get 400", async () => {
  assert.equal((await call("not json")).status, 400);
  assert.equal((await call("null")).status, 400);
  assert.equal((await call("[]")).status, 400);
  assert.equal((await call({ message: "   " })).status, 400);
  assert.equal(lastCall, null);
});

test("attachments must be a supported image type", async () => {
  const r = await call({ message: "see", file: { mime_type: "image/gif", data: "R0lG" } });
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /PNG, JPEG, WebP or HEIC/);
  assert.equal((await call({ message: "see", file: { mime_type: "image/png", data: "iVBORw0KGgo=" } })).status, 200);
  assert.equal(lastCall.body.contents.at(-1).parts[1].inline_data.mime_type, "image/png");
});

test("oversized bodies get 413, declared or streamed", async () => {
  assert.equal((await call("{}", { headers: { "Content-Length": String(7 * 1024 * 1024) } })).status, 413);
  assert.equal((await call(JSON.stringify({ message: "x", pad: "a".repeat(6 * 1024 * 1024 + 10) }))).status, 413);
  assert.equal(lastCall, null);
});

test("Gemini errors become a generic 502 with no upstream detail", async () => {
  respond = () => new Response(JSON.stringify({ error: { message: "API key not valid" } }), { status: 400 });
  const r = await call({ message: "hi" });
  assert.equal(r.status, 502);
  assert.ok(!(await r.text()).includes("API key"));
});

test("an upstream timeout becomes 504", async () => {
  respond = () => { const e = new Error("timed out"); e.name = "TimeoutError"; throw e; };
  assert.equal((await call({ message: "hi" })).status, 504);
});

test("a blocked answer returns a polite fallback", async () => {
  respond = () => new Response(JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } }));
  const r = await call({ message: "hi" });
  assert.equal(r.status, 200);
  assert.match((await r.json()).reply, /contact form/);
});
