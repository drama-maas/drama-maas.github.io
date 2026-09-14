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

/* Track names and the CSS class that colours their pill. */
const TRACK_CLASS = { Castle: 'castle', Storybook: 'storybook', Both: 'both', TBD: 'tbd' };

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

/* ---------- Google Sheet content ----------
   The calendar, announcements and cast can come from a published Google Sheet
   so admins edit a spreadsheet instead of JSON. Each tab is read as CSV. If a
   tab cannot be reached or does not look right, the page quietly uses the
   matching file in /data instead, so it never goes blank. */

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

// One published tab as objects keyed by the headings in row 1. Row 2 holds
// hints for editors and is skipped, as are entirely blank rows.
async function loadSheet(url, required) {
  const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('the sheet returned ' + res.status);
  const text = (await res.text()).replace(/^﻿/, '');
  if (/^\s*</.test(text)) throw new Error('the sheet is not published as CSV');
  const rows = parseCSV(text);
  const heads = (rows[0] || []).map(h => h.trim());
  required.forEach(h => {
    if (!heads.includes(h)) throw new Error('the sheet has no "' + h + '" column');
  });
  return rows.slice(2)
    .map(r => Object.fromEntries(heads.map((h, i) => [h, (r[i] || '').trim()])))
    .filter(o => Object.values(o).some(Boolean));
}

