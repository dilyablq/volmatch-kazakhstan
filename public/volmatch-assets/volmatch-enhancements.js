(function () {
  Object.assign(T.ru, {
    filterCategory: "Направление", filterWhen: "Когда", filterSort: "Сортировать",
    onlyFree: "Только со свободными местами",
    adminUserSearch: "Поиск по имени или email", adminRoleFilter: "Роль",
    adminStatusFilter: "Статус", adminAllRoles: "Все роли", adminAllStatuses: "Все статусы",
    adminShown: "Пользователей показано", adminNoUsersMatch: "По этим условиям пользователи не найдены",
    adminExportUsers: "Скачать CSV", adminCsvName: "Имя", adminCsvEmail: "Email",
    adminCsvRole: "Роль", adminCsvStatus: "Статус",
    orgSearchEvents: "Поиск по названию или месту", orgFilterStatus: "Статус события",
    orgAllStatuses: "Все события", orgEventCount: "событий",
    orgNoMatchingEvents: "По этим условиям события не найдены",
    orgEventSpots: "Свободно", orgEventVolunteers: "волонтёров записалось",
    orgEventParticipants: "Участники", promoteNeedsApproved: "Для продвижения выберите одобренное событие.",
    status_draft: "Черновик", status_suspended: "Приостановлено",
    checkedIn: "Посетил", notCheckedIn: "Не отмечен",
    joinToRoster: "Волонтёры появятся здесь после записи на событие.",
    resubmitLabel: "Отправить снова"
  });
  Object.assign(T.en, {
    filterCategory: "Cause", filterWhen: "Date", filterSort: "Sort by",
    onlyFree: "Only events with open spots",
    adminUserSearch: "Search by name or email", adminRoleFilter: "Role",
    adminStatusFilter: "Status", adminAllRoles: "All roles", adminAllStatuses: "All statuses",
    adminShown: "users shown", adminNoUsersMatch: "No users match these filters",
    adminExportUsers: "Export CSV", adminCsvName: "Name", adminCsvEmail: "Email",
    adminCsvRole: "Role", adminCsvStatus: "Status",
    orgSearchEvents: "Search by event or location", orgFilterStatus: "Event status",
    orgAllStatuses: "All events", orgEventCount: "events",
    orgNoMatchingEvents: "No events match these filters",
    orgEventSpots: "Open", orgEventVolunteers: "volunteers signed up",
    orgEventParticipants: "Participants", promoteNeedsApproved: "Choose an approved event to promote.",
    status_draft: "Draft", status_suspended: "Paused",
    checkedIn: "Checked in", notCheckedIn: "Not checked in",
    joinToRoster: "Volunteers will appear here after they join the event.",
    resubmitLabel: "Resubmit"
  });
  Object.assign(T.kk, {
    filterCategory: "Бағыт", filterWhen: "Қашан", filterSort: "Сұрыптау",
    onlyFree: "Бос орындары бар іс-шаралар",
    adminUserSearch: "Аты немесе email бойынша іздеу", adminRoleFilter: "Рөл",
    adminStatusFilter: "Мәртебе", adminAllRoles: "Барлық рөл", adminAllStatuses: "Барлық мәртебе",
    adminShown: "көрсетілген пайдаланушы", adminNoUsersMatch: "Бұл шарттарға сай пайдаланушы жоқ",
    adminExportUsers: "CSV жүктеу", adminCsvName: "Аты", adminCsvEmail: "Email",
    adminCsvRole: "Рөл", adminCsvStatus: "Мәртебе",
    orgSearchEvents: "Іс-шара немесе орын бойынша іздеу", orgFilterStatus: "Іс-шара мәртебесі",
    orgAllStatuses: "Барлық іс-шара", orgEventCount: "іс-шара",
    orgNoMatchingEvents: "Бұл шарттарға сай іс-шара жоқ",
    orgEventSpots: "Бос орын", orgEventVolunteers: "ерікті тіркелген",
    orgEventParticipants: "Қатысушылар", promoteNeedsApproved: "Жылжыту үшін мақұлданған іс-шараны таңдаңыз.",
    status_draft: "Нобай", status_suspended: "Тоқтатылды",
    checkedIn: "Қатысты", notCheckedIn: "Белгіленбеді",
    joinToRoster: "Іс-шараға тіркелгеннен кейін еріктілер осы жерде көрінеді.",
    resubmitLabel: "Қайта жіберу"
  });

  var photos = {
    cleanup: "volmatch-assets/cleanup_astana.jpg",
    planting: "volmatch-assets/expo_planting_astana.jpg",
    expo: "volmatch-assets/expo_nuralem.webp",
    children: "volmatch-assets/children_workshop.jpg",
    seniors: "volmatch-assets/senior_digital_training.jpg",
    animals: "volmatch-assets/animal_shelter_care.jpg",
    animalVisit: "volmatch-assets/animal_shelter_visit.jpg",
    food: "volmatch-assets/food_aid_packing.png",
    clothing: "volmatch-assets/clothing_sorting.webp",
    winter: "volmatch-assets/winter_aid.jpg",
    run: "volmatch-assets/charity_run.jpg",
    blood: "volmatch-assets/blood_donation.jpg"
  };
  function trn(key) { return (T[lang] && T[lang][key]) || T.ru[key] || key; }
  function photoForEvent(event) {
    if (event && event.images && event.images.length) return event.images[0];
    if (event && event.img) return event.img;
    var title = String(event && event.title || "").toLowerCase();
    var category = String(event && event.category || "").toLowerCase();
    if (/digital|senior|цифров|старш/.test(title)) return photos.seniors;
    if (/read|school|learning|craft|обучен|школ|чтени|мастерск/.test(title)) return photos.children;
    if (/garden|plant|expo|сад|посад|озелен|теплиц/.test(title)) return /expo/.test(title) ? photos.expo : photos.planting;
    if (/clean|park|cleanup|уборк/.test(title)) return photos.cleanup;
    if (/animal|paws|shelter|приют|живот/.test(title)) return /wellness|visit|осмотр/.test(title) ? photos.animalVisit : photos.animals;
    if (/food|box|packing|продукт|набор/.test(title)) return photos.food;
    if (/cloth|sorting|одежд|сортиров/.test(title)) return photos.clothing;
    if (/winter|зим/.test(title)) return photos.winter;
    if (/run|wellbeing|забег/.test(title)) return photos.run;
    if (/blood|donat|донор|кров/.test(title)) return photos.blood;
    if (category === "environment") return photos.cleanup;
    if (category === "education") return photos.children;
    if (category === "animals") return photos.animals;
    if (category === "health") return photos.run;
    return photos.winter;
  }
  function ensureEventImages() {
    if (!Array.isArray(events)) return;
    events.forEach(function (event) {
      if (!event.img && event.images && event.images.length) event.img = event.images[0];
      if (!event.img) event.img = photoForEvent(event);
    });
  }
  ensureEventImages();
  if (typeof card === "function") {
    var priorCard = card;
    card = function (event) {
      if (event && !event.img) event.img = photoForEvent(event);
      return priorCard(event);
    };
  }

  function addFilterLabels() {
    var panel = document.getElementById("eventFilters");
    var toggle = document.getElementById("filterToggle");
    if (!panel) return;
    [["cat", "filterCategory"], ["when", "filterWhen"], ["sort", "filterSort"]].forEach(function (item) {
      var select = document.getElementById(item[0]);
      if (!select || select.parentElement.classList.contains("filter-control")) return;
      var label = document.createElement("label");
      var caption = document.createElement("span");
      label.className = "filter-control";
      caption.dataset.i = item[1];
      caption.textContent = trn(item[1]);
      select.parentNode.insertBefore(label, select);
      label.append(caption, select);
    });
    var freeLabel = document.getElementById("freeLbl");
    if (freeLabel) {
      freeLabel.dataset.i = "onlyFree";
      freeLabel.textContent = trn("onlyFree");
    }
    if (window.matchMedia("(min-width: 741px)").matches) {
      panel.classList.remove("hidden");
      if (toggle) toggle.setAttribute("aria-expanded", "true");
    }
  }
  function refreshLabels() {
    document.querySelectorAll("#eventFilters [data-i],#view-admin .admin-user-filters [data-i],#view-organizer .org-event-toolbar [data-i]").forEach(function (node) {
      var translated = T[lang] && T[lang][node.dataset.i];
      if (translated) node.textContent = translated;
    });
    var adminSearch = document.getElementById("adminUserSearch");
    var orgSearch = document.getElementById("orgEventSearch");
    if (adminSearch) adminSearch.placeholder = trn("adminUserSearch");
    if (orgSearch) orgSearch.placeholder = trn("orgSearchEvents");
    var freeLabel = document.getElementById("freeLbl");
    if (freeLabel) freeLabel.textContent = trn("onlyFree");
    updateAdminOptionLabels();
    if (typeof updateOrganizerOptionLabels === "function") updateOrganizerOptionLabels();
  }

  function accountStates() {
    try { return JSON.parse(localStorage.getItem("volmatch_admin_user_states_v1") || "{}") || {}; }
    catch (_) { return {}; }
  }
  function updateAdminOptionLabels() {
    var roles = document.getElementById("adminRoleFilter");
    if (roles) {
      var labels = {all: "adminAllRoles", volunteer: "volunteerRole", organizer: "organizerRole", moderator: "moderatorRole", admin: "adminRole"};
      Array.from(roles.options).forEach(function (option) { option.textContent = trn(labels[option.value] || option.textContent); });
    }
    var states = document.getElementById("adminStatusFilter");
    if (states) {
      var labels2 = {all: "adminAllStatuses", active: "userActive", suspended: "userSuspended"};
      Array.from(states.options).forEach(function (option) { option.textContent = trn(labels2[option.value] || option.textContent); });
    }
    var exportButton = document.getElementById("adminExportUsers");
    if (exportButton) exportButton.textContent = trn("adminExportUsers");
  }
  function applyAdminFilters() {
    var body = document.getElementById("userRows");
    if (!body) return;
    var query = String(document.getElementById("adminUserSearch") && document.getElementById("adminUserSearch").value || "").trim().toLowerCase();
    var roleFilter = document.getElementById("adminRoleFilter") && document.getElementById("adminRoleFilter").value || "all";
    var stateFilter = document.getElementById("adminStatusFilter") && document.getElementById("adminStatusFilter").value || "all";
    var suspendedMap = accountStates(), shown = 0;
    body.querySelectorAll("tr").forEach(function (row) {
      if (row.classList.contains("admin-filter-empty")) return;
      var roleSelect = row.querySelector(".admin-role-select");
      var email = roleSelect && roleSelect.dataset.email || "";
      var currentRole = roleSelect && roleSelect.value || "";
      var suspended = !!suspendedMap[email] || !!row.querySelector(".user-state.suspended");
      var match = (!query || row.innerText.toLowerCase().includes(query)) &&
        (roleFilter === "all" || currentRole === roleFilter) &&
        (stateFilter === "all" || (stateFilter === "suspended") === suspended);
      row.hidden = !match;
      if (match) shown++;
    });
    var empty = body.querySelector(".admin-filter-empty");
    if (!shown) {
      if (!empty) {
        empty = document.createElement("tr");
        empty.className = "admin-filter-empty";
        empty.innerHTML = '<td colspan="4" class="admin-user-empty"></td>';
        body.append(empty);
      }
      empty.querySelector("td").textContent = trn("adminNoUsersMatch");
    } else if (empty) empty.remove();
    var count = document.getElementById("adminUserCount");
    if (count) count.textContent = trn("adminShown") + ": " + shown;
  }
  function setupAdminFilters() {
    if (role !== "admin") return;
    var cardNode = document.querySelector("#view-admin .two>.card:first-child");
    var table = cardNode && cardNode.querySelector(".tablewrap");
    if (!table) return;
    if (!document.getElementById("adminUserSearch")) {
      var bar = document.createElement("div");
      bar.className = "admin-user-filters";
      bar.innerHTML =
        '<input class="field admin-user-search" id="adminUserSearch" type="search">' +
        '<select class="field" id="adminRoleFilter"><option value="all"></option><option value="volunteer"></option><option value="organizer"></option><option value="moderator"></option><option value="admin"></option></select>' +
        '<select class="field" id="adminStatusFilter"><option value="all"></option><option value="active"></option><option value="suspended"></option></select>' +
        '<span class="admin-user-count" id="adminUserCount"></span>' +
        '<button type="button" class="btn outline small admin-export-users" id="adminExportUsers"></button>';
      table.before(bar);
      document.getElementById("adminUserSearch").addEventListener("input", applyAdminFilters);
      document.getElementById("adminRoleFilter").addEventListener("change", applyAdminFilters);
      document.getElementById("adminStatusFilter").addEventListener("change", applyAdminFilters);
      document.getElementById("adminExportUsers").onclick = exportVisibleUsers;
    }
    var search = document.getElementById("adminUserSearch");
    if (search) { search.placeholder = trn("adminUserSearch"); search.setAttribute("aria-label", trn("adminUserSearch")); }
    var roleSelect = document.getElementById("adminRoleFilter");
    if (roleSelect) roleSelect.setAttribute("aria-label", trn("adminRoleFilter"));
    var statusSelect = document.getElementById("adminStatusFilter");
    if (statusSelect) statusSelect.setAttribute("aria-label", trn("adminStatusFilter"));
    updateAdminOptionLabels();
    applyAdminFilters();
  }
  function exportVisibleUsers() {
    if (!guard(["admin"])) return;
    var rows = [[trn("adminCsvName"), trn("adminCsvEmail"), trn("adminCsvRole"), trn("adminCsvStatus")]];
    document.querySelectorAll("#userRows tr:not([hidden])").forEach(function (row) {
      if (row.classList.contains("admin-filter-empty")) return;
      var person = row.querySelector("td:first-child");
      var name = person && person.querySelector("b") && person.querySelector("b").textContent || "";
      var select = row.querySelector(".admin-role-select");
      var status = row.querySelector(".user-state");
      rows.push([name, select && select.dataset.email || "", select ? trn(select.value + "Role") : "", status && status.textContent || ""]);
    });
    var csv = "\ufeff" + rows.map(function (row) {
      return row.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(",");
    }).join("\r\n");
    var blob = new Blob([csv], {type: "text/csv;charset=utf-8"});
    var url = URL.createObjectURL(blob), anchor = document.createElement("a");
    anchor.href = url; anchor.download = "volmatch-users.csv"; anchor.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function registrationsFor(event) {
    if (!Array.isArray(event.registrations)) event.registrations = [];
    return event.registrations.filter(function (registration) { return registration && registration.email; });
  }
  if (Array.isArray(events)) events.forEach(function (event) {
    var registrations = registrationsFor(event);
    if (event.joined && profile && profile.email && !registrations.some(function (item) { return item.email === profile.email; })) {
      registrations.push({email: profile.email, name: profile.name, skills: profile.skills || "", match: event.match || 0, status: "registered"});
    }
  });
  function renderRealRoster() {
    if (role !== "organizer") return;
    var select = document.getElementById("rosterSelect");
    var body = document.getElementById("rosterBody");
    var ownEvents = events.filter(isOwn);
    var event = ownEvents.find(function (item) { return item.id === Number(select && select.value); }) || ownEvents[0];
    if (!body) return;
    if (!event) {
      body.innerHTML = '<tr><td colspan="5" class="roster-empty">' + esc(trn("orgNoMatchingEvents")) + "</td></tr>";
      return;
    }
    var registrations = registrationsFor(event);
    body.innerHTML = registrations.map(function (person, index) {
      var mine = person.email === profile.email;
      var key = event.id + (mine ? "-me" : "-" + index);
      var checked = !!attendance[key];
      return '<tr><td><div class="person"><div class="avatar"><img alt="' + esc(person.name || person.email) + '" src="' + esc(avatarUrl(person.name || person.email)) + '"></div><b>' + esc(person.name || person.email) +
        '</b></div></td><td>' + esc(person.skills || "—") + '</td><td><span class="match">' + (Number(person.match) || 0) +
        '%</span></td><td><span class="badge">' + esc(t(checked ? "checkedIn" : "notCheckedIn")) +
        '</span></td><td><button class="btn soft small" onclick="checkIn(\'' + esc(key) + '\',' + Number(event.id) + ')">' +
        esc(t(checked ? "undo" : "checkIn")) + "</button></td></tr>";
    }).join("") || '<tr><td colspan="5" class="roster-empty">' + esc(trn("joinToRoster")) + "</td></tr>";
  }
  renderRoster = renderRealRoster;
  join = function (id) {
    if (!guard(["volunteer", "moderator", "admin"])) return;
    var event = events.find(function (item) { return Number(item.id) === Number(id); });
    if (!event || event.status !== "approved") return;
    var registrations = registrationsFor(event);
    if (registrations.some(function (item) { return item.email === profile.email; })) {
      toast(t("registered")); closeModal(); return;
    }
    if (Number(event.spots) <= 0) { toast(t("noEvents")); return; }
    registrations.push({email: profile.email, name: profile.name, skills: profile.skills || "", match: Number(event.match) || 0, status: "registered", registeredAt: new Date().toISOString()});
    event.joined = true;
    event.spots = Math.max(0, Number(event.spots) - 1);
    event.attendees = Math.max(0, Number(event.attendees) || 0) + 1;
    persistRender(); closeModal(); toast(t("registered"));
  };
  cancelJoin = function (id) {
    if (!guard(["volunteer", "moderator", "admin"])) return;
    var event = events.find(function (item) { return Number(item.id) === Number(id); });
    if (!event) return;
    var registrations = registrationsFor(event);
    var index = registrations.findIndex(function (item) { return item.email === profile.email; });
    if (index >= 0) {
      registrations.splice(index, 1);
      event.spots = Math.min(Number(event.needed) || Number(event.spots) + 1, (Number(event.spots) || 0) + 1);
      event.attendees = Math.max(0, (Number(event.attendees) || 0) - 1);
    }
    event.joined = false;
    persistRender(); closeModal(); toast(t("cancelReg"));
  };
  checkIn = function (key, id) {
    var event = events.find(function (item) { return Number(item.id) === Number(id); });
    if (!guard(["organizer"]) || !isOwn(event)) return;
    attendance[key] = !attendance[key];
    if (attendance[key] && key.endsWith("-me") && !notes.includes(key)) {
      notes.push(key);
      localStorage.setItem("v4_notes", JSON.stringify(notes));
      var gameState = game();
      var points = 100 + (gameState.n === 1 ? 50 : 0) + (gameState.n === 5 ? 150 : 0);
      addNote("@@earned:" + points + ":" + event.title);
    }
    persistRender();
  };

  function setupOrganizerTools() {
    if (role !== "organizer") return;
    var list = document.getElementById("myEvents");
    var host = list && list.parentElement;
    if (!list || !host) return;
    if (!document.getElementById("orgEventToolbar")) {
      var toolbar = document.createElement("div");
      toolbar.className = "org-event-toolbar";
      toolbar.id = "orgEventToolbar";
      toolbar.innerHTML = '<input class="field org-event-search" id="orgEventSearch" type="search">' +
        '<select class="field" id="orgEventStatus"><option value="all"></option><option value="approved"></option><option value="pending"></option><option value="rejected"></option><option value="draft"></option><option value="suspended"></option></select>' +
        '<span class="org-event-total" id="orgEventTotal"></span>';
      var heading = host.querySelector("h2");
      if (heading) heading.after(toolbar); else host.prepend(toolbar);
      document.getElementById("orgEventSearch").addEventListener("input", renderOrganizerCards);
      document.getElementById("orgEventStatus").addEventListener("change", renderOrganizerCards);
    }
    var search = document.getElementById("orgEventSearch");
    if (search) { search.placeholder = trn("orgSearchEvents"); search.setAttribute("aria-label", trn("orgSearchEvents")); }
    var status = document.getElementById("orgEventStatus");
    if (status) {
      var current = status.value;
      var options = [["all", "orgAllStatuses"], ["approved", "status_approved"], ["pending", "status_pending"], ["rejected", "status_rejected"], ["draft", "status_draft"], ["suspended", "status_suspended"]];
      status.innerHTML = options.map(function (item) { return '<option value="' + item[0] + '">' + esc(trn(item[1])) + "</option>"; }).join("");
      status.value = current || "all";
      status.setAttribute("aria-label", trn("orgFilterStatus"));
    }
  }
  function renderOrganizerCards() {
    if (role !== "organizer") return;
    var list = document.getElementById("myEvents");
    var query = String(document.getElementById("orgEventSearch") && document.getElementById("orgEventSearch").value || "").trim().toLowerCase();
    var status = document.getElementById("orgEventStatus") && document.getElementById("orgEventStatus").value || "all";
    if (!list) return;
    var ownEvents = events.filter(isOwn);
    var shown = ownEvents.filter(function (event) {
      var text = [event.title, tr(event.title), event.location, tr(event.location), event.org, tr(event.org)].join(" ").toLowerCase();
      return (status === "all" || event.status === status) && (!query || text.includes(query));
    });
    var count = document.getElementById("orgEventTotal");
    if (count) count.textContent = shown.length + " " + trn("orgEventCount");
    list.classList.add("org-event-list");
    list.innerHTML = shown.map(function (event) {
      var photo = photoForEvent(event);
      var needed = Math.max(1, Number(event.needed) || Number(event.spots) || 1);
      var occupied = Math.max(0, Math.min(needed, needed - (Number(event.spots) || 0)));
      var percent = Math.round(occupied / needed * 100);
      var registrations = registrationsFor(event).length;
      var statusText = T[lang]["status_" + event.status] || T.ru["status_" + event.status] || event.status;
      return '<article class="org-event-card"><div class="org-event-thumb"><img src="' + esc(photo) + '" alt="" loading="lazy" decoding="async"></div>' +
        '<div class="org-event-main"><div class="org-event-title"><h3>' + esc(tr(event.title)) + '</h3><span class="badge">' + esc(statusText) + "</span></div>" +
        '<div class="org-event-meta"><span>' + esc(date(event.date)) + " · " + esc(event.time || "") + '</span><span>⌖ ' + esc(tr(event.location || "")) +
        "</span><span>" + registrations + " " + esc(trn("orgEventVolunteers")) + "</span></div>" +
        '<div class="org-event-progress"><span class="org-event-progress-track"><i style="width:' + percent + '%"></i></span><span>' +
        occupied + "/" + needed + " " + esc(trn("orgEventSpots")) + "</span></div>" +
        (event.reviewReason ? '<small class="org-event-reason">' + esc(event.reviewReason) + "</small>" : "") +
        '</div><div class="org-event-actions"><button class="btn outline small" onclick="details(' + Number(event.id) + ')">' + esc(t("details")) +
        '</button><button class="btn soft small" onclick="openOrganizerRoster(' + Number(event.id) + ')">' + esc(trn("orgEventParticipants")) + "</button>" +
        (event.status === "rejected" ? '<button class="btn outline small" onclick="resubmitEvent(' + Number(event.id) + ')">' + esc(trn("resubmitLabel")) + "</button>" : "") +
        "</div></article>";
    }).join("") || '<div class="org-event-empty"><strong>' + esc(trn("orgNoMatchingEvents")) +
      '</strong><span>' + esc(trn("joinToRoster")) + '</span><br><button class="btn primary small" onclick="createEvent()">' +
      esc(t("createEvent")) + "</button></div>";
  }
  window.openOrganizerRoster = function (id) {
    var select = document.getElementById("rosterSelect");
    if (select) select.value = String(id);
    renderRealRoster();
    var table = document.getElementById("rosterBody");
    if (table && table.closest(".tablewrap")) table.closest(".tablewrap").scrollIntoView({behavior: "smooth", block: "center"});
  };
  var previousOrganizerRender = renderOrganizer;
  renderOrganizer = function () {
    if (role !== "organizer") return;
    previousOrganizerRender();
    setupOrganizerTools();
    renderOrganizerCards();
    var eligible = events.filter(function (event) { return isOwn(event) && event.status === "approved"; });
    var select = document.getElementById("promoteSelect");
    var button = document.querySelector('#view-organizer [onclick="promote()"]');
    if (select) {
      var current = select.value;
      select.innerHTML = eligible.map(function (event) { return '<option value="' + Number(event.id) + '">' + esc(tr(event.title)) + "</option>"; }).join("") ||
        '<option value="">' + esc(trn("orgNoMatchingEvents")) + "</option>";
      if (eligible.some(function (event) { return String(event.id) === current; })) select.value = current;
      select.disabled = !eligible.length;
    }
    if (button) button.disabled = !eligible.length;
    renderRealRoster();
  };
  promote = function () {
    if (!guard(["organizer"])) return;
    var id = Number(document.getElementById("promoteSelect") && document.getElementById("promoteSelect").value);
    var event = events.find(function (item) { return Number(item.id) === id; });
    if (!event || !isOwn(event) || event.status !== "approved") { toast(trn("promoteNeedsApproved")); return; }
    if (!promoted.includes(id)) promoted.push(id);
    persistRender();
    toast(t("topSuccess"));
  };

  var previousSetLang = setLang;
  setLang = function (nextLang) { previousSetLang(nextLang); refreshLabels(); };
  var previousAdminRender = renderAdmin;
  renderAdmin = function () { if (role !== "admin") return; previousAdminRender(); setupAdminFilters(); };
  addFilterLabels();
  ensureEventImages();
  if (role === "admin") setupAdminFilters();
  if (role === "organizer") {
    setupOrganizerTools();
    renderOrganizerCards();
    renderRealRoster();
  }
  if (typeof renderAll === "function") renderAll();
})();
