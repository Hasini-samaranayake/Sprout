/** Shared demo accounts — keep in sync with seed expectations. */
export const DEMO_PASSWORD = "DemoSprout2026!";

export const USERS: {
  email: string;
  full_name: string;
  role: "tutor" | "student";
}[] = [
  { email: "tutor@sprout.demo", full_name: "Hasini Samaranayake", role: "tutor" },
  { email: "callum.perera@sprout.demo", full_name: "Callum Perera", role: "student" },
  {
    email: "brianna.struggling@sprout.demo",
    full_name: "Bella Smith",
    role: "student",
  },
  {
    email: "carlos.inactive@sprout.demo",
    full_name: "Riona Das",
    role: "student",
  },
  { email: "dana.streak@sprout.demo", full_name: "Melissa Mathews", role: "student" },
  {
    email: "elena.followup@sprout.demo",
    full_name: "Iqra Syed",
    role: "student",
  },
];

/** Older seed emails — still present in some DBs; sync script / SQL can map these. */
export const LEGACY_EMAIL_BY_CANONICAL: Record<string, string> = {
  "callum.perera@sprout.demo": "alex.thriving@sprout.demo",
};
