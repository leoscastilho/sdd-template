#!/usr/bin/env node
/**
 * scripts/spec/dashboard.mjs — render the spec corpus as one self-contained, local HTML dashboard.
 *
 * Zero dependencies (Node >= 18). Reads every spec under specs/, OPEN-QUESTIONS.md, ROADMAP.md and the
 * git file list, and prints an HTML page to stdout. `make spec-dashboard` writes it to
 * specs/__generated__/dashboard.html (gitignored) and opens it.
 *
 * Mirrors scripts/spec/_lib.sh on purpose: same spec-file filter, frontmatter rules, code roots,
 * ignored paths and glob semantics (`**` is treated as `*`, and `*` crosses `/`), so what the
 * dashboard shows agrees with make spec-lint / spec-drift / spec-audit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SPECS = path.join(ROOT, 'specs');
const TODAY = new Date().toISOString().slice(0, 10);
const STALE_DAYS = 30;
const FOLDERS = ['00-product', '01-architecture', '02-features', '03-contracts', '04-decisions'];
const SPEC_STATUSES = ['draft', 'approved', 'implementing', 'implemented', 'deprecated'];
const ADR_STATUSES = ['proposed', 'accepted', 'superseded', 'rejected'];

// ---------- discovery (mirrors _lib.sh) ----------
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const SKIP = new Set(['README.md', 'INDEX.md', 'OPEN-QUESTIONS.md', 'ROADMAP.md']);
const specPaths = walk(SPECS)
  .filter(p => p.endsWith('.md') && !SKIP.has(path.basename(p)) && !path.basename(p).startsWith('_'))
  .sort();

const PROJECT_NAME = process.env.SDD_PROJECT_NAME || 'SDD Kickstart';
const CODE_ROOTS = (process.env.SDD_CODE_ROOTS ?? 'apps packages services infra').split(/\s+/).filter(Boolean).map(r => r.replace(/\/$/, '') + '/');
const CODE_ROOT_FILES = (process.env.SDD_CODE_ROOT_FILES ?? 'docker-compose.yml docker-compose.*.yml compose.yml compose.yaml Dockerfile* nginx.conf').split(/\s+/).filter(Boolean);
const IGNORED = /(^|\/)__generated__\/|(^|\/)node_modules\/|\.lock$|(^|\/)package-lock\.json$|(^|\/)pnpm-lock\.yaml$|(^|\/)go\.sum$|(^|\/)dist\/|(^|\/)build\/|\.md$|(^|\/)README|\.(png|jpe?g|pdf|woff2?|ttf)$/;
const ROOT_CODE_FILE = CODE_ROOT_FILES.map(globToRegex);
const isCodePath = f => !IGNORED.test(f) && (CODE_ROOTS.some(r => f.startsWith(r)) || (!f.includes('/') && ROOT_CODE_FILE.some(re => re.test(f))));

function repoFiles() {
  try {
    const out = execSync('git ls-files; git ls-files --others --exclude-standard', { cwd: ROOT, encoding: 'utf8', shell: '/bin/bash', stdio: ['ignore', 'pipe', 'ignore'] });
    return [...new Set(out.split('\n').filter(f => f && fs.existsSync(path.join(ROOT, f))))].sort();
  } catch {
    return walk(ROOT).map(p => path.relative(ROOT, p)).sort();
  }
}

function globToRegex(glob) {
  let re = '';
  for (const ch of glob.replace(/\*\*/g, '*')) {
    if (ch === '*') re += '.*';
    else if (ch === '?') re += '.';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$');
}

