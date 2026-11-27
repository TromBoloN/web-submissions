// Submission link rules, shared by the form, the server action and the phase checklists.

export const GITHUB_PATTERN = /^https:\/\/github\.com\/.+/i;
export const HTTP_PATTERN = /^https?:\/\/.+/i;

export type SubmissionLinks = { github_url: string; live_demo_url: string; video_url: string };
export type SubmissionLinkErrors = Partial<Record<keyof SubmissionLinks, string>>;

// In field order: the server action reports the first error.
const RULES = [
  {
    field: "github_url",
    pattern: GITHUB_PATTERN,
    required: "Repositori GitHub wajib diisi.",
    invalid: {
      submit: "Repositori GitHub harus berupa tautan repositori valid (diawali https://github.com/).",
      draft: "Repositori GitHub harus diawali https://github.com/",
    },
  },
  {
    field: "live_demo_url",
    pattern: HTTP_PATTERN,
    required: "URL Live Demo wajib diisi.",
    invalid: {
      submit: "URL Live Demo harus berupa tautan web yang valid (diawali http:// atau https://).",
      draft: "URL Live Demo harus diawali http:// atau https://",
    },
  },
  {
    field: "video_url",
    pattern: HTTP_PATTERN,
    required: "URL Video Demo wajib diisi.",
    invalid: {
      submit: "URL Video Demo harus berupa tautan video yang valid (diawali http:// atau https://).",
      draft: "URL Video Demo harus diawali http:// atau https://",
    },
  },
] as const;

/** Submit: all three links required and well-formed. Draft: empty is fine, filled links must be well-formed. */
export function validateSubmissionLinks(links: SubmissionLinks, mode: "draft" | "submit"): SubmissionLinkErrors {
  const errors: SubmissionLinkErrors = {};
  for (const rule of RULES) {
    const value = links[rule.field].trim();
    if (!value) {
      if (mode === "submit") errors[rule.field] = rule.required;
    } else if (!rule.pattern.test(value)) {
      errors[rule.field] = rule.invalid[mode];
    }
  }
  return errors;
}
