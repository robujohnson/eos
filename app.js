/* EOS League stats page — renders everything from window.EOS_DATA (eos/data.js). */
(function () {
  'use strict';
  var D = window.EOS_DATA;
  if (!D) { document.body.innerHTML = '<p style="padding:20px">Stats data missing.</p>'; return; }

  // ---------- helpers ----------
  function rows(t) {
    return (t && t.rows || []).map(function (r) {
      var o = {}; t.h.forEach(function (h, i) { o[h] = r[i]; }); return o;
    });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fx(v, d) { return v == null ? '–' : v.toFixed(d); }
  function pctS(v, d) { return v == null ? '–' : (v * 100).toFixed(d == null ? 0 : d) + '%'; }
  function signedPct(v, d) { return v == null ? '–' : (v >= 0 ? '+' : '') + (v * 100).toFixed(d == null ? 1 : d) + '%'; }
  function signed(v, d) { return v == null ? '–' : (v > 0 ? '+' : '') + v.toFixed(d); }

  var MIN = D.minRounds || 60;
  var TEAM_COLORS = ['#38bdf8', '#f472b6', '#a3e635', '#fb923c', '#c084fc', '#facc15', '#2dd4bf', '#f87171', '#60a5fa', '#e879f9'];
  var teamColor = {};
  Object.keys(D.logos || {}).forEach(function (t, i) { teamColor[t] = TEAM_COLORS[i % TEAM_COLORS.length]; });
  function colorOf(team) { return teamColor[team] || '#94a3b8'; }

  function initials(team) {
    var w = String(team).replace(/\.[a-z]+$/i, '').split(/[\s_-]+/).filter(Boolean);
    return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
  }
  // Placeholder: shield in the team colour with initials.
  function placeholderSrc(team) {
    var c = colorOf(team);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '"/><stop offset="1" stop-color="#1e293b"/></linearGradient></defs>' +
      '<path d="M32 3 L57 11 V30 C57 45 46 56 32 61 C18 56 7 45 7 30 V11 Z" fill="url(#g)" stroke="rgba(255,255,255,.35)" stroke-width="2"/>' +
      '<text x="32" y="38" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="19" fill="#fff">' + esc(initials(team)) + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function logo(team, cls) {
    var slug = D.logos && D.logos[team];
    var ph = placeholderSrc(team);
    if (slug) return '<img class="logo ' + (cls || '') + '" src="/eos/logos/' + esc(slug) + '.png" alt="' + esc(team) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + ph + '\'">';
    return '<img class="logo ' + (cls || '') + '" src="' + ph + '" alt="' + esc(team) + '">';
  }

  // ---------- data model ----------
  var adv = {}; rows(D.advanced).forEach(function (r) { adv[r.Player + '|' + r.Team] = r; });
  var ROLES = window.EOS_ROLES || {};
  // CT / T side ratings, if the spreadsheet ever provides them (e.g. 'CT Rating' / 'T Rating').
  function sideRating(r, side) {
    var re = new RegExp('(^|[^A-Za-z])' + side + '([^A-Za-z]|$)');
    for (var k in r) if (/rating/i.test(k) && !/2\.0|adjusted/i.test(k) && re.test(k) && num(r[k]) != null) return num(r[k]);
    return null;
  }

  var players = rows(D.leaderboard).map(function (r) {
    var a = adv[r.Player + '|' + r.Team] || {};
    var rounds = r.Rounds || 0;
    var mk = ['2K', '3K', '4K', '5K'].reduce(function (s, k) { return s + (num(a['Multi-kills|' + k]) || 0); }, 0);
    return {
      name: r.Player, team: r.Team, maps: r.Maps, rounds: rounds, row: r, adv: a,
      low: rounds < MIN,
      rating: num(r['EOS Rating']), adj: num(r['EOS Rating (sample-adjusted)']), r2: num(r['Rating 2.0 (approx.)']),
      roundSwing: num(r['Round Swing / rd']), duelSwing: num(r['Duel Swing / map']), ecoSwing: num(r['Eco Swing']),
      k: r.K, d: r.D, pm: r['+/-'], adr: num(r.ADR), kast: num(r.KAST), hs: num(r['HS%']),
      ekpr: num(r.eKPR), eadr: num(r.eADR), open: num(r['Opening win%']), clutches: r['Clutches won'],
      kprRole: num(r['KPR vs role']),
      ct: sideRating(r, 'CT'), t: sideRating(r, 'T'),
      openAtt: num(a['Opening|Attempts']),
      openRate: rounds && num(a['Opening|Attempts']) != null ? num(a['Opening|Attempts']) / rounds : null, openSwing: num(a['Opening|Opening Swing']),
      tradeRd: rounds ? (num(a['Trading|Trade kills']) || 0) / rounds : null,
      clutchSwing: num(a['Closing|Clutch Swing']), clutchAtt: num(a['Closing|Clutches']),
      mkRate: rounds && a['Multi-kills|2K'] != null ? mk / rounds : null,
      utilDmg: num(a['Utility (per round)|Utility dmg']), flashAst: num(a['Utility (per round)|Flash assists']),
      acc: num(a['Aim|Accuracy (enemy spotted)']), headAcc: num(a['Aim|Head accuracy']),
      awp: num(a['Sniping|AWP kills%']),
      duelWin: num(a['Firepower|Duel win%'])
    };
  });
  // ---------- roles ----------
  // AWPer = most AWP kills on the team; otherwise by share of rounds in the opening duel:
  // over 22% Spacetaker, under 15% Lurker, between Pack rifler; no data = Rifler.
  var IGLS = (window.EOS_IGLS || []).map(function (n) { return String(n).toLowerCase(); });
  var awperOf = {};
  players.forEach(function (p) {
    var k = (num(p.adv['Sniping|AWP kills%']) || 0) * (p.k || 0);
    if (k > 0 && (!awperOf[p.team] || k > awperOf[p.team].k)) awperOf[p.team] = { p: p, k: k };
  });
  players.forEach(function (p) {
    var auto = awperOf[p.team] && awperOf[p.team].p === p ? 'AWPer'
      : p.openRate == null ? 'Rifler'
      : p.openRate > 0.22 ? 'Spacetaker' : p.openRate < 0.15 ? 'Lurker' : 'Pack rifler';
    var base = ROLES[p.name] || auto;
    p.igl = IGLS.indexOf(String(p.name).toLowerCase()) >= 0;
    p.baseRole = base;
    p.role = p.igl ? 'IGL · ' + base : base;
  });

  var pool = players.filter(function (p) { return !p.low; });
  if (pool.length < 5) pool = players;
  var byKey = {}; players.forEach(function (p) { byKey[p.name + '|' + p.team] = p; });

  // ---------- raw aim ----------
  // Mechanics only, in the style of 'raw aim' charts: three parts, each in standard deviations
  // ('steps') from the average of players with MIN+ rounds; Raw aim = 1.00 + 0.10 per step.
  //   Placement = crosshair placement (lower degrees = better)
  //   Precision = head accuracy, spray accuracy, accuracy with an enemy in sight
  //   Strafing  = counter-strafing
  // Weighted 45% placement, 45% precision, 10% strafing: counter-strafing is movement
  // discipline more than aim, so it only nudges the total.
  var AIM_PARTS = [
    ['Placement', [['Aim|Crosshair placement (\u00b0)', -1]], 0.45],
    ['Precision', [['Aim|Head accuracy', 1], ['Aim|Spray accuracy', 1], ['Aim|Accuracy (enemy spotted)', 1]], 0.45],
    ['Strafing', [['Aim|Counter-strafing', 1]], 0.10]
  ];
  (function () {
    function stats(vals) {
      vals = vals.filter(function (v) { return v != null; });
      if (vals.length < 3) return null;
      var m = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
      var sd = Math.sqrt(vals.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (vals.length - 1));
      return sd > 0 ? { m: m, sd: sd } : null;
    }
    var colStats = {};
    AIM_PARTS.forEach(function (part) {
      part[1].forEach(function (c) { colStats[c[0]] = stats(pool.map(function (p) { return num(p.adv[c[0]]); })); });
    });
    players.forEach(function (p) {
      p.aimParts = AIM_PARTS.map(function (part) {
        var zs = part[1].map(function (c) {
          var v = num(p.adv[c[0]]), st = colStats[c[0]];
          return v == null || !st ? null : c[1] * (v - st.m) / st.sd;
        }).filter(function (z) { return z != null; });
        return zs.length ? zs.reduce(function (a, b) { return a + b; }, 0) / zs.length : null;
      });
    });
    // parts -> re-standardised so each step of the total is one standard deviation
    var parts = AIM_PARTS.map(function (_, i) { return stats(pool.map(function (p) { return p.aimParts[i]; })); });
    players.forEach(function (p) {
      p.aimParts = p.aimParts.map(function (z, i) { return z == null || !parts[i] ? null : (z - parts[i].m) / parts[i].sd; });
      var have = p.aimParts.filter(function (z) { return z != null; });
      p.aimRaw0 = have.length === AIM_PARTS.length ? p.aimParts.reduce(function (a, z, i) { return a + z * AIM_PARTS[i][2]; }, 0) : null;
    });
    var tot = stats(pool.map(function (p) { return p.aimRaw0; }));
    players.forEach(function (p) { p.rawAim = p.aimRaw0 == null || !tot ? null : 1 + 0.1 * (p.aimRaw0 - tot.m) / tot.sd; });
    // rank of each part among the pool
    AIM_PARTS.forEach(function (_, i) {
      var vals = pool.map(function (p) { return p.aimParts[i]; }).filter(function (v) { return v != null; });
      players.forEach(function (p) {
        var z = p.aimParts[i];
        p.aimRanks = p.aimRanks || [];
        p.aimRanks[i] = z == null ? null : 1 + vals.filter(function (v) { return v > z; }).length;
      });
    });
  })();
  // ---------- gun ratings (Weapons sheet) ----------
  // Duels are counted for the gun each player held when the duel started, so losses count too.
  // Gun rating = the player's EOS rating x a gun factor. The factor compares his duels with that gun
  // (won vs the win chance each situation predicted) with his duels with all guns, so a gun he fights
  // better with than usual lifts the number above his EOS rating and a weaker one pulls it below; the
  // ratings roughly average back to his EOS rating. K extra 'as usual' duels pull small samples
  // toward his EOS rating.
  var GUN_K = 8, GUN_MIN = 10;
  var WNAME = { ak47: 'AK-47', m4a1: 'M4A4', m4a1_silencer: 'M4A1-S', galilar: 'Galil AR', famas: 'FAMAS', aug: 'AUG', sg556: 'SG 553',
    awp: 'AWP', ssg08: 'SSG 08', glock: 'Glock-18', usp_silencer: 'USP-S', hkp2000: 'P2000', deagle: 'Desert Eagle', tec9: 'Tec-9',
    fiveseven: 'Five-SeveN', p250: 'P250', elite: 'Dual Berettas', cz75a: 'CZ75-Auto', revolver: 'R8', mp9: 'MP9', mac10: 'MAC-10',
    mp7: 'MP7', ump45: 'UMP-45', p90: 'P90', bizon: 'PP-Bizon', mp5sd: 'MP5-SD' };
  function wname(w) { return WNAME[w] || w; }
  var GUN_GROUPS = [
    { k: 'g:rifles', lab: 'Rifles', short: 'Rifles', ws: ['ak47', 'm4a1', 'm4a1_silencer', 'galilar', 'famas', 'aug', 'sg556'] },
    { k: 'g:awp', lab: 'AWP', short: 'AWP', ws: ['awp'] },
    { k: 'g:pistols', lab: 'Glock / USP-S / P2000', short: 'Glock/USP', ws: ['glock', 'usp_silencer', 'hkp2000'] },
    { k: 'g:otherpistols', lab: 'Other pistols (Deagle, Tec-9, Five-SeveN\u2026)', short: 'Deagle+', ws: ['deagle', 'tec9', 'fiveseven', 'p250', 'elite', 'cz75a', 'revolver'] },
    { k: 'g:smg', lab: 'SMGs', short: 'SMGs', ws: ['mp9', 'mac10', 'mp7', 'ump45', 'p90', 'bizon', 'mp5sd'] }
  ];
  var gunData = {}, gunTotals = {};
  rows(D.weapons).forEach(function (r) {
    var k = r.Player + '|' + r.Team, n = r.Duels || 0;
    (gunData[k] = gunData[k] || {})[r.Weapon] = { duels: n, won: r.Won || 0, exp: (num(r['Expected win%']) || 0) * n,
      kills: r.Kills || 0, hs: (num(r['HS%']) || 0) * (r.Kills || 0) };
    gunTotals[r.Weapon] = (gunTotals[r.Weapon] || 0) + n;
  });
  var HAS_GUNS = Object.keys(gunData).length > 0;
  // single guns worth a leaderboard of their own (100+ duels in the league)
  var GUN_SINGLES = Object.keys(gunTotals).filter(function (w) { return gunTotals[w] >= 100; })
    .sort(function (a, b) { return gunTotals[b] - gunTotals[a]; });
  function gunWeapons(key) {
    if (key.indexOf('g:') === 0) return GUN_GROUPS.filter(function (g) { return g.k === key; })[0].ws;
    return [key];
  }
  function gunLabel(key) { var g = GUN_GROUPS.filter(function (x) { return x.k === key; })[0]; return g ? g.lab : wname(key); }
  var allRatio = {};   // player -> duels won / expected with every gun
  Object.keys(gunData).forEach(function (k) {
    var w = 0, e = 0;
    Object.keys(gunData[k]).forEach(function (g) { w += gunData[k][g].won; e += gunData[k][g].exp; });
    allRatio[k] = e > 0 ? w / e : 1;
  });
  function gunStat(p, key) {
    var pk = p.name + '|' + p.team, m = gunData[pk] || {}, o = { duels: 0, won: 0, exp: 0, kills: 0, hs: 0 };
    gunWeapons(key).forEach(function (w) { var x = m[w]; if (x) { o.duels += x.duels; o.won += x.won; o.exp += x.exp; o.kills += x.kills; o.hs += x.hs; } });
    if (!o.duels) return null;
    var usual = allRatio[pk] || 1;
    o.factor = (o.won + GUN_K) / (o.exp * usual + GUN_K);   // 1.00 = duels with this gun go as his duels usually do
    o.base = p.rating != null ? p.rating : 1;
    o.rating = o.base * o.factor;
    o.winPct = o.won / o.duels; o.expPct = o.exp / o.duels;
    o.hsPct = o.kills ? o.hs / o.kills : null;
    return o;
  }
  function gunColor(r, low) { return low ? '#475569' : ratingColor(r); }   // same colours as the EOS rating
  function gunTip(key, o) {
    if (!o) return '<b>' + esc(gunLabel(key)) + '</b><br>No duels';
    var d = Math.round((o.factor - 1) * 100);
    return '<b>' + esc(gunLabel(key)) + '</b><br>Rating with this gun <b>' + o.rating.toFixed(2) + '</b>' +
      '<br><span class=\'dim\'>EOS rating ' + o.base.toFixed(2) + (d === 0 ? ', duels with this gun as usual' : ', duels with this gun ' + (d > 0 ? '+' : '') + d + '% vs his usual') + '</span>' +
      '<br>' + o.duels + ' duels · ' + o.won + '-' + (o.duels - o.won) + ' · ' + pctS(o.winPct, 0) + ' won vs ' + pctS(o.expPct, 0) + ' expected' +
      '<br>' + o.kills + ' kills' + (o.hsPct != null ? ' · ' + pctS(o.hsPct, 0) + ' HS' : '') +
      (o.duels < GUN_MIN ? '<br><span class=\'dim\'>Few duels \u2013 read with care</span>' : '');
  }

  function aimTip(p) {
    if (p.rawAim == null) return 'No aim data';
    return '<b>' + p.rawAim.toFixed(2) + '</b> raw aim <span class=\'dim\'>(1.00 = league average, 0.10 = one step)</span>' +
      AIM_PARTS.map(function (part, i) {
        var z = p.aimParts[i];
        return '<br>' + part[0] + ' <span class=\'dim\'>(' + Math.round(part[2] * 100) + '%)</span>: ' + (z == null ? '–' : (z >= 0 ? '+' : '') + z.toFixed(2) + (p.aimRanks[i] && !p.low ? ' (#' + p.aimRanks[i] + ')' : ''));
      }).join('');
  }

  // Map-level results
  var matchRows = rows(D.matches);
  var RES_RE = /^(.+?)\s+(\d+)\s*[–—-]\s*(.+?)\s+(\d+)$/;
  var maps = matchRows.map(function (m) {
    var id = m['Demo file'] || '';
    var res = RES_RE.exec(m.Result || '') || [];
    var dt = /(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})/.exec(id);
    var series = /-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-/.exec(id);
    return {
      id: id, map: m.Map, rounds: m.Rounds,
      a: res[1], as: +res[2], b: res[3], bs: +res[4],
      date: dt ? dt[1] : '', time: dt ? dt[1] + ' ' + dt[2] + ':' + dt[3] : '',
      series: series ? series[1] : id
    };
  });
  // Matches without demos (extra-results.js): count for results/standings, not player stats.
  var extraBox = {};
  (window.EOS_EXTRA_RESULTS || []).forEach(function (x, si) {
    var sid = 'extra-' + si + '-' + x.date + '-' + x.a + '-' + x.b;
    (x.maps || []).forEach(function (mm, mi) {
      var id = sid + '-' + mi;
      maps.push({ id: id, map: mm.map, rounds: mm.as + mm.bs, a: x.a, as: mm.as, b: x.b, bs: mm.bs,
        date: x.date, time: x.date + ' ' + (x.time || '00:00') + ':' + mi, series: sid, noDemo: true, note: x.note, boxNote: mm.boxNote, ot: mm.ot });
      var rows = [];
      Object.keys(mm.box || {}).forEach(function (team) {
        mm.box[team].forEach(function (r) { rows.push({ Player: r[0], Team: team, K: r[1], D: r[2], ADR: r[3], Rounds: mm.as + mm.bs, KAST: null, 'EOS Rating': null }); });
      });
      extraBox[id] = rows;
    });
  });
  maps.sort(function (x, y) { return x.time < y.time ? -1 : x.time > y.time ? 1 : 0; });
  var mapById = {}; maps.forEach(function (m) { mapById[m.id] = m; });


  // Teams
  var teams = Object.keys(D.logos || {}).map(function (t) {
    var tp = players.filter(function (p) { return p.team === t; });
    var w = 0, l = 0, rw = 0, rl = 0;
    maps.forEach(function (m) {
      if (m.a === t) { rw += m.as; rl += m.bs; m.as > m.bs ? w++ : l++; }
      else if (m.b === t) { rw += m.bs; rl += m.as; m.bs > m.as ? w++ : l++; }
    });
    var tr = 0, trr = 0;
    tp.forEach(function (p) { if (p.rating != null) { tr += p.rating * p.rounds; trr += p.rounds; } });
    tp.sort(function (a, b) { return b.rating - a.rating; });
    return { name: t, players: tp, w: w, l: l, rw: rw, rl: rl, rating: trr ? tr / trr : null };
  }).sort(function (a, b) { return (b.w - b.l) - (a.w - a.l) || (b.rw - b.rl) - (a.rw - a.rl); });

  // ---------- percentiles ----------
  function percentile(get, v, lowerBetter) {
    if (v == null) return null;
    var vals = pool.map(get).filter(function (x) { return x != null; });
    if (!vals.length) return null;
    var below = 0, eq = 0;
    vals.forEach(function (x) { if (x < v) below++; else if (x === v) eq++; });
    var p = (below + 0.5 * eq) / vals.length;
    if (lowerBetter) p = 1 - p;
    return clamp(Math.round(p * 100), 1, 99);
  }
  // JFresh-style colour: deep red (low) -> slate (mid) -> blue (high)
  function mix(a, b, t) {
    var pa = [1, 3, 5].map(function (i) { return parseInt(a.substr(i, 2), 16); });
    var pb = [1, 3, 5].map(function (i) { return parseInt(b.substr(i, 2), 16); });
    return 'rgb(' + pa.map(function (x, i) { return Math.round(x + (pb[i] - x) * t); }).join(',') + ')';
  }
  function pctColor(p) {
    if (p == null) return '#1e293b';
    return p >= 50 ? mix('#2c3a55', '#2f9be0', (p - 50) / 50) : mix('#7a1f3d', '#2c3a55', p / 50);
  }
  function ratingColor(r) { return r == null ? '#64748b' : r >= 1.1 ? '#22c55e' : r >= 0.95 ? '#f59e0b' : '#f43f5e'; }

  var TILES = [
    { lab: 'Round Swing', get: function (p) { return p.roundSwing; }, fmt: function (v) { return signedPct(v, 2) + ' /rd'; } },
    { lab: 'Duel Swing', get: function (p) { return p.duelSwing; }, fmt: function (v) { return signedPct(v, 0) + ' /map'; } },
    { lab: 'Eco Swing', get: function (p) { return p.ecoSwing; }, fmt: function (v) { return signedPct(v, 1); } },
    { lab: 'Opening duels', get: function (p) { return p.open; }, fmt: function (v, p) { return pctS(v, 0) + (p.openAtt ? ' of ' + p.openAtt : ''); } },
    { lab: 'Clutching', get: function (p) { return p.clutchSwing; }, fmt: function (v, p) { return (p.clutches != null ? p.clutches : 0) + '/' + (p.clutchAtt != null ? p.clutchAtt : '–') + ' won'; } },
    { lab: 'Multi-kills', get: function (p) { return p.mkRate; }, fmt: function (v) { return pctS(v, 0) + ' of rds'; } },
    { lab: 'Utility dmg', get: function (p) { return p.utilDmg; }, fmt: function (v) { return fx(v, 1) + ' /rd'; } },
    { lab: 'Raw aim', get: function (p) { return p.rawAim; }, fmt: function (v, p) { return aimTip(p); }, html: true }
  ];

  // ---------- SVG pieces ----------
  function gauge(r) {
    var lo = 0.5, hi = 1.6, t = r == null ? 0 : clamp((r - lo) / (hi - lo), 0, 1);
    var cx = 100, cy = 98, R = 80;
    function pt(f) { var a = Math.PI * (1 - f); return [cx + R * Math.cos(a), cy - R * Math.sin(a)]; }
    var s = pt(0), e = pt(1), v = pt(t);
    var col = ratingColor(r);
    return '<svg class="gauge" viewBox="0 0 200 112" role="img" aria-label="EOS Rating ' + fx(r, 2) + '" style="--rc:' + col + '">' +
      '<defs><linearGradient id="gg" gradientUnits="userSpaceOnUse" x1="20" y1="0" x2="180" y2="0"><stop offset="0" stop-color="#f43f5e"/><stop offset=".45" stop-color="#f59e0b"/><stop offset=".7" stop-color="#22c55e"/><stop offset="1" stop-color="#4ade80"/></linearGradient></defs>' +
      '<path d="M' + s[0] + ' ' + s[1] + ' A' + R + ' ' + R + ' 0 0 1 ' + e[0] + ' ' + e[1] + '" fill="none" stroke="rgba(51,65,85,.6)" stroke-width="12" stroke-linecap="round"/>' +
      (t > 0.001 ? '<path class="fill" d="M' + s[0] + ' ' + s[1] + ' A' + R + ' ' + R + ' 0 0 1 ' + v[0].toFixed(2) + ' ' + v[1].toFixed(2) + '" fill="none" stroke="url(#gg)" stroke-width="12" stroke-linecap="round"/>' +
        '<circle cx="' + v[0].toFixed(2) + '" cy="' + v[1].toFixed(2) + '" r="5" fill="#fff" stroke="' + col + '" stroke-width="3"/>' : '') +
      '<line x1="' + pt((1 - lo) / (hi - lo))[0] + '" y1="' + (pt((1 - lo) / (hi - lo))[1] - 10) + '" x2="' + pt((1 - lo) / (hi - lo))[0] + '" y2="' + (pt((1 - lo) / (hi - lo))[1] + 10) + '" stroke="#94a3b8" stroke-width="2"/>' +
      '<text x="100" y="84" text-anchor="middle" font-weight="800" font-size="36" fill="#fff">' + fx(r, 2) + '</text>' +
      '<text x="100" y="104" text-anchor="middle" font-size="10" letter-spacing=".8" fill="#8a9ab5">EOS RATING</text></svg>';
  }

  // ---------- player card ----------
  var ordered = players.slice().sort(function (a, b) { return (a.low - b.low) || (b.rating - a.rating); });
  var current = null;

  function rankOf(p) {
    if (p.low) return null;
    var list = pool.slice().sort(function (a, b) { return b.rating - a.rating; });
    return list.indexOf(p) + 1;
  }

  // Black head-and-shoulders silhouette for players without a photo (same 400x417 frame as the photos).
  var SILHOUETTE = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 417"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#05080f"/></linearGradient></defs><g fill="url(#s)">' +
    '<ellipse cx="200" cy="128" rx="66" ry="80"/><path d="M168 196h64l6 34c64 10 112 40 130 92 8 24 12 60 12 95H20c0-35 4-71 12-95 18-52 66-82 130-92z"/></g></svg>');

  function renderCard(p) {
    current = p;
    var rk = rankOf(p);
    var tiles = TILES.map(function (t) {
      var v = t.get(p), pc = percentile(t.get, v);
      var tip = '<b>' + esc(t.lab) + '</b><br>' + (v == null ? 'No data' : t.fmt(v, p)) + (pc == null ? '' : '<br><span class=\'dim\'>' + ordinal(pc) + ' percentile among ' + MIN + '+ round players</span>');
      return '<div class="tile" data-tip="' + esc(tip) + '"><div class="lab">' + esc(t.lab) + '</div><div class="box" style="background:' + pctColor(pc) + '">' +
        '<div class="pct">' + (pc == null ? 'NA' : pc + '%') + '</div></div></div>';
    }).join('');
    var photo = D.photos && D.photos[p.name];
    var rpc = percentile(function (q) { return q.rating; }, p.rating);
    var rtip = '<b>EOS Rating ' + fx(p.rating, 2) + '</b>' + (rpc == null ? '' : '<br><span class=\'dim\'>' + ordinal(rpc) + ' percentile among ' + MIN + '+ round players</span>');
    $('card').innerHTML =
      '<div class="pc-head"><span class="mteam" data-team="' + esc(p.team) + '" title="Team details">' + logo(p.team, 'pc-logo') + '</span><div class="pname">' + esc(p.name) + '</div></div>' +
      '<div class="namebar"></div>' +
      '<div class="pc-mid">' +
        '<div class="pc-photo">' + (photo ? '<img class="pphoto" src="/eos/logos/' + encodeURIComponent(photo) + '" alt="' + esc(p.name) + '">' : '<img class="pphoto sil" src="' + SILHOUETTE + '" alt="">') + '</div>' +
        '<div class="tile pc-rate" data-tip="' + esc(rtip) + '"><div class="lab">EOS Rating</div><div class="box" style="background:' + pctColor(rpc) + '"><div class="pct">' + fx(p.rating, 2) + '</div></div></div>' +
        '<dl class="meta pc-meta">' +
          '<dt>Team</dt><dd><span class="mteam" data-team="' + esc(p.team) + '" title="Team details">' + esc(p.team) + '</span></dd>' +
          '<dt>Role</dt><dd>' + esc(p.role || '–') + '</dd>' +
          '<dt>Rank</dt><dd>' + (rk ? '#' + rk + ' <span class="dim">of ' + pool.length + '</span>' : '<span class="dim">Not ranked</span>') + '</dd>' +
          (p.t != null ? '<dt>T side</dt><dd class="sd-t">' + fx(p.t, 2) + '</dd>' : '') +
          (p.ct != null ? '<dt>CT side</dt><dd class="sd-ct">' + fx(p.ct, 2) + '</dd>' : '') +
        '</dl>' +
      '</div>' +
      '<div class="tiles">' + tiles + '</div>' +
      (HAS_GUNS ? '<div class="guns"><span class="guns-l" title="EOS rating adjusted by how their duels with each gun compare with their duels overall">Guns <span>· EOS rating with each gun</span></span>' + GUN_GROUPS.map(function (g) {
        var o = gunStat(p, g.k), low = !o || o.duels < GUN_MIN;
        return '<span class="gun' + (low ? ' low' : '') + '" data-tip="' + esc(gunTip(g.k, o)) + '"><span class="gl">' + esc(g.short) + '</span>' +
          '<b style="color:' + (o ? gunColor(o.rating, low) : '#64748b') + '">' + (o ? o.rating.toFixed(2) : '–') + '</b><span class="gn">' + (o ? o.duels : 0) + ' duels</span></span>';
      }).join('') + '</div>' : '');
    document.querySelectorAll('#lb tbody tr').forEach(function (tr) { tr.classList.toggle('sel', tr.dataset.k === p.name + '|' + p.team); });
    renderScatter();
    try { history.replaceState(null, '', '#' + encodeURIComponent(p.name)); } catch (e) { /* ignore */ }
  }

  function select(k, scroll) {
    var p = byKey[k]; if (!p) return;
    renderCard(p);
    if (scroll) $('player-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- leaders ----------
  var openLeaders = {};
  function renderLeaders() {
    var cats = [
      ['Round Swing', function (p) { return p.roundSwing; }, function (v) { return signedPct(v, 2); }],
      ['Duel Swing / map', function (p) { return p.duelSwing; }, function (v) { return signedPct(v, 0); }],
      ['Opening attempts', function (p) { return p.openRate; }, function (v) { return pctS(v, 1); }],
      ['Opening win%', function (p) { return p.openAtt >= 10 ? p.open : null; }, function (v) { return pctS(v, 0); }],
      ['Clutches won', function (p) { return p.clutches; }, function (v) { return String(v); }],
      ['Utility dmg / rd', function (p) { return p.utilDmg; }, function (v) { return v.toFixed(1); }]
    ];
    $('leaders').innerHTML = cats.map(function (c) {
      var all = pool.filter(function (p) { return c[1](p) != null; }).sort(function (a, b) { return c[1](b) - c[1](a); });
      var open = !!openLeaders[c[0]];
      var shown = open ? all : all.slice(0, 5);
      return '<div class="panel leader' + (open ? ' open' : '') + '" data-cat="' + esc(c[0]) + '"><h3 title="Show ' + (open ? 'top 5' : 'full list') + '">' + esc(c[0]) + '</h3><div class="lrows">' + shown.map(function (p, i) {
        return '<div class="lrow' + (i === 0 ? ' first' : '') + '" data-k="' + esc(p.name + '|' + p.team) + '">' + (open ? '<span class="lr">' + (i + 1) + '</span>' : '') + logo(p.team) + '<span class="ln">' + esc(p.name) + '</span><span class="lv">' + c[2](c[1](p)) + '</span></div>';
      }).join('') + '</div>' +
      (all.length > 5 ? '<button class="lmore" type="button">' + (open ? 'Show top 5 ▴' : 'Show all ' + all.length + ' ▾') + '</button>' : '') + '</div>';
    }).join('');
  }

  // ---------- leaderboard ----------
  var COLS = [
    { k: 'rank', lab: '#', get: null },
    { k: 'name', lab: 'Player', get: function (p) { return p.name.toLowerCase(); }, asc: true },
    { k: 'maps', lab: 'Maps', get: function (p) { return p.maps; } },
    { k: 'rating', lab: 'EOS Rating', get: function (p) { return p.rating; } },
    { k: 'rs', lab: 'Round Sw.', get: function (p) { return p.roundSwing; }, title: 'Round Swing per round' },
    { k: 'ds', lab: 'Duel Sw.', get: function (p) { return p.duelSwing; }, title: 'Duel Swing per map' },
    { k: 'kd', lab: 'K-D', get: function (p) { return p.pm; } },
    { k: 'adr', lab: 'ADR', get: function (p) { return p.adr; } }
  ];
  // Advanced view (hidden behind the 'Advanced' filter button): raw aim and a few deeper stats.
  function scv(v, txt) { return '<span class="' + (v > 0 ? 'pos-v' : v < 0 ? 'neg-v' : '') + '">' + txt + '</span>'; }
  function stepTxt(z) { return z == null ? '–' : scv(z, (z >= 0 ? '+' : '') + z.toFixed(2)); }
  var ADV_COLS = [
    { k: 'rank', lab: '#', get: null },
    { k: 'name', lab: 'Player', get: function (p) { return p.name.toLowerCase(); }, asc: true },
    { k: 'maps', lab: 'Maps', get: function (p) { return p.maps; } },
    { k: 'aim', lab: 'Raw aim', title: 'Raw aim: 1.00 = league average, 0.10 = one standard deviation (45% placement + 45% precision + 10% strafing)', get: function (p) { return p.rawAim; }, hi: true,
      cell: function (p) {
        var w = p.rawAim == null ? 0 : clamp((p.rawAim - 0.7) / 0.6, 0, 1) * 100;
        return '<span class="rbar"><b>' + fx(p.rawAim, 2) + '</b><i><s style="width:' + w.toFixed(1) + '%;background:' + (p.low ? '#475569' : p.rawAim >= 1.05 ? '#22c55e' : p.rawAim >= 0.95 ? '#f59e0b' : '#f43f5e') + '"></s></i></span>';
      } },
    { k: 'plc', lab: 'Placement', title: 'Crosshair placement, in steps (standard deviations) from the league average', get: function (p) { return p.aimParts && p.aimParts[0]; }, hi: true, cell: function (p) { return stepTxt(p.aimParts[0]); } },
    { k: 'prc', lab: 'Precision', title: 'Head, spray and spotted accuracy, in steps from the league average', get: function (p) { return p.aimParts && p.aimParts[1]; }, hi: true, cell: function (p) { return stepTxt(p.aimParts[1]); } },
    { k: 'str', lab: 'Strafing', title: 'Counter-strafing, in steps from the league average', get: function (p) { return p.aimParts && p.aimParts[2]; }, hi: true, cell: function (p) { return stepTxt(p.aimParts[2]); } },
    { k: 'dwe', lab: 'Duel +/- exp.', title: 'Duel win% minus the win% expected from each duel\u2019s situation', get: function (p) { return num(p.adv['Firepower|Duel win% over expected']); }, hi: true,
      cell: function (p) { var v = num(p.adv['Firepower|Duel win% over expected']); return v == null ? '–' : scv(v, signedPct(v, 1)); } },
    { k: 'open', lab: 'Open%', title: 'Opening duels won', get: function (p) { return p.open; }, hi: true, cell: function (p) { return pctS(p.open, 0); } },
    { k: 'trd', lab: 'Trade%', title: 'Trade chances converted into a trade kill', get: function (p) { return num(p.adv['Trading|Trade kill success%']); }, hi: true,
      cell: function (p) { return pctS(num(p.adv['Trading|Trade kill success%']), 0); } },
    { k: 'kpr', lab: 'KPR vs role', title: 'Kills per round minus what is typical for the positions he plays', get: function (p) { return p.kprRole; }, hi: true, cell: function (p) { return p.kprRole == null ? '–' : scv(p.kprRole, signed(p.kprRole, 2)); } }
  ];
  var advanced = false, gunView = false, gunSel = 'g:rifles';
  var GUN_COLS = [
    { k: 'rank', lab: '#', get: null },
    { k: 'name', lab: 'Player', get: function (p) { return p.name.toLowerCase(); }, asc: true },
    { k: 'gduels', lab: 'Duels', get: function (p) { var o = gunStat(p, gunSel); return o && o.duels; } },
    { k: 'gwl', lab: 'W-L', get: function (p) { var o = gunStat(p, gunSel); return o && (o.won - (o.duels - o.won)); } },
    { k: 'gwin', lab: 'Win%', get: function (p) { var o = gunStat(p, gunSel); return o && o.winPct; } },
    { k: 'gexp', lab: 'Expected', title: 'Win% the situations predicted (gun, HP, numbers, distance\u2026)', get: function (p) { var o = gunStat(p, gunSel); return o && o.expPct; } },
    { k: 'grat', lab: 'Gun rating', title: 'EOS rating adjusted by how his duels with this gun compare with his duels overall', get: function (p) { var o = gunStat(p, gunSel); return o && o.rating; } },
    { k: 'gkills', lab: 'Kills', get: function (p) { var o = gunStat(p, gunSel); return o && o.kills; } },
    { k: 'ghs', lab: 'HS%', get: function (p) { var o = gunStat(p, gunSel); return o && o.hsPct; } }
  ];
  var sortKey = 'rating', sortAsc = false, teamFilter = {}, roleFilter = {}, showLow = true;
  // Role filter: IGL = in the IGL list; AWPer = the team's AWPer; Rifler = everyone who isn't the AWPer.
  var ROLE_FILTERS = [['IGL', function (p) { return p.igl; }], ['AWPer', function (p) { return p.baseRole === 'AWPer'; }], ['Rifler', function (p) { return p.baseRole !== 'AWPer'; }]];
  function roleMatch(p) {
    var on = ROLE_FILTERS.filter(function (r) { return roleFilter[r[0]]; });
    return !on.length || on.some(function (r) { return r[1](p); });
  } // teamFilter: selected team names; empty = all

  function renderFilters() {
    $('filters').innerHTML = '<button class="fbtn all' + (Object.keys(teamFilter).length ? '' : ' on') + '" data-t="" aria-pressed="' + !Object.keys(teamFilter).length + '">All teams</button>' +
      teams.map(function (t) { return '<button class="fbtn' + (teamFilter[t.name] ? ' on' : '') + '" data-t="' + esc(t.name) + '" aria-pressed="' + !!teamFilter[t.name] + '">' + logo(t.name) + esc(t.name) + '</button>'; }).join('') +
      '<label class="toggle"><input type="checkbox" id="showlow"' + (showLow ? ' checked' : '') + '> Show players under ' + MIN + ' rounds</label>' +
      '<div class="frow"><button class="fbtn all' + (Object.keys(roleFilter).length ? '' : ' on') + '" data-r="" aria-pressed="' + !Object.keys(roleFilter).length + '">All roles</button>' +
      ROLE_FILTERS.map(function (r) { return '<button class="fbtn role' + (roleFilter[r[0]] ? ' on' : '') + '" data-r="' + r[0] + '" aria-pressed="' + !!roleFilter[r[0]] + '">' + r[0] + '</button>'; }).join('') +
      (HAS_GUNS ? (gunView ? '<select id="gunsel" class="gunsel" aria-label="Weapon">' +
        '<optgroup label="Groups">' + GUN_GROUPS.map(function (g) { return '<option value="' + g.k + '"' + (gunSel === g.k ? ' selected' : '') + '>' + esc(g.lab) + '</option>'; }).join('') + '</optgroup>' +
        '<optgroup label="Single guns">' + GUN_SINGLES.map(function (w) { return '<option value="' + esc(w) + '"' + (gunSel === w ? ' selected' : '') + '>' + esc(wname(w)) + '</option>'; }).join('') + '</optgroup></select>' : '') +
        '<button class="fbtn adv gunbtn' + (gunView ? ' on' : '') + '" id="gunbtn" aria-pressed="' + gunView + '" title="Rate every player with one gun">Weapons</button>' : '') +
      '<button class="fbtn adv' + (advanced ? ' on' : '') + '" id="advbtn" aria-pressed="' + advanced + '" title="Show raw aim and other advanced stats">Advanced</button></div>';
  }

  function renderTable() {
    var cols = gunView ? GUN_COLS : advanced ? ADV_COLS : COLS;
    var col = cols.filter(function (c) { return c.k === sortKey; })[0];
    if (!col) { sortKey = gunView ? 'grat' : advanced ? 'aim' : 'rating'; sortAsc = false; col = cols.filter(function (c) { return c.k === sortKey; })[0]; }
    var list = players.filter(function (p) { return (!Object.keys(teamFilter).length || teamFilter[p.team]) && roleMatch(p) && (showLow || !p.low) && (!gunView || gunStat(p, gunSel)); });
    list.sort(function (a, b) {
      if (gunView) {   // players with a real sample with this gun first
        var la = gunStat(a, gunSel).duels < GUN_MIN, lb = gunStat(b, gunSel).duels < GUN_MIN;
        if (la !== lb) return la ? 1 : -1;
      }
      var x = col.get(a), y = col.get(b);
      if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
      var r = x < y ? -1 : x > y ? 1 : 0;
      return sortAsc ? r : -r;
    });
    var maxR = Math.max.apply(null, players.map(function (p) { return p.rating || 0; }));
    var head = '<thead><tr>' + cols.map(function (c) {
      return '<th data-k="' + c.k + '"' + (c.title ? ' title="' + esc(c.title) + '"' : '') + (c.k === sortKey ? ' class="sorted"' : '') + '>' + esc(c.lab) + (c.k === sortKey ? (sortAsc ? ' ▲' : ' ▼') : '') + '</th>';
    }).join('') + '</tr></thead>';
    if (gunView) {
      var gtop = pool.map(function (p) { var o = gunStat(p, gunSel); return o && o.duels >= GUN_MIN ? o.rating : null; })
        .filter(function (v) { return v != null; }).sort(function (a, b) { return b - a; }).slice(0, 3);
      $('lb').innerHTML = head + '<tbody>' + list.map(function (p, i) {
        var o = gunStat(p, gunSel), low = p.low || o.duels < GUN_MIN, r = low ? -1 : gtop.indexOf(o.rating);
        var w = clamp((o.rating - 0.5) / 1.1, 0, 1) * 100;
        return '<tr data-k="' + esc(p.name + '|' + p.team) + '" class="' + (low ? 'low' : '') + (current === p ? ' sel' : '') + '">' +
          '<td class="dim">' + (i + 1) + '</td>' +
          '<td><span class="pl">' + logo(p.team) + '<b title="' + esc(p.team) + '">' + esc(p.name) + '</b></span></td>' +
          '<td>' + o.duels + '</td><td>' + o.won + '-' + (o.duels - o.won) + '</td><td>' + pctS(o.winPct, 0) + '</td><td class="dim">' + pctS(o.expPct, 0) + '</td>' +
          '<td' + (r >= 0 ? ' class="top' + (r + 1) + '"' : '') + '><span class="rbar"><b>' + o.rating.toFixed(2) + '</b><i><s style="width:' + w.toFixed(1) + '%;background:' + gunColor(o.rating, low) + '"></s></i></span></td>' +
          '<td>' + o.kills + '</td><td>' + (o.hsPct == null ? '–' : pctS(o.hsPct, 0)) + '</td></tr>';
      }).join('') + '</tbody>';
      $('lbnote').textContent = 'Gun rating for ' + gunLabel(gunSel) + ': the player\u2019s EOS rating, adjusted by how his duels with this gun (wins and losses vs the win chance each situation predicted) compare with his duels overall. Under ' + GUN_MIN + ' duels in grey and listed last.';
      return;
    }
    $('lbnote').textContent = '';
    if (advanced) {
      // best three (60+ rounds) in each column get a highlight, darkest = 1st
      var top = {};
      ADV_COLS.forEach(function (c) {
        if (!c.hi) return;
        top[c.k] = pool.map(c.get).filter(function (v) { return v != null; }).sort(function (a, b) { return b - a; }).slice(0, 3);
      });
      $('lb').innerHTML = head + '<tbody>' + list.map(function (p, i) {
        var k = p.name + '|' + p.team;
        return '<tr data-k="' + esc(k) + '" class="' + (p.low ? 'low' : '') + (current === p ? ' sel' : '') + '">' +
          '<td class="dim">' + (i + 1) + '</td>' +
          '<td><span class="pl">' + logo(p.team) + '<b title="' + esc(p.team) + '">' + esc(p.name) + '</b></span></td>' +
          '<td>' + p.maps + '</td>' +
          ADV_COLS.slice(3).map(function (c) {
            var v = c.get(p), t = top[c.k] || [], r = p.low || v == null ? -1 : t.indexOf(v);
            return '<td' + (r >= 0 ? ' class="top' + (r + 1) + '"' : '') + '>' + c.cell(p) + '</td>';
          }).join('') + '</tr>';
      }).join('') + '</tbody>';
      return;
    }
    var body = '<tbody>' + list.map(function (p, i) {
      var k = p.name + '|' + p.team;
      var w = p.rating == null ? 0 : clamp(p.rating / maxR, 0, 1) * 100;
      function sc(v, txt) { return '<span class="' + (v > 0 ? 'pos-v' : v < 0 ? 'neg-v' : '') + '">' + txt + '</span>'; }
      return '<tr data-k="' + esc(k) + '" class="' + (p.low ? 'low' : '') + (current === p ? ' sel' : '') + '">' +
        '<td class="dim">' + (i + 1) + '</td>' +
        '<td><span class="pl">' + logo(p.team) + '<b title="' + esc(p.team) + '">' + esc(p.name) + '</b></span></td>' +
        '<td>' + p.maps + '</td>' +
        '<td><span class="rbar"><b>' + fx(p.rating, 2) + '</b><i><s style="width:' + w.toFixed(1) + '%;background:' + (p.low ? '#475569' : ratingColor(p.rating)) + '"></s></i></span></td>' +
        '<td>' + sc(p.roundSwing, signedPct(p.roundSwing, 2)) + '</td>' +
        '<td>' + sc(p.duelSwing, signedPct(p.duelSwing, 0)) + '</td>' +
        '<td>' + p.k + '-' + p.d + ' ' + sc(p.pm, '(' + signed(p.pm, 0) + ')') + '</td>' +
        '<td>' + fx(p.adr, 1) + '</td></tr>';
    }).join('') + '</tbody>';
    $('lb').innerHTML = head + body;
  }

  // ---------- scatter ----------
  function renderScatter() {
    var W = 640, H = 430, L = 50, R = 16, T = 16, B = 44;
    var xs = players.map(function (p) { return p.duelSwing; }).filter(function (v) { return v != null; });
    var ys = players.map(function (p) { return p.roundSwing; }).filter(function (v) { return v != null; });
    // zoom to the data (always keeping 0 in view) instead of a symmetric range around 0
    function range(a) {
      var lo = Math.min(0, Math.min.apply(null, a)), hi = Math.max(0, Math.max.apply(null, a)), pad = (hi - lo) * 0.08;
      return [lo - pad, hi + pad];
    }
    var xr = range(xs), yr = range(ys), xa = (xr[1] - xr[0]) / 2, ya = (yr[1] - yr[0]) / 2;
    function X(v) { return L + (v - xr[0]) / (xr[1] - xr[0]) * (W - L - R); }
    function Y(v) { return T + (yr[1] - v) / (yr[1] - yr[0]) * (H - T - B); }
    var g = '<rect x="' + X(0) + '" y="' + T + '" width="' + (W - R - X(0)) + '" height="' + (Y(0) - T) + '" fill="rgba(56,189,248,.05)"/>' +
      '<rect x="' + L + '" y="' + Y(0) + '" width="' + (X(0) - L) + '" height="' + (H - B - Y(0)) + '" fill="rgba(244,63,94,.05)"/>' +
      '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="#334155"/>' +
      '<line x1="' + X(0) + '" x2="' + X(0) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="#334155"/>';
    var xStep = xa > 2.5 ? 1 : 0.5, yStep = ya > 0.06 ? 0.02 : 0.01;
    for (var v = Math.ceil(xr[0] / xStep) * xStep; v <= xr[1] + 1e-9; v += xStep) g += '<text x="' + X(v) + '" y="' + (H - B + 16) + '" text-anchor="middle" font-size="10" fill="#5d6c87">' + signedPct(v, 0) + '</text>';
    for (var u = Math.ceil(yr[0] / yStep) * yStep; u <= yr[1] + 1e-9; u += yStep) g += '<text x="' + (L - 6) + '" y="' + (Y(u) + 3) + '" text-anchor="end" font-size="10" fill="#5d6c87">' + signedPct(u, 0) + '</text>';
    g += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="11" fill="#38bdf8">Duel Swing per map → wins fights beyond expectation</text>' +
      '<text transform="translate(13 ' + ((T + H - B) / 2) + ') rotate(-90)" text-anchor="middle" font-size="11" fill="#cbd5e1">Round Swing per round → impact on winning rounds</text>' +
      quad(W - R - 6, T + 14, 'end', '#38bdf8', 'Difference makers', 'wins duels &amp; rounds') +
      quad(L + 6, T + 14, 'start', '#fbbf24', 'Glue players', 'loses duels, still wins rounds') +
      quad(W - R - 6, H - B - 20, 'end', '#a78bfa', 'Empty duels', 'wins fights, rounds don’t follow') +
      quad(L + 6, H - B - 20, 'start', '#f43f5e', 'Struggling', 'loses duels &amp; rounds');
    function quad(x, y, anchor, col, title, sub) {
      return '<text x="' + x + '" y="' + y + '" text-anchor="' + anchor + '" font-size="11" font-weight="700" fill="' + col + '" opacity=".85" pointer-events="none">' + title + '</text>' +
        '<text x="' + x + '" y="' + (y + 12) + '" text-anchor="' + anchor + '" font-size="9.5" fill="#8a9ab3" pointer-events="none">' + sub + '</text>';
    }
    var labelled = pool.slice().sort(function (a, b) { return b.rating - a.rating; }).slice(0, 6);
    var marks = '', labels = '';
    players.forEach(function (p) {
      if (p.duelSwing == null || p.roundSwing == null || p === current) return;
      var cx = X(p.duelSwing), cy = Y(p.roundSwing), r = 3 + Math.sqrt(p.rounds) / 3;
      var tip = '<b>' + esc(p.name) + '</b> · ' + esc(p.team) + '<br>EOS ' + fx(p.rating, 2) + ' · ' + p.rounds + ' rds<br>Round ' + signedPct(p.roundSwing, 2) + ' · Duel ' + signedPct(p.duelSwing, 0);
      marks += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + colorOf(p.team) + '" fill-opacity="' + (p.low ? 0.25 : 0.75) + '" stroke="#182839" stroke-width="1.5" data-k="' + esc(p.name + '|' + p.team) + '" data-tip="' + esc(tip) + '" style="cursor:pointer"/>';
      if (labelled.indexOf(p) >= 0) labels += '<text x="' + (cx + r + 3).toFixed(1) + '" y="' + (cy + 3.5).toFixed(1) + '" font-size="10.5" fill="#cbd5e1" pointer-events="none">' + esc(p.name) + '</text>';
    });
    if (current && current.duelSwing != null && current.roundSwing != null) {
      var cx = X(current.duelSwing), cy = Y(current.roundSwing);
      marks += '<circle cx="' + cx + '" cy="' + cy + '" r="11" fill="none" stroke="#fff" stroke-width="2"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="' + colorOf(current.team) + '" stroke="#182839" stroke-width="1.5"/>';
      labels += '<text x="' + (cx + 14) + '" y="' + (cy + 4) + '" font-size="12" font-weight="700" fill="#fff" pointer-events="none">' + esc(current.name) + '</text>';
    }
    $('scatter').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Round Swing versus Duel Swing scatter plot">' + g + marks + labels + '</svg>' +
      '<div class="legend">' + teams.map(function (t) { return '<span><i class="dot" style="background:' + colorOf(t.name) + '"></i>' + esc(t.name) + '</span>'; }).join('') + '</div>';
  }

  // ---------- team bars ----------
  function renderTeamBars() {
    var list = teams.slice().sort(function (a, b) { return b.rating - a.rating; });
    var W = 400, rowH = 40, H = list.length * rowH + 24, L = 120, R = 46;
    var lo = 0.7, hi = Math.max(1.3, Math.max.apply(null, list.map(function (t) { return t.rating || 0; })) + 0.05);
    function X(v) { return L + (v - lo) / (hi - lo) * (W - L - R); }
    var s = '<line x1="' + X(1) + '" x2="' + X(1) + '" y1="4" y2="' + (H - 18) + '" stroke="#64748b" stroke-dasharray="4 4"/>' +
      '<text x="' + X(1) + '" y="' + (H - 4) + '" text-anchor="middle" font-size="10" fill="#5d6c87">1.00</text>';
    list.forEach(function (t, i) {
      var y = 6 + i * rowH, v = t.rating || 1;
      var x0 = X(Math.min(1, v)), x1 = X(Math.max(1, v));
      s += '<image href="' + (D.logos[t.name] ? '/eos/logos/' + esc(D.logos[t.name]) + '.png' : placeholderSrc(t.name)) + '" x="0" y="' + (y + 4) + '" width="24" height="24"/>' +
        '<text x="30" y="' + (y + 21) + '" font-size="12" font-weight="600" fill="#e5ecf6">' + esc(t.name) + '</text>' +
        '<rect x="' + x0 + '" y="' + (y + 7) + '" width="' + Math.max(2, x1 - x0) + '" height="18" rx="3" fill="' + colorOf(t.name) + '" fill-opacity=".85"/>' +
        '<text x="' + (x1 + 6) + '" y="' + (y + 20) + '" font-size="12" font-weight="700" fill="#e5ecf6">' + fx(t.rating, 2) + '</text>';
    });
    $('teambars').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Average EOS rating by team">' + s + '</svg>' +
      '<p class="foot" style="text-align:center">Players’ EOS Ratings averaged, weighted by rounds played.</p>';
  }

  // ---------- standings (BO3 series) ----------
  var PLAYOFF_SPOTS = 4;
  var standingsPos = {};
  function renderStandings() {
    var st = {};
    teams.forEach(function (t) { st[t.name] = { name: t.name, mw: 0, ml: 0, w: 0, l: 0 }; });
    var bySeries = {};
    maps.forEach(function (m) { (bySeries[m.series] = bySeries[m.series] || []).push(m); });
    Object.keys(bySeries).forEach(function (k) {
      var ms = bySeries[k], A = ms[0].a, B = ms[0].b, wa = 0, wb = 0;
      ms.forEach(function (m) {
        var aS = m.a === A ? m.as : m.bs, bS = m.a === A ? m.bs : m.as;
        aS > bS ? wa++ : wb++;
      });
      [A, B].forEach(function (t) { if (!st[t]) st[t] = { name: t, mw: 0, ml: 0, w: 0, l: 0 }; });
      st[A].mw += wa; st[A].ml += wb; st[B].mw += wb; st[B].ml += wa;
      if (wa > wb) { st[A].w++; st[B].l++; } else if (wb > wa) { st[B].w++; st[A].l++; }
    });
    // Ranking: win-loss difference, then the rulebook tiebreakers (7.10.7 Tiebreakers in Round Robin).
    // Overtime maps count as 13:12 for the winner. Whenever a step splits the tied teams, each group
    // that is still tied is compared again from step 1.
    var games = Object.keys(bySeries).map(function (k) {
      var ms = bySeries[k], A = ms[0].a, B = ms[0].b;
      return { A: A, B: B, maps: ms.map(function (m) {
        var x = m.a === A ? m.as : m.bs, y = m.a === A ? m.bs : m.as;
        if (Math.max(x, y) > 13) { x = x > y ? 13 : 12; y = 13 + 12 - x; }   // overtime -> 13:12
        return [x, y];
      }) };
    });
    function tally(t, among) {
      var o = { pts: 0, md: 0, mw: 0, rd: 0, rw: 0 };
      games.forEach(function (g) {
        var me = g.A === t ? 0 : g.B === t ? 1 : -1; if (me < 0) return;
        var opp = me === 0 ? g.B : g.A; if (among && among.indexOf(opp) < 0) return;
        var mw = 0, ml = 0;
        g.maps.forEach(function (sc) { var f = sc[me], a2 = sc[1 - me]; f > a2 ? mw++ : ml++; o.rw += f; o.rd += f - a2; });
        o.mw += mw; o.md += mw - ml; if (mw > ml) o.pts++;
      });
      return o;
    }
    var TB = [
      ['head-to-head result', function (t, g) { return tally(t, g).pts; }],
      ['head-to-head map difference', function (t, g) { return tally(t, g).md; }],
      ['head-to-head maps won', function (t, g) { return tally(t, g).mw; }],
      ['overall map difference', function (t) { return tally(t).md; }],
      ['overall maps won', function (t) { return tally(t).mw; }],
      ['head-to-head round difference', function (t, g) { return tally(t, g).rd; }],
      ['head-to-head rounds won', function (t, g) { return tally(t, g).rw; }],
      ['overall round difference', function (t) { return tally(t).rd; }],
      ['overall rounds won', function (t) { return tally(t).rw; }]
    ];
    var tbNote = {};
    function breakTie(group) {
      if (group.length < 2) return group;
      for (var i = 0; i < TB.length; i++) {
        var val = {}; group.forEach(function (t) { val[t] = TB[i][1](t, group); });
        var levels = group.map(function (t) { return val[t]; }).filter(function (v, j, arr) { return arr.indexOf(v) === j; }).sort(function (x, y) { return y - x; });
        if (levels.length < 2) continue;
        var others = group.length === 2 ? null : group.length + ' teams';
        group.forEach(function (t) {
          var rest = group.filter(function (u) { return u !== t; });
          tbNote[t] = 'Tied on wins with ' + (others ? rest.join(', ') : rest[0]) + ' – decided by ' + TB[i][0];
        });
        return [].concat.apply([], levels.map(function (v) { return breakTie(group.filter(function (t) { return val[t] === v; })); }));
      }
      group.forEach(function (t) { tbNote[t] = 'Still tied after all tiebreakers – decided by overtime'; });
      return group.slice().sort(function (x, y) { return x.localeCompare(y); });
    }
    var byDiff = {};
    Object.keys(st).forEach(function (k) { var d = st[k].w - st[k].l; (byDiff[d] = byDiff[d] || []).push(k); });
    var list = [].concat.apply([], Object.keys(byDiff).map(Number).sort(function (x, y) { return y - x; }).map(function (d) {
      return breakTie(byDiff[d].sort(function (x, y) { return x.localeCompare(y); }));
    })).map(function (k) { return st[k]; });
    list.forEach(function (t, i) { standingsPos[t.name] = { pos: i + 1, w: t.w, l: t.l }; });
    $('standings').innerHTML = '<thead><tr><th>#</th><th>Team</th><th>Matches</th><th>Won</th><th>Lost</th><th title="Maps won–lost">Maps</th></tr></thead><tbody>' +
      list.map(function (t, i) {
        return '<tr data-team="' + esc(t.name) + '" title="' + esc(tbNote[t.name] ? tbNote[t.name] + '. Click for team details' : 'Team details') + '"' + (i === PLAYOFF_SPOTS - 1 && list.length > PLAYOFF_SPOTS ? ' class="cut"' : '') + '><td class="dim">' + (i + 1) + '</td>' +
          '<td><span class="pl">' + logo(t.name) + '<b>' + esc(t.name) + '</b>' + (tbNote[t.name] ? '<span class="tb" aria-label="' + esc(tbNote[t.name]) + '">TB</span>' : '') + '</span></td>' +
          '<td>' + (t.w + t.l) + '</td><td class="pos-v">' + t.w + '</td><td class="neg-v">' + t.l + '</td>' +
          '<td class="dim">' + t.mw + '–' + t.ml + '</td></tr>';
      }).join('') + '</tbody>';
  }

  // ---------- teams + results ----------
  // Map banners live in /eos/maps/<name>.webp; the colour shows if an image is missing.
  var MAP_COLORS = { ancient: '#2f5d3a', anubis: '#a0782f', cache: '#4b6b7a', dust2: '#b08850', inferno: '#8a3b2a', mirage: '#b7894b', nuke: '#3c6f8f', overpass: '#55734a', train: '#5a5f6b', vertigo: '#4a6fa0' };
  function mapBg(name) {
    var k = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^de/, '');
    var c = MAP_COLORS[k] || '#334155';
    return 'background-color:' + c + ';background-image:linear-gradient(180deg,rgba(15,23,42,.5),rgba(15,23,42,.78))' +
      (MAP_COLORS[k] ? ',url(/eos/maps/' + k + '.webp)' : '');
  }

  // ---------- per-map player rows (for scoreboards) ----------
  var mapPlayers = {};
  rows(D.perMap).forEach(function (r) { (mapPlayers[r.Match] = mapPlayers[r.Match] || []).push(r); });
  Object.keys(extraBox).forEach(function (id) { mapPlayers[id] = extraBox[id]; });
  var seriesById = {};

  function wbr(name) { return esc(name).replace(/\./g, '.<wbr>'); }

  function renderResults() {
    var series = [], byS = {};
    maps.forEach(function (m) {
      if (!byS[m.series]) { byS[m.series] = { id: m.series, maps: [], date: m.date }; series.push(byS[m.series]); }
      byS[m.series].maps.push(m);
    });
    series.reverse();
    $('results').innerHTML = series.map(function (s) {
      var A = s.maps[0].a, B = s.maps[0].b, wa = 0, wb = 0;
      s.maps.forEach(function (m) {
        var aS = m.a === A ? m.as : m.bs, bS = m.a === A ? m.bs : m.as;
        aS > bS ? wa++ : wb++;
      });
      s.A = A; s.B = B; s.wa = wa; s.wb = wb; seriesById[s.id] = s;
      return '<div class="panel series" role="button" tabindex="0" data-series="' + esc(s.id) + '" title="Open scoreboard"><div class="sdate">' + esc(s.date) + (s.maps[0].noDemo ? ' · <span class="nd" title="No demo: box score only, not in player stats">no demo</span>' : '') + '</div><div class="shead">' +
        '<span class="steam r ' + (wa > wb ? 'win' : 'loss') + '"><span>' + wbr(A) + '</span>' + logo(A) + '</span>' +
        '<span class="sscore">' + wa + ' : ' + wb + '</span>' +
        '<span class="steam ' + (wb > wa ? 'win' : 'loss') + '">' + logo(B) + '<span>' + wbr(B) + '</span></span></div>' +
        '<div class="maps">' + s.maps.map(function (m) {
          var aS = m.a === A ? m.as : m.bs, bS = m.a === A ? m.bs : m.as;
          return '<span class="mapc" data-map="' + esc(m.id) + '" style="' + mapBg(m.map) + '" title=""' + esc(m.map + ': ' + A + ' ' + aS + '–' + bS + ' ' + B + ' — open scoreboard') + '"><span class="mn">' + esc(m.map) + '</span>' +
            '<span class="ms"><span class="' + (aS > bS ? 'w' : 'l') + '">' + aS + '</span>–<span class="' + (bS > aS ? 'w' : 'l') + '">' + bS + '</span></span></span>';
        }).join('') + '</div></div>';
    }).join('');
  }

  // ---------- scoreboard modal ----------
  var sbSeries = null, sbTab = 'all';
  function aggregate(list) {
    var by = {};
    list.forEach(function (r) {
      var k = r.Player + '|' + r.Team, o = by[k];
      if (!o) o = by[k] = { Player: r.Player, Team: r.Team, K: 0, D: 0, adr: [0, 0], kast: [0, 0], eos: [0, 0] };
      var rd = r.Rounds || 0;
      o.K += r.K || 0; o.D += r.D || 0;
      [['adr', num(r.ADR)], ['kast', num(r.KAST)], ['eos', num(r['EOS Rating'])]].forEach(function (f) {
        if (f[1] != null) { o[f[0]][0] += f[1] * rd; o[f[0]][1] += rd; }
        else if (f[0] === 'adr' && r.Rounds) o.adr.miss = true;   // a map's ADR unknown -> series ADR unknown
      });
    });
    function avg(a) { return a[1] ? a[0] / a[1] : null; }
    return Object.keys(by).map(function (k) {
      var o = by[k];
      return { Player: o.Player, Team: o.Team, K: o.K, D: o.D, ADR: o.adr.miss ? null : avg(o.adr), KAST: avg(o.kast), EOS: avg(o.eos) };
    });
  }
  function teamTable(team, score, list, won) {
    list = list.filter(function (r) { return r.Team === team; }).sort(function (a, b) { return ((b.EOS || 0) - (a.EOS || 0)) || ((b.K - b.D) - (a.K - a.D)); });
    return '<div class="sbt"><div class="sbt-head ' + (won ? 'win' : 'loss') + '">' + logo(team) + '<span class="sbt-name">' + esc(team) + '</span><span class="sbt-score">' + score + '</span></div>' +
      '<table class="sb"><thead><tr><th>Player</th><th>K</th><th>D</th><th>+/-</th><th>ADR</th><th>KAST</th><th>EOS</th></tr></thead><tbody>' +
      list.map(function (r) {
        var pm = r.K - r.D;
        return '<tr data-k="' + esc(r.Player + '|' + r.Team) + '" title="Open player card"><td>' + esc(r.Player) + '</td><td>' + r.K + '</td><td>' + r.D + '</td>' +
          '<td class="' + (pm > 0 ? 'pos-v' : pm < 0 ? 'neg-v' : '') + '">' + signed(pm, 0) + '</td><td>' + fx(r.ADR, 1) + '</td><td>' + pctS(r.KAST, 0) + '</td>' +
          '<td><b style="color:' + ratingColor(r.EOS) + '">' + fx(r.EOS, 2) + '</b></td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function renderScoreboard() {
    var s = sbSeries; if (!s) return;
    var A = s.A, B = s.B, list, sa, sb, title;
    if (sbTab === 'all') {
      list = aggregate([].concat.apply([], s.maps.map(function (m) { return mapPlayers[m.id] || []; })));
      sa = s.wa; sb = s.wb; title = 'Series · ' + s.maps.length + ' map' + (s.maps.length > 1 ? 's' : '');
    } else {
      var m = s.maps.filter(function (x) { return x.id === sbTab; })[0];
      list = aggregate(mapPlayers[m.id] || []);
      sa = m.a === A ? m.as : m.bs; sb = m.a === A ? m.bs : m.as; title = m.map + ' · ' + m.rounds + ' rounds';
    }
    var tabs = '<button type="button" data-sbtab="all" class="' + (sbTab === 'all' ? 'on' : '') + '">Series</button>' + s.maps.map(function (m) {
      var aS = m.a === A ? m.as : m.bs, bS = m.a === A ? m.bs : m.as;
      return '<button type="button" data-sbtab="' + esc(m.id) + '" class="maptab' + (sbTab === m.id ? ' on' : '') + '" style="' + mapBg(m.map) + '"><span class="mn">' + esc(m.map) + '</span><span class="ms">' + aS + '–' + bS + '</span></button>';
    }).join('');
    $('sb-body').innerHTML =
      '<div class="sb-top"><span class="sdate">' + esc(s.date) + '</span><button type="button" class="sb-close" aria-label="Close">✕</button></div>' +
      '<div class="shead sb-head"><span class="steam r ' + (s.wa > s.wb ? 'win' : 'loss') + '"><span>' + esc(A) + '</span>' + logo(A) + '</span><span class="sscore">' + s.wa + ' : ' + s.wb + '</span>' +
      '<span class="steam ' + (s.wb > s.wa ? 'win' : 'loss') + '">' + logo(B) + '<span>' + esc(B) + '</span></span></div>' +
      '<div class="sb-tabs">' + tabs + '</div><div class="sc-title">' + esc(title) + '</div>' +
      teamTable(A, sa, list, sa > sb) + teamTable(B, sb, list, sb > sa) +
      (s.maps[0].noDemo ? '<div class="foot nodemo">' + esc(s.maps[0].note || 'No demo for this match.') + (sbTab !== 'all' ? ' ' + esc((s.maps.filter(function (x) { return x.id === sbTab; })[0] || {}).boxNote || '') : '') + ' Not included in player season stats.</div>'
        : sbTab === 'all' ? '<div class="foot">Series ADR, KAST and EOS Rating are averages weighted by rounds played.</div>' : '');
  }
  function openScoreboard(id, mapId) {
    sbSeries = seriesById[id]; if (!sbSeries) return;
    sbTab = mapId || 'all';
    renderScoreboard();
    $('sb').hidden = false; document.body.classList.add('noscroll');
    var c = document.querySelector('#sb .sb-close'); if (c) c.focus({ preventScroll: true });
  }
  function closeScoreboard() { $('sb').hidden = true; document.body.classList.remove('noscroll'); sbSeries = null; }

  // ---------- team modal ----------
  function sumOf(list, f) { return list.reduce(function (s, p) { var v = f(p); return s + (v == null || isNaN(v) ? 0 : v); }, 0); }
  function teamStats(t) {
    var ps = players.filter(function (p) { return p.team === t.name; });
    var ma = (D.manAdv || {})[t.name] || {};
    var tr = (D.teamRounds || {})[t.name] || {};
    var A = function (p, k) { return num(p.adv[k]); };
    var teamRounds = maps.reduce(function (s, m) { return s + (m.a === t.name || m.b === t.name ? m.rounds || 0 : 0); }, 0) || 1;
    var pr = sumOf(ps, function (p) { return p.rounds; }) || 1;
    var K = sumOf(ps, function (p) { return p.k; }), Dd = sumOf(ps, function (p) { return p.d; });
    var tk = sumOf(ps, function (p) { return A(p, 'Trading|Trade kills'); }), to = sumOf(ps, function (p) { return A(p, 'Trading|Trade opportunities'); });
    var tdd = sumOf(ps, function (p) { return (A(p, 'Trading|Tradeable death%') || 0) * p.d; });
    var tdt = sumOf(ps, function (p) { return (A(p, 'Trading|Tradeable death%') || 0) * p.d * (A(p, 'Trading|Traded death success%') || 0); });
    var oa = sumOf(ps, function (p) { return A(p, 'Opening|Attempts'); }), ow = sumOf(ps, function (p) { return A(p, 'Opening|Wins'); });
    var ca = sumOf(ps, function (p) { return A(p, 'Closing|Clutches'); }), cw = sumOf(ps, function (p) { return A(p, 'Closing|Clutch wins'); });
    var w = function (f) { return sumOf(ps, function (p) { var v = f(p); return v == null ? 0 : v * p.rounds; }) / pr; };
    return {
      trade: to ? tk / to : null, traded: tdd ? tdt / tdd : null, open: oa ? ow / oa : null, openAtt: oa, openW: ow,
      clutch: ca ? cw / ca : null, clutchA: ca, clutchW: cw, kd: Dd ? K / Dd : null,
      adr: w(function (p) { return p.adr; }), kast: w(function (p) { return p.kast; }), hs: w(function (p) { return p.hs; }),
      util: sumOf(ps, function (p) { var v = A(p, 'Utility (per round)|Utility dmg'); return v == null ? 0 : v * p.rounds; }) / teamRounds,
      flash: sumOf(ps, function (p) { return A(p, 'Utility (per round)|Flash assists'); }) / teamRounds, // column is a count
      awp: K ? sumOf(ps, function (p) { return (A(p, 'Sniping|AWP kills%') || 0) * p.k; }) / K : null,
      // round results (Rounds sheet): falls back to 'next kill' if an older sheet has no round winners
      pistol: tr.pistol ? tr.pistolWon / tr.pistol : null, pistolW: tr.pistolWon, pistolN: tr.pistol,
      ct: tr.ct ? tr.ctWon / tr.ct : null, ctW: tr.ctWon, ctN: tr.ct,
      t: tr.tr ? tr.tWon / tr.tr : null, tW: tr.tWon, tN: tr.tr,
      rwin: tr.rounds ? tr.won / tr.rounds : null, rW: tr.won, rN: tr.rounds,
      adv: tr.adv ? tr.advWon / tr.adv : ma.adv ? ma.advNext / ma.adv : null, advN: tr.adv ? tr.advWon : ma.advNext, advR: tr.adv || ma.adv,
      dis: tr.dis ? tr.disWon / tr.dis : ma.dis ? ma.disNext / ma.dis : null, disN: tr.dis ? tr.disWon : ma.disNext, disR: tr.dis || ma.dis
    };
  }
  var HAS_ROUNDS = D.teamRounds && Object.keys(D.teamRounds).length > 0;
  function frac(v, a, b) { return pctS(v, 0) + ' <small>(' + a + '/' + b + ')</small>'; }
  var TEAM_STATS = [
    ['Pistol rounds', 'pistol', function (v, s) { return frac(v, s.pistolW, s.pistolN); }, 'Pistol rounds (round 1 and 13) won'],
    ['CT rounds', 'ct', function (v, s) { return frac(v, s.ctW, s.ctN); }, 'Rounds won on the CT side'],
    ['T rounds', 't', function (v, s) { return frac(v, s.tW, s.tN); }, 'Rounds won on the T side'],
    ['All rounds', 'rwin', function (v, s) { return frac(v, s.rW, s.rN); }, 'All rounds won (matches with demos)'],
    ['Opening kills', 'open', function (v, s) { return frac(v, s.openW, s.openAtt); }, 'Share of rounds where the team got the first kill'],
    [HAS_ROUNDS ? '5v4 conversion' : '5v4: next kill', 'adv', function (v, s) { return frac(v, s.advN, s.advR); },
      HAS_ROUNDS ? 'After getting the opening kill (5v4), how often the team won the round' : 'After getting the opening kill (5v4), how often the team also got the next kill'],
    [HAS_ROUNDS ? '4v5 conversion' : '4v5: next kill', 'dis', function (v, s) { return frac(v, s.disN, s.disR); },
      HAS_ROUNDS ? 'After losing the opening duel (4v5), how often the team still won the round' : 'After losing the opening duel (4v5), how often the team got the next kill back'],
    ['Clutches won', 'clutch', function (v, s) { return frac(v, s.clutchW, s.clutchA); }],
    ['Trade kill success', 'trade', function (v) { return pctS(v, 0); }, 'Share of trade chances (teammate killed nearby) that were converted into a trade kill'],
    ['Deaths traded', 'traded', function (v) { return pctS(v, 0); }, 'Share of tradeable deaths that a teammate traded'],
    ['Utility dmg / round', 'util', function (v) { return fx(v, 1); }, 'Team total per round'],
    ['Flash assists / round', 'flash', function (v) { return fx(v, 2); }, 'Team total per round']
  ].filter(function (d) { return HAS_ROUNDS || ['pistol', 'ct', 't', 'rwin'].indexOf(d[1]) < 0; });
  function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function openTeam(name) {
    var t = teams.filter(function (x) { return x.name === name; })[0]; if (!t) return;
    var all = teams.map(function (x) { return { name: x.name, s: teamStats(x) }; });
    var me = all.filter(function (x) { return x.name === name; })[0].s;
    var st = standingsPos[name] || {};
    // map records
    var mr = {};
    maps.forEach(function (m) {
      if (m.a !== name && m.b !== name) return;
      var us = m.a === name ? m.as : m.bs, them = m.a === name ? m.bs : m.as;
      var r = mr[m.map] = mr[m.map] || { map: m.map, w: 0, l: 0, rw: 0, rl: 0 };
      us > them ? r.w++ : r.l++; r.rw += us; r.rl += them;
    });
    var mapList = Object.keys(mr).map(function (k) { return mr[k]; }).sort(function (a, b) { return (b.w + b.l) - (a.w + a.l) || (b.w - b.l) - (a.w - a.l); });
    var series = Object.keys(seriesById).map(function (k) { return seriesById[k]; }).filter(function (s) { return s.A === name || s.B === name; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var html =
      '<div class="sb-top"><span class="sdate">' + (st.pos ? ordinal(st.pos) + ' in standings' + (st.pos <= PLAYOFF_SPOTS ? ' · playoff spot' : '') : '') + '</span><button type="button" class="sb-close" aria-label="Close">✕</button></div>' +
      '<div class="tm-head">' + logo(name) + '<div><div class="tm-name">' + esc(name) + '</div>' +
        '<div class="tm-sum"><span><b>' + (st.w || 0) + '–' + (st.l || 0) + '</b> matches</span><span><b>' + t.w + '–' + t.l + '</b> maps</span>' +
        '<span><b class="' + (t.rw - t.rl >= 0 ? 'pos-v' : 'neg-v') + '">' + signed(t.rw - t.rl, 0) + '</b> rounds</span></div></div></div>' +
      '<div class="sc-title">Map records</div><div class="tm-maps">' + (mapList.length ? mapList.map(function (r) {
        var n = r.w + r.l;
        return '<div class="tm-map" style="' + mapBg(r.map) + '"><span class="mn">' + esc(r.map) + '</span><span class="tm-wl"><span class="w">' + r.w + 'W</span> <span class="l">' + r.l + 'L</span></span>' +
          '<span class="tm-sub">' + Math.round(r.w / n * 100) + '% · ' + signed(r.rw - r.rl, 0) + ' rds</span></div>';
      }).join('') : '<p class="muted">No maps played yet.</p>') + '</div>' +
      '<div class="sc-title">Team stats <span class="dim">· rank among ' + all.length + ' teams</span></div><div class="tm-stats">' + TEAM_STATS.map(function (d) {
        var v = me[d[1]];
        var rank = v == null ? null : 1 + all.filter(function (x) { return x.s[d[1]] != null && x.s[d[1]] > v; }).length;
        var col = rank == null || d[4] ? '' : rank <= 2 ? 'top' : rank >= all.length - 1 ? 'bot' : '';
        return '<div class="tm-stat"' + (d[3] ? ' title="' + esc(d[3]) + '"' : '') + '><span class="lab">' + esc(d[0]) + '</span><b>' + (v == null ? '–' : d[2](v, me)) + '</b>' +
          (rank ? '<span class="rk ' + col + '">' + ordinal(rank) + '</span>' : '') + '</div>';
      }).join('') + '</div>' +
      '<div class="sc-title">Roster</div><table class="sb"><thead><tr><th>Player</th><th>Maps</th><th>K-D</th><th>ADR</th><th>EOS</th></tr></thead><tbody>' +
        t.players.map(function (p) {
          return '<tr data-k="' + esc(p.name + '|' + p.team) + '" title="Open player card"' + (p.low ? ' class="low"' : '') + '><td>' + esc(p.name) + '</td><td>' + p.maps + '</td><td>' + p.k + '-' + p.d + '</td><td>' + fx(p.adr, 1) + '</td>' +
            '<td><b style="color:' + ratingColor(p.rating) + '">' + fx(p.rating, 2) + '</b></td></tr>';
        }).join('') + '</tbody></table>' +
      '<div class="sc-title" style="margin-top:14px">Matches</div><div class="tm-series">' + series.map(function (s) {
        var opp = s.A === name ? s.B : s.A, us = s.A === name ? s.wa : s.wb, them = s.A === name ? s.wb : s.wa;
        return '<button type="button" class="tm-match" data-open-series="' + esc(s.id) + '"><span class="dim">' + esc(s.date) + '</span><span class="tm-res ' + (us > them ? 'w' : 'l') + '">' + (us > them ? 'W' : 'L') + ' ' + us + '–' + them + '</span>' +
          '<span class="tm-opp">vs ' + logo(opp) + esc(opp) + '</span><span class="dim">' + s.maps.map(function (m) { return esc(m.map); }).join(', ') + '</span></button>';
      }).join('') + '</div>' +
      '<div class="foot">Team stats combine the players\u2019 numbers from the spreadsheet. Ranks: 1st = best in the league.</div>';
    $('tm-body').innerHTML = html;
    $('tm').hidden = false; document.body.classList.add('noscroll');
    var c = document.querySelector('#tm .sb-close'); if (c) c.focus({ preventScroll: true });
  }
  function closeTeam() { $('tm').hidden = true; if ($('sb').hidden) document.body.classList.remove('noscroll'); }

  // ---------- upcoming matches (eos/schedule.js, Finnish time) ----------
  function finnishDate(date, time) {
    // EET = UTC+2 in winter, EEST = UTC+3 from the last Sunday of March to the last Sunday of October.
    var y = +date.slice(0, 4), mo = +date.slice(5, 7);
    function lastSun(m) { var d = new Date(Date.UTC(y, m, 0)); return d.getUTCDate() - d.getUTCDay(); }
    var day = +date.slice(8, 10);
    var summer = (mo > 3 && mo < 10) || (mo === 3 && day >= lastSun(3)) || (mo === 10 && day < lastSun(10));
    return new Date(date + 'T' + time + ':00' + (summer ? '+03:00' : '+02:00'));
  }
  function renderUpcoming() {
    var list = window.EOS_SCHEDULE || [], now = new Date();
    var played = Object.keys(seriesById).map(function (k) { return seriesById[k]; });
    var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var up = list.filter(function (m) {
      if (m.stage === 'Playoffs') return false;
      var start = finnishDate(m.date, m.time);
      if (now - start > 24 * 3600 * 1000) return false;
      if (m.a && m.b && played.some(function (s) { return s.date >= m.date && ((s.A === m.a && s.B === m.b) || (s.A === m.b && s.B === m.a)); })) return false;
      return true;
    });
    var bracket = renderBracket(list.filter(function (m) { return m.stage === 'Playoffs'; }));
    if (!up.length) { $('upcoming').innerHTML = (bracket || '<p class="muted">No upcoming matches scheduled.</p>'); return; }
    function rec(t) { var r = standingsPos[t]; return r ? r.w + '–' + r.l : ''; }
    function teamRow(t) {
      if (!t) return '<div class="up-tbd">TBD</div>';
      return '<div class="up-team">' + logo(t) + '<span class="n">' + esc(t) + '</span><span class="rec">' + rec(t) + '</span></div>';
    }
    var html = '', stage = null;
    up.forEach(function (m) {
      if (m.stage !== stage) { html += (stage ? '</div>' : '') + '<div class="up-stage">' + esc(m.stage) + '</div><div class="up-grid">'; stage = m.stage; }
      var start = finnishDate(m.date, m.time), diff = start - now;
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var md = new Date(+m.date.slice(0, 4), +m.date.slice(5, 7) - 1, +m.date.slice(8, 10));
      var days = Math.round((md - today) / 86400000);
      var rel = diff <= 0 ? '<a class="rel live" href="https://www.twitch.tv/elisaviihdesport" target="_blank" rel="noopener" onclick="var l=document.getElementById(\'live\');if(l&&!l.hidden){l.scrollIntoView({behavior:\'smooth\'});return false}">Live</a>'
        : days === 0 ? '<span class="rel">Today</span>' : days === 1 ? '<span class="rel">Tomorrow</span>' : '';
      var d = new Date(Date.UTC(+m.date.slice(0, 4), +m.date.slice(5, 7) - 1, +m.date.slice(8, 10)));
      var idx = (window.EOS_SCHEDULE || []).indexOf(m);
      html += '<div class="panel up' + (m.a && m.b ? ' clickable" data-preview="' + idx + '" role="button" tabindex="0" title="Match preview' : '') + '"><div class="up-when"><div class="d">' + DOW[d.getUTCDay()] + '</div><div class="dd">' + d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '.</div><div class="t">' + esc(m.time) + '</div>' + rel + '</div>' +
        (m.label ? '<div class="up-label">' + esc(m.label) + (m.bo ? ' <span class="dim">(BO' + m.bo + ')</span>' : '') + '</div>' + (m.a || m.b ? teamRow(m.a) + teamRow(m.b) : '<div class="up-tbd">Teams TBD</div>')
          : teamRow(m.a) + teamRow(m.b)) + '</div>';
    });
    $('upcoming').innerHTML = html + '</div>' + bracket;
  }

  // ---------- playoff bracket ----------
  // Double elimination for the top 4. Boxes are matched to schedule.js entries by label.
  var BRACKET = [
    { key: 'ubsf1', label: 'Upper Bracket Semi-final #1', x: 0, y: 24, hint: ['TBD', 'TBD'] },
    { key: 'ubsf2', label: 'Upper Bracket Semi-final #2', x: 0, y: 132, hint: ['TBD', 'TBD'] },
    { key: 'ubf', label: 'Upper Bracket Final', x: 280, y: 78, hint: ['Winner UB SF #1', 'Winner UB SF #2'] },
    { key: 'lbf', label: 'Lower Bracket Final', x: 0, y: 284, hint: ['Loser UB SF #1', 'Loser UB SF #2'] },
    { key: 'cons', label: 'Consolidation Final', x: 280, y: 284, hint: ['Loser UB Final', 'Winner LB Final'] },
    { key: 'gf', label: 'Grand Final', x: 560, y: 181, hint: ['Winner UB Final', 'Winner Consolidation'] }
  ];
  var BW = 230, TITLE = 18, ROW = 30, BH = TITLE + ROW * 2;
  function seriesResult(a, b, date) {
    var s = Object.keys(seriesById).map(function (k) { return seriesById[k]; }).filter(function (s) {
      return s.date >= date && ((s.A === a && s.B === b) || (s.A === b && s.B === a));
    })[0];
    if (!s) return null;
    return s.A === a ? [s.wa, s.wb] : [s.wb, s.wa];
  }
  function renderBracket(entries) {
    if (!entries.length) return '';
    var byLabel = {}; entries.forEach(function (m) { byLabel[String(m.label).toLowerCase()] = m; });
    var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var boxes = BRACKET.map(function (b) {
      var m = byLabel[b.label.toLowerCase()] || {};
      var sc = m.a && m.b ? (seriesResult(m.a, m.b, m.date || '') || (m.sa != null && m.sb != null ? [m.sa, m.sb] : null)) : null;
      var when = '';
      if (m.date) { var d = new Date(Date.UTC(+m.date.slice(0, 4), +m.date.slice(5, 7) - 1, +m.date.slice(8, 10))); when = DOW[d.getUTCDay()] + ' ' + d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '. ' + esc(m.time || ''); }
      function row(t, i) {
        var score = sc ? sc[i] : '', win = sc && sc[i] > sc[1 - i], lose = sc && sc[i] < sc[1 - i];
        return '<div class="br-row' + (win ? ' win' : '') + (lose ? ' lose' : '') + '"' + (t && !(m.a && m.b) && D.logos && t in D.logos ? ' data-team="' + esc(t) + '"' : '') + '>' +
          (t ? logo(t) + '<span class="n">' + esc(t) + '</span>' : '<span class="br-ph"></span><span class="n hint">' + esc(b.hint[i]) + '</span>') +
          '<span class="s">' + score + '</span></div>';
      }
      var pv = m.a && m.b ? ' data-preview="' + (window.EOS_SCHEDULE || []).indexOf(m) + '" title="Match preview"' : '';
      return '<div class="br-box' + (pv ? ' clickable' : '') + '"' + pv + ' style="left:' + b.x + 'px;top:' + b.y + 'px;width:' + BW + 'px">' +
        '<div class="br-title"><span>' + esc(b.label.replace('Semi-final', 'SF')) + (m.bo ? ' · BO' + m.bo : '') + '</span><span class="br-when">' + when + '</span></div>' +
        '<div class="br-match">' + row(m.a, 0) + row(m.b, 1) + '</div></div>';
    });
    function c(key) { var b = BRACKET.filter(function (x) { return x.key === key; })[0]; return { l: b.x, r: b.x + BW, y: b.y + TITLE + ROW }; }
    function elbow(from, to) {
      var a = c(from), b = c(to), mx = a.r + (b.l - a.r) / 2;
      return '<path d="M' + a.r + ' ' + a.y + 'H' + mx + 'V' + b.y + 'H' + b.l + '"/>';
    }
    var W = 560 + BW, H = 284 + BH + 4;
    var lines = '<svg class="br-lines" width="' + W + '" height="' + H + '" aria-hidden="true">' +
      elbow('ubsf1', 'ubf') + elbow('ubsf2', 'ubf') + elbow('lbf', 'cons') + elbow('ubf', 'gf') + elbow('cons', 'gf') + '</svg>';
    return '<div class="up-stage">Playoffs</div><div class="panel br-wrap"><div class="br" style="width:' + W + 'px;height:' + H + 'px">' +
      '<span class="br-lab" style="top:0">Upper bracket</span><span class="br-lab" style="top:258px">Lower bracket</span>' + lines + boxes.join('') + '</div></div>';
  }

  // ---------- match preview (upcoming match) ----------
  function teamMapRecords(name) {
    var mr = {};
    maps.forEach(function (m) {
      if (m.a !== name && m.b !== name) return;
      var us = m.a === name ? m.as : m.bs, them = m.a === name ? m.bs : m.as;
      var r = mr[m.map] = mr[m.map] || { w: 0, l: 0, rd: 0 };
      us > them ? r.w++ : r.l++; r.rd += us - them;
    });
    return mr;
  }
  function teamSeries(name) {
    return Object.keys(seriesById).map(function (k) { return seriesById[k]; })
      .filter(function (s) { return s.A === name || s.B === name; })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  }
  function openPreview(idx) {
    var m = (window.EOS_SCHEDULE || [])[idx]; if (!m || !m.a || !m.b) return;
    var A = m.a, B = m.b, ta = standingsPos[A] || {}, tb = standingsPos[B] || {};
    var DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var d = new Date(Date.UTC(+m.date.slice(0, 4), +m.date.slice(5, 7) - 1, +m.date.slice(8, 10)));
    function side(t, st) {
      return '<div class="mp-team" data-team="' + esc(t) + '" title="Team details">' + logo(t) + '<div><div class="mp-name">' + esc(t) + '</div>' +
        '<div class="mp-rec">' + (st.pos ? ordinal(st.pos) + ' · ' : '') + (st.w || 0) + '–' + (st.l || 0) + '</div></div></div>';
    }
    // map pool comparison
    var ra = teamMapRecords(A), rb = teamMapRecords(B);
    var pool = Object.keys(ra).concat(Object.keys(rb)).filter(function (x, i, a) { return a.indexOf(x) === i; })
      .sort(function (x, y) { var n = function (k) { return ((ra[k] || {}).w || 0) + ((ra[k] || {}).l || 0) + ((rb[k] || {}).w || 0) + ((rb[k] || {}).l || 0); }; return n(y) - n(x) || (x < y ? -1 : 1); });
    function rec(r, right) {
      if (!r) return '<span class="mp-none">not played</span>';
      var n = r.w + r.l, pct = Math.round(r.w / n * 100);
      var bar = '<span class="mp-bar' + (right ? ' r' : '') + '"><i style="width:' + pct + '%;background:' + (pct >= 60 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#f43f5e') + '"></i></span>';
      var txt = '<span class="mp-wl"><b>' + r.w + '–' + r.l + '</b> <span class="dim">' + signed(r.rd, 0) + '</span></span>';
      return right ? bar + txt : txt + bar;
    }
    var mapsHtml = pool.length ? pool.map(function (k) {
      return '<div class="mp-map"><div class="mp-l">' + rec(ra[k], false) + '</div><div class="mp-mn" style="' + mapBg(k) + '">' + esc(k) + '</div><div class="mp-r">' + rec(rb[k], true) + '</div></div>';
    }).join('') : '<p class="muted">No maps played yet.</p>';
    // rosters
    function roster(t) {
      var ps = players.filter(function (p) { return p.team === t; }).sort(function (a, b) { return b.rating - a.rating; });
      return '<table class="sb mp-ro"><thead><tr><th>' + esc(t) + '</th><th>Maps</th><th>K-D</th><th>ADR</th><th>EOS</th></tr></thead><tbody>' +
        ps.map(function (p) {
          return '<tr data-k="' + esc(p.name + '|' + p.team) + '" title="Open player card"' + (p.low ? ' class="low"' : '') + '><td><span class="mp-p">' + esc(p.name) + '</span><span class="mp-role">' + esc(p.role || '') + '</span></td>' +
            '<td>' + p.maps + '</td><td>' + p.k + '-' + p.d + '</td><td>' + fx(p.adr, 1) + '</td><td><b style="color:' + ratingColor(p.rating) + '">' + fx(p.rating, 2) + '</b></td></tr>';
        }).join('') + '</tbody></table>';
    }
    // previous matches
    function hist(t) {
      var list = teamSeries(t);
      if (!list.length) return '<p class="muted">No matches yet.</p>';
      return list.map(function (s) {
        var opp = s.A === t ? s.B : s.A, us = s.A === t ? s.wa : s.wb, them = s.A === t ? s.wb : s.wa;
        return '<button type="button" class="mp-h" data-open-series="' + esc(s.id) + '"><span class="tm-res ' + (us > them ? 'w' : 'l') + '">' + (us > them ? 'W' : 'L') + ' ' + us + '–' + them + '</span>' +
          '<span class="mp-opp">' + logo(opp) + esc(opp) + '</span><span class="mp-ms">' + s.maps.map(function (mm) {
            var a = mm.a === t ? mm.as : mm.bs, b = mm.a === t ? mm.bs : mm.as;
            return '<span class="' + (a > b ? 'w' : 'l') + '">' + esc(mm.map.slice(0, 3)) + ' ' + a + '–' + b + '</span>';
          }).join('') + '</span></button>';
      }).join('');
    }
    var h2h = teamSeries(A).filter(function (s) { return s.A === B || s.B === B; });
    $('mp-body').innerHTML =
      '<div class="sb-top"><span class="sdate">' + esc(m.label || m.stage) + ' · ' + DOW[d.getUTCDay()] + ' ' + d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '. ' + esc(m.time) + ' (Finnish time)' + (m.bo ? ' · BO' + m.bo : ' · BO3') + '</span><button type="button" class="sb-close" aria-label="Close">✕</button></div>' +
      '<div class="mp-head">' + side(A, ta) + '<div class="mp-vs">vs</div>' + side(B, tb) + '</div>' +
      (h2h.length ? '<div class="mp-h2h">Head to head: ' + h2h.map(function (s) { var us = s.A === A ? s.wa : s.wb, them = s.A === A ? s.wb : s.wa; return esc(A) + ' ' + us + '–' + them + ' (' + esc(s.date) + ')'; }).join(', ') + '</div>' : '') +
      '<div class="sc-title">Map records</div><div class="mp-maps">' + mapsHtml + '</div>' +
      '<div class="sc-title">Players · season</div><div class="mp-two">' + roster(A) + roster(B) + '</div>' +
      '<div class="sc-title">Matches so far</div><div class="mp-two"><div class="mp-hl">' + hist(A) + '</div><div class="mp-hl">' + hist(B) + '</div></div>';
    $('mp').hidden = false; document.body.classList.add('noscroll');
    var c = document.querySelector('#mp .sb-close'); if (c) c.focus({ preventScroll: true });
  }
  function closePreview() { $('mp').hidden = true; if ($('sb').hidden && $('tm').hidden) document.body.classList.remove('noscroll'); }

  function renderGlossary() {
    var skip = /anchors|^Models|model \(learned\)/i;
    $('glossary').innerHTML = (D.glossary || []).filter(function (g) { return !skip.test(g[0]); }).map(function (g) {
      return '<dt>' + esc(g[0]) + '</dt><dd>' + esc(g[1]) + '</dd>';
    }).join('');
  }

  // ---------- header ----------
  function renderHeader() {
    $('sub').textContent = 'Updated ' + D.updated;
    $('footer').textContent = 'EOS 14 stats · data updated ' + D.updated;
  }

  // ---------- events ----------
  document.addEventListener('click', function (e) {
    if (!$('mp').hidden && e.target.closest('#mp')) {
      if (e.target.closest('.sb-close') || e.target.id === 'mp') { closePreview(); return; }
      var hs = e.target.closest('[data-open-series]');
      if (hs) { closePreview(); openScoreboard(hs.dataset.openSeries); return; }
      var pr2 = e.target.closest('tr[data-k]');
      if (pr2 && byKey[pr2.dataset.k]) { closePreview(); select(pr2.dataset.k, true); return; }
      var tm2 = e.target.closest('[data-team]');
      if (tm2) { closePreview(); openTeam(tm2.dataset.team); }
      return;
    }
    var pvc = e.target.closest('[data-preview]');
    if (pvc && !e.target.closest('a')) { openPreview(+pvc.dataset.preview); return; }
    var tl = e.target.closest('.tile[data-tip], .gun[data-tip]');
    if (tl && window.matchMedia && !matchMedia('(hover: hover)').matches) {
      var tipEl = $('tip'), rc = tl.getBoundingClientRect();
      tipEl.innerHTML = tl.getAttribute('data-tip'); tipEl.style.display = 'block';
      tipEl.style.left = Math.max(8, Math.min(window.innerWidth - tipEl.offsetWidth - 8, rc.left + rc.width / 2 - tipEl.offsetWidth / 2)) + 'px';
      tipEl.style.top = Math.max(8, rc.top - tipEl.offsetHeight - 8) + 'px';
      clearTimeout(tl._t); tl._t = setTimeout(function () { tipEl.style.display = 'none'; }, 2500);
      return;
    }
    if (!$('tm').hidden && e.target.closest('#tm')) {
      if (e.target.closest('.sb-close') || e.target.id === 'tm') { closeTeam(); return; }
      var os = e.target.closest('[data-open-series]');
      if (os) { closeTeam(); openScoreboard(os.dataset.openSeries); return; }
      var tr = e.target.closest('tr[data-k]');
      if (tr && byKey[tr.dataset.k]) { closeTeam(); select(tr.dataset.k, true); }
      return;
    }
    var tt = e.target.closest('[data-team]');
    if (tt && !e.target.closest('[data-k]')) { openTeam(tt.dataset.team); return; }
    if (!$('sb').hidden && e.target.closest('#sb')) {
      if (e.target.closest('.sb-close') || e.target.id === 'sb') { closeScoreboard(); return; }
      var tb = e.target.closest('[data-sbtab]');
      if (tb) { sbTab = tb.dataset.sbtab; renderScoreboard(); return; }
      var pr = e.target.closest('tr[data-k]');
      if (pr && byKey[pr.dataset.k]) { closeScoreboard(); select(pr.dataset.k, true); }
      return;
    }
    var card = e.target.closest('.series[data-series]');
    if (card) { var mc = e.target.closest('.mapc[data-map]'); openScoreboard(card.dataset.series, mc && mc.dataset.map); return; }
    var th = e.target.closest('#lb th');
    if (th) {
      var c = (gunView ? GUN_COLS : advanced ? ADV_COLS : COLS).filter(function (x) { return x.k === th.dataset.k; })[0];
      if (!c || !c.get) return;
      if (sortKey === c.k) sortAsc = !sortAsc; else { sortKey = c.k; sortAsc = !!c.asc; }
      renderTable(); return;
    }
    var lt = e.target.closest('.leader .lmore, .leader h3');
    if (lt) {
      var cat = lt.closest('.leader').dataset.cat;
      openLeaders[cat] = !openLeaders[cat];
      renderLeaders(); return;
    }
    var fb = e.target.closest('.fbtn');
    if (fb && fb.id === 'advbtn') {
      advanced = !advanced; gunView = false; sortKey = advanced ? 'aim' : 'rating'; sortAsc = false;
      renderFilters(); renderTable(); return;
    }
    if (fb && fb.id === 'gunbtn') {
      gunView = !gunView; advanced = false; sortKey = gunView ? 'grat' : 'rating'; sortAsc = false;
      renderFilters(); renderTable(); return;
    }
    if (fb && fb.hasAttribute('data-r')) {
      var rn = fb.dataset.r;
      if (!rn) roleFilter = {};
      else if (roleFilter[rn]) delete roleFilter[rn];
      else roleFilter[rn] = true;
      renderFilters(); renderTable(); return;
    }
    if (fb) {
      var tn = fb.dataset.t;
      if (!tn) teamFilter = {};
      else if (teamFilter[tn]) delete teamFilter[tn];
      else teamFilter[tn] = true;
      renderFilters(); renderTable(); return;
    }
    var k = e.target.closest('[data-k]');
    if (k && (k.matches('tr,.lrow,a,circle'))) select(k.dataset.k, !k.matches('circle'));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (!$('mp').hidden) closePreview(); else if (!$('tm').hidden) closeTeam(); else if (!$('sb').hidden) closeScoreboard(); }
    var pk = e.target.closest && e.target.closest('[data-preview]');
    if (pk && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openPreview(+pk.dataset.preview); }
    var card = e.target.closest && e.target.closest('.series[data-series]');
    if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openScoreboard(card.dataset.series); }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'showlow') { showLow = e.target.checked; renderTable(); }
    if (e.target.id === 'gunsel') { gunSel = e.target.value; sortKey = 'grat'; sortAsc = false; renderTable(); }
  });

  var tip = $('tip');
  document.addEventListener('mousemove', function (e) {
    var t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { tip.style.display = 'none'; return; }
    tip.innerHTML = t.getAttribute('data-tip');
    tip.style.display = 'block';
    var x = e.clientX + 14, y = e.clientY + 14;
    if (x + tip.offsetWidth > window.innerWidth - 8) x = e.clientX - tip.offsetWidth - 14;
    if (y + tip.offsetHeight > window.innerHeight - 8) y = e.clientY - tip.offsetHeight - 14;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  });


  // ---------- EOS champions (history.js); season stats live on /eos/seasons/ ----------
  function renderHistory() {
    var H = window.EOS_HISTORY, sec = $('sec-champions');
    if (!H || !H.winners || !H.winners.length) { if (sec) sec.hidden = true; return; }
    var lowLogo = {}; Object.keys(D.logos || {}).forEach(function (t) { lowLogo[t.toLowerCase()] = t; });
    $('hs-champs').innerHTML = H.winners.slice().sort(function (a, b) { return b.s - a.s; }).map(function (w) {
      var cur = lowLogo[String(w.w).toLowerCase()];
      var has = H.seasons.some(function (x) { return x.s === w.s; });
      return '<div>' + logo(cur || w.w) + '<span><span class="n">EOS ' + w.s + (has ? ' · <a href="/eos/seasons/#' + w.s + '">stats</a>' : '') + '</span><b>🏆 ' + esc(w.w) + '</b><span class="r">vs ' + esc(w.r) + '</span></span></div>';
    }).join('');
  }

  // ---------- init ----------
  renderHeader(); renderStandings(); renderLeaders(); renderFilters(); renderTable(); renderTeamBars(); renderResults(); renderUpcoming(); renderGlossary(); renderHistory();
  var fromHash = decodeURIComponent((location.hash || '').slice(1)).toLowerCase();
  var start = players.filter(function (p) { return p.name.toLowerCase() === fromHash; })[0] ||
    pool[Math.floor(Math.random() * pool.length)];
  renderCard(start);

  // ---------- theme toggle (dark / light 'paper'); remembered per browser ----------
  $('themebtn').addEventListener('click', function () {
    var light = document.documentElement.getAttribute('data-theme') !== 'light';
    if (light) document.documentElement.setAttribute('data-theme', 'light'); else document.documentElement.removeAttribute('data-theme');
    var mc = document.querySelector('meta[name=theme-color]'); if (mc) mc.content = light ? '#efe6d4' : '#182839';
    try { localStorage.setItem('eos-theme', light ? 'light' : 'dark'); } catch (e) { /* private mode etc. */ }
  });

  // ---------- live stream / next match ----------
  // The Twitch player shows from 15 min before a match day's first match until 3 h after its last start.
  // Add ?live=1 to the URL to preview it.
  var CHANNEL = 'elisaviihdesport';
  function matchDays() {
    var days = {};
    (window.EOS_SCHEDULE || []).forEach(function (m) {
      var t = finnishDate(m.date, m.time);
      var d = days[m.date] = days[m.date] || { from: t, to: t };
      if (t < d.from) d.from = t; if (t > d.to) d.to = t;
    });
    return Object.keys(days).map(function (k) { return { from: new Date(days[k].from - 15 * 60000), to: new Date(+days[k].to + 3 * 3600000) }; });
  }
  var forceLive = /[?&]live=1\b/.test(location.search);
  function updateLive() {
    var now = new Date();
    var live = forceLive || matchDays().some(function (w) { return now >= w.from && now <= w.to; });
    var sec = $('live'), frame = $('live-frame');
    if (live && sec.hidden) {
      var parents = [location.hostname, 'robujohnson.github.io'].filter(function (h, i, a) { return h && a.indexOf(h) === i; });
      // The Twitch player is heavy (video decoding, hundreds of MB of memory), so it only loads on click.
      var src = 'https://player.twitch.tv/?channel=' + CHANNEL + '&autoplay=true' +
        parents.map(function (h) { return '&parent=' + encodeURIComponent(h); }).join('');
      frame.innerHTML = '<button type="button" class="live-play" id="live-play"><span class="pb"><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path fill="#fff" d="M8 5v14l11-7z"/></svg></span>' +
        '<span class="pt">Watch live</span><span class="ps">Loads the Twitch stream</span></button>';
      $('live-play').addEventListener('click', function () {
        frame.innerHTML = '<iframe src="' + src + '" allow="autoplay; fullscreen" allowfullscreen title="EOS 14 live on Twitch"></iframe>';
      });
      sec.hidden = false;
    } else if (!live && !sec.hidden) {
      frame.innerHTML = ''; sec.hidden = true;
    }
    // next match in the header (hidden while live)
    var played = Object.keys(seriesById).map(function (k) { return seriesById[k]; });
    var next = (window.EOS_SCHEDULE || []).filter(function (m) {
      if (finnishDate(m.date, m.time) <= now) return false;
      return !(m.a && m.b && played.some(function (s) { return s.date >= m.date && ((s.A === m.a && s.B === m.b) || (s.A === m.b && s.B === m.a)); }));
    })[0];
    var nb = $('nextmatch');
    if (live || !next) { nb.hidden = true; return; }
    var d = new Date(Date.UTC(+next.date.slice(0, 4), +next.date.slice(5, 7) - 1, +next.date.slice(8, 10)));
    var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    nb.innerHTML = '<span class="k">Next match</span><span class="m">' +
      (next.a && next.b ? logo(next.a) + esc(next.a) + ' <span class="dim">vs</span> ' + esc(next.b) + logo(next.b) : esc(next.label || next.stage)) +
      '</span><span class="w">' + DOW[d.getUTCDay()] + ' ' + d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '. ' + esc(next.time) + ' (Finnish time)</span>';
    nb.hidden = false;
  }
  $('nextmatch').addEventListener('click', function () { $('sec-upcoming').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  updateLive();
  setInterval(updateLive, 60000);

  // ---------- section tabs ----------
  var bar = document.querySelector('.sitebar'), tabsEl = $('tabs');
  var tabBtns = [].slice.call(tabsEl.querySelectorAll('button[data-target]'));
  function hdr() { return bar.offsetHeight + 12; }
  function setHdr() { document.documentElement.style.setProperty('--hdr', hdr() + 'px'); }
  setHdr(); window.addEventListener('resize', setHdr);
  var activeTab = null;
  function markTab(btn) {
    if (btn === activeTab) return;
    activeTab = btn;
    tabBtns.forEach(function (b) { b.classList.toggle('on', b === btn); });
    if (btn) {
      var l = btn.offsetLeft, r = l + btn.offsetWidth;
      if (l < tabsEl.scrollLeft) tabsEl.scrollLeft = l - 8;
      else if (r > tabsEl.scrollLeft + tabsEl.clientWidth) tabsEl.scrollLeft = r - tabsEl.clientWidth + 8;
    }
  }
  var lockUntil = 0;
  function updateActive() {
    if (Date.now() < lockUntil) return;
    var line = hdr() + 40, cur = tabBtns[0];
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = tabBtns[tabBtns.length - 1];
    else tabBtns.forEach(function (b) { var el = $(b.dataset.target); if (el && el.getBoundingClientRect().top <= line) cur = b; });
    markTab(cur);
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; updateActive(); });
  }, { passive: true });
  tabsEl.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var el = $(b.dataset.target); if (!el) return;
    lockUntil = Date.now() + 900;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    markTab(b);
    setTimeout(updateActive, 950);
  });
  updateActive();
})();