// ---------- frontmatter ----------
function parseFrontmatter(text) {
  const lines = text.split('\n');
  if (lines[0] !== '---') return { fm: {}, body: text };
  const fm = {};
  let key = null, i = 1;
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (l === '---') { i++; break; }
    let m;
    if ((m = l.match(/^([A-Za-z_]+):\s*(.*)$/))) {
      key = m[1];
      const rest = m[2].trim();
      if (rest.startsWith('[')) { fm[key] = rest.replace(/[[\]"']/g, '').split(/,\s*/).map(s => s.trim()).filter(Boolean); key = null; }
      else if (rest === '') fm[key] = [];
      else { fm[key] = rest.replace(/^["']|["']$/g, ''); key = null; }
    } else if (key && (m = l.match(/^\s+-\s*(.*)$/))) {
      fm[key].push(m[1].replace(/^["']|["']$/g, ''));
    } else key = null;
  }
  return { fm, body: lines.slice(i).join('\n') };
}

// ---------- markdown (the subset the specs use) ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ID_RE = /\b(ADR-\d{4}|(?:P|ARCH|F|C)-[A-Z0-9]+(?:-[A-Z0-9]+)*)\b/g;
const Q_RE = /\bQ(\d{1,3})\b/g;
// code spans are swapped for an ASCII placeholder while the other inline rules run
const PH_OPEN = '@@CODE', PH_CLOSE = '@@', PH_RE = /@@CODE(\d+)@@/g;

// ctx.rel is the current file's path relative to ROOT; ctx.links collects resolved in-repo targets.
function resolveHref(u, ctx) {
  if (/^(https?:|mailto:)/.test(u)) return { href: u, ext: true };
  if (u.startsWith('#')) return { href: ctx.id ? `#spec/${ctx.id}` : `#file/${ctx.rel}` };
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(ctx.rel), u.split('#')[0]));
  if (ctx.byPath.has(target)) { ctx.links?.add(target); return { href: `#spec/${ctx.byPath.get(target)}` }; }
  if (target.endsWith('OPEN-QUESTIONS.md')) { ctx.links?.add(target); return { href: '#questions' }; }
  if (target.endsWith('ROADMAP.md')) { ctx.links?.add(target); return { href: '#roadmap' }; }
  if (ctx.files?.has(target)) { ctx.links?.add(target); return { href: `#file/${target}` }; }
  return { href: 'file://' + path.join(ROOT, target), ext: true };
}

function autolink(s, ctx) {
  // never re-link inside an anchor already produced by the markdown link rule
  return s.split(/(<a [^>]*>.*?<\/a>)/).map((part, k) => {
    if (k % 2) return part;
    return part
      .replace(ID_RE, id => (ctx.ids.has(id) && id !== ctx.id) ? `<a class="id" href="#spec/${id}">${id}</a>` : id)
      .replace(Q_RE, (m, n) => ctx.questions.has('Q' + n) ? `<a class="id q" href="#q/Q${n}">${m}</a>` : m);
  }).join('');
}

function inline(s, ctx) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(`<code>${esc(c)}</code>`); return PH_OPEN + (codes.length - 1) + PH_CLOSE; });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => { const r = resolveHref(u, ctx); return `<a href="${esc(r.href)}"${r.ext ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`; });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:]|$)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[\s(])_([^_\s][^_]*?)_(?=[\s).,;:]|$)/g, '$1<em>$2</em>');
  s = autolink(s, ctx);
  return s.replace(PH_RE, (_, i) => codes[i]);
}

const splitRow = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));

function renderList(lines, start, ctx) {
  const re = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  const items = [];
  let i = start;
  while (i < lines.length) {
    const l = lines[i], m = l.match(re);
    if (m) { items.push({ indent: m[1].length, ordered: /\d/.test(m[2]), text: m[3] }); i++; continue; }
    if (l.trim() !== '' && /^\s{2,}\S/.test(l) && items.length) { items[items.length - 1].text += ' ' + l.trim(); i++; continue; }
    break;
  }
  const root = { children: [] };
  const stack = [{ indent: -1, node: root }];
  for (const it of items) {
    const node = { ...it, children: [] };
    while (stack.length > 1 && stack[stack.length - 1].indent >= it.indent) stack.pop();
    stack[stack.length - 1].node.children.push(node);
    stack.push({ indent: it.indent, node });
  }
  const render = nodes => {
    if (!nodes.length) return '';
    const tag = nodes[0].ordered ? 'ol' : 'ul';
    return `<${tag}>` + nodes.map(n => {
      const task = n.text.match(/^\[( |x|X)\]\s+(.*)$/);
      const text = task ? task[2] : n.text;
      const cls = task ? (task[1] === ' ' ? ' class="task"' : ' class="task done"') : '';
      return `<li${cls}>${task ? '<span class="box"></span>' : ''}${inline(text, ctx)}${render(n.children)}</li>`;
    }).join('') + `</${tag}>`;
  };
  return [render(root.children), i];
}

