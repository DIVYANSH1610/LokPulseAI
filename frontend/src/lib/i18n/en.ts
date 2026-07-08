const en = {
  meta: {
    title: "LokPulse AI — Development Intelligence Engine",
    tagline: "One evidence-backed answer to what your constituency needs next.",
  },
  nav: {
    home: "Home",
    howItWorks: "How it works",
    roles: "For your office",
    login: "Enter dashboard",
  },
  hero: {
    eyebrow: "AI Development Intelligence for Members of Parliament",
    headline: "Every voice, one ranked answer.",
    subhead:
      "LokPulse AI converts scattered, multilingual, multimodal citizen signal into a single ranked, evidence-backed answer to the question every MP's office actually faces: what should we build next, and why?",
    ctaPrimary: "Explore the dashboard",
    ctaSecondary: "Report an issue",
  },
  stats: [
    { value: "5", label: "role-based views, one shared evidence base" },
    { value: "8", label: "specialized AI agents, each independently auditable" },
    { value: "0%", label: "hallucinated statistics — every claim is data-grounded" },
    { value: "24/7", label: "intake via voice, text, photo, WhatsApp, or SMS" },
  ],
  howItWorks: {
    heading: "From scattered complaints to a ranked action plan",
    subheading:
      "Every step is a distinct, auditable AI agent — not one large prompt asked to summarize everything.",
    steps: [
      {
        title: "Citizens report, in their own language",
        desc:
          "Voice, text, photo, WhatsApp, or SMS — no app download, no literacy requirement, no language barrier.",
      },
      {
        title: "AI agents classify, translate, and deduplicate",
        desc:
          "500 similar reports become one evidence-backed issue cluster, grounded in what citizens actually said.",
      },
      {
        title: "A transparent formula ranks every issue",
        desc:
          "Frequency, population, distance to facilities, infrastructure gap, and equity — every weight visible and adjustable.",
      },
      {
        title: "Your office gets a grounded recommendation",
        desc:
          "Action, budget, matching government scheme, timeline, and confidence — every claim traced to real data.",
      },
    ],
  },
  features: {
    heading: "Built for transparency, not decoration",
    subheading: "Judges and offices alike should never have to trust a black box.",
    items: [
      {
        title: "Multilingual by default",
        desc: "The entire interface — not just submitted content — switches instantly between languages.",
      },
      {
        title: "Grounded, never hallucinated",
        desc: "Every recommendation is retrieved from real census, health, and scheme data before generation.",
      },
      {
        title: "Explainable ranking",
        desc: "The priority score is a visible, adjustable formula — drag a slider, watch the ranking recompute live.",
      },
      {
        title: "One evidence base, five views",
        desc: "Citizens, MPs, MLAs, district officers, and panchayat officers see the same underlying evidence.",
      },
    ],
  },
  roles: {
    heading: "Choose your view",
    subheading: "Every role sees the same underlying evidence, scoped to what they need.",
    items: {
      mp_office: {
        label: "MP Office",
        desc: "Full constituency dashboard, ranked priorities, budget suggestions.",
      },
      mla_office: {
        label: "MLA Office",
        desc: "Same dashboard, scoped to your assembly segment.",
      },
      district_admin: {
        label: "District Administration",
        desc: "Cross-constituency view, implementation tracking.",
      },
      panchayat_officer: {
        label: "Panchayat Officer",
        desc: "Ward-level detail, ground-truth annotation.",
      },
      citizen: {
        label: "Citizen",
        desc: "Report an issue or browse nearby reports to upvote.",
      },
    },
    comingSoon: "Coming soon",
  },
  footer: {
    tagline: "Development intelligence for every constituency office.",
    builtWith: "Built for citizens, MPs, MLAs, district officers, and panchayat officers alike.",
  },
};

export default en;
export type Dictionary = typeof en;
