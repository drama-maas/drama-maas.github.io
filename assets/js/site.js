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

  const banner = slot('banner');
  if (banner && site.bookmarkBanner) banner.textContent = '⭐ ' + site.bookmarkBanner;

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
    const anchor = link('#calendars', 'See the calendar »', 'more');
    card.appendChild(anchor);
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
    const grid = el('div', 'link-grid');
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

function renderStudyHall(sh, signupUrl) {
  if (!sh) return null;
  const row = el('div', 'study');
  const label = el('span', 'study-label', 'Study hall' + (sh.time ? ' ' + sh.time : ''));
  row.appendChild(label);

  const name = (sh.volunteer || '').trim();
  if (name.toLowerCase() === 'none') {
    row.appendChild(el('span', 'study-none', 'Not needed this day'));
  } else if (name) {
    row.appendChild(el('span', 'study-name', name));
  } else {
    row.classList.add('is-open');
    row.appendChild(el('span', 'study-open', 'Needs a volunteer'));
    if (signupUrl) {
      row.appendChild(link(signupUrl, 'Sign up »', 'study-signup'));
    }
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
  const signupUrl = site.studyHallSignupUrl || '';

  (data.calendars || []).forEach(cal => {
    const section = el('section');
    if (cal.id) section.id = 'cal-' + cal.id;
    section.appendChild(el('h2', null, cal.heading));
    if (cal.intro) section.appendChild(el('p', 'section-intro', cal.intro));

    (cal.months || []).forEach(month => {
      section.appendChild(el('div', 'month-label', month.name));
      const list = el('div', 'events');

      (month.events || []).forEach(ev => {
        const card = el('article', 'event' + (ev.performance ? ' is-show' : ''));
        if (ev.date && ev.date < today) {
          card.classList.add('is-past');
        } else if (ev.date && !nextMarked) {
          card.classList.add('is-next');
          nextMarked = true;
        }

        const chip = el('div', 'date');
        chip.appendChild(el('div', 'mon', ev.month || ''));
        chip.appendChild(el('div', 'num', ev.day || ''));
        if (ev.weekday) chip.appendChild(el('div', 'wd', ev.weekday));
        card.appendChild(chip);

        const body = el('div', 'body');
        const head = el('div', 'head');
        if (ev.performance) head.appendChild(el('span', 'badge', '★ Performance'));
        if (card.classList.contains('is-next')) head.appendChild(el('span', 'badge next', 'Next up'));
        head.appendChild(el('span', 'title', ev.title));
        body.appendChild(head);

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

        const sh = renderStudyHall(ev.studyHall, signupUrl);
        if (sh) body.appendChild(sh);

        card.appendChild(body);
        list.appendChild(card);
      });
      section.appendChild(list);
    });
    host.appendChild(section);
  });

  if (data.openItems) {
    const section = el('section');
    section.id = 'todo';
    section.appendChild(el('h2', null, data.openItems.heading));
    if (data.openItems.intro) section.appendChild(el('p', 'section-intro', data.openItems.intro));
    const ul = el('ul', 'checklist');
    (data.openItems.items || []).forEach(item => ul.appendChild(el('li', null, item)));
    section.appendChild(ul);
    host.appendChild(section);
  }
}

/* ---------- cast ---------- */

const TRACK_CLASS = { Castle: 'castle', Storybook: 'storybook', Both: 'both', TBD: 'tbd' };

function renderCast(data) {
  const host = slot('cast');
  if (!host) return;
  host.innerHTML = '';

  (data.intro || []).forEach(p => host.appendChild(el('p', null, p)));

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
  ['All', 'Castle', 'Storybook'].forEach(name => {
    const b = el('button', 'filter' + (name === 'All' ? ' is-on' : ''), name === 'All' ? 'All tracks' : name + ' Track');
    b.type = 'button';
    b.addEventListener('click', () => {
      activeTrack = name;
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

  const scroll = el('div', 'table-scroll');
  const table = el('table', 'cast');
  const thead = el('thead');
  const hr = el('tr');
  ['Actor', 'Role', 'Track', 'Description'].forEach(h => hr.appendChild(el('th', null, h)));
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = el('tbody');
  table.appendChild(tbody);
  scroll.appendChild(table);
  host.appendChild(scroll);

  const rows = (data.members || []).map(m => {
    const parts = m.parts || [];
    const tr = el('tr');

    const actorCell = el('td', 'actor');
    actorCell.setAttribute('data-label', 'Actor');
    actorCell.textContent = m.actor;
    tr.appendChild(actorCell);

    const roleCell = el('td', 'role');
    roleCell.setAttribute('data-label', 'Role');
    const trackCell = el('td', 'track-col');
    trackCell.setAttribute('data-label', 'Track');
    const descCell = el('td', 'desc');
    descCell.setAttribute('data-label', 'Description');

    parts.forEach(p => {
      roleCell.appendChild(el('div', 'role-line', p.role));
      const badge = el('div', 'track-line');
      badge.appendChild(el('span', 'track track-' + (TRACK_CLASS[p.track] || 'both'), p.track));
      trackCell.appendChild(badge);
      descCell.appendChild(el('div', 'line', p.description || ' '));
    });

    tr.appendChild(roleCell);
    tr.appendChild(trackCell);
    tr.appendChild(descCell);

    tr.dataset.search = (m.actor + ' ' + parts.map(p => p.role).join(' ')).toLowerCase();
    tr.dataset.tracks = parts.map(p => p.track).join(' ');
    tbody.appendChild(tr);
    return tr;
  });

  function apply() {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    rows.forEach(tr => {
      const tracks = tr.dataset.tracks;
      const trackOK = activeTrack === 'All' ||
        tracks.includes(activeTrack) || tracks.includes('Both');
      const textOK = !q || tr.dataset.search.includes(q);
      const match = trackOK && textOK;
      tr.hidden = !match;
      if (match) shown++;
    });
    count.textContent = shown + (shown === 1 ? ' person' : ' people');
  }
  input.addEventListener('input', apply);
  apply();

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
    if (slot('calendars') || slot('announcements')) {
      calendarData = await loadJSON('data/calendar.json');
    }
    renderAnnouncements(site, calendarData);
    if (slot('links')) renderLinks(await loadJSON('data/links.json'));
    if (slot('calendars')) renderCalendars(calendarData, site);
    if (slot('cast')) renderCast(await loadJSON('data/cast.json'));
    if (slot('boosters')) renderBoosters(await loadJSON('data/boosters.json'));
  } catch (err) {
    showError(main, err);
  }
});
