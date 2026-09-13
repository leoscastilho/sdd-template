/* scripts/spec/dashboard.client.js — inlined into the generated dashboard. Reads the DATA object emitted by dashboard.mjs. */
'use strict';
const h = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const byId = new Map(DATA.specs.map(s => [s.id, s]));
const qById = new Map(DATA.questions.map(q => [q.id, q]));
const FOLDER_LABEL = { '00-product': 'Product', '01-architecture': 'Architecture', '02-features': 'Features', '03-contracts': 'Contracts', '04-decisions': 'Decisions' };
const DERIVED = { done: 'done', built: 'built, untick', 'in-progress': 'in progress', 'needs-decision': 'needs decision', 'spec-draft': 'spec is draft', ready: 'ready to build', unscoped: 'no spec ref' };
const DERIVED_ORDER = ['done', 'built', 'in-progress', 'ready', 'needs-decision', 'spec-draft', 'unscoped'];
const NAV = [['start', 'Get started'], ['overview', 'Overview'], ['questions', 'Open questions'], ['roadmap', 'Roadmap'], ['specs', 'Specs'], ['files', 'Files'], ['graph', 'Graph'], ['trace', 'Traceability'], ['glossary', 'SDD glossary']];
const nonAdr = DATA.specs.filter(s => s.type !== 'decision');
const adrs = DATA.specs.filter(s => s.type === 'decision');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const pill = (st, cls = 'st') => `<span class="pill ${cls}-${h(st)}">${h(cls === 'd' ? DERIVED[st] || st : st)}</span>`;
const idLink = id => { const s = byId.get(id); return s ? `<a class="id" href="#spec/${h(id)}" data-tip="${h(s.title)} · ${h(s.status)}">${h(id)}</a>` : `<span class="id missing" data-tip="no spec with this id">${h(id)}</span>`; };
const qLink = id => qById.has(id) ? `<a class="id q" href="#q/${h(id)}" data-tip="${h(qById.get(id).rawTitle)}">${h(id)}</a>` : `<span class="id resolved" data-tip="resolved">${h(id)}</span>`;
const idList = ids => ids.length ? `<div class="ids">${ids.map(idLink).join('')}</div>` : '<span class="empty">none</span>';
const stale = s => s.staleDays !== null && s.staleDays > DATA.staleDays;

// ---------- shell ----------
const app = document.getElementById('app');
function shell() {
  const counts = { questions: DATA.questions.length, specs: DATA.specs.length, files: DATA.files.length, trace: DATA.trace.unclaimed.length || '', roadmap: DATA.roadmap.milestones.length };
  app.innerHTML = `
    <aside class="side">
      <div class="brand">${h(DATA.projectName)}<small>Spec-driven dashboard</small></div>
      <nav>${NAV.map(([k, l]) => `<a href="#${k}" data-view="${k}">${l}<span class="n">${counts[k] ?? ''}</span></a>`).join('')}</nav>
      <div class="theme">${['system', 'light', 'dark'].map(t => `<button data-theme="${t}">${t}</button>`).join('')}</div>
      <div class="meta">Generated ${h(DATA.generatedAt.replace('T', ' ').slice(0, 16))} UTC<br>${DATA.gitHead ? `at <code>${h(DATA.gitHead.split(' ')[0])}</code> + working tree<br>` : ''}Rebuild with <code>make spec-dashboard</code></div>
    </aside>
    <main id="main"></main>`;
  app.querySelectorAll('.theme button').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.theme)));
  applyTheme();
}
function setTheme(t) { try { localStorage.setItem('spec-dash-theme', t); } catch {} applyTheme(); }
function applyTheme() {
  let t = 'system'; try { t = localStorage.getItem('spec-dash-theme') || 'system'; } catch {}
  if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  app.querySelectorAll('.theme button').forEach(b => b.classList.toggle('on', b.dataset.theme === t));
}

// ---------- shared pieces ----------
function stackedBar(statuses, counts, total, cls = 'st') {
  const t = total || 1;
  return `<div class="bar">${statuses.filter(st => counts[st]).map(st => {
    const n = counts[st], w = n / t * 100;
    return `<div class="seg ${cls}-${st}" style="width:${w}%" data-tip="${h(cls === 'd' ? DERIVED[st] : st)}: ${n} of ${total}">${w > 9 ? n : ''}</div>`;
  }).join('')}</div>`;
}
const legend = (statuses, cls = 'st', counts = null) => `<div class="legend">${statuses.map(st => `<span class="${cls}-${st}">${h(cls === 'd' ? DERIVED[st] : st)}${counts ? `<b class="n">${counts[st] || 0}</b>` : ''}</span>`).join('')}</div>`;
const sumCounts = rows => rows.reduce((acc, r) => { for (const [k, v] of Object.entries(r)) acc[k] = (acc[k] || 0) + v; return acc; }, {});
const head = (title, sub) => `<div class="head"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>`;
const kpi = (v, l, s = '') => `<div class="card kpi"><span class="v">${v}</span><span class="l">${l}</span>${s ? `<span class="s">${s}</span>` : ''}</div>`;
function derivedCounts(ms) { const c = {}; for (const it of ms.items) c[it.derived] = (c[it.derived] || 0) + 1; return c; }

