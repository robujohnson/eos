# EOS 14 stats

Player and team stats for Elisa Open Suomi 14, served with GitHub Pages at
**https://robujohnson.github.io/eos/**.

## Updating the stats

```
python3 scripts/eos_stats_to_js.py path/to/EOS-stats.xlsx
```

This rewrites `data.js` from the spreadsheet and bumps the `?v=` cache-busting
stamps. Commit and push, and the site updates within a minute or two.

Files edited by hand:

- `schedule.js` - upcoming matches and playoff bracket (Finnish time)
- `roles.js` - IGL list and optional manual role overrides
- `faceit-names.js` - FACEIT nickname for players whose nickname differs from the in-game name
- `logos/` - team logos (`<team>.png`) and player photos (named after the player)

## FACEIT ELO page

`.github/workflows/update-faceit.yml` runs `scripts/fetch_faceit.py` daily and
commits `faceit.js` / `faceit-all.js`. It needs a `FACEIT_API_KEY` repository
secret (a server-side key from developers.faceit.com).