function renderMd(src, ctx) {
  const lines = src.split('\n'), out = [], para = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '), ctx)}</p>`); para.length = 0; } };
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    let m;
    if (/^```/.test(l)) {
      flush(); const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); continue;
    }
    if ((m = l.match(/^(#{1,6})\s+(.*)$/))) {
      flush(); const lvl = m[1].length, hid = `${ctx.prefix}-${slug(m[2])}`;
      ctx.headings?.push({ level: lvl, text: m[2].replace(/[`*_]/g, ''), id: hid });
      out.push(`<h${lvl} id="${hid}">${inline(m[2], ctx)}</h${lvl}>`); i++; continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) { flush(); out.push('<hr>'); i++; continue; }
    if (/^>/.test(l)) {
      flush(); const buf = [];
      while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${renderMd(buf.join('\n'), ctx)}</blockquote>`); continue;
    }
    if (/^\s*\|/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      flush(); const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(splitRow(lines[i++]));
      const [head, , ...body] = rows;
      out.push('<div class="tbl"><table><thead><tr>' + head.map(c => `<th>${inline(c, ctx)}</th>`).join('') + '</tr></thead><tbody>'
        + body.map(r => '<tr>' + r.map(c => `<td>${inline(c, ctx)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(l)) { flush(); const [html, next] = renderList(lines, i, ctx); out.push(html); i = next; continue; }
    if (l.trim() === '') { flush(); i++; continue; }
    para.push(l.trim()); i++;
  }
  flush();
  return out.join('\n');
}

