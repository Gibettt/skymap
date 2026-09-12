import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "SpaceCat ASTROTOURISM Staff",
  version: packageJson.version,
  copyright: `© ${currentYear}, SpaceCat ASTROTOURISM Staff.`,
  meta: {
    title: "SpaceCat ASTROTOURISM Staff Portal",
    description:
      "Role-aware operations portal for internal and external SpaceCat ASTROTOURISM staff.",
  },
};
