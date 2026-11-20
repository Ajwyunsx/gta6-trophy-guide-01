// Leonida Legend — an offline guide + tracker for the 55 PS5 trophies of GTA VI.
// Loads app/data/trophies.json (a local file), keeps progress in localStorage,
// exports and imports it as JSON. No network at run time.

const KEY = 'leonida-legend/v1';
const $ = (sel, root = document) => root.querySelector(sel);

/** Trophies grouped into the kinds the filter chips expose. */
const GROUPS = [
  { id: 'story', label: 'Story', kinds: ['story'], note: 'main missions, chapters' },
  { id: 'side', label: 'Side strands', kinds: ['side'], note: 'strangers and character chains' },
  { id: 'collectible', label: 'Collectibles', kinds: ['collectible'], note: 'cards, scans, vehicles' },
  { id: 'activity', label: 'Activities', kinds: ['activity'], note: 'races, ranges, drones, minigames' },
  { id: 'robbery', label: 'Robberies', kinds: ['robbery'], note: 'shops, banks, gangs, vaults' },
  { id: 'challenge', label: 'Challenges', kinds: ['challenge', 'stunt', 'combat'], note: 'stunts, ranges, feats' },
  { id: 'secret', label: 'Secrets', kinds: ['secret'], note: 'hidden, no map marker' },
  { id: 'economy', label: 'Economy', kinds: ['economy'], note: 'spending, property, apps' },
  { id: 'exploration', label: 'Exploration', kinds: ['exploration', 'meta'], note: 'map, platinum' },
];

const groupOf = (kind) => (GROUPS.find((g) => g.kinds.includes(kind)) || GROUPS[0]).id;
const groupLabel = (kind) => GROUPS.find((g) => g.id === groupOf(kind))?.label || kind;

/** The platinum roadmap: phases built from the trophies' own requirements. */
const ROADMAP = [
  {
    id: 'story',
    title: 'Play the story',
    lead: '60–80 hours. No mission medals, so nothing here can be failed.',
    ids: [2, 3, 8, 4, 9, 5, 10, 11, 12, 6, 13, 7],
    caveat: 'No difficulty options, and cheats switch trophies off for the whole save. Keep a manual save at each chapter break — there is no mission replay.',
  },
  {
    id: 'chapter1',
    title: 'Do this inside Chapter 1 or lose it',
    lead: 'The only missable trophy on the list.',
    ids: [28],
    caveat: 'One meditation at Jason’s house happens once: after Down to Earth, talk to Lucia in the kitchen in the morning and accept her offer to meditate. Once Chapter 1 ends it is gone.',
  },
  {
    id: 'secrets',
    title: 'Secrets and one-off stunts',
    lead: 'Short jobs with no map marker — a good evening’s work.',
    ids: [44, 45, 46, 49, 50, 51, 37, 38, 20, 21, 47, 48],
    caveat: 'Several need a story unlock first: the Key Cloner (Chapter 3) for Capital Offense and Payday Loans robberies, the app from Chapter 2 for the garages, a partner for Personal Best.',
  },
  {
    id: 'sides',
    title: 'Side strands',
    lead: 'Seven chains, five of them with a named finale.',
    ids: [22, 23, 24, 26, 27, 29, 25],
    caveat: 'Only certain strands count toward Strangers & Freaks — Andy, Billy, Moses, Randy and Tyrone do not. Kenton goes quiet mid-story and comes back; the dive chain is the longest on the list.',
  },
  {
    id: 'collect',
    title: 'Collectibles and the map',
    lead: 'Scanning does the heavy lifting here.',
    ids: [30, 31, 35, 42, 43],
    caveat: 'All of these count toward 100% anyway, at higher thresholds: 200 vehicles scanned, 100 WAiNK scans, 15 card sets, 39 gang operations.',
  },
  {
    id: 'activity',
    title: 'Activities, stunts, challenges',
    lead: 'The skill block. Two of the six are silvers.',
    ids: [15, 16, 17, 18, 19, 32],
    caveat: 'Under-the-bridge flights are the fastest stunts. 42 shooting-range golds are the hardest single requirement before 100%.',
  },
  {
    id: 'crime',
    title: 'Robberies and property',
    lead: 'Where the money comes from, and where it goes.',
    ids: [33, 34, 39, 40, 41, 52, 53, 54, 55, 36],
    caveat: 'Every vault job starts at four stars — the escape is the trophy. Buy the eight garages before registering ten cars; each garage adds the slots On the Spot needs.',
  },
  {
    id: 'hundred',
    title: '100% completion',
    lead: 'The checklist opens only after the credits.',
    ids: [14],
    caveat: 'Nothing is missable. Roughly 60% of the game counts: 39 gang operations, all robberies and vaults, 42/42 range golds, 42/42 drone trials, 300/397 stunts, 70/80 challenges, 200/277 base vehicles, 100/255 animals.',
  },
  {
    id: 'platinum',
    title: 'Platinum',
    lead: 'Automatic once the other 54 are in.',
    ids: [1],
    caveat: 'No online trophies, no DLC, one playthrough.',
  },
];

