/**
 * migrate-config.mjs
 *
 * Migrates portfolio.config.yaml from old flat format to new i18n locale-block format.
 *
 * Run:  node scripts/migrate-config.mjs
 *
 * Creates a backup at portfolio.config.yaml.bak before modifying.
 */

/* global console, process */

import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONFIG_PATH = join(ROOT, "portfolio.config.yaml");
const BACKUP_PATH = join(ROOT, "portfolio.config.yaml.bak");

const config = yaml.load(readFileSync(CONFIG_PATH, "utf8"));

if (config.defaultLanguage) {
  console.log("✓ Config already has i18n structure (defaultLanguage detected)");
  console.log("  Migration not needed.");
  process.exit(0);
}

console.log("Migrating portfolio.config.yaml to i18n format...\n");

copyFileSync(CONFIG_PATH, BACKUP_PATH);
console.log("✓ Backup created: portfolio.config.yaml.bak\n");

const TRANSLATABLE_FIELDS = [
  "name",
  "title",
  "tagline",
  "location",
  "about",
  "stats",
  "skills",
  "experience",
  "projects",
  "education",
  "languages",
  "certifications",
  "publications",
  "testimonials",
  "resumeUrl",
  "resumeFileName",
];

const UI_STRINGS = {
  about: "About",
  stats: "Stats",
  skills: "Skills",
  languages: "Languages",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  certifications: "Certifications",
  publications: "Publications",
  testimonials: "Testimonials",
  contact: "Contact",
  more: "More",
  blog: "Blog",
  resume: "Resume",
  downloadResume: "Download Resume",
  openToOpportunities: "Open to opportunities",
  viewMyWork: "View My Work",
  viewResume: "View Resume",
  scrollDown: "Scroll down",
  aboutMe: "About Me",
  aboutHeading: "A bit about myself",
  toolbox: "My Toolbox",
  skillsTitle: "Skills & Technologies",
  careerPath: "Career Path",
  experienceHeading: "Work Experience",
  featuredWork: "Featured Work",
  projectsHeading: "Projects I've Built",
  viewProject: "View Project",
  sourceCode: "Source Code",
  educationHeading: "Education",
  certificationsHeading: "Certifications",
  publicationsHeading: "Publications",
  conference: "Conference",
  journal: "Journal",
  preprint: "Preprint",
  testimonialsHeading: "Testimonials",
  getInTouch: "Get in Touch",
  contactTitle: "Let's work\ntogether",
  contactDescription: "Have a project in mind or just want to say hi? Drop me a message and I'll get back to you as soon as possible.",
  yourName: "Your Name",
  yourEmail: "Your Email",
  message: "Message",
  messagePlaceholder: "Write your message...",
  sendMessage: "Send Message",
  sending: "Sending...",
  openInEmailApp: "Open in Email App",
  orEmailDirectly: "or email directly",
  messageSent: "Message sent successfully!",
  somethingWentWrong: "Something went wrong. Please try again.",
  sharePortfolio: "Share Portfolio",
  builtWith: "Built with",
  forkAndMakeYours: "Fork and make yours",
  whatsNew: "What's new",
  shareTitle: "Share this portfolio",
  copyLink: "Copy link",
  linkCopied: "Link copied!",
  shareOn: "Share on",
  copySectionLink: "Copy section link",
  copied: "Copied!",
  switchLanguage: "Switch language",
  portfolio: "Portfolio",
  twoColumn: "Two Column",
  classic: "Classic",
  share: "Share",
  savePdf: "Save PDF",
  summary: "Summary",
  ghStats: "GitHub Stats",
};

const enBlock = { ui: UI_STRINGS };
const zhBlock = { ui: Object.fromEntries(Object.keys(UI_STRINGS).map((k) => [k, ""])) };

for (const field of TRANSLATABLE_FIELDS) {
  if (config[field] !== undefined) {
    enBlock[field] = config[field];
    zhBlock[field] = Array.isArray(config[field]) ? [] : "";
  }
}

const newConfig = {
  siteMode: config.siteMode,
  siteUrl: config.siteUrl,
  showPoweredBy: config.showPoweredBy,
  defaultLanguage: "en",
  languages: [
    { code: "en", label: "English" },
    { code: "zh", label: "中文" },
  ],
  email: config.email,
  phone: config.phone,
  avatarUrl: config.avatarUrl,
  openToWork: config.openToWork,
  defaultTheme: config.defaultTheme,
  colorPreset: config.colorPreset,
  resumeTheme: config.resumeTheme,
  contactFormEndpoint: config.contactFormEndpoint,
  sections: config.sections,
  social: config.social,
  analytics: config.analytics,
  blog: config.blog,
  en: enBlock,
  zh: zhBlock,
};

const yamlStr = yaml.dump(newConfig, {
  lineWidth: -1,
  noRefs: true,
  quotingType: '"',
});

writeFileSync(CONFIG_PATH, yamlStr);

console.log("✓ Migration complete!");
console.log("  - English content moved to 'en:' block");
console.log("  - Empty 'zh:' block created for Chinese translations");
console.log("  - UI strings added to both locale blocks");
console.log("\nNext steps:");
console.log("  1. Review portfolio.config.yaml");
console.log("  2. Fill in Chinese translations in the 'zh:' block");
console.log("  3. Run: pnpm check-config");
console.log("  4. Run: pnpm dev\n");
