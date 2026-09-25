# Working on Schoolio together

## Before you start
Say what you're working on (an issue or a message) so two people don't edit the same file.
Most changes touch one module, which is the whole reason the code is split up.

## The normal loop
```bash
git pull                      # always start here
git checkout -b my-change     # work on a branch, not main
# ...edit...
python3 -m http.server 8000   # check it in a browser
git add -A
git commit -m "Short description of what changed"
git push -u origin my-change
```
Then open a pull request on GitHub and have the other person look at it.

## Where things live
- Changing how a screen looks → `src/views.js` or `assets/styles.css`
- Changing what gets saved → `src/data.js`
- Import or parsing behavior → `src/importer.js`
- Adding a screen → `src/views.js`, then register it in `src/router.js`

## Please don't
- Commit API keys, school calendar links, or `.env` files.
- Seed real accounts with sample data.
- Add a framework or build step without agreeing on it first.

## Testing before you push
Sign in, add a class, add a task, refresh, check the calendar, import three typed lines,
and try it at phone width. If you changed grades, check the final calculator.
