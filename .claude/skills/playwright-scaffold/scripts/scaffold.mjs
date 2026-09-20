#!/usr/bin/env node
/**
 * Scaffold a Playwright framework that follows the kit standards.
 *
 * node scaffold.mjs --target <dir> [--lang ts|js] [--pm pnpm|npm|yarn]
 *                   [--base-url <url>] [--api-base-url <url>] [--no-api]
 *                   [--project-name <name>] [--no-kit] [--force]
 *
 * Copies templates/common + templates/<lang> into <target>, replaces
 * {{TOKENS}}, optionally strips the API layer, and copies the kit
 * (.claude/rules, .claude/skills, .claude/agents, .claude/settings.json,
 * CLAUDE.md, scripts/) so the generated project is self-sufficient.
 * No dependencies beyond node:fs / node:path.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(here, '..');
const kitRoot = resolve(skillRoot, '..', '..', '..'); // <repo>/.claude/skills/playwright-scaffold → <repo>

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.target) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 14).join('\n'));
  process.exit(args.help ? 0 : 1);
}

const target = resolve(args.target);
const lang = args.lang ?? 'ts';
const pm = args.pm ?? 'pnpm';
const withApi = !args['no-api'];
const withKit = !args['no-kit'];
if (!['ts', 'js'].includes(lang)) fail(`--lang must be ts or js (got ${lang})`);
if (!['pnpm', 'npm', 'yarn'].includes(pm)) fail(`--pm must be pnpm, npm or yarn (got ${pm})`);

if (existsSync(target) && readdirSync(target).length > 0 && !args.force) {
  fail(`Target ${target} is not empty. Use --force to write into it anyway.`);
}
mkdirSync(target, { recursive: true });

const tokens = {
  PROJECT_NAME: args['project-name'] ?? basename(target).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
  BASE_URL: args['base-url'] ?? '',
  API_BASE_URL: args['api-base-url'] ?? '',
  PM: pm,
  PM_RUN: pm === 'npm' ? 'npm run' : pm,
  PM_EXEC: pm === 'pnpm' ? 'pnpm exec' : pm === 'npm' ? 'npx' : 'yarn',
  PACKAGE_MANAGER_FIELD: pm === 'pnpm' ? '\n  "packageManager": "pnpm@10.17.0",' : '',
  PM_INSTALL_CI: pm === 'pnpm' ? 'pnpm install --frozen-lockfile' : pm === 'npm' ? 'npm ci' : 'yarn install --frozen-lockfile',
  API_COMMANDS_SUFFIX: withApi ? ', api' : '',
};

copyTemplates(join(skillRoot, 'templates', 'common'));
copyTemplates(join(skillRoot, 'templates', lang));

if (withApi) dropApiMarkers();
else stripApiLayer();
if (withKit) {
  copyKit();
  const sync = join(target, 'scripts', 'sync-agent-config.mjs');
  if (existsSync(sync)) execFileSync(process.execPath, [sync], { cwd: target, stdio: 'inherit' });
}

console.log(`\n✅ Scaffolded ${lang.toUpperCase()} Playwright framework at ${target}`);
console.log(`
Next steps:
  cd ${target}
  cp .env.example .env            # fill BASE_URL, credentials${withApi ? ', API_BASE_URL' : ''}
  ${pm === 'pnpm' ? 'corepack pnpm' : pm} install
  ${tokens.PM_EXEC} playwright install chromium --with-deps
  ${tokens.PM_RUN} lint
  ${tokens.PM_RUN} test

Then implement authentication: scan the login page with playwright-cli and
update pages/login.${lang} + utils/e2e.${lang} (see SCAFFOLD comments), or delete
tests/setup and the storageState/dependencies entries if the app has no login.`);

// ---------------------------------------------------------------------------

function copyTemplates(dir) {
  if (!existsSync(dir)) return;
  for (const entry of walk(dir)) {
    const rel = entry.slice(dir.length + 1);
    const dest = join(target, rel.replace(/^_dot_/, '.').replace(/\/_dot_/g, '/.').replace(/\.tmpl$/, ''));
    mkdirSync(dirname(dest), { recursive: true });
    const raw = readFileSync(entry, 'utf8');
    writeFileSync(dest, replaceTokens(raw));
  }
}

function replaceTokens(text) {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (m, key) => (key in tokens ? tokens[key] : m));
}

function stripApiLayer() {
  for (const p of ['api', join('tests', 'api'), join('fixtures', `api.fixtures.${lang}`)]) {
    rmSync(join(target, p), { recursive: true, force: true });
  }
  for (const file of walk(target)) {
    if (file.includes(`${sep}.claude${sep}`)) continue;
    const text = readFileSync(file, 'utf8');
    if (!text.includes('@api-start')) continue;
    writeFileSync(file, text.replace(/[ \t]*(\/\/|#) @api-start[\s\S]*?(\/\/|#) @api-end[^\n]*\n?/g, ''));
  }
}

/** Keep the API layer but remove the marker comment lines themselves. */
function dropApiMarkers() {
  for (const file of walk(target)) {
    if (file.includes(`${sep}.claude${sep}`)) continue;
    const text = readFileSync(file, 'utf8');
    if (!text.includes('@api-start')) continue;
    writeFileSync(file, text.replace(/^[ \t]*(\/\/|#) @api-(start|end)[^\n]*\n/gm, ''));
  }
}

function copyKit() {
  const items = [
    ['.claude/rules', '.claude/rules'],
    ['.claude/skills', '.claude/skills'],
    ['.claude/agents', '.claude/agents'],
    ['.claude/settings.json', '.claude/settings.json'],
    ['CLAUDE.md', 'CLAUDE.md'],
    ['scripts/lint-changed.sh', 'scripts/lint-changed.sh'],
    ['scripts/sync-agent-config.mjs', 'scripts/sync-agent-config.mjs'],
    ['docs/agent-guide.md', 'docs/agent-guide.md'],
  ];
  for (const [from, to] of items) {
    const src = join(kitRoot, from);
    if (!existsSync(src)) continue;
    const dest = join(target, to);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true });
  }
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (key === 'help' || key.startsWith('no-') || key === 'force' || next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}
