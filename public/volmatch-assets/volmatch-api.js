/*
 * VolMatch — backend adapter.
 * Loaded after all other scripts. When the page is served by the VolMatch Node.js server
 * (npm start), it replaces the localStorage demo logic for the core features with real API calls:
 * login/registration, events, sign-ups, moderation, attendance, favorites, messages, profile,
 * organizer verification and admin user management.
 * When the page is opened without the server (file:// or a static host), nothing changes and the
 * prototype keeps working in demo mode.
 */
(function () {
  'use strict';
  // The admin panel calls dateOffset(), which an earlier patch defines only inside its own
  // closure; without it the admin panel crashed while rendering.
  if (typeof window.dateOffset !== 'function') {
    window.dateOffset = function (days) {
      var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + days);
      return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    };
  }
  if (location.protocol === 'file:') { staticDemoAccounts(); return; }

  // Earlier patches gave moderators and admins the whole volunteer menu and the volunteer
  // dashboard as their start page, so all roles looked the same. Staff now start in their panel.
  function separateRoles() {
    ROLE_VIEWS.moderator = ['moderator', 'events', 'profile', 'support', 'faq'];
    ROLE_VIEWS.admin = window.VOLMATCH_BACKEND ? ['admin', 'events', 'profile', 'support', 'faq'] : ['admin', 'users', 'events', 'profile', 'support', 'faq'];
    HOME.moderator = 'moderator';
    HOME.admin = 'admin';
    document.querySelectorAll('#nav [data-view]').forEach(function (b) {
      var v = b.dataset.view;
      var roles = Object.keys(ROLE_VIEWS).filter(function (r) { return ROLE_VIEWS[r].indexOf(v) >= 0; });
      b.dataset.role = roles.join(' ') || 'none';
    });
    if (typeof logged !== 'undefined' && logged) applyRole();
  }

  // ---------- demo mode without a server (file:// or Netlify) ----------
  // The static prototype keeps ONE profile object and one "joined" flag per event for the whole
  // browser, so a photo or a sign-up made under one account showed up under every account.
  // Here each email gets its own profile (photo, about, skills, interests…) and its own sign-ups.
  function staticDemoAccounts() {
    separateRoles();
    var KEY = 'volmatch_profiles_v1';
    var PERSONAL = ['photo', 'about', 'skills', 'city', 'availability', 'hideName'];
    var store = {};
    try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    function personal() {
      var p = {}; PERSONAL.forEach(function (k) { p[k] = profile[k]; });
      p.interests = (interests || []).slice();
      p.joined = (events || []).filter(function (e) { return e.joined; }).map(function (e) { return Number(e.id); });
      return p;
    }
    function defaults(email) {
      if (email === 'volunteer@volmatch.demo') {
        return { photo: '', about: 'I enjoy bringing people together and supporting causes that make our community stronger.',
          skills: 'Communication, Event planning, Social media', city: 'Astana', availability: 'Weekends', hideName: false,
          interests: ['Environment', 'Education', 'Community'], joined: [4, 6] };
      }
      return { photo: '', about: '', skills: '', city: 'Astana', availability: 'Weekends', hideName: false, interests: [], joined: [] };
    }
    function persistStore() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
    function syncJoined(ids) {
      (events || []).forEach(function (e) { e.joined = (ids || []).indexOf(Number(e.id)) >= 0; });
    }
    var current = profile && profile.email;
    if (current && !store[current]) { store[current] = personal(); persistStore(); }

    var baseSave = save;
    save = function () {
      if (profile && profile.email && profile.email !== current) {
        // Another account has just logged in: load its own data instead of the previous one's.
        var p = store[profile.email] || defaults(profile.email);
        PERSONAL.forEach(function (k) { profile[k] = p[k]; });
        interests = (p.interests || []).slice();
        current = profile.email;
        syncJoined(p.joined);
      }
      if (current) { store[current] = personal(); persistStore(); }
      return baseSave.apply(this, arguments);
    };
    var baseFill = fillProfile;
    fillProfile = function () {
      baseFill();
      var em = document.getElementById('pEmail');
      if (em) { em.readOnly = true; em.title = 'Email нельзя изменить'; }
    };
  }

  var backend = false;
  var serverUser = null;
  var serverSettings = { registrationOpen: true, maintenanceMode: false };
  var favorites = [];
  var adminUsers = [];
  var photoMap = {};
  var lastProfileSig = '';
  var convSig = '';

  // ---------- HTTP ----------
  function api(method, url, body) {
    return fetch(url, {
      method: method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-VolMatch': '1' },
      body: body === undefined ? undefined : JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.message) || ('HTTP ' + res.status));
          err.status = res.status; err.code = data && data.error;
          throw err;
        }
        return data;
      });
    });
  }
  function fail(err) {
    toast(err && err.message ? err.message : 'Сервер недоступен');
    if (err && err.status === 401 && logged) setTimeout(function () { location.reload(); }, 900);
  }
  function quiet(fn) { var t0 = toast; toast = function () {}; try { fn(); } finally { toast = t0; } }

  // ---------- mapping server → frontend globals ----------
  function fmtTime(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'kk' ? 'kk-KZ' : 'en-US', { day: 'numeric', month: 'short' });
  }
  function applyConversations(list) {
    convSig = JSON.stringify(list.map(function (c) { return [c.id, c.messages.length]; }));
    messages = list.map(function (c) {
      return {
        id: c.id, owner: profile.email, name: c.name, org: c.org || '', avatar: c.avatar, event: c.event || '', kind: c.kind,
        messages: c.messages.map(function (m) { return { text: m.text, mine: m.mine, time: fmtTime(m.at) }; })
      };
    });
  }
  function profileSig(p, ints) {
    return JSON.stringify([p.name, p.city, p.availability, p.about, p.skills, p.photo || '', !!p.hideName, (ints || []).slice().sort()]);
  }

  function applyState(d) {
    window.vmData = d;
    serverSettings = d.settings || serverSettings;
    syncAdminPreferences();
    events = d.events || [];
    if (!d.user) return;
    serverUser = d.user;
    role = d.user.role;
    profile = {
      name: d.user.name, email: d.user.email, org: d.user.org || '', city: d.user.city, availability: d.user.availability,
      about: d.user.about, skills: d.user.skills, photo: d.user.photo || '', hideName: !!d.user.hideName, role: d.user.role
    };
    interests = d.user.interests || [];
    lastProfileSig = profileSig(profile, interests);
    favorites = d.favorites || [];
    photoMap = d.photos || {};
    applyConversations(d.conversations || []);

    attendance = {};
    events.forEach(function (e) {
      if (e.attended) attendance[e.id + '-me'] = true;
      if (role === 'organizer' && Array.isArray(e.registrations)) {
        e.registrations.forEach(function (r, i) { if (r.attended) attendance[e.id + '-' + i] = true; });
      }
    });
    promoted = events.filter(function (e) { return e.promoted; }).map(function (e) { return e.id; });

    orgVerifications = {};
    if (d.verification) orgVerifications[d.user.email] = d.verification;
    (d.verifications || []).forEach(function (v) { orgVerifications[v.email] = v; });
    if (d.audit) moderationAudit = d.audit;

    accounts = {};
    accounts[d.user.email] = { role: d.user.role, name: d.user.name, org: d.user.org };
    if (d.users) {
      adminUsers = d.users;
      d.users.forEach(function (u) { accounts[u.email] = { role: u.role, name: u.name, org: u.org }; });
      if (d.user.role === 'admin') syncAdminUserStates();
    }
  }

  // The admin panel keeps "suspended" flags and system switches in private variables of an
  // earlier script; keep them in line with the server through that script's own functions.
  function syncAdminUserStates() {
    var local = {};
    try { local = JSON.parse(localStorage.getItem('volmatch_admin_user_states_v1') || '{}') || {}; } catch (e) {}
    adminUsers.forEach(function (u) {
      if (!!local[u.email] !== u.suspended && u.email !== profile.email && prevAdminToggle) quiet(function () { prevAdminToggle(u.email); });
    });
  }
  function syncAdminPreferences() {
    var local = { registrationOpen: true, maintenanceMode: false };
    try { Object.assign(local, JSON.parse(localStorage.getItem('volmatch_admin_preferences_v1') || '{}') || {}); } catch (e) {}
    ['registrationOpen', 'maintenanceMode'].forEach(function (k) {
      if (!!local[k] !== !!serverSettings[k] && prevSetPref) quiet(function () { prevSetPref(k, !!serverSettings[k]); });
    });
  }

  function refresh() {
    return api('GET', '/api/bootstrap').then(function (d) { applyState(d); renderAll(); return d; });
  }

  function enterApp(d, greeting) {
    applyState(d);
    logged = true;
    closeModal();
    document.getElementById('landing').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    applyRole();
    renderAll();
    go(homeView());
    if (greeting) toast(greeting);
    startPolling();
  }

  // ---------- capture original functions before overriding ----------
  var prevAuth = auth;
  var prevSave = save;
  var prevSaveProfile = saveProfile;
  var prevFillProfile = fillProfile;
  var prevCreateEvent = createEvent;
  var prevRenderOrganizer = renderOrganizer;
  var prevSavedIds = savedIds;
  var prevAdminToggle = window.adminToggleUser;
  var prevSetPref = window.adminSetPreference;
  var prevEnsureSeeds = ensureSeeds;
  var prevAddNote = addNote;

  function install() {
    window.vmApi = { api: api, refresh: refresh, fail: fail };
    ROLE_VIEWS.admin = ['admin', 'events', 'profile', 'support', 'faq'];
    separateRoles();

    // ----- translated system notifications (@@n:{"k":...,"a":[...]}) -----
    var NOTE = {
      ev_approved: ['✅ Событие «{0}» одобрено и опубликовано.', '✅ Your event “{0}” was approved and published.', '✅ «{0}» іс-шарасы мақұлданып, жарияланды.'],
      ev_rejected: ['❌ Событие «{0}» отклонено. Причина: {1}', '❌ Your event “{0}” was rejected. Reason: {1}', '❌ «{0}» іс-шарасы қабылданбады. Себебі: {1}'],
      ev_suspended: ['⏸ Событие «{0}» приостановлено модератором. Причина: {1}', '⏸ Your event “{0}” was suspended by a moderator. Reason: {1}', '⏸ «{0}» іс-шарасын модератор тоқтатты. Себебі: {1}'],
      report_resolved: ['🛡 Ваша жалоба на «{0}» рассмотрена. Решение: {1}', '🛡 Your report about “{0}” was reviewed. Decision: {1}', '🛡 «{0}» туралы шағымыңыз қаралды. Шешім: {1}'],
      report_rejected: ['🛡 Ваша жалоба на «{0}» отклонена. Комментарий: {1}', '🛡 Your report about “{0}” was declined. Note: {1}', '🛡 «{0}» туралы шағымыңыз қабылданбады. Түсініктеме: {1}'],
      ticket_reply: ['💬 Поддержка ответила на обращение «{0}»: {1}', '💬 Support replied to “{0}”: {1}', '💬 Қолдау қызметі «{0}» өтінішіне жауап берді: {1}'],
      ticket_resolved: ['✔ Обращение «{0}» закрыто как решённое.', '✔ Your request “{0}” was marked as resolved.', '✔ «{0}» өтініші шешілді деп жабылды.'],
      org_verified: ['✔ Профиль организатора подтверждён — теперь ваши события можно публиковать.', '✔ Your organizer profile is verified — your events can now be published.', '✔ Ұйымдастырушы профилі расталды — енді іс-шараларыңызды жариялауға болады.'],
      org_needs_info: ['ℹ Модератору нужны дополнительные сведения о вашей организации{0}. Обновите заявку в панели организатора.', 'ℹ The moderator needs more information about your organization{0}. Please update your application in the organizer panel.', 'ℹ Модераторға ұйымыңыз туралы қосымша мәлімет керек{0}. Ұйымдастырушы панеліндегі өтінімді жаңартыңыз.']
    };
    var prevMt = mt;
    mt = function (x) {
      if (typeof x === 'string' && x.indexOf('@@n:') === 0) {
        try {
          var n = JSON.parse(x.slice(4)), tpl = NOTE[n.k];
          if (!tpl) return '';
          var str = tpl[lang === 'en' ? 1 : lang === 'kk' ? 2 : 0], a = n.a || [];
          if (n.k === 'org_needs_info') a = [a[0] ? ': ' + a[0] : ''];
          else if (a[0]) a = [tr(a[0])].concat(a.slice(1));
          return str.replace(/\{(\d)\}/g, function (_, i) { return a[+i] != null ? String(a[+i]) : ''; });
        } catch (e) { return ''; }
      }
      return prevMt(x);
    };
    separateRoles();

    // ----- auth -----
    auth = function (mode, preRole) {
      var reg = mode === 'register';
      if (reg && !serverSettings.registrationOpen) { toast(t('signupClosedToast')); return; }
      prevAuth(mode, preRole);
      var form = document.getElementById('authForm');
      if (!form) return;
      var notice = form.querySelector('.notice');
      if (notice) notice.textContent = reg ? 'Пароль — не короче 8 символов. Он хранится на сервере только в виде хеша.' : 'Демо-аккаунты (volunteer@, organizer@, moderator@, admin@volmatch.demo) — пароль задаётся в файле .env (DEMO_PASSWORD).';
      var pass = document.getElementById('aPass');
      if (pass && reg) { pass.minLength = 8; pass.autocomplete = 'new-password'; }
      form.onsubmit = function (e) {
        e.preventDefault();
        var btn = form.querySelector('button.primary');
        var body = { email: aEmail.value.trim().toLowerCase(), password: aPass.value };
        if (reg) {
          body.name = aName.value.trim();
          body.role = aRole.value === 'organizer' ? 'organizer' : 'volunteer';
          body.org = body.role === 'organizer' ? (document.getElementById('aOrg').value.trim() || body.name) : '';
        }
        if (btn) btn.disabled = true;
        api('POST', reg ? '/api/auth/register' : '/api/auth/login', body)
          .then(function () { return api('GET', '/api/bootstrap'); })
          .then(function (d) { enterApp(d, reg ? 'Аккаунт создан!' : 'Welcome back!'); })
          .catch(fail)
          .finally(function () { if (btn) btn.disabled = false; });
      };
    };
    logout = function () {
      api('POST', '/api/auth/logout').catch(function () {}).finally(function () { location.reload(); });
    };

    // ----- local persistence: only what is still demo-only stays in localStorage -----
    save = function () {
      if (!logged) return;
      try {
        localStorage.setItem('v5_userReports', JSON.stringify(userReports));
        localStorage.setItem('v5_supportTickets', JSON.stringify(supportTickets));
      } catch (e) {}
      queueProfileSync();
    };
    ensureSeeds = function () { if (!logged) prevEnsureSeeds(); };
    addNote = function () {};
    savedIds = function () { return logged ? favorites.slice() : prevSavedIds(); };
    resetDemo = function () { toast('Данные хранятся на сервере. Чтобы сбросить их, остановите сервер и выполните npm run reset-db.'); };

    // ----- profile -----
    var syncTimer = null;
    function queueProfileSync() {
      if (!serverUser) return;
      if (profileSig(profile, interests) === lastProfileSig) return;
      clearTimeout(syncTimer);
      syncTimer = setTimeout(function () {
        var body = { name: profile.name, city: profile.city, availability: profile.availability, about: profile.about,
          skills: profile.skills, interests: interests, photo: profile.photo || '', hideName: !!profile.hideName };
        api('PUT', '/api/me', body).then(function (r) {
          serverUser = r.user;
          profile.name = r.user.name; profile.photo = r.user.photo; profile.about = r.user.about; profile.skills = r.user.skills;
          interests = r.user.interests;
          lastProfileSig = profileSig(profile, interests);
          renderAll();
        }).catch(fail);
      }, 400);
    }
    saveProfile = function () {
      prevSaveProfile();
      if (serverUser) profile.email = serverUser.email;
    };
    fillProfile = function () {
      prevFillProfile();
      var em = document.getElementById('pEmail');
      if (em && logged) { em.readOnly = true; em.title = 'Email нельзя изменить'; }
    };

    // ----- events -----
    join = function (id) {
      if (!guard(['volunteer', 'moderator', 'admin'])) return;
      api('POST', '/api/events/' + Number(id) + '/signup').then(refresh).then(function () { closeModal(); toast(t('registered')); }).catch(fail);
    };
    cancelJoin = function (id) {
      if (!guard(['volunteer', 'moderator', 'admin'])) return;
      api('DELETE', '/api/events/' + Number(id) + '/signup').then(refresh).then(function () { closeModal(); toast(t('cancelReg')); }).catch(fail);
    };
    toggleSave = function (id) {
      if (!guard(['volunteer', 'moderator', 'admin'])) return;
      id = Number(id);
      var added = favorites.indexOf(id) < 0;
      api(added ? 'POST' : 'DELETE', '/api/favorites/' + id).then(function () {
        favorites = added ? favorites.concat(id) : favorites.filter(function (x) { return x !== id; });
        renderAll();
        if (curView === 'saved') go('saved');
        toast(added ? 'Добавлено в избранное' : 'Удалено из избранного');
      }).catch(fail);
    };

    createEvent = function () {
      if (!guard(['organizer'])) return;
      prevCreateEvent();
      var form = document.getElementById('eventForm');
      if (!form) return;
      var today = new Date().toISOString().slice(0, 10);
      form.onsubmit = function (e) {
        e.preventDefault();
        var d = new FormData(form);
        var mode = (e.submitter && e.submitter.value) || 'submit';
        if (d.get('t2') <= d.get('t1')) { toast(t('badTime')); return; }
        if (d.get('date') < today) { toast(t('badDate')); return; }
        var files = Array.prototype.slice.call((form.querySelector('input[name="img"]') || {}).files || []);
        if (files.length > 5) { toast('Можно выбрать не более 5 фотографий.'); return; }
        if (files.some(function (x) { return x.size > 5e6 || ['image/jpeg', 'image/png', 'image/webp'].indexOf(x.type) < 0; })) { toast('Используйте JPG, PNG или WebP до 5 МБ на файл.'); return; }
        // FR-10: the photo is optional; without one the category image is shown (FR-08).
        var buttons = Array.prototype.slice.call(form.querySelectorAll('button[type="submit"]'));
        buttons.forEach(function (b) { b.disabled = true; });
        Promise.all(files.map(function (f) { return compressImage(f); })).then(function (imgs) {
          return api('POST', '/api/events', {
            title: d.get('title'), category: d.get('category'), date: d.get('date'), time: d.get('t1') + '–' + d.get('t2'),
            area: d.get('area'), location: d.get('location'), needed: Number(d.get('needed')), skills: d.get('skills'),
            description: d.get('description'), images: imgs, status: mode === 'draft' ? 'draft' : 'pending'
          });
        }).then(refresh).then(function () {
          closeModal(); go('organizer');
          toast(mode === 'draft' ? 'Черновик сохранён' : 'Мероприятие отправлено на модерацию');
        }).catch(fail).finally(function () { buttons.forEach(function (b) { b.disabled = false; }); });
      };
    };
    resubmitEvent = function (id) {
      if (!guard(['organizer'])) return;
      api('POST', '/api/events/' + Number(id) + '/resubmit').then(refresh).then(function () { toast('Мероприятие повторно отправлено на модерацию'); }).catch(fail);
    };
    promote = function () {
      if (!guard(['organizer'])) return;
      var id = Number(document.getElementById('promoteSelect') && document.getElementById('promoteSelect').value);
      if (!id) { toast(t('promoteNeedsApproved') || 'Выберите одобренное событие'); return; }
      api('POST', '/api/events/' + id + '/promote').then(refresh).then(function () { toast(t('topSuccess')); }).catch(fail);
    };
    checkIn = function (key, id) {
      if (!guard(['organizer'])) return;
      var e = events.find(function (x) { return Number(x.id) === Number(id); });
      var idx = Number(String(key).split('-').pop());
      var reg = e && Array.isArray(e.registrations) ? e.registrations.filter(function (r) { return r && r.email; })[idx] : null;
      if (!reg || !reg.userId) { toast('Участник не найден'); return; }
      api('POST', '/api/events/' + Number(id) + '/attendance', { userId: reg.userId, attended: !reg.attended })
        .then(refresh).then(function () { if (window.openOrganizerRoster) window.openOrganizerRoster(Number(id)); }).catch(fail);
    };

    // ----- moderation -----
    function askReason(title, label, done) {
      openModal(title, '<form id="vmReasonForm"><div class="fg"><label for="vmReason">' + esc(label) + '</label><textarea id="vmReason" class="field" rows="4" maxlength="2000" required placeholder="' +
        esc(t('reasonPlaceholder')) + '"></textarea></div><div class="modal-actions"><button type="button" class="btn outline" onclick="closeModal()">' + esc(t('cancel')) +
        '</button><button type="submit" class="btn primary">' + esc(t('saveDecision')) + '</button></div></form>');
      document.getElementById('vmReasonForm').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var v = document.getElementById('vmReason').value.trim();
        if (!v) return;
        closeModal(); done(v);
      });
    }
    function sendStatus(id, status, reason, okText) {
      return api('POST', '/api/events/' + Number(id) + '/status', { status: status, reason: reason || '' }).then(refresh).then(function () { toast(okText); }).catch(fail);
    }
    window.__volmatchSetStatus = function (id, status) {
      if (!guard(['moderator', 'admin'])) return;
      var okText = status === 'approved' ? t('approvedToast') : status === 'rejected' ? t('rejectedToast') : t('suspendedToast');
      if (status === 'rejected' || status === 'suspended') {
        var rej = status === 'rejected';
        askReason(t(rej ? 'rejectReasonTitle' : 'suspendReasonTitle'), t(rej ? 'rejectReasonLabel' : 'suspendReasonLabel'), function (reason) { sendStatus(id, status, reason, okText); });
        return;
      }
      sendStatus(id, status, '', okText);
    };
    window.__volmatchSuspendReported = function (eventId, reportId) {
      if (!guard(['moderator', 'admin'])) return;
      askReason(t('hideReportedTitle'), t('hideReportedLabel'), function (reason) {
        var report = userReports.find(function (r) { return r.id === reportId; });
        if (report) {
          report.status = 'На рассмотрении'; report.history = report.history || [];
          report.history.push({ action: 'Событие временно скрыто', by: profile.email, at: new Date().toISOString() });
        }
        sendStatus(eventId, 'suspended', reason, t('eventHiddenToast'));
      });
    };
    verifyOrganizer = function (email) {
      if (!guard(['moderator', 'admin'])) return;
      api('POST', '/api/moderation/verifications/' + encodeURIComponent(email), { status: 'verified' }).then(refresh).then(function () { toast('Организатор подтверждён'); }).catch(fail);
    };
    requestOrgInfo = function (email) {
      if (!guard(['moderator', 'admin'])) return;
      api('POST', '/api/moderation/verifications/' + encodeURIComponent(email), { status: 'needs_info' }).then(refresh).then(function () { toast('Запрос дополнительных сведений отправлен'); }).catch(fail);
    };
    renderOrganizer = function () {
      prevRenderOrganizer();
      if (role !== 'organizer') return;
      var form = document.getElementById('orgVerifyForm');
      if (form && !form.dataset.api) {
        form.dataset.api = '1';
        form.onsubmit = function (ev) {
          ev.preventDefault();
          var d = new FormData(form);
          api('POST', '/api/organizer/verification', {
            kind: d.get('kind'), legalName: d.get('legalName'), contact: d.get('contact'), website: d.get('website'), about: d.get('about')
          }).then(refresh).then(function () { toast('Профиль организатора отправлен на проверку.'); }).catch(fail);
        };
      }
    };

    // ----- admin -----
    window.adminChangeUserRole = function (email, newRole) {
      if (!guard(['admin'])) return;
      api('PATCH', '/api/admin/users/' + encodeURIComponent(email), { role: newRole }).then(refresh).then(function () { toast(t('roleChanged')); }).catch(function (e) { fail(e); renderAdmin(); });
    };
    window.adminToggleUser = function (email) {
      if (!guard(['admin'])) return;
      var u = adminUsers.find(function (x) { return x.email === email; });
      if (!u) return;
      api('PATCH', '/api/admin/users/' + encodeURIComponent(email), { suspended: !u.suspended }).then(refresh).catch(fail);
    };
    window.adminSetPreference = function (key, value) {
      if (key !== 'registrationOpen' && key !== 'maintenanceMode') return prevSetPref(key, value);
      var body = {}; body[key] = !!value;
      api('PUT', '/api/admin/settings', body).then(function (s) { serverSettings = s; syncAdminPreferences(); }).catch(function (e) { fail(e); renderAdmin(); });
    };


    // ----- avatars: show the photo each user (or a moderator) actually set -----
    var prevAvatarUrl = avatarUrl;
    avatarUrl = function (n) {
      if (logged && profile && n === profile.name && profile.photo) return profile.photo;
      if (logged && photoMap[n]) return photoMap[n];
      return prevAvatarUrl(n);
    };

    // ----- moderators & admins: edit event photos -----
    function L(ru, en, kk) { return lang === 'en' ? en : lang === 'kk' ? (kk || ru) : ru; }
    var isStaff = function () { return role === 'moderator' || role === 'admin'; };

    window.vmEditEventPhotos = function (id) {
      if (!guard(['moderator', 'admin'])) return;
      var e = events.find(function (x) { return Number(x.id) === Number(id); });
      if (!e) return;
      var keep = (e.images && e.images.length ? e.images : (e.img ? [e.img] : [])).slice();
      var added = [];
      function draw() {
        var thumbs = keep.map(function (src, i) {
          return '<div class="vm-photo-tile"><img src="' + esc(src) + '" alt=""><button type="button" class="vm-photo-x" title="' + L('Убрать', 'Remove', 'Алып тастау') + '" data-keep="' + i + '">✕</button></div>';
        }).concat(added.map(function (src, i) {
          return '<div class="vm-photo-tile vm-new"><img src="' + src + '" alt=""><button type="button" class="vm-photo-x" data-added="' + i + '">✕</button></div>';
        })).join('');
        document.getElementById('vmPhotoGrid').innerHTML = thumbs || '<p class="tiny">' + L('Фотографий нет', 'No photos', 'Фото жоқ') + '</p>';
        document.getElementById('vmPhotoCount').textContent = (keep.length + added.length) + ' / 5';
      }
      openModal(L('Фото события', 'Event photos', 'Іс-шара фотосы'),
        '<p class="tiny" style="margin-bottom:10px">' + esc(tr(e.title)) + '</p>' +
        '<div id="vmPhotoGrid" class="vm-photo-grid"></div>' +
        '<div class="fg" style="margin-top:12px"><label>' + L('Добавить фото (JPG, PNG, WebP, до 5 штук)', 'Add photos (JPG, PNG, WebP, up to 5)', 'Фото қосу (JPG, PNG, WebP, 5-ке дейін)') +
        ' · <span id="vmPhotoCount"></span></label><input class="field" type="file" id="vmPhotoInput" accept="image/jpeg,image/png,image/webp" multiple></div>' +
        '<div class="fg"><label>' + L('Комментарий для журнала (необязательно)', 'Note for the audit log (optional)', 'Журналға түсініктеме (міндетті емес)') + '</label><input class="field" id="vmPhotoReason" maxlength="300"></div>' +
        '<div class="modal-actions"><button type="button" class="btn outline" onclick="closeModal()">' + esc(t('cancel')) + '</button><button type="button" class="btn primary" id="vmPhotoSave">' + L('Сохранить', 'Save', 'Сақтау') + '</button></div>');
      draw();
      document.getElementById('vmPhotoGrid').addEventListener('click', function (ev) {
        var b = ev.target.closest('.vm-photo-x'); if (!b) return;
        if (b.dataset.keep !== undefined) keep.splice(Number(b.dataset.keep), 1); else added.splice(Number(b.dataset.added), 1);
        draw();
      });
      document.getElementById('vmPhotoInput').addEventListener('change', function (ev) {
        var files = Array.prototype.slice.call(ev.target.files || []);
        ev.target.value = '';
        if (keep.length + added.length + files.length > 5) { toast(L('Не более 5 фотографий', 'Up to 5 photos', '5 фотодан артық емес')); return; }
        if (files.some(function (f) { return f.size > 5e6 || ['image/jpeg', 'image/png', 'image/webp'].indexOf(f.type) < 0; })) { toast('Используйте JPG, PNG или WebP до 5 МБ на файл.'); return; }
        Promise.all(files.map(function (f) { return compressImage(f); })).then(function (imgs) { added = added.concat(imgs); draw(); })
          .catch(function () { toast('Не удалось обработать изображение'); });
      });
      document.getElementById('vmPhotoSave').addEventListener('click', function () {
        var btn = this; btn.disabled = true;
        api('PUT', '/api/events/' + Number(id) + '/images', { images: keep.concat(added), reason: document.getElementById('vmPhotoReason').value })
          .then(refresh).then(function () { closeModal(); toast(L('Фото события обновлены', 'Event photos updated', 'Іс-шара фотосы жаңартылды')); })
          .catch(fail).finally(function () { btn.disabled = false; });
      });
    };
    var prevDetails = details;
    details = function (id) {
      prevDetails(id);
      if (!isStaff()) return;
      var box = document.getElementById('modalContent');
      if (!box || box.querySelector('.vm-edit-photos')) return;
      var b = document.createElement('button');
      b.className = 'btn soft vm-edit-photos'; b.type = 'button'; b.style.marginTop = '12px';
      b.textContent = '🖼 ' + L('Изменить фото события', 'Change event photos', 'Іс-шара фотосын өзгерту');
      b.onclick = function () { window.vmEditEventPhotos(id); };
      box.appendChild(b);
    };
    var prevModRow = modRow;
    modRow = function (e) {
      var html = prevModRow(e);
      var btn = '<button class="btn outline small" onclick="vmEditEventPhotos(' + Number(e.id) + ')">🖼 ' + L('Фото', 'Photos', 'Фото') + '</button>';
      return html.replace(/<\/div>\s*$/, btn + '</div>');
    };

    // ----- moderators & admins: edit users' profile photos -----
    var photoQuery = '';
    function renderUserPhotos(viewId) {
      var view = document.getElementById(viewId);
      if (!view || !isStaff()) return;
      var box = view.querySelector('.vm-user-photos');
      if (!box) {
        box = document.createElement('section');
        box.className = 'card vm-user-photos';
        box.style.marginTop = '18px';
        box.innerHTML = '<div class="head"><div><h2>' + L('Фото профилей пользователей', 'User profile photos', 'Пайдаланушы фотолары') + '</h2><p class="tiny">' +
          L('Замените или удалите неподходящее фото профиля. Действие записывается в журнал.', 'Replace or remove an inappropriate profile photo. The action is logged.', 'Орынсыз фотоны ауыстырыңыз немесе жойыңыз. Әрекет журналға жазылады.') +
          '</p></div></div><input class="field vm-photo-search" type="search" placeholder="' + L('Поиск по имени или email', 'Search by name or email', 'Аты немесе email бойынша іздеу') +
          '" style="margin:10px 0"><div class="vm-user-photo-list"></div><input type="file" class="vm-user-photo-file" accept="image/jpeg,image/png,image/webp" hidden>';
        view.appendChild(box);
        box.querySelector('.vm-photo-search').addEventListener('input', function () { photoQuery = this.value.trim().toLowerCase(); renderUserPhotos(viewId); });
        var fileInput = box.querySelector('.vm-user-photo-file');
        fileInput.addEventListener('change', function () {
          var f = fileInput.files[0], email = fileInput.dataset.email;
          fileInput.value = '';
          if (!f || !email) return;
          if (f.size > 5e6 || ['image/jpeg', 'image/png', 'image/webp'].indexOf(f.type) < 0) { toast('Используйте JPG, PNG или WebP до 5 МБ.'); return; }
          squarePhoto(f).then(function (dataUrl) { return setUserPhoto(email, dataUrl); }).catch(function () { toast('Не удалось обработать изображение'); });
        });
        box.addEventListener('click', function (ev) {
          var b = ev.target.closest('[data-photo-action]'); if (!b) return;
          if (b.dataset.photoAction === 'replace') { fileInput.dataset.email = b.dataset.email; fileInput.click(); }
          if (b.dataset.photoAction === 'remove') setUserPhoto(b.dataset.email, '');
        });
      }
      var list = adminUsers.filter(function (u) {
        if (role === 'moderator' && u.role === 'admin') return false;
        return !photoQuery || (u.name + ' ' + u.email).toLowerCase().indexOf(photoQuery) >= 0;
      });
      var search = box.querySelector('.vm-photo-search');
      if (search && search.value.trim().toLowerCase() !== photoQuery) search.value = photoQuery;
      box.querySelector('.vm-user-photo-list').innerHTML = list.map(function (u) {
        var src = u.photo || prevAvatarUrl(u.name);
        return '<div class="row"><div class="avatar" style="width:44px;height:44px;border-radius:50%;overflow:hidden"><img alt="" src="' + esc(src) + '" style="width:100%;height:100%;object-fit:cover"></div>' +
          '<div class="grow"><strong>' + esc(u.name) + '</strong><small>' + esc(u.email) + ' · ' + esc(t(u.role + 'Role')) + (u.photo ? '' : ' · ' + L('своё фото не загружено', 'no own photo', 'өз фотосы жоқ')) + '</small></div>' +
          '<button class="btn soft small" data-photo-action="replace" data-email="' + esc(u.email) + '">' + L('Заменить', 'Replace', 'Ауыстыру') + '</button>' +
          (u.photo ? '<button class="btn danger small" data-photo-action="remove" data-email="' + esc(u.email) + '">' + L('Удалить', 'Remove', 'Жою') + '</button>' : '') + '</div>';
      }).join('') || '<p class="tiny">' + L('Никого не найдено', 'Nobody found', 'Ешкім табылмады') + '</p>';
    }
    function squarePhoto(file) {
      return new Promise(function (resolve, reject) {
        var r = new FileReader(); r.onerror = reject;
        r.onload = function () {
          var im = new Image(); im.onerror = reject;
          im.onload = function () {
            var c = document.createElement('canvas'), z = Math.min(im.width, im.height);
            c.width = c.height = 240;
            c.getContext('2d').drawImage(im, (im.width - z) / 2, (im.height - z) / 2, z, z, 0, 0, 240, 240);
            resolve(c.toDataURL('image/jpeg', 0.85));
          };
          im.src = r.result;
        };
        r.readAsDataURL(file);
      });
    }
    function setUserPhoto(email, dataUrl) {
      return api('PUT', '/api/moderation/users/' + encodeURIComponent(email) + '/photo', { photo: dataUrl }).then(refresh).then(function () {
        toast(dataUrl ? L('Фото профиля заменено', 'Profile photo replaced', 'Профиль фотосы ауыстырылды') : L('Фото профиля удалено', 'Profile photo removed', 'Профиль фотосы жойылды'));
      }).catch(fail);
    }
    var prevRenderModerator = renderModerator;
    renderModerator = function () { prevRenderModerator(); if (role === 'moderator') renderUserPhotos('view-moderator'); };
    var prevRenderAdminPhotos = renderAdmin;
    renderAdmin = function () { prevRenderAdminPhotos(); if (role === 'admin') renderUserPhotos('view-admin'); };
    if (!document.getElementById('vmPhotoStyles')) {
      var st = document.createElement('style'); st.id = 'vmPhotoStyles';
      st.textContent = '.vm-photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px}' +
        '.vm-photo-tile{position:relative;aspect-ratio:4/3;border-radius:10px;overflow:hidden;background:#eef3f1}' +
        '.vm-photo-tile img{width:100%;height:100%;object-fit:cover;display:block}' +
        '.vm-photo-tile.vm-new{outline:2px solid #2aa37a}' +
        '.vm-photo-x{position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;cursor:pointer;font-size:13px}' +
        '.vm-user-photo-list .row{gap:10px}';
      document.head.appendChild(st);
    }

    // ----- messages -----
    startChat = function (name, org, ev) {
      if (!guard(['volunteer', 'organizer'])) return;
      closeModal();
      api('POST', '/api/conversations', { name: name, org: org || '', event: ev || '' }).then(function (r) {
        return api('GET', '/api/conversations').then(function (all) {
          applyConversations(all.conversations);
          chatId = r.conversation.id;
          go('messages'); renderMessages();
          setTimeout(function () { var i = document.getElementById('chatInput'); if (i) i.focus(); }, 60);
        });
      }).catch(fail);
    };
    document.getElementById('chatForm').onsubmit = function (e) {
      e.preventDefault();
      var input = document.getElementById('chatInput');
      var val = input.value.trim();
      if (!val) return;
      var th = messages.find(function (m) { return m.id === chatId; });
      if (!th) return;
      if (th.kind === 'system') { toast('На системные уведомления ответить нельзя'); return; }
      api('POST', '/api/conversations/' + th.id + '/messages', { text: val }).then(function () {
        input.value = '';
        return api('GET', '/api/conversations');
      }).then(function (all) { applyConversations(all.conversations); renderMessages(); }).catch(fail);
    };
  }

  var pollTimer = null;
  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(function () {
      if (!logged || document.visibilityState !== 'visible') return;
      api('GET', '/api/conversations').then(function (r) {
        var sig = JSON.stringify(r.conversations.map(function (c) { return [c.id, c.messages.length]; }));
        if (sig === convSig) return;
        applyConversations(r.conversations);
        if (curView === 'messages') renderMessages();
        toast(lang === 'en' ? 'New message' : lang === 'kk' ? 'Жаңа хабарлама' : 'Новое сообщение');
      }).catch(function (e) { if (e.status === 401) location.reload(); });
    }, 8000);
  }

  // ---------- start ----------
  api('GET', '/api/bootstrap').then(function (d) {
    if (!d || !Array.isArray(d.events)) throw new Error('no backend');
    backend = true;
    window.VOLMATCH_BACKEND = true;
    // Drop demo copies of server-owned data left in this browser by the static prototype.
    ['v4_accounts', 'v4_events', 'v4_profile', 'v4_messages', 'v4_interests', 'v4_attendance', 'v4_promoted', 'v4_notes', 'v6_savedByUser', 'v5_orgVerifications', 'v5_moderationAudit']
      .forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    install();
    if (d.user) enterApp(d);
    else { applyState(d); renderAll(); }
    var banner = document.querySelector('.demo-warning, #demoWarning');
    if (banner) banner.setAttribute('data-backend', 'on');
  }).catch(function () {
    // No VolMatch server behind this page (e.g. Netlify): stay in static demo mode.
    staticDemoAccounts();
  });
})();
