// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../api/recommend";
import { aiPayload, allocationCandidates } from "./ai";
import { request } from "../test/fixtures";

function response() {
  const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}
let ip = 0;
function input() {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "lablink.vercel.app",
      origin: "https://lablink.vercel.app",
      "x-real-ip": `test-${ip++}`,
    },
    body: aiPayload({ version: 1, requests: [request()] }),
  };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Gemini API", () => {
  it("rejects unsupported methods, origins, content types, oversized and invalid inputs", async () => {
    for (const [req, status] of [
      [{ ...input(), method: "GET" }, 405],
      [
        {
          ...input(),
          headers: { ...input().headers, origin: "https://evil.example" },
        },
        403,
      ],
      [
        {
          ...input(),
          headers: { ...input().headers, "content-type": "text/plain" },
        },
        415,
      ],
      [{ ...input(), body: "x".repeat(65000) }, 413],
      [{ ...input(), body: "invalid json" }, 400],
      [{ ...input(), body: {} }, 400],
    ] as const) {
      const res = response();
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(status);
    }
  });
  it("fails gracefully without a key, without calling Google", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const res = response();
    await handler(input(), res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("calls Google with a server-only header and validates the returned plan", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-server-only-secret");
    const req = input();
    const recommendations = allocationCandidates(req.body).map((c) => ({
      requestId: c.requestId,
      equipmentId: c.equipmentId,
      slot: c.slots[0] ?? null,
      reason: "This equipment slot fits the project deadline and capacity.",
    }));
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ recommendations }) }],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const res = response();
    await handler(req, res);
    expect(fetcher.mock.calls[0][0]).toMatch(
      /^https:\/\/generativelanguage.googleapis.com\/v1beta\/models\/gemini-/,
    );
    const options = fetcher.mock.calls[0][1];
    expect(options.headers["x-goog-api-key"]).toBe("test-server-only-secret");
    expect(options.body).not.toContain("test-server-only-secret");
    expect(options.body).not.toContain("Alex Demo");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "Google Gemini",
        feasibilityValidated: true,
      }),
    );
    expect(JSON.stringify(res.json.mock.calls)).not.toContain(
      "test-server-only-secret",
    );
  });
  it("rejects hallucinated or incomplete output without mutating bookings", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: '{"recommendations":[]}' }] } },
            ],
          }),
        ),
      ),
    );
    const req = input();
    const before = JSON.stringify(req.body);
    const res = response();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(JSON.stringify(req.body)).toBe(before);
  });
  it("contains provider errors and timeouts instead of exposing response details", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    for (const provider of [
      vi
        .fn()
        .mockResolvedValue(
          new Response("sensitive provider details", { status: 500 }),
        ),
      vi.fn().mockRejectedValue(new DOMException("Timeout", "AbortError")),
    ]) {
      vi.stubGlobal("fetch", provider);
      const res = response();
      await handler(input(), res);
      expect(res.status).toHaveBeenCalledWith(502);
      expect(JSON.stringify(res.json.mock.calls)).not.toContain("sensitive");
    }
  });
  it("reports provider quota failures without exposing provider response details", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("sensitive quota details", { status: 429 }),
        ),
    );
    const res = response();
    await handler(input(), res);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(JSON.stringify(res.json.mock.calls)).toContain(
      "quota or rate limit",
    );
    expect(JSON.stringify(res.json.mock.calls)).not.toContain(
      "sensitive quota details",
    );
  });
  it("limits repeated requests within one warm function instance", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unavailable")));
    const req = input();
    for (let i = 0; i < 5; i++) await handler(req, response());
    const res = response();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "60");
  });
});
