/*
 * VolMatch — interface improvements (work with and without the server).
 *  - Map: colored category pins, the selected event is highlighted on the map (bigger pin + popup),
 *    in a "selected event" panel under the map and in the list on the right.
 *  - Correct Russian plurals for event counters.
 */
(function () {
  'use strict';

  var CAT = {
    Environment: ['#239a6b', '🌿'], Education: ['#3b6fd8', '📚'], Community: ['#e0862a', '🤝'],
    Animals: ['#d6537b', '🐾'], Health: ['#8a5cd6', '💚']
  };
  function tx(ru, en, kk) { return lang === 'en' ? en : lang === 'kk' ? (kk || ru) : ru; }
  function plural(n, ru, en, kk) {
    if (lang === 'en') return n + ' ' + (n === 1 ? en[0] : en[1]);
    if (lang === 'kk') return n + ' ' + kk;
    var m10 = n % 10, m100 = n % 100;
    var f = m10 === 1 && m100 !== 11 ? ru[0] : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? ru[1] : ru[2];
    return n + ' ' + f;
  }
  function eventsWord(n) { return plural(n, ['событие', 'события', 'событий'], ['event', 'events'], 'іс-шара'); }
  function spotsWord(n) { return plural(n, ['место', 'места', 'мест'], ['spot', 'spots'], 'орын'); }
  function photoOf(e) { return e.img || (e.images && e.images[0]) || ''; }
  function byId(id) { return events.find(function (x) { return Number(x.id) === Number(id); }); }
  function canJoin() { return logged && ['volunteer', 'moderator', 'admin'].indexOf(role) >= 0; }

  // ---------- styles ----------
  var css = [
    '.vm-pin-wrap{background:none;border:0}',
    '.vm-pin{--pin:#178366;width:34px;height:34px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);background:var(--pin);box-shadow:0 4px 12px rgba(0,0,0,.28);border:3px solid #fff;display:grid;place-items:center;transition:transform .2s}',
    '.vm-pin span{transform:rotate(45deg);font-size:15px;line-height:1}',
    '.vm-pin.vm-pin-sel{width:46px;height:46px;border-width:4px;box-shadow:0 0 0 6px rgba(255,255,255,.65),0 0 0 10px color-mix(in srgb,var(--pin) 35%,transparent),0 8px 18px rgba(0,0,0,.35);animation:vmBounce .6s ease}',
    '.vm-pin.vm-pin-sel span{font-size:20px}',
    '.vm-pin.vm-pin-dim{opacity:.55}',
    '@keyframes vmBounce{0%{transform:rotate(-45deg) translate(0,-14px)}60%{transform:rotate(-45deg) translate(0,2px)}100%{transform:rotate(-45deg)}}',
    '.vm-pop{font-family:inherit;width:230px}',
    '.vm-pop img{width:100%;height:110px;object-fit:cover;border-radius:10px;display:block;margin-bottom:8px}',
    '.vm-pop b{display:block;font-size:13px;line-height:1.3;margin-bottom:4px;color:#17352b}',
    '.vm-pop small{display:block;color:#5d7469;font-size:11px;line-height:1.45}',
    '.vm-pop .vm-chip{display:inline-block;margin-bottom:6px;padding:3px 8px;border-radius:99px;color:#fff;font-size:10px;font-weight:800}',
    '.vm-pop button{margin-top:8px;width:100%}',
    '.leaflet-popup-content{margin:12px}',
    '.vm-map-col{display:flex;flex-direction:column;gap:14px;min-width:0;position:sticky;top:14px;align-self:start}',
    '.vm-selected{border-radius:18px;background:#fff;border:1px solid #e2eee8;box-shadow:0 7px 21px rgba(27,67,52,.075);overflow:hidden}',
    '.vm-selected.vm-has{border:2px solid var(--pin,#178366);box-shadow:0 10px 26px rgba(27,67,52,.14)}',
    '.vm-sel-inner{display:grid;grid-template-columns:170px minmax(0,1fr);min-height:150px}',
    '.vm-sel-photo{background:#e8f3ed center/cover no-repeat;position:relative}',
    '.vm-sel-tag{position:absolute;left:10px;top:10px;padding:5px 9px;border-radius:99px;background:var(--pin,#178366);color:#fff;font-size:10px;font-weight:800}',
    '.vm-sel-body{padding:14px 16px;display:flex;flex-direction:column;gap:6px;min-width:0}',
    '.vm-sel-kicker{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--pin,#178366)}',
    '.vm-sel-body h3{margin:0;font-size:17px;line-height:1.25}',
    '.vm-sel-meta{display:flex;flex-wrap:wrap;gap:6px 14px;color:#5d7469;font-size:12px}',
    '.vm-sel-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto;padding-top:6px}',
    '.vm-sel-empty{padding:18px 18px;color:#5d7469;font-size:13px;display:flex;gap:12px;align-items:center}',
    '.vm-sel-empty i{font-style:normal;font-size:26px}',
    '.venue-card.vm-card{display:flex;flex-direction:column}',
    '.venue-card.vm-card.selected{border:2px solid var(--pin,#178366)!important;box-shadow:0 10px 24px rgba(27,67,52,.18)!important;transform:translateY(-2px)}',
    '.vm-card .venue-card-photo{height:110px}',
    '.vm-card h3{font-size:13px;line-height:1.3;margin:0 0 4px}',
    '.vm-card p{margin:0 0 3px;font-size:11px;color:#5d7469;line-height:1.4}',
    '.vm-card .vm-sel-badge{position:absolute;left:9px;bottom:9px;padding:5px 9px;border-radius:99px;background:var(--pin,#178366);color:#fff;font-size:9px;font-weight:800}',
    '.vm-card .venue-card-footer{margin-top:6px;flex-wrap:wrap;align-items:center}',
    '.vm-card .venue-event-title{white-space:normal;font-size:10px;font-weight:700;color:#2d6a52}',
    '@media (max-width:700px){.vm-sel-inner{grid-template-columns:1fr}.vm-sel-photo{height:150px}}',
    // A later desktop rule in index.html overrode the phone layout (sidebar ate half the screen).
    '@media (max-width:740px){#app .main{margin:0!important;padding:13px 11px 84px!important;max-width:none!important}' +
      '#app .sidebar{inset:auto 0 0!important;width:100%!important;height:64px!important;padding:4px!important;border-right:0!important;border-top:1px solid #e5eee9!important;flex-direction:row!important}' +
      '#app .topbar{flex-wrap:wrap;gap:8px}.vm-map-col{position:static}.vm-pop{width:200px}.vm-pop img{height:72px}}'
  ].join('\n');
  var st = document.createElement('style'); st.id = 'vmUiStyles'; st.textContent = css; document.head.appendChild(st);

  // ---------- map ----------
  function color(e) { return (CAT[e.category] || ['#178366'])[0]; }
  function pinIcon(e, state) {
    var c = CAT[e.category] || ['#178366', '📍'];
    var sel = state === 'sel';
    return window.L.divIcon({
      className: 'vm-pin-wrap',
      html: '<div class="vm-pin' + (sel ? ' vm-pin-sel' : state === 'dim' ? ' vm-pin-dim' : '') + '" style="--pin:' + c[0] + '"><span>' + (e.emoji || c[1]) + '</span></div>',
      iconSize: sel ? [46, 46] : [34, 34],
      iconAnchor: sel ? [23, 52] : [17, 38],
      popupAnchor: [0, sel ? -50 : -36],
      tooltipAnchor: [0, sel ? -50 : -36]
    });
  }
  function popupHtml(e) {
    var p = photoOf(e);
    return '<div class="vm-pop">' + (p ? '<img src="' + esc(p) + '" alt="">' : '') +
      '<span class="vm-chip" style="background:' + color(e) + '">' + esc(tr(e.category)) + '</span>' +
      '<b>' + esc(tr(e.title)) + '</b><small>📅 ' + esc(date(e.date)) + ' · ' + esc(e.time || '') + '</small>' +
      '<small>📍 ' + esc(tr(e.location || '')) + '</small>' +
      '<button class="btn primary small" onclick="details(' + Number(e.id) + ')">' + esc(t('details')) + ' →</button></div>';
  }

  var selMarker = null, flying = false;
  addMarkers = function () {
    if (!mapObj || !window.L) return;
    mapMk.forEach(function (m) { mapObj.removeLayer(m); });
    var hasSel = mapSel != null && !!byId(mapSel);
    mapMk = events.filter(visible).map(function (e) {
      var sel = hasSel && Number(e.id) === Number(mapSel);
      var m = window.L.marker([e.lat, e.lon], { icon: pinIcon(e, sel ? 'sel' : hasSel ? 'dim' : ''), zIndexOffset: sel ? 1000 : 0, riseOnHover: true })
        .addTo(mapObj).on('click', function () { selectMap(e.id); });
      if (!sel) m.bindTooltip(esc(tr(e.title)), { direction: 'top' });
      if (sel) {
        m.bindPopup(popupHtml(e), { maxWidth: 260, autoPanPadding: [20, 20] });
        selMarker = m;
        if (!flying) setTimeout(function () { if (mapObj.hasLayer(m)) m.openPopup(); }, 50);
      }
      return m;
    });
  };

  var fitted = false;
  var baseInitMap = initMap;
  initMap = function () {
    ensureLayout();
    baseInitMap();
    if (mapObj && !fitted && mapMk.length && (mapSel == null || !byId(mapSel))) {
      fitted = true;
      try { mapObj.fitBounds(window.L.latLngBounds(mapMk.map(function (m) { return m.getLatLng(); })).pad(0.15)); } catch (e) {}
    }
    renderSelected();
  };

  selectMap = function (id) {
    var e = byId(id);
    if (!e) return;
    mapSel = Number(id);
    if (mapObj) {
      flying = true;
      mapObj.once('moveend', function () { flying = false; if (selMarker && mapObj.hasLayer(selMarker)) selMarker.openPopup(); });
      mapObj.flyTo([e.lat, e.lon], Math.max(mapObj.getZoom(), 14), { duration: 0.6 });
    }
    renderMapList();
    renderSelected();
    // Scroll only the list (if it scrolls by itself), never the whole page.
    var card = document.getElementById('mr' + Number(id)), list = document.getElementById('mapList');
    if (card && list && list.scrollHeight > list.clientHeight + 4) {
      list.scrollTo({ top: card.offsetTop - list.offsetTop - 10, behavior: 'smooth' });
    }
  };
  window.vmClearMapSelection = function () {
    mapSel = null;
    if (mapObj) mapObj.closePopup();
    renderMapList(); renderSelected();
  };

  renderMapList = function () {
    ensureLayout();
    var list = document.getElementById('mapList');
    if (!list) return;
    var shown = events.filter(visible).slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    list.classList.add('venue-grid');
    list.innerHTML = shown.map(function (e) {
      var sel = Number(e.id) === Number(mapSel), p = photoOf(e);
      var bg = p ? ' style="background-image:linear-gradient(0deg,rgba(13,42,32,.45),rgba(13,42,32,0) 60%),url(\'' + esc(p) + '\')"' : '';
      return '<article class="venue-card vm-card' + (sel ? ' selected' : '') + '" id="mr' + Number(e.id) + '" style="--pin:' + color(e) + '" onclick="selectMap(' + Number(e.id) + ')">' +
        '<div class="venue-card-photo"' + bg + '><span class="venue-pin">' + (e.emoji || '📍') + '</span><span class="venue-category">' + esc(tr(e.category)) + '</span>' +
        (sel ? '<span class="vm-sel-badge">📍 ' + tx('На карте', 'On the map', 'Картада') + '</span>' : '') + '</div>' +
        '<div class="venue-card-body"><h3>' + esc(tr(e.title)) + '</h3><p>📅 ' + esc(date(e.date)) + ' · ' + esc(e.time || '') + '</p><p>📍 ' + esc(tr(e.location || '')) + '</p>' +
        '<div class="venue-card-footer"><span class="venue-event-title">' + (Number(e.spots) > 0 ? tx('Осталось ', 'Left: ', 'Қалды: ') + spotsWord(Number(e.spots)) : tx('Мест нет', 'Full', 'Орын жоқ')) + '</span>' +
        '<button class="btn outline small" onclick="event.stopPropagation();details(' + Number(e.id) + ')">' + esc(t('details')) + ' →</button></div></div></article>';
    }).join('') || '<div class="venue-empty">' + esc(t('noEvents')) + '</div>';
    var head = list.parentElement && list.parentElement.querySelector('h2');
    if (head) head.textContent = tx('События на карте', 'Events on the map', 'Картадағы іс-шаралар') + ' · ' + shown.length;
    if (mapObj) addMarkers();
  };

  function ensureLayout() {
    var map = document.getElementById('map');
    if (!map || map.parentElement.classList.contains('vm-map-col')) return;
    var col = document.createElement('div');
    col.className = 'vm-map-col';
    map.parentElement.insertBefore(col, map);
    col.appendChild(map);
    var sel = document.createElement('div');
    sel.id = 'vmMapSelected'; sel.className = 'vm-selected';
    col.appendChild(sel);
  }

  function renderSelected() {
    ensureLayout();
    var box = document.getElementById('vmMapSelected');
    if (!box) return;
    var e = mapSel != null ? byId(mapSel) : null;
    if (!e || !visible(e)) {
      box.className = 'vm-selected';
      box.innerHTML = '<div class="vm-sel-empty"><i>👆</i><span>' + tx('Нажмите на метку на карте или на карточку справа — здесь появится выбранное событие.',
        'Tap a pin on the map or a card on the right to see the event here.', 'Картадағы белгіні немесе оң жақтағы карточканы басыңыз — таңдалған іс-шара осында шығады.') + '</span></div>';
      return;
    }
    var p = photoOf(e), c = color(e);
    var action = '';
    if (canJoin() && e.status === 'approved') {
      action = e.joined
        ? '<button class="btn soft small" onclick="cancelJoin(' + Number(e.id) + ')">✓ ' + tx('Вы записаны — отменить', 'You are in — cancel', 'Жазылдыңыз — бас тарту') + '</button>'
        : (Number(e.spots) > 0 ? '<button class="btn primary small" onclick="join(' + Number(e.id) + ')">' + tx('Записаться', 'Join', 'Жазылу') + '</button>' : '');
    }
    box.className = 'vm-selected vm-has';
    box.style.setProperty('--pin', c);
    box.innerHTML = '<div class="vm-sel-inner"><div class="vm-sel-photo"' + (p ? ' style="background-image:url(\'' + esc(p) + '\')"' : '') + '><span class="vm-sel-tag">' + (e.emoji || '📍') + ' ' + esc(tr(e.category)) + '</span></div>' +
      '<div class="vm-sel-body"><span class="vm-sel-kicker">' + tx('Выбрано на карте', 'Selected on the map', 'Картада таңдалды') + '</span><h3>' + esc(tr(e.title)) + '</h3>' +
      '<div class="vm-sel-meta"><span>🏢 ' + esc(tr(e.org || '')) + '</span><span>📅 ' + esc(date(e.date)) + ' · ' + esc(e.time || '') + '</span><span>📍 ' + esc(tr(e.location || '')) + '</span>' +
      '<span>👥 ' + (Number(e.spots) > 0 ? tx('свободно ', 'free: ', 'бос: ') + spotsWord(Number(e.spots)) + tx(' из ', ' of ', ' / ') + Number(e.needed || e.spots) : tx('мест нет', 'full', 'орын жоқ')) + '</span></div>' +
      '<div class="vm-sel-actions"><button class="btn outline small" onclick="details(' + Number(e.id) + ')">' + esc(t('details')) + '</button>' + action +
      '<a class="btn outline small" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + Number(e.lat) + ',' + Number(e.lon) + '">🧭 ' + tx('Маршрут', 'Directions', 'Бағыт') + '</a>' +
      '<button class="btn outline small" onclick="vmClearMapSelection()">✕</button></div></div></div>';
  }

  // Selecting from elsewhere (e.g. the "map" button in event details) should keep the panel in sync.
  var baseRenderAll = renderAll;
  renderAll = function () { baseRenderAll(); try { renderSelected(); fixCounters(); } catch (e) {} };

  // ---------- plural forms in counters ----------
  function fixCounters() {
    var ec = document.getElementById('eventCount');
    if (ec) { var n = parseInt(ec.textContent, 10); if (!isNaN(n)) ec.textContent = eventsWord(n); }
    var sc = document.getElementById('savedEventCount');
    if (sc) { var k = parseInt(sc.textContent, 10); if (!isNaN(k)) sc.textContent = eventsWord(k); }
  }
  var baseRenderEvents = renderEvents;
  renderEvents = function () { baseRenderEvents.apply(this, arguments); fixCounters(); };

  // ---------- Kazakh dates (browsers often print "M11" instead of month names) ----------
  var KK_MONTHS = ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел'];
  var KK_MONTHS_FULL = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];
  var KK_DAYS = ['жс', 'дс', 'сс', 'ср', 'бс', 'жм', 'сб'];
  window.vmKkDate = function (d, withTime) {
    var out = d.getDate() + ' ' + KK_MONTHS[d.getMonth()];
    if (withTime) out += ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return out;
  };
  var baseDate = date;
  date = function (s) {
    if (lang !== 'kk') return baseDate(s);
    var d = new Date(s + 'T12:00:00'); if (isNaN(d)) return s;
    return KK_DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + KK_MONTHS[d.getMonth()];
  };

  // ---------- calendar: localized weekdays, start at the current month ----------
  var DAYS = { ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], kk: ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'] };
  try { var now = new Date(); month = new Date(now.getFullYear(), now.getMonth(), 1); } catch (e) {}
  var baseCalendar = renderCalendar;
  renderCalendar = function () {
    baseCalendar.apply(this, arguments);
    var names = DAYS[lang] || DAYS.ru;
    document.querySelectorAll('.dayname').forEach(function (el, i) { el.textContent = names[i % 7]; });
    if (lang === 'kk') { var m = document.getElementById('month'); if (m) m.textContent = KK_MONTHS_FULL[month.getMonth()] + ' ' + month.getFullYear(); }
  };

  // ---------- matching stats: one label was left in English ----------
  var baseMatches = renderMatches;
  renderMatches = function () {
    baseMatches.apply(this, arguments);
    var labels = document.querySelectorAll('#matchStats .stat label');
    var L2 = [tx('Профили', 'Profiles', 'Профильдер'), tx('События', 'Events', 'Іс-шаралар'), tx('Высокие совпадения', 'Strong matches', 'Жоғары сәйкестік'), tx('Город', 'City', 'Қала')];
    labels.forEach(function (lb, i) { if (lb.firstChild && lb.firstChild.nodeType === 3 && L2[i]) lb.firstChild.nodeValue = L2[i]; });
  };

  ensureLayout();
  renderSelected();
  fixCounters();
  try { renderCalendar(); } catch (e) {}
})();
