/**
 * generate-resume.mjs
 *
 * Reads portfolio.config.yaml and writes two AI-friendly resume formats:
 *   public/resume.json  — JSON Resume spec (https://jsonresume.org/schema/)
 *   public/resume.md    — Clean Markdown (LLM-friendly)
 *
 * Run:  node scripts/generate-resume.mjs
 * Auto-runs before every build via the "build" npm script.
 */

/* global console, process */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const config = yaml.load(
  readFileSync(join(ROOT, "portfolio.config.yaml"), "utf8")
);

const args = process.argv.slice(2);
const localeArg = args.find((arg) => arg.startsWith("--locale="))?.split("=")[1];

let content = config;
if (config.defaultLanguage && config[config.defaultLanguage]) {
  const locale = localeArg && config[localeArg] ? localeArg : config.defaultLanguage;
  content = { ...config, ...config[locale] };
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Parse "2022 – Present"  →  { startDate: "2022", endDate: "" } */
function parsePeriod(period = "") {
  const parts = period.split(/\s*[–—-]\s*/);
  const start = parts[0]?.trim() ?? "";
  const end   = parts[1]?.trim() ?? "";
  return {
    startDate: start,
    endDate: end.toLowerCase() === "present" ? "" : end,
  };
}

/** "San Francisco, CA"  →  { city: "San Francisco", region: "CA" } */
function parseLocation(str = "") {
  const [city, region] = str.split(",").map((s) => s.trim());
  return { city: city ?? str, region: region ?? "" };
}

/** Build JSON Resume profiles array from social map */
function buildProfiles(social = {}) {
  const map = { github: "GitHub", linkedin: "LinkedIn", twitter: "Twitter", website: "Website" };
  return Object.entries(map)
    .filter(([key]) => social[key])
    .map(([key, network]) => ({
      network,
      url: social[key],
      username: social[key].replace(/.*\//, ""),
    }));
}

// ── JSON Resume ───────────────────────────────────────────────────────────────

const resume = {
  $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
  basics: {
    name:     content.name      ?? "",
    label:    content.title     ?? "",
    image:    config.avatarUrl ?? "",
    email:    config.email     ?? "",
    phone:    config.phone     ?? "",
    summary:  content.about     ?? "",
    location: parseLocation(content.location),
    profiles: buildProfiles(config.social),
  },
  work: (content.experience ?? []).map((exp) => {
    const { startDate, endDate } = parsePeriod(exp.period);
    return { name: exp.company, position: exp.role, startDate, endDate, summary: exp.description, highlights: exp.highlights ?? [] };
  }),
  education: (content.education ?? []).map((edu) => {
    const { startDate, endDate } = parsePeriod(edu.period);
    return { institution: edu.institution, area: edu.degree, studyType: "", startDate, endDate };
  }),
  skills:       (content.skills        ?? []).map((s) => ({ name: s.category, keywords: s.items ?? [] })),
  projects:     (content.projects      ?? []).map((p) => ({ name: p.name, description: p.description, keywords: p.tags ?? [], url: p.liveUrl || p.repoUrl || "" })),
  certificates: (content.certifications ?? []).map((c) => ({ name: c.title, issuer: c.issuer, date: c.date, url: c.credentialUrl || "" })),
  languages:    (content.languages     ?? []).map((l) => ({ language: l.name, fluency: l.level })),
};

// ── Markdown resume ───────────────────────────────────────────────────────────

const socialLinks = Object.entries(config.social ?? {})
  .filter(([, url]) => url)
  .map(([key, url]) => `[${key.charAt(0).toUpperCase() + key.slice(1)}](${url})`)
  .join(" · ");

const skillsBlock = (content.skills ?? [])
  .map((s) => `**${s.category}:** ${s.items.join(", ")}`)
  .join("\n");

const experienceBlock = (content.experience ?? [])
  .map((exp) =>
    `### ${exp.role} — ${exp.company}\n_${exp.period}_\n\n${exp.description}\n\n${
      exp.highlights?.length ? exp.highlights.map((h) => `- ${h}`).join("\n") : ""
    }`
  )
  .join("\n\n");

const projectsBlock = (content.projects ?? [])
  .map((p) => {
    const link  = p.liveUrl || p.repoUrl;
    const title = link ? `[${p.name}](${link})` : p.name;
    return `### ${title}\n${p.description}\n\n**Tags:** ${p.tags?.join(", ") ?? ""}`;
  })
  .join("\n\n");

const educationBlock = (content.education ?? [])
  .map((edu) => `**${edu.degree}** — ${edu.institution} _(${edu.period})_`)
  .join("\n");

const certsBlock = (content.certifications ?? [])
  .map((c) => {
    const link = c.credentialUrl ? ` ([verify](${c.credentialUrl}))` : "";
    return `- **${c.title}** — ${c.issuer}, ${c.date}${link}`;
  })
  .join("\n");

const languagesBlock = (content.languages ?? [])
  .map((l) => `${l.name} (${l.level})`)
  .join(", ");

const locationStr = content.location ? `${content.location} · ` : "";
const emailStr    = config.email    ? `${config.email} · `    : "";
const phoneStr    = config.phone    ? `${config.phone} · `    : "";

const markdown = `# ${content.name}
**${content.title}**

${locationStr}${phoneStr}${emailStr}${socialLinks}

${config.openToWork ? "> **Open to new opportunities**\n\n" : ""}## Summary

${content.about ?? ""}

## Skills

${skillsBlock}

## Experience

${experienceBlock}

## Projects

${projectsBlock}

## Education

${educationBlock}
${certsBlock ? `\n## Certifications\n\n${certsBlock}\n` : ""}${languagesBlock ? `\n## Languages\n\n${languagesBlock}\n` : ""}`;

// ── Write output ──────────────────────────────────────────────────────────────

const publicDir = join(ROOT, "public");
mkdirSync(publicDir, { recursive: true });

writeFileSync(join(publicDir, "resume.json"), JSON.stringify(resume, null, 2));
writeFileSync(join(publicDir, "resume.md"),   markdown.trim());

console.log("✓ public/resume.json  (JSON Resume spec)");
console.log("✓ public/resume.md    (Markdown)");