// ---------- views ----------
function overview() {
  const st = DATA.stats, cur = DATA.roadmap.milestones.find(m => m.current);
  const blocking = DATA.questions.filter(q => q.blocking);
  const specFolders = st.byFolder.filter(f => f.folder !== '04-decisions'), adrFolder = st.byFolder.find(f => f.folder === '04-decisions');
  const p = cur ? cur.progress : null;
  return head('Overview', `${plural(nonAdr.length, 'spec')}, ${plural(adrs.length, 'ADR')}, ${plural(DATA.questions.length, 'open question')}. As of ${h(DATA.today)}.`) + `
    <div class="grid cols-4">
      ${kpi(st.byStatus.approved + st.byStatus.implementing + st.byStatus.implemented, 'specs approved or beyond', `${st.byStatus.draft} still draft`)}
      ${kpi(st.byStatus.implemented, 'specs implemented', `${st.byStatus.implementing} implementing`)}
      ${kpi(st.byStatus.accepted, 'ADRs accepted', `${st.byStatus.proposed} proposed · ${st.byStatus.superseded} superseded`)}
      ${kpi(DATA.questions.length, 'open questions', `${blocking.length} blocking`)}
    </div>
    <div class="grid cols-2" style="margin-top:14px">
      <div class="card">
        <h2>Specs by status</h2>
        <div class="rows">${specFolders.map(f => `<div class="lbl">${FOLDER_LABEL[f.folder]}</div>${stackedBar(DATA.specStatuses, f.statuses, f.total)}<div class="tot">${f.total}</div>`).join('')}</div>
        <div class="lgroup"><span class="lg">Product · Architecture · Features · Contracts</span>${legend(DATA.specStatuses, 'st', sumCounts(specFolders.map(f => f.statuses)))}</div>
        <div style="margin-top:12px"><div class="rows"><div class="lbl">Decisions</div>${stackedBar(DATA.adrStatuses, adrFolder.statuses, adrFolder.total)}<div class="tot">${adrFolder.total}</div></div><div class="lgroup"><span class="lg">Decisions (ADRs)</span>${legend(DATA.adrStatuses, 'st', adrFolder.statuses)}</div></div>
        <details style="margin-top:10px"><summary class="small">Table view</summary>
          <table style="margin-top:8px"><thead><tr><th>Folder</th>${DATA.specStatuses.map(s => `<th class="num">${s}</th>`).join('')}<th class="num">total</th></tr></thead>
          <tbody>${specFolders.map(f => `<tr><td>${FOLDER_LABEL[f.folder]}</td>${DATA.specStatuses.map(s => `<td class="num">${f.statuses[s] || ''}</td>`).join('')}<td class="num">${f.total}</td></tr>`).join('')}</tbody></table>
          <table style="margin-top:8px"><thead><tr><th>Decisions</th>${DATA.adrStatuses.map(s => `<th class="num">${s}</th>`).join('')}<th class="num">total</th></tr></thead>
          <tbody><tr><td>ADRs</td>${DATA.adrStatuses.map(s => `<td class="num">${adrFolder.statuses[s] || ''}</td>`).join('')}<td class="num">${adrFolder.total}</td></tr></tbody></table>
        </details>
      </div>
      <div class="stack">
        <div class="card ms">
          <h2>Current milestone</h2>
          ${cur ? `<div class="msh"><a href="#roadmap"><strong>${h(cur.id)} — ${h(cur.title)}</strong></a></div>
            <div class="prog">${stackedBar(DERIVED_ORDER, derivedCounts(cur), p.total, 'd')}<span class="pct">${p.done + p.built}/${p.total} done</span></div>
            ${legend(DERIVED_ORDER.filter(k => derivedCounts(cur)[k]), 'd', derivedCounts(cur))}
            <p class="small" style="margin-top:8px">${p.ready} ready to build · ${p.needsDecision} waiting on a decision · ${p.specDraft} waiting on a draft spec</p>` : '<p class="empty">No milestone is marked (current) in ROADMAP.md.</p>'}
        </div>
        <div class="card">
          <h2>Blocked by open questions</h2>
          ${st.blockedSpecs.length ? `<table><thead><tr><th>Spec</th><th>Status</th><th>Blocked by</th></tr></thead><tbody>${st.blockedSpecs.map(b => `<tr><td>${idLink(b.id)}</td><td>${pill(b.status)}</td><td><div class="ids">${b.by.map(qLink).join('')}</div></td></tr>`).join('')}</tbody></table>` : '<p class="empty">Nothing is blocked.</p>'}
        </div>
      </div>
    </div>
    <div class="grid cols-3" style="margin-top:14px">
      <div class="card"><h2>Stale specs</h2><p class="small">Not reviewed in ${DATA.staleDays} days.</p>${st.stale.length ? idList(st.stale) : '<p class="empty">None. Every spec was reviewed recently.</p>'}</div>
      <div class="card"><h2>Traceability</h2>
        <p class="small">${plural(DATA.trace.codeFiles, 'code file')} under ${h(DATA.codeRoots.join(', '))} (plus configured root files) · ${DATA.trace.claimed} claimed · <span class="${DATA.trace.unclaimed.length ? 'tag bad' : 'tag good'}">${DATA.trace.unclaimed.length} unclaimed</span></p>
        <p class="small">${plural(DATA.trace.emptyClaims.length, 'empty claim')} on implementing/implemented specs · ${plural(DATA.trace.dangling.length, 'dangling reference')}</p>
        <a href="#trace">Open traceability →</a></div>
      <div class="card"><h2>Corpus</h2>
        <p class="small">${plural(st.acceptanceTotal, 'acceptance criterion')} across the specs.<br>${plural(st.ruledOutTotal, 'ruled-out alternative')} recorded as hard constraints.</p>
        <p class="small">${plural(DATA.resolved.length, 'question')} resolved so far.</p>
        <a href="#specs">Browse specs →</a></div>
    </div>`;
}

