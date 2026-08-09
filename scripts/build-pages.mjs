import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Public GitHub Pages build for the Explore Tikizia prototypes.
 *
 * The repository publishes ONLY what the prototypes need. Research, evidence, findings,
 * quotations and admin-derived data stay local and are excluded by .gitignore — this
 * script additionally refuses to publish anything that looks like private or production
 * data, so a mistake in .gitignore cannot leak through the build.
 *
 * Run: npm run build:pages
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'prototype');
const DIST = path.join(ROOT, 'dist');

/** Folders inside prototype/ that are published. `_review/` is internal QA and never ships. */
const DIRECTIONS = ['a-local-expert', 'b-chirripo', 'c-ladder'];
const ASSET_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg', '.woff2', '.css']);

/**
 * Real Google reviewers appear in the client's public testimonials. Republishing private
 * individuals by full name on a third-party domain is a different act from the client
 * publishing them on their own site, and we do not have their consent for it. The
 * testimonial text is what demonstrates the design, so the text stays and the
 * attribution is generalised. The local prototypes keep the real names for the
 * client presentation. Rodrigo Santamaria and Ligia Morera are the business owners
 * being featured, not third-party reviewers, so their names are not touched.
 */
const ATTRIBUTION_SUBSTITUTIONS = [
  [/Dave Faulders/g, 'Verified traveller'],
  [/Sofia Gonzales/g, 'Verified traveller']
];

/** Patterns that must never reach a public file. Each one throws rather than being stripped. */
const FORBIDDEN = [
  [/exploretikizia\.com/i, 'production domain'],
  [/wp-content\/uploads|shortpixel\.ai/i, 'production image asset reference'],
  [/\b(?:mailto|tel):/i, 'active email or phone link'],
  [/\b[A-Za-z0-9._%+-]+@(?!example\.com)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i, 'email address'],
  [/wa\.me\/\d|api\.whatsapp\.com/i, 'live WhatsApp link'],
  [/(?:instagram|facebook|youtube|tiktok|linkedin)\.com/i, 'social profile link'],
  [/googletagmanager\.com|gtag\(|GTM-[A-Z0-9]+/i, 'analytics tag'],
  [/Dave Faulders|Sofia Gonzales/i, 'named private individual']
];

/** Every published HTML page must carry these, and must not carry production SEO signals. */
const HTML_REQUIREMENTS = [
  [/<meta name="robots" content="noindex,nofollow">/i, 'missing noindex robots meta', false],
  [/<link rel="canonical"/i, 'canonical URL is not allowed', true],
  [/<meta property="og:url"/i, 'og:url is not allowed', true],
  [/<script type="application\/ld\+json"/i, 'JSON-LD is not allowed', true]
];

const hash = (content) => createHash('sha256').update(content).digest('hex').slice(0, 10);

function assertPublishable(content, label) {
  const flat = content.replace(/\s+/g, ' ');
  for (const [pattern, reason] of FORBIDDEN) {
    if (pattern.test(flat)) throw new Error(`${label}: ${reason} must not be published`);
  }
  // A Costa Rican phone number, with or without country code and separators.
  if (/(?:\+?506[\s.-]*)?[24678]\d{3}[\s.-]*\d{4}\b/.test(flat.replace(/\d{4}-\d{2}-\d{2}/g, ''))) {
    throw new Error(`${label}: phone-like number must not be published`);
  }
}

function assertHtmlSafe(html, label) {
  for (const [pattern, reason, mustNotMatch] of HTML_REQUIREMENTS) {
    const matched = pattern.test(html);
    if (mustNotMatch ? matched : !matched) throw new Error(`${label}: ${reason}`);
  }
  if (/(?:href|src)="\/(?!\/)/i.test(html)) {
    throw new Error(`${label}: root-relative path found; GitHub Pages serves from a subpath, use relative paths`);
  }
}

function sanitise(content) {
  let out = content;
  for (const [pattern, replacement] of ATTRIBUTION_SUBSTITUTIONS) out = out.replace(pattern, replacement);
  return out;
}

async function copyAssets(from, to) {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      await copyAssets(src, dest);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!ASSET_EXTENSIONS.has(ext)) throw new Error(`prototype/assets: unexpected file type ${entry.name}`);
    // Text assets can carry references; binary images cannot, so only text is scanned.
    if (ext === '.css' || ext === '.svg') {
      assertPublishable(await readFile(src, 'utf8'), path.relative(ROOT, src));
    }
    await copyFile(src, dest);
  }
}

async function buildDirection(dir) {
  const from = path.join(SRC, dir);
  const to = path.join(DIST, dir);
  await mkdir(to, { recursive: true });

  const entries = await readdir(from, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name);
  const htmlFiles = files.filter((f) => f.endsWith('.html'));
  const cssFiles = files.filter((f) => f.endsWith('.css'));
  const jsFiles = files.filter((f) => f.endsWith('.js'));

  // Content-hash CSS and JS so a redeploy is never served stale from cache — the client
  // reviewing an old version of a prototype is the failure mode this prevents.
  const renamed = new Map();
  for (const file of [...cssFiles, ...jsFiles]) {
    const raw = sanitise(await readFile(path.join(from, file), 'utf8'));
    assertPublishable(raw, `${dir}/${file}`);
    const ext = path.extname(file);
    const hashed = `${path.basename(file, ext)}.${hash(raw)}${ext}`;
    renamed.set(file, hashed);
    await writeFile(path.join(to, hashed), raw);
  }

  for (const file of htmlFiles) {
    let html = sanitise(await readFile(path.join(from, file), 'utf8'));
    for (const [original, hashed] of renamed) {
      html = html.replaceAll(`href="${original}"`, `href="${hashed}"`);
      html = html.replaceAll(`src="${original}"`, `src="${hashed}"`);
    }
    assertPublishable(html, `${dir}/${file}`);
    assertHtmlSafe(html, `${dir}/${file}`);
    await writeFile(path.join(to, file), html);
  }

  return { dir, html: htmlFiles.length, hashed: renamed.size };
}

export async function buildPages() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  await copyAssets(path.join(SRC, 'assets'), path.join(DIST, 'assets'));

  const chooser = sanitise(await readFile(path.join(SRC, 'index.html'), 'utf8'));
  assertPublishable(chooser, 'index.html');
  assertHtmlSafe(chooser, 'index.html');
  await writeFile(path.join(DIST, 'index.html'), chooser);

  // GitHub Pages runs Jekyll by default and would skip the _review-style underscore
  // convention plus anything it considers a source file. This opts out entirely.
  await writeFile(path.join(DIST, '.nojekyll'), '');

  const built = [];
  for (const dir of DIRECTIONS) built.push(await buildDirection(dir));

  console.log(`  index.html`);
  for (const b of built) console.log(`  ${b.dir}/ — ${b.html} pages, ${b.hashed} hashed assets`);
  console.log(`\n  dist/ ready. Nothing outside prototype/ was published.`);
  return built;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildPages().catch((e) => { console.error(`\n  BUILD REFUSED — ${e.message}\n`); process.exit(1); });
}
