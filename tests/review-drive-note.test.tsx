import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ReviewForm from "@/components/review/ReviewForm";

const props = {
  reportId: "abc1234567",
  fields: [],
  readOnly: { chemistry: [], inspectorName: "OrangeCore", certificationDate: "2026-10-10", photoCount: 0 },
  revisions: [],
  loadedAt: "0",
  viewerUrl: "https://go.sunsetpoolcare.com/r/abc1234567",
};

describe("office review screen — Drive note", () => {
  it('shows a short "Drive copy failed" note when the last Drive copy failed', () => {
    const html = renderToStaticMarkup(<ReviewForm {...props} driveCopyFailed />);
    // The exact wording, as one sentence-run of text.
    const text = html
      .replace(/<[^>]+>/g, "")
      .replace(/&#x27;/g, "'")
      .replace(/\s+/g, " ");
    expect(text).toContain(
      "Drive copy failed. The report is fine. Only its copy in Google Drive didn't save, and it tries again the next time this report is regenerated."
    );
  });

  it("shows nothing about Drive otherwise — including before Drive is set up", () => {
    for (const html of [
      renderToStaticMarkup(<ReviewForm {...props} />),
      renderToStaticMarkup(<ReviewForm {...props} driveCopyFailed={false} />),
    ]) {
      expect(html).not.toMatch(/drive/i);
    }
  });
});
