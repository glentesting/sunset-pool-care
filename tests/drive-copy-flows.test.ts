/**
 * The Drive copy through the real submit route and the real regenerate path,
 * with Supabase, Drive and Make faked behind fetch (tests/helpers/fakes.ts).
 *
 * `after()` is captured rather than run, so each test can show the response is
 * complete BEFORE any Drive work happens — the tech and the office never wait
 * on Google — and then run the deferred work and inspect what it did.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAKE_URL, installFakes, samplePayload, stubConfiguredEnv } from "./helpers/fakes";

const deferred = vi.hoisted(() => ({ queue: [] as (() => unknown)[] }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (fn: () => unknown) => {
    deferred.queue.push(fn);
  },
}));
vi.mock("google-auth-library", () => ({
  JWT: class {
    async getAccessToken() {
      return { token: "test-access-token" };
    }
  },
}));
// The real renderer is exercised elsewhere; here the PDF only has to be
// recognisable, so the test can see WHICH version reached Drive.
vi.mock("@/lib/pdf-generator", () => ({
  generateAssessmentPdf: async (_data: unknown, opts?: { revisedOn?: string }) =>
    Buffer.from(opts?.revisedOn ? "%PDF-fake REVISED" : "%PDF-fake ORIGINAL"),
}));

type Archive = { driveFileId?: string; driveCopyFailedAt?: string; overallNotes: string };
type SubmitBody = {
  ok: boolean;
  filename: string;
  pdfBase64: string | null;
  results: { pdf: boolean; supabase: boolean; data: boolean; make: boolean; reportId: string };
};

let fakes: ReturnType<typeof installFakes>;
let errors: ReturnType<typeof vi.spyOn>;

async function runDeferred() {
  const jobs = deferred.queue.splice(0);
  for (const job of jobs) await job();
  return jobs.length;
}

async function submit(): Promise<{ body: SubmitBody; pdfKey: string; jsonKey: string }> {
  const { POST } = await import("@/app/api/submit-assessment/route");
  const res = await POST(
    new Request("http://localhost/api/submit-assessment", {
      method: "POST",
      body: JSON.stringify(samplePayload()),
    }) as never
  );
  const body = (await res.json()) as SubmitBody;
  const pdfKey = [...fakes.bucket.keys()].find((k) => k.endsWith(".pdf") && !k.includes("/"))!;
  return { body, pdfKey, jsonKey: pdfKey.replace(/\.pdf$/, ".json") };
}

async function regenerate(reportId: string, overallNotes: string) {
  const { reviseAndRegenerate, loadReport, revisionStamp } = await import("@/lib/report-revision");
  const loaded = await loadReport(reportId);
  if (loaded.status !== "ok") throw new Error(`report ${reportId} not loadable`);
  return reviseAndRegenerate({
    reportId,
    editor: "TEST OrangeCore",
    fields: { overallNotes },
    loadedAt: revisionStamp(loaded.archive),
  });
}

beforeEach(() => {
  vi.resetModules();
  deferred.queue.length = 0;
  fakes = installFakes();
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  // Contributor can't delete, and replacing must never mean delete + re-create.
  expect(fakes.driveRequests.filter((r) => r.method === "DELETE")).toHaveLength(0);
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("filing a report (the tech's submit)", () => {
  it("answers the tech before touching Drive, then copies the PDF under the storage file name and stores the ID", async () => {
    stubConfiguredEnv();
    const { body, pdfKey, jsonKey } = await submit();

    // The response is complete and nothing has gone to Drive yet.
    expect(body.ok).toBe(true);
    expect(body.pdfBase64).toBeTruthy();
    expect(fakes.driveRequests).toHaveLength(0);
    expect(fakes.json<Archive>(jsonKey).driveFileId).toBeUndefined();

    expect(await runDeferred()).toBe(1);

    expect(fakes.driveRequests).toHaveLength(1);
    const [req] = fakes.driveRequests;
    expect(req.method).toBe("POST");
    expect(req.url.searchParams.get("supportsAllDrives")).toBe("true");
    expect(req.metadata.name).toBe(pdfKey); // same name as the PDF in Supabase storage
    expect(req.pdf).toBe(fakes.text(pdfKey)); // and the same bytes
    expect(req.pdf).toBe("%PDF-fake ORIGINAL");

    const archive = fakes.json<Archive>(jsonKey);
    expect(archive.driveFileId).toBe("drive-file-1");
    expect(archive.driveCopyFailedAt).toBeUndefined();
  });

  it("a Drive failure changes nothing for the tech or Make; it is logged and flagged for the office", async () => {
    stubConfiguredEnv();
    fakes.drive.respond = () => new Response("Drive API has not been used in project", { status: 403 });

    const { body, jsonKey } = await submit();
    expect(body.ok).toBe(true);
    expect(body.results).toMatchObject({ pdf: true, supabase: true, data: true, make: true });
    expect(body.pdfBase64).toBeTruthy();
    expect(fakes.makePosts).toHaveLength(1);

    await runDeferred();

    const archive = fakes.json<Archive>(jsonKey);
    expect(archive.driveFileId).toBeUndefined();
    expect(archive.driveCopyFailedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(errors).toHaveBeenCalledWith(expect.stringMatching(/^Drive copy failed for \w+ .*403/));
  });

  it("a Drive call that hangs up or throws still leaves the submit untouched", async () => {
    stubConfiguredEnv();
    fakes.drive.respond = () => {
      throw new TypeError("fetch failed");
    };
    const { body, jsonKey } = await submit();
    expect(body.ok).toBe(true);
    await expect(runDeferred()).resolves.toBe(1); // the deferred job itself doesn't throw
    expect(fakes.json<Archive>(jsonKey).driveCopyFailedAt).toBeTruthy();
  });

  it("until BOTH variables are set: no Drive work, no log, no change to the stored record", async () => {
    for (const [json, folder] of [
      ["", ""],
      ["{}", ""],
      ["", "folder-123"],
    ]) {
      stubConfiguredEnv({ drive: false });
      vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_JSON", json);
      vi.stubEnv("GDRIVE_ASSESSMENT_FOLDER_ID", folder);
      fakes.bucket.clear();

      const { body, jsonKey } = await submit();
      expect(body.ok).toBe(true);
      expect(deferred.queue).toHaveLength(0); // nothing even scheduled
      expect(fakes.driveRequests).toHaveLength(0);
      const archive = fakes.json<Record<string, unknown>>(jsonKey);
      expect(archive).not.toHaveProperty("driveFileId");
      expect(archive).not.toHaveProperty("driveCopyFailedAt");
    }
    expect(errors).not.toHaveBeenCalled();
    expect(fakes.makePosts).toHaveLength(3); // Make carries on as before
    expect(fakes.makePosts.every((p) => typeof p === "object")).toBe(true);
    expect(MAKE_URL).toBeTruthy();
  });
});

describe("regenerating from the office review screen", () => {
  it("replaces the SAME Drive file's contents — one PATCH by ID, no second file", async () => {
    stubConfiguredEnv();
    const { body, jsonKey } = await submit();
    await runDeferred();
    expect(fakes.json<Archive>(jsonKey).driveFileId).toBe("drive-file-1");
    fakes.driveRequests.length = 0;

    const result = await regenerate(body.results.reportId, "Corrected by the office.");
    expect(result).toMatchObject({ ok: true, status: "saved" });
    expect(fakes.driveRequests).toHaveLength(0); // office isn't kept waiting either

    await runDeferred();
    expect(fakes.driveRequests).toHaveLength(1);
    const [req] = fakes.driveRequests;
    expect(req.method).toBe("PATCH");
    expect(req.url.pathname).toBe("/upload/drive/v3/files/drive-file-1");
    expect(req.url.searchParams.get("supportsAllDrives")).toBe("true");
    expect(req.pdf).toBe("%PDF-fake REVISED");

    const archive = fakes.json<Archive>(jsonKey);
    expect(archive.driveFileId).toBe("drive-file-1");
    expect(archive.overallNotes).toBe("Corrected by the office."); // the edit itself survived
  });

  it("a report filed before Drive existed gets its file created on regenerate, and the ID stored", async () => {
    stubConfiguredEnv({ drive: false });
    const { body, jsonKey } = await submit();
    expect(deferred.queue).toHaveLength(0);

    stubConfiguredEnv(); // Drive is set up later
    await regenerate(body.results.reportId, "First edit after Drive setup.");
    await runDeferred();

    expect(fakes.driveRequests.map((r) => r.method)).toEqual(["POST"]);
    expect(fakes.json<Archive>(jsonKey).driveFileId).toBe("drive-file-1");

    // ...and from then on it's updated, not duplicated.
    fakes.driveRequests.length = 0;
    await regenerate(body.results.reportId, "Second edit.");
    await runDeferred();
    expect(fakes.driveRequests.map((r) => `${r.method} ${r.url.pathname}`)).toEqual([
      "PATCH /upload/drive/v3/files/drive-file-1",
    ]);
  });

  it("a Drive failure doesn't fail the regenerate; the flag shows until a later copy succeeds", async () => {
    stubConfiguredEnv();
    const { body, jsonKey } = await submit();
    await runDeferred();

    fakes.drive.respond = () => new Response("rate limited", { status: 429 });
    const failed = await regenerate(body.results.reportId, "Edit while Drive is down.");
    expect(failed).toMatchObject({ ok: true, status: "saved" });
    await runDeferred();
    let archive = fakes.json<Archive>(jsonKey);
    expect(archive.driveCopyFailedAt).toBeTruthy();
    expect(archive.driveFileId).toBe("drive-file-1"); // a failure never loses the ID
    expect(archive.overallNotes).toBe("Edit while Drive is down.");

    fakes.drive.respond = (req) => Response.json({ id: req.url.pathname.split("/").pop() });
    await regenerate(body.results.reportId, "Edit after Drive recovered.");
    await runDeferred();
    archive = fakes.json<Archive>(jsonKey);
    expect(archive.driveCopyFailedAt).toBeUndefined();
    expect(archive.driveFileId).toBe("drive-file-1");
  });
});
