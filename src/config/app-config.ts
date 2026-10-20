import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "MIT-WEEK 2026",
  version: packageJson.version,
  copyright: `© ${currentYear}, MIT-WEEK 2026.`,
  meta: {
    title: "MIT-WEEK 2026",
    description: "Portal manajemen kompetisi MIT-WEEK 2026.",
  },
};
