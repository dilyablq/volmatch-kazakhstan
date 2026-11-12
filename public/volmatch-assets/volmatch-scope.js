/*
 * VolMatch — release 1.0 scope (BR-05).
 * Gamification (leaderboard, points, levels, achievements), the organizer comparison page and paid event
 * promotion are out of scope for release 1.0. This script hides those screens for every role
 * (Issues I-01 and I-14). The server also rejects promotion requests with HTTP 410.
 */
(function () {
  'use strict';
  var css = '#nav [data-view="leaderboard"],#nav [data-view="competitors"],#view-leaderboard,#view-competitors,' +
    '#gameBox,#achBox,.vm-out-of-scope{display:none!important}' +
    // FR-24: the month calendar keeps seven equal columns on narrow screens (no horizontal scrolling at 360 px).
    '#calendarGrid{grid-template-columns:repeat(7,minmax(0,1fr))!important}' +
    '#calendarGrid>*{min-width:0;overflow:hidden}#calendarGrid .dayevent{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';
  var st = document.createElement('style'); st.id = 'vmScope'; st.textContent = css; document.head.appendChild(st);

  function hide(el) { el.classList.add('vm-out-of-scope'); el.style.setProperty('display', 'none', 'important'); }
  function apply() {
    if (typeof ROLE_VIEWS !== 'undefined') {
      ['volunteer', 'organizer', 'moderator', 'admin'].forEach(function (r) {
        if (ROLE_VIEWS[r]) ROLE_VIEWS[r] = ROLE_VIEWS[r].filter(function (v) { return v !== 'leaderboard' && v !== 'competitors'; });
      });
    }
    var promo = document.getElementById('promoteSelect');
    var card = promo && promo.closest('.card');
    if (card) hide(card);
    // Points tile on the volunteer dashboard (gamification).
    var stats = document.getElementById('stats');
    if (stats && typeof t === 'function') {
      Array.prototype.forEach.call(stats.querySelectorAll('.stat'), function (s) {
        var label = s.querySelector('label');
        if (label && label.textContent.indexOf(t('ptsT')) === 0) hide(s);
      });
    }
  }

  // FR-04: without an uploaded photo every user gets a neutral initials avatar (no stock portraits of people, Issue I-08).
  if (typeof avatarUrl === 'function') {
    var COLORS = ['#178366', '#3b6fd8', '#c0572b', '#7b4fc9', '#b3374f', '#0f7c8c'];
    avatarUrl = function (n) {
      if (typeof profile !== 'undefined' && profile && n === profile.name && profile.photo) return profile.photo;
      var name = String(n || '?').trim();
      var ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (x) { return x.charAt(0).toUpperCase(); }).join('') || '?';
      var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="' + COLORS[h % COLORS.length] +
        '"/><text x="48" y="58" font-family="Arial,sans-serif" font-size="34" font-weight="700" fill="#fff" text-anchor="middle">' + ini.replace(/[<&>"]/g, '') + '</text></svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    };
  }

  // FR-17: show why an event matches (reasons calculated by the server) under the match score.
  function why(e) {
    if (typeof role === 'undefined' || role !== 'volunteer' || !e || !e.matchReasons || !e.matchReasons.length) return '';
    var lg = typeof lang !== 'undefined' ? lang : 'ru';
    var L = { interest: ['интерес', 'interest', 'қызығушылық'], skills: ['навыки', 'skills', 'дағдылар'], availability: ['время', 'availability', 'уақыт'] };
    var k = lg === 'en' ? 1 : lg === 'kk' ? 2 : 0;
    var tx = e.matchReasons.map(function (r) { var v = (typeof tr === 'function' ? tr(r.value) : r.value); return (L[r.type] || [r.type, r.type, r.type])[k] + ': ' + v; }).join(' · ');
    return '<small class="vm-why" style="display:block;font-size:10px;color:#5d7469;margin-top:3px">' + String(tx).replace(/[<&>]/g, '') + '</small>';
  }
  if (typeof card === 'function') {
    var prevCard = card;
    card = function (e) {
      var html = prevCard.apply(this, arguments);
      var w = why(e);
      return w ? html.replace(/(<span class="match">[^<]*<\/span>)/, '<span>$1' + w + '</span>') : html;
    };
  }


  // FR-17: in "Events for me" the list is sorted by match score, highest first; low scores stay in the list (BR-04).
  if (typeof renderMatches === 'function') {
    var prevRenderMatches = renderMatches;
    renderMatches = function () {
      prevRenderMatches.apply(this, arguments);
      var mode = document.getElementById('matchMode');
      var box = document.getElementById('matchResults');
      if (!mode || mode.value !== 'events' || !box) return;
      var score = function (el) { var m = el.querySelector('.match'); return m ? parseInt(m.textContent.replace(/\D+/g, ' ').trim(), 10) || 0 : 0; };
      Array.prototype.slice.call(box.children).sort(function (a, b) { return score(b) - score(a); }).forEach(function (el) { box.appendChild(el); });
    };
  }


  // FR-06: district filter and keyword search in the description, in addition to the existing filters.
  if (typeof renderEvents === 'function') {
    var DL = { all: ['Все районы', 'All districts', 'Барлық аудан'] };
    var addDistrict = function () {
      var filters = document.querySelector('#view-events .filters');
      if (!filters || document.getElementById('vmArea')) return;
      var sel = document.createElement('select');
      sel.className = 'field'; sel.id = 'vmArea'; sel.setAttribute('aria-label', 'District');
      var k = typeof lang !== 'undefined' ? (lang === 'en' ? 1 : lang === 'kk' ? 2 : 0) : 0;
      sel.innerHTML = '<option value="all">' + DL.all[k] + '</option>' + ['Almaty', 'Baikonur', 'Saryarka', 'Yesil'].map(function (a) { return '<option value="' + a + '">' + a + '</option>'; }).join('');
      sel.onchange = function () { renderEvents(); };
      var cat = document.getElementById('cat');
      if (cat && cat.nextSibling) filters.insertBefore(sel, cat.nextSibling); else filters.appendChild(sel);
    };
    var prevRenderEvents = renderEvents;
    renderEvents = function () {
      addDistrict();
      var area = (document.getElementById('vmArea') || {}).value || 'all';
      var qv = ((document.getElementById('searchEvents') || {}).value || '').toLowerCase();
      var all = events;
      events = all.filter(function (e) { return area === 'all' || e.area === area; }).map(function (e) {
        if (!qv || !(e.description || '').toLowerCase().includes(qv)) return e;
        return Object.assign({}, e, { skills: (e.skills || []).concat([qv]) });
      });
      try { return prevRenderEvents.apply(this, arguments); } finally { events = all; }
    };
  }


  if (typeof clearEventFilters === 'function') {
    var prevClear = clearEventFilters;
    clearEventFilters = function () { var a = document.getElementById('vmArea'); if (a) a.value = 'all'; return prevClear.apply(this, arguments); };
  }

  if (typeof curView !== 'undefined' && (curView === 'leaderboard' || curView === 'competitors') && typeof go === 'function') go(homeView());
  apply();
  new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
})();
