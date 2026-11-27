import { describe, expect, it } from "vitest";

import { validateSubmissionLinks } from "@/app/(main)/team/submission-rules";

const valid = {
  github_url: "https://github.com/tim/proyek",
  live_demo_url: "https://proyek.vercel.app",
  video_url: "http://youtu.be/abc",
};
const empty = { github_url: "", live_demo_url: "", video_url: "" };

describe("validateSubmissionLinks", () => {
  it("accepts valid links in both modes, and empty links only for a draft", () => {
    expect(validateSubmissionLinks(valid, "submit")).toEqual({});
    expect(validateSubmissionLinks(valid, "draft")).toEqual({});
    expect(validateSubmissionLinks(empty, "draft")).toEqual({});
    expect(Object.keys(validateSubmissionLinks(empty, "submit"))).toEqual(["github_url", "live_demo_url", "video_url"]);
  });

  it("rejects malformed links in both modes, trimming first", () => {
    const bad = { github_url: "https://gitlab.com/x", live_demo_url: "proyek.app", video_url: "  " };
    expect(Object.keys(validateSubmissionLinks(bad, "draft"))).toEqual(["github_url", "live_demo_url"]);
    expect(validateSubmissionLinks(bad, "submit").video_url).toBe("URL Video Demo wajib diisi.");
    expect(validateSubmissionLinks({ ...valid, github_url: " https://github.com/a/b " }, "submit")).toEqual({});
  });
});
