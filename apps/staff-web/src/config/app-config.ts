import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Ephemeris Staff",
  version: packageJson.version,
  copyright: `© ${currentYear}, Ephemeris Staff.`,
  meta: {
    title: "Ephemeris Staff Portal",
    description:
      "Role-aware operations portal for internal and external Ephemeris staff.",
  },
};
