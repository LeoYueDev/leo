# i18n Internationalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-language support with UI strings and portfolio content in YAML locale blocks, React Context for runtime switching.

**Architecture:** `portfolio.config.yaml` → Vite → TypeScript types → React Context (`I18nProvider`) → all components read via `useI18n().t()` and `useI18n().content`. Language switcher in navbar. No external i18n library.

**Tech Stack:** React Context API, TypeScript, YAML (existing @rollup/plugin-yaml)

---

### Task 1: i18n core infrastructure

**Files:**
- Create: `src/lib/i18n.tsx`
- Modify: `src/portfolio.config.ts`

- [ ] **Step 1: Add i18n types to portfolio.config.ts**

Add new types after existing types:

```typescript
// ── i18n types ──────────────────────────────────────────────────

export interface LanguageEntry {
  code: string;
  label: string;
}

export interface LocaleUI {
  about: string;
  stats: string;
  skills: string;
  languages: string;
  experience: string;
  projects: string;
  education: string;
  certifications: string;
  publications: string;
  testimonials: string;
  contact: string;
  more: string;
  blog: string;
  resume: string;
  downloadResume: string;
  openToOpportunities: string;
  viewMyWork: string;
  viewResume: string;
  scrollDown: string;
  aboutMe: string;
  aboutHeading: string;
  toolbox: string;
  skillsTitle: string;
  careerPath: string;
  experienceHeading: string;
  featuredWork: string;
  projectsHeading: string;
  viewProject: string;
  sourceCode: string;
  educationHeading: string;
  certificationsHeading: string;
  publicationsHeading: string;
  conference: string;
  journal: string;
  preprint: string;
  testimonialsHeading: string;
  getInTouch: string;
  contactTitle: string;
  contactDescription: string;
  yourName: string;
  yourEmail: string;
  message: string;
  messagePlaceholder: string;
  sendMessage: string;
  sending: string;
  openInEmailApp: string;
  orEmailDirectly: string;
  messageSent: string;
  somethingWentWrong: string;
  sharePortfolio: string;
  builtWith: string;
  forkAndMakeYours: string;
  whatsNew: string;
  shareTitle: string;
  copyLink: string;
  linkCopied: string;
  shareOn: string;
  copySectionLink: string;
  copied: string;
  switchLanguage: string;
  portfolio: string;
  twoColumn: string;
  classic: string;
  share: string;
  savePdf: string;
  summary: string;
  ghStats: string;
}

export interface LocaleContent {
  name: string;
  title: string;
  tagline: string;
  location: string;
  about: string;
  resumeUrl: string;
  resumeFileName: string;
  stats: Stat[];
  languages: Language[];
  skills: { category: string; items: string[] }[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  certifications: Certification[];
  publications: Publication[];
  testimonials: Testimonial[];
  ui: LocaleUI;
}
```

And add `defaultLanguage` and `languages` to the `config` object and rawConfig type:

```typescript
const rawConfig = rawConfigYaml as unknown as {
  // existing fields...
  defaultLanguage: string;
  languages: { code: string; label: string }[];
  // locale blocks are dynamic keys
  [locale: string]: any;
};
```

Add `getContent` export:

```typescript
export function getContent(locale: string): LocaleContent {
  const raw = rawConfigYaml as unknown as Record<string, any>;
  return raw[locale] ?? raw[rawConfig.defaultLanguage ?? 'en'];
}

// Add to config object:
const raw = rawConfigYaml as unknown as Record<string, any>;
export const config = {
  ...rawConfig,
  defaultLanguage: raw.defaultLanguage ?? 'en',
  languages: (raw.languages ?? [{ code: 'en', label: 'English' }]) as LanguageEntry[],
  // ... rest of existing config
};
```

- [ ] **Step 2: Create src/lib/i18n.tsx**

