import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FOLDER_ID, SERVICE_ACCOUNT, installFakes, stubConfiguredEnv } from "./helpers/fakes";

// google-auth-library fetches its token through its own HTTP client, so it is
// mocked at the boundary: a fake JWT client that records how it was built.
const jwt = vi.hoisted(() => ({ built: [] as Record<string, unknown>[], fail: false }));
vi.mock("google-auth-library", () => ({
  JWT: class {
    constructor(opts: Record<string, unknown>) {
      jwt.built.push(opts);
    }
    async getAccessToken() {
      if (jwt.fail) throw new Error("invalid_grant: account not found");
      return { token: "test-access-token" };
    }
  },
}));

const pdf = new TextEncoder().encode("%PDF-1.4 fake report");

describe("saveReportPdfToDrive", () => {
  let fakes: ReturnType<typeof installFakes>;

  beforeEach(() => {
    vi.resetModules();
    jwt.built.length = 0;
    jwt.fail = false;
    fakes = installFakes();
    stubConfiguredEnv();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    // Contributor can't delete: nothing here may ever try.
    expect(fakes.driveRequests.filter((r) => r.method === "DELETE")).toHaveLength(0);
  });

  const load = () => import("@/lib/google-drive");

  it.each([
    ["neither variable", "", ""],
    ["only the key", JSON.stringify(SERVICE_ACCOUNT), ""],
    ["only the folder", "", FOLDER_ID],
    ["whitespace", "   ", "  "],
  ])("skips without a sound when %s is set", async (_label, json, folder) => {
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_JSON", json);
    vi.stubEnv("GDRIVE_ASSESSMENT_FOLDER_ID", folder);
    const { saveReportPdfToDrive, isDriveConfigured } = await load();
    expect(isDriveConfigured()).toBe(false);
    expect(await saveReportPdfToDrive({ pdf, filename: "x.pdf" })).toEqual({ status: "skipped" });
    expect(fakes.driveRequests).toHaveLength(0);
    expect(jwt.built).toHaveLength(0);
  });

  it("creates the file in the folder, in a shared drive, named as given", async () => {
    const { saveReportPdfToDrive } = await load();
    const result = await saveReportPdfToDrive({ pdf, filename: "TEST-Drive-2026-10-10-abc123.pdf" });

    expect(result).toEqual({ status: "ok", fileId: "drive-file-1", created: true });
    expect(fakes.driveRequests).toHaveLength(1);
    const [req] = fakes.driveRequests;
    expect(req.method).toBe("POST");
    expect(req.url.pathname).toBe("/upload/drive/v3/files");
    expect(req.url.searchParams.get("supportsAllDrives")).toBe("true");
    expect(req.url.searchParams.get("uploadType")).toBe("multipart");
    expect(req.metadata).toEqual({
      name: "TEST-Drive-2026-10-10-abc123.pdf",
      parents: [FOLDER_ID],
      mimeType: "application/pdf",
    });
    expect(req.pdf).toBe("%PDF-1.4 fake report");
    expect(req.authorization).toBe("Bearer test-access-token");
  });

  it("authenticates as the service account with the Drive scope, fixing escaped newlines in the key", async () => {
    const { saveReportPdfToDrive } = await load();
    await saveReportPdfToDrive({ pdf, filename: "a.pdf" });
    expect(jwt.built).toEqual([
      {
        email: SERVICE_ACCOUNT.client_email,
        key: "-----BEGIN PRIVATE KEY-----\nFAKEKEY\n-----END PRIVATE KEY-----\n",
        scopes: ["https://www.googleapis.com/auth/drive"],
      },
    ]);
  });

  it("with a file ID, updates that file in place — PATCH, same ID, no new file", async () => {
    const { saveReportPdfToDrive } = await load();
    const result = await saveReportPdfToDrive({ pdf, filename: "renamed.pdf", fileId: "existing-42" });

    expect(result).toEqual({ status: "ok", fileId: "existing-42", created: false });
    expect(fakes.driveRequests).toHaveLength(1);
    const [req] = fakes.driveRequests;
    expect(req.method).toBe("PATCH");
    expect(req.url.pathname).toBe("/upload/drive/v3/files/existing-42");
    expect(req.url.searchParams.get("supportsAllDrives")).toBe("true");
    expect(req.metadata).toEqual({ name: "renamed.pdf" }); // no parents on an update
    expect(req.pdf).toBe("%PDF-1.4 fake report");
  });

  it("re-creates the file when the stored one is gone (404)", async () => {
    fakes.drive.respond = (req) =>
      req.method === "PATCH"
        ? Response.json({ error: { code: 404, message: "File not found" } }, { status: 404 })
        : Response.json({ id: "replacement-7" });
    const { saveReportPdfToDrive } = await load();
    const result = await saveReportPdfToDrive({ pdf, filename: "a.pdf", fileId: "vanished-1" });

    expect(result).toEqual({ status: "ok", fileId: "replacement-7", created: true });
    expect(fakes.driveRequests.map((r) => r.method)).toEqual(["PATCH", "POST"]);
    expect(fakes.driveRequests.every((r) => r.url.searchParams.get("supportsAllDrives") === "true")).toBe(true);
  });

  it("does NOT create a second file when an update fails for another reason", async () => {
    fakes.drive.respond = () =>
      Response.json({ error: { code: 403, message: "insufficientFilePermissions" } }, { status: 403 });
    const { saveReportPdfToDrive } = await load();
    const result = await saveReportPdfToDrive({ pdf, filename: "a.pdf", fileId: "locked-1" });

    expect(result.status).toBe("failed");
    expect(result.status === "failed" && result.error).toMatch(/PATCH 403/);
    expect(fakes.driveRequests.map((r) => r.method)).toEqual(["PATCH"]);
  });

  it("returns a failure instead of throwing — HTTP error, network error, bad token, bad key", async () => {
    const { saveReportPdfToDrive } = await load();

    fakes.drive.respond = () => new Response("backend error", { status: 500 });
    expect(await saveReportPdfToDrive({ pdf, filename: "a.pdf" })).toMatchObject({ status: "failed" });

    fakes.drive.respond = () => {
      throw new TypeError("fetch failed");
    };
    expect(await saveReportPdfToDrive({ pdf, filename: "a.pdf" })).toEqual({
      status: "failed",
      error: "fetch failed",
    });

    jwt.fail = true;
    expect(await saveReportPdfToDrive({ pdf, filename: "a.pdf" })).toMatchObject({
      status: "failed",
      error: expect.stringMatching(/invalid_grant/),
    });
  });

  it.each([
    [
      "the downloaded key file, pretty-printed, pasted as-is",
      JSON.stringify({ ...SERVICE_ACCOUNT, private_key: "-----BEGIN PRIVATE KEY-----\nFAKEKEY\n-----END PRIVATE KEY-----\n" }, null, 2),
    ],
    [
      "the same file after a paste turned the key's \\n escapes into real line breaks",
      JSON.stringify({ ...SERVICE_ACCOUNT, private_key: "@@KEY@@" }, null, 2).replace(
        '"@@KEY@@"',
        '"-----BEGIN PRIVATE KEY-----\nFAKEKEY\n-----END PRIVATE KEY-----\n"'
      ),
    ],
    [
      "a one-line paste with real line breaks in the key (as an .env parser delivers it)",
      '{"type":"service_account","client_email":"' +
        SERVICE_ACCOUNT.client_email +
        '","private_key":"-----BEGIN PRIVATE KEY-----\r\nFAKEKEY\r\n-----END PRIVATE KEY-----\r\n"}',
    ],
  ])("accepts %s", async (_label, raw) => {
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_JSON", raw);
    const { saveReportPdfToDrive } = await load();
    expect(await saveReportPdfToDrive({ pdf, filename: "a.pdf" })).toMatchObject({ status: "ok" });
    expect(jwt.built[0]).toMatchObject({
      email: SERVICE_ACCOUNT.client_email,
      key: "-----BEGIN PRIVATE KEY-----\nFAKEKEY\n-----END PRIVATE KEY-----\n",
    });
  });

  it("reports a malformed key file without calling Google", async () => {
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_JSON", "{not json");
    const { saveReportPdfToDrive } = await load();
    const result = await saveReportPdfToDrive({ pdf, filename: "a.pdf" });
    expect(result).toMatchObject({ status: "failed", error: expect.stringMatching(/not valid JSON/) });
    expect(fakes.driveRequests).toHaveLength(0);
    expect(jwt.built).toHaveLength(0);
  });
});
