#!/usr/bin/env python3
"""Convert the EOS league stats spreadsheet into data.js.

Usage:
    python3 scripts/eos_stats_to_js.py path/to/EOS-stats.xlsx

The site (robujohnson.github.io/eos/) reads everything from the generated file, so
updating the stats is just: drop in the new spreadsheet, run this, commit.

Player roles are kept by hand in roles.js (player name -> role).
This script only adds players that are missing there (with an empty role);
roles already filled in are never overwritten.

Columns are looked up by header name in the page, so new or reordered columns
in the spreadsheet don't break anything.
"""

import json
import os
import re
import sys
from datetime import datetime, timezone

import openpyxl

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'data.js')
LOGO_DIR = os.path.join(ROOT, 'logos')
SITE_DATA = os.path.join(ROOT, 'js', 'data.js')  # optional (only exists in the cslans repo)


def clean(v):
    if isinstance(v, float):
        if v != v:  # NaN
            return None
        if v.is_integer():
            return int(v)
        return float(f'{v:.5g}')
    if isinstance(v, str):
        v = v.strip()
        return None if v in ('', 'nan') else v
    return v


def read_table(ws, header_rows=1, group_row=None):
    """Return (headers, rows) where rows stop at the first blank first cell."""
    all_rows = list(ws.iter_rows(values_only=True))
    if group_row is not None:
        groups, names = all_rows[group_row], all_rows[header_rows - 1]
        headers, g = [], None
        for gr, nm in zip(groups, names):
            g = gr or g
            headers.append(nm if g == 'Player' else f'{g}|{nm}')
    else:
        headers = [str(h).strip() if h is not None else '' for h in all_rows[header_rows - 1]]
    rows, trailing = [], []
    for r in all_rows[header_rows:]:
        if not r or r[0] is None or str(r[0]).strip() == '':
            trailing = [x for x in all_rows[header_rows + len(rows):] if x and x[0]]
            break
        rows.append([clean(x) for x in r[:len(headers)]])
    return headers, rows, trailing


def known_logos():
    """Map team name (lowercased) -> logo slug, from the main site's data."""
    mapping = {}
    try:
        with open(SITE_DATA, encoding='utf-8') as f:
            txt = f.read()
        for m in re.finditer(r"\{n:\s*([^,}]+?),\s*l:\s*([\w-]+)", txt):
            mapping.setdefault(m.group(1).strip().strip('"\'').lower(), m.group(2))
        for m in re.finditer(r"team:\s*'([^']+)',\s*logo:\s*'([\w-]+)'", txt):
            mapping.setdefault(m.group(1).lower(), m.group(2))
    except OSError:
        pass
    return mapping


def logo_for(team, mapping):
    candidates = [mapping.get(team.lower()), re.sub(r'[^a-z0-9]', '', team.lower()),
                  re.sub(r'[^a-z0-9]', '', team.lower().split('.')[0])]
    for c in candidates:
        if c and os.path.exists(os.path.join(LOGO_DIR, c + '.png')):
            return c
    return None


def update_roles(players):
    """Keep roles.js in sync: IGL list + optional manual role overrides.

    Roles are worked out automatically on the page (AWPer / Spacetaker /
    Pack rifler / Lurker / Rifler); a non-empty entry in EOS_ROLES overrides
    that. New players are added with "" and existing entries are never changed.
    """
    path = os.path.join(os.path.dirname(OUT), 'roles.js')
    roles, igls = {}, []
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            txt = f.read()
        m = re.search(r'window\.EOS_ROLES\s*=\s*(\{.*?\})\s*;', txt, re.S)
        if m:
            roles = json.loads(m.group(1))
        m = re.search(r'window\.EOS_IGLS\s*=\s*(\[.*?\])\s*;', txt, re.S)
        if m:
            igls = json.loads(m.group(1))
    added = [p for p in players if p not in roles]
    for p in added:
        roles[p] = ''
    with open(path, 'w', encoding='utf-8') as f:
        f.write('// In-game leaders. Shown as "IGL" next to the automatic role on the player card.\n')
        f.write('window.EOS_IGLS = ')
        json.dump(igls, f, ensure_ascii=False)
        f.write(';\n\n')
        f.write('// Roles are worked out automatically from the stats (AWPer, Spacetaker, Pack rifler,\n')
        f.write('// Lurker, Rifler). Put a role here only to override that for a player; "" = automatic.\n')
        f.write('window.EOS_ROLES = ')
        json.dump(roles, f, ensure_ascii=False, indent=2)
        f.write(';\n')
    return added