```typescript
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getContent, config } from '@/portfolio.config';
import type { LocaleContent } from '@/portfolio.config';

interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string) => string;
  content: LocaleContent;
}

const FALLBACK_LOCALE = config.defaultLanguage ?? 'en';

function detectInitialLocale(): string {
  const stored = localStorage.getItem('locale');
  if (stored && config.languages.some((l) => l.code === stored)) return stored;

  const browserLang = navigator.language?.split('-')[0];
  if (browserLang && config.languages.some((l) => l.code === browserLang)) return browserLang;

  return FALLBACK_LOCALE;
}

function resolveNested(obj: Record<string, any>, path: string): string {
  const keys = path.split('.');
  let current: any = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path;
    current = current[key];
  }
  return typeof current === 'string' ? current : path;
}

export const I18nContext = createContext<I18nContextType>({
  locale: FALLBACK_LOCALE,
  setLocale: () => {},
  t: (key: string) => key,
  content: {} as LocaleContent,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(detectInitialLocale);

  const content: LocaleContent = getContent(locale);

  const setLocale = useCallback((newLocale: string) => {
    localStorage.setItem('locale', newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (key: string): string => {
      return resolveNested(content as unknown as Record<string, any>, key);
    },
    [content]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, content }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  return useI18n().t;
}
```

- [ ] **Step 3: Build check**

