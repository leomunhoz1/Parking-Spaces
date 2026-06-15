import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceHtml = join(root, 'index.html');
const dist = join(root, 'dist');
const checkOnly = process.argv.includes('--check');
const errors = [];
const warnings = [];
const referencedFiles = new Set();

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function isExternalReference(value) {
  return (
    value.startsWith('#') ||
    value.startsWith('//') ||
    /^[a-z][a-z0-9+.-]*:/i.test(value)
  );
}

function stripUrlSuffix(value) {
  return value.split('#')[0].split('?')[0];
}

function pathExistsWithExactCase(baseDir, relativePath) {
  const parts = relativePath.split(/[\\/]+/).filter(Boolean);
  let current = baseDir;

  for (const part of parts) {
    if (!existsSync(current) || !statSync(current).isDirectory()) {
      return false;
    }

    const entries = readdirSync(current);
    if (!entries.includes(part)) {
      return false;
    }

    current = join(current, part);
  }

  return existsSync(current);
}

function validateHtml(html) {
  if (!/^<!doctype html>/i.test(html.trimStart())) {
    addError('index.html must start with a valid <!DOCTYPE html>.');
  }

  if (!/<html\b[^>]*\blang=["']pt-BR["']/i.test(html)) {
    addWarning('index.html should keep lang="pt-BR" for accessibility and SEO.');
  }

  if (!/<meta\b[^>]*charset=["']?utf-8/i.test(html)) {
    addError('index.html must declare UTF-8 encoding.');
  }

  if (!/<meta\b[^>]*name=["']viewport["'][^>]*>/i.test(html)) {
    addError('index.html must include a viewport meta tag.');
  }

  if (!/<title>[^<]+<\/title>/i.test(html)) {
    addError('index.html must include a non-empty title.');
  }

  if (html.includes('�')) {
    addWarning('index.html contains replacement characters; verify text encoding.');
  }

  const ids = new Set();
  for (const match of html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) {
    ids.add(match[1]);
  }

  for (const match of html.matchAll(/\bhref\s*=\s*["']#([^"']+)["']/gi)) {
    const target = match[1];
    if (target && !ids.has(target)) {
      addError(`Anchor href="#${target}" does not match any element id.`);
    }
  }

  for (const match of html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    const rawValue = match[1].trim();

    if (!rawValue || isExternalReference(rawValue)) {
      continue;
    }

    if (rawValue.includes('\\')) {
      addError(`Reference "${rawValue}" uses backslashes; use URL-style forward slashes.`);
      continue;
    }

    const cleanValue = stripUrlSuffix(rawValue);
    if (!cleanValue) {
      continue;
    }

    let decodedValue = cleanValue;
    try {
      decodedValue = decodeURIComponent(cleanValue);
    } catch {
      addError(`Reference "${rawValue}" is not a valid URL-encoded path.`);
      continue;
    }

    const relativePath = decodedValue.startsWith('/') ? decodedValue.slice(1) : decodedValue;
    const fullPath = resolve(root, relativePath);

    if (fullPath !== root && !fullPath.startsWith(root + sep)) {
      addError(`Reference "${rawValue}" points outside the project directory.`);
      continue;
    }

    if (!existsSync(fullPath)) {
      addError(`Referenced file "${relativePath}" was not found.`);
      continue;
    }

    if (!pathExistsWithExactCase(root, relativePath)) {
      addError(`Referenced file "${relativePath}" has casing that may fail on Linux.`);
      continue;
    }

    if (statSync(fullPath).isFile()) {
      referencedFiles.add(relativePath);
    }
  }
}

function copyOutput() {
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  copyFileSync(sourceHtml, join(dist, 'index.html'));
  copyFileSync(sourceHtml, join(dist, '404.html'));

  for (const relativePath of referencedFiles) {
    if (relativePath === 'index.html') {
      continue;
    }

    const source = join(root, relativePath);
    const target = join(dist, relativePath);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
}

if (!existsSync(sourceHtml)) {
  addError('index.html was not found at the project root.');
} else {
  validateHtml(readFileSync(sourceHtml, 'utf8'));
}

for (const warning of warnings) {
  console.warn(`[warn] ${warning}`);
}

if (errors.length > 0) {
  console.error('[error] Static validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

if (!checkOnly) {
  copyOutput();
  console.log(`[build] Static site written to ${relative(root, dist) || '.'}`);
} else {
  console.log('[check] Static site validation passed.');
}