// ---------- spec body analysis ----------
function sections(body) {
  const out = [];
  let cur = { title: '', lines: [] };
  for (const l of body.split('\n')) {
    const m = l.match(/^##\s+(.*)$/);
    if (m) { out.push(cur); cur = { title: m[1].trim(), lines: [] }; } else cur.lines.push(l);
  }
  out.push(cur);
  return out;
}
const bullets = lines => {
  const items = [];
  for (const l of lines) {
    const m = l.match(/^\s*[-*]\s+(.*)$/);
    if (m) items.push(m[1]);
    else if (items.length && /^\s{2,}\S/.test(l)) items[items.length - 1] += ' ' + l.trim();
  }
  return items;
};
function summary(body) {
  const lines = body.split('\n');
  let i = lines.findIndex(l => /^#\s/.test(l));
  i = i < 0 ? 0 : i + 1;
  const para = [];
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (para.length && l.trim() === '') break;
    if (l.trim() === '' || /^(#|>|\||\s*[-*]\s|\*\*Derived from|\*\*Status|\*\*Date)/.test(l)) { if (para.length) break; continue; }
    para.push(l.trim());
  }
  return para.join(' ');
}
const uniq = a => [...new Set(a)];
const idsIn = (text, known) => uniq([...String(text).matchAll(ID_RE)].map(m => m[1]).filter(id => known.has(id)));
const qsIn = text => uniq([...String(text).matchAll(Q_RE)].map(m => 'Q' + m[1]));
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

// ---------- build ----------
const files = repoFiles();
const codeFiles = files.filter(isCodePath);
const rawSpecs = specPaths.map(p => {
  const rel = path.relative(SPECS, p).split(path.sep).join('/');
  const { fm, body } = parseFrontmatter(fs.readFileSync(p, 'utf8'));
  return { rel, fm, body, folder: rel.split('/')[0] };
});
const ids = new Set(rawSpecs.map(s => s.fm.id).filter(Boolean));
const byPath = new Map(rawSpecs.map(s => ['specs/' + s.rel, s.fm.id]));

// Every document the Files view shows: specs/ (md + yaml/json, not generated), root docs, and the agent tooling markdown.
const DOC_EXT = new Set(['md', 'yaml', 'yml', 'json']);
const relRoot = p => path.relative(ROOT, p).split(path.sep).join('/');
const docPaths = uniq([
  ...['AGENTS.md', 'CLAUDE.md', 'README.md', 'PRODUCT.md', 'DESIGN.md'].filter(f => fs.existsSync(path.join(ROOT, f))),
  ...walk(SPECS).map(relRoot).filter(f => DOC_EXT.has(path.extname(f).slice(1)) && !f.includes('/__generated__/')),
  ...(fs.existsSync(path.join(ROOT, 'docs')) ? walk(path.join(ROOT, 'docs')).map(relRoot).filter(f => f.endsWith('.md')) : []),
  ...['.claude', '.agents', '.codex'].flatMap(dir => walk(path.join(ROOT, dir)).map(relRoot).filter(f => f.endsWith('.md'))),
]).sort();
const docSet = new Set(docPaths);

const readOpt = f => fs.existsSync(path.join(SPECS, f)) ? fs.readFileSync(path.join(SPECS, f), 'utf8') : '';
const questionsText = readOpt('OPEN-QUESTIONS.md');
const roadmapText = readOpt('ROADMAP.md');

function parseQuestions(text) {
  const open = [], resolved = [];
  let cur = null, inResolved = false;
  for (const l of text.split('\n')) {
    let m;
    if ((m = l.match(/^###\s+(Q\d+)\s*[—–-]\s*(.*)$/))) { cur = { id: m[1], title: m[2].trim(), fields: {} }; open.push(cur); continue; }
    if (/^##\s+Resolved/.test(l)) { cur = null; inResolved = true; continue; }
    if (/^##?\s/.test(l)) { cur = null; inResolved = false; continue; }
    if (inResolved && /^\s*\|/.test(l)) {
      const c = splitRow(l);
      if (c.length >= 2 && !/^:?-+:?$/.test(c[0]) && c[0] !== 'Q') resolved.push({ q: c[0], resolution: c[1], id: (c[0].match(/\bQ\d+\b/) || [null])[0], adrs: idsIn(c[1], ids) });
      continue;
    }
    if (cur) {
      const parts = l.split(/\*\*([A-Za-z ]+):\*\*\s*/);
      for (let k = 1; k < parts.length; k += 2) {
        const key = parts[k].trim().toLowerCase();
        cur.fields[key] = ((cur.fields[key] || '') + ' ' + parts[k + 1].trim()).trim();
      }
    }
  }
  return { open, resolved };
}
const questionsRaw = parseQuestions(questionsText);
const questionIds = new Set([...questionsRaw.open.map(q => q.id), ...questionsRaw.resolved.map(r => r.id).filter(Boolean)]);

const specs = rawSpecs.map(s => {
  const ctx = { id: s.fm.id, rel: 'specs/' + s.rel, ids, byPath, questions: questionIds, prefix: slug(s.fm.id || s.rel), headings: [], links: new Set(), files: docSet };
  const secs = sections(s.body);
  const sec = t => secs.find(x => x.title.toLowerCase().startsWith(t));
  const isAdr = s.fm.type === 'decision';
  const meta = {};
  for (const key of ['Status', 'Date', 'Resolves', 'Affects']) {
    const m = s.body.match(new RegExp(`^\\*\\*${key}:\\*\\*\\s*(.*)$`, 'm'));
    if (m) meta[key.toLowerCase()] = m[1].trim();
  }
  const implementsList = (s.fm.implements || []).map(glob => {
    const re = globToRegex(glob);
    return { glob, files: codeFiles.filter(f => re.test(f)) };
  });
  const supersededBy = (s.body.match(/superseded by\s+(ADR-\d{4})/i) || [])[1];
  const html = renderMd(s.body, ctx);
  return {
    id: s.fm.id, title: s.fm.title || s.rel, type: s.fm.type || '', status: s.fm.status || '', folder: s.folder, rel: s.rel,
    file: 'file://' + path.join(SPECS, s.rel),
    lastReviewed: s.fm.last_reviewed || '', staleDays: s.fm.last_reviewed ? daysBetween(s.fm.last_reviewed, TODAY) : null,
    implements: implementsList,
    dependsOn: s.fm.depends_on || [], decisions: s.fm.decisions || [],
    summary: inline(summary(s.body), ctx),
    acceptance: bullets(sec('acceptance criteria')?.lines || []).map(t => inline(t, ctx)),
    ruledOut: bullets(sec(isAdr ? 'alternatives considered' : 'ruled out')?.lines || []).map(t => inline(t, ctx)),
    openQs: bullets(sec('open questions')?.lines || []).map(t => inline(t, ctx)),
    adr: isAdr ? { date: meta.date || '', resolves: qsIn(meta.resolves || ''), affects: idsIn(meta.affects || '', ids), supersededBy: supersededBy && ids.has(supersededBy) ? supersededBy : '', statusLine: meta.status ? inline(meta.status, ctx) : '' } : null,
    html, headings: ctx.headings, linksOut: [...ctx.links].filter(t => t !== 'specs/' + s.rel),
  };
});
const byId = new Map(specs.map(s => [s.id, s]));
for (const s of specs) {
  s.dependents = specs.filter(o => o.dependsOn.includes(s.id)).map(o => o.id);
  s.decidedFor = specs.filter(o => o.decisions.includes(s.id)).map(o => o.id);
  s.dangling = [...s.dependsOn, ...s.decisions].filter(id => !ids.has(id));
}

// open questions with resolved links + blocking flag
const qctx = { id: '', rel: 'specs/OPEN-QUESTIONS.md', ids, byPath, questions: questionIds, prefix: 'q', files: docSet };
const questions = questionsRaw.open.map(q => {
  const blocks = q.fields.blocks || '';
  const fields = Object.fromEntries(Object.entries(q.fields).map(([k, v]) => [k, inline(v, qctx)]));
  return { id: q.id, title: inline(q.title, qctx), rawTitle: q.title, fields, blocking: blocks !== '' && !/^nothing\b/i.test(blocks),
    blocksIds: idsIn(blocks, ids), affectsIds: idsIn(q.fields.affects || '', ids), hasOptions: !!q.fields.options, hasRecommendation: !!q.fields.recommendation };
});
const resolved = questionsRaw.resolved.map(r => ({ ...r, q: inline(r.q, qctx), resolution: inline(r.resolution, qctx) }));

// roadmap
function parseRoadmap(text) {
  const milestones = [], intro = [];
  let cur = null;
  for (const l of text.split('\n')) {
    let m;
    if ((m = l.match(/^##\s+(M\d+)\s*[—–-]\s*(.*?)(\s*\(current\))?\s*$/))) { cur = { id: m[1], title: m[2].trim(), current: !!m[3], intro: [], items: [] }; milestones.push(cur); continue; }
    if (!cur) { if (l.trim() && !/^#\s/.test(l)) intro.push(l.trim()); continue; }
    if ((m = l.match(/^\s*-\s*\[( |x|X)\]\s+(.*)$/))) { cur.items.push({ done: m[1] !== ' ', text: m[2].trim() }); continue; }
    if (l.trim()) cur.intro.push(l.trim());
  }
  return { intro: intro.join(' '), milestones };
}
const openQ = new Set(questions.map(q => q.id));
const rctx = { id: '', rel: 'specs/ROADMAP.md', ids, byPath, questions: questionIds, prefix: 'r', files: docSet };
const roadmapRaw = parseRoadmap(roadmapText);
const roadmap = {
  intro: inline(roadmapRaw.intro, rctx),
  milestones: roadmapRaw.milestones.map(ms => {
    const items = ms.items.map(it => {
      const all = idsIn(it.text, ids);
      const refs = all.filter(id => byId.get(id).type !== 'decision');
      const adrs = all.filter(id => byId.get(id).type === 'decision');
      const qs = qsIn(it.text);
      const statuses = refs.map(id => byId.get(id).status);
      const openQs = qs.filter(q => openQ.has(q));
      let derived;
      if (it.done) derived = 'done';
      else if (refs.length && statuses.every(st => st === 'implemented')) derived = 'built';
      else if (statuses.includes('implementing')) derived = 'in-progress';
      else if (openQs.length) derived = 'needs-decision';
      else if (statuses.includes('draft')) derived = 'spec-draft';
      else if (refs.length) derived = 'ready';
      else if (adrs.length && adrs.every(id => byId.get(id).status === 'accepted')) derived = 'ready'; // governed by accepted ADRs only
      else derived = 'unscoped';
      return { text: inline(it.text, rctx), done: it.done, refs, adrs, qs, openQs, derived };
    });
    const count = k => items.filter(i => i.derived === k).length;
    return { id: ms.id, title: ms.title, current: ms.current, intro: ms.intro.map(l => inline(l, rctx)), items,
      progress: { total: items.length, done: count('done'), built: count('built'), inProgress: count('in-progress'), ready: count('ready'), needsDecision: count('needs-decision'), specDraft: count('spec-draft'), unscoped: count('unscoped') } };
  }),
};

// traceability
const governing = new Map(codeFiles.map(f => [f, specs.filter(s => s.implements.some(g => g.files.includes(f))).map(s => s.id)]));
const trace = {
  codeFiles: codeFiles.length,
  claimed: codeFiles.filter(f => governing.get(f).length > 0).length,
  unclaimed: codeFiles.filter(f => governing.get(f).length === 0),
  overlaps: codeFiles.filter(f => governing.get(f).length > 1).map(f => ({ file: f, specs: governing.get(f) })),
  emptyClaims: specs.filter(s => ['implementing', 'implemented'].includes(s.status)).flatMap(s => s.implements.filter(g => !g.files.length).map(g => ({ spec: s.id, glob: g.glob, status: s.status }))),
  dangling: specs.filter(s => s.dangling.length).map(s => ({ spec: s.id, ids: s.dangling })),
};

// stats
const stats = {
  byStatus: Object.fromEntries([...SPEC_STATUSES, ...ADR_STATUSES].map(st => [st, specs.filter(s => s.status === st).length])),
  byFolder: FOLDERS.map(f => ({ folder: f, total: specs.filter(s => s.folder === f).length,
    statuses: Object.fromEntries((f === '04-decisions' ? ADR_STATUSES : SPEC_STATUSES).map(st => [st, specs.filter(s => s.folder === f && s.status === st).length])) })),
  stale: specs.filter(s => s.staleDays !== null && s.staleDays > STALE_DAYS).map(s => s.id),
  blockedSpecs: uniq(questions.filter(q => q.blocking).flatMap(q => q.blocksIds)).map(id => ({ id, status: byId.get(id).status, by: questions.filter(q => q.blocking && q.blocksIds.includes(id)).map(q => q.id) })),
  acceptanceTotal: specs.reduce((n, s) => n + s.acceptance.length, 0),
  ruledOutTotal: specs.reduce((n, s) => n + s.ruledOut.length, 0),
};

// ---------- files (markdown viewer) ----------
const docs = docPaths.map(rel => {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const ext = path.extname(rel).slice(1);
  const specId = byPath.get(rel) || null;
  const spec = specId ? byId.get(specId) : null;
  const base = path.basename(rel);
  let html, headings = [], links = [], fm = null;
  if (spec) { html = spec.html; headings = spec.headings; links = spec.linksOut; fm = parseFrontmatter(text).fm; }
  else if (ext === 'md') {
    const parsed = parseFrontmatter(text);
    fm = Object.keys(parsed.fm).length ? parsed.fm : null;
    const ctx = { id: '', rel, ids, byPath, questions: questionIds, prefix: 'f-' + slug(rel), headings, links: new Set(), files: docSet };
    html = renderMd(parsed.body, ctx);
    links = [...ctx.links].filter(t => t !== rel);
  } else html = `<pre class="raw"><code>${esc(text)}</code></pre>`;
  const kind = /^\.(claude|agents|codex)\//.test(rel) ? 'tooling' : rel.startsWith('docs/') ? 'guide' : spec ? spec.type : base.startsWith('_') ? 'template' : base === 'INDEX.md' ? 'generated' : ext === 'md' ? 'doc' : ext;
  // spec bodies are already embedded under DATA.specs; the client reads them via specId instead of a second copy
  return { rel, name: base, dir: path.posix.dirname(rel), ext, kind, size: Buffer.byteLength(text), lines: text.split('\n').length,
    specId, html: spec ? null : html, headings: spec ? null : headings, fm, linksOut: links, mentions: idsIn(text, ids).filter(id => id !== specId) };
});
for (const d of docs) {
  // the generated index links to and names every spec, so it carries no signal as a referrer
  const others = docs.filter(o => o.rel !== d.rel && o.kind !== 'generated');
  d.linkedFrom = others.filter(o => o.linksOut.includes(d.rel)).map(o => o.rel);
  d.mentionedBy = d.specId ? others.filter(o => o.mentions.includes(d.specId)).map(o => o.rel) : [];
}

let gitHead = '';
try { gitHead = execSync('git log -1 --format=%h%x20%s', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* not a git checkout */ }

const DATA = {
  projectName: PROJECT_NAME, codeRoots: CODE_ROOTS, codeRootFiles: CODE_ROOT_FILES,
  generatedAt: new Date().toISOString(), today: TODAY, staleDays: STALE_DAYS, root: ROOT, gitHead,
  folders: FOLDERS, specStatuses: SPEC_STATUSES, adrStatuses: ADR_STATUSES,
  specs, questions, resolved, roadmap, trace, stats, files: docs,
  graph: {
    nodes: specs.map(s => ({ id: s.id, title: s.title, type: s.type, status: s.status, folder: s.folder })),
    edges: specs.flatMap(s => [
      ...s.dependsOn.filter(t => ids.has(t)).map(t => ({ from: s.id, to: t, kind: 'depends' })),
      ...s.decisions.filter(t => ids.has(t)).map(t => ({ from: s.id, to: t, kind: 'decision' })),
    ]),
  },
};

// ---------- emit ----------
const css = fs.readFileSync(path.join(HERE, 'dashboard.css'), 'utf8');
const js = fs.readFileSync(path.join(HERE, 'dashboard.client.js'), 'utf8');
// safe to embed in a <script>: no "<" (so no "</script>") and no U+2028/U+2029 line terminators
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const json = JSON.stringify(DATA).replace(/</g, '\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');
process.stdout.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(PROJECT_NAME)} · Spec dashboard</title>
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
<div id="tip" hidden></div>
<script>const DATA = ${json};</script>
<script>
${js}
</script>
</body>
</html>
`);
