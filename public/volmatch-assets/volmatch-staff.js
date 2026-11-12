/*
 * VolMatch — moderator & administrator workspaces, complaints and support (server mode only).
 * Moderator: review queue, all events, complaints, organizer verification, support, users' photos, log.
 * Administrator: everything above + overview statistics, user management, platform settings.
 * Volunteers/organizers: complaints about events and support requests are stored on the server.
 */
(function () {
  'use strict';

  // ---------- i18n ----------
  var W = {
    modTitle: ['Панель модератора', 'Moderator workspace', 'Модератор панелі'],
    modSub: ['Проверка событий, жалобы, организаторы и обращения пользователей.', 'Review events, complaints, organizers and user requests.', 'Іс-шараларды, шағымдарды, ұйымдастырушыларды және өтініштерді тексеру.'],
    admTitle: ['Панель администратора', 'Admin workspace', 'Әкімші панелі'],
    admSub: ['Статистика, пользователи, модерация и настройки платформы.', 'Statistics, users, moderation and platform settings.', 'Статистика, пайдаланушылар, модерация және баптаулар.'],
    reload: ['Обновить', 'Refresh', 'Жаңарту'],
    tOverview: ['Обзор', 'Overview', 'Шолу'], tQueue: ['На проверке', 'Review queue', 'Тексеруде'], tEvents: ['Все события', 'All events', 'Барлық іс-шаралар'],
    tReports: ['Жалобы', 'Complaints', 'Шағымдар'], tOrgs: ['Организаторы', 'Organizers', 'Ұйымдастырушылар'], tSupport: ['Обращения', 'Support', 'Өтініштер'],
    tUsers: ['Пользователи', 'Users', 'Пайдаланушылар'], tLog: ['Журнал', 'Activity log', 'Журнал'], tSettings: ['Настройки', 'Settings', 'Баптаулар'],
    pendingEvents: ['Событий на проверке', 'Events to review', 'Тексерудегі іс-шаралар'], openReports: ['Открытых жалоб', 'Open complaints', 'Ашық шағымдар'],
    pendingOrgs: ['Организаторов на проверке', 'Organizers to verify', 'Тексерудегі ұйымдастырушылар'], openTickets: ['Открытых обращений', 'Open requests', 'Ашық өтініштер'],
    approve: ['Одобрить', 'Approve', 'Мақұлдау'], reject: ['Отклонить', 'Reject', 'Қабылдамау'], suspend: ['Приостановить', 'Suspend', 'Тоқтату'],
    restore: ['Вернуть в публикацию', 'Publish again', 'Қайта жариялау'], photos: ['Фото', 'Photos', 'Фото'], history: ['История', 'History', 'Тарих'],
    details: ['Подробнее', 'Details', 'Толығырақ'], del: ['Удалить', 'Delete', 'Жою'],
    queueEmpty: ['Новых событий на проверке нет. Отличная работа!', 'Nothing to review right now. Great job!', 'Тексеретін жаңа іс-шара жоқ.'],
    submitted: ['Отправлено', 'Submitted', 'Жіберілді'], needed: ['нужно волонтёров', 'volunteers needed', 'ерікті керек'],
    orgNotVerified: ['Организатор ещё не подтверждён — одобрить событие нельзя.', 'The organizer is not verified yet — the event cannot be approved.', 'Ұйымдастырушы расталмаған — іс-шараны мақұлдауға болмайды.'],
    checkOrg: ['Проверить организатора', 'Review organizer', 'Ұйымдастырушыны тексеру'],
    allStatuses: ['Все статусы', 'All statuses', 'Барлық мәртебе'], search: ['Поиск…', 'Search…', 'Іздеу…'],
    st_draft: ['Черновик', 'Draft', 'Жоба'], st_pending: ['На проверке', 'Pending', 'Тексеруде'], st_approved: ['Опубликовано', 'Published', 'Жарияланған'],
    st_rejected: ['Отклонено', 'Rejected', 'Қабылданбады'], st_suspended: ['Приостановлено', 'Suspended', 'Тоқтатылған'],
    rs_new: ['Новая', 'New', 'Жаңа'], rs_in_review: ['В работе', 'In review', 'Қаралуда'], rs_resolved: ['Решена', 'Resolved', 'Шешілді'], rs_rejected: ['Отклонена', 'Declined', 'Қабылданбады'],
    ts_new: ['Новое', 'New', 'Жаңа'], ts_in_progress: ['В работе', 'In progress', 'Жұмыста'], ts_resolved: ['Решено', 'Resolved', 'Шешілді'],
    vs_pending: ['На проверке', 'Pending', 'Тексеруде'], vs_verified: ['Подтверждён', 'Verified', 'Расталған'], vs_needs_info: ['Нужны сведения', 'Info requested', 'Мәлімет керек'],
    openOnly: ['Только открытые', 'Open only', 'Тек ашық'], all: ['Все', 'All', 'Барлығы'],
    takeReport: ['Взять в работу', 'Start review', 'Жұмысқа алу'], resolve: ['Решено', 'Resolve', 'Шешілді'], decline: ['Отклонить', 'Decline', 'Қабылдамау'],
    hideEvent: ['Скрыть событие', 'Hide event', 'Іс-шараны жасыру'], from: ['от', 'from', 'жіберген'], decision: ['Решение', 'Decision', 'Шешім'],
    resolutionTitle: ['Решение по жалобе', 'Complaint decision', 'Шағым бойынша шешім'], resolutionLabel: ['Что сделано (увидит автор жалобы)', 'What was done (the reporter will see it)', 'Не істелді (шағым авторы көреді)'],
    reportsEmpty: ['Жалоб нет.', 'No complaints.', 'Шағым жоқ.'],
    verify: ['Подтвердить', 'Verify', 'Растау'], askInfo: ['Запросить сведения', 'Request info', 'Мәлімет сұрау'],
    askInfoTitle: ['Какие сведения нужны?', 'What information is needed?', 'Қандай мәлімет керек?'], askInfoLabel: ['Сообщение организатору', 'Message to the organizer', 'Ұйымдастырушыға хабарлама'],
    orgsEmpty: ['Заявок нет.', 'No applications.', 'Өтінім жоқ.'], eventsOf: ['событий', 'events', 'іс-шара'], person: ['Физическое лицо', 'Individual', 'Жеке тұлға'], organization: ['Организация', 'Organization', 'Ұйым'],
    reply: ['Ответить', 'Reply', 'Жауап беру'], replyPh: ['Ответ пользователю…', 'Reply to the user…', 'Пайдаланушыға жауап…'], inProgress: ['В работу', 'In progress', 'Жұмысқа'], markResolved: ['Решено', 'Resolved', 'Шешілді'],
    ticketsEmpty: ['Обращений нет.', 'No requests.', 'Өтініш жоқ.'], staffMark: ['Поддержка', 'Support', 'Қолдау'],
    role: ['Роль', 'Role', 'Рөл'], status: ['Статус', 'Status', 'Мәртебе'], joined: ['Регистрация', 'Joined', 'Тіркелді'], activity: ['Активность', 'Activity', 'Белсенділік'],
    active: ['Активен', 'Active', 'Белсенді'], blocked: ['Заблокирован', 'Blocked', 'Бұғатталған'], block: ['Заблокировать', 'Block', 'Бұғаттау'], unblock: ['Разблокировать', 'Unblock', 'Бұғаттан шығару'],
    resetPw: ['Сменить пароль', 'Set password', 'Құпиясөзді өзгерту'], newPw: ['Новый пароль (не короче 8 символов)', 'New password (8+ characters)', 'Жаңа құпиясөз (8+ таңба)'],
    photoReplace: ['Заменить фото', 'Replace photo', 'Фотоны ауыстыру'], photoRemove: ['Убрать фото', 'Remove photo', 'Фотоны алып тастау'], csv: ['Скачать CSV', 'Download CSV', 'CSV жүктеу'],
    you: ['вы', 'you', 'сіз'], allRoles: ['Все роли', 'All roles', 'Барлық рөл'], lastLogin: ['последний вход', 'last login', 'соңғы кіру'],
    created: ['создал', 'created', 'құрды'], signed: ['записей', 'sign-ups', 'жазылу'], attended: ['посетил', 'attended', 'қатысты'],
    logEmpty: ['Записей нет.', 'No entries.', 'Жазба жоқ.'], allActions: ['Все действия', 'All actions', 'Барлық әрекет'],
    g_events: ['События', 'Events', 'Іс-шаралар'], g_users: ['Пользователи', 'Users', 'Пайдаланушылар'], g_reports: ['Жалобы', 'Complaints', 'Шағымдар'], g_support: ['Обращения', 'Support', 'Өтініштер'], g_orgs: ['Организаторы', 'Organizers', 'Ұйымдастырушылар'],
    usersTotal: ['Пользователей', 'Users', 'Пайдаланушылар'], new7: ['новых за 7 дней', 'new in 7 days', '7 күнде жаңа'], active7: ['Активны за 7 дней', 'Active in 7 days', '7 күнде белсенді'],
    eventsLive: ['Опубликовано событий', 'Published events', 'Жарияланған іс-шаралар'], upcoming: ['предстоящих', 'upcoming', 'алдағы'],
    signupsTotal: ['Записей на события', 'Event sign-ups', 'Іс-шараға жазылу'], attendanceRate: ['подтверждённое участие', 'confirmed attendance', 'расталған қатысу'],
    needsAttention: ['Требует внимания', 'Needs attention', 'Назар аударыңыз'], byRole: ['Пользователи по ролям', 'Users by role', 'Рөлдер бойынша'],
    byStatus: ['События по статусам', 'Events by status', 'Мәртебелер бойынша'], byCategory: ['Опубликованные события по направлениям', 'Published events by cause', 'Бағыттар бойынша'],
    recent: ['Последние действия', 'Recent activity', 'Соңғы әрекеттер'], allClear: ['Всё обработано — открытых задач нет.', 'All clear — no open tasks.', 'Барлығы өңделді.'],
    regOpen: ['Регистрация новых пользователей', 'New user registration', 'Жаңа пайдаланушыларды тіркеу'], regOpenD: ['Если выключить — создать новый аккаунт будет нельзя.', 'When off, nobody can create a new account.', 'Өшірілсе — жаңа аккаунт ашуға болмайды.'],
    maint: ['Режим техобслуживания', 'Maintenance mode', 'Техникалық қызмет режимі'], maintD: ['Войти и пользоваться сайтом сможет только администратор.', 'Only administrators can sign in and use the site.', 'Сайтты тек әкімші қолдана алады.'],
    legal: ['Правовые документы', 'Legal documents', 'Құқықтық құжаттар'], offer: ['Оферта', 'Offer', 'Оферта'], privacy: ['Конфиденциальность', 'Privacy', 'Құпиялылық'], rules: ['Правила', 'Rules', 'Ережелер'],
    saved: ['Сохранено', 'Saved', 'Сақталды'], confirmDel: ['Удалить событие безвозвратно? Записи участников тоже удалятся.', 'Delete this event permanently? Sign-ups will be deleted too.', 'Іс-шараны біржола жою керек пе?'],
    cancel: ['Отмена', 'Cancel', 'Болдырмау'], save: ['Сохранить', 'Save', 'Сақтау'], sent: ['Отправлено', 'Sent', 'Жіберілді'],
    myReports: ['Мои жалобы', 'My complaints', 'Менің шағымдарым'], myTickets: ['Мои обращения', 'My requests', 'Менің өтініштерім'],
    supportNote: ['Обращения и жалобы сохраняются на сервере. Ответ поддержки придёт сюда и в «Сообщения».', 'Requests and complaints are stored on the server. Replies appear here and in Messages.', 'Өтініштер серверде сақталады. Жауап осында және «Хабарламаларда» шығады.'],
    staffGoPanel: ['Обращения пользователей обрабатываются в вашей панели, вкладка «Обращения».', 'User requests are handled in your workspace, “Support” tab.', 'Пайдаланушы өтініштері панельдегі «Өтініштер» қойындысында.'],
    openPanel: ['Открыть панель', 'Open workspace', 'Панельді ашу'], addReply: ['Добавить сообщение', 'Add a message', 'Хабарлама қосу'], noTickets: ['Обращений пока нет.', 'No requests yet.', 'Әзірге өтініш жоқ.'], noReports: ['Жалоб пока нет.', 'No complaints yet.', 'Әзірге шағым жоқ.'],
    reportTitle: ['Пожаловаться на событие', 'Report this event', 'Іс-шараға шағымдану'], reportReason: ['Причина', 'Reason', 'Себеп'], reportBody: ['Подробности', 'Details', 'Толығырақ'],
    reportSend: ['Отправить жалобу', 'Send report', 'Шағым жіберу'], reportThanks: ['Жалоба отправлена модераторам. Решение придёт в «Сообщения».', 'Report sent to moderators. You will get the decision in Messages.', 'Шағым модераторларға жіберілді.']
  };
  function w(k) { var v = W[k]; return v ? v[lang === 'en' ? 1 : lang === 'kk' ? 2 : 0] : k; }
  function fmt(iso, withTime) {
    if (!iso) return '—';
    var d = new Date(iso); if (isNaN(d)) return '—';
    if (lang === 'kk' && window.vmKkDate) return window.vmKkDate(d, withTime) + (withTime ? '' : ' ' + d.getFullYear());
    var loc = lang === 'ru' ? 'ru-RU' : lang === 'kk' ? 'kk-KZ' : 'en-US';
    return withTime ? d.toLocaleString(loc, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function D() { return window.vmData || {}; }
  function A() { return window.vmApi; }
  function isStaff() { return role === 'moderator' || role === 'admin'; }
  function badge(text, tone) { return '<span class="vm-b vm-b-' + (tone || 'grey') + '">' + esc(text) + '</span>'; }
  var EV_TONE = { draft: 'grey', pending: 'amber', approved: 'green', rejected: 'red', suspended: 'red' };
  var RS_TONE = { new: 'amber', in_review: 'blue', resolved: 'green', rejected: 'grey' };
  var TS_TONE = { new: 'amber', in_progress: 'blue', resolved: 'green' };
  var VS_TONE = { pending: 'amber', verified: 'green', needs_info: 'blue' };
  function evBadge(s) { return badge(w('st_' + s), EV_TONE[s]); }
  function call(method, url, body, okText) {
    return A().api(method, url, body).then(function (r) { return A().refresh().then(function () { if (okText) toast(okText); return r; }); }).catch(A().fail);
  }
  function ask(title, label, cb, opts) {
    opts = opts || {};
    openModal(title, '<form id="vmAsk"><div class="fg"><label for="vmAskV">' + esc(label) + '</label>' +
      (opts.input ? '<input id="vmAskV" class="field" type="' + (opts.type || 'text') + '" minlength="' + (opts.min || 1) + '" required>' :
        '<textarea id="vmAskV" class="field" rows="4" maxlength="1000" ' + (opts.optional ? '' : 'required') + '></textarea>') +
      '</div><div class="modal-actions"><button type="button" class="btn outline" onclick="closeModal()">' + w('cancel') + '</button><button class="btn primary">' + w('save') + '</button></div></form>');
    document.getElementById('vmAsk').addEventListener('submit', function (e) {
      e.preventDefault(); var v = document.getElementById('vmAskV').value.trim();
      if (!v && !opts.optional) return; closeModal(); cb(v);
    });
    setTimeout(function () { var el = document.getElementById('vmAskV'); if (el) el.focus(); }, 50);
  }

  // ---------- styles ----------
  var css = [
    '.vm-staff .vm-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px}',
    '.vm-staff .vm-head h2{margin:0}.vm-staff .vm-head p{margin:4px 0 0;color:#5d7469;font-size:13px}',
    '.vm-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:14px}',
    '.vm-tile{background:#fff;border:1px solid #e2eee8;border-radius:16px;padding:14px 16px;cursor:pointer;transition:box-shadow .15s}',
    '.vm-tile:hover{box-shadow:0 6px 18px rgba(27,67,52,.1)}',
    '.vm-tile small{display:block;color:#5d7469;font-size:11px;font-weight:700}.vm-tile b{display:block;font-size:26px;margin-top:4px;color:#17352b}.vm-tile i{font-style:normal;font-size:11px;color:#5d7469}',
    '.vm-tile.vm-alert b{color:#c0572b}',
    '.vm-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px;padding:5px;background:#eef5f1;border-radius:14px}',
    '.vm-tabs button{border:0;background:transparent;padding:8px 12px;border-radius:10px;font-weight:700;font-size:12px;color:#3d5a4e;cursor:pointer;display:flex;gap:6px;align-items:center}',
    '.vm-tabs button.on{background:#fff;color:#11402f;box-shadow:0 2px 8px rgba(27,67,52,.12)}',
    '.vm-tabs .vm-n{min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:#e0862a;color:#fff;font-size:10px;display:inline-grid;place-items:center}',
    '.vm-b{display:inline-block;padding:3px 8px;border-radius:99px;font-size:10px;font-weight:800;white-space:nowrap}',
    '.vm-b-green{background:#e3f6ec;color:#1d7a55}.vm-b-amber{background:#fff1dc;color:#a8620f}.vm-b-red{background:#fde8ec;color:#b3374f}.vm-b-blue{background:#e6eefc;color:#2d58b0}.vm-b-grey{background:#eef1f0;color:#5d6b66}',
    '.vm-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.vm-bar .field{max-width:230px;margin:0}',
    '.vm-card{background:#fff;border:1px solid #e2eee8;border-radius:16px;padding:14px;margin-bottom:12px}',
    '.vm-q{display:grid;grid-template-columns:220px minmax(0,1fr);gap:16px}',
    '.vm-q-media{position:relative;border-radius:12px;overflow:hidden;background:#e8f3ed;min-height:160px}.vm-q-media img{width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0}',
    '.vm-q-media span{position:absolute;right:8px;bottom:8px;background:rgba(0,0,0,.6);color:#fff;font-size:10px;padding:3px 7px;border-radius:99px}',
    '.vm-q h3{margin:6px 0;font-size:16px}.vm-meta{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;color:#5d7469;margin-bottom:6px}',
    '.vm-desc{font-size:13px;line-height:1.5;color:#2c4a3e;margin:6px 0}',
    '.vm-chips{display:flex;gap:5px;flex-wrap:wrap}.vm-chips span{background:#eef5f1;border-radius:99px;padding:3px 8px;font-size:10px;font-weight:700;color:#3d5a4e}',
    '.vm-warn{background:#fff6e8;border:1px solid #f5d9a8;color:#8a5410;border-radius:10px;padding:8px 10px;font-size:12px;margin:8px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
    '.vm-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}',
    '.vm-table{width:100%;border-collapse:collapse;font-size:12px}.vm-table th{text-align:left;color:#5d7469;font-size:10px;text-transform:uppercase;letter-spacing:.04em;padding:8px;border-bottom:1px solid #e2eee8}',
    '.vm-table td{padding:9px 8px;border-bottom:1px solid #eef3f1;vertical-align:middle}.vm-table tr:last-child td{border-bottom:0}',
    '.vm-thumb{width:46px;height:36px;border-radius:8px;object-fit:cover;background:#e8f3ed;display:block}',
    '.vm-ava{width:34px;height:34px;border-radius:50%;object-fit:cover;background:#e8f3ed;flex:none}',
    '.vm-person{display:flex;gap:9px;align-items:center}.vm-person b{display:block;font-size:12px}.vm-person small{color:#5d7469;font-size:11px}',
    '.vm-scroll{overflow-x:auto}',
    '.vm-table td .vm-actions{flex-wrap:nowrap}.vm-table td small{white-space:nowrap}',
    '.vm-thread{margin:8px 0;display:flex;flex-direction:column;gap:6px}.vm-msg{background:#f4f7f6;border-radius:10px;padding:8px 10px;font-size:12px;max-width:85%}',
    '.vm-msg.vm-staffmsg{background:#e6f5ee;align-self:flex-end}.vm-msg small{display:block;color:#5d7469;font-size:10px;margin-bottom:2px}',
    '.vm-reply{display:flex;gap:6px;margin-top:6px}.vm-reply textarea{flex:1;min-height:38px;margin:0}',
    '.vm-bars .vm-row{display:grid;grid-template-columns:130px 1fr 34px;gap:8px;align-items:center;font-size:12px;margin:6px 0}',
    '.vm-bars .vm-track{height:9px;background:#eef3f1;border-radius:99px;overflow:hidden}.vm-bars .vm-track i{display:block;height:100%;background:#2a9d6f;border-radius:99px}',
    '.vm-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}',
    '.vm-toggle{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid #eef3f1}.vm-toggle:last-child{border-bottom:0}',
    '.vm-toggle b{display:block;font-size:13px}.vm-toggle small{color:#5d7469;font-size:12px}.vm-toggle input{width:20px;height:20px;accent-color:#178366}',
    '.vm-log{font-size:12px}.vm-log .vm-row{display:grid;grid-template-columns:120px minmax(0,1fr);gap:10px;padding:8px 0;border-bottom:1px solid #eef3f1}',
    '.vm-log time{color:#5d7469;font-size:11px}',
    '.vm-empty{padding:26px;text-align:center;color:#5d7469;font-size:13px}',
    'body.vm-backend [onclick="resetDemo()"],body.vm-backend #view-profile .profilegrid>.card:last-child>.btn[onclick="resetDemo()"]{display:none!important}',
    '@media (max-width:740px){.vm-q{grid-template-columns:1fr}.vm-q-media{min-height:150px}.vm-log .vm-row{grid-template-columns:1fr}}'
  ].join('\n');
  var styleEl = document.createElement('style'); styleEl.textContent = css; document.head.appendChild(styleEl);

  // ---------- panel frame ----------
  var tab = { moderator: 'queue', admin: 'overview' };
  var filt = { evStatus: 'all', evQ: '', rep: 'open', tic: 'open', uQ: '', uRole: 'all', log: 'all' };
  function counts() {
    var d = D();
    return {
      queue: events.filter(function (e) { return e.status === 'pending'; }).length,
      reports: (d.reports || []).filter(function (r) { return r.status === 'new' || r.status === 'in_review'; }).length,
      orgs: (d.verifications || []).filter(function (v) { return v.statusCode === 'pending'; }).length,
      support: (d.tickets || []).filter(function (t) { return t.status !== 'resolved'; }).length
    };
  }
  function tabsFor(r) {
    return r === 'admin' ? ['overview', 'users', 'queue', 'events', 'reports', 'orgs', 'support', 'log', 'settings']
      : ['queue', 'events', 'reports', 'orgs', 'users', 'log']; // Table 17: support tickets are handled by administrators
  }
  var TAB_LABEL = { overview: 'tOverview', queue: 'tQueue', events: 'tEvents', reports: 'tReports', orgs: 'tOrgs', support: 'tSupport', users: 'tUsers', log: 'tLog', settings: 'tSettings' };

  function host(viewId) {
    var view = document.getElementById(viewId);
    if (!view) return null;
    var box = view.querySelector('.vm-staff');
    if (!box) {
      Array.prototype.forEach.call(view.children, function (c) { c.style.display = 'none'; });
      box = document.createElement('div'); box.className = 'vm-staff';
      view.appendChild(box);
    }
    return box;
  }
  function renderPanel() {
    if (!isStaff()) return;
    var box = host(role === 'admin' ? 'view-admin' : 'view-moderator');
    if (!box) return;
    var c = counts(), cur = tab[role];
    var tiles = [
      ['queue', w('pendingEvents'), c.queue], ['reports', w('openReports'), c.reports], ['orgs', w('pendingOrgs'), c.orgs]
    ].map(function (x) { return '<div class="vm-tile' + (x[2] ? ' vm-alert' : '') + '" onclick="vmStaff.tab(\'' + x[0] + '\')"><small>' + esc(x[1]) + '</small><b>' + x[2] + '</b></div>'; }).join('');
    box.innerHTML = '<div class="vm-head"><div><h2>' + w(role === 'admin' ? 'admTitle' : 'modTitle') + '</h2><p>' + w(role === 'admin' ? 'admSub' : 'modSub') + '</p></div>' +
      '<button class="btn outline small" onclick="vmStaff.reload()">↻ ' + w('reload') + '</button></div>' +
      (role === 'moderator' ? '<div class="vm-tiles">' + tiles + '</div>' : '') +
      '<div class="vm-tabs">' + tabsFor(role).map(function (k) {
        var n = c[k] || 0;
        return '<button class="' + (k === cur ? 'on' : '') + '" onclick="vmStaff.tab(\'' + k + '\')">' + w(TAB_LABEL[k]) + (n ? '<span class="vm-n">' + n + '</span>' : '') + '</button>';
      }).join('') + '</div><div id="vmStaffBody"></div>';
    var body = document.getElementById('vmStaffBody');
    var R = { overview: tOverview, queue: tQueue, events: tEventsTab, reports: tReports, orgs: tOrgs, support: tSupport, users: tUsers, log: tLog, settings: tSettings };
    body.innerHTML = (R[cur] || tQueue)();
    bindBody(body);
    var navBtn = document.querySelector('#nav [data-view="' + (role === 'admin' ? 'admin' : 'moderator') + '"]');
    if (navBtn) {
      var total = c.queue + c.reports + c.orgs + c.support, b = navBtn.querySelector('.vm-navn');
      if (!b) { b = document.createElement('span'); b.className = 'vm-navn vm-b vm-b-amber'; b.style.marginLeft = 'auto'; navBtn.appendChild(b); }
      b.textContent = total; b.style.display = total ? '' : 'none';
    }
  }

  // ---------- tabs ----------
  function eventRowActions(e, compact) {
    var id = Number(e.id), a = [];
    if (e.status === 'pending' || e.status === 'rejected') a.push('<button class="btn primary small" onclick="setStatus(' + id + ',\'approved\')">' + w('approve') + '</button>');
    if (e.status === 'pending') a.push('<button class="btn danger small" onclick="setStatus(' + id + ',\'rejected\')">' + w('reject') + '</button>');
    if (e.status === 'approved') a.push('<button class="btn outline small" onclick="setStatus(' + id + ',\'suspended\')">' + w('suspend') + '</button>');
    if (e.status === 'suspended') a.push('<button class="btn primary small" onclick="setStatus(' + id + ',\'approved\')">' + w('restore') + '</button>');
    a.push('<button class="btn soft small" onclick="vmEditEventPhotos(' + id + ')">🖼 ' + w('photos') + '</button>');
    a.push('<button class="btn outline small" onclick="showAudit(' + id + ')">' + w('history') + '</button>');
    if (!compact) a.push('<button class="btn outline small" onclick="details(' + id + ')">' + w('details') + '</button>');
    if (role === 'admin') a.push('<button class="btn danger small" onclick="vmStaff.delEvent(' + id + ')">' + w('del') + '</button>');
    return a.join('');
  }
  function orgVer(e) { var v = (D().verifications || []).find(function (x) { return x.email === e.createdBy; }); return v ? v.statusCode : (e.createdBy ? 'none' : 'verified'); }

  function tQueue() {
    var list = events.filter(function (e) { return e.status === 'pending'; }).sort(function (a, b) { return String(a.createdAt).localeCompare(String(b.createdAt)); });
    if (!list.length) return '<div class="vm-card vm-empty">✅ ' + w('queueEmpty') + '</div>';
    return list.map(function (e) {
      var imgs = e.images && e.images.length ? e.images : (e.img ? [e.img] : []), ver = orgVer(e);
      return '<article class="vm-card vm-q"><div class="vm-q-media">' + (imgs[0] ? '<img src="' + esc(imgs[0]) + '" alt="">' : '') + (imgs.length > 1 ? '<span>+' + (imgs.length - 1) + '</span>' : '') + '</div>' +
        '<div><div class="vm-meta">' + badge(tr(e.category), 'blue') + ' <span>' + w('submitted') + ': ' + fmt(e.createdAt, true) + '</span></div>' +
        '<h3>' + esc(tr(e.title)) + '</h3><div class="vm-meta"><span>🏢 ' + esc(tr(e.org)) + ' ' + (ver === 'verified' ? badge(w('vs_verified'), 'green') : badge(ver === 'none' ? w('vs_pending') : w('vs_' + ver), VS_TONE[ver] || 'amber')) + '</span>' +
        '<span>📅 ' + esc(date(e.date)) + ' · ' + esc(e.time) + '</span><span>📍 ' + esc(tr(e.location)) + '</span><span>👥 ' + Number(e.needed) + ' ' + w('needed') + '</span></div>' +
        '<div class="vm-desc">' + esc(tr(e.description || '')) + '</div><div class="vm-chips">' + (e.skills || []).map(function (s) { return '<span>' + esc(tr(s)) + '</span>'; }).join('') + '</div>' +
        (ver !== 'verified' ? '<div class="vm-warn">⚠ ' + w('orgNotVerified') + ' <button class="btn outline small" onclick="vmStaff.tab(\'orgs\')">' + w('checkOrg') + '</button></div>' : '') +
        '<div class="vm-actions">' + eventRowActions(e) + '</div></div></article>';
    }).join('');
  }

  function tEventsTab() {
    var q = filt.evQ.toLowerCase();
    var list = events.filter(function (e) {
      return (filt.evStatus === 'all' || e.status === filt.evStatus) &&
        (!q || [e.title, tr(e.title), e.org, e.location].join(' ').toLowerCase().indexOf(q) >= 0);
    }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var opts = ['all', 'pending', 'approved', 'suspended', 'rejected', 'draft'].map(function (s) {
      return '<option value="' + s + '"' + (filt.evStatus === s ? ' selected' : '') + '>' + (s === 'all' ? w('allStatuses') : w('st_' + s)) + '</option>';
    }).join('');
    return '<div class="vm-bar"><select class="field" data-f="evStatus">' + opts + '</select><input class="field" data-f="evQ" placeholder="' + w('search') + '" value="' + esc(filt.evQ) + '"></div>' +
      '<div class="vm-card vm-scroll"><table class="vm-table"><thead><tr><th></th><th>' + w('tEvents') + '</th><th>📅</th><th>' + w('status') + '</th><th>👥</th><th></th></tr></thead><tbody>' +
      (list.map(function (e) {
        var p = e.img || (e.images && e.images[0]) || '', taken = Number(e.needed) - Number(e.spots);
        return '<tr><td>' + (p ? '<img class="vm-thumb" src="' + esc(p) + '" alt="">' : '<span class="vm-thumb"></span>') + '</td><td><b>' + esc(tr(e.title)) + '</b><br><small style="color:#5d7469">' + esc(tr(e.org)) + '</small>' +
          (e.reviewReason ? '<br><small style="color:#b3374f">' + esc(e.reviewReason) + '</small>' : '') + '</td><td>' + esc(date(e.date)) + '</td><td>' + evBadge(e.status) + '</td><td>' + taken + '/' + Number(e.needed) + '</td>' +
          '<td><div class="vm-actions" style="margin:0">' + eventRowActions(e, true) + '<button class="btn outline small" onclick="details(' + Number(e.id) + ')">' + w('details') + '</button></div></td></tr>';
      }).join('') || '<tr><td colspan="6" class="vm-empty">—</td></tr>') + '</tbody></table></div>';
  }

  function tReports() {
    var all = D().reports || [];
    var list = all.filter(function (r) { return filt.rep === 'all' || r.status === 'new' || r.status === 'in_review'; });
    return '<div class="vm-bar"><select class="field" data-f="rep"><option value="open"' + (filt.rep === 'open' ? ' selected' : '') + '>' + w('openOnly') + '</option><option value="all"' + (filt.rep === 'all' ? ' selected' : '') + '>' + w('all') + ' (' + all.length + ')</option></select></div>' +
      (list.map(function (r) {
        var open = r.status === 'new' || r.status === 'in_review';
        var ev = events.find(function (e) { return Number(e.id) === Number(r.eventId); });
        return '<div class="vm-card"><div class="vm-meta">' + badge(w('rs_' + r.status), RS_TONE[r.status]) + ' <span>#' + r.id + ' · ' + fmt(r.createdAt, true) + '</span><span>' + w('from') + ' ' + esc(r.reporterName || '') + ' (' + esc(r.reporter || '—') + ')</span></div>' +
          '<h3 style="margin:4px 0;font-size:15px">' + esc(tr(r.eventTitle)) + ' ' + (r.eventStatus ? evBadge(r.eventStatus) : '') + '</h3>' +
          '<div class="vm-chips"><span>' + esc(r.category) + '</span></div><div class="vm-desc">' + esc(r.body) + '</div>' +
          (r.resolution ? '<div class="vm-warn" style="background:#eef7f2;border-color:#cfe8da;color:#1d5c43">✔ ' + w('decision') + ': ' + esc(r.resolution) + (r.handledBy ? ' — ' + esc(r.handledBy) : '') + '</div>' : '') +
          '<div class="vm-actions">' + (r.status === 'new' ? '<button class="btn soft small" onclick="vmStaff.report(' + r.id + ',\'in_review\')">' + w('takeReport') + '</button>' : '') +
          (open ? '<button class="btn primary small" onclick="vmStaff.report(' + r.id + ',\'resolved\')">' + w('resolve') + '</button><button class="btn outline small" onclick="vmStaff.report(' + r.id + ',\'rejected\')">' + w('decline') + '</button>' : '') +
          (open && ev && ev.status === 'approved' ? '<button class="btn danger small" onclick="vmStaff.hideReported(' + Number(ev.id) + ',' + r.id + ')">' + w('hideEvent') + '</button>' : '') +
          (ev ? '<button class="btn outline small" onclick="details(' + Number(ev.id) + ')">' + w('details') + '</button>' : '') + '</div></div>';
      }).join('') || '<div class="vm-card vm-empty">' + w('reportsEmpty') + '</div>');
  }

  function tOrgs() {
    var list = (D().verifications || []).slice().sort(function (a, b) { return (a.statusCode === 'pending' ? 0 : 1) - (b.statusCode === 'pending' ? 0 : 1); });
    return list.map(function (v) {
      var evs = events.filter(function (e) { return e.createdBy === v.email; }), pend = evs.filter(function (e) { return e.status === 'pending'; }).length;
      return '<div class="vm-card"><div class="vm-meta">' + badge(w('vs_' + v.statusCode), VS_TONE[v.statusCode]) + ' <span>' + w('submitted') + ': ' + fmt(v.submittedAt) + '</span>' + (v.reviewedAt ? '<span>✔ ' + fmt(v.reviewedAt) + '</span>' : '') + '</div>' +
        '<h3 style="margin:4px 0;font-size:15px">' + esc(v.legalName || v.email) + '</h3>' +
        '<div class="vm-meta"><span>' + w(v.kind === 'organization' ? 'organization' : 'person') + '</span><span>✉ ' + esc(v.contact || v.email) + '</span>' +
        (v.website ? '<span>🌐 ' + esc(v.website) + '</span>' : '') + '<span>' + evs.length + ' ' + w('eventsOf') + (pend ? ' (' + pend + ' ' + w('st_pending').toLowerCase() + ')' : '') + '</span></div>' +
        (v.about ? '<div class="vm-desc">' + esc(v.about) + '</div>' : '') +
        '<div class="vm-actions">' + (v.statusCode !== 'verified' ? '<button class="btn primary small" onclick="vmStaff.verify(\'' + esc(v.email) + '\')">' + w('verify') + '</button>' : '') +
        '<button class="btn outline small" onclick="vmStaff.askOrg(\'' + esc(v.email) + '\')">' + w('askInfo') + '</button></div></div>';
    }).join('') || '<div class="vm-card vm-empty">' + w('orgsEmpty') + '</div>';
  }

  function threadHtml(t) {
    return '<div class="vm-thread"><div class="vm-msg"><small>' + esc(t.userName || t.user) + ' · ' + fmt(t.createdAt, true) + '</small>' + esc(t.body) + '</div>' +
      (t.messages || []).map(function (m) {
        return '<div class="vm-msg' + (m.staff ? ' vm-staffmsg' : '') + '"><small>' + (m.staff ? '🛟 ' + w('staffMark') + ' · ' : '') + esc(m.by) + ' · ' + fmt(m.at, true) + '</small>' + esc(m.body) + '</div>';
      }).join('') + '</div>';
  }
  function tSupport() {
    var all = D().tickets || [];
    var list = all.filter(function (t) { return filt.tic === 'all' || t.status !== 'resolved'; });
    return '<div class="vm-bar"><select class="field" data-f="tic"><option value="open"' + (filt.tic === 'open' ? ' selected' : '') + '>' + w('openOnly') + '</option><option value="all"' + (filt.tic === 'all' ? ' selected' : '') + '>' + w('all') + ' (' + all.length + ')</option></select></div>' +
      (list.map(function (t) {
        return '<div class="vm-card"><div class="vm-meta">' + badge(w('ts_' + t.status), TS_TONE[t.status]) + '<span>#' + t.id + ' · ' + esc(t.category) + '</span><span>' + esc(t.userName || '') + ' (' + esc(t.user) + ', ' + esc(window.t(t.userRole + 'Role')) + ')</span></div>' +
          '<h3 style="margin:4px 0;font-size:15px">' + esc(t.subject) + '</h3>' + threadHtml(t) +
          '<form class="vm-reply" data-ticket="' + t.id + '"><textarea class="field" required maxlength="3000" placeholder="' + w('replyPh') + '"></textarea><button class="btn primary small">' + w('reply') + '</button></form>' +
          '<div class="vm-actions">' + (t.status === 'new' ? '<button class="btn soft small" onclick="vmStaff.ticket(' + t.id + ',\'in_progress\')">' + w('inProgress') + '</button>' : '') +
          (t.status !== 'resolved' ? '<button class="btn outline small" onclick="vmStaff.ticket(' + t.id + ',\'resolved\')">✔ ' + w('markResolved') + '</button>' : '') + '</div></div>';
      }).join('') || '<div class="vm-card vm-empty">' + w('ticketsEmpty') + '</div>');
  }

  function tUsers() {
    var users = D().users || [], q = filt.uQ.toLowerCase(), adm = role === 'admin';
    var list = users.filter(function (u) {
      return (filt.uRole === 'all' || u.role === filt.uRole || (filt.uRole === 'blocked' && u.suspended)) &&
        (!q || (u.name + ' ' + u.email + ' ' + u.org).toLowerCase().indexOf(q) >= 0);
    });
    var roles = ['volunteer', 'organizer', 'moderator', 'admin'];
    var ropts = '<option value="all">' + w('allRoles') + '</option>' + roles.map(function (r) { return '<option value="' + r + '"' + (filt.uRole === r ? ' selected' : '') + '>' + esc(window.t(r + 'Role')) + '</option>'; }).join('') +
      '<option value="blocked"' + (filt.uRole === 'blocked' ? ' selected' : '') + '>' + w('blocked') + '</option>';
    return '<div class="vm-bar"><input class="field" data-f="uQ" placeholder="' + w('search') + '" value="' + esc(filt.uQ) + '"><select class="field" data-f="uRole">' + ropts + '</select>' +
      (adm ? '<button class="btn outline small" onclick="vmStaff.csv()">⬇ ' + w('csv') + '</button>' : '') + '<span class="tiny" style="align-self:center">' + list.length + ' / ' + users.length + '</span></div>' +
      '<div class="vm-card vm-scroll"><table class="vm-table"><thead><tr><th>' + w('tUsers') + '</th><th>' + w('role') + '</th><th>' + w('status') + '</th><th>' + w('activity') + '</th><th>' + w('joined') + '</th><th></th></tr></thead><tbody>' +
      list.map(function (u) {
        var self = u.email === profile.email, canPhoto = !(role === 'moderator' && u.role === 'admin');
        var src = u.photo || avatarUrl(u.name);
        var roleCell = adm && !self ? '<select class="field" style="margin:0;min-width:130px" onchange="vmStaff.setRole(\'' + esc(u.email) + '\',this.value)">' +
          roles.map(function (r) { return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + esc(window.t(r + 'Role')) + '</option>'; }).join('') + '</select>' : esc(window.t(u.role + 'Role'));
        var act = [];
        if (canPhoto) act.push('<button class="btn soft small" onclick="vmStaff.photo(\'' + esc(u.email) + '\')">' + w('photoReplace') + '</button>');
        if (canPhoto && u.photo) act.push('<button class="btn outline small" onclick="vmStaff.photoRemove(\'' + esc(u.email) + '\')">' + w('photoRemove') + '</button>');
        if (adm && !self) {
          act.push('<button class="btn ' + (u.suspended ? 'primary' : 'danger') + ' small" onclick="vmStaff.block(\'' + esc(u.email) + '\',' + (!u.suspended) + ')">' + w(u.suspended ? 'unblock' : 'block') + '</button>');
          act.push('<button class="btn outline small" onclick="vmStaff.password(\'' + esc(u.email) + '\')">' + w('resetPw') + '</button>');
        }
        return '<tr><td><div class="vm-person"><img class="vm-ava" src="' + esc(src) + '" alt=""><div><b>' + esc(u.name) + (self ? ' (' + w('you') + ')' : '') + '</b><small>' + esc(u.email) + (u.org ? ' · ' + esc(tr(u.org)) : '') + '</small></div></div></td>' +
          '<td>' + roleCell + '</td><td>' + (u.suspended ? badge(w('blocked'), 'red') : badge(w('active'), 'green')) + '</td>' +
          '<td><small>' + (u.role === 'organizer' ? w('created') + ': ' + (u.eventsCreated || 0) + '<br>' : '') + w('signed') + ': ' + (u.signups || 0) + '<br>' + w('attended') + ': ' + (u.attended || 0) +
          (u.lastLogin ? '<br>' + w('lastLogin') + ': ' + fmt(u.lastLogin, true) : '') + '</small></td><td><small>' + fmt(u.createdAt) + '</small></td><td><div class="vm-actions" style="margin:0">' + act.join('') + '</div></td></tr>';
      }).join('') + '</tbody></table></div><input type="file" id="vmUserPhotoFile" accept="image/jpeg,image/png,image/webp" hidden>';
  }

  var ACT = {
    approved: ['✅', 'Событие одобрено', 'Event approved', 'Іс-шара мақұлданды', 'events'], rejected: ['❌', 'Событие отклонено', 'Event rejected', 'Іс-шара қабылданбады', 'events'],
    suspended: ['⏸', 'Событие приостановлено', 'Event suspended', 'Іс-шара тоқтатылды', 'events'], pending: ['📝', 'Отправлено на проверку', 'Sent for review', 'Тексеруге жіберілді', 'events'],
    draft: ['📝', 'Черновик создан', 'Draft created', 'Жоба құрылды', 'events'], edited: ['✏️', 'Событие изменено', 'Event edited', 'Іс-шара өзгертілді', 'events'],
    resubmitted: ['🔁', 'Повторно отправлено', 'Resubmitted', 'Қайта жіберілді', 'events'], deleted: ['🗑', 'Событие удалено', 'Event deleted', 'Іс-шара жойылды', 'events'],
    promoted: ['⭐', 'Продвижение события', 'Event promoted', 'Іс-шара жарнамаланды', 'events'], photos_changed: ['🖼', 'Фото события изменены', 'Event photos changed', 'Іс-шара фотосы өзгертілді', 'events'],
    checked_in: ['🙋', 'Отмечено присутствие', 'Attendance confirmed', 'Қатысу белгіленді', 'events'], check_in_undone: ['↩️', 'Отметка снята', 'Attendance undone', 'Белгі алынды', 'events'],
    organizer_verified: ['✔', 'Организатор подтверждён', 'Organizer verified', 'Ұйымдастырушы расталды', 'orgs'], organizer_info_requested: ['ℹ', 'Запрошены сведения', 'Info requested', 'Мәлімет сұралды', 'orgs'],
    role_changed: ['👤', 'Изменена роль', 'Role changed', 'Рөл өзгертілді', 'users'], user_suspended: ['⛔', 'Пользователь заблокирован', 'User blocked', 'Пайдаланушы бұғатталды', 'users'],
    user_restored: ['✅', 'Пользователь разблокирован', 'User unblocked', 'Пайдаланушы бұғаттан шықты', 'users'], password_reset: ['🔑', 'Пароль изменён администратором', 'Password set by admin', 'Құпиясөз өзгертілді', 'users'],
    user_photo_changed: ['🖼', 'Фото профиля заменено', 'Profile photo replaced', 'Профиль фотосы ауыстырылды', 'users'], user_photo_removed: ['🖼', 'Фото профиля удалено', 'Profile photo removed', 'Профиль фотосы жойылды', 'users'],
    report_created: ['⚑', 'Новая жалоба', 'New complaint', 'Жаңа шағым', 'reports'], report_in_review: ['⚑', 'Жалоба взята в работу', 'Complaint in review', 'Шағым қаралуда', 'reports'],
    report_resolved: ['⚑', 'Жалоба решена', 'Complaint resolved', 'Шағым шешілді', 'reports'], report_rejected: ['⚑', 'Жалоба отклонена', 'Complaint declined', 'Шағым қабылданбады', 'reports'], report_new: ['⚑', 'Жалоба открыта снова', 'Complaint reopened', 'Шағым қайта ашылды', 'reports'],
    ticket_replied: ['💬', 'Ответ на обращение', 'Support reply', 'Өтінішке жауап', 'support'], ticket_in_progress: ['💬', 'Обращение в работе', 'Request in progress', 'Өтініш жұмыста', 'support'],
    ticket_resolved: ['💬', 'Обращение решено', 'Request resolved', 'Өтініш шешілді', 'support'], ticket_new: ['💬', 'Обращение открыто снова', 'Request reopened', 'Өтініш қайта ашылды', 'support']
  };
  function actLabel(a) { var x = ACT[a]; return x ? x[0] + ' ' + x[lang === 'en' ? 2 : lang === 'kk' ? 3 : 1] : a; }
  function tLog() {
    var all = moderationAudit || [];
    var list = all.filter(function (a) { return filt.log === 'all' || (ACT[a.action] || [])[4] === filt.log; }).slice(0, 200);
    var groups = ['events', 'users', 'reports', 'support', 'orgs'];
    return '<div class="vm-bar"><select class="field" data-f="log"><option value="all">' + w('allActions') + '</option>' + groups.map(function (g) { return '<option value="' + g + '"' + (filt.log === g ? ' selected' : '') + '>' + w('g_' + g) + '</option>'; }).join('') + '</select></div>' +
      '<div class="vm-card vm-log">' + (list.map(function (a) {
        var ev = a.eventId ? events.find(function (e) { return Number(e.id) === Number(a.eventId); }) : null;
        return '<div class="vm-row"><time>' + fmt(a.at, true) + '</time><div><b>' + esc(actLabel(a.action)) + '</b>' + (ev ? ' — ' + esc(tr(ev.title)) : '') +
          '<br><small style="color:#5d7469">' + esc(a.by || 'system') + (a.reason ? ' · ' + esc(a.reason) : '') + '</small></div></div>';
      }).join('') || '<div class="vm-empty">' + w('logEmpty') + '</div>') + '</div>';
  }

  function bars(obj, labelFn, color) {
    var keys = Object.keys(obj || {}), max = Math.max.apply(null, [1].concat(keys.map(function (k) { return obj[k]; })));
    return '<div class="vm-bars">' + keys.map(function (k) {
      return '<div class="vm-row"><span>' + esc(labelFn(k)) + '</span><span class="vm-track"><i style="width:' + Math.round(obj[k] / max * 100) + '%;' + (color ? 'background:' + color : '') + '"></i></span><b>' + obj[k] + '</b></div>';
    }).join('') + '</div>';
  }
  function tOverview() {
    var s = D().stats; if (!s) return '<div class="vm-card vm-empty">…</div>';
    var c = counts(), live = (s.events.byStatus || {}).approved || 0, rate = s.signups.total ? Math.round(s.signups.attended / s.signups.total * 100) : 0;
    var tile = function (label, value, sub, tabKey, alert) {
      return '<div class="vm-tile' + (alert ? ' vm-alert' : '') + '"' + (tabKey ? ' onclick="vmStaff.tab(\'' + tabKey + '\')"' : '') + '><small>' + esc(label) + '</small><b>' + value + '</b>' + (sub ? '<i>' + esc(sub) + '</i>' : '') + '</div>';
    };
    var attention = [['queue', w('pendingEvents'), c.queue], ['reports', w('openReports'), c.reports], ['orgs', w('pendingOrgs'), c.orgs], ['support', w('openTickets'), c.support]].filter(function (x) { return x[2]; });
    return '<div class="vm-tiles">' + tile(w('usersTotal'), s.users.total, '+' + s.users.new7 + ' ' + w('new7'), 'users') + tile(w('active7'), s.users.active7, '', 'users') +
      tile(w('eventsLive'), live, s.events.upcoming + ' ' + w('upcoming'), 'events') + tile(w('signupsTotal'), s.signups.total, rate + '% ' + w('attendanceRate'), '') + '</div>' +
      '<div class="vm-grid2"><div class="vm-card"><h3 style="margin:0 0 8px;font-size:14px">' + w('needsAttention') + '</h3>' +
      (attention.map(function (x) { return '<div class="vm-toggle" style="cursor:pointer" onclick="vmStaff.tab(\'' + x[0] + '\')"><b>' + esc(x[1]) + '</b><span class="vm-b vm-b-amber">' + x[2] + '</span></div>'; }).join('') || '<p class="tiny">✅ ' + w('allClear') + '</p>') + '</div>' +
      '<div class="vm-card"><h3 style="margin:0 0 8px;font-size:14px">' + w('byRole') + '</h3>' + bars(s.users.byRole, function (k) { return window.t(k + 'Role'); }, '#3b6fd8') + '</div>' +
      '<div class="vm-card"><h3 style="margin:0 0 8px;font-size:14px">' + w('byStatus') + '</h3>' + bars(s.events.byStatus, function (k) { return w('st_' + k); }, '#e0862a') + '</div>' +
      '<div class="vm-card"><h3 style="margin:0 0 8px;font-size:14px">' + w('byCategory') + '</h3>' + bars(s.events.byCategory, function (k) { return tr(k); }) + '</div></div>' +
      '<div class="vm-card vm-log"><h3 style="margin:0 0 8px;font-size:14px">' + w('recent') + '</h3>' + (moderationAudit || []).slice(0, 8).map(function (a) {
        return '<div class="vm-row"><time>' + fmt(a.at, true) + '</time><div><b>' + esc(actLabel(a.action)) + '</b><br><small style="color:#5d7469">' + esc(a.by || 'system') + (a.reason ? ' · ' + esc(a.reason) : '') + '</small></div></div>';
      }).join('') + ((moderationAudit || []).length ? '' : '<div class="vm-empty">' + w('logEmpty') + '</div>') + '</div>';
  }

  function tSettings() {
    var st = D().settings || {};
    var row = function (key, title, desc) {
      return '<label class="vm-toggle"><span><b>' + esc(title) + '</b><small>' + esc(desc) + '</small></span><input type="checkbox" ' + (st[key] ? 'checked' : '') + ' onchange="vmStaff.setting(\'' + key + '\',this.checked)"></label>';
    };
    return '<div class="vm-card">' + row('registrationOpen', w('regOpen'), w('regOpenD')) + row('maintenanceMode', w('maint'), w('maintD')) + '</div>' +
      '<div class="vm-card"><h3 style="margin:0 0 8px;font-size:14px">' + w('legal') + '</h3><div class="vm-actions"><button class="btn outline small" onclick="legal(\'offer\')">' + w('offer') + '</button>' +
      '<button class="btn outline small" onclick="legal(\'privacy\')">' + w('privacy') + '</button><button class="btn outline small" onclick="legal(\'rules\')">' + w('rules') + '</button></div></div>';
  }

  function bindBody(body) {
    body.querySelectorAll('[data-f]').forEach(function (el) {
      var ev = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(ev, function () {
        filt[el.dataset.f] = el.value;
        var pos = el.selectionStart;
        renderPanel();
        var again = document.querySelector('#vmStaffBody [data-f="' + el.dataset.f + '"]');
        if (again && ev === 'input') { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) {} }
      });
    });
    body.querySelectorAll('form.vm-reply').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = f.querySelector('textarea').value.trim(); if (!text) return;
        call('POST', '/api/support/tickets/' + f.dataset.ticket + '/messages', { body: text }, w('sent'));
      });
    });
    var file = body.querySelector('#vmUserPhotoFile');
    if (file) file.addEventListener('change', function () {
      var f = file.files[0], email = file.dataset.email; file.value = '';
      if (!f || !email) return;
      if (f.size > 5e6 || ['image/jpeg', 'image/png', 'image/webp'].indexOf(f.type) < 0) { toast('JPG, PNG, WebP ≤ 5 MB'); return; }
      squarePhoto(f).then(function (url) { return call('PUT', '/api/moderation/users/' + encodeURIComponent(email) + '/photo', { photo: url }, '✔'); });
    });
  }
  function squarePhoto(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader(); r.onerror = reject;
      r.onload = function () {
        var im = new Image(); im.onerror = reject;
        im.onload = function () {
          var c = document.createElement('canvas'), z = Math.min(im.width, im.height); c.width = c.height = 240;
          c.getContext('2d').drawImage(im, (im.width - z) / 2, (im.height - z) / 2, z, z, 0, 0, 240, 240);
          resolve(c.toDataURL('image/jpeg', 0.85));
        };
        im.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }

  // ---------- actions ----------
  window.vmStaff = {
    tab: function (k) { tab[role] = k; renderPanel(); var v = document.getElementById(role === 'admin' ? 'view-admin' : 'view-moderator'); if (v) v.scrollIntoView({ block: 'start' }); },
    reload: function () { A().refresh().then(function () { toast('↻'); }); },
    delEvent: function (id) {
      openModal(w('del'), '<p class="modal-confirm-copy">' + w('confirmDel') + '</p><div class="modal-actions"><button class="btn outline" onclick="closeModal()">' + w('cancel') + '</button><button class="btn danger" id="vmDelOk">' + w('del') + '</button></div>');
      document.getElementById('vmDelOk').onclick = function () { closeModal(); call('DELETE', '/api/events/' + Number(id), undefined, '🗑'); };
    },
    report: function (id, status) {
      if (status === 'in_review') return call('PATCH', '/api/moderation/reports/' + id, { status: status }, '✔');
      ask(w('resolutionTitle'), w('resolutionLabel'), function (text) { call('PATCH', '/api/moderation/reports/' + id, { status: status, resolution: text }, '✔'); });
    },
    hideReported: function (eventId, reportId) {
      ask(t('hideReportedTitle'), t('hideReportedLabel'), function (reason) {
        A().api('POST', '/api/events/' + eventId + '/status', { status: 'suspended', reason: reason })
          .then(function () { return A().api('PATCH', '/api/moderation/reports/' + reportId, { status: 'resolved', resolution: reason }); })
          .then(A().refresh).then(function () { toast(t('eventHiddenToast')); }).catch(A().fail);
      });
    },
    verify: function (email) { call('POST', '/api/moderation/verifications/' + encodeURIComponent(email), { status: 'verified' }, '✔ ' + w('vs_verified')); },
    askOrg: function (email) { ask(w('askInfoTitle'), w('askInfoLabel'), function (note) { call('POST', '/api/moderation/verifications/' + encodeURIComponent(email), { status: 'needs_info', note: note }, w('sent')); }); },
    ticket: function (id, status) { call('PATCH', '/api/moderation/tickets/' + id, { status: status }, '✔'); },
    setRole: function (email, r) { call('PATCH', '/api/admin/users/' + encodeURIComponent(email), { role: r }, t('roleChanged')); },
    block: function (email, on) { call('PATCH', '/api/admin/users/' + encodeURIComponent(email), { suspended: !!on }, on ? t('userSuspendedToast') : t('userRestoredToast')); },
    password: function (email) {
      ask(w('resetPw') + ': ' + email, w('newPw'), function (pw) {
        if (pw.length < 8) { toast(w('newPw')); return; }
        call('PATCH', '/api/admin/users/' + encodeURIComponent(email), { password: pw }, '🔑 ' + w('saved'));
      }, { input: true, type: 'text', min: 8 });
    },
    photo: function (email) { var f = document.getElementById('vmUserPhotoFile'); if (f) { f.dataset.email = email; f.click(); } },
    photoRemove: function (email) { call('PUT', '/api/moderation/users/' + encodeURIComponent(email) + '/photo', { photo: '' }, '✔'); },
    setting: function (key, value) { var b = {}; b[key] = !!value; call('PUT', '/api/admin/settings', b, w('saved')); },
    csv: function () {
      var rows = [['name', 'email', 'role', 'organization', 'status', 'joined', 'events_created', 'signups', 'attended']].concat((D().users || []).map(function (u) {
        return [u.name, u.email, u.role, u.org || '', u.suspended ? 'blocked' : 'active', (u.createdAt || '').slice(0, 10), u.eventsCreated || 0, u.signups || 0, u.attended || 0];
      }));
      var csvText = '﻿' + rows.map(function (r) { return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csvText], { type: 'text/csv;charset=utf-8' }));
      a.download = 'volmatch-users-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    }
  };

  // ---------- readable event history ----------
  function installHistory() {
    showAudit = function (id) {
      var list = (moderationAudit || []).filter(function (a) { return Number(a.eventId) === Number(id); });
      var e = events.find(function (x) { return Number(x.id) === Number(id); });
      openModal(w('history') + (e ? ': ' + tr(e.title) : ''), '<div class="vm-log">' + (list.map(function (a) {
        return '<div class="vm-row"><time>' + fmt(a.at, true) + '</time><div><b>' + esc(actLabel(a.action)) + '</b><br><small style="color:#5d7469">' + esc(a.by || 'system') + (a.reason ? ' · ' + esc(a.reason) : '') + '</small></div></div>';
      }).join('') || '<div class="vm-empty">' + w('logEmpty') + '</div>') + '</div>');
    };
  }

  // ---------- volunteers & organizers: complaints and support ----------
  var REPORT_CATS = [['Подозрение на мошенничество', 'Suspected fraud', 'Алаяқтық күдігі'], ['Недостоверная информация', 'Inaccurate information', 'Жалған ақпарат'],
    ['Опасность для участников', 'Safety risk for participants', 'Қатысушыларға қауіп'], ['Нарушение правил платформы', 'Breaks platform rules', 'Ереже бұзу'],
    ['Неподходящий контент', 'Inappropriate content', 'Орынсыз контент'], ['Другое', 'Other', 'Басқа']];
  function installUserSide() {
    reportEvent = function (id) {
      if (!guard(['volunteer', 'organizer'])) return;
      var e = events.find(function (x) { return Number(x.id) === Number(id); }); if (!e) return;
      openModal(w('reportTitle'), '<p class="tiny" style="margin-bottom:8px">' + esc(tr(e.title)) + '</p><form id="vmReportForm" class="formgrid"><div class="fg full"><label>' + w('reportReason') + '</label><select class="field" name="category">' +
        REPORT_CATS.map(function (c) { return '<option value="' + esc(c[0]) + '">' + esc(c[lang === 'en' ? 1 : lang === 'kk' ? 2 : 0]) + '</option>'; }).join('') +
        '</select></div><div class="fg full"><label>' + w('reportBody') + '</label><textarea class="field" name="body" rows="4" required maxlength="2000"></textarea></div><div class="fg full"><button class="btn primary">' + w('reportSend') + '</button></div></form>');
      document.getElementById('vmReportForm').addEventListener('submit', function (ev) {
        ev.preventDefault(); var d = new FormData(ev.target);
        A().api('POST', '/api/events/' + Number(id) + '/report', { category: d.get('category'), body: d.get('body') })
          .then(A().refresh).then(function () { closeModal(); toast(w('reportThanks')); }).catch(A().fail);
      });
    };
    createSupportTicket = function (form) {
      var d = new FormData(form);
      A().api('POST', '/api/support/tickets', { subject: d.get('subject'), category: d.get('category'), body: d.get('body') })
        .then(function () { form.reset(); return A().refresh(); }).then(function () { toast(w('sent')); }).catch(A().fail);
    };
    var baseRenderSupport = renderSupport;
    renderSupport = function () {
      if (!logged) return baseRenderSupport();
      var view = document.getElementById('view-support'); if (!view) return;
      var p = view.querySelector('.head p'); if (p) p.textContent = w('supportNote');
      var listBox = document.getElementById('supportList');
      var mine = D().myTickets || [], reps = D().myReports || [];
      if (listBox) {
        var h = listBox.parentElement && listBox.parentElement.querySelector('h2'); if (h) h.textContent = w('myTickets');
        listBox.innerHTML = mine.map(function (tk) {
          return '<div class="vm-card" style="margin-bottom:10px"><div class="vm-meta">' + badge(w('ts_' + tk.status), TS_TONE[tk.status]) + '<span>#' + tk.id + ' · ' + esc(tk.category) + ' · ' + fmt(tk.createdAt) + '</span></div>' +
            '<b>' + esc(tk.subject) + '</b>' + threadHtml(tk) + '<form class="vm-reply" data-ticket="' + tk.id + '"><textarea class="field" required maxlength="3000" placeholder="' + w('addReply') + '"></textarea><button class="btn outline small">➤</button></form></div>';
        }).join('') || '<p class="tiny">' + w('noTickets') + '</p>';
        listBox.querySelectorAll('form.vm-reply').forEach(function (f) {
          f.addEventListener('submit', function (e) {
            e.preventDefault(); var text = f.querySelector('textarea').value.trim(); if (!text) return;
            call('POST', '/api/support/tickets/' + f.dataset.ticket + '/messages', { body: text }, w('sent'));
          });
        });
      }
      var repBox = document.getElementById('vmMyReports');
      if (!repBox && listBox) {
        repBox = document.createElement('div'); repBox.id = 'vmMyReports'; repBox.className = 'card'; repBox.style.marginTop = '14px';
        view.appendChild(repBox);
      }
      if (repBox) {
        repBox.innerHTML = '<h2>' + w('myReports') + '</h2>' + (reps.map(function (r) {
          return '<div class="vm-card" style="margin:8px 0 0"><div class="vm-meta">' + badge(w('rs_' + r.status), RS_TONE[r.status]) + '<span>' + fmt(r.createdAt) + '</span></div><b>' + esc(tr(r.eventTitle)) + '</b>' +
            '<div class="vm-desc">' + esc(r.category) + ': ' + esc(r.body) + '</div>' + (r.resolution ? '<div class="vm-warn" style="background:#eef7f2;border-color:#cfe8da;color:#1d5c43">✔ ' + w('decision') + ': ' + esc(r.resolution) + '</div>' : '') + '</div>';
        }).join('') || '<p class="tiny">' + w('noReports') + '</p>');
      }
      var staffBox = document.getElementById('staffSupport');
      if (staffBox) {
        staffBox.style.display = role === 'admin' ? '' : 'none';
        if (role === 'admin') staffBox.innerHTML = '<h2>' + w('tSupport') + '</h2><p class="tiny">' + w('staffGoPanel') + '</p><button class="btn primary small" onclick="tabSupportGo()">' + w('openPanel') + '</button>';
      }
    };
    window.tabSupportGo = function () { tab[role] = 'support'; go(role === 'admin' ? 'admin' : 'moderator'); };
  }

  // ---------- wire up once the server connection is known ----------
  function serverTexts() {
    // Texts of the static prototype that are no longer true once the server is used.
    var TXT = {
      privacyNotice: ['Данные профиля хранятся на сервере VolMatch, пароль — только в зашифрованном виде.', 'Your profile is stored on the VolMatch server; the password is stored only as a secure hash.', 'Профиль деректері VolMatch серверінде сақталады, құпиясөз тек шифрланған түрде.'],
      warning: ['⚠️ Учебный проект VolMatch. Оплата не проводится; часть событий и организаций — демонстрационные.', '⚠️ VolMatch student project. No payments are processed; some events and organizations are demo data.', '⚠️ VolMatch оқу жобасы. Төлем жүргізілмейді; кейбір іс-шаралар демо болып табылады.']
    };
    ['ru', 'en', 'kk'].forEach(function (l, i) { Object.keys(TXT).forEach(function (k) { if (T[l]) T[l][k] = TXT[k][i]; }); });
    document.querySelectorAll('[data-i="privacyNotice"],[data-i="warning"]').forEach(function (el) { el.textContent = T[lang][el.dataset.i]; });
    document.body.classList.add('vm-backend');
  }

  function start() {
    if (!window.VOLMATCH_BACKEND || !window.vmApi) return false;
    serverTexts();
    installHistory();
    installUserSide();
    renderModerator = function () { if (role === 'moderator') renderPanel(); };
    renderAdmin = function () { if (role === 'admin') renderPanel(); };
    if (logged) { renderPanel(); renderSupport(); }
    return true;
  }
  if (!start()) {
    var tries = 0, timer = setInterval(function () { if (start() || ++tries > 60) clearInterval(timer); }, 250);
  }
})();
