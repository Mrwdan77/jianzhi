/* app.js — 入口：hash 路由、事件委托、表单校验、渲染管线、toast
 * 依赖加载顺序：mock-data.js → store.js → match.js → views.js → app.js */
window.JZ = window.JZ || {};
(function (JZ) {
  'use strict';

  JZ.App = {};

  // ===== 状态 =====

  var state = JZ.state = {
    jobs: [],
    applications: [],
    profile: JZ.DEFAULT_PROFILE,
    ui: { role: 'student', sortBy: 'latest', filters: defaultFilters() },
    // 渲染派生数据（computeMaps 一次算好，视图查表）
    matchMap: {},      // jobId -> score 结果
    appliedMap: {},    // jobId -> 我（isMine）的报名
    acceptedMap: {},   // jobId -> 已录用人数
    appCountMap: {},   // jobId -> 报名总数
    fullMap: {},       // jobId -> 是否已招满
    profileEmpty: false,
    isDefaultProfile: false,
    expandedJobId: null
  };

  var viewRoot = null;
  var lastViewKey = '';
  var searchTimer = null;
  var toastTimer = null;

  function defaultFilters() {
    return { q: '', category: '', days: [], slots: [], minPay: 0, maxDist: 0 };
  }

  function genId(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function findJob(id) {
    for (var i = 0; i < state.jobs.length; i++) if (state.jobs[i].id === id) return state.jobs[i];
    return null;
  }

  // ===== 数据加载 =====

  function reloadFromStore() {
    state.jobs = JZ.Store.getJobs();
    state.applications = JZ.Store.getApplications();
    state.profile = JZ.Store.getProfile();
  }

  function loadUiFromStore() {
    var ui = JZ.Store.getUi() || {};
    var savedFilters = ui.filters || {};
    var f = defaultFilters();
    // 旧版本数据可能缺字段，逐项兜底
    if (typeof savedFilters.q === 'string') f.q = savedFilters.q;
    if (typeof savedFilters.category === 'string') f.category = savedFilters.category;
    if (Array.isArray(savedFilters.days)) f.days = savedFilters.days;
    if (Array.isArray(savedFilters.slots)) f.slots = savedFilters.slots;
    if (typeof savedFilters.minPay === 'number') f.minPay = savedFilters.minPay;
    if (typeof savedFilters.maxDist === 'number') f.maxDist = savedFilters.maxDist;
    state.ui = {
      role: ui.role === 'merchant' ? 'merchant' : 'student',
      sortBy: ui.sortBy === 'match' ? 'match' : 'latest',
      filters: f
    };
  }

  function persistUi() {
    JZ.Store.saveUi({ role: state.ui.role, sortBy: state.ui.sortBy, filters: state.ui.filters });
  }

  /** 一次遍历算出所有渲染派生数据 */
  function computeMaps() {
    state.profileEmpty = JZ.Match.isProfileEmpty(state.profile);
    state.isDefaultProfile = JSON.stringify(state.profile) === JSON.stringify(JZ.DEFAULT_PROFILE);
    state.matchMap = {};
    state.appliedMap = {};
    state.acceptedMap = {};
    state.appCountMap = {};
    state.fullMap = {};
    state.jobs.forEach(function (job) {
      var accepted = 0, total = 0, mine = null;
      state.applications.forEach(function (a) {
        if (a.jobId !== job.id) return;
        total++;
        if (a.status === 'accepted') accepted++;
        if (a.isMine && !mine) mine = a;
      });
      state.acceptedMap[job.id] = accepted;
      state.appCountMap[job.id] = total;
      state.fullMap[job.id] = accepted >= job.headcount;
      state.appliedMap[job.id] = mine || null;
      if (!state.profileEmpty) state.matchMap[job.id] = JZ.Match.score(job, state.profile);
    });
  }

  // ===== 路由 =====

  function parseRoute() {
    var parts = location.hash.replace(/^#\/?/, '').split('/');
    if (parts[0] === 'merchant') {
      if (parts[1] === 'publish') return { role: 'merchant', view: 'publish' };
      return { role: 'merchant', view: 'manage' };
    }
    if (parts[0] === 'student') {
      if (parts[1] === 'job' && parts[2]) return { role: 'student', view: 'jobDetail', jobId: parts[2] };
      if (parts[1] === 'profile') return { role: 'student', view: 'profile' };
      return { role: 'student', view: 'jobs' };
    }
    return null;
  }

  function defaultHash() {
    return state.ui.role === 'merchant' ? '#/merchant/manage' : '#/student/jobs';
  }

  // ===== 渲染 =====

  function render() {
    var route = parseRoute();
    if (!route) {
      location.replace('#' + defaultHash());
      return;
    }
    var viewKey = route.role + '/' + route.view + (route.jobId ? '/' + route.jobId : '');
    var viewChanged = viewKey !== lastViewKey;
    lastViewKey = viewKey;

    if (route.role !== state.ui.role) {
      state.ui.role = route.role;
      persistUi();
    }

    computeMaps();
    var html;
    if (route.view === 'jobs') html = JZ.Views.studentJobsHtml();
    else if (route.view === 'jobDetail') html = JZ.Views.studentJobDetailHtml(route.jobId);
    else if (route.view === 'profile') html = JZ.Views.studentProfileHtml();
    else if (route.view === 'publish') html = JZ.Views.merchantPublishHtml();
    else html = JZ.Views.merchantManageHtml();

    viewRoot.innerHTML = html;
    updateChrome(route);
    if (viewChanged) window.scrollTo(0, 0);
  }

  function updateChrome(route) {
    document.getElementById('role-btn-student').classList.toggle('active', route.role === 'student');
    document.getElementById('role-btn-merchant').classList.toggle('active', route.role === 'merchant');
    var links = route.role === 'student'
      ? [['#/student/jobs', '岗位列表', 'jobs'], ['#/student/profile', '我的档案', 'profile']]
      : [['#/merchant/publish', '发布岗位', 'publish'], ['#/merchant/manage', '岗位管理', 'manage']];
    document.getElementById('subnav').innerHTML = links.map(function (l) {
      return '<a href="' + l[0] + '"' + (route.view === l[2] ? ' class="active"' : '') + '>' + l[1] + '</a>';
    }).join('');
  }

  // ===== Toast =====

  JZ.App.toast = function (msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    void el.offsetWidth; // 强制 reflow，保证过渡动画生效
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.hidden = true; }, 300);
    }, 2500);
  };

  // ===== 表单工具 =====

  function val(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }

  function numVal(form, name) {
    var raw = form.querySelector('[name="' + name + '"]').value.trim();
    if (raw === '') return 0;
    var n = parseFloat(raw);
    return isNaN(n) ? NaN : n;
  }

  function checkedVals(form, name) {
    var vals = [];
    form.querySelectorAll('input[name="' + name + '"]:checked').forEach(function (cb) { vals.push(cb.value); });
    return vals;
  }

  function markError(form, fieldName) {
    var el = form.querySelector('[data-field="' + fieldName + '"]');
    if (el) el.classList.add('error');
  }

  function clearErrors(form) {
    form.querySelectorAll('.field.error').forEach(function (el) { el.classList.remove('error'); });
  }

  // ===== 业务动作 =====

  function handleApplySubmit(form) {
    clearErrors(form);
    var route = parseRoute();
    var name = val(form, 'studentName');
    var phone = val(form, 'studentPhone');
    var note = val(form, 'note');
    var ok = true;
    if (!name) { markError(form, 'studentName'); ok = false; }
    if (!/^1[3-9]\d{9}$/.test(phone)) { markError(form, 'studentPhone'); ok = false; }
    if (!ok) return;

    var prev = null;
    state.applications.forEach(function (a) { if (a.jobId === route.jobId && a.isMine) prev = a; });
    if (prev && prev.status !== 'rejected') {
      JZ.App.toast('你已报名该岗位');
      render();
      return;
    }
    if (prev) {
      JZ.Store.updateApplication(prev.id, { studentName: name, studentPhone: phone, note: note, status: 'pending', createdAt: Date.now() });
    } else {
      JZ.Store.addApplication({
        id: genId('app_'),
        jobId: route.jobId,
        studentName: name,
        studentPhone: phone,
        note: note,
        status: 'pending',
        createdAt: Date.now(),
        isMine: true
      });
    }
    reloadFromStore();
    JZ.App.toast('报名成功，商家会尽快联系你');
    render();
  }

  function handleProfileSubmit(form) {
    clearErrors(form);
    var phone = val(form, 'phone');
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) { markError(form, 'phone'); return; }
    var expectPay = numVal(form, 'expectPay');
    var maxD = numVal(form, 'maxDistanceKm');
    if (isNaN(expectPay) || expectPay < 0) { markError(form, 'expectPay'); return; }
    if (isNaN(maxD) || maxD < 0) { markError(form, 'maxDistanceKm'); return; }

    var skills = [];
    form.querySelectorAll('[data-chip-group="skills"] .chip.active').forEach(function (c) { skills.push(c.getAttribute('data-value')); });
    var days = [], slots = [];
    form.querySelectorAll('input[name="time"]:checked').forEach(function (cb) {
      var parts = cb.value.split('_');
      if (days.indexOf(parts[0]) < 0) days.push(parts[0]);
      if (slots.indexOf(parts[1]) < 0) slots.push(parts[1]);
    });

    JZ.Store.saveProfile({
      name: val(form, 'name'),
      school: val(form, 'school'),
      phone: phone,
      skills: skills,
      availableDays: days,
      availableSlots: slots,
      expectPay: expectPay,
      maxDistanceKm: maxD
    });
    reloadFromStore();
    JZ.App.toast('档案已保存，匹配度已重新计算');
    location.hash = '#/student/jobs';
  }

  function handlePublishSubmit(form) {
    clearErrors(form);
    var title = val(form, 'title');
    var merchantName = val(form, 'merchantName');
    var district = val(form, 'district');
    var contact = val(form, 'contact');
    var pay = numVal(form, 'pay');
    var headcount = numVal(form, 'headcount');
    var distanceKm = numVal(form, 'distanceKm');
    var description = val(form, 'description');
    var category = null;
    form.querySelectorAll('[data-chip-group="category"] .chip.active').forEach(function (c) { category = c.getAttribute('data-value'); });
    var weekendDays = checkedVals(form, 'weekendDays');
    var timeSlots = checkedVals(form, 'timeSlots');
    var skills = [];
    form.querySelectorAll('[data-chip-group="skills"] .chip.active').forEach(function (c) { skills.push(c.getAttribute('data-value')); });

    var ok = true;
    if (title.length < 2 || title.length > 30) { markError(form, 'title'); ok = false; }
    if (!merchantName) { markError(form, 'merchantName'); ok = false; }
    if (!district) { markError(form, 'district'); ok = false; }
    if (isNaN(pay) || pay < 15 || pay > 200) { markError(form, 'pay'); ok = false; }
    if (isNaN(headcount) || headcount < 1 || headcount > 50) { markError(form, 'headcount'); ok = false; }
    if (isNaN(distanceKm) || distanceKm < 0 || distanceKm > 50) { markError(form, 'distanceKm'); ok = false; }
    if (!contact) { markError(form, 'contact'); ok = false; }
    if (!category) { markError(form, 'category'); ok = false; }
    if (!weekendDays.length) { markError(form, 'weekendDays'); ok = false; }
    if (!timeSlots.length) { markError(form, 'timeSlots'); ok = false; }
    if (!skills.length) { markError(form, 'skills'); ok = false; }
    if (description.length > 200) { markError(form, 'description'); ok = false; }
    if (!ok) return;

    JZ.Store.addJob({
      id: genId('job_'),
      title: title,
      merchantName: merchantName,
      category: category,
      description: description,
      pay: Math.round(pay),
      district: district,
      distanceKm: distanceKm,
      weekendDays: weekendDays,
      timeSlots: timeSlots,
      headcount: Math.round(headcount),
      skills: skills,
      contact: contact,
      status: 'active',
      createdAt: Date.now(),
      isMock: false
    });
    reloadFromStore();
    JZ.App.toast('岗位发布成功');
    location.hash = '#/merchant/manage';
  }

  function handleFilterClick(el) {
    var key = el.getAttribute('data-filter');
    var value = el.getAttribute('data-value');
    var f = state.ui.filters;
    if (key === 'category') {
      f.category = value || '';
    } else if (key === 'day') {
      var i = f.days.indexOf(value);
      if (i >= 0) f.days.splice(i, 1); else f.days.push(value);
    } else if (key === 'slot') {
      var j = f.slots.indexOf(value);
      if (j >= 0) f.slots.splice(j, 1); else f.slots.push(value);
    } else if (key === 'pay') {
      f.minPay = parseInt(value, 10) || 0;
    } else if (key === 'dist') {
      f.maxDist = parseInt(value, 10) || 0;
    } else if (key === 'sort') {
      state.ui.sortBy = value === 'match' ? 'match' : 'latest';
    }
    persistUi();
    render();
  }

  function addCustomSkill() {
    var input = document.getElementById('custom-skill-input');
    var s = input.value.trim();
    if (!s) return;
    var group = viewRoot.querySelector('[data-chip-group="skills"]');
    if (!group) return;
    var dup = false;
    group.querySelectorAll('.chip').forEach(function (c) { if (c.getAttribute('data-value') === s) dup = true; });
    if (dup) { input.value = ''; return; }
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip active';
    chip.setAttribute('data-action', 'toggle-skill');
    chip.setAttribute('data-value', s);
    chip.setAttribute('aria-pressed', 'true');
    chip.textContent = s; // textContent 赋值，天然防 XSS
    group.appendChild(chip);
    input.value = '';
  }

  // ===== 事件绑定 =====

  function bindEvents() {
    viewRoot.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]');
      if (!el) return;
      switch (el.getAttribute('data-action')) {
        case 'open-job':
          location.hash = '#/student/job/' + el.getAttribute('data-id');
          break;
        case 'go-back':
          e.preventDefault(); // 有历史可退也可不退：统一回列表，hash 天然支持浏览器后退键
          location.hash = '#/student/jobs';
          break;
        case 'go-profile':
          location.hash = '#/student/profile';
          break;
        case 'apply-open': {
          var form = viewRoot.querySelector('form[data-form="apply"]');
          var btn = viewRoot.querySelector('[data-action="apply-open"]');
          if (form) form.hidden = false;
          if (btn) btn.hidden = true;
          break;
        }
        case 'apply-cancel': {
          var f2 = viewRoot.querySelector('form[data-form="apply"]');
          var b2 = viewRoot.querySelector('[data-action="apply-open"]');
          if (f2) f2.hidden = true;
          if (b2) b2.hidden = false;
          break;
        }
        case 'toggle-filter':
          handleFilterClick(el);
          break;
        case 'clear-filters':
          state.ui.filters = defaultFilters();
          persistUi();
          render();
          break;
        case 'toggle-skill':
          el.classList.toggle('active');
          el.setAttribute('aria-pressed', el.classList.contains('active') ? 'true' : 'false');
          break;
        case 'pick-category': {
          var group = el.closest('[data-chip-group]');
          if (group) {
            group.querySelectorAll('[data-action="pick-category"]').forEach(function (c) {
              c.classList.remove('active');
              c.setAttribute('aria-pressed', 'false');
            });
          }
          el.classList.add('active');
          el.setAttribute('aria-pressed', 'true');
          break;
        }
        case 'add-custom-skill':
          addCustomSkill();
          break;
        case 'toggle-applicants': {
          var id = el.getAttribute('data-id');
          state.expandedJobId = state.expandedJobId === id ? null : id;
          render();
          break;
        }
        case 'toggle-job-status': {
          var jid = el.getAttribute('data-id');
          var job = findJob(jid);
          if (!job) break;
          JZ.Store.updateJob(jid, { status: job.status === 'active' ? 'offline' : 'active' });
          reloadFromStore();
          JZ.App.toast(job.status === 'active' ? '岗位已下架，学生端不再展示' : '岗位已重新上架');
          render();
          break;
        }
        case 'update-app-status': {
          var aid = el.getAttribute('data-app-id');
          var st = el.getAttribute('data-status');
          JZ.Store.updateApplication(aid, { status: st });
          reloadFromStore();
          JZ.App.toast(st === 'accepted' ? '已录用该学生' : '已拒绝该报名');
          render();
          break;
        }
      }
    });

    // 搜索：输入立即同步 state（防重渲染丢值），防抖后只重建列表
    viewRoot.addEventListener('input', function (e) {
      if (e.target.id !== 'search-input') return;
      state.ui.filters.q = e.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        persistUi();
        var list = document.getElementById('job-list');
        if (list) list.innerHTML = JZ.Views.jobListHtml();
      }, 200);
    });

    viewRoot.addEventListener('submit', function (e) {
      var form = e.target.closest('form[data-form]');
      if (!form) return;
      e.preventDefault();
      var kind = form.getAttribute('data-form');
      if (kind === 'apply') handleApplySubmit(form);
      else if (kind === 'profile') handleProfileSubmit(form);
      else if (kind === 'publish') handlePublishSubmit(form);
    });

    // 键盘可达：可点击的非原生元素（如岗位卡片）按 Enter 触发
    viewRoot.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var el = e.target.closest('[data-action]');
      if (!el) return;
      var tag = el.tagName;
      if (tag === 'BUTTON' || tag === 'A') return; // 原生元素已有 Enter 行为
      e.preventDefault();
      el.click();
    });

    document.getElementById('btn-reset').addEventListener('click', function () {
      if (!confirm('确定要重置吗？将清空所有本地数据（报名、发布、档案），恢复初始演示数据。')) return;
      JZ.Store.reset();
      reloadFromStore();
      JZ.App.toast('已恢复演示数据');
      render();
    });
  }

  // ===== 启动 =====

  JZ.App.init = function () {
    viewRoot = document.getElementById('view-root');
    JZ.Store.seedIfNeeded();
    reloadFromStore();
    loadUiFromStore();
    if (!JZ.Store.isUsable()) document.getElementById('storage-warning').hidden = false;
    bindEvents();
    if (!location.hash) {
      location.replace('#' + defaultHash());
      render();
      return;
    }
    render();
    window.addEventListener('hashchange', render);
  };
})(window.JZ);