// A tab from the sheet when one is configured and usable, otherwise the file.
async function contentFor(jsonPath, sheetUrl, required, transform) {
  const base = loadJSON(jsonPath);
  if (!sheetUrl) return base;
  const [saved, rows] = await Promise.all([base, loadSheet(sheetUrl, required).catch(err => err)]);
  try {
    if (rows instanceof Error) throw rows;
    return transform(rows, saved);
  } catch (err) {
    console.warn('Using ' + jsonPath + ' because the Google Sheet could not be used: ' + err.message);
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
    card.appendChild(el('div', 'title', ev.title));
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
function renderStudyHall(sh) {
  if (!sh) return null;
  const name = (sh.volunteer || '').trim();
  if (!name || name.toLowerCase() === 'none') {
    return sh.note ? el('div', 'study study-note', sh.note) : null;
  }
  const row = el('div', 'study');
  row.appendChild(el('span', 'study-label', 'Study hall' + (sh.time ? ' ' + sh.time : '')));
  row.appendChild(el('span', 'study-name', name));
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
        line.appendChild(el('span', 'title', ev.title));
        if (ev.track) {
          line.appendChild(el('span', 'track track-' + (TRACK_CLASS[ev.track] || 'both'), ev.track));
        }
        body.appendChild(line);

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

        const sh = renderStudyHall(ev.studyHall);
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
    head.appendChild(el('span', 'title', ev.title));
    if (ev.track) {
      head.appendChild(el('span', 'track track-' + (TRACK_CLASS[ev.track] || 'both'), ev.track));
    }
    body.appendChild(head);
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

function renderCast(data) {
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

  const legend = el('div', 'legend');
  Object.entries(data.tracks || {}).forEach(([name, text]) => {
    const item = el('span', 'legend-item');
    item.appendChild(el('span', 'track track-' + (TRACK_CLASS[name] || 'both'), name));
    item.appendChild(el('span', 'legend-text', text));
    legend.appendChild(item);
  });
  if (legend.children.length) host.appendChild(legend);

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
  const count = el('div', 'count');
  controls.appendChild(count);
  host.appendChild(controls);

  const note = el('p', 'filter-note');
  host.appendChild(note);

  const scroll = el('div', 'table-scroll');
  const table = el('table', 'cast');
  const thead = el('thead');
  const hr = el('tr');
  ['Actor', 'Role', 'Track', 'Description'].forEach(h => hr.appendChild(el('th', null, h)));
  thead.appendChild(hr);
  table.appendChild(thead);
  scroll.appendChild(table);
  host.appendChild(scroll);

  // One <tbody> per person, one <tr> per role, so each role sits on the same line as
  // its own track and description. Rows are rebuilt when the filter changes, because
  // the actor cell spans however many roles are currently on show.
  const members = (data.members || []).map(m => ({
    actor: m.actor,
    parts: m.parts && m.parts.length ? m.parts : [{ role: '', track: 'Both', description: '' }],
    group: el('tbody', 'member'),
    search: (m.actor + ' ' + (m.parts || []).map(p => p.role).join(' ')).toLowerCase()
  }));
  members.forEach(m => table.appendChild(m.group));

  function fillGroup(m, parts) {
    m.group.innerHTML = '';
    parts.forEach((p, i) => {
      const tr = el('tr', i === 0 ? 'first' : 'more');
      if (i === 0) {
        const actorCell = el('td', 'actor');
        actorCell.rowSpan = parts.length;
        actorCell.appendChild(el('span', 'actor-name', m.actor));
        if (parts.length > 1) {
          actorCell.appendChild(el('span', 'actor-count', parts.length + ' roles'));
        }
        tr.appendChild(actorCell);
      }

      const roleCell = el('td', 'role');
      roleCell.setAttribute('data-label', 'Role');
      roleCell.textContent = p.role;
      tr.appendChild(roleCell);

      const trackCell = el('td', 'track-col');
      trackCell.setAttribute('data-label', 'Track');
      trackCell.appendChild(el('span', 'track track-' + (TRACK_CLASS[p.track] || 'both'), p.track));
      tr.appendChild(trackCell);

      const descCell = el('td', 'desc');
      descCell.setAttribute('data-label', 'Description');
      descCell.textContent = p.description || '';
      tr.appendChild(descCell);

      m.group.appendChild(tr);
    });
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
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    members.forEach(m => {
      const parts = m.parts.filter(partVisible);
      const match = parts.length > 0 && (!q || m.search.includes(q));
      m.group.hidden = !match;
      if (match) {
        fillGroup(m, parts);
        shown++;
      } else {
        m.group.innerHTML = '';
      }
    });
    count.textContent = shown + (shown === 1 ? ' person' : ' people');
    note.textContent = NOTES[activeTrack] || '';
    note.hidden = !note.textContent;

    // Filtering can shorten the page under the reader's feet. Bring the controls
    // back into view rather than leaving them stranded above the window.
    if (started && controls.getBoundingClientRect().top < 0) {
      controls.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }
  let started = false;
  input.addEventListener('input', apply);
  apply();
  started = true;

  if (data.pending) {
    const section = el('section');
    section.appendChild(el('h2', null, data.pending.heading));
    if (data.pending.intro) section.appendChild(el('p', 'section-intro', data.pending.intro));
    const pills = el('ul', 'name-pills');
    (data.pending.names || []).forEach(n => pills.appendChild(el('li', null, n)));
    section.appendChild(pills);
    host.appendChild(section);
  }

  if (data.closing) {
    const box = el('div', 'note-box');
    data.closing.forEach(p => box.appendChild(el('p', null, p)));
    host.appendChild(box);
  }
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

/* ---------- boot ---------- */

document.addEventListener('DOMContentLoaded', async () => {
  const main = document.querySelector('main') || document.body;
  try {
    const site = await loadJSON('data/site.json');
    const sheet = site.sheet || {};
    renderChrome(site);

    let calendarData = null;
    if (slot('calendars') || slot('announcements') || slot('performances')) {
      calendarData = await contentFor('data/calendar.json', sheet.calendar, ['Date', 'Title'], calendarFromSheet);
    }
    if (slot('announcements') && sheet.announcements) {
      try {
        const items = announcementsFromSheet(await loadSheet(sheet.announcements, ['Title']));
        site.announcements = Object.assign({}, site.announcements, { items });
      } catch (err) {
        console.warn('Using data/site.json for announcements because the Google Sheet could not be used: ' + err.message);
      }
    }
    renderAnnouncements(site, calendarData);
    if (slot('links')) renderLinks(await loadJSON('data/links.json'));
    if (slot('calendars')) {
      // The cast list feeds the name picker that shows who is called to each rehearsal.
      const castForPicker = await contentFor('data/cast.json', sheet.cast, ['Actor', 'Role'], castFromSheet)
        .catch(() => null);
      renderCalendars(calendarData, site, castForPicker);
    }
    if (slot('performances')) renderPerformances(calendarData, site);
    if (slot('cast')) {
      renderCast(await contentFor('data/cast.json', sheet.cast, ['Actor', 'Role'], castFromSheet));
    }
    if (slot('boosters')) renderBoosters(await loadJSON('data/boosters.json'));
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