def man_advantage(wb, team_of):
    """Per team, from the kill log: what happens after the round's first kill.

    adv = rounds where the team got the opening kill (5v4); advNext = of those,
    rounds where the team also got the next kill (5v3).
    dis = rounds where the team lost the opening duel (4v5); disNext = of those,
    rounds where the team got the next kill back (4v4).
    Rounds with only one kill are left out.
    """
    if 'Kill values' not in wb.sheetnames:
        return {}
    rows = list(wb['Kill values'].iter_rows(values_only=True))
    h = [str(x) for x in rows[0]]
    ix = {k: h.index(k) for k in ('Match', 'Round', 'Time (s)', 'Killer', 'Victim')}
    rounds = {}
    for r in rows[1:]:
        if not r or r[ix['Match']] is None:
            continue
        rounds.setdefault((r[ix['Match']], r[ix['Round']]), []).append(r)
    out = {}
    for kills in rounds.values():
        kills.sort(key=lambda r: r[ix['Time (s)']] or 0)
        if len(kills) < 2:
            continue
        first, second = kills[0], kills[1]
        up, down = team_of.get(first[ix['Killer']]), team_of.get(first[ix['Victim']])
        nxt = team_of.get(second[ix['Killer']])
        if not up or not down or up == down or not nxt:
            continue
        a = out.setdefault(up, {'adv': 0, 'advNext': 0, 'dis': 0, 'disNext': 0})
        b = out.setdefault(down, {'adv': 0, 'advNext': 0, 'dis': 0, 'disNext': 0})
        a['adv'] += 1
        b['dis'] += 1
        if nxt == up:
            a['advNext'] += 1
        elif nxt == down:
            b['disNext'] += 1
    return out


def norm_name(n):
    # Case-insensitive, and 0 == o (m0n0xx -> Monoxx.webp)
    return re.sub(r'[^a-z0-9]', '', str(n).lower()).replace('0', 'o')


def player_photos(players, team_logos):
    """Map player name -> photo file in logos/ (e.g. logos/myltsi.webp)."""
    files = {}
    for f in sorted(os.listdir(LOGO_DIR)):
        stem, ext = os.path.splitext(f)
        if ext.lower() not in ('.webp', '.png', '.jpg', '.jpeg') or stem in team_logos:
            continue
        files.setdefault(norm_name(stem), f)
    return {p: files[norm_name(p)] for p in players if norm_name(p) in files}


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    wb = openpyxl.load_workbook(sys.argv[1], data_only=True)

    lb_h, lb_rows, lb_tail = read_table(wb['Leaderboard'])
    adv_h, adv_rows, _ = read_table(wb['Advanced'], header_rows=2, group_row=0)
    pm_h, pm_rows, _ = read_table(wb['Per map'])
    m_h, m_rows, _ = read_table(wb['Matches'])
    pos_h, pos_rows, _ = read_table(wb['Positions']) if 'Positions' in wb.sheetnames else ([], [], [])

    glossary = []
    if 'Glossary' in wb.sheetnames:
        for r in list(wb['Glossary'].iter_rows(values_only=True))[1:]:
            if r[0] and r[1] and r[0] not in ('How to update',):
                glossary.append([str(r[0]).strip(), str(r[1]).strip()])

    note = next((str(r[0]) for r in lb_tail if r[0] and str(r[0]).startswith('Updated')), '')
    updated = re.search(r'Updated ([\d-]+ [\d:]+)', note)

    teams = sorted({r[lb_h.index('Team')] for r in lb_rows if r[lb_h.index('Team')]}, key=str.lower)
    mapping = known_logos()
    logos = {t: logo_for(t, mapping) for t in teams}

    player_names = [r[lb_h.index('Player')] for r in lb_rows]
    photos = player_photos(player_names, {l for l in logos.values() if l})

    data = {
        'updated': updated.group(1) if updated else datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M'),
        'note': note,
        'minRounds': int(m.group(1)) if (m := re.search(r'under (\d+) rounds', note)) else 60,
        'logos': logos,
        'photos': photos,
        'manAdv': man_advantage(wb, {r[lb_h.index('Player')]: r[lb_h.index('Team')] for r in lb_rows}),
        'leaderboard': {'h': lb_h, 'rows': lb_rows},
        'advanced': {'h': adv_h, 'rows': adv_rows},
        'perMap': {'h': pm_h, 'rows': pm_rows},
        'matches': {'h': m_h, 'rows': m_rows},
        'positions': {'h': pos_h, 'rows': pos_rows},
        'glossary': glossary,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('// Generated by scripts/eos_stats_to_js.py — do not edit by hand.\n')
        f.write('window.EOS_DATA = ')
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    added = update_roles([r[lb_h.index('Player')] for r in lb_rows])

    # Bump cache-busting version on the page's script tags.
    page = os.path.join(os.path.dirname(OUT), 'index.html')
    if os.path.exists(page):
        stamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
        with open(page, encoding='utf-8') as f:
            html = f.read()
        html = re.sub(r'((?:data|app|roles|schedule|extra-results)\.js\?v=)\d+', r'\g<1>' + stamp, html)
        with open(page, 'w', encoding='utf-8') as f:
            f.write(html)
    fpage = os.path.join(os.path.dirname(OUT), 'faceit', 'index.html')
    if os.path.exists(fpage):
        with open(fpage, encoding='utf-8') as f:
            html = f.read()
        html = re.sub(r'(/eos/data\.js\?v=)\d+', r'\g<1>' + stamp, html)
        with open(fpage, 'w', encoding='utf-8') as f:
            f.write(html)
    print(f'Wrote {OUT}: {len(lb_rows)} players, {len(m_rows)} maps, {len(teams)} teams')
    if added:
        print(f'Added {len(added)} new player(s) to roles.js:', ', '.join(added))
    print(f'Photos: {len(photos)}/{len(player_names)} players;', 'missing:', ', '.join(p for p in player_names if p not in photos) or 'none')
    print('Logos:', ', '.join(f'{t}={l or "placeholder"}' for t, l in logos.items()))


if __name__ == '__main__':
    main()
