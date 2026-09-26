# Schoolio

A study hub for students to keep classes, assignments, tests, grades, and their calendar in one place.
Live at **https://schoolioweb.github.io/Schoolio/**

## How it's built

No build step and no framework. It's plain HTML, CSS, and ES modules, hosted on GitHub Pages,
with Supabase for sign-in and data. Edit a file, commit, and it's live in about a minute.

## Running it locally

ES modules need a server; opening `index.html` from Finder won't work.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Rules of the project

1. **New accounts start empty.** Never seed a real account with example content.
   Sample data is for the signed-out preview only.
2. **Imports are always reviewed.** Nothing saves until the student taps Import.
3. **No secrets in this repo.** The Supabase publishable key is public by design;
   service-role keys, OAuth secrets, and API keys never belong here.
4. **Deadlines and study time are different things.** Don't let one overwrite the other.

## Setting up your own Supabase

1. Create a project at supabase.com.
2. Run `supabase/schema.sql` in the SQL Editor.
3. Enable Google in Authentication → Providers.
4. Set Site URL and Redirect URLs to where you host it.
5. Put your project URL and publishable key in `src/config.js`.

## Not built yet

Photo import, reminders, submitted-vs-finished statuses, group projects, undo delete,
search and filters. See Issues.
