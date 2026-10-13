import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Star Portal",
  version: packageJson.version,
  copyright: `© ${currentYear}, Star Portal.`,
  meta: {
    title: "Star Portal",
    description: "Star Portal admin portal for managing bookings, resorts, packages, finances, and daily operations.",
  },
};
