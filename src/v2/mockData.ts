// Static, self-contained mock data for the /v2 visual prototype.
// This is a design showcase, not the real app — figures are copied verbatim
// from the reference mockup and are not derived from any calculation engine.

export const V2_DATE = "Tuesday, May 13";

export const V2_HERO = {
  amount: "$126.34",
  label: "SAFE TO SPEND TODAY",
  sublabel: "Daily average",
  updated: "Updated this morning",
};

export const V2_METRICS = [
  {
    icon: "clock" as const,
    label: "Runway",
    sublabel: "Time until $0",
    value: "38 days",
    tag: "On track",
    tagTone: "good" as const,
  },
  {
    icon: "wallet" as const,
    label: "Fixed costs",
    sublabel: "Next 30 days",
    value: "$2,341.00",
    tag: "See breakdown",
    tagTone: "neutral" as const,
  },
  {
    icon: "refresh" as const,
    label: "Subscriptions",
    sublabel: "Active",
    value: "$264.50/mo",
    tag: "7 subscriptions",
    tagTone: "neutral" as const,
  },
];

export const V2_FORMULA = [
  { label: "Available balance", value: "$4,812.75", op: null },
  { label: "Upcoming costs", value: "$2,341.00", op: "−" as const },
  { label: "Goals & buffer", value: "$1,500.00", op: "−" as const },
  { label: "Safe to spend", value: "$126.34", op: "=" as const },
];

export const V2_ONBOARDING_POINTS = [
  { title: "Know your real runway", body: "See exactly how many days you have." },
  { title: "Spend with confidence", body: "Get a daily safe-to-spend number." },
  { title: "Plan for every scenario", body: "Model changes before you decide." },
];

export const V2_BASELINE = { runway: "38 days", perDay: "$126.34 /day" };
export const V2_BASELINE_RUNWAY_DAYS = 38;
export const V2_BASELINE_SAFE_SPEND = 126.34;

export const V2_SUBS_TOTAL = "$264.50/mo";
export const V2_SUBS_IMPACT = "−2.6 days";

export const V2_SUBSCRIPTIONS = [
  { id: "linear", name: "Linear", category: "Engineering", mark: "L", color: "#5E6AD2", impact: "−0.6 days" },
  { id: "notion", name: "Notion", category: "Productivity", mark: "N", color: "#E7E7E7", impact: "−0.5 days" },
  { id: "slack", name: "Slack", category: "Communication", mark: "S", color: "#ECB22E", impact: "−0.4 days" },
  { id: "aws", name: "AWS", category: "Infrastructure", mark: "A", color: "#FF9900", impact: "−0.3 days" },
  { id: "vercel", name: "Vercel", category: "Dev Tools", mark: "▲", color: "#FFFFFF", impact: "−0.2 days" },
  { id: "figma", name: "Figma", category: "Design", mark: "F", color: "#F24E1E", impact: "−0.1 days" },
  { id: "other", name: "Other (2)", category: "Misc", mark: "•", color: "#8E8E93", impact: "−0.5 days" },
];

export type V2Txn = {
  id: string;
  name: string;
  subtitle: string;
  amount: string;
  positive: boolean;
  time: string;
  mark: string;
  color: string;
  kind: "cashflow" | "runway";
};

export const V2_TRANSACTIONS: { group: string; items: V2Txn[] }[] = [
  {
    group: "Today",
    items: [
      { id: "t1", name: "Stripe", subtitle: "Payment received", amount: "+$4,250.00", positive: true, time: "9:15 AM", mark: "S", color: "#635BFF", kind: "cashflow" },
      { id: "t2", name: "AWS", subtitle: "Subscription", amount: "−$28.50", positive: false, time: "8:42 AM", mark: "A", color: "#FF9900", kind: "runway" },
      { id: "t3", name: "Notion", subtitle: "Subscription", amount: "−$48.00", positive: false, time: "8:31 AM", mark: "N", color: "#E7E7E7", kind: "runway" },
    ],
  },
  {
    group: "Yesterday",
    items: [
      { id: "t4", name: "Salary", subtitle: "Payroll", amount: "−$6,500.00", positive: false, time: "May 12", mark: "$", color: "#34D399", kind: "cashflow" },
      { id: "t5", name: "Vercel", subtitle: "Subscription", amount: "−$20.00", positive: false, time: "May 12", mark: "▲", color: "#FFFFFF", kind: "runway" },
      { id: "t6", name: "Linear", subtitle: "Subscription", amount: "−$59.00", positive: false, time: "May 12", mark: "L", color: "#5E6AD2", kind: "runway" },
    ],
  },
  {
    group: "May 11, 2025",
    items: [
      { id: "t7", name: "Bank transfer", subtitle: "Deposit", amount: "+$10,000.00", positive: true, time: "May 11", mark: "B", color: "#38BDF8", kind: "cashflow" },
      { id: "t8", name: "Slack", subtitle: "Subscription", amount: "−$35.00", positive: false, time: "May 11", mark: "S", color: "#ECB22E", kind: "runway" },
    ],
  },
];
