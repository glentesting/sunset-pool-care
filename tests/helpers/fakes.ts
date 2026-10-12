/**
 * In-memory stand-ins for every outside service a submit or regenerate touches,
 * installed behind a stubbed global `fetch` so the production code runs as-is:
 *
 *   Supabase Storage   a Map, keyed by object path
 *   Google Drive       records every request; responds per `drive.respond`
 *   Make webhook       records every post
 *
 * Google's token exchange is NOT here — google-auth-library makes that request
 * through its own HTTP client, so the tests mock the library at its boundary
 * (see the vi.mock calls in each test file).
 */
import { vi } from "vitest";
import type { AssessmentData } from "@/lib/validation/assessment";

export const SUPABASE_URL = "https://supabase.test";
export const MAKE_URL = "https://hook.make.test/assessment";
export const FOLDER_ID = "folder-123";
export const SERVICE_ACCOUNT = {
  type: "service_account",
  client_email: "spc-drive@spc-project.iam.gserviceaccount.com",
  // Literal "\n" pairs, as a key pasted through a dashboard can arrive.
  private_key: "-----BEGIN PRIVATE KEY-----\\nFAKEKEY\\n-----END PRIVATE KEY-----\\n",
};

export type DriveRequest = {
  method: string;
  url: URL;
  /** The JSON metadata part of the multipart body. */
  metadata: Record<string, unknown>;
  /** The PDF part, as text (the fake PDFs are ASCII). */
  pdf: string;
  authorization: string | null;
};

export function installFakes() {
  const bucket = new Map<string, { bytes: Uint8Array; type: string }>();
  const driveRequests: DriveRequest[] = [];
  const makePosts: unknown[] = [];
  let nextDriveId = 1;

  /** Default Drive: creates get fresh IDs, updates echo the ID they were sent. */
  const drive = {
    respond: (req: DriveRequest): Response => {
      if (req.method === "POST") return Response.json({ id: `drive-file-${nextDriveId++}` });
      const id = decodeURIComponent(req.url.pathname.split("/").pop() ?? "");
      return Response.json({ id });
    },
  };

  const fetchMock = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
    const method = (init.method ?? "GET").toUpperCase();
    const body = init.body == null ? Buffer.alloc(0) : Buffer.from(init.body as Uint8Array);

    // --- Supabase Storage ---
    if (url.origin === SUPABASE_URL) {
      const signPrefix = "/storage/v1/object/sign/assessment-pdfs/";
      const objPrefix = "/storage/v1/object/assessment-pdfs/";
      if (url.pathname.startsWith(signPrefix)) {
        const key = decodeURIComponent(url.pathname.slice(signPrefix.length));
        if (method === "POST") return Response.json({ signedURL: `/object/sign/assessment-pdfs/${key}?token=t` });
        return readObject(key);
      }
      if (url.pathname.startsWith(objPrefix)) {
        const key = url.pathname.slice(objPrefix.length).split("/").map(decodeURIComponent).join("/");
        if (method === "POST" || method === "PUT") {
          const headers = new Headers(init.headers);
          bucket.set(key, { bytes: new Uint8Array(body), type: headers.get("content-type") ?? "" });
          return Response.json({ Key: key });
        }
        return readObject(key);
      }
    }

    // --- Google Drive ---
    if (url.hostname === "www.googleapis.com") {
      const text = body.toString("latin1");
      const parts = text.split(/\r\n--[^\r\n]+/);
      const meta = /\r\n\r\n([\s\S]*)$/.exec(parts[0] ?? "")?.[1] ?? "{}";
      const pdf = /\r\n\r\n([\s\S]*)$/.exec(parts[1] ?? "")?.[1] ?? "";
      const req: DriveRequest = {
        method,
        url,
        metadata: JSON.parse(meta),
        pdf,
        authorization: new Headers(init.headers).get("authorization"),
      };
      driveRequests.push(req);
      return drive.respond(req);
    }

    // --- Make ---
    if (url.href === MAKE_URL) {
      makePosts.push(JSON.parse(body.toString("utf8")));
      return new Response("Accepted", { status: 200 });
    }

    throw new Error(`Unexpected fetch in test: ${method} ${url.href}`);
  });

  function readObject(key: string): Response {
    const obj = bucket.get(key);
    if (!obj) return Response.json({ statusCode: "404", error: "not_found" }, { status: 404 });
    return new Response(Buffer.from(obj.bytes), { headers: { "content-type": obj.type } });
  }

  vi.stubGlobal("fetch", fetchMock);

  return {
    bucket,
    driveRequests,
    makePosts,
    drive,
    /** Parse a stored JSON object. */
    json<T = Record<string, unknown>>(key: string): T {
      const obj = bucket.get(key);
      if (!obj) throw new Error(`no object ${key}`);
      return JSON.parse(Buffer.from(obj.bytes).toString("utf8")) as T;
    },
    text(key: string): string {
      const obj = bucket.get(key);
      if (!obj) throw new Error(`no object ${key}`);
      return Buffer.from(obj.bytes).toString("utf8");
    },
  };
}

/** Environment for a fully configured deploy (Drive included). */
export function stubConfiguredEnv({ drive = true }: { drive?: boolean } = {}) {
  vi.stubEnv("SUPABASE_URL", SUPABASE_URL);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  vi.stubEnv("MAKE_ASSESSMENT_WEBHOOK_URL", MAKE_URL);
  vi.stubEnv("REPORT_BASE_URL", "https://go.sunsetpoolcare.com");
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_JSON", drive ? JSON.stringify(SERVICE_ACCOUNT) : "");
  vi.stubEnv("GDRIVE_ASSESSMENT_FOLDER_ID", drive ? FOLDER_ID : "");
}

/** A minimal assessment that passes assessmentSchema. */
export function samplePayload(): AssessmentData {
  return {
    property: {
      customerName: "TEST OrangeCore Drive Copy",
      customerEmail: "test@example.com",
      customerFirstName: "TEST",
      customerLastName: "OrangeCore Drive Copy",
      customerPhone: "",
      serviceAddress: "1 Test St",
      city: "Chandler",
      zip: "85286",
      poolType: "Pool",
      poolSize: "15,000 gal",
      lastWaterChange: "2026-06-01",
      lastWaterChangeUnknown: false,
      lastWaterChangeNote: "",
      additionalBodies: [],
    },
    details: {
      session: "SPC-20261010-0900",
      date: "2026-10-10",
      time: "09:00",
      inspectorName: "OrangeCore",
      inspectionType: "Standard",
    },
    config: { surfaces: ["Plaster"], sanitization: ["Salt System"], features: ["None"] },
    configPhotos: [],
    configOptions: [],
    sections: [
      {
        id: "surface",
        title: "Pool Surface & Interior Finish",
        rating: "GOOD",
        notes: "",
        photoCount: 0,
        photos: [],
        items: [{ label: "Surface Condition (Overall)", status: "GOOD", note: "" }],
        units: [],
      },
    ],
    chemistry: [],
    itemCounts: { attention: 0, monitor: 0, good: 1 },
    lights: [],
    filters: [],
    pumps: [],
    spaType: "N/A — No Spa",
    overallNotes: "All good.",
    overall: { key: "good", label: "Good Condition", counts: { GOOD: 1, MONITOR: 0, ATTENTION: 0, "N/A": 0 } },
    certification: { inspectorName: "OrangeCore", date: "2026-10-10", certified: true },
  };
}
