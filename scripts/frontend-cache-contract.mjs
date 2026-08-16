export const cssContract = {
  sourceFiles: [
    "app/globals.css",
    "components/dashboard/creator-command-dashboard.css",
  ],
  required: [
    "--text-body-lg: .95rem",
    "--text-body: .84rem",
    "--text-body-sm: .77rem",
    "--text-metadata: .67rem",
    ".premium-creator-dashboard",
    ".audience-updates",
    "font-size:var(--text-display)",
    "font-size:var(--text-section-title)",
    "font-size:var(--text-body)",
  ],
  obsolete: ["--dashboard-text-"],
};

export const authoritativeCssImports = [
  { source: "app/globals.css", importer: "app/layout.tsx" },
  {
    source: "components/dashboard/creator-command-dashboard.css",
    importer: "components/dashboard/creator-command-dashboard.tsx",
  },
];
