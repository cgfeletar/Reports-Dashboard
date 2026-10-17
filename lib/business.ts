/**
 * White-label config. Every client-specific value lives here; override per deploy
 * with env vars. Never hard-code a real business name anywhere else in the repo.
 */
export const business = {
  name: process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "Juniper & Moss Wellness Spa", // fictional default
  shortName: process.env.NEXT_PUBLIC_BUSINESS_SHORT ?? "Juniper & Moss",
  isDemo: process.env.NEXT_PUBLIC_DEMO !== "false", // default true
};