/* ── state ──────────────────────────────────────────────────── */

const saved = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      earned: new Set(Array.isArray(raw.earned) ? raw.earned : []),
      spoilers: raw.spoilers !== false,
    };
  } catch {
    return { earned: new Set(), spoilers: true };
  }
})();

const state = {
  earned: saved.earned,
  spoilers: saved.spoilers,
  q: '',
  group: 'all',
  grade: 'all',
  missable: false,
  hideEarned: false,
  selected: null,
};

const DEMO = new URLSearchParams(location.search).get('demo') === '1';

function persist() {
  if (DEMO) {
    const s = $('#saved');
    if (s) s.textContent = 'demo view · nothing saved';
    return;
  }
  localStorage.setItem(
    KEY,
    JSON.stringify({ earned: [...state.earned], spoilers: state.spoilers, savedAt: new Date().toISOString() }),
  );
  const s = $('#saved');
  if (s) s.textContent = 'saved locally · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ── data ───────────────────────────────────────────────────── */

const data = await (await fetch('data/trophies.json')).json();
const TROPHIES = data.trophies;
const BY_SLUG = new Map(TROPHIES.map((t) => [t.slug, t]));
const GRADES = ['platinum', 'gold', 'silver', 'bronze'];
const TOTAL = TROPHIES.length;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const hostOf = (url) => {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const isLocked = (t) => state.spoilers && t.hidden && !state.earned.has(t.id);
const matchesGroup = (t) => state.group === 'all' || groupOf(t.kind) === state.group;

function filtered() {
  const words = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return TROPHIES.filter((t) => {
    if (!matchesGroup(t)) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.missable && !t.missable) return false;
    if (state.hideEarned && state.earned.has(t.id)) return false;
    if (!words.length) return true;
    const hay = [t.name, t.description, t.guide, t.where, t.when, t.chapter, t.kind, ...(t.tasks || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/* ── header score ───────────────────────────────────────────── */

function renderScore() {
  const n = TROPHIES.filter((t) => state.earned.has(t.id)).length;
  const pct = Math.round((n / TOTAL) * 100);
  $('#ring').style.setProperty('--p', pct);
  $('#ring').setAttribute('aria-label', `${n} of ${TOTAL} trophies earned, ${pct} percent`);
  $('#pct').innerHTML = `${pct}<small>%</small>`;
  $('#earnedCount').textContent = `${n} / ${TOTAL}`;
  const counts = GRADES.map((g) => {
    const all = TROPHIES.filter((t) => t.grade === g);
    const got = all.filter((t) => state.earned.has(t.id)).length;
    return `${g} ${got}/${all.length}`;
  });
  $('#gradeLine').textContent = counts.join(' · ');
  const btn = $('#spoilerBtn');
  btn.textContent = state.spoilers ? 'Spoilers: hidden' : 'Spoilers: shown';
  btn.setAttribute('aria-pressed', String(!state.spoilers));
}

/* ── filters ────────────────────────────────────────────────── */

function renderChips() {
  const wrap = $('#kindChips');
  const counts = new Map(GROUPS.map((g) => [g.id, TROPHIES.filter((t) => groupOf(t.kind) === g.id).length]));
  const chips = [
    `<button class="chip ${state.group === 'all' ? 'on' : ''}" data-group="all">All<b>${TOTAL}</b></button>`,
    ...GROUPS.map(
      (g) =>
        `<button class="chip ${state.group === g.id ? 'on' : ''}" data-group="${g.id}" title="${esc(g.note)}">${esc(
          g.label,
        )}<b>${counts.get(g.id)}</b></button>`,
    ),
  ];
  wrap.innerHTML = chips.join('');
}

/* ── list ───────────────────────────────────────────────────── */

function rowHtml(t) {
  const done = state.earned.has(t.id);
  const locked = isLocked(t);
  const name = locked ? 'Hidden trophy' : t.name;
  const tags = [
    `<span class="tag kind">${esc(groupLabel(t.kind))}</span>`,
    !locked && t.chapter ? `<span class="tag">${esc(t.chapter)}</span>` : '',
    t.missable ? '<span class="tag miss">Missable</span>' : '',
    locked ? '<span class="tag hid">hidden</span>' : '',
  ]
    .filter(Boolean)
    .join('');
  return `
  <li class="row ${done ? 'done' : ''} ${locked ? 'locked' : ''} ${state.selected === t.id ? 'on' : ''}" data-id="${t.id}" tabindex="-1" aria-current="${state.selected === t.id}">
    <button class="tick" role="checkbox" aria-checked="${done}" aria-label="Mark ${esc(name)} earned" data-tick="${t.id}"></button>
    <div>
      <div class="ttl">${esc(name)}</div>
      <div class="meta">${tags}</div>
      <div class="desc">${locked ? '<span class="redact">name and description hidden until earned</span>' : esc(t.description)}</div>
      ${locked ? '<div class="lockNote">spoiler setting is on</div>' : ''}
    </div>
    <span class="grade g-${t.grade}" title="${t.grade}"></span>
  </li>`;
}

function renderList() {
  const items = filtered();
  const list = $('#list');
  list.innerHTML = items.map(rowHtml).join('');
  $('#empty').hidden = items.length > 0;
  $('#listCount').textContent = `${items.length} of ${TOTAL} shown`;
  const earnedShown = items.filter((t) => state.earned.has(t.id)).length;
  $('#listHint').textContent = items.length ? `${earnedShown} earned here` : '';
}

/* ── detail ─────────────────────────────────────────────────── */

function factGrid(pairs) {
  return pairs
    .map(([k, v]) => `<div class="fact"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
    .join('');
}

function detailHtml(t) {
  const done = state.earned.has(t.id);
  const locked = isLocked(t);
  if (locked) {
    const facts = factGrid([
      ['Grade', t.grade],
      ['Hidden on PS5', 'Yes'],
      ['Chapter', 'Revealed when earned'],
      ['Missable', t.missable ? 'Yes' : 'No'],
      ['Kind', groupLabel(t.kind)],
      ['Shown in this list', `${TROPHIES.filter((x) => x.hidden).length} of ${TOTAL}`],
    ]);
    return `
      <div class="spoilerCard">
        <h3>Hidden trophy</h3>
        <p>PlayStation withholds this one's name and description until it pops. Turn spoilers on, or mark it earned, to read the guide.</p>
        <div class="dActions" style="justify-content:center">
          <button class="btn" data-reveal="1">Show spoilers</button>
          <button class="btn ghost" data-mark="${t.id}">Mark earned</button>
        </div>
      </div>
      <div class="block"><h3>The facts</h3><dl class="facts">${facts}</dl></div>
      <div class="block"><h3>Where</h3><p>Revealed with the spoiler switch, so a location name cannot give the story away.</p></div>`;
  }

  const facts = factGrid([
    ['Grade', t.grade],
    ['Kind', groupLabel(t.kind)],
    ['When', t.when || 'Any time in free roam'],
    ['Where', t.where || '—'],
    ['Chapter', t.chapter || 'Any'],
    ['Missable', t.missable ? 'Yes — Chapter 1 only' : 'No'],
    ['Effort', { quick: 'Under an hour', medium: 'A session or two', long: 'A long grind' }[t.effort] || t.effort],
    ['Hidden', t.hidden ? 'Yes, on PlayStation' : 'No'],
  ]);

  const steps = (t.tasks || [])
    .map((s) => `<li class="${/MISSABLE/i.test(s) ? 'warn' : ''}">${esc(s)}</li>`)
    .join('');

  const sources = (t.sources || [])
    .map(
      (s) =>
        `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}<span class="host">${esc(
          hostOf(s.url),
        )}</span></a></li>`,
    )
    .join('');

  return `
    <div class="dHead">
      <div class="dTop">
        <span class="grade g-${t.grade}"></span>
        <span>${esc(t.grade)}</span><span>·</span><span>#${t.id} of ${TOTAL}</span>
        ${t.missable ? '<span>·</span><span style="color:#ff9ec2">missable</span>' : ''}
      </div>
      <h2>${esc(t.name)}</h2>
      <p class="dDesc">“${esc(t.description)}”</p>
      <div class="dActions">
        <button class="btn ${done ? 'on' : ''}" data-mark="${t.id}">${done ? '✓ Earned' : 'Mark earned'}</button>
        <button class="btn ghost" data-copy="${t.id}">Copy guide</button>
        <button class="btn ghost" data-prev="1" aria-label="Previous trophy">←</button>
        <button class="btn ghost" data-next="1" aria-label="Next trophy">→</button>
      </div>
    </div>
    <div class="block">
      <h3>How to get it</h3>
      <p>${esc(t.guide)}</p>
    </div>
    ${steps ? `<div class="block"><h3>Steps</h3><ol class="steps">${steps}</ol></div>` : ''}
    <div class="block"><h3>The facts</h3><dl class="facts">${facts}</dl></div>
    <div class="block"><h3>Sources for this trophy</h3><ul class="srcList">${sources}</ul></div>`;
}

function renderDetail() {
  const box = $('#detail');
  if (state.selected == null) {
    const next = TROPHIES.find((t) => !state.earned.has(t.id)) || TROPHIES[0];
    box.innerHTML = `
      <div class="placeholder">
        <strong>Pick a trophy to read its guide</strong>
        <p class="muted">${TOTAL} trophies · ${TROPHIES.filter((t) => t.missable).length} missable · progress saves in this browser</p>
        <div class="dActions" style="justify-content:center">
          <button class="btn" data-select="${next.id}">Start with ${esc(isLocked(next) ? 'the next one' : next.name)}</button>
        </div>
      </div>`;
    return;
  }
  const t = BY_SLUG.get(state.selected) || TROPHIES.find((x) => x.id === state.selected);
  box.innerHTML = t ? detailHtml(t) : '';
  box.scrollTop = 0;
}

/* ── render ─────────────────────────────────────────────────── */

function render() {
  renderScore();
  renderChips();
  renderList();
  renderDetail();
  document.querySelectorAll('.chip').forEach((c) => {
    c.classList.toggle('on', c.dataset.group === state.group);
  });
}

/* ── roadmap ────────────────────────────────────────────────── */

function renderRoadmap() {
  const earnedIn = (ids) => ids.filter((id) => state.earned.has(id)).length;
  const done = TROPHIES.filter((t) => state.earned.has(t.id)).length;

  const stats = [
    ['Trophies', `${done}<small>/ ${TOTAL}</small>`],
    ['Platinum difficulty', '4<small>/10</small>'],
    ['Hours to platinum', '200<small>est.</small>'],
    ['Playthroughs', '1'],
    ['Missable', '1'],
    ['Online trophies', '0'],
  ]
    .map(([k, v]) => `<dl class="rmStat"><dt>${k}</dt><dd>${v}</dd></dl>`)
    .join('');

  const phases = ROADMAP.map((p, i) => {
    const got = earnedIn(p.ids);
    const pct = Math.round((got / p.ids.length) * 100);
    const rows = p.ids
      .map((id) => {
        const t = TROPHIES.find((x) => x.id === id);
        if (!t) return '';
        const locked = isLocked(t);
        return `<li>
          <span class="dot g-${t.grade}"></span>
          <span>${locked ? '<em style="opacity:.5">Hidden story trophy</em>' : esc(t.name)}
            ${t.missable ? '<span class="badge">missable</span>' : ''}
            ${t.grade === 'platinum' || t.grade === 'gold' ? `<span class="badge s">${t.grade}</span>` : ''}</span>
          <span class="muted">${state.earned.has(t.id) ? 'earned' : `#${t.id}`}</span>
          <span class="note">${locked ? 'Name, description and chapter stay hidden until earned.' : esc(t.description)}${!locked && t.missable ? ' — Chapter 1 only, see the guide.' : ''}</span>
        </li>`;
      })
      .join('');
    return `<section class="phase">
      <div class="phaseHead">
        <div class="phaseNum">${String(i + 1).padStart(2, '0')}</div>
        <div><h3>${esc(p.title)}</h3><p>${esc(p.lead)}</p></div>
        <div>
          <div class="phaseBar"><i style="width:${pct}%"></i></div>
          <p class="muted" style="margin-top:6px;text-align:right">${got}/${p.ids.length}</p>
        </div>
      </div>
      <ul class="phaseList">${rows}</ul>
      <div class="rmCaveat">${esc(p.caveat)}</div>
    </section>`;
  }).join('');

  $('#roadmap').innerHTML = `
    <div class="missBanner">
      <span class="pill">1 missable</span>
      <div>
        <h2>Positive Mental Attitude can be lost in Chapter 1</h2>
        <p>After <strong>Down to Earth</strong>, talk to Lucia in the kitchen in the morning, follow her to the balcony and accept the meditation. Once Chapter 1 closes that session is gone for the save. Every other trophy on the list can be cleaned up after the credits — nothing else is missable, and there is no mission replay, so keep manual saves at each chapter break.</p>
      </div>
    </div>
    <div class="rmIntro">${stats}</div>
    ${phases}
    <p class="rmCaveat" style="border:1px solid var(--line);border-radius:12px;padding:14px 18px;background:var(--panel)">
      Rarity percentages are not shown: PlayStation has not published per-trophy rarity, and any figure quoted today is a guess. The effort labels in each guide are our own read of the requirement — <code>quick</code> under an hour, <code>medium</code> a session or two, <code>long</code> a real grind.
    </p>`;
}

/* ── about ──────────────────────────────────────────────────── */

function renderAbout() {
  const uniq = new Map();
  for (const t of TROPHIES) for (const s of t.sources || []) uniq.set(s.url, s);
  $('#sourceList').innerHTML = [...uniq.values()]
    .map(
      (s) =>
        `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(s.name)}</span><em>${esc(
          hostOf(s.url),
        )}</em></a>`,
    )
    .join('');

  const groups = GRADES.map((g) => `${TROPHIES.filter((t) => t.grade === g).length} ${g}`).join(', ');
  const kinds = GROUPS.map((g) => [g.label, TROPHIES.filter((t) => groupOf(t.kind) === g.id).length])
    .filter(([, n]) => n > 0)
    .map(([l, n]) => `${l} ${n}`)
    .join(' · ');
  const hidden = TROPHIES.filter((t) => t.hidden).length;
  $('#numbers').innerHTML = `
    <li>${TOTAL} trophies: ${groups}.</li>
    <li>${hidden} hidden on PlayStation until earned — the spoiler switch hides their names.</li>
    <li>1 missable: Positive Mental Attitude’s Chapter 1 meditation.</li>
    <li>0 online trophies. All ${TOTAL} come from the single-player campaign.</li>
    <li>By kind: ${kinds}.</li>`;
}

/* ── toast ──────────────────────────────────────────────────── */

let toastTimer;
function toast(msg) {
  let el = $('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ── actions ────────────────────────────────────────────────── */

function toggle(id) {
  const t = TROPHIES.find((x) => x.id === Number(id));
  if (!t) return;
  if (state.earned.has(t.id)) {
    state.earned.delete(t.id);
    toast(`Unmarked ${t.name}`);
  } else {
    state.earned.add(t.id);
    const left = TROPHIES.filter((x) => !state.earned.has(x.id)).length;
    toast(left === 0 ? `All ${TOTAL} earned — Vice Got a Price! 🏆` : `${t.name} · ${left} to go`);
  }
  persist();
  render();
  if ($('#view-roadmap').classList.contains('on')) renderRoadmap();
}

function select(id) {
  state.selected = Number(id);
  render();
  const s = BY_SLUG.get(TROPHIES.find((t) => t.id === state.selected)?.slug);
  if (s && location.hash.startsWith('#/board')) history.replaceState(null, '', `#/board/${s.slug}`);
}

function exportProgress() {
  const payload = {
    app: 'Leonida Legend',
    game: 'Grand Theft Auto VI',
    format: 'leonida-progress/v1',
    exportedAt: new Date().toISOString(),
    earned: TROPHIES.filter((t) => state.earned.has(t.id)).map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      grade: t.grade,
    })),
    spoilers: state.spoilers,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `leonida-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Progress exported');
}

async function importProgress(file) {
  try {
    const raw = JSON.parse(await file.text());
    const list = Array.isArray(raw) ? raw : raw.earned || raw.trophies || [];
    const ids = new Set();
    for (const item of list) {
      if (typeof item === 'number') ids.add(item);
      else if (typeof item === 'string') {
        const t = TROPHIES.find((x) => x.name === item || x.slug === item);
        if (t) ids.add(t.id);
      } else if (item && typeof item === 'object') {
        const t = TROPHIES.find((x) => x.id === item.id || x.slug === item.slug || x.name === item.name);
        if (t) ids.add(t.id);
      }
    }
    if (!ids.size) throw new Error('no trophies found');
    state.earned = ids;
    if (typeof raw.spoilers === 'boolean') state.spoilers = raw.spoilers;
    persist();
    render();
    renderRoadmap();
    toast(`Imported ${ids.size} earned trophies`);
  } catch {
    toast('That file did not look like a Leonida progress export');
  }
}

/* ── events ─────────────────────────────────────────────────── */

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-tick],[data-mark],[data-reveal],[data-select],[data-group],[data-prev],[data-next],[data-copy],.row');
  if (!el) return;

  if (el.dataset.tick) {
    e.stopPropagation();
    toggle(el.dataset.tick);
    return;
  }
  if (el.dataset.mark) {
    toggle(el.dataset.mark);
    return;
  }
  if (el.dataset.reveal) {
    state.spoilers = false;
    persist();
    render();
    return;
  }
  if (el.dataset.select) {
    select(el.dataset.select);
    return;
  }
  if (el.dataset.group) {
    state.group = el.dataset.group;
    render();
    return;
  }
  if (el.dataset.prev || el.dataset.next) {
    const list = filtered().length ? filtered() : TROPHIES;
    const idx = list.findIndex((t) => t.id === state.selected);
    const step = el.dataset.next ? 1 : -1;
    const next = list[(idx + step + list.length) % list.length];
    select(next.id);
    return;
  }
  if (el.dataset.copy) {
    const t = TROPHIES.find((x) => x.id === Number(el.dataset.copy));
    if (t) {
      navigator.clipboard
        ?.writeText(`${t.name} (${t.grade}) — ${t.description}\n\n${t.guide}`)
        .then(
          () => toast('Guide copied'),
          () => toast('Clipboard blocked by the browser'),
        );
    }
    return;
  }
  if (el.classList.contains('row') && !e.target.closest('button')) {
    select(el.dataset.id);
  }
});

$('#search').addEventListener('input', (e) => {
  state.q = e.target.value;
  renderList();
});

$('#gradeFilter').addEventListener('change', (e) => {
  state.grade = e.target.value;
  renderList();
});

$('#missableOnly').addEventListener('change', (e) => {
  state.missable = e.target.checked;
  renderList();
});

$('#hideEarned').addEventListener('change', (e) => {
  state.hideEarned = e.target.checked;
  renderList();
});

$('#resetFilters').addEventListener('click', () => {
  state.group = 'all';
  state.grade = 'all';
  state.missable = false;
  state.hideEarned = false;
  state.q = '';
  $('#search').value = '';
  $('#gradeFilter').value = 'all';
  $('#missableOnly').checked = false;
  $('#hideEarned').checked = false;
  render();
});

$('#spoilerBtn').addEventListener('click', () => {
  state.spoilers = !state.spoilers;
  persist();
  render();
  renderRoadmap();
  toast(state.spoilers ? 'Story trophies hidden until earned' : 'Spoilers shown');
});

$('#exportBtn').addEventListener('click', exportProgress);

$('#importInput').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) importProgress(file);
  e.target.value = '';
});

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const view = tab.dataset.view;
    if (location.hash !== `#/${view}`) location.hash = `#/${view}`;
    else route();
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== $('#search')) {
    e.preventDefault();
    $('#search').focus();
  }
  if (e.key === 'Escape' && document.activeElement === $('#search')) {
    $('#search').value = '';
    state.q = '';
    renderList();
    $('#search').blur();
  }
  // j / k walk the visible list, like reading a printed guide top to bottom
  if ((e.key === 'j' || e.key === 'k') && !/input|select|textarea/i.test(document.activeElement?.tagName || '')) {
    const list = filtered().length ? filtered() : TROPHIES;
    const i = list.findIndex((t) => t.id === state.selected);
    const next = list[i < 0 ? 0 : (i + (e.key === 'j' ? 1 : -1) + list.length) % list.length];
    if (next) {
      e.preventDefault();
      select(next.id);
    }
  }
});

/* ── routing & boot ─────────────────────────────────────────── */

// Deep links: #/board, #/board/<slug>, #/roadmap, plus ?spoilers=hidden|shown and
// ?demo=1, so a screenshot or a shared link lands on a view without any clicking.
const params = new URLSearchParams(location.search);
if (DEMO) {
  // A reading copy: a plausible mid-run save, never written back to localStorage.
  state.spoilers = false;
  state.earned = new Set();
  for (const id of [2, 3, 4, 5, 6, 8, 9, 10, 15, 16, 17, 18, 20, 21, 30, 31, 35, 42, 44, 45, 47, 51]) {
    state.earned.add(id);
  }
}
// 1 / 'hidden' = the spoiler switch is ON (story names withheld); 0 / 'shown' = revealed.
if (['1', 'hidden', 'on'].includes(params.get('spoilers'))) state.spoilers = true;
if (['0', 'shown', 'off'].includes(params.get('spoilers'))) state.spoilers = false;

function route() {
  const [, view = 'board', slug] = (location.hash || '#/board').split('/');
  const name = ['board', 'roadmap', 'about'].includes(view) ? view : 'board';
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.view === name;
    t.classList.toggle('on', on);
    t.setAttribute('aria-selected', String(on));
  });
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('on', v.id === `view-${name}`));
  if (name === 'roadmap') renderRoadmap();
  if (slug) {
    const t = BY_SLUG.get(decodeURIComponent(slug));
    if (t) {
      state.selected = t.id;
      renderList();
      renderDetail();
    }
  }
}

window.addEventListener('hashchange', route);

if (state.selected == null) {
  const mis = TROPHIES.find((t) => t.missable);
  if (mis) state.selected = mis.id;
}
render();
renderRoadmap();
renderAbout();
persist();
route();
