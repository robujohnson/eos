// "Past seasons" dropdown in the tab bar. Opens on hover with a mouse, on tap on touch screens.
// Needs history.js (window.EOS_HISTORY) and a button with id="seasons-btn".
(function () {
  'use strict';
  var H = window.EOS_HISTORY, btn = document.getElementById('seasons-btn');
  if (!btn || !H || !H.seasons || !H.seasons.length) { if (btn) btn.hidden = true; return; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var css = document.createElement('style');
  css.textContent =
    '.sm-menu{position:fixed;z-index:60;min-width:190px;background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:5px;box-shadow:0 12px 30px rgba(0,0,0,.35)}' +
    '.sm-menu[hidden]{display:none}' +
    '.sm-menu a{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:8px 11px;border-radius:7px;color:var(--text);text-decoration:none;font-size:13px;font-weight:700;white-space:nowrap}' +
    '.sm-menu a span{font-size:11.5px;font-weight:500;color:var(--muted)}' +
    '.sm-menu a:hover,.sm-menu a:focus{background:rgba(249,115,22,.14);outline:none}' +
    '.sm-menu a.on{color:var(--accent2)}' +
    '#seasons-btn .car{display:inline-block;font-size:10px;margin-left:4px;transition:transform .15s}' +
    '#seasons-btn[aria-expanded="true"] .car{transform:rotate(180deg)}' +
    ':root[data-theme="light"] .sm-menu{background:#fbf7ee;box-shadow:0 12px 30px rgba(80,60,30,.18)}';
  document.head.appendChild(css);

  var winOf = {}; (H.winners || []).forEach(function (w) { winOf[w.s] = w; });
  var menu = document.createElement('div');
  menu.className = 'sm-menu'; menu.id = 'seasons-menu'; menu.hidden = true; menu.setAttribute('role', 'menu');
  menu.innerHTML = H.seasons.map(function (s) {
    var w = winOf[s.s];
    return '<a role="menuitem" href="/eos/seasons/#' + s.s + '" data-s="' + s.s + '">EOS ' + s.s + (w ? '<span>🏆 ' + esc(w.w) + '</span>' : '') + '</a>';
  }).join('');
  document.body.appendChild(menu);
  btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'seasons-menu');

  function mark() {
    var cur = location.pathname.indexOf('/eos/seasons') === 0 ? location.hash.slice(1) || String(H.seasons[0].s) : '';
    [].forEach.call(menu.querySelectorAll('a'), function (a) { a.classList.toggle('on', a.dataset.s === cur); });
  }
  function place() {
    var r = btn.getBoundingClientRect();
    menu.style.top = Math.round(r.bottom + 2) + 'px';
    menu.style.left = Math.round(Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8))) + 'px';
  }
  function open() { mark(); menu.hidden = false; place(); btn.setAttribute('aria-expanded', 'true'); }
  function close() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  var hover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches, t = null;
  if (hover) {
    var enter = function () { clearTimeout(t); open(); };
    var leave = function () { clearTimeout(t); t = setTimeout(close, 180); };
    btn.addEventListener('mouseenter', enter); btn.addEventListener('mouseleave', leave);
    menu.addEventListener('mouseenter', enter); menu.addEventListener('mouseleave', leave);
  }
  btn.addEventListener('click', function (e) { e.stopPropagation(); if (menu.hidden) open(); else if (!hover) close(); });
  document.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target)) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  menu.addEventListener('click', function () { setTimeout(close, 0); });
  window.addEventListener('resize', close);
  window.addEventListener('scroll', function () { if (!menu.hidden) place(); }, { passive: true });
  var tabs = btn.closest('.tabs-in'); if (tabs) tabs.addEventListener('scroll', close, { passive: true });
})();
