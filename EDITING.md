# How to update the Drama Club website

No coding needed. Everything people read on the site lives in five text files in the
`data` folder. You edit them right on GitHub in your web browser, click Save, and the
website updates itself a minute or two later.

| I want to change... | Edit this file |
| --- | --- |
| The yellow bookmark bar, the sponsor/boosters/questions boxes, the Announcements | `data/site.json` |
| The "Links & Folders" buttons (Google Drive folders, SignUpGenius, etc.) | `data/links.json` |
| Rehearsal dates, show dates, study hall coverage | `data/calendar.json` |
| The cast list | `data/cast.json` |
| The Join the Boosters page | `data/boosters.json` |

The site has five pages: Home, Calendar, Performances, Cast List and Boosters. The
Performances page builds itself from the calendar, listing every date marked
`"performance": true`, so there is no separate file to keep in step.

The boosters' running to-do list is no longer on the website. It lives in
`STILL-TO-BE-CONFIRMED.md` in the repository, where you can tick items off.

## Making an edit, step by step

1. Go to the repository on GitHub and open the `data` folder.
2. Click the file you want to change.
3. Click the pencil icon (**Edit this file**) in the upper right.
4. Change the text **between the quotation marks**. Leave everything else alone.
5. Scroll down, type a short note like "added Nov 4 rehearsal", and click **Commit changes**.
6. Wait about a minute, then reload the website. Your change is live.

If the website ever shows a red error box, the last edit has a typo. Undo it: on GitHub open
the file, click **History**, find the previous version, and restore it. Then try again.

## The five rules that keep the file valid

1. Every piece of text sits inside `"double quotes"`.
2. Every line inside a `{ }` block ends with a comma, **except the last one**.
3. Never delete a `{`, `}`, `[` or `]` unless you delete its matching partner too.
4. `true`, `false` and `null` are typed without quotes.
5. When in doubt, copy an entry that already works and change the words in it.

## What updates itself

You do not have to maintain these by hand:

- **Coming up** on the home page always shows the next few calendar events, counted from
  today's date. Keep the calendar right and this stays right.
- **Past dates** fade out and the next date coming up gets a gold "Next up" badge.
- **Finished months** fold themselves shut once every date in them has passed. Anyone can
  click the month heading to open it again.
- **Study hall** shows a green **Sign up** button on any future date with no volunteer named.
  Once the date has passed the button disappears, since nobody can still sign up for it.

## Common jobs

### Change the Announcements boxes

In `data/site.json`, find `"announcements"`. These are the hand-written notices that sit
above "Coming up". Each one looks like this:

```json
{
  "date": "September 16",
  "icon": "📢",
  "title": "Mandatory parent meeting",
  "detail": "5:00-5:30 p.m., MAAS MPR, right after the whole cast rehearsal."
}
```

`date` is optional and prints in pink above the title. To add a notice, copy an existing one,
paste it after the comma, and edit the words. To remove one, delete it along with its comma.
Change `"upcomingCount"` if you want more or fewer automatic "Coming up" cards than three.

### Add a rehearsal date

In `data/calendar.json`, find the right month and copy an existing event:

```json
{
  "date": "2026-11-04",
  "day": "4",
  "month": "Nov",
  "weekday": "Wed",
  "performance": false,
  "title": "Whole Cast Rehearsal",
  "track": "",
  "blocks": [
    { "time": "2:00-3:30pm", "what": "6th grade" },
    { "time": "3:30-5:30pm", "what": "Everyone else" }
  ],
  "studyHall": {
    "time": "12:45-2:00pm",
    "volunteer": "",
    "note": ""
  }
}
```

- `date` must be in year-month-day order. It is what dims dates that have passed, picks the
  next one coming up, and fills the "Coming up" boxes on the home page. Get it right and the
  rest takes care of itself.
- `day`, `month` and `weekday` are what people actually see on the date chip. Write a range
  like `"15-16"` for a two-night run.
- `performance` set to `true` gives the date the pink show-date styling and a "Performance"
  badge, and puts it on the Performances page. Use it for Mystery Dinner and the April shows.
- `track` puts a coloured Castle or Storybook pill next to the title, the same pills used on
  the cast list. Leave it as `""` for a date that involves everybody.
- `blocks` is the schedule. Each one is a time and what happens then. Add or remove as many
  as you need.

### Fill in a study hall volunteer

Find the date in `data/calendar.json` and write the name in `volunteer`:

| What you write | What the page shows |
| --- | --- |
| `"volunteer": "Jane Smith"` | Study hall 12:45-2:00pm  Jane Smith |
| `"volunteer": ""` | Needs a volunteer, plus a green **Sign up** button |
| `"volunteer": "none"` | Not needed this day. Use this only when study hall truly is not running. |
| `"studyHall": null` | Nothing at all (use this on performance dates) |

The **Sign up** button goes to the SignUpGenius page. That address is stored once, in
`data/site.json` under `"studyHallSignupUrl"`, so if the sign-up ever moves you change it in
one place. SignUpGenius does not give each date its own web address, so the button opens the
list and the parent picks the row.

### Add or change a link

In `data/links.json`, copy an existing link block. Paste the web address between the quotes
for `url`. Links under `"Boosters members only"` appear in the second group.

### Update the cast list

In `data/cast.json`, each person has one or more `parts`:

```json
{
  "actor": "Jane Smith",
  "parts": [
    { "role": "Human Fiona", "track": "Castle", "description": "She may appear to be..." },
    { "role": "Flora", "track": "Storybook", "description": "Sleeping Beauty's entourage." }
  ]
}
```

`track` must be exactly one of these four words:

| Track | Meaning |
| --- | --- |
| `Castle` | Leads April 15-16, 2027 |
| `Storybook` | Leads April 22-23, 2027 |
| `Both` | Played both weekends. Use this for any role that is not track-specific. |
| `TBD` | Not settled yet |

Each role gets its own line in the table, lined up with its own track and its own
description, so a student with three roles reads as three separate lines under their name.

The **Castle Track** and **Storybook Track** buttons above the table keep everybody on
screen and simply hide the other track's version of a role. Pick Castle and a double-cast
student shows their Castle role, with their Storybook role tucked away. Roles played both
weekends stay put under either button.

When the September 16 roles are settled, replace the `TBD` entries with real names and delete
the `pending` section near the bottom of the file.

### Update the Boosters page

`data/boosters.json` holds the join and donate buttons, the mission statement, and the
committee list. A button with an empty `"url"` shows as a grey placeholder instead of a link,
which is how the Donate button is set right now. Paste the donation address into its `url`
and it turns into a working button.

## Photos and logos

Logos live in `assets/img`. To swap one, upload a file with the same name through GitHub's
**Add file → Upload files** button. Keep the transparent PNG format so it sits nicely on the
green header.

## Checking your work before you publish

Paste the whole file into <https://jsonlint.com>, click Validate, and it will point at any
missing comma. This is the fastest way to avoid breaking the page.
