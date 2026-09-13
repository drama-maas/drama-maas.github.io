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

/* ---------- shared chrome ---------- */

function renderChrome(site) {
  document.querySelectorAll('[data-site="school"]').forEach(n => n.textContent = site.school);
  document.querySelectorAll('[data-site="season"]').forEach(n => n.textContent = site.season);
  document.querySelectorAll('[data-site="showTitle"]').forEach(n => n.textContent = site.showTitle);

  const footer = slot('footer-note');
  if (footer && site.footerNote) footer.textContent = site.footerNote;

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

function renderStudyHall(sh, signupUrl, isPast) {
  if (!sh) return null;
  const name = (sh.volunteer || '').trim();
  const none = name.toLowerCase() === 'none';

  // A past date with nobody named has nothing useful left to say.
  if (isPast && !name) return sh.note ? el('div', 'study study-note', sh.note) : null;

  const row = el('div', 'study');
  row.appendChild(el('span', 'study-label', 'Study hall' + (sh.time ? ' ' + sh.time : '')));

  if (none) {
    row.appendChild(el('span', 'study-none', 'Not needed this day'));
  } else if (name) {
    row.appendChild(el('span', 'study-name', name));
  } else {
    row.classList.add('is-open');
    row.appendChild(el('span', 'study-open', 'Needs a volunteer'));
    if (signupUrl) row.appendChild(link(signupUrl, 'Sign up »', 'study-signup'));
  }
  if (sh.note) row.appendChild(el('div', 'study-note', sh.note));
  return row;
}

function renderCalendars(data, site) {
  const host = slot('calendars');
  if (!host) return;
  host.innerHTML = '';
  const today = todayISO();
  let nextMarked = false;
  let nextCard = null;
  const signupUrl = site.studyHallSignupUrl || '';

  const jumpBar = el('div', 'jump-bar');
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

        if ((ev.blocks || []).length) {
          const blocks = el('div', 'blocks');
          ev.blocks.forEach(b => {
            blocks.appendChild(el('div', 'btime', b.time || ''));
            blocks.appendChild(el('div', 'bwhat', b.what || ''));
          });
          body.appendChild(blocks);
        }

        const sh = renderStudyHall(ev.studyHall, signupUrl, isPast);
        if (sh) body.appendChild(sh);

        card.appendChild(body);
        list.appendChild(card);
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
    jumpBar.remove();
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
    renderChrome(site);

    let calendarData = null;
    if (slot('calendars') || slot('announcements') || slot('performances')) {
      calendarData = await loadJSON('data/calendar.json');
    }
    renderAnnouncements(site, calendarData);
    if (slot('links')) renderLinks(await loadJSON('data/links.json'));
    if (slot('calendars')) renderCalendars(calendarData, site);
    if (slot('performances')) renderPerformances(calendarData, site);
    if (slot('cast')) renderCast(await loadJSON('data/cast.json'));
    if (slot('boosters')) renderBoosters(await loadJSON('data/boosters.json'));
  } catch (err) {
    showError(main, err);
  }
});
