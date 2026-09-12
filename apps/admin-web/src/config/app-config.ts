import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "SpaceCat ASTROTOURISM",
  version: packageJson.version,
  copyright: `© ${currentYear}, SpaceCat ASTROTOURISM.`,
  meta: {
    title: "SpaceCat ASTROTOURISM Admin",
    description:
      "SpaceCat ASTROTOURISM admin portal for managing bookings, resorts, packages, finances, and daily operations.",
  },
};
