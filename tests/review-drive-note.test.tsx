import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ReviewForm from "@/components/review/ReviewForm";

const props = {
  reportId: "abc1234567",
  fields: [],
  readOnly: { chemistry: [], inspectorName: "Test Tech", certificationDate: "2026-10-10", photoCount: 0 },
  revisions: [],
  loadedAt: "0",
  viewerUrl: "https://go.sunsetpoolcare.com/r/abc1234567",
};

describe("office review screen — Drive note", () => {
  it('shows a short "Drive copy failed" note when the last Drive copy failed', () => {
    const html = renderToStaticMarkup(<ReviewForm {...props} driveCopyFailed />);
    expect(html).toContain("Drive copy failed.</span> The report is fine");
    expect(html).toContain("tried again the next time this");
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
