/* ==========================================================================
   Mesa Academy Drama Club - page builder
   Reads the files in /data and draws the pages. You should not need to edit
   this file to change content; edit the JSON files in /data instead.
   ========================================================================== */

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const link = (href, text, cls) => {
  const a = el('a', cls, text);
  a.href = href;
  if (/^https?:/i.test(href)) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  return a;
};

async function loadJSON(path) {
  const res = await fetch(path + '?v=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error(path + ' returned ' + res.status);
  try {
    return await res.json();
  } catch (err) {
    throw new Error(
      'The file ' + path + ' has a typo in it. Check for a missing comma, ' +
      'bracket or quotation mark. (' + err.message + ')'
    );
  }
}

function showError(target, err) {
  const box = el('div', 'error');
  box.textContent = 'Could not load the page content. ' + err.message;
  target.innerHTML = '';
  target.appendChild(box);
  console.error(err);
}

const slot = id => document.getElementById(id);

/* ---------- loading placeholders ----------
   While the published content is on its way, the sections it feeds show grey outlines
   the same shape as the real cards, so the page feels ready straight away.
   Each render function clears its section, which removes them. */

function skeletonBar(width, cls) {
  const bar = el('span', 'sk-bar' + (cls ? ' ' + cls : ''));
  bar.style.width = width;
  return bar;
}

function skeletonEvent(lines) {
  const card = el('div', 'event sk-card');
  const chip = el('div', 'date');
  chip.appendChild(skeletonBar('34px', 'sk-small'));
  chip.appendChild(skeletonBar('28px', 'sk-big'));
  chip.appendChild(skeletonBar('30px', 'sk-small'));
  card.appendChild(chip);
  const body = el('div', 'body');
  body.appendChild(skeletonBar('55%', 'sk-title'));
  lines.forEach(w => body.appendChild(skeletonBar(w)));
  card.appendChild(body);
  return card;
}

function showSkeleton(id, kind) {
  const host = slot(id);
  if (!host) return;
  host.innerHTML = '';
  host.setAttribute('aria-busy', 'true');
  const wrap = el('div', 'skeleton');
  wrap.setAttribute('aria-hidden', 'true');
  host.appendChild(el('p', 'sr-only', 'Loading…'));

  if (kind === 'announcements') {
    [3, 3].forEach((count, g) => {
      wrap.appendChild(skeletonBar(g ? '120px' : '190px', g ? 'sk-h3' : 'sk-h2'));
      const grid = el('div', 'announce-grid');
      for (let i = 0; i < count; i++) {
        const card = el('div', 'announce sk-card');
        card.appendChild(skeletonBar('40%', 'sk-small'));
        card.appendChild(skeletonBar('75%', 'sk-title'));
        card.appendChild(skeletonBar('90%'));
        card.appendChild(skeletonBar('60%'));
        grid.appendChild(card);
      }
      wrap.appendChild(grid);
    });
  } else if (kind === 'calendar' || kind === 'shows') {
    if (kind === 'calendar') {
      const bar = el('div', 'jump-bar');
      bar.appendChild(skeletonBar('260px', 'sk-pill'));
      bar.appendChild(skeletonBar('190px', 'sk-pill'));
      wrap.appendChild(bar);
    }
    wrap.appendChild(skeletonBar(kind === 'calendar' ? '240px' : '150px', 'sk-h2'));
    wrap.appendChild(skeletonBar('45%'));
    const list = el('div', 'events');
    const shapes = [['35%', '80%', '65%'], ['35%', '70%'], ['35%', '85%', '50%'], ['35%', '60%']];
    shapes.slice(0, kind === 'calendar' ? 4 : 2).forEach(s => list.appendChild(skeletonEvent(s)));
    wrap.appendChild(list);
  } else if (kind === 'cast') {
    ['92%', '80%', '86%'].forEach(w => wrap.appendChild(skeletonBar(w)));
    const row = el('div', 'search-row');
    row.appendChild(skeletonBar('100%', 'sk-pill sk-grow'));
    wrap.appendChild(row);
    const list = el('div', 'sk-rows');
    for (let i = 0; i < 8; i++) {
      const r = el('div', 'sk-row sk-card');
      r.appendChild(skeletonBar('22%'));
      r.appendChild(skeletonBar('26%'));
      r.appendChild(skeletonBar('12%', 'sk-pill'));
      r.appendChild(skeletonBar('30%'));
      list.appendChild(r);
    }
    wrap.appendChild(list);
  }
  host.appendChild(wrap);
}

function doneLoading(id) {
  const host = slot(id);
  if (host) host.removeAttribute('aria-busy');
}

/* Track names and the CSS class that colours their pill. */
const TRACK_CLASS = { Castle: 'castle', Storybook: 'storybook', Both: 'both', TBD: 'tbd' };

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

/* A date's title can carry extra lines. In the Sheet, Alt+Enter inside the Title
   cell starts a new line; the first line is the title and each line after it is
   a subtitle under it, such as "(Sorry parents, students only)". */
function titleParts(ev) {
  const lines = String(ev.title || '').split(/\r?\n/)
    .map(t => t.trim()).filter(Boolean);
  return { title: lines[0] || '', subs: lines.slice(1) };
}

/* ---------- published Sheet content ----------
   The calendar, announcements and cast are edited in a Google Sheet and
   published to data/sheet-cache/ as CSV. Each tab is read from there. */

// Splits CSV text into rows of cells, honouring quoted cells that contain
// commas, doubled quotes or line breaks.
function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(cell); cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else {
      cell += c;
    }
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// A tab's CSV as objects keyed by the headings in row 1. Row 2 holds hints for
// editors and is skipped, as are entirely blank rows.
function sheetRows(text, required) {
  const rows = parseCSV(text);
  const heads = (rows[0] || []).map(h => h.trim());
  required.forEach(h => {
    if (!heads.includes(h)) throw new Error('the sheet has no "' + h + '" column');
  });
  return rows.slice(2)
    .map(r => Object.fromEntries(heads.map((h, i) => [h, (r[i] || '').trim()])))
    .filter(o => Object.values(o).some(Boolean));
}

/* The pages read the published copy of the Sheet in data/sheet-cache/, not the
   Sheet itself. An editor makes as many changes as they like, then clicks
   Publish in the Sheet, and a GitHub job copies the tabs here. So the site only
   ever shows finished work, and it loads from this site rather than waiting on
   Google. The files in /data are a last resort if a published copy is missing. */
const SHEET_CACHE = 'data/sheet-cache/';
let usedBackup = false;

async function fetchPublished(name) {
  const res = await fetch(SHEET_CACHE + name + '.csv?t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('the published ' + name + ' returned ' + res.status);
  const text = (await res.text()).replace(/^﻿/, '');
  if (/^\s*</.test(text)) throw new Error('the published ' + name + ' is not CSV');
  return text;
}

// One piece of content from its published tab. `base` is the file version (or a
// promise of it), used for headings the Sheet does not hold and as the last
// resort. `transform` turns rows into the shape the page renders.
async function contentFor(name, base, required, transform) {
  const published = fetchPublished(name).catch(err => err);
  const saved = await base;
  const text = await published;
  try {
    if (text instanceof Error) throw text;
    return transform(sheetRows(text, required), saved);
  } catch (err) {
    usedBackup = true;
    console.warn('Could not read the published ' + name + ' (' + err.message + '). Showing the site files.');
    return saved;
  }
}

// Accepts 2026-11-04, 11/4/2026 or 11/4/26 and returns 2026-11-04, or null.
function isoDate(value) {
  const s = (value || '').trim();
  let y, m, d, hit;
  if ((hit = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) { y = +hit[1]; m = +hit[2]; d = +hit[3]; }
  else if ((hit = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/))) {
    m = +hit[1]; d = +hit[2]; y = hit[3].length === 2 ? 2000 + +hit[3] : +hit[3];
  } else return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

function dateParts(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    year: y, day: d,
    mon: dt.toLocaleString('en-US', { month: 'short' }),
    monthName: dt.toLocaleString('en-US', { month: 'long' }),
    weekday: dt.toLocaleString('en-US', { weekday: 'short' })
  };
}

function pickTrack(value, allowed, fallback) {
  const v = (value || '').trim().toLowerCase();
  return allowed.find(t => t.toLowerCase() === v) || fallback;
}

const sheetYes = v => /^(yes|y|true|x)$/i.test((v || '').trim());

function calendarFromSheet(rows, saved) {
  // Headings and intros still come from the file; the sheet supplies the dates.
  const sections = new Map();
  (saved.calendars || []).forEach(c =>
    sections.set(c.heading, { id: c.id, heading: c.heading, intro: c.intro || '', events: [] }));
  const firstHeading = saved.calendars && saved.calendars[0] ? saved.calendars[0].heading : 'Calendar';

  rows.forEach(r => {
    const date = isoDate(r['Date']);
    if (!date || !r['Title']) return;
    const heading = r['Section'] || firstHeading;
    if (!sections.has(heading)) sections.set(heading, { heading, intro: '', events: [] });

    const start = dateParts(date);
    const endIso = isoDate(r['End date']);
    const end = endIso && endIso > date ? dateParts(endIso) : null;
    const hasStudyHall = r['Study hall time'] || r['Study hall volunteer'] ||
      r['Study hall students'] || r['Study hall note'];

    sections.get(heading).events.push({
      date,
      day: end ? start.day + '-' + end.day : String(start.day),
      month: start.mon,
      weekday: end ? start.weekday + '-' + end.weekday : start.weekday,
      performance: sheetYes(r['Performance']),
      title: r['Title'],
      track: pickTrack(r['Track'], ['Castle', 'Storybook'], ''),
      blocks: [1, 2, 3]
        .map(n => ({ time: r['Time ' + n] || '', what: r['What ' + n] || '' }))
        .filter(b => b.time || b.what),
      notes: (r['Notes'] || '').split(/\r?\n/).map(s => s.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean),
      cast: r['Cast needed'] || '',
      studyHall: hasStudyHall ? {
        time: r['Study hall time'] || '',
        volunteer: r['Study hall volunteer'] || '',
        students: r['Study hall students'] || '',
        note: r['Study hall note'] || ''
      } : null,
      titleUrl: r['Link'] || '',
      titleUrlLabel: r['Link label'] || ''
    });
  });

  const calendars = [];
  sections.forEach(sec => {
    if (!sec.events.length) return;
    sec.events.sort((a, b) => a.date.localeCompare(b.date));
    const months = [];
    sec.events.forEach(ev => {
      const p = dateParts(ev.date);
      const name = p.monthName + ' ' + p.year;
      if (!months.length || months[months.length - 1].name !== name) months.push({ name, events: [] });
      months[months.length - 1].events.push(ev);
    });
    calendars.push({ id: sec.id, heading: sec.heading, intro: sec.intro, months });
  });
  if (!calendars.length) throw new Error('the Calendar tab has no dates');
  return Object.assign({}, saved, { calendars });
}

function announcementsFromSheet(rows) {
  return rows
    .filter(r => r['Title'] && !/^no$/i.test(r['Show'] || ''))
    .map(r => ({
      date: r['Date'] || '', icon: r['Icon'] || '', title: r['Title'],
      detail: r['Detail'] || '', url: r['Link'] || ''
    }));
}

function castFromSheet(rows, saved) {
  // One row per role. Rows sharing an actor's name become one person, in the
  // order they first appear. TBD rows are different unknown people, so each
  // stays on its own.
  const members = [];
  const byName = new Map();
  rows.forEach(r => {
    if (!r['Actor'] && !r['Role']) return;
    const part = {
      role: r['Role'] || '',
      track: pickTrack(r['Track'], ['Castle', 'Storybook', 'Both', 'TBD'], 'Both'),
      description: r['Description'] || ''
    };
    const name = r['Actor'] || 'TBD';
    const alone = /^tbd$/i.test(name);
    if (!alone && byName.has(name)) { byName.get(name).parts.push(part); return; }
    const person = { actor: name, parts: [part] };
    members.push(person);
    if (!alone) byName.set(name, person);
  });
  if (!members.length) throw new Error('the Cast tab has no rows');
  return Object.assign({}, saved, { members });
}

/* ---------- shared chrome ---------- */

function renderChrome(site) {
  document.querySelectorAll('[data-site="school"]').forEach(n => n.textContent = site.school);
  document.querySelectorAll('[data-site="season"]').forEach(n => n.textContent = site.season);
  document.querySelectorAll('[data-site="showTitle"]').forEach(n => n.textContent = site.showTitle);

  const footer = slot('footer-note');
  if (footer && site.footerNote) footer.textContent = site.footerNote;

  // Optional feedback link, placed just above the motto. Delete the "feedback"
  // block from data/site.json and it disappears from every page.
  if (footer && site.feedback && site.feedback.url) {
    const row = el('p', 'footer-feedback');
    row.appendChild(link(site.feedback.url, '💬  ' + (site.feedback.label || 'Share feedback') + ' »'));
    footer.parentNode.insertBefore(row, footer);
  }

  const contacts = slot('contacts');
  if (contacts && Array.isArray(site.contacts)) {
    contacts.innerHTML = '';
    site.contacts.forEach(c => {
      const card = el('div', 'contact-card');
      card.appendChild(el('div', 'label', (c.icon ? c.icon + '  ' : '') + c.label));
      const value = el('div', 'value');
      value.appendChild(c.url ? link(c.url, c.name) : document.createTextNode(c.name));
      card.appendChild(value);
      if (c.detail) card.appendChild(el('div', 'detail', c.detail));
      contacts.appendChild(card);
    });
  }
}

/* ---------- announcements ---------- */

function upcomingEvents(calendarData, count) {
  const today = todayISO();
  const all = [];
  (calendarData.calendars || []).forEach(cal =>
    (cal.months || []).forEach(month =>
      (month.events || []).forEach(ev => all.push(ev))));
  return all
    .filter(ev => ev.date && ev.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, count);
}

function renderAnnouncements(site, calendarData) {
  const host = slot('announcements');
  if (!host || !site.announcements) return;
  const a = site.announcements;
  host.innerHTML = '';
  host.appendChild(el('h2', null, a.heading || 'Announcements'));

  const grid = el('div', 'announce-grid');
  (a.items || []).forEach(item => {
    const card = el('div', 'announce');
    if (item.date) card.appendChild(el('div', 'when', item.date));
    card.appendChild(el('div', 'title', (item.icon ? item.icon + '  ' : '') + item.title));
    if (item.detail) {
      const d = el('div', 'detail');
      d.appendChild(item.url ? link(item.url, item.detail) : document.createTextNode(item.detail));
      card.appendChild(d);
    }
    grid.appendChild(card);
  });
  if (grid.children.length) host.appendChild(grid);

  if (!calendarData) return;

  host.appendChild(el('h3', null, a.upcomingHeading || 'Coming up'));
  const next = upcomingEvents(calendarData, a.upcomingCount || 3);

  if (!next.length) {
    host.appendChild(el('p', 'section-intro', a.upcomingEmpty || 'Nothing on the calendar right now.'));
    return;
  }

  const upGrid = el('div', 'announce-grid');
  next.forEach((ev, i) => {
    const card = el('div', 'announce' + (ev.performance ? ' is-show' : '') + (i === 0 ? ' is-next' : ''));
    const when = el('div', 'when');
    when.textContent = [ev.month, ev.day].filter(Boolean).join(' ') +
      (ev.weekday ? '  ·  ' + ev.weekday : '');
    card.appendChild(when);
    card.appendChild(el('div', 'title', titleParts(ev).title));
    (ev.blocks || []).forEach(b => {
      const line = el('div', 'detail');
      line.appendChild(el('strong', null, b.time));
      line.appendChild(document.createTextNode('  ' + (b.what || '')));
      card.appendChild(line);
    });
    card.appendChild(link('calendar.html', 'See the calendar »', 'more'));
    upGrid.appendChild(card);
  });
  host.appendChild(upGrid);
}

/* ---------- links ---------- */

function renderLinks(data) {
  const host = slot('links');
  if (!host) return;
  host.innerHTML = '';
  host.appendChild(el('h2', null, data.heading || 'Links & Folders'));
  (data.groups || []).forEach(group => {
    host.appendChild(el('h3', null, group.title));
    const grid = el('div', 'link-grid' + (group.id ? ' ' + group.id : ''));
    (group.links || []).forEach(l => {
      const card = link(l.url, null, 'link-card');
      const title = el('div', 'title');
      title.textContent = (l.icon ? l.icon + '  ' : '') + l.title + ' ';
      title.appendChild(el('span', 'arrow', '»'));
      card.appendChild(title);
      if (l.note) card.appendChild(el('div', 'note', l.note));
      grid.appendChild(card);
    });
    host.appendChild(grid);
  });
}

/* ---------- calendar ---------- */

// Study hall only appears when a volunteer is named. With just a few students
// in study hall, parents no longer sign up, so an empty slot shows nothing.
// The students list is not shown; it only keeps the name picker from telling
// those students to stay home.
/* Study hall shows only when the Sheet says something about it. Put a parent's
   name in "Study hall volunteer" and it shows their name; write "Needed" and it
   shows a sign-up link for that date until someone's name replaces it; leave it
   blank and nothing shows at all. The link is dropped once the date has passed. */
const WANTS_VOLUNTEER = /^(needed|need a volunteer|needs a volunteer|sign ?up|open|tbd|\?)$/i;

function renderStudyHall(sh, site, isPast) {
  if (!sh) return null;
  const name = (sh.volunteer || '').trim();
  const wanted = WANTS_VOLUNTEER.test(name);
  if (!name || name.toLowerCase() === 'none') {
    return sh.note ? el('div', 'study study-note', sh.note) : null;
  }
  if (wanted && isPast) return null;

  const row = el('div', 'study');
  row.appendChild(el('span', 'study-label', 'Study hall' + (sh.time ? ' ' + sh.time : '')));
  if (wanted) {
    row.appendChild(el('span', 'study-open', 'Needs a volunteer'));
    const url = site && site.studyHallSignupUrl;
    if (url) row.appendChild(link(url, 'Sign up »', 'study-link'));
  } else {
    row.appendChild(el('span', 'study-name', name));
  }
  if (sh.note) row.appendChild(el('div', 'study-note', sh.note));
  return row;
}

/* ---------- who is called to each rehearsal ---------- */

// "David, (Storyteller 6), Clara D" -> ["David", "Storyteller 6", "Clara D"]
function castTokens(list) {
  return (list || '').split(/[,;\n]/)
    .map(t => t.replace(/[()]/g, '').replace(/\bTBD\b/gi, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

const normName = s => (s || '').toLowerCase().replace(/[.]/g, '').replace(/\s+/g, ' ').trim();

// "Donkeys" -> "donkey", "Blind Mice" -> "blind mouse", "Princesses" -> "princess".
function singular(word) {
  const w = normName(word);
  if (/\bmice$/.test(w)) return w.replace(/mice$/, 'mouse');
  if (/ies$/.test(w)) return w.replace(/ies$/, 'y');
  if (/sses$/.test(w)) return w.replace(/es$/, '');
  if (/[^s]s$/.test(w)) return w.slice(0, -1);
  return w;
}

// A role as written on the cast list, and the family it belongs to with any
// number dropped: "Storyteller 3" -> "storyteller", "Little Pig 2" -> "little pig".
function roleForms(role) {
  const exact = normName(role);
  return { exact, family: exact.replace(/\s+\d+$/, '') };
}

// Does a word on a cast list name this role? When some role is named exactly
// that ("Shrek", or "Shreks" meaning Shrek), only exact matches count, so Little
// Shrek is not pulled in. Otherwise a word without a number matches the whole
// family and any role it begins or ends: "Storytellers" covers Storyteller 1
// to 6 and "Fionas" covers Human, Teen, Young and Ogre Fiona. Loose matches
// include more people, never fewer, so nobody is told to stay home by mistake.
function tokenMatchesRole(token, role, exactOnly) {
  const { exact, family } = roleForms(role);
  const words = [normName(token), singular(token)];
  if (words.includes(exact)) return true;
  if (exactOnly || /\d/.test(words[0])) return false;
  return words.some(w => w === family || family.startsWith(w + ' ') || family.endsWith(' ' + w));
}

// Everyone on the cast list, with the ways they can be named: full name, first
// name, first name plus last initial ("Clara D"), and each role they play. A
// first name shared by two people matches both; a last initial tells them apart.
function castPeople(castData) {
  return (castData && castData.members ? castData.members : [])
    .filter(m => m.actor && !/^tbd$/i.test(m.actor))
    .map(m => {
      const words = m.actor.trim().split(/\s+/);
      const first = words[0];
      const initial = words.length > 1 ? words[1][0] : '';
      const names = new Set([normName(m.actor), normName(first)]);
      if (initial) names.add(normName(first + ' ' + initial));
      const roles = [];
      (m.parts || []).forEach(p =>
        (p.role || '').split(/\s+or\s+/i).forEach(r => r && roles.push({ role: r.trim(), track: p.track })));
      return { actor: m.actor, first, names, roles };
    });
}

// Roles still waiting on casting, so a list can say who is coming once they are named.
function unassignedRoles(castData) {
  return (castData && castData.members ? castData.members : [])
    .filter(m => /^tbd$/i.test(m.actor || ''))
    .flatMap(m => (m.parts || []).map(p => p.role));
}

// Turns a cast-needed list into people. Returns each person matched with the
// roles that matched them, in list order, plus any words that matched nobody.
function resolveCast(list, people, unassigned) {
  const found = new Map();
  const leftovers = [];
  const allRoles = people.flatMap(p => p.roles.map(r => r.role)).concat(unassigned);
  castTokens(list).forEach(token => {
    const exactOnly = allRoles.some(r => tokenMatchesRole(token, r, true));
    let hit = false;
    people.forEach(person => {
      const byName = person.names.has(normName(token));
      const roles = byName ? person.roles : person.roles.filter(r => tokenMatchesRole(token, r.role, exactOnly));
      if (!roles.length) return;
      hit = true;
      if (!found.has(person.actor)) found.set(person.actor, { person, roles: [] });
      const entry = found.get(person.actor);
      roles.forEach(r => {
        if (!entry.roles.some(x => x.role === r.role && x.track === r.track)) entry.roles.push(r);
      });
    });
    const pending = unassigned.filter(r => tokenMatchesRole(token, r, exactOnly));
    if (pending.length) leftovers.push({ token, pending });
    else if (!hit) leftovers.push({ token, pending: [] });
  });
  return { matched: [...found.values()], leftovers };
}

// Where a person stands for one event: 'all', 'yes', 'no', 'none' (nobody is
// called), 'unposted', or 'study' (listed for study hall but not the rehearsal).
function callStatus(ev, person, people, unassigned) {
  const raw = (ev.cast || '').trim();
  const inList = list => resolveCast(list, people, unassigned).matched.some(m => m.person.actor === person.actor);
  if (/^all$/i.test(raw)) return 'all';
  if (/^none$/i.test(raw)) return 'none';
  if (!raw) return 'unposted';
  if (inList(raw)) return 'yes';
  if (ev.studyHall && inList(ev.studyHall.students)) return 'study';
  return 'no';
}

// "Cast needed" as a row of names, each showing the role or roles that put
// them there on hover or tap.
function renderCastNeeded(list, people, unassigned) {
  const raw = (list || '').trim();
  if (!raw || /^none$/i.test(raw)) return null;
  const row = el('div', 'cast-needed');
  row.appendChild(el('span', 'cast-needed-label', 'Cast needed'));
  if (/^all$/i.test(raw)) {
    row.appendChild(document.createTextNode(' All'));
    return row;
  }
  if (!people.length) {
    row.appendChild(document.createTextNode(' ' + raw));
    return row;
  }
  const { matched, leftovers } = resolveCast(raw, people, unassigned);
  const names = el('span', 'cast-names');
  matched.forEach(({ person, roles }) => {
    const label = roles.map(r => r.role + (r.track && r.track !== 'Both' ? ' (' + r.track + ')' : '')).join(', ');
    const chip = el('span', 'cast-name', person.actor);
    chip.tabIndex = 0;
    chip.title = label;
    chip.dataset.role = label;
    chip.dataset.actor = person.actor;
    chip.setAttribute('aria-label', person.actor + ', ' + label);
    names.appendChild(chip);
  });
  leftovers.forEach(({ token, pending }) => {
    const text = pending.length ? pending.join(', ') + ' (not cast yet)' : token;
    const chip = el('span', 'cast-name is-unmatched', text);
    if (!pending.length) chip.title = 'Nobody on the cast list has this role or name';
    names.appendChild(chip);
  });
  row.appendChild(names);
  return row;
}

function applyCastFilter(cards, person, people, unassigned) {
  cards.forEach(({ card, ev, note }) => {
    card.classList.remove('is-called', 'is-not-called');
    // Ring the picked student's own name among the cast on each date.
    card.querySelectorAll('.cast-name[data-actor]').forEach(chip =>
      chip.classList.toggle('is-picked', !!person && chip.dataset.actor === person.actor));
    note.hidden = true;
    note.className = 'call-note';
    if (!person) return;
    const status = callStatus(ev, person, people, unassigned);
    const say = (cls, text) => { note.textContent = text; note.classList.add(cls); note.hidden = false; };
    if (status === 'yes' || status === 'all') {
      card.classList.add('is-called');
      say('is-yes', '✓ ' + person.first + ' is needed');
    } else if (status === 'no') {
      card.classList.add('is-not-called');
      say('is-no', person.first + ' is not needed at this rehearsal');
    } else if (status === 'none') {
      card.classList.add('is-not-called');
      say('is-no', 'No rehearsal for anyone');
    } else if (status === 'study') {
      say('is-study', person.first + ' is listed for study hall');
    } else if (!card.classList.contains('is-past')) {
      say('is-unposted', 'Cast list not posted yet');
    }
  });
}

function renderCalendars(data, site, castData) {
  const host = slot('calendars');
  if (!host) return;
  host.innerHTML = '';
  const today = todayISO();
  let nextMarked = false;
  let nextCard = null;
  const people = castPeople(castData);
  const unassigned = unassignedRoles(castData);
  const cards = [];

  const jumpBar = el('div', 'jump-bar');

  let picker = null;
  if (people.length) {
    const label = el('label', 'cast-picker');
    label.appendChild(el('span', 'cast-picker-label', 'Show rehearsals for'));
    picker = el('select');
    picker.appendChild(new Option('Everyone', ''));
    people
      .slice()
      .sort((a, b) => a.actor.localeCompare(b.actor))
      .forEach(p => picker.appendChild(new Option(p.actor, p.actor)));
    label.appendChild(picker);
    jumpBar.appendChild(label);
  }

  const jump = el('button', 'jump', '↓  Jump to what is next');
  jump.type = 'button';
  jumpBar.appendChild(jump);
  host.appendChild(jumpBar);

  (data.calendars || []).forEach(cal => {
    const section = el('section');
    if (cal.id) section.id = 'cal-' + cal.id;
    section.appendChild(el('h2', null, cal.heading));
    if (cal.intro) section.appendChild(el('p', 'section-intro', cal.intro));

    (cal.months || []).forEach(month => {
      const events = month.events || [];
      const done = events.length > 0 && events.every(ev => ev.date && ev.date < today);

      const box = el('details', 'month' + (done ? ' is-done' : ''));
      box.open = !done;
      const head = el('summary', 'month-label');
      head.appendChild(el('span', 'month-name', month.name));
      head.appendChild(el('span', 'month-count',
        done ? events.length + ' dates · all done' : events.length + ' dates'));
      box.appendChild(head);

      const list = el('div', 'events');

      events.forEach(ev => {
        const isPast = !!(ev.date && ev.date < today);
        const card = el('article', 'event' + (ev.performance ? ' is-show' : ''));
        if (isPast) {
          card.classList.add('is-past');
        } else if (ev.date && !nextMarked) {
          card.classList.add('is-next');
          card.id = 'next';
          nextMarked = true;
          nextCard = card;
        }

        const chip = el('div', 'date');
        chip.appendChild(el('div', 'mon', ev.month || ''));
        chip.appendChild(el('div', 'num', ev.day || ''));
        if (ev.weekday) chip.appendChild(el('div', 'wd', ev.weekday));
        card.appendChild(chip);

        const body = el('div', 'body');
        const line = el('div', 'head');
        if (ev.performance) line.appendChild(el('span', 'badge', '★ Performance'));
        if (card.classList.contains('is-next')) line.appendChild(el('span', 'badge next', 'Next up'));
        const parts = titleParts(ev);
        line.appendChild(el('span', 'title', parts.title));
        if (ev.track) {
          line.appendChild(el('span', 'track track-' + (TRACK_CLASS[ev.track] || 'both'), ev.track));
        }
        body.appendChild(line);
        parts.subs.forEach(text => body.appendChild(el('div', 'subtitle', text)));

        if (ev.titleUrl) {
          const p = el('div', 'event-link');
          p.appendChild(link(ev.titleUrl, (ev.titleUrlLabel || 'More info') + ' »'));
          body.appendChild(p);
        }

        const note = el('div', 'call-note');
        note.hidden = true;
        body.appendChild(note);

        if ((ev.blocks || []).length) {
          const blocks = el('div', 'blocks');
          ev.blocks.forEach(b => {
            blocks.appendChild(el('div', 'btime', b.time || ''));
            blocks.appendChild(el('div', 'bwhat', b.what || ''));
          });
          body.appendChild(blocks);
        }

        // Notes: one bullet per line. A line that is only a time, such as
        // "2:00-3:30pm", starts a new group with that time as its heading.
        const lines = (ev.notes || []).map(n => (n || '').trim()).filter(Boolean);
        if (lines.length) {
          const notes = el('div', 'notes');
          let ul = null;
          lines.forEach(text => {
            if (/^\d{1,2}(:\d{2})?\s*[-–]\s*\d{1,2}(:\d{2})?\s*(am|pm)?$/i.test(text)) {
              notes.appendChild(el('div', 'notes-time', text));
              ul = null;
              return;
            }
            if (!ul) { ul = el('ul'); notes.appendChild(ul); }
            ul.appendChild(el('li', null, text));
          });
          body.appendChild(notes);
        }

        const castRow = renderCastNeeded(ev.cast, people, unassigned);
        if (castRow) body.appendChild(castRow);

        const sh = renderStudyHall(ev.studyHall, site, isPast);
        if (sh) body.appendChild(sh);

        card.appendChild(body);
        list.appendChild(card);
        cards.push({ card, ev, note });
      });
      box.appendChild(list);
      section.appendChild(box);
    });
    host.appendChild(section);
  });

  const goToNext = () => {
    if (!nextCard) return;
    // The date may sit inside a month that folded itself shut.
    const month = nextCard.closest('details.month');
    if (month) month.open = true;
    nextCard.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  if (nextCard) {
    jump.addEventListener('click', goToNext);
    if (location.hash === '#next') setTimeout(goToNext, 120);
  } else {
    jump.remove();
    if (!picker) jumpBar.remove();
  }

  if (picker) {
    const KEY = 'maas-calendar-cast';
    const choose = name => {
      const person = people.find(p => p.actor === name) || null;
      applyCastFilter(cards, person, people, unassigned);
      host.classList.toggle('is-filtered', !!person);
    };
    picker.addEventListener('change', () => {
      choose(picker.value);
      try { localStorage.setItem(KEY, picker.value); } catch (e) { /* storage unavailable */ }
    });
    let saved = '';
    try { saved = localStorage.getItem(KEY) || ''; } catch (e) { /* storage unavailable */ }
    if (saved && people.some(p => p.actor === saved)) {
      picker.value = saved;
      choose(saved);
    }
  }
}

/* ---------- performances ---------- */

function renderPerformances(data, site) {
  const host = slot('performances');
  if (!host) return;
  host.innerHTML = '';
  const today = todayISO();

  const shows = [];
  (data.calendars || []).forEach(cal =>
    (cal.months || []).forEach(month =>
      (month.events || []).forEach(ev => {
        if (ev.performance) shows.push(ev);
      })));
  shows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const upcoming = shows.filter(ev => !ev.date || ev.date >= today);
  const past = shows.filter(ev => ev.date && ev.date < today);

  const card = ev => {
    const box = el('article', 'event is-show' + (ev.date && ev.date < today ? ' is-past' : ''));
    const chip = el('div', 'date');
    chip.appendChild(el('div', 'mon', ev.month || ''));
    chip.appendChild(el('div', 'num', ev.day || ''));
    if (ev.weekday) chip.appendChild(el('div', 'wd', ev.weekday));
    box.appendChild(chip);

    const body = el('div', 'body');
    const head = el('div', 'head');
    head.appendChild(el('span', 'badge', '★ Performance'));
    const parts = titleParts(ev);
    head.appendChild(el('span', 'title', parts.title));
    if (ev.track) {
      head.appendChild(el('span', 'track track-' + (TRACK_CLASS[ev.track] || 'both'), ev.track));
    }
    body.appendChild(head);
    parts.subs.forEach(text => body.appendChild(el('div', 'subtitle', text)));
    if ((ev.blocks || []).length) {
      const blocks = el('div', 'blocks');
      ev.blocks.forEach(b => {
        blocks.appendChild(el('div', 'btime', b.time || ''));
        blocks.appendChild(el('div', 'bwhat', b.what || ''));
      });
      body.appendChild(blocks);
    }
    box.appendChild(body);
    return box;
  };

  const section = el('section');
  section.appendChild(el('h2', null, 'Show dates'));
  const intro = el('p', 'section-intro');
  intro.appendChild(document.createTextNode('See '));
  intro.appendChild(link('calendar.html', 'calendar'));
  intro.appendChild(document.createTextNode(' for rehearsal dates and times'));
  section.appendChild(intro);

  if (upcoming.length) {
    const list = el('div', 'events');
    upcoming.forEach((ev, i) => {
      const box = card(ev);
      if (i === 0) box.classList.add('is-next');
      list.appendChild(box);
    });
    section.appendChild(list);
  } else {
    section.appendChild(el('p', 'section-intro', 'No performances are scheduled right now.'));
  }
  host.appendChild(section);

  if (past.length) {
    const done = el('section');
    const box = el('details', 'month is-done');
    const head = el('summary', 'month-label');
    head.appendChild(el('span', 'month-name', 'Already performed'));
    head.appendChild(el('span', 'month-count', past.length + (past.length === 1 ? ' show' : ' shows')));
    box.appendChild(head);
    const list = el('div', 'events');
    past.forEach(ev => list.appendChild(card(ev)));
    box.appendChild(list);
    done.appendChild(box);
    host.appendChild(done);
  }

}

/* ---------- cast ---------- */

// One student's scenes on one track, as a list: each scene with what they wear
// (and do) in it, and its songs with their practice tracks.
function castSceneList(on, songsFor) {
  const list = el('ol', 'my-scenes');
  on.forEach(app => {
    const li = el('li');
    const head = el('div', 'my-scene-head');
    head.appendChild(el('strong', 'my-scene-name', (app.i + 1) + '. ' + app.name));
    const wear = [...new Set(app.bits.map(b => b.costume + (b.role ? ' (' + b.role + ')' : '')))];
    head.appendChild(el('small', null, 'as ' + wear.join(', ')));
    li.appendChild(head);
    const songs = songsFor(app.name);
    if (songs.length) {
      const ul = el('ul', 'songs');
      songs.forEach(x => ul.appendChild(songLine(x)));
      li.appendChild(ul);
    }
    list.appendChild(li);
  });
  return list;
}

// The sentences every description of a role shares, so a note about one actor
// ("This actor also plays...") drops out. With nothing in common, the first one.
function sharedDescription(list) {
  if (list.length < 2) return list[0] || '';
  const split = d => d.match(/[^.!?]+[.!?]*["”']?\s*/g).map(x => x.trim()).filter(Boolean);
  const common = split(list[0]).filter(x => list.every(d => split(d).includes(x)));
  return common.length ? common.join(' ') : list[0];
}

const descKey = d => String(d || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// A shared card's name: "Guard 1–5" for a numbered set, otherwise "A, B & C".
function cardName(names) {
  if (names.length === 1) return names[0];
  const nums = names.map(n => n.match(/^(.*\S)\s+(\d+)$/));
  if (nums.every(m => m && m[1] === nums[0][1])) {
    const ns = nums.map(m => +m[2]).sort((a, b) => a - b);
    return nums[0][1] + ' ' + ns[0] + '–' + ns[ns.length - 1];
  }
  return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
}

// Roles under their headings: the groups in the characters block of
// data/cast.json first, in its order, then the Scenes tab's groups for anything
// not listed there (never Leads, which only holds the roles listed under it).
// Each role is { name, who: [{ actor, track }] }. Returns Map(title -> roles).
function roleGroups(roles, rows, config) {
  const groups = new Map();
  const placed = new Set();
  ((config && config.groups) || []).forEach(g => {
    const list = groups.get(g.title) || [];
    (g.roles || []).forEach(name => {
      const role = roles.find(r => sceneKey(r.name) === sceneKey(name));
      if (role && !placed.has(role)) { list.push(role); placed.add(role); }
    });
    groups.set(g.title, list);
  });
  const groupOf = role => {
    const votes = new Map();
    role.who.forEach(w => rows.filter(r => r.student === w.actor && r.group && !/^leads$/i.test(r.group))
      .forEach(r => votes.set(r.group, (votes.get(r.group) || 0) + 1)));
    let best = '';
    votes.forEach((n, g) => { if (!best || n > votes.get(best)) best = g; });
    return best || 'More characters';
  };
  roles.forEach(role => {
    if (placed.has(role)) return;
    const g = groupOf(role);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(role);
  });
  return groups;
}

// The role a scene cell names: its costume, or the role in brackets.
const namedRole = (cell, mine) =>
  mine.find(r => sceneKey(r) === sceneKey(cell.costume) || (cell.role && sceneKey(r) === sceneKey(cell.role)));

// Which of a student's roles (mine) a scene belongs to, or null when it is not
// one of them. The costume usually names the role. A crowd costume (one that
// students playing different characters all wear, like Duloc or Old knight)
// is the ensemble at work, so it counts only for a role in the characters
// block's last group, Dance Team & ensemble. Any other costume, like Fiona's
// wedding dress, is the role itself: the student's only role on the track, or
// the one in the latest group when they have several.
function sceneRole(cell, mine, rankOf, crowd, lastRank) {
  const hit = namedRole(cell, mine);
  if (hit) return hit;
  const pick = list => {
    if (list.length === 1) return list[0];
    const ranks = list.map(rankOf);
    const top = Math.max(...ranks);
    return top >= 0 && ranks.filter(x => x === top).length === 1 ? list[ranks.indexOf(top)] : null;
  };
  if (crowd) return lastRank >= 0 ? pick(mine.filter(r => rankOf(r) === lastRank)) || null : null;
  return pick(mine);
}

// "Meet the characters": one card per character with who plays it and what the
// character is like. Headings and order come from the characters block in
// data/cast.json; a role not listed there goes under its students' group on
// the Scenes tab. The roles in each of its "cards" share one card under that
// name; otherwise roles with the same description share a card, as do roles
// where one description simply adds to the other (Young and Teen Fiona).
function renderCharacters(members, sceneData, config) {
  config = config || {};
  const skip = new Set((config.skip || []).map(sceneKey));
  const rows = (sceneData && sceneData.cast) || [];
  const onStage = new Set(rows.map(r => r.student));

  const roles = new Map();
  members.forEach(m => m.parts.forEach(p => {
    if (!p.role || skip.has(sceneKey(p.role))) return;
    if (!roles.has(p.role)) roles.set(p.role, { name: p.role, who: [], descriptions: [] });
    const r = roles.get(p.role);
    if (!/^tbd$/i.test(m.actor)) r.who.push({ actor: m.actor, track: p.track });
    if (p.description && !r.descriptions.includes(p.description)) r.descriptions.push(p.description);
  }));
  // Someone who is never on stage is crew, not a character.
  if (rows.length) roles.forEach((r, k) => { if (r.who.length && !r.who.some(w => onStage.has(w.actor))) roles.delete(k); });
  roles.forEach(r => { r.description = sharedDescription(r.descriptions); });

  const groups = roleGroups([...roles.values()], rows, config);

  const section = el('section', 'characters');
  section.id = 'characters';
  section.appendChild(el('h2', null, 'Meet the characters'));
  section.appendChild(el('p', 'section-intro', 'Every character in the show, who plays them, and what they are like.'));
  // Named cards from data/cast.json, keyed by each of their roles.
  const named = new Map();
  (config.cards || []).forEach(c => (c.roles || []).forEach(r => named.set(sceneKey(r), c)));

  groups.forEach((list, title) => {
    // A named card collects its roles; the rest share a card when their
    // descriptions match, or one starts with the other.
    const cards = [];
    list.forEach(role => {
      const def = named.get(sceneKey(role.name));
      const k = descKey(role.description);
      const card = def
        ? cards.find(c => c.def === def)
        : k && cards.find(c => !c.def && c.keys.some(ck => ck.startsWith(k) || k.startsWith(ck)));
      if (card) { card.roles.push(role); card.keys.push(k); }
      else cards.push({ def, name: def && def.name, roles: [role], keys: [k] });
    });
    if (!cards.length) return;
    section.appendChild(el('h3', null, title));
    const grid = el('div', 'character-grid');
    cards.forEach(c => {
      const card = el('article', 'character');
      const title = c.name || cardName(c.roles.map(r => r.name));
      const head = el('div', 'character-head');
      const icon = el('span', 'character-icon', (config.icons || {})[title] || '🎭');
      icon.setAttribute('aria-hidden', 'true');
      head.appendChild(icon);
      head.appendChild(el('span', 'character-name', title));
      card.appendChild(head);
      const shared = c.roles.length > 1;
      const trackOrder = { Castle: 0, Storybook: 1 };
      const who = c.roles.flatMap(r => r.who.map(w => Object.assign({ role: r.name }, w))
        .sort((a, b) => (trackOrder[a.track] ?? 2) - (trackOrder[b.track] ?? 2)));
      if (who.length) {
        const tags = el('div', 'character-tags');
        who.forEach(w => {
          const tag = el('span', 'character-who');
          tag.appendChild(document.createTextNode(w.actor));
          // The card's name already says "Fiona", so Human Fiona reads as just "Human".
          const last = title.split(/\s+/).pop().toLowerCase();
          const short = w.role.replace(/\s+(\S+)$/, (m, word) => word.toLowerCase() === last ? '' : m);
          if (shared) tag.appendChild(el('small', null, short || w.role));
          if (w.track !== 'Both') tag.appendChild(el('span', 'track track-' + (TRACK_CLASS[w.track] || 'both'), w.track));
          tags.appendChild(tag);
        });
        card.appendChild(tags);
      }
      // One description for the card when the roles share it; a role whose
      // description adds to it gets a note; roles that are just different
      // (the Three Bears) each get their own line.
      const note = (label, text) => {
        const p = el('p', 'character-desc');
        if (label) p.appendChild(el('strong', null, label + ': '));
        p.appendChild(document.createTextNode(text));
        card.appendChild(p);
      };
      const withDesc = c.roles.filter(r => r.description);
      const base = withDesc.map(r => r.description).sort((a, b) => a.length - b.length)[0];
      const repeatsTitle = base && descKey(title).startsWith(descKey(base));
      if (base && withDesc.every(r => r.description.startsWith(base))) {
        if (!repeatsTitle) note('', base);
        withDesc.forEach(r => {
          const extra = r.description.slice(base.length).trim();
          if (extra) note(r.name, extra);
        });
      } else {
        withDesc.forEach(r => note(r.name, r.description));
      }
      grid.appendChild(card);
    });
    section.appendChild(grid);
  });
  return section;
}

// sceneData: the Scenes tab, or null when it could not be read, in which case
// every named cast member links through and the scenes column says so.
function renderCast(data, sceneData, songData) {
  const host = slot('cast');
  if (!host) return;
  host.innerHTML = '';

  // Lord Farquaad's banner beside the proclamation on a wide screen; on a phone
  // his initial sits behind the text as a watermark instead.
  const head = el('div', 'cast-head');
  const intro = el('div', 'cast-intro');
  const mark = el('div', 'cast-watermark');
  mark.setAttribute('aria-hidden', 'true');
  mark.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 338 773" focusable="false">' +
    '<path d="M337.421 77.4141L266.711 148.124L200 81.4131V255.703H300V255.994L299.711 ' +
    '255.703L266.711 289.036H200V672.355L100 772.355V289.036H0V287.733L31.71 255.703H100V160.006' +
    'L260.006 0L337.421 77.4141Z" fill="currentColor"/></svg>';
  intro.appendChild(mark);
  (data.intro || []).forEach(p => intro.appendChild(el('p', null, p)));

  const banner = el('img', 'cast-banner');
  banner.src = 'assets/img/farquaad-banner.svg';
  banner.alt = '';
  banner.setAttribute('aria-hidden', 'true');

  head.appendChild(intro);
  head.appendChild(banner);
  host.appendChild(head);

  host.appendChild(el('h2', 'cast-list-head', 'Cast & scenes'));

  // Only the tracks someone is actually on, so "TBD" drops out once every
  // role is settled.
  const usedTracks = new Set((data.members || []).flatMap(m => (m.parts || []).map(p => p.track)));
  const legend = el('div', 'legend');
  Object.entries(data.tracks || {}).forEach(([name, text]) => {
    if (!usedTracks.has(name)) return;
    const item = el('span', 'legend-item');
    item.appendChild(el('span', 'track track-' + (TRACK_CLASS[name] || 'both'), name));
    item.appendChild(el('span', 'legend-text', text));
    legend.appendChild(item);
  });
  if (legend.children.length) host.appendChild(legend);

  // Two ways to read the list: a row per actor, or a row per role.
  let view = 'actor';
  try { if (localStorage.getItem('cast-view') === 'role') view = 'role'; } catch (err) { /* private window */ }
  const views = el('div', 'filters scene-tabs cast-views');
  views.setAttribute('role', 'group');
  views.setAttribute('aria-label', 'Group the cast list');
  const viewButtons = [];
  [['actor', 'By actor'], ['role', 'By role']].forEach(([key, label]) => {
    const b = el('button', 'filter' + (key === view ? ' is-on' : ''), label);
    b.type = 'button';
    b.addEventListener('click', () => {
      view = key;
      viewButtons.forEach(x => x.classList.toggle('is-on', x === b));
      try { localStorage.setItem('cast-view', key); } catch (err) { /* private window */ }
      apply();
    });
    viewButtons.push(b);
    views.appendChild(b);
  });
  host.appendChild(views);

  const controls = el('div', 'search-row');
  const input = el('input');
  input.type = 'search';
  input.placeholder = 'Search by actor or role…';
  input.setAttribute('aria-label', 'Search the cast list');
  controls.appendChild(input);

  const filters = el('div', 'filters');
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', 'Filter by track');
  let activeTrack = 'All';
  const buttons = [];
  [
    ['All', 'Both tracks'],
    ['Castle', 'Castle Track'],
    ['Storybook', 'Storybook Track']
  ].forEach(([value, label]) => {
    const b = el('button',
      'filter filter-' + (TRACK_CLASS[value] || 'all') + (value === 'All' ? ' is-on' : ''), label);
    b.type = 'button';
    b.addEventListener('click', () => {
      activeTrack = value;
      buttons.forEach(x => x.classList.toggle('is-on', x === b));
      apply();
    });
    buttons.push(b);
    filters.appendChild(b);
  });
  controls.appendChild(filters);
  const toggle = el('button', 'filter', 'Open every scene list');
  toggle.type = 'button';
  controls.appendChild(toggle);
  const count = el('div', 'count');
  controls.appendChild(count);
  host.appendChild(controls);

  const note = el('p', 'filter-note');
  host.appendChild(note);

  const scroll = el('div', 'table-scroll');
  const table = el('table', 'cast');
  const thead = el('thead');
  const hr = el('tr');
  ['Actor', 'Role', 'Scenes & songs'].forEach(h => hr.appendChild(el('th', null, h)));
  thead.appendChild(hr);
  table.appendChild(thead);
  scroll.appendChild(table);
  host.appendChild(scroll);

  const roleScroll = el('div', 'table-scroll');
  const roleTable = el('table', 'cast by-role');
  const roleHead = el('thead');
  const rhr = el('tr');
  ['Role', 'Played by', 'Scenes & songs'].forEach(h => rhr.appendChild(el('th', null, h)));
  roleHead.appendChild(rhr);
  roleTable.appendChild(roleHead);
  roleScroll.appendChild(roleTable);
  host.appendChild(roleScroll);

  const scenes = sceneData ? showScenes(sceneData.scenes) : [];
  const { songsFor } = songIndex(songData);
  const sceneRows = name => sceneData ? sceneData.cast.filter(r => r.student === name) : [];

  // One <tbody> per person. Rows are rebuilt when the filter changes, so a track
  // filter hides the other track's roles and scene list.
  const members = (data.members || []).map(m => ({
    actor: m.actor,
    parts: m.parts && m.parts.length ? m.parts : [{ role: '', track: 'Both', description: '' }],
    rows: /^tbd$/i.test(m.actor) ? [] : sceneRows(m.actor),
    group: el('tbody', 'member'),
    search: (m.actor + ' ' + (m.parts || []).map(p => p.role).join(' ')).toLowerCase()
  }));
  members.forEach(m => table.appendChild(m.group));

  // A scene list per track, from runs of { track, on: [{ i, name, bits }] }.
  // When both tracks are the same, one list stands for both.
  function sceneBoxes(m) {
    return runBoxes(m.rows.map(r => ({ track: r.track, on: sceneRun(r, scenes).on })));
  }
  function runBoxes(all) {
    const runs = all.filter(r => activeTrack === 'All' || r.track === activeTrack);
    const sig = run => JSON.stringify(run.on.map(a => [a.i, a.bits.map(b => b.costume + '|' + b.role)]));
    if (runs.length === 2 && sig(runs[0]) === sig(runs[1])) {
      runs.pop();
      runs[0].track = 'Both';
    }
    return runs.map(run => {
      const songCount = run.on.reduce((n, a) => n + songsFor(a.name).length, 0);
      const box = el('details', 'my-scenes-box');
      const sum = el('summary');
      sum.appendChild(el('span', 'track track-' + (TRACK_CLASS[run.track] || 'both'),
        run.track === 'Both' ? 'Both tracks' : run.track));
      sum.appendChild(document.createTextNode(' '));
      sum.appendChild(el('strong', null, run.on.length + (run.on.length === 1 ? ' scene' : ' scenes')));
      sum.appendChild(document.createTextNode(' · ' + songCount + (songCount === 1 ? ' song' : ' songs')));
      sum.appendChild(el('span', 'scene-nums', run.on.map(a => a.i + 1).join(', ')));
      box.appendChild(sum);
      box.appendChild(castSceneList(run.on, songsFor));
      box.addEventListener('toggle', () => {
        if (!box.open && openPlayer && box.contains(openPlayer.box)) closePlayer();
      });
      return box;
    });
  }

  function fillGroup(m, parts) {
    m.group.innerHTML = '';
    const tr = el('tr', 'first');

    const actorCell = el('td', 'actor');
    // A name opens that student's own page of scenes.
    const hasScenes = !/^tbd$/i.test(m.actor) && (!sceneData || m.rows.length > 0);
    if (hasScenes) {
      const a = link('scenes.html?student=' + encodeURIComponent(m.actor), m.actor, 'actor-name');
      a.title = 'See ' + m.actor + '’s scenes';
      actorCell.appendChild(a);
    } else {
      actorCell.appendChild(el('span', 'actor-name', m.actor));
    }
    if (parts.length > 1) actorCell.appendChild(el('span', 'actor-count', parts.length + ' roles'));
    tr.appendChild(actorCell);

    const roleCell = el('td', 'role');
    parts.forEach(p => {
      const line = el('div', 'role-line');
      line.appendChild(el('span', 'role-name', p.role));
      line.appendChild(el('span', 'track track-' + (TRACK_CLASS[p.track] || 'both'), p.track));
      roleCell.appendChild(line);
    });
    tr.appendChild(roleCell);

    const cell = el('td', 'scenes-cell');
    const boxes = sceneData ? sceneBoxes(m) : [];
    if (boxes.length) boxes.forEach(b => cell.appendChild(b));
    else cell.appendChild(el('span', 'song-none', sceneData ? 'No scenes listed yet' : 'Scenes could not be loaded just now'));
    tr.appendChild(cell);

    m.group.appendChild(tr);
  }

  /* ---- by role: one row per role, under the character headings ---- */
  const charConfig = data.characters || {};
  const skipKeys = new Set((charConfig.skip || []).map(sceneKey));
  const roleList = [];
  (data.members || []).forEach(m => (m.parts || []).forEach(p => {
    if (!p.role) return;
    let r = roleList.find(x => x.name === p.role);
    if (!r) roleList.push(r = { name: p.role, who: [] });
    if (!/^tbd$/i.test(m.actor)) r.who.push({ actor: m.actor, track: p.track });
  }));
  const trackRank = { Castle: 0, Storybook: 1 };
  roleList.forEach(r => r.who.sort((a, b) => (trackRank[a.track] ?? 2) - (trackRank[b.track] ?? 2)));
  const onStageRoles = roleList.filter(r => !skipKeys.has(sceneKey(r.name)));
  const roleGroupMap = roleGroups(onStageRoles, (sceneData && sceneData.cast) || [], charConfig);
  const offStage = roleList.filter(r => skipKeys.has(sceneKey(r.name)));
  if (offStage.length) roleGroupMap.set('Behind the scenes', offStage);

  // Each role's scenes on each track, worked out cell by cell from the Scenes tab.
  const rankOf = name => (charConfig.groups || []).findIndex(g => (g.roles || []).some(x => sceneKey(x) === sceneKey(name)));
  const lastRank = (charConfig.groups || []).length - 1;
  // A role's card in Meet the characters, so Guard 3 and Guard 5 (a named card)
  // or Flora and Fauna (the same description) count as one character when
  // telling a crowd costume from a character's own.
  const descOf = new Map();
  (data.members || []).forEach(m => (m.parts || []).forEach(p => {
    if (p.role && p.description && !descOf.has(p.role)) descOf.set(p.role, descKey(p.description));
  }));
  const cardOf = role => {
    const c = (charConfig.cards || []).find(x => (x.roles || []).some(y => sceneKey(y) === sceneKey(role)));
    return c ? c.name : descOf.has(role) ? 'about:' + descOf.get(role) : role;
  };
  const roleRuns = new Map();
  if (sceneData) {
    const partsBy = new Map((data.members || []).map(m => [m.actor, m.parts || []]));
    const mineOf = r => (partsBy.get(r.student) || [])
      .filter(p => p.role && (p.track === r.track || p.track === 'Both')).map(p => p.role);
    // Who wears each costume that doesn't name their own role.
    const wearers = new Map();
    sceneData.cast.forEach(r => {
      const mine = mineOf(r);
      Object.values(r.cells).forEach(cell => {
        if (namedRole(cell, mine)) return;
        const k = sceneKey(cell.costume);
        if (!wearers.has(k)) wearers.set(k, new Set());
        wearers.get(k).add(mine.length === 1 ? cardOf(mine[0]) : r.student + '|' + r.track);
      });
    });
    sceneData.cast.forEach(r => {
      const mine = mineOf(r);
      if (!mine.length) return;
      scenes.forEach((sc, i) => sc.parts.forEach(pt => {
        const cell = r.cells[pt.col];
        if (!cell) return;
        const crowd = (wearers.get(sceneKey(cell.costume)) || new Set()).size > 1;
        const role = sceneRole(cell, mine, rankOf, crowd, lastRank);
        if (!role) return;
        if (!roleRuns.has(role)) roleRuns.set(role, new Map());
        const byTrack = roleRuns.get(role);
        if (!byTrack.has(r.track)) byTrack.set(r.track, new Map());
        const at = byTrack.get(r.track);
        if (!at.has(i)) at.set(i, { i, name: sc.name, costumes: new Set() });
        at.get(i).costumes.add(cell.costume);
      }));
    });
  }
  const runsForRole = role => {
    const byTrack = roleRuns.get(role.name) || new Map();
    const tracks = new Set(role.who.flatMap(w => w.track === 'Both' ? ['Castle', 'Storybook'] : [w.track]));
    return ['Castle', 'Storybook'].filter(t => tracks.has(t)).map(t => ({
      track: t,
      on: [...(byTrack.get(t) || new Map()).values()].sort((a, b) => a.i - b.i)
        .map(a => ({ i: a.i, name: a.name, bits: [...a.costumes].map(c => ({ costume: c, role: '' })) }))
    })).filter(run => run.on.length);
  };

  const roleRows = [];
  roleGroupMap.forEach((list, title) => {
    if (!list.length) return;
    const head = el('tbody', 'roster-group');
    const gr = el('tr');
    const gh = el('th', null, title);
    gh.colSpan = 3;
    gr.appendChild(gh);
    head.appendChild(gr);
    roleTable.appendChild(head);
    list.forEach(role => {
      const body = el('tbody', 'member');
      roleTable.appendChild(body);
      roleRows.push({
        role, body, head,
        search: (role.name + ' ' + role.who.map(w => w.actor).join(' ')).toLowerCase()
      });
    });
  });

  function fillRole(r, who) {
    r.body.innerHTML = '';
    const tr = el('tr', 'first');
    tr.appendChild(el('td', 'role role-title', r.role.name));
    const actors = el('td', 'actors');
    if (!who.length) actors.appendChild(el('span', 'song-none', 'Not cast yet'));
    who.forEach(w => {
      const line = el('div', 'role-line');
      const inScenes = !sceneData || sceneData.cast.some(x => x.student === w.actor);
      line.appendChild(inScenes
        ? link('scenes.html?student=' + encodeURIComponent(w.actor), w.actor, 'actor-name')
        : el('span', 'actor-name', w.actor));
      line.appendChild(el('span', 'track track-' + (TRACK_CLASS[w.track] || 'both'), w.track));
      actors.appendChild(line);
    });
    tr.appendChild(actors);
    const cell = el('td', 'scenes-cell');
    const boxes = sceneData ? runBoxes(runsForRole(r.role)) : [];
    if (boxes.length) boxes.forEach(b => cell.appendChild(b));
    else cell.appendChild(el('span', 'song-none', sceneData ? 'No scenes listed yet' : 'Scenes could not be loaded just now'));
    tr.appendChild(cell);
    r.body.appendChild(tr);
  }

  const NOTES = {
    All: 'Everyone performs both weekends. Pick a track to hide the roles that belong to the other one.',
    Castle: 'Showing the Castle Track, on stage as leads April 15-16, 2027. Roles played both weekends are still listed.',
    Storybook: 'Showing the Storybook Track, on stage as leads April 22-23, 2027. Roles played both weekends are still listed.'
  };

  // A role belongs on screen unless it is the other track's version of a part.
  const partVisible = p =>
    activeTrack === 'All' || p.track === activeTrack || p.track === 'Both' || p.track === 'TBD';

  function apply() {
    closePlayer();
    const q = input.value.trim().toLowerCase();
    const byRole = view === 'role';
    scroll.hidden = byRole;
    roleScroll.hidden = !byRole;
    let shown = 0;
    members.forEach(m => {
      const parts = m.parts.filter(partVisible);
      const match = !byRole && parts.length > 0 && (!q || m.search.includes(q));
      m.group.hidden = !match;
      if (match) {
        fillGroup(m, parts);
        shown++;
      } else {
        m.group.innerHTML = '';
      }
    });
    let rolesShown = 0;
    roleRows.forEach(r => {
      const who = r.role.who.filter(partVisible);
      const match = byRole && (who.length > 0 || !r.role.who.length) && (!q || r.search.includes(q));
      r.body.hidden = !match;
      if (match) {
        fillRole(r, who);
        rolesShown++;
      } else {
        r.body.innerHTML = '';
      }
    });
    // A heading shows only while a role under it does.
    roleRows.forEach(r => { r.head.hidden = true; });
    roleRows.forEach(r => { if (!r.body.hidden) r.head.hidden = false; });
    count.textContent = byRole
      ? rolesShown + (rolesShown === 1 ? ' role' : ' roles')
      : shown + (shown === 1 ? ' person' : ' people');
    note.textContent = NOTES[activeTrack] || '';
    note.hidden = !note.textContent;
    toggle.textContent = 'Open every scene list';

    // Filtering can shorten the page under the reader's feet. Bring the controls
    // back into view rather than leaving them stranded above the window.
    if (started && controls.getBoundingClientRect().top < 0) {
      controls.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }
  let started = false;
  input.addEventListener('input', apply);

  const boxes = () => [...(view === 'role' ? roleTable : table).querySelectorAll('details.my-scenes-box')];
  toggle.addEventListener('click', () => {
    const open = !boxes().every(b => b.open);
    boxes().forEach(b => { b.open = open; });
    toggle.textContent = open ? 'Close every scene list' : 'Open every scene list';
  });

  apply();
  started = true;

  if (data.closing) {
    const box = el('div', 'note-box');
    data.closing.forEach(p => box.appendChild(el('p', null, p)));
    host.appendChild(box);
  }

  host.appendChild(renderCharacters(data.members || [], sceneData, data.characters));
}

/* ---------- boosters ---------- */

function renderBoosters(data) {
  const host = slot('boosters');
  if (!host) return;
  host.innerHTML = '';

  host.appendChild(el('h2', null, data.orgName));
  if (data.lead) host.appendChild(el('p', 'lead', data.lead));

  const row = el('div', 'cta-row');
  (data.buttons || []).forEach(b => {
    if (b.url) {
      const a = link(b.url, null, 'cta');
      a.appendChild(el('span', 'cta-icon', b.icon || ''));
      a.appendChild(el('span', 'cta-label', b.label));
      if (b.note) a.appendChild(el('span', 'cta-note', b.note));
      row.appendChild(a);
    } else {
      const d = el('div', 'cta is-disabled');
      d.appendChild(el('span', 'cta-icon', b.icon || ''));
      d.appendChild(el('span', 'cta-label', b.label));
      if (b.note) d.appendChild(el('span', 'cta-note', b.note));
      row.appendChild(d);
    }
  });
  host.appendChild(row);

  if (data.mission) {
    const box = el('div', 'note-box');
    box.appendChild(el('p', null, data.mission));
    host.appendChild(box);
  }

  if (data.committees) {
    const section = el('section');
    section.id = 'committees';
    section.appendChild(el('h2', null, data.committees.heading));
    if (data.committees.intro) section.appendChild(el('p', 'section-intro', data.committees.intro));
    const grid = el('div', 'committee-grid');
    (data.committees.items || []).forEach(c => {
      const card = el('div', 'committee');
      card.appendChild(el('div', 'title', c.name));
      card.appendChild(el('div', 'note', c.what));
      if (c.url) {
        const p = el('div', 'committee-link');
        p.appendChild(link(c.url, (c.linkLabel || 'More') + ' »'));
        card.appendChild(p);
      }
      grid.appendChild(card);
    });
    section.appendChild(grid);
    host.appendChild(section);
  }

  if (data.specialRoles) {
    const section = el('section');
    section.appendChild(el('h2', null, data.specialRoles.heading));
    const p = el('p', 'section-intro');
    p.appendChild(document.createTextNode(data.specialRoles.text + ' '));
    if (data.specialRoles.url) {
      p.appendChild(link(data.specialRoles.url, (data.specialRoles.linkLabel || 'Open the list') + ' »'));
    }
    section.appendChild(p);
    host.appendChild(section);
  }

  if (data.closing) {
    const p = el('p', 'closing-line');
    const parts = data.closing.split(/(\S+@\S+\.\S+?)(?=[\s,.]|$)/);
    parts.forEach(t => {
      if (/\S+@\S+\.\S+/.test(t)) p.appendChild(link('mailto:' + t, t));
      else p.appendChild(document.createTextNode(t));
    });
    host.appendChild(p);
  }
}

/* ---------- scenes: who is on stage, and in what, scene by scene ---------- */

// The Scenes tab is a grid: one row per student per track, one column per scene.
// A cell holds the costume they wear, with an optional role in brackets, and an
// empty cell means they are off stage.
function scenesFromSheet(rows, saved) {
  const fixed = ['Track', 'Group', 'Student'];
  const names = Object.keys(rows[0] || {}).filter(h => h && !fixed.includes(h));
  const cast = [];
  rows.forEach(r => {
    const student = (r['Student'] || '').trim();
    if (!student) return;
    const cells = {};
    names.forEach(n => {
      const raw = (r[n] || '').trim();
      if (!raw) return;
      const m = raw.match(/^(.*?)\s*\((.+)\)\s*$/);
      cells[n] = { costume: (m ? m[1] : raw).trim(), role: m ? m[2].trim() : '' };
    });
    cast.push({
      student,
      track: pickTrack(r['Track'], ['Castle', 'Storybook'], 'Castle'),
      group: (r['Group'] || '').trim(),
      cells
    });
  });
  if (!cast.length) throw new Error('the Scenes tab has no rows');
  return Object.assign({}, saved || {}, { scenes: names, cast });
}

// Two columns that share a name before a colon are two parts of one scene, such
// as "Who I'd Be: Solos" and "Who I'd Be: Choir". They are numbered as one scene,
// and a student in only one of them is not off stage for the other.
function sceneParts(names) {
  const scenes = [];
  names.forEach(col => {
    const m = col.match(/^(.*?)\s*:\s*(.+)$/);
    const name = m ? m[1].trim() : col.trim();
    const part = m ? m[2].trim() : '';
    const last = scenes[scenes.length - 1];
    if (part && last && last.name === name) last.parts.push({ col, part });
    else scenes.push({ name, parts: [{ col, part }] });
  });
  return scenes;
}

// The scenes as the page numbers them. An "Intermission" column is not a scene:
// it becomes a line before the scene that follows it (breakBefore).
function showScenes(names) {
  const out = [];
  let brk = false;
  sceneParts(names).forEach(sc => {
    if (/^intermission$/i.test(sc.name)) { brk = true; return; }
    sc.n = out.length + 1;
    sc.breakBefore = brk;
    brk = false;
    out.push(sc);
  });
  return out;
}

// Each student's costumes in the order they first wear them, so the same costume
// keeps the same colour down their row and through their scene list.
function costumeOrder(row, scenes) {
  const seen = [];
  scenes.forEach(n => {
    const c = row.cells[n];
    if (c && !seen.includes(c.costume)) seen.push(c.costume);
  });
  return seen;
}
const costumeClass = (order, costume) => 'cos-' + Math.min(order.indexOf(costume) + 1, 6);

// Every scene the student is in, with the costume changes between them and the
// stretches off stage. A change with no scene in between is a quick change.
function sceneRun(row, sceneList) {
  const on = [];
  sceneList.forEach((sc, i) => {
    const bits = sc.parts
      .filter(p => row.cells[p.col])
      .map(p => ({ part: p.part, costume: row.cells[p.col].costume, role: row.cells[p.col].role }));
    if (bits.length) on.push({ i, name: sc.name, bits, first: bits[0].costume, last: bits[bits.length - 1].costume });
  });
  const items = [];
  on.forEach((app, k) => {
    const prev = on[k - 1];
    if (prev && prev.last !== app.first) {
      const overBreak = sceneList.slice(prev.i + 1, app.i + 1).some(sc => sc.breakBefore);
      items.push({ type: 'change', costume: app.first, after: prev.name, gap: app.i - prev.i - 1, overBreak });
    }
    const from = prev ? prev.i + 1 : 0;
    if (app.i > from) items.push({ type: 'off', from, to: app.i - 1 });
    if (!prev) items.push({ type: 'start', costume: app.first });
    items.push({ type: 'on', app });
  });
  return { on, items };
}

/* ---- songs: practice tracks, grouped by scene (data/songs.json) ---- */

function youtubeId(url) {
  const m = String(url || '').match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

// Only one practice track plays at a time, anywhere on the page.
let openPlayer = null;
function closePlayer() {
  if (!openPlayer) return;
  openPlayer.box.remove();
  openPlayer.button.classList.remove('is-playing');
  openPlayer.button.setAttribute('aria-expanded', 'false');
  openPlayer = null;
}

// Opens a YouTube practice track in a player under its song, or closes it if it
// is already open. Ctrl- or Cmd-click still opens YouTube in a new tab. Links
// that are not YouTube, like a Google Drive file, just open in a new tab.
function playInline(a, li, url, label) {
  const id = youtubeId(url);
  if (!id) return;
  a.setAttribute('aria-expanded', 'false');
  a.addEventListener('click', e => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const same = openPlayer && openPlayer.button === a;
    closePlayer();
    if (same) return;
    const box = el('div', 'song-player');
    const frame = el('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1';
    frame.title = label;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    box.appendChild(frame);
    const foot = el('div', 'song-player-foot');
    foot.appendChild(link(url, 'Open on YouTube ↗', 'song-player-out'));
    const close = el('button', 'song-player-close', 'Close ✕');
    close.type = 'button';
    close.addEventListener('click', () => { closePlayer(); a.focus(); });
    foot.appendChild(close);
    box.appendChild(foot);
    li.appendChild(box);
    a.classList.add('is-playing');
    a.setAttribute('aria-expanded', 'true');
    openPlayer = { box, button: a };
  });
}

// A song with its two practice tracks, or a note that none is posted yet.
function songLine(song) {
  const li = el('li', 'song');
  li.appendChild(el('span', 'song-title', '🎵 ' + song.title));
  const links = el('span', 'song-links');
  [[song.vocals, 'With vocals', 'song-link'], [song.track, 'Accompaniment', 'song-link is-track']]
    .forEach(([url, label, cls]) => {
      if (!url) return;
      const a = link(url, label, cls);
      playInline(a, li, url, song.title + ' - ' + label.toLowerCase());
      links.appendChild(a);
    });
  if (!song.vocals && !song.track) links.appendChild(el('span', 'song-none', 'Practice track coming'));
  li.appendChild(links);
  return li;
}

// Scene names in songs.json are matched to the sheet loosely, so "Duloc 1" and
// "duloc 1" or a stray apostrophe style still line up.
const sceneKey = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// songs.json's scenes that have songs, and a lookup from a scene to its songs.
function songIndex(songData) {
  const groups = (songData && songData.scenes || []).filter(g => (g.songs || []).length);
  const byKey = new Map(groups.map(g => [sceneKey(g.scene), g.songs]));
  return { groups, songsFor: sc => byKey.get(sceneKey(sc && sc.name != null ? sc.name : sc)) || [] };
}

function renderScenes(data, castData, songData) {
  const host = slot('scenes');
  if (!host) return;
  host.innerHTML = '';
  const scenes = showScenes(data.scenes);
  const columns = scenes.flatMap(sc => sc.parts.map(p => p.col));
  const breakCol = new Set(scenes.filter(sc => sc.breakBefore).map(sc => sc.parts[0].col));
  const { groups: songGroups, songsFor } = songIndex(songData);
  const sceneNames = scenes.map(sc => sc.name);
  const sceneStart = new Set(scenes.map(sc => sc.parts[0].col));
  const partsOf = new Map();
  (castData && castData.members || []).forEach(m => partsOf.set(m.actor, m.parts));
  const rolesFor = (student, track) => (partsOf.get(student) || [])
    .filter(p => p.track === track || p.track === 'Both').map(p => p.role);

  // The grid groups each student's row the way Meet the characters groups their
  // roles (the characters block in data/cast.json): under the first group that
  // holds one of their roles on that track, and within it in that group's role
  // order, so Shrek comes first. A row with no listed role keeps its Scenes tab group.
  const charGroups = (castData && castData.characters && castData.characters.groups) || [];
  const placeRow = r => {
    const mine = rolesFor(r.student, r.track).map(sceneKey);
    for (let g = 0; g < charGroups.length; g++) {
      const at = (charGroups[g].roles || []).map(sceneKey).findIndex(k => mine.includes(k));
      if (at >= 0) return { group: charGroups[g].title, rank: g, pos: at };
    }
    return { group: r.group, rank: Infinity, pos: 0 };
  };
  const sheetGroups = [...new Set(data.cast.map(r => r.group))];
  const gridRows = data.cast
    .map((r, i) => Object.assign({}, r, placeRow(r), { i }))
    .sort((a, b) => (a.rank - b.rank) ||
      (a.rank === Infinity ? sheetGroups.indexOf(a.group) - sheetGroups.indexOf(b.group) : 0) ||
      (a.pos - b.pos) || (a.i - b.i));

  const head = el('div', 'scene-head');
  head.appendChild(el('h2', null, 'Scene by scene'));
  head.appendChild(el('p', 'section-intro',
    'Every scene of Shrek, who is on stage in it, and the costume they wear. ' +
    'Pick your name in Student view to see your own night, including when to change costume. ' +
    'Songs has the practice tracks for every song, scene by scene.'));
  host.appendChild(head);

  const tabs = el('div', 'filters scene-tabs');
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', 'How to look at the scenes');
  const panels = {};
  let view = 'student';
  const buttons = [];
  [['student', 'Student view'], ['grid', 'Grid view'], ['songs', 'Songs']].forEach(([key, label]) => {
    const b = el('button', 'filter' + (key === view ? ' is-on' : ''), label);
    b.type = 'button';
    b.addEventListener('click', () => {
      view = key;
      closePlayer();
      buttons.forEach(x => x.classList.toggle('is-on', x === b));
      Object.entries(panels).forEach(([k, p]) => { p.hidden = k !== key; });
      try { localStorage.setItem('scenes-view', key); } catch (err) { /* private window */ }
    });
    buttons.push(b);
    tabs.appendChild(b);
  });
  host.appendChild(tabs);

  panels.student = el('div', 'scene-panel');
  panels.grid = el('div', 'scene-panel');
  panels.songs = el('div', 'scene-panel');
  panels.grid.hidden = true;
  panels.songs.hidden = true;
  host.appendChild(panels.student);
  host.appendChild(panels.grid);
  host.appendChild(panels.songs);

  /* ---- songs: every song in running order, with both practice tracks ---- */
  panels.songs.appendChild(el('p', 'filter-note',
    'Every song in the show, scene by scene. “With vocals” is for learning the part; ' +
    '“Accompaniment” is the music alone, to sing along to.'));
  const sceneNo = new Map(scenes.map(sc => [sceneKey(sc.name), sc]));
  if (!songGroups.length) {
    panels.songs.appendChild(el('p', 'filter-note', 'The song list could not be loaded just now.'));
  } else {
    const songList = el('div', 'song-scenes');
    let breakShown = false;
    songGroups.forEach(g => {
      const sc = sceneNo.get(sceneKey(g.scene));
      const n = sc && sc.n;
      if (sc && !breakShown && scenes.some(x => x.breakBefore && x.n <= n)) {
        songList.appendChild(el('div', 'break-line', 'Intermission'));
        breakShown = true;
      }
      const box = el('div', 'song-scene');
      if (n) box.id = 'songs-' + n;
      box.appendChild(el('h4', null, (n ? n + '. ' : '') + g.scene));
      const ul = el('ul', 'songs');
      g.songs.forEach(s => ul.appendChild(songLine(s)));
      box.appendChild(ul);
      songList.appendChild(box);
    });
    panels.songs.appendChild(songList);
  }

  /* ---- grid: students down the side, scenes across ---- */
  let gridTrack = 'Castle';
  const trackRow = el('div', 'filters scene-tracks');
  trackRow.setAttribute('role', 'group');
  trackRow.setAttribute('aria-label', 'Which track');
  const trackButtons = [];
  ['Castle', 'Storybook'].forEach(t => {
    const b = el('button', 'filter filter-' + TRACK_CLASS[t] + (t === gridTrack ? ' is-on' : ''), t + ' Track');
    b.type = 'button';
    b.addEventListener('click', () => {
      gridTrack = t;
      trackButtons.forEach(x => x.classList.toggle('is-on', x === b));
      drawGrid();
    });
    trackButtons.push(b);
    trackRow.appendChild(b);
  });
  panels.grid.appendChild(trackRow);
  const gridWrap = el('div', 'grid-scroll');
  const sceneList = el('div', 'scene-cards');
  panels.grid.appendChild(gridWrap);
  panels.grid.appendChild(sceneList);

  function drawGrid() {
    gridWrap.innerHTML = '';
    const rows = gridRows.filter(r => r.track === gridTrack);
    const table = el('table', 'scene-grid');
    const thead = el('thead');
    const hr = el('tr');
    hr.appendChild(el('th', 'corner', gridTrack + ' Track'));
    scenes.forEach((sc, i) => {
      sc.parts.forEach((p, k) => {
        const songs = songsFor(sc);
        const th = el('th', 'scene-col' + (k ? ' part-more' : '') +
          (songs.length ? ' has-song' : '') + (breakCol.has(p.col) ? ' after-break' : ''));
        th.scope = 'col';
        th.title = (breakCol.has(p.col) ? 'After the intermission · ' : '') + (i + 1) + '. ' + sc.name +
          (p.part ? ' — ' + p.part : '') + (songs.length ? ' · 🎵 ' + songs.map(x => x.title).join(', ') : '');
        th.appendChild(el('span', null, (k ? '' : (i + 1) + '. ') + sc.name + (p.part ? ' — ' + p.part : '')));
        if (songs.length && !k) {
          const mark = el('b', 'song-mark', '♪');
          mark.setAttribute('aria-label', 'has a song');
          th.appendChild(mark);
        }
        hr.appendChild(th);
      });
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    const tbody = el('tbody');
    let group = null;
    rows.forEach(r => {
      if (r.group && r.group !== group) {
        group = r.group;
        const gr = el('tr', 'group-row');
        const gh = el('th', null, group);
        gh.colSpan = columns.length + 1;
        gh.scope = 'colgroup';
        gr.appendChild(gh);
        tbody.appendChild(gr);
      }
      const order = costumeOrder(r, columns);
      const tr = el('tr');
      const nameCell = el('th', 'who');
      nameCell.scope = 'row';
      const pick = el('button', 'who-link', r.student);
      pick.type = 'button';
      pick.addEventListener('click', () => showStudent(r.student, r.track));
      nameCell.appendChild(pick);
      const roles = rolesFor(r.student, r.track);
      if (roles.length) nameCell.appendChild(el('small', null, roles.join(', ')));
      tr.appendChild(nameCell);
      columns.forEach(n => {
        const c = r.cells[n];
        const td = el('td', 'cell' + (sceneStart.has(n) ? ' part-start' : '') + (breakCol.has(n) ? ' after-break' : ''));
        if (c) {
          td.classList.add('on', costumeClass(order, c.costume));
          td.title = r.student + ' · ' + n + ' · ' + c.costume + (c.role ? ' (' + c.role + ')' : '');
          td.appendChild(el('span', 'cell-num', String(order.indexOf(c.costume) + 1)));
          td.appendChild(el('span', 'sr-only', c.costume));
        } else {
          td.title = r.student + ' · ' + n + ' · off stage';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    gridWrap.appendChild(table);
    gridWrap.appendChild(el('p', 'filter-note',
      'A block means that student is on stage in that scene. The number and colour are which of ' +
      'their costumes they wear, counting from the first one they put on. ♪ marks a scene with a song, ' +
      'and the gold line is the intermission. Tap a name for their own scene list.'));
    drawSceneList(rows);
  }

  // On a phone the table is unreadable, so the same information reads as a list
  // of scenes: open one and it says who is on stage and what they are wearing.
  function drawSceneList(rows) {
    sceneList.innerHTML = '';
    sceneList.appendChild(el('p', 'filter-note',
      'Open a scene to see who is on stage in it and what they are wearing. ' +
      'Tap a name for that student\u2019s own scene list.'));
    scenes.forEach((sc, i) => {
      if (sc.breakBefore) sceneList.appendChild(el('div', 'break-line', 'Intermission'));
      const here = rows.filter(r => sc.parts.some(p => r.cells[p.col]));
      const songs = songsFor(sc);
      const card = el('details', 'scene-card');
      const sum = el('summary');
      sum.appendChild(el('span', 'scene-no', String(i + 1)));
      const t = el('span', 'scene-title');
      t.appendChild(el('strong', null, sc.name));
      t.appendChild(el('small', null, here.length + (here.length === 1 ? ' student on stage' : ' students on stage') +
        (songs.length ? ' · 🎵 ' + songs.map(x => x.title).join(', ') : '')));
      sum.appendChild(t);
      card.appendChild(sum);
      if (!here.length) {
        card.appendChild(el('p', 'filter-note', 'Nobody is on stage in this scene yet.'));
        sceneList.appendChild(card);
        return;
      }
      let group = null;
      let list = null;
      here.forEach(r => {
        if (r.group && r.group !== group) {
          group = r.group;
          card.appendChild(el('h4', 'scene-card-group', group));
          list = el('ul', 'scene-card-list');
          card.appendChild(list);
        }
        if (!list) { list = el('ul', 'scene-card-list'); card.appendChild(list); }
        const li = el('li');
        const who = el('button', 'who-link', r.student);
        who.type = 'button';
        who.addEventListener('click', () => showStudent(r.student));
        li.appendChild(who);
        const order = costumeOrder(r, columns);
        sc.parts.forEach(p => {
          const c = r.cells[p.col];
          if (!c) return;
          li.appendChild(el('span', 'cos ' + costumeClass(order, c.costume), c.costume));
          const note = [p.part, c.role ? 'as ' + c.role : ''].filter(Boolean).join(' · ');
          if (note) li.appendChild(el('small', null, note));
        });
        list.appendChild(li);
      });
      sceneList.appendChild(card);
    });
  }
  drawGrid();

  /* ---- student view ---- */
  const names = [...new Set(data.cast.map(r => r.student))].sort((a, b) => a.localeCompare(b));
  const picker = el('div', 'search-row');
  const label = el('label', 'sr-only', 'Pick a student');
  label.htmlFor = 'scene-student';
  const select = el('select', 'scene-picker');
  select.id = 'scene-student';
  select.appendChild(el('option', null, 'Pick your name…')).value = '';
  names.forEach(n => { const o = el('option', null, n); o.value = n; select.appendChild(o); });
  picker.appendChild(label);
  picker.appendChild(select);
  panels.student.appendChild(picker);
  const studentOut = el('div', 'student-out');
  panels.student.appendChild(studentOut);

  function drawStudent(name) {
    closePlayer();
    studentOut.innerHTML = '';
    if (!name) {
      studentOut.appendChild(el('p', 'filter-note', 'Pick your name to see every scene you are in.'));
      return;
    }
    const mine = data.cast.filter(r => r.student === name);
    if (!mine.length) {
      studentOut.appendChild(el('p', 'filter-note', 'We do not have scenes for ' + name + ' yet.'));
      return;
    }
    mine.forEach(r => {
      const card = el('section', 'track-card track-card-' + TRACK_CLASS[r.track]);
      const h = el('h3', null, r.track + ' Track');
      card.appendChild(h);
      const roles = rolesFor(r.student, r.track);
      const { on, items } = sceneRun(r, scenes);
      const order = costumeOrder(r, columns);
      const changes = items.filter(x => x.type === 'change');
      card.appendChild(el('p', 'track-sub',
        (roles.length ? roles.join(' · ') + ' — ' : '') +
        on.length + (on.length === 1 ? ' scene' : ' scenes') + ', ' +
        order.length + (order.length === 1 ? ' costume' : ' costumes') + ', ' +
        changes.length + (changes.length === 1 ? ' costume change' : ' costume changes')));
      if (!on.length) {
        card.appendChild(el('p', 'filter-note', 'No scenes on this track yet.'));
        studentOut.appendChild(card);
        return;
      }
      const list = el('ol', 'scene-run');
      // The intermission is a line in the run: inside an off-stage stretch that
      // spans it, or on its own before the first scene after it.
      const breakAt = scenes.findIndex(sc => sc.breakBefore);
      let breakShown = breakAt < 0;
      items.forEach(it => {
        if (!breakShown && ((it.type === 'on' && it.app.i >= breakAt) || (it.type === 'off' && it.from >= breakAt))) {
          list.appendChild(el('li', 'run-break', 'Intermission'));
          breakShown = true;
        }
        if (it.type === 'off' && it.from < breakAt && it.to >= breakAt) breakShown = true;
        const li = el('li');
        if (it.type === 'start') {
          const d = el('div', 'run-change');
          d.appendChild(document.createTextNode('Start in '));
          d.appendChild(el('span', 'cos ' + costumeClass(order, it.costume), it.costume));
          li.appendChild(d);
        } else if (it.type === 'change') {
          const quick = it.gap === 0 && !it.overBreak;
          const d = el('div', 'run-change' + (quick ? ' is-quick' : ''));
          if (quick) d.appendChild(el('strong', null, 'Quick change! '));
          d.appendChild(document.createTextNode('Change into '));
          d.appendChild(el('span', 'cos ' + costumeClass(order, it.costume), it.costume));
          const gapText = [
            it.gap ? it.gap + (it.gap === 1 ? ' scene' : ' scenes') : '',
            it.overBreak ? 'the intermission' : ''
          ].filter(Boolean).join(' and ');
          d.appendChild(document.createTextNode(quick
            ? ' straight after ' + it.after + ', with no scene in between'
            : ' after ' + it.after + ' (' + gapText + ' to change)'));
          li.appendChild(d);
        } else if (it.type === 'off') {
          const box = el('details', 'run-off');
          const sum = el('summary');
          const n = it.to - it.from + 1;
          sum.appendChild(el('span', 'off-count',
            'Off stage · ' + (n === 1 ? 'scene ' + (it.from + 1) : n + ' scenes, ' + (it.from + 1) + '–' + (it.to + 1))));
          const cue = el('span', 'off-cue');
          cue.appendChild(document.createTextNode('Be ready during '));
          cue.appendChild(el('strong', null, (it.to + 1) + '. ' + sceneNames[it.to]));
          cue.appendChild(document.createTextNode(' — you are on next'));
          sum.appendChild(cue);
          box.appendChild(sum);
          const inner = el('ol', 'off-list');
          for (let i = it.from; i <= it.to; i++) {
            if (i === breakAt && i > it.from) inner.appendChild(el('li', 'off-break', 'Intermission'));
            const item = el('li', i === it.to ? 'is-cue' : null);
            item.appendChild(el('span', 'run-num', String(i + 1)));
            item.appendChild(el('span', null, sceneNames[i] + (i === it.to ? ' · get ready' : '')));
            inner.appendChild(item);
          }
          box.appendChild(inner);
          li.appendChild(box);
        } else {
          li.appendChild(el('span', 'run-num', String(it.app.i + 1)));
          // The tile wears the ring of the costume they are in for that scene.
          const d = el('div', 'run-on ' + costumeClass(order, it.app.bits[0].costume));
          const left = el('div');
          left.appendChild(el('strong', null, it.app.name));
          const roles = [...new Set(it.app.bits.map(b => b.role).filter(Boolean))];
          if (roles.length) left.appendChild(el('small', null, 'as ' + roles.join(', ')));
          d.appendChild(left);
          // A scene in parts says which parts they are in, and names a costume
          // change that happens inside the scene.
          const cosBox = el('div', 'run-cos');
          it.app.bits.forEach(b => {
            const chip = el('span', 'cos ' + costumeClass(order, b.costume), b.costume);
            if (b.part) {
              const pair = el('span', 'run-part');
              pair.appendChild(el('small', null, b.part));
              pair.appendChild(chip);
              cosBox.appendChild(pair);
            } else {
              cosBox.appendChild(chip);
            }
          });
          d.appendChild(cosBox);
          const songs = songsFor(it.app.name);
          if (songs.length) {
            const ul = el('ul', 'songs');
            songs.forEach(x => ul.appendChild(songLine(x)));
            d.appendChild(ul);
          }
          li.appendChild(d);
        }
        list.appendChild(li);
      });
      card.appendChild(list);
      studentOut.appendChild(card);
    });
  }

  function showStudent(name) {
    select.value = name;
    drawStudent(name);
    buttons[0].click();
    panels.student.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  select.addEventListener('change', () => {
    drawStudent(select.value);
    try { localStorage.setItem('scenes-student', select.value); } catch (err) { /* private window */ }
  });

  // Open where they left off, or on the name in the address, so a student can
  // bookmark their own page.
  const asked = new URLSearchParams(location.search).get('student') || '';
  let start = asked;
  if (!start) { try { start = localStorage.getItem('scenes-student') || ''; } catch (err) { start = ''; } }
  if (names.includes(start)) select.value = start;
  drawStudent(select.value);
  let savedView = '';
  try { savedView = localStorage.getItem('scenes-view') || ''; } catch (err) { savedView = ''; }
  // scenes.html#songs opens straight on the song list, for sharing.
  if (location.hash === '#songs') savedView = 'songs';
  if (!names.includes(asked)) {
    if (savedView === 'grid') buttons[1].click();
    else if (savedView === 'songs') buttons[2].click();
  }
}

/* ---------- boot ---------- */

document.addEventListener('DOMContentLoaded', async () => {
  const main = document.querySelector('main') || document.body;
  showSkeleton('announcements', 'announcements');
  showSkeleton('calendars', 'calendar');
  showSkeleton('performances', 'shows');
  showSkeleton('cast', 'cast');
  try {
    const site = await loadJSON('data/site.json');
    renderChrome(site);

    // Start every download at once, and draw each section as soon as its own
    // content arrives, rather than one after another.
    const calendarData = (slot('calendars') || slot('announcements') || slot('performances'))
      ? contentFor('calendar', loadJSON('data/calendar.json'), ['Date', 'Title'], calendarFromSheet)
      : Promise.resolve(null);
    const castData = (slot('calendars') || slot('cast') || slot('scenes'))
      ? contentFor('cast', loadJSON('data/cast.json'), ['Actor', 'Role'], castFromSheet)
      : null;
    const jobs = [];

    if (slot('links')) jobs.push(loadJSON('data/links.json').then(renderLinks));
    if (slot('boosters')) jobs.push(loadJSON('data/boosters.json').then(renderBoosters));
    if (slot('announcements')) {
      const announcements = contentFor('announcements', site.announcements,
        ['Title'], (rows, saved) => Object.assign({}, saved, { items: announcementsFromSheet(rows) }));
      jobs.push(Promise.all([announcements, calendarData]).then(([a, cal]) => {
        site.announcements = a;
        renderAnnouncements(site, cal);
        doneLoading('announcements');
      }));
    }
    if (slot('calendars')) {
      // The cast list feeds the name picker that shows who is called to each rehearsal.
      jobs.push(Promise.all([calendarData, castData.catch(() => null)]).then(([cal, cast]) => {
        renderCalendars(cal, site, cast);
        doneLoading('calendars');
      }));
    }
    if (slot('performances')) {
      jobs.push(calendarData.then(cal => { renderPerformances(cal, site); doneLoading('performances'); }));
    }
    const songData = (slot('cast') || slot('scenes'))
      ? loadJSON('data/songs.json').catch(err => { console.error(err); return null; })
      : null;
    if (slot('cast')) {
      // Each person's scenes and songs come from the Scenes tab.
      const sceneData = fetchPublished('scenes')
        .then(text => scenesFromSheet(sheetRows(text, ['Track', 'Student'])))
        .catch(() => null);
      jobs.push(Promise.all([castData, sceneData, songData]).then(([cast, sc, songs]) => {
        renderCast(cast, sc, songs);
        doneLoading('cast');
      }));
    }
    if (slot('scenes')) {
      const sceneData = contentFor('scenes', Promise.resolve(null), ['Track', 'Student'], scenesFromSheet);
      jobs.push(Promise.all([sceneData, castData.catch(() => null), songData]).then(([sc, cast, songs]) => {
        renderScenes(sc, cast, songs);
        doneLoading('scenes');
      }));
    }
    await Promise.all(jobs);

    if (usedBackup) {
      // Tell families the page may be a little behind, without alarming them.
      const note = el('p', 'backup-note',
        'We could not load the latest updates just now, so some of this page may be out of date. ' +
        'Try reloading in a few minutes.');
      main.insertBefore(note, main.firstChild);
    }
  } catch (err) {
    showError(main, err);
  } finally {
    // The scenery is pinned to the foot of <main>, so before the content is
    // drawn it would flash near the top of a near-empty page. Reveal it once
    // the layout has settled.
    const showArt = () => document.body.classList.add('art-ready');
    requestAnimationFrame(() => requestAnimationFrame(showArt));
    setTimeout(showArt, 400);
  }
});