let qFilter = 'all';
function questions(arg) {
  const list = DATA.questions.filter(q => qFilter === 'all' || (qFilter === 'blocking' ? q.blocking : !q.blocking));
  const field = (q, k, label) => q.fields[k] ? `<dt>${label}</dt><dd>${q.fields[k]}</dd>` : '';
  return head('Open questions', `${DATA.questions.length} open, ${DATA.questions.filter(q => q.blocking).length} blocking a spec. Decide with <code>/decide Qn</code>. Order follows the file: earliest-needed first.`) + `
    <div class="toolbar"><div class="seg-btns">${[['all', 'All'], ['blocking', 'Blocking'], ['nonblocking', 'Not blocking']].map(([k, l]) => `<button data-qf="${k}" class="${qFilter === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <div class="stack">
      ${list.map(q => `<div class="card qcard${q.blocking ? ' blocking' : ''}${arg === q.id ? ' target' : ''}" id="q-${h(q.id)}">
        <div class="qh"><span class="id q">${h(q.id)}</span><h3>${q.title}</h3>${q.blocking ? '<span class="tag warn">blocking</span>' : '<span class="tag">not blocking</span>'}${q.hasRecommendation ? '' : '<span class="tag bad">no recommendation</span>'}${q.hasOptions ? '' : '<span class="tag">no options listed</span>'}</div>
        <dl>${field(q, 'context', 'Context')}${field(q, 'options', 'Options')}${field(q, 'recommendation', 'Recommendation')}${field(q, 'blocks', 'Blocks')}${field(q, 'affects', 'Affects')}
        ${q.blocksIds.length || q.affectsIds.length ? `<dt>Specs</dt><dd>${idList([...new Set([...q.blocksIds, ...q.affectsIds])])}</dd>` : ''}</dl>
        <div class="cmd small">Resolve: <code>/decide ${h(q.id)}</code></div>
      </div>`).join('') || '<p class="empty">No questions match this filter.</p>'}
    </div>
    <div class="card" style="margin-top:18px"><h2>Resolved</h2>
      ${DATA.resolved.length ? `<table><thead><tr><th>Question</th><th>Resolution</th></tr></thead><tbody>${DATA.resolved.map(r => `<tr><td>${r.q}</td><td>${r.resolution}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">Nothing resolved yet.</p>'}
    </div>`;
}

function roadmap() {
  const total = DATA.roadmap.milestones.reduce((n, m) => n + m.progress.total, 0);
  const done = DATA.roadmap.milestones.reduce((n, m) => n + m.progress.done + m.progress.built, 0);
  return head('Roadmap', `${DATA.roadmap.milestones.length} milestones, ${done}/${total} items done. Item state is derived from the referenced specs' live status, not only the checkbox.`) + `
    <p class="small">${DATA.roadmap.intro}</p>
    ${legend(DERIVED_ORDER, 'd', sumCounts(DATA.roadmap.milestones.map(derivedCounts)))}
    <div class="stack" style="margin-top:14px">${DATA.roadmap.milestones.map(m => {
      const p = m.progress, dc = derivedCounts(m);
      return `<div class="card ms" id="ms-${h(m.id)}">
        <div class="msh"><h2>${h(m.id)} — ${h(m.title)}</h2>${m.current ? '<span class="tag good">current</span>' : ''}<span class="small muted">${p.total} items</span></div>
        ${m.intro.map(l => `<p class="intro">${l}</p>`).join('')}
        <div class="prog">${stackedBar(DERIVED_ORDER, dc, p.total, 'd')}<span class="pct">${p.done + p.built}/${p.total} done</span></div>
        <ul class="items">${m.items.map(it => `<li><span class="box${it.done ? ' on' : ''}"></span><span>${it.text}${it.refs.length || it.adrs.length || it.qs.length ? `<div class="ids" style="margin-top:4px">${it.refs.map(idLink).join('')}${it.adrs.map(idLink).join('')}${it.qs.map(qLink).join('')}</div>` : ''}</span>${pill(it.derived, 'd')}</li>`).join('')}</ul>
      </div>`;
    }).join('')}</div>`;
}

const specState = { q: '', status: '', type: '' };
function specs(arg) {
  return `<div class="split"><div class="card list" id="speclist">${specList(arg)}</div><div class="card detail" id="specdetail">${arg ? specDetail(arg) : specIndex()}</div></div>`;
}
function specList(active) {
  const q = specState.q.toLowerCase();
  const match = s => (!specState.status || s.status === specState.status) && (!specState.type || s.type === specState.type)
    && (!q || s.id.toLowerCase().includes(q) || s.title.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q));
  const statuses = [...DATA.specStatuses, ...DATA.adrStatuses].filter(st => DATA.stats.byStatus[st]);
  const types = [...new Set(DATA.specs.map(s => s.type))];
  return `<div class="toolbar" style="margin-bottom:6px;flex-direction:column;align-items:stretch;gap:6px">
      <input id="spec-q" type="search" placeholder="Search id, title, summary" value="${h(specState.q)}" style="min-width:0">
      <div style="display:flex;gap:6px"><select id="spec-status" style="flex:1"><option value="">any status</option>${statuses.map(st => `<option value="${st}"${specState.status === st ? ' selected' : ''}>${st}</option>`).join('')}</select>
      <select id="spec-type" style="flex:1"><option value="">any type</option>${types.map(t => `<option value="${h(t)}"${specState.type === t ? ' selected' : ''}>${h(t)}</option>`).join('')}</select></div>
    </div>
    ${DATA.folders.map(f => { const items = DATA.specs.filter(s => s.folder === f && match(s)); return items.length ? `<h4>${FOLDER_LABEL[f]} <span class="muted">${items.length}</span></h4>${items.map(s => `<a class="item${s.id === active ? ' active' : ''}" href="#spec/${h(s.id)}"><span><span class="t">${h(s.title)}</span><br><span class="i">${h(s.id)}</span></span>${pill(s.status)}</a>`).join('')}` : ''; }).join('') || '<p class="empty" style="padding:8px">No spec matches.</p>'}`;
}
function specIndex() {
  return head('Specs', 'Pick a spec on the left, or jump from any id link across the dashboard.') + `
    <div class="grid cols-2">${DATA.folders.map(f => { const items = DATA.specs.filter(s => s.folder === f); return `<div><h3>${FOLDER_LABEL[f]} <span class="muted">${items.length}</span></h3>
      <table><tbody>${items.map(s => `<tr><td>${idLink(s.id)}</td><td>${h(s.title)}</td><td>${pill(s.status)}</td></tr>`).join('')}</tbody></table></div>`; }).join('')}</div>`;
}
function specDetail(id) {
  const s = byId.get(id);
  if (!s) return `<p class="empty">No spec with id <code>${h(id)}</code>.</p>`;
  const implRows = s.implements.map(g => `<li><code>${h(g.glob)}</code><span class="small">${g.files.length ? `<span class="tag good">${plural(g.files.length, 'file')}</span> ${g.files.slice(0, 6).map(f => `<code>${h(f)}</code>`).join(' ')}${g.files.length > 6 ? ` <span class="muted">+${g.files.length - 6} more</span>` : ''}` : '<span class="tag">nothing on disk yet</span>'}</span></li>`).join('');
  const adr = s.adr;
  return `<div class="dh"><span class="id">${h(s.id)}</span>${pill(s.status)}<span class="tag">${h(s.type)}</span><span class="tag">${FOLDER_LABEL[s.folder]}</span>
      <span class="small muted">reviewed ${h(s.lastReviewed) || '—'}${stale(s) ? ` <span class="tag warn">${s.staleDays} days ago</span>` : ''}</span>
      <span style="margin-left:auto;display:flex;gap:10px" class="small"><a href="#file/specs/${h(s.rel)}">file view</a><a href="#graph/${h(s.id)}">graph</a><a href="${h(s.file)}" target="_blank" rel="noopener">${h(s.rel)} ↗</a></span></div>
    <h1>${h(s.title)}</h1>
    ${s.summary ? `<p class="small">${s.summary}</p>` : ''}
    ${adr && adr.supersededBy ? `<p><span class="tag bad">superseded by</span> ${idLink(adr.supersededBy)}</p>` : ''}
    <div class="meta-grid">
      ${adr ? `<div><div class="k">Resolves</div>${adr.resolves.length ? `<div class="ids">${adr.resolves.map(qLink).join('')}</div>` : '<span class="empty">no open question</span>'}</div>
              <div><div class="k">Affects</div>${idList(adr.affects)}</div>` : ''}
      <div><div class="k">Depends on</div>${idList(s.dependsOn)}</div>
      <div><div class="k">Depended on by</div>${idList(s.dependents)}</div>
      <div><div class="k">Decisions applied</div>${idList(s.decisions)}</div>
      ${adr ? `<div><div class="k">Cited by specs</div>${idList(s.decidedFor)}</div>` : `<div><div class="k">Implements (${s.implements.length} globs)</div>${s.implements.length ? `<ul class="impl" style="margin:0;padding:0;list-style:none">${implRows}</ul>` : '<span class="empty">no code paths claimed</span>'}</div>`}
    </div>
    ${s.dangling.length ? `<p><span class="tag bad">dangling ids</span> ${s.dangling.map(x => `<code>${h(x)}</code>`).join(' ')}</p>` : ''}
    ${s.acceptance.length ? `<details><summary>Acceptance criteria (${s.acceptance.length}) — each becomes a test name</summary><ul>${s.acceptance.map(a => `<li>${a}</li>`).join('')}</ul></details>` : ''}
    ${s.ruledOut.length ? `<details><summary>${adr ? 'Alternatives ruled out' : 'Ruled out'} (${s.ruledOut.length}) — hard constraints</summary><ul>${s.ruledOut.map(a => `<li>${a}</li>`).join('')}</ul></details>` : ''}
    ${s.openQs.length ? `<details open><summary>Open questions noted in this spec (${s.openQs.length})</summary><ul>${s.openQs.map(a => `<li>${a}</li>`).join('')}</ul></details>` : ''}
    <div class="md">${s.html}</div>`;
}

const graphState = { depends: true, decision: true, pin: null };
function graph(arg) {
  if (arg && byId.has(arg)) graphState.pin = arg;
  const cols = ['00-product', '01-architecture', '03-contracts', '02-features', '04-decisions'];
  const nodeW = 196, nodeH = 26, gap = 8, colGap = 70, x0 = 30;
  const STATUS_ORDER = [...DATA.specStatuses, ...DATA.adrStatuses];
  // per-column legend: only the statuses present in that column, with counts, wrapped to the column width
  const colNodes = cols.map(f => DATA.graph.nodes.filter(n => n.folder === f).sort((a, b) => a.id.localeCompare(b.id)));
  const colLegend = colNodes.map(ns => {
    const items = STATUS_ORDER.filter(st => ns.some(n => n.status === st)).map(st => ({ st, n: ns.filter(x => x.status === st).length }));
    const lines = [[]]; let w = 0;
    for (const it of items) { const iw = 16 + (it.st.length + String(it.n).length + 1) * 6.6; if (w + iw > nodeW && lines[lines.length - 1].length) { lines.push([]); w = 0; } lines[lines.length - 1].push({ ...it, x: w }); w += iw; }
    return lines;
  });
  const legendLines = Math.max(...colLegend.map(l => l.length));
  const y0 = 36 + 18 + legendLines * 15 + 8;
  const pos = new Map();
  let maxRows = 0;
  colNodes.forEach((ns, ci) => {
    maxRows = Math.max(maxRows, ns.length);
    ns.forEach((n, ri) => pos.set(n.id, { x: x0 + ci * (nodeW + colGap), y: y0 + ri * (nodeH + gap), n, ci }));
  });
  const W = x0 * 2 + cols.length * nodeW + (cols.length - 1) * colGap, H = y0 + maxRows * (nodeH + gap) + 20;
  const nDep = DATA.graph.edges.filter(e => e.kind === 'depends').length, nDec = DATA.graph.edges.filter(e => e.kind === 'decision').length;
  const edges = DATA.graph.edges.filter(e => graphState[e.kind] && pos.has(e.from) && pos.has(e.to));
  const path = e => {
    const a = pos.get(e.from), b = pos.get(e.to);
    const ay = a.y + nodeH / 2, by = b.y + nodeH / 2;
    if (a.ci === b.ci) { const x = a.x + nodeW, bend = 28; return `M${x},${ay} C${x + bend},${ay} ${x + bend},${by} ${x},${by}`; }
    const x1 = a.ci < b.ci ? a.x + nodeW : a.x, x2 = a.ci < b.ci ? b.x : b.x + nodeW, dx = (x2 - x1) / 2;
    return `M${x1},${ay} C${x1 + dx},${ay} ${x2 - dx},${by} ${x2},${by}`;
  };
  const swatch = kind => `<svg class="sw" width="56" height="14" viewBox="0 0 56 14"><path class="gedge ${kind} on" d="M2,7 L44,7" marker-end="url(#m-${kind})"></path></svg>`;
  return head('Dependency graph', `${DATA.graph.nodes.length} nodes in five columns, one per spec folder. Hover a node to trace its neighbours, click to pin.`) + `
    <div class="card glegend">
      <div class="glrow"><span class="k">Lines</span>
        <label class="li"><input type="checkbox" data-gk="depends"${graphState.depends ? ' checked' : ''}>${swatch('depends')}<span><b>depends_on</b> <span class="muted">${nDep}</span><br><span class="small">solid blue; the arrow points at the spec being relied on</span></span></label>
        <label class="li"><input type="checkbox" data-gk="decision"${graphState.decision ? ' checked' : ''}>${swatch('decision')}<span><b>decisions</b> <span class="muted">${nDec}</span><br><span class="small">dashed orange; the arrow points at the ADR the spec applies</span></span></label>
        <span class="li small"><span class="sw-hi"></span><span>highlighted = connected to the hovered or pinned node<br>faded = not connected</span></span>
      </div>
      <div class="glrow"><span class="k">Dots</span>
        <div class="lgroup"><span class="lg">Product · Architecture · Contracts · Features</span>${legend(DATA.specStatuses, 'st', sumCounts(colNodes.slice(0, 4).map(ns => Object.fromEntries(DATA.specStatuses.map(st => [st, ns.filter(n => n.status === st).length])))))}</div>
        <div class="lgroup"><span class="lg">Decisions (ADRs)</span>${legend(DATA.adrStatuses, 'st', Object.fromEntries(DATA.adrStatuses.map(st => [st, colNodes[4].filter(n => n.status === st).length])))}</div>
      </div>
    </div>
    <div class="gwrap"><svg class="g${graphState.pin ? ' sel' : ''}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs>
        <marker id="m-depends" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path class="arr depends" d="M0,0 L10,5 L0,10 z"></path></marker>
        <marker id="m-decision" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path class="arr decision" d="M0,0 L10,5 L0,10 z"></path></marker>
      </defs>
      ${cols.map((f, ci) => { const cx = x0 + ci * (nodeW + colGap); return `<text class="col" x="${cx}" y="30">${FOLDER_LABEL[f]} <tspan class="muted">${colNodes[ci].length}</tspan></text>`
        + colLegend[ci].map((line, li) => line.map(it => `<g class="cl st-${h(it.st)}"><circle cx="${cx + it.x + 5}" cy="${48 + li * 15 - 4}" r="4"></circle><text x="${cx + it.x + 14}" y="${48 + li * 15}">${h(it.st)} <tspan class="muted">${it.n}</tspan></text></g>`).join('')).join(''); }).join('')}
      ${edges.map(e => `<path class="gedge ${e.kind}" data-from="${h(e.from)}" data-to="${h(e.to)}" d="${path(e)}" marker-end="url(#m-${e.kind})"><title>${h(e.from)} → ${h(e.to)} (${e.kind})</title></path>`).join('')}
      ${[...pos.values()].map(({ x, y, n }) => `<g class="gnode st-${h(n.status)}" data-id="${h(n.id)}" transform="translate(${x},${y})"><rect width="${nodeW}" height="${nodeH}"></rect><circle cx="12" cy="${nodeH / 2}" r="4"></circle><text x="22" y="${nodeH / 2 + 4}">${h(n.id.length > 24 ? n.id.slice(0, 23) + '…' : n.id)}</text><title>${h(n.title)} · ${h(n.status)}</title></g>`).join('')}
    </svg></div>
    <div class="gside card" id="gside">${graphState.pin ? graphSide(graphState.pin) : '<p class="empty">Hover or click a node.</p>'}</div>`;
}
function graphSide(id) {
  const s = byId.get(id); if (!s) return '';
  return `<div class="dh"><span class="id">${h(s.id)}</span>${pill(s.status)}<strong>${h(s.title)}</strong><a href="#spec/${h(s.id)}" style="margin-left:auto">open spec →</a></div>
    <div class="grid cols-4" style="margin-top:8px"><div><div class="small muted">depends on</div>${idList(s.dependsOn)}</div><div><div class="small muted">depended on by</div>${idList(s.dependents)}</div><div><div class="small muted">cites</div>${idList(s.decisions)}</div><div><div class="small muted">cited by</div>${idList(s.decidedFor)}</div></div>`;
}

function trace() {
  const t = DATA.trace;
  const rows = DATA.specs.filter(s => s.implements.length).flatMap(s => s.implements.map(g => ({ s, g })));
  return head('Traceability', `Every code file under ${h(DATA.codeRoots.join(', '))} (plus configured root files) must be claimed by a spec's <code>implements</code> globs (same rules as <code>make spec-audit</code>). Generated, lockfile and markdown files are ignored.`) + `
    <div class="grid cols-4">
      ${kpi(t.codeFiles, 'code files on disk', 'tracked + untracked, not ignored')}
      ${kpi(t.claimed, 'claimed by a spec')}
      ${kpi(`<span class="${t.unclaimed.length ? 'tag bad' : 'tag good'}" style="font-size:22px;padding:2px 10px">${t.unclaimed.length}</span>`, 'unclaimed', 'drift: add to a spec')}
      ${kpi(rows.length, 'implements globs', `${rows.filter(r => r.g.files.length).length} match something`)}
    </div>
    <div class="grid cols-2" style="margin-top:14px">
      <div class="card"><h2>Unclaimed code</h2>${t.unclaimed.length ? `<ul>${t.unclaimed.map(f => `<li><code>${h(f)}</code></li>`).join('')}</ul>` : '<p class="empty">Every code file has a governing spec.</p>'}</div>
      <div class="stack">
        <div class="card"><h2>Claimed by more than one spec</h2><p class="small">Overlap is allowed (a feature and an architecture spec can share a path) but each should be deliberate.</p>${t.overlaps.length ? `<table><tbody>${t.overlaps.map(o => `<tr><td><code>${h(o.file)}</code></td><td>${idList(o.specs)}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">No overlaps.</p>'}</div>
        <div class="card"><h2>Status says built, nothing on disk</h2>${t.emptyClaims.length ? `<table><tbody>${t.emptyClaims.map(e => `<tr><td>${idLink(e.spec)}</td><td>${pill(e.status)}</td><td><code>${h(e.glob)}</code></td></tr>`).join('')}</tbody></table>` : '<p class="empty">None.</p>'}</div>
        <div class="card"><h2>Dangling references</h2><p class="small">Ids in <code>depends_on</code> or <code>decisions</code> that no spec declares.</p>${t.dangling.length ? `<table><tbody>${t.dangling.map(d => `<tr><td>${idLink(d.spec)}</td><td>${d.ids.map(x => `<code>${h(x)}</code>`).join(' ')}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">None.</p>'}</div>
      </div>
    </div>
    <div class="card" style="margin-top:14px"><h2>All claims</h2>
      <div class="tbl"><table><thead><tr><th>Spec</th><th>Status</th><th>Glob</th><th class="num">Files</th></tr></thead>
      <tbody>${rows.map(({ s, g }) => `<tr><td>${idLink(s.id)}</td><td>${pill(s.status)}</td><td><code>${h(g.glob)}</code>${g.files.length ? `<div class="small muted">${g.files.slice(0, 4).map(h).join(', ')}${g.files.length > 4 ? ` +${g.files.length - 4}` : ''}</div>` : ''}</td><td class="num">${g.files.length || '<span class="muted">0</span>'}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
}

// ---------- files (markdown viewer) ----------
const fileByRel = new Map(DATA.files.map(f => [f.rel, f]));
const fileHtml = f => f.html ?? byId.get(f.specId)?.html ?? '';
const fileHeadings = f => f.headings ?? byId.get(f.specId)?.headings ?? [];
const fileState = { q: '' };
const KIND_LABEL = { guide: 'guide', product: 'product', architecture: 'architecture', feature: 'feature', contract: 'contract', decision: 'ADR', template: 'template', generated: 'generated', doc: 'doc', tooling: 'tooling', yaml: 'yaml', yml: 'yaml', json: 'json' };
const fileLink = rel => { const f = fileByRel.get(rel); return f ? `<a class="id f" href="#file/${h(rel)}" data-tip="${h(rel)}">${h(f.name)}</a>` : `<span class="id missing">${h(rel)}</span>`; };
const fileLinkForSpec = id => { const s = byId.get(id); return s ? `<a class="id" href="#file/specs/${h(s.rel)}" data-tip="${h(s.title)} · ${h(s.status)}">${h(id)}</a>` : `<span class="id missing">${h(id)}</span>`; };
// inside the viewer, links to specs and to the questions/roadmap pages stay inside the viewer
const toFileLinks = html => html
  .replace(/href="#spec\/([^"]+)"/g, (m, id) => byId.has(id) ? `href="#file/specs/${h(byId.get(id).rel)}"` : m)
  .replace(/href="#questions"/g, 'href="#file/specs/OPEN-QUESTIONS.md"')
  .replace(/href="#roadmap"/g, 'href="#file/specs/ROADMAP.md"');

function buildTree() {
  const root = { name: '', dirs: new Map(), files: [] };
  for (const f of DATA.files) {
    let node = root;
    for (const p of (f.dir === '.' ? [] : f.dir.split('/'))) { if (!node.dirs.has(p)) node.dirs.set(p, { name: p, dirs: new Map(), files: [] }); node = node.dirs.get(p); }
    node.files.push(f);
  }
  return root;
}
const countFiles = d => d.files.length + [...d.dirs.values()].reduce((n, x) => n + countFiles(x), 0);
function renderTree(node, prefix, active, depth) {
  const q = fileState.q.toLowerCase();
  const matches = f => !q || f.rel.toLowerCase().includes(q) || (f.specId || '').toLowerCase().includes(q) || (byId.get(f.specId)?.title || '').toLowerCase().includes(q);
  const dirs = [...node.dirs.values()].sort((a, b) => a.name.localeCompare(b.name)).map(d => {
    const inner = renderTree(d, prefix + d.name + '/', active, depth + 1);
    if (!inner) return '';
    const open = !!q || !(prefix + d.name).startsWith('.claude') || (active || '').startsWith(prefix + d.name + '/');
    return `<details class="dir"${open ? ' open' : ''}><summary style="padding-left:${depth * 12 + 8}px">${h(d.name)}/<span class="muted">${countFiles(d)}</span></summary>${inner}</details>`;
  }).join('');
  const files = node.files.filter(matches).sort((a, b) => a.name.localeCompare(b.name)).map(f => {
    const sp = f.specId ? byId.get(f.specId) : null;
    return `<a class="frow${f.rel === active ? ' active' : ''}" href="#file/${h(f.rel)}" style="padding-left:${depth * 12 + 22}px" data-tip="${h(sp ? sp.id + ' · ' + sp.title : f.rel)}"><span class="fn">${h(f.name)}</span>${sp ? pill(sp.status) : `<span class="tag">${h(KIND_LABEL[f.kind] || f.kind)}</span>`}</a>`;
  }).join('');
  return dirs + files;
}
function files(arg) {
  return `<div class="files"><div class="card ftree" id="ftree">${fileTree(arg)}</div><div class="card fview" id="fview">${arg ? fileView(arg) : filesIndex()}</div><div class="ftoc" id="ftoc">${arg ? fileToc(arg) : ''}</div></div>`;
}
function fileTree(active) {
  return `<input id="file-q" type="search" placeholder="Filter files, ids, titles" value="${h(fileState.q)}"><div class="tree">${renderTree(buildTree(), '', active, 0) || '<p class="empty" style="padding:8px">No file matches.</p>'}</div>`;
}
function filesIndex() {
  const groups = {};
  for (const f of DATA.files) { const g = f.dir === '.' ? '(root)' : f.dir.split('/').slice(0, 2).join('/'); (groups[g] ||= []).push(f); }
  const orphans = DATA.files.filter(f => !f.linkedFrom.length && !f.mentionedBy.length && f.ext === 'md' && f.kind !== 'tooling' && !['INDEX.md', 'README.md'].includes(f.name));
  const most = DATA.files.map(f => ({ f, n: f.linkedFrom.length + f.mentionedBy.length })).filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 10);
  const total = DATA.files.reduce((n, f) => n + f.size, 0);
  return head('Files', `${plural(DATA.files.length, 'file')}, ${Math.round(total / 1024)} KB. Pick a file in the tree. Links inside a document open the target here; the outline on the right jumps within the document.`) + `
    <div class="grid cols-2">
      <div><h3>Structure</h3><table><thead><tr><th>Folder</th><th class="num">Files</th><th class="num">Lines</th><th>Kinds</th></tr></thead><tbody>${Object.entries(groups).map(([g, fs]) => `<tr><td><code>${h(g)}</code></td><td class="num">${fs.length}</td><td class="num">${fs.reduce((n, f) => n + f.lines, 0)}</td><td class="small">${[...new Set(fs.map(f => h(KIND_LABEL[f.kind] || f.kind)))].join(', ')}</td></tr>`).join('')}</tbody></table></div>
      <div class="stack">
        <div><h3>Most referenced</h3><p class="small">Inbound links plus mentions of the spec id in other files.</p><table><tbody>${most.map(({ f, n }) => `<tr><td>${fileLink(f.rel)}</td><td class="small muted">${h(f.dir)}</td><td class="num">${n}</td></tr>`).join('')}</tbody></table></div>
        <div><h3>Not referenced anywhere</h3><p class="small">No inbound link and no mention of its id in another file.</p>${orphans.length ? `<div class="ids">${orphans.map(f => fileLink(f.rel)).join('')}</div>` : '<p class="empty">Every document is referenced.</p>'}</div>
      </div>
    </div>`;
}
function fileView(rel) {
  const f = fileByRel.get(rel);
  if (!f) return `<p class="empty">No file at <code>${h(rel)}</code>.</p>`;
  const i = DATA.files.indexOf(f), prev = DATA.files[i - 1], next = DATA.files[i + 1];
  const sp = f.specId ? byId.get(f.specId) : null;
  const crumbs = f.rel.split('/');
  const block = (label, items, render) => items.length ? `<div><div class="k">${label} <span class="muted">${items.length}</span></div><div class="ids">${items.map(render).join('')}</div></div>` : '';
  const hasRels = f.linksOut.length || f.linkedFrom.length || f.mentionedBy.length || (sp && (sp.dependsOn.length || sp.dependents.length || sp.decisions.length || sp.decidedFor.length));
  return `<div class="dh">
      <span class="crumbs">${crumbs.map((c, k) => k < crumbs.length - 1 ? `<span class="muted">${h(c)}/</span>` : `<strong>${h(c)}</strong>`).join('')}</span>
      ${sp ? pill(sp.status) : ''}<span class="tag">${h(KIND_LABEL[f.kind] || f.kind)}</span><span class="small muted">${f.lines} lines · ${(f.size / 1024).toFixed(1)} KB</span>
      <span style="margin-left:auto;display:flex;gap:10px" class="small">${sp ? `<a href="#spec/${h(sp.id)}">spec view</a><a href="#graph/${h(sp.id)}">graph</a>` : ''}<a href="file://${h(DATA.root)}/${h(f.rel)}" target="_blank" rel="noopener">open file ↗</a></span>
    </div>
    <div class="fnav small">${prev ? `<a href="#file/${h(prev.rel)}">← ${h(prev.name)}</a>` : '<span></span>'}${next ? `<a href="#file/${h(next.rel)}">${h(next.name)} →</a>` : ''}</div>
    ${hasRels ? `<div class="rels">
      ${block('Links to', f.linksOut, fileLink)}${block('Linked from', f.linkedFrom, fileLink)}${block('Mentions ' + (f.specId || ''), f.mentionedBy, fileLink)}
      ${sp ? block('Depends on', sp.dependsOn, fileLinkForSpec) + block('Depended on by', sp.dependents, fileLinkForSpec) + block('Decisions', sp.decisions, fileLinkForSpec) + block('Cited by', sp.decidedFor, fileLinkForSpec) : ''}
    </div>` : '<p class="small empty">No links to or from this file.</p>'}
    ${f.fm ? `<details class="fm"><summary>Frontmatter</summary><table><tbody>${Object.entries(f.fm).map(([k, v]) => `<tr><td><code>${h(k)}</code></td><td>${Array.isArray(v) ? (v.length ? v.map(x => byId.has(x) ? fileLinkForSpec(x) : `<code>${h(x)}</code>`).join(' ') : '<span class="muted">[]</span>') : h(v)}</td></tr>`).join('')}</tbody></table></details>` : ''}
    <div class="md">${toFileLinks(fileHtml(f))}</div>`;
}
function fileToc(rel) {
  const f = fileByRel.get(rel);
  if (!f || !fileHeadings(f).length) return '';
  return `<div class="card toc"><div class="k">Outline</div>${fileHeadings(f).filter(x => x.level <= 3).map(x => `<button class="tocl l${x.level}" data-goto="${h(x.id)}">${h(x.text)}</button>`).join('')}</div>`;
}
function wireFiles() {
  document.getElementById('file-q').addEventListener('input', e => {
    fileState.q = e.target.value;
    const active = location.hash.startsWith('#file/') ? decodeHash(location.hash.slice(6)) : null;
    document.getElementById('ftree').innerHTML = fileTree(active);
    wireFiles();
    const i = document.getElementById('file-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length);
  });
}
function revealActiveFile() {
  const row = document.querySelector('#ftree a.frow.active');
  for (let d = row?.closest('details'); d; d = d.parentElement?.closest('details')) d.open = true;
  row?.scrollIntoView({ block: 'nearest' });
}
document.addEventListener('click', e => { const b = e.target.closest('[data-goto]'); if (b) document.getElementById(b.dataset.goto)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
const decodeHash = s => { try { return decodeURIComponent(s); } catch { return s; } };

// ---------- SDD glossary (docs/spec-driven-glossary.md rendered without the tree) ----------
const GETTING_STARTED = 'docs/getting-started.md';
const GLOSSARY = 'docs/spec-driven-glossary.md';
function start() {
  if (!fileByRel.has(GETTING_STARTED)) return head('Get started', '') + `<p class="empty">Add <code>${h(GETTING_STARTED)}</code> to the repository and rebuild.</p>`;
  return `<div class="files glossary"><div class="card fview" id="fview">${fileView(GETTING_STARTED)}</div><div class="ftoc" id="ftoc">${fileToc(GETTING_STARTED)}</div></div>`;
}
function glossary() {
  if (!fileByRel.has(GLOSSARY)) return head('SDD glossary', '') + `<p class="empty">Add <code>${GLOSSARY}</code> to the repository and rebuild.</p>`;
  return `<div class="files glossary"><div class="card fview" id="fview">${fileView(GLOSSARY)}</div><div class="ftoc" id="ftoc">${fileToc(GLOSSARY)}</div></div>`;
}

// ---------- routing + behaviour ----------
const VIEWS = { start, overview, questions, roadmap, specs, files, graph, trace, glossary };
const ALIAS = { q: 'questions', spec: 'specs', file: 'files' }; // short forms used by links: #q/Q3, #spec/F-EXAMPLE, #file/specs/ROADMAP.md
let currentView = '';
function route() {
  const hash = location.hash.slice(1) || 'overview';
  const slash = hash.indexOf('/');
  const rawView = slash < 0 ? hash : hash.slice(0, slash);
  const arg = slash < 0 ? undefined : decodeHash(hash.slice(slash + 1));
  const view = ALIAS[rawView] || rawView;
  const key = VIEWS[view] ? view : 'overview';
  const main = document.getElementById('main');
  const isSpecUpdate = key === 'specs' && currentView === 'specs' && main.querySelector('#specdetail');
  const isFileUpdate = key === 'files' && currentView === 'files' && main.querySelector('#fview');
  if (isSpecUpdate) {
    main.querySelector('#specdetail').innerHTML = arg ? specDetail(arg) : specIndex();
    main.querySelectorAll('#speclist a.item').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#spec/${arg}`));
  } else if (isFileUpdate) {
    main.querySelector('#fview').innerHTML = arg ? fileView(arg) : filesIndex();
    main.querySelector('#ftoc').innerHTML = arg ? fileToc(arg) : '';
    main.querySelectorAll('#ftree a.frow').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#file/${arg}`));
  } else {
    main.innerHTML = VIEWS[key](arg);
  }
  window.scrollTo(0, 0);
  currentView = key;
  app.querySelectorAll('.side nav a').forEach(a => a.classList.toggle('active', a.dataset.view === key));
  if (key === 'questions' && arg) document.getElementById(`q-${arg}`)?.scrollIntoView({ block: 'start' });
  if (key === 'specs' && !isSpecUpdate) wireSpecs(arg);
  if (key === 'files') { if (!isFileUpdate) wireFiles(); revealActiveFile(); }
  if (key === 'graph') wireGraph();
}
function wireSpecs(arg) {
  const main = document.getElementById('main');
  const rerender = () => {
    const active = (location.hash.slice(1).split('/'))[1] || arg;
    main.querySelector('#speclist').innerHTML = specList(active);
    wireSpecs(active);
    const el = main.querySelector('#spec-q'); el.focus(); el.setSelectionRange(el.value.length, el.value.length);
  };
  main.querySelector('#spec-q').addEventListener('input', e => { specState.q = e.target.value; rerender(); });
  main.querySelector('#spec-status').addEventListener('change', e => { specState.status = e.target.value; rerender(); });
  main.querySelector('#spec-type').addEventListener('change', e => { specState.type = e.target.value; rerender(); });
}
function wireGraph() {
  const svg = document.querySelector('svg.g');
  const highlight = id => {
    const rel = new Set([id]);
    svg.querySelectorAll('.gedge').forEach(p => { const on = p.dataset.from === id || p.dataset.to === id; p.classList.toggle('on', on); if (on) { rel.add(p.dataset.from); rel.add(p.dataset.to); } });
    svg.querySelectorAll('.gnode').forEach(g => g.classList.toggle('on', rel.has(g.dataset.id)));
    svg.classList.add('sel');
    document.getElementById('gside').innerHTML = graphSide(id);
  };
  const clear = () => { if (graphState.pin) return highlight(graphState.pin); svg.classList.remove('sel'); svg.querySelectorAll('.on').forEach(e => e.classList.remove('on')); };
  svg.querySelectorAll('.gnode').forEach(g => {
    g.addEventListener('mouseenter', () => highlight(g.dataset.id));
    g.addEventListener('mouseleave', clear);
    g.addEventListener('click', () => { graphState.pin = graphState.pin === g.dataset.id ? null : g.dataset.id; svg.querySelectorAll('.gnode').forEach(n => n.classList.toggle('pin', n.dataset.id === graphState.pin)); clear(); });
  });
  document.querySelectorAll('[data-gk]').forEach(cb => cb.addEventListener('change', () => { graphState[cb.dataset.gk] = cb.checked; route(); }));
  if (graphState.pin) { svg.querySelector(`.gnode[data-id="${CSS.escape(graphState.pin)}"]`)?.classList.add('pin'); highlight(graphState.pin); }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-qf]');
  if (b) { qFilter = b.dataset.qf; route(); }
});
// tooltip for [data-tip]
const tip = document.getElementById('tip');
document.addEventListener('mouseover', e => { const t = e.target.closest('[data-tip]'); if (!t) { tip.hidden = true; return; } tip.textContent = t.dataset.tip; tip.hidden = false; });
document.addEventListener('mousemove', e => { if (tip.hidden) return; tip.style.left = Math.min(e.clientX + 12, window.innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; });

shell();
window.addEventListener('hashchange', route);
route();