Run: `pnpm typecheck`
Expected: Should pass or show errors only related to missing config fields (which we'll fix in later tasks)

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n.tsx src/portfolio.config.ts
git commit -m "feat: add i18n core infrastructure (context, types, content accessor)"
```

---

### Task 2: LanguageSwitcher component

**Files:**
- Create: `src/components/layout/LanguageSwitcher.tsx`

- [ ] **Step 1: Create LanguageSwitcher.tsx**

```typescript
import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { config } from '@/portfolio.config';
import { useI18n } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentLang = config.languages.find((l) => l.code === locale);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="border-border hover:border-primary/40 bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-full border p-2 transition-all"
        aria-label="Switch language"
      >
        <Globe size={16} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="bg-background border-border absolute right-0 top-full z-50 mt-2 w-32 overflow-hidden rounded-xl border py-1 shadow-lg"
          >
            {config.languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLocale(lang.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center px-4 py-2 text-left text-xs font-medium tracking-widest uppercase transition-colors ${
                  locale === lang.code
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

Run: `pnpm typecheck`
Expected: Should pass

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/LanguageSwitcher.tsx
git commit -m "feat: add LanguageSwitcher component"
```

---

### Task 3: Wire I18nProvider in App.tsx + Navbar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: Wrap App with I18nProvider**

In `src/App.tsx`:
- Add import: `import { I18nProvider } from '@/lib/i18n';`
- Wrap everything inside `<Router>` (but outside `<MotionConfig>`) with `<I18nProvider>`

```typescript
return (
  <MotionConfig reducedMotion="user">
    <I18nProvider>
      <Router hook={useHashLocation}>
        <Suspense fallback={null}>
          <Switch>
            {/* ... all existing routes ... */}
          </Switch>
        </Suspense>
      </Router>

      <div className="fixed right-4 bottom-4 z-50">
        <SimpleChat />
      </div>
    </I18nProvider>
  </MotionConfig>
);
```

- [ ] **Step 2: Update Navbar to use t() + add LanguageSwitcher**

In `src/components/layout/Navbar.tsx`:
- Add import: `import { useI18n } from '@/lib/i18n';`
- Add import: `import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';`
- Inside the component body, add: `const { t } = useI18n();`
- Replace `SECTION_LABELS` usage with `t()`: `label: t(`ui.${s.id}`)`
- Replace hardcoded strings:
  - "More" → `t('ui.more')`
  - "Blog" → `t('ui.blog')`
  - "Resume" → `t('ui.resume')`
- Add `<LanguageSwitcher />` next to the theme toggle button

Remove the `SECTION_LABELS` constant entirely since labels come from translations now.

- [ ] **Step 3: Build check**

Run: `pnpm typecheck`
Expected: Should pass

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/layout/Navbar.tsx
git commit -m "feat: wire I18nProvider in App, update Navbar with translations"
```

---

### Task 4: Hero + About + Skills sections

**Files:**
- Modify: `src/components/sections/Hero.tsx`
- Modify: `src/components/sections/About.tsx`
- Modify: `src/components/sections/Skills.tsx`

- [ ] **Step 1: Update Hero.tsx**

Add import: `import { useI18n } from '@/lib/i18n';`

In component body:
```typescript
const { content, t } = useI18n();
```

Replace:
- `config.name` → `content.name`
- `config.title` → `content.title`
- `config.tagline` → `content.tagline`
- `config.location` → `content.location`
- `"Open to opportunities"` → `t('ui.openToOpportunities')`
- `"View My Work"` → `t('ui.viewMyWork')`
- `"View Resume"` → `t('ui.viewResume')`
- `"Scroll down"` aria-label → `t('ui.scrollDown')`

Keep using `config.avatarUrl`, `config.openToWork`, `config.phone`, `config.social`, `config.email` (non-translatable).

- [ ] **Step 2: Update About.tsx**

Add import: `import { useI18n } from '@/lib/i18n';`

In component body:
```typescript
const { content, t } = useI18n();
```

Replace:
- `"About Me"` → `t('ui.aboutMe')`
- `"The person behind\nthe keyboard."` → `t('ui.aboutHeading')`
- `"Languages"` → `t('ui.languages')`
- `config.about` → `content.about`
- `config.languages` → `content.languages`
- stat default labels: `"Years Experience"`, `"Projects Shipped"`, etc → `content.stats[i].label` (these come from user's locale data, not hardcoded)
- Keep using `config.email`, `config.skills` for the stats computation

- [ ] **Step 3: Update Skills.tsx**

Add import: `import { useI18n } from '@/lib/i18n';`

In component body:
```typescript
const { content, t } = useI18n();
```

Replace:
- `"Toolbox"` → `t('ui.toolbox')`
- `"Skills & Technologies"` → `t('ui.skillsTitle')`
- `config.skills` → `content.skills`

- [ ] **Step 4: Build check**

Run: `pnpm typecheck`
Expected: Should pass

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Hero.tsx src/components/sections/About.tsx src/components/sections/Skills.tsx
git commit -m "feat: update Hero, About, Skills sections for i18n"
```

---

### Task 5: Languages + Stats + GitHubStats + Education sections

**Files:**
- Modify: `src/components/sections/Languages.tsx`
- Modify: `src/components/sections/Stats.tsx`
- Modify: `src/components/sections/GitHubStats.tsx`
- Modify: `src/components/sections/Education.tsx`

- [ ] **Step 1: Update Languages.tsx**

Add useI18n, replace:
- `config.languages` → `content.languages`
- Section heading hardcoded text → `t('ui.languages')`

- [ ] **Step 2: Update Stats.tsx**

Read the file first to confirm its content.

Add useI18n, replace:
- Hardcoded section heading → `t('ui.stats')`
- `config.stats` → `content.stats`

- [ ] **Step 3: Update GitHubStats.tsx**

Read the file first, add useI18n, replace hardcoded heading → `t('ui.ghStats')`

- [ ] **Step 4: Update Education.tsx**

Add useI18n, replace:
- Hardcoded heading → `t('ui.educationHeading')`
- `config.education` → `content.education`

- [ ] **Step 5: Build check**

Run: `pnpm typecheck`
Expected: Should pass

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/Languages.tsx src/components/sections/Stats.tsx src/components/sections/GitHubStats.tsx src/components/sections/Education.tsx
git commit -m "feat: update Languages, Stats, GitHubStats, Education sections for i18n"
```

---

### Task 6: Experience + Projects sections

**Files:**
- Modify: `src/components/sections/Experience.tsx`
- Modify: `src/components/sections/Projects.tsx`

- [ ] **Step 1: Update Experience.tsx**

Read the file first. Add useI18n, replace:
- Hardcoded heading "Career Path" → `t('ui.careerPath')`
- Hardcoded subheading `"The journey\nso far."` → `t('ui.experienceHeading')`
- `config.experience` → `content.experience`

- [ ] **Step 2: Update Projects.tsx**

Read the file first. Add useI18n, replace:
- Hardcoded heading "Featured Work" → `t('ui.featuredWork')`
- Hardcoded subheading → `t('ui.projectsHeading')`
- `"View Project"` → `t('ui.viewProject')`
- `"Source Code"` → `t('ui.sourceCode')`
- `config.projects` → `content.projects`

- [ ] **Step 3: Build check**

Run: `pnpm typecheck`
Expected: Should pass

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/Experience.tsx src/components/sections/Projects.tsx
git commit -m "feat: update Experience, Projects sections for i18n"
```

---

### Task 7: Certifications + Publications + Testimonials sections

**Files:**
- Modify: `src/components/sections/Certifications.tsx`
- Modify: `src/components/sections/Publications.tsx`
- Modify: `src/components/sections/Testimonials.tsx`

- [ ] **Step 1: Update Certifications.tsx**

Add useI18n, replace:
- Hardcoded heading → `t('ui.certificationsHeading')`
- `config.certifications` → `content.certifications`

- [ ] **Step 2: Update Publications.tsx**

Add useI18n, replace:
- Hardcoded heading → `t('ui.publicationsHeading')`
- `"Conference"` → `t('ui.conference')`
- `"Journal"` → `t('ui.journal')`
- `"Preprint"` → `t('ui.preprint')`
- `config.publications` → `content.publications`

- [ ] **Step 3: Update Testimonials.tsx**

Add useI18n, replace:
- Hardcoded heading → `t('ui.testimonialsHeading')`
- `config.testimonials` → `content.testimonials`

- [ ] **Step 4: Build check**

Run: `pnpm typecheck`
Expected: Should pass

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Certifications.tsx src/components/sections/Publications.tsx src/components/sections/Testimonials.tsx
git commit -m "feat: update Certifications, Publications, Testimonials sections for i18n"
```

---

### Task 8: Contact section + Modals

**Files:**
- Modify: `src/components/sections/Contact.tsx`
- Modify: `src/components/ShareModal.tsx`
- Modify: `src/components/ChangelogModal.tsx`

- [ ] **Step 1: Update Contact.tsx**

Add import: `import { useI18n } from '@/lib/i18n';`

In component body:
```typescript
const { content, t } = useI18n();
```

Replace all hardcoded UI strings:
- `config.contactHeading ?? 'Get In Touch'` → `t('ui.getInTouch')`
- `config.contactTitle ?? 'Let\'s work\ntogether.'` → `t('ui.contactTitle')`
- `config.contactDescription ?? 'Open to new opportunities...'` → `t('ui.contactDescription')`
- `"Your name"` → `t('ui.yourName')`
- `"Your email"` → `t('ui.yourEmail')`
- `"Message"` → `t('ui.message')`
- `"Tell me about your project or opportunity…"` → `t('ui.messagePlaceholder')`
- `"Send message"` → `t('ui.sendMessage')`
- `"Sending…"` → `t('ui.sending')`
- `"Open in email app"` → `t('ui.openInEmailApp')`
- `"Or email directly →"` → `t('ui.orEmailDirectly')`
- `"Message sent!..."` → `t('ui.messageSent')`
- `"Something went wrong..."` → `t('ui.somethingWentWrong')`
- `"Download Resume"` → `t('ui.downloadResume')`
- `"Share Portfolio"` → `t('ui.sharePortfolio')`
- `"Built with"` → `t('ui.builtWith')`
- `"fork and make it yours."` → `t('ui.forkAndMakeYours')`
- `"What's new in v1.3"` → `t('ui.whatsNew')`

- [ ] **Step 2: Update ShareModal.tsx**

Add useI18n/useT, replace:
- `"Share your portfolio"` → `t('ui.shareTitle')`
- `"Portfolio link"` → `t('ui.shareTitle')` or similar
- `"Share on"` → `t('ui.shareOn')`
- `"Copy link"` aria-label → `t('ui.copyLink')`
- `"Download PNG"` → (keep as is or add to UI strings)
- `"Email signature"` → (keep)
- `"Copy HTML"` → (keep)

Only translate the key UI strings that make sense. Keep technical strings like "Download PNG", "Email signature", "Copy HTML" as they are generally understood.

- [ ] **Step 3: Update ChangelogModal.tsx**

Add useT, replace:
- `"What's new in GitVitae"` → `t('ui.whatsNew')` (or close enough)
- `"View on GitHub"` → keep as-is (product name)
- `"Close"` aria-label → keep

- [ ] **Step 4: Build check**

Run: `pnpm typecheck`
Expected: Should pass

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Contact.tsx src/components/ShareModal.tsx src/components/ChangelogModal.tsx
git commit -m "feat: update Contact, ShareModal, ChangelogModal for i18n"
```

---

### Task 9: Portfolio page + resume page

**Files:**
- Modify: `src/pages/portfolio.tsx`
- Modify: `src/pages/resume/index.tsx`

- [ ] **Step 1: Update portfolio.tsx**

Add import: `import { useI18n } from '@/lib/i18n';`

Inside `SectionWrapper` or at page level, add:
```typescript
const { t } = useI18n();
```

Replace:
- `"Copied!"` → `t('ui.copied')`
- `"Copy link"` → `t('ui.copySectionLink')`
- `"Made with GitVitae"` → keep as-is (product name)

- [ ] **Step 2: Update resume page**

Add import: `import { useI18n } from '@/lib/i18n';`

Inside `ResumePage`:
```typescript
const { content, t } = useI18n();
```

Replace:
- `config.name` → `content.name`
- `config.title` → `content.title`
- `config.location` → `content.location`
- `"Portfolio"` (back link) → `t('ui.portfolio')`
- `"Two Column"` → `t('ui.twoColumn')`
- `"Classic"` → `t('ui.classic')`
- `"Share"` → `t('ui.share')`
- `"Save PDF"` → `t('ui.savePdf')`
- All `SectionLabel` texts: `"Experience"`, `"Projects"`, `"Skills"`, `"Education"`, `"Certifications"`, `"Languages"`, `"Publications"`, `"Summary"` → `t('ui.summary')`

- [ ] **Step 3: Build check**

Run: `pnpm typecheck`
Expected: Should pass

- [ ] **Step 4: Commit**

```bash
git add src/pages/portfolio.tsx src/pages/resume/index.tsx
git commit -m "feat: update portfolio and resume pages for i18n"
```

---

### Task 10: portfolio.config.yaml restructure

**Files:**
- Modify: `portfolio.config.yaml`

- [ ] **Step 1: Restructure config to locale blocks**

Move all translatable content under `en:` block. Add `defaultLanguage` and `languages`. Add empty `zh:` block.

The structure becomes:
```yaml
defaultLanguage: "en"
languages:
  - { code: "en", label: "English" }
  - { code: "zh", label: "中文" }

en:
  name: "Leo Peng Yue"
  title: "AI Engineer"
  tagline: "I build free portfolios and resumes for everyone."
  location: "Chengdu, China"
  about: |
    Hi, I'm Leo — AI Engineer...
  stats:
    - { label: "Years Experience", value: 4, suffix: "+" }
    - { label: "Projects Shipped", value: 20, suffix: "+" }
  skills:
    - category: "LLM & Application"
      items: [LangChain, LangGraph, RAG, AI Agent, MCP Protocol, Prompt Engineering]
  experience:
    - company: "NCS China"
      role: "AI Engineer"
      period: "2026.06 – Present"
      description: "..."
      highlights: [""]
  projects:
    - name: "..."
      description: "..."
      tags: [...]
      liveUrl: ""
      repoUrl: ""
      featured: true
  education:
    - institution: "Leshan Normal University"
      degree: "B.S. Computer Science and Technology"
      period: "2018 – 2022"
  languages:
    - { name: "Chinese", level: "Native" }
    - { name: "English", level: "Conversational" }
  resumeUrl: ""
  resumeFileName: ""
  ui:
    about: "About"
    stats: "Stats"
    # ... all UI strings
```

- [ ] **Step 2: Run check-config**

Run: `pnpm check-config`
Expected: May need to update check-config first (Task 11 handles this). For now, just ensure it doesn't crash on the new structure.

- [ ] **Step 3: Build check**

Run: `pnpm typecheck && pnpm build`
Expected: Should pass

- [ ] **Step 4: Commit**

```bash
git add portfolio.config.yaml
git commit -m "feat: restructure portfolio.config.yaml for i18n locale blocks"
```

---

### Task 11: check-config + migration script + resume script

**Files:**
- Modify: `scripts/check-config.mjs`
- Modify: `scripts/generate-resume.mjs`
- Create: `scripts/migrate-config.mjs`

- [ ] **Step 1: Read current check-config.mjs**

Read `scripts/check-config.mjs` to understand current validation logic, then add locale validation.

- [ ] **Step 2: Update check-config.mjs to validate locale blocks**

Add checks:
- If `defaultLanguage` is present, validate it matches one of `languages` codes
- Validate each locale block has required fields
- If `defaultLanguage` is absent, treat as old format (warn user to run migrate-config)

- [ ] **Step 3: Read current generate-resume.mjs**

Read `scripts/generate-resume.mjs`, add `--locale` argument support.

- [ ] **Step 4: Update generate-resume.mjs to accept --locale**

```javascript
const args = process.argv.slice(2);
const localeIndex = args.indexOf('--locale');
const locale = localeIndex >= 0 ? args[localeIndex + 1] : null;

// Then read content from yamlConfig[locale] instead of top-level
const content = locale ? yamlConfig[locale] : yamlConfig;
// Fallback to top-level for backward compatibility
const data = content ?? yamlConfig;
```

- [ ] **Step 5: Create migration script**

Create `scripts/migrate-config.mjs`:

```javascript
#!/usr/bin/env node
import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { load, dump } from 'js-yaml';

const CONFIG_PATH = 'portfolio.config.yaml';
const BACKUP_PATH = 'portfolio.config.yaml.bak';

// Read config
const yaml = readFileSync(CONFIG_PATH, 'utf8');
const data = load(yaml);

if (data.defaultLanguage) {
  console.log('Config already has locale blocks. Nothing to migrate.');
  process.exit(0);
}

// Backup
copyFileSync(CONFIG_PATH, BACKUP_PATH);
console.log(`Backup saved to ${BACKUP_PATH}`);

// Translatable field keys
const translatableKeys = [
  'name', 'title', 'tagline', 'location', 'about',
  'stats', 'skills', 'experience', 'projects', 'education',
  'languages', 'certifications', 'publications', 'testimonials',
  'resumeUrl', 'resumeFileName',
];

// Build en block
const en = {};
for (const key of translatableKeys) {
  if (key in data) {
    en[key] = data[key];
    delete data[key];
  }
}

// Add default UI strings
en.ui = {
  about: 'About',
  stats: 'Stats',
  skills: 'Skills',
  languages: 'Languages',
  experience: 'Experience',
  projects: 'Projects',
  education: 'Education',
  certifications: 'Certifications',
  publications: 'Publications',
  testimonials: 'Testimonials',
  contact: 'Contact',
  more: 'More',
  blog: 'Blog',
  resume: 'Resume',
  downloadResume: 'Download Resume',
  openToOpportunities: 'Open to opportunities',
  viewMyWork: 'View My Work',
  viewResume: 'View Resume',
  scrollDown: 'Scroll down',
  aboutMe: 'About Me',
  aboutHeading: 'The person behind\nthe keyboard.',
  toolbox: 'Toolbox',
  skillsTitle: 'Skills & Technologies',
  careerPath: 'Career Path',
  experienceHeading: 'The journey\nso far.',
  featuredWork: 'Featured Work',
  projectsHeading: "Things I've\nbuilt.",
  viewProject: 'View Project',
  sourceCode: 'Source Code',
  educationHeading: 'Education',
  certificationsHeading: 'Certifications',
  publicationsHeading: 'Publications',
  ghStats: 'GitHub Statistics',
  getInTouch: 'Get In Touch',
  contactTitle: "Let's work\ntogether.",
  yourName: 'Your name',
  yourEmail: 'Your email',
  message: 'Message',
  sendMessage: 'Send message',
  sending: 'Sending…',
  copyLink: 'Copy link',
  copied: 'Copied!',
  switchLanguage: 'Switch language',
};

// Add locale metadata
data.defaultLanguage = 'en';
data.languages = [{ code: 'en', label: 'English' }];
data.en = en;
data.zh = {
  name: '',
  title: '',
  tagline: '',
  location: '',
  about: '',
  stats: [],
  skills: [],
  experience: [],
  projects: [],
  education: [],
  languages: [],
  certifications: [],
  publications: [],
  testimonials: [],
  resumeUrl: '',
  resumeFileName: '',
  ui: {},
};

// Write
const outYaml = dump(data, { lineWidth: 120, noRefs: true, quotingType: '"', forceQuotes: false });
writeFileSync(CONFIG_PATH, outYaml, 'utf8');
console.log('Migration complete! Added en and zh locale blocks.');
```

- [ ] **Step 6: Run checks**

Run: `pnpm check-config`
Expected: Should pass with new locale validation

- [ ] **Step 7: Commit**

```bash
git add scripts/check-config.mjs scripts/generate-resume.mjs scripts/migrate-config.mjs
git commit -m "feat: update check-config, generate-resume for i18n; add migration script"
```

---

### Task 12: Final verification

- [ ] **Step 1: Full typecheck**

Run: `pnpm typecheck`
Expected: All types correct

- [ ] **Step 2: Full lint**

Run: `pnpm lint`
Expected: No errors (or pre-existing issues only)

- [ ] **Step 3: Dev server test**

Run: `pnpm dev`
Expected: Dev server starts, portfolio loads with English content, language switcher visible, switching to Chinese shows translated content, switching back to English works

- [ ] **Step 4: Build test**

Run: `pnpm build`
Expected: Build succeeds
