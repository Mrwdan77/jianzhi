/* views.js — 各视图渲染函数（返回 HTML 字符串）
 * XSS 纪律：本文件内所有来自用户/岗位数据的插值必须经 esc()；
 * 事件一律由 app.js 委托处理（data-action），不在此拼接任何 JS 代码 */
window.JZ = window.JZ || {};
(function (JZ) {
  'use strict';

  // ===== 工具 =====

  /** HTML 转义（含引号，属性值插值同样安全） */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function icon(name, cls) {
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#icon-' + name + '"/></svg>';
  }

  function fmtDays(days) {
    return (days || []).map(function (d) { return JZ.DAY_LABELS[d] || d; }).join('·');
  }

  function fmtSlots(slots) {
    return (slots || []).map(function (s) { return JZ.SLOT_LABELS[s] || s; }).join('/');
  }

  function fmtDate(ts) {
    var d = new Date(ts);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function metaItem(iconName, text) {
    return '<span class="meta-item">' + icon(iconName) + text + '</span>';
  }

  function findJob(id) {
    var jobs = JZ.state.jobs;
    for (var i = 0; i < jobs.length; i++) if (jobs[i].id === id) return jobs[i];
    return null;
  }

  /** required 每一项都必须出现在 owned 中 */
  function subset(required, owned) {
    return (required || []).every(function (r) { return owned.indexOf(r) >= 0; });
  }

  // ===== 岗位列表 =====

  function filteredJobs() {
    var f = JZ.state.ui.filters;
    var q = (f.q || '').toLowerCase();
    var jobs = JZ.state.jobs.filter(function (job) {
      if (job.status !== 'active') return false;
      if (q) {
        var hay = (job.title + ' ' + job.merchantName + ' ' + job.description).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      if (f.category && job.category !== f.category) return false;
      if (f.days.length && !subset(job.weekendDays, f.days)) return false;
      if (f.slots.length && !subset(job.timeSlots, f.slots)) return false;
      if (f.minPay && job.pay < f.minPay) return false;
      if (f.maxDist && job.distanceKm > f.maxDist) return false;
      return true;
    });
    if (JZ.state.ui.sortBy === 'match' && !JZ.state.profileEmpty) {
      jobs.sort(function (a, b) {
        var sa = JZ.state.matchMap[a.id] ? JZ.state.matchMap[a.id].total : 0;
        var sb = JZ.state.matchMap[b.id] ? JZ.state.matchMap[b.id].total : 0;
        return sb - sa;
      });
    } else {
      jobs.sort(function (a, b) { return b.createdAt - a.createdAt; });
    }
    return jobs;
  }

  function matchCapsuleHtml(m) {
    var c;
    if (m.total >= 85) c = 'var(--gold)';
    else if (m.total >= 70) c = 'var(--green)';
    else if (m.total >= 55) c = 'var(--blue)';
    else c = 'var(--text-3)';
    var tier = JZ.Match.tier(m.total);
    return '<span class="match-capsule" title="匹配度 ' + m.total + ' 分">'
      + '<span class="match-ring" style="--c:' + c + ';--p:' + m.total + '"><b>' + m.total + '</b></span>'
      + '<span class="match-stars" aria-label="' + m.total + ' 分">' + JZ.Match.stars(m.total) + '</span>'
      + (tier ? '<span class="tier-badge ' + tier.cls + '">' + tier.label + '</span>' : '')
      + '</span>';
  }

  function jobCardHtml(job) {
    var m = JZ.state.matchMap[job.id];
    var applied = JZ.state.appliedMap[job.id];
    var full = JZ.state.fullMap[job.id] === true;
    var totalApps = JZ.state.appCountMap[job.id] || 0;

    var html = '<article class="job-card" data-action="open-job" data-id="' + job.id + '" tabindex="0" role="link" aria-label="查看岗位：' + esc(job.title) + '">';
    html += '<div class="job-card-head"><h3 class="job-title">' + esc(job.title) + '</h3><span class="job-card-right" style="display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end">';
    if (full && !applied) html += '<span class="status-badge status-offline">已招满</span>';
    if (applied && (applied.status === 'pending' || applied.status === 'accepted')) {
      html += '<span class="applied-badge">' + icon('check') + (applied.status === 'accepted' ? '已录用' : '已报名') + '</span>';
    }
    if (JZ.state.profileEmpty) {
      html += '<span class="match-lock" data-action="go-profile">' + icon('user') + '完善档案，解锁匹配度</span>';
    } else if (m) {
      html += matchCapsuleHtml(m);
    }
    html += '</span></div>';

    html += '<div class="job-meta">'
      + metaItem('pin', esc(job.district) + ' · ' + job.distanceKm + 'km')
      + metaItem('calendar', fmtDays(job.weekendDays) + ' ' + fmtSlots(job.timeSlots))
      + metaItem('user', '招 ' + job.headcount + ' 人' + (totalApps ? ' · 已报 ' + totalApps : ''))
      + '</div>';

    html += '<div class="job-tags"><span class="tag tag-category">' + esc(job.category) + '</span>';
    (job.skills || []).forEach(function (s) { html += '<span class="tag tag-skill">' + esc(s) + '</span>'; });
    html += '</div>';

    html += '<div class="job-foot">'
      + '<span class="pay">¥' + job.pay + '<span class="pay-unit">/小时</span></span>'
      + '<span class="merchant">' + icon('store') + esc(job.merchantName) + '</span>'
      + '<span class="btn btn-primary btn-sm">查看详情</span>'
      + '</div></article>';
    return html;
  }

  function chipHtml(fKey, value, label, active) {
    return '<button type="button" class="chip' + (active ? ' active' : '') + '" data-action="toggle-filter"'
      + ' data-filter="' + fKey + '" data-value="' + esc(value) + '" aria-pressed="' + (active ? 'true' : 'false') + '">'
      + esc(label) + '</button>';
  }

  function filterBarHtml() {
    var f = JZ.state.ui.filters;
    var html = '<section class="filters card" aria-label="筛选条件">';

    html += '<div class="search-row">' + icon('search')
      + '<input class="search-input" id="search-input" type="search" placeholder="搜索岗位、商家或关键词"'
      + ' value="' + esc(f.q) + '" aria-label="搜索岗位"></div>';

    html += '<div class="filter-row"><span class="filter-label">分类</span><div class="chips">'
      + chipHtml('category', '', '全部', !f.category);
    JZ.CATEGORIES.forEach(function (c) { html += chipHtml('category', c, c, f.category === c); });
    html += '</div></div>';

    html += '<div class="filter-row"><span class="filter-label">我有空</span><div class="chips">'
      + chipHtml('day', 'sat', '周六', f.days.indexOf('sat') >= 0)
      + chipHtml('day', 'sun', '周日', f.days.indexOf('sun') >= 0)
      + chipHtml('slot', 'morning', '上午', f.slots.indexOf('morning') >= 0)
      + chipHtml('slot', 'afternoon', '下午', f.slots.indexOf('afternoon') >= 0)
      + chipHtml('slot', 'evening', '晚上', f.slots.indexOf('evening') >= 0)
      + '</div></div>';

    html += '<div class="filter-row"><span class="filter-label">时薪</span><div class="chips">'
      + chipHtml('pay', '0', '不限', !f.minPay);
    [15, 20, 25, 30, 40].forEach(function (p) { html += chipHtml('pay', String(p), '≥' + p, f.minPay === p); });
    html += '</div></div>';

    html += '<div class="filter-row"><span class="filter-label">距离</span><div class="chips">'
      + chipHtml('dist', '0', '不限', !f.maxDist);
    [1, 3, 5].forEach(function (d) { html += chipHtml('dist', String(d), '≤' + d + 'km', f.maxDist === d); });
    html += '</div></div>';

    var hasFilter = !!(f.category || f.days.length || f.slots.length || f.minPay || f.maxDist);
    html += '<div class="filter-row sort-row"><span class="filter-label">排序</span><div class="chips">'
      + chipHtml('sort', 'latest', '最新发布', JZ.state.ui.sortBy !== 'match')
      + chipHtml('sort', 'match', '匹配度优先', JZ.state.ui.sortBy === 'match')
      + '</div>';
    if (hasFilter) html += '<button type="button" class="clear-filters-btn" data-action="clear-filters">清除筛选</button>';
    html += '</div></section>';
    return html;
  }

  function jobListHtml() {
    var jobs = filteredJobs();
    if (!jobs.length) {
      return '<div class="empty-state">' + icon('search')
        + '<p>没有符合条件的岗位</p>'
        + '<button type="button" class="btn btn-outline btn-sm" data-action="clear-filters">清除筛选</button></div>';
    }
    return jobs.map(jobCardHtml).join('');
  }

  JZ.Views.studentJobsHtml = function () {
    return filterBarHtml() + '<div id="job-list" class="job-list">' + jobListHtml() + '</div>';
  };

  JZ.Views.jobListHtml = jobListHtml;

  // ===== 岗位详情 =====

  function matchDetailHtml(m) {
    var bars = [
      { label: '技能', part: m.parts.skill, max: 35 },
      { label: '时间', part: m.parts.time, max: 30 },
      { label: '距离', part: m.parts.distance, max: 20 },
      { label: '薪资', part: m.parts.pay, max: 15 }
    ];
    var html = '<div class="card match-detail"><h4>匹配分析'
      + '<span class="match-total">综合 ' + m.total + ' 分 ' + JZ.Match.stars(m.total) + '</span></h4>';
    bars.forEach(function (b) {
      var pct = Math.round(b.part / b.max * 100);
      html += '<div class="match-bar-row"><span class="bar-label">' + b.label + '</span>'
        + '<div class="bar"><div class="bar-fill" style="width:' + pct + '%"></div></div>'
        + '<span class="bar-score">' + Math.round(b.part) + '/' + b.max + '</span></div>';
    });
    html += '<ul class="reasons">';
    m.reasons.forEach(function (r) { html += '<li>' + esc(r) + '</li>'; });
    html += '</ul></div>';
    return html;
  }

  function applyFormHtml(applied) {
    var p = JZ.state.profile;
    var html = '<form class="apply-panel" data-form="apply" novalidate hidden>';
    html += '<div class="form-grid">';
    html += '<div class="field" data-field="studentName"><label for="ap_name">姓名 <span class="required">*</span></label>'
      + '<input type="text" id="ap_name" name="studentName" maxlength="20" value="' + esc(applied ? applied.studentName : p.name) + '">'
      + '<div class="field-error">请填写姓名</div></div>';
    html += '<div class="field" data-field="studentPhone"><label for="ap_phone">手机号 <span class="required">*</span></label>'
      + '<input type="tel" id="ap_phone" name="studentPhone" maxlength="11" value="' + esc(applied ? applied.studentPhone : p.phone) + '">'
      + '<div class="field-error">请填写正确的手机号</div></div>';
    html += '<div class="field full"><label for="ap_note">留言给商家</label>'
      + '<textarea id="ap_note" name="note" rows="3" maxlength="200" placeholder="介绍你的优势或说明可到岗时间"></textarea>'
      + '<div class="field-hint">选填，200 字以内</div></div>';
    html += '</div>';
    html += '<div class="form-actions">'
      + '<button type="submit" class="btn btn-primary">提交报名</button>'
      + '<button type="button" class="btn btn-outline" data-action="apply-cancel">取消</button>'
      + '</div></form>';
    return html;
  }

  JZ.Views.studentJobDetailHtml = function (jobId) {
    var job = findJob(jobId);
    if (!job) {
      return '<div class="empty-state"><p>岗位不存在或已被移除</p>'
        + '<a class="btn btn-primary btn-sm" href="#/student/jobs">返回岗位列表</a></div>';
    }
    var applied = JZ.state.appliedMap[jobId];
    var acceptedCount = JZ.state.acceptedMap[jobId] || 0;
    var full = acceptedCount >= job.headcount;
    var totalApps = JZ.state.appCountMap[jobId] || 0;
    var m = JZ.state.matchMap[jobId];

    var html = '<a class="back-link" data-action="go-back" href="#/student/jobs">' + icon('arrow-left') + '返回列表</a>';

    html += '<article class="card job-detail">';
    html += '<div class="job-detail-head"><h1 class="job-title">' + esc(job.title) + '</h1>';
    if (full && !applied) html += '<span class="status-badge status-offline">已招满</span>';
    html += '</div>';
    html += '<span class="pay">¥' + job.pay + '<span class="pay-unit">/小时</span></span>';
    html += '<div class="detail-info">'
      + metaItem('store', esc(job.merchantName))
      + metaItem('pin', esc(job.district) + ' · ' + job.distanceKm + 'km')
      + metaItem('calendar', fmtDays(job.weekendDays))
      + metaItem('clock', fmtSlots(job.timeSlots))
      + metaItem('user', '招募 ' + job.headcount + ' 人 · 已报名 ' + totalApps + ' 人')
      + metaItem('phone', esc(job.contact))
      + metaItem('clock', '发布于 ' + fmtDate(job.createdAt))
      + '</div>';
    html += '<div class="job-tags"><span class="tag tag-category">' + esc(job.category) + '</span>';
    (job.skills || []).forEach(function (s) { html += '<span class="tag tag-skill">' + esc(s) + '</span>'; });
    html += '</div>';
    html += '<p class="detail-desc">' + esc(job.description) + '</p>';
    html += '</article>';

    if (!JZ.state.profileEmpty && m) html += matchDetailHtml(m);

    html += '<div class="card action-panel">';
    if (applied && applied.status === 'accepted') {
      html += '<div class="applied-note">' + icon('check') + '已录用！商家会通过电话联系你</div>';
    } else if (applied && applied.status === 'pending') {
      html += '<div class="applied-note">' + icon('check') + '已报名，等待商家确认（' + fmtDate(applied.createdAt) + '）</div>';
    } else {
      if (applied && applied.status === 'rejected') {
        html += '<p class="field-hint" style="margin-bottom:8px">上次报名未通过，可修改信息后重新报名</p>';
      }
      if (full) {
        html += '<button type="button" class="btn btn-block" disabled>已招满，看看其他岗位吧</button>';
      } else {
        html += '<button type="button" class="btn btn-primary btn-block" data-action="apply-open">立即报名</button>';
      }
      html += applyFormHtml(applied);
    }
    html += '</div>';
    return html;
  };

  // ===== 学生档案 =====

  JZ.Views.studentProfileHtml = function () {
    var p = JZ.state.profile;
    var html = '<h2 class="section-title">我的档案</h2>';
    if (JZ.state.isDefaultProfile) {
      html += '<div class="legend-box">当前是示例档案「张同学」：岗位上的匹配度均按此计算。修改并保存后即为你的真实档案。</div>';
    }
    html += '<form class="card" data-form="profile" novalidate><div class="form-grid">';

    html += '<div class="field" data-field="name"><label for="pf_name">姓名</label>'
      + '<input type="text" id="pf_name" name="name" maxlength="20" value="' + esc(p.name) + '">'
      + '<div class="field-error">请填写姓名</div></div>';
    html += '<div class="field" data-field="school"><label for="pf_school">学校</label>'
      + '<input type="text" id="pf_school" name="school" maxlength="30" value="' + esc(p.school) + '">'
      + '<div class="field-error">请填写学校</div></div>';
    html += '<div class="field" data-field="phone"><label for="pf_phone">手机号 <span class="required">*</span></label>'
      + '<input type="tel" id="pf_phone" name="phone" maxlength="11" value="' + esc(p.phone) + '">'
      + '<div class="field-error">请填写正确的手机号</div></div>';
    html += '<div class="field" data-field="expectPay"><label for="pf_expectPay">期望时薪（元/小时）</label>'
      + '<input type="number" id="pf_expectPay" name="expectPay" min="0" max="500" step="1" value="' + esc(p.expectPay) + '">'
      + '<div class="field-hint">不填则薪资项按满分计算</div><div class="field-error">请填写有效数字</div></div>';
    html += '<div class="field" data-field="maxDistanceKm"><label for="pf_maxDistanceKm">可接受最远距离（km）</label>'
      + '<input type="number" id="pf_maxDistanceKm" name="maxDistanceKm" min="0" max="100" step="0.5" value="' + esc(p.maxDistanceKm) + '">'
      + '<div class="field-hint">不填按 5km 计算</div><div class="field-error">请填写有效数字</div></div>';

    // 技能 chips
    var skillSet = JZ.SKILL_OPTIONS.slice();
    (p.skills || []).forEach(function (s) { if (skillSet.indexOf(s) < 0) skillSet.push(s); });
    html += '<div class="field full"><span class="field-label">我的技能</span><div class="chips" data-chip-group="skills">';
    skillSet.forEach(function (s) {
      var sel = (p.skills || []).indexOf(s) >= 0;
      html += '<button type="button" class="chip' + (sel ? ' active' : '') + '" data-action="toggle-skill" data-value="' + esc(s) + '" aria-pressed="' + (sel ? 'true' : 'false') + '">' + esc(s) + '</button>';
    });
    html += '</div>';
    html += '<div class="skill-add" style="display:flex;gap:8px;margin-top:8px">'
      + '<input type="text" id="custom-skill-input" maxlength="10" placeholder="自定义技能，如：吉他弹唱" aria-label="自定义技能">'
      + '<button type="button" class="btn btn-outline btn-sm" data-action="add-custom-skill">添加</button></div></div>';

    // 时间网格
    html += '<div class="field full"><span class="field-label">周末可用时间</span><div class="checkbox-grid">';
    ['sat', 'sun'].forEach(function (d) {
      ['morning', 'afternoon', 'evening'].forEach(function (s) {
        var v = d + '_' + s;
        var checked = (p.availableDays || []).indexOf(d) >= 0 && (p.availableSlots || []).indexOf(s) >= 0;
        html += '<label class="checkbox-cell"><input type="checkbox" name="time" value="' + v + '"' + (checked ? ' checked' : '') + '>'
          + JZ.DAY_LABELS[d] + JZ.SLOT_LABELS[s] + '</label>';
      });
    });
    html += '</div><div class="field-hint">勾选你有空的时间，岗位所需时间被覆盖才能拿到时间分</div></div>';

    html += '</div><div class="form-actions">'
      + '<button type="submit" class="btn btn-primary">保存档案</button>'
      + '<a class="btn btn-outline" href="#/student/jobs">返回岗位列表</a>'
      + '</div></form>';
    return html;
  };

  // ===== 商家发布 =====

  function pubField(name, label, val, opts) {
    opts = opts || {};
    var req = opts.required ? ' <span class="required">*</span>' : '';
    var attrs = opts.type === 'number'
      ? ' type="number" min="' + (opts.min != null ? opts.min : 0) + '" max="' + (opts.max != null ? opts.max : 9999) + '" step="' + (opts.step || 1) + '"'
      : ' type="text"';
    return '<div class="field' + (opts.full ? ' full' : '') + '" data-field="' + name + '"><label for="pb_' + name + '">' + label + req + '</label>'
      + '<input id="pb_' + name + '" name="' + name + '"' + attrs
      + (opts.maxlength ? ' maxlength="' + opts.maxlength + '"' : '')
      + ' value="' + esc(val) + '"' + (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : '') + '>'
      + (opts.hint ? '<div class="field-hint">' + opts.hint + '</div>' : '')
      + '<div class="field-error">' + esc(opts.errMsg || '请正确填写此项') + '</div></div>';
  }

  JZ.Views.merchantPublishHtml = function () {
    var html = '<h2 class="section-title">发布兼职岗位</h2>';
    html += '<form class="card" data-form="publish" novalidate><div class="form-grid">';

    html += pubField('title', '岗位标题', '', { required: true, maxlength: 30, hint: '2-30 字，如：周末奶茶店店员', errMsg: '标题需 2-30 字' });
    html += pubField('merchantName', '商家名称', '', { required: true, maxlength: 30, errMsg: '请填写商家名称' });
    html += pubField('district', '工作地点/商圈', '大学城', { required: true, maxlength: 20, hint: '如：大学城、西门商圈、万达广场', errMsg: '请填写工作地点' });
    html += pubField('pay', '时薪（元/小时）', 20, { required: true, type: 'number', min: 15, max: 200, errMsg: '时薪需在 15-200 之间' });
    html += pubField('headcount', '招募人数', 2, { required: true, type: 'number', min: 1, max: 50, errMsg: '人数需在 1-50 之间' });
    html += pubField('distanceKm', '距学校距离（km）', 1, { required: true, type: 'number', min: 0, max: 50, step: 0.1, errMsg: '距离需在 0-50 之间' });
    html += pubField('contact', '联系方式', '', { required: true, maxlength: 30, hint: '手机号或微信，学生报名后凭此联系', errMsg: '请填写联系方式' });

    // 分类（chips 单选，默认第一个）
    html += '<div class="field full" data-field="category"><span class="field-label">分类 <span class="required">*</span></span>'
      + '<div class="chips" data-chip-group="category">';
    JZ.CATEGORIES.forEach(function (c, i) {
      html += '<button type="button" class="chip' + (i === 0 ? ' active' : '') + '" data-action="pick-category" data-value="' + esc(c) + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '">' + esc(c) + '</button>';
    });
    html += '</div><div class="field-error">请选择分类</div></div>';

    // 工作日期
    html += '<div class="field full" data-field="weekendDays"><span class="field-label">工作日期 <span class="required">*</span></span>'
      + '<div class="checkbox-grid">'
      + '<label class="checkbox-cell"><input type="checkbox" name="weekendDays" value="sat" checked>周六</label>'
      + '<label class="checkbox-cell"><input type="checkbox" name="weekendDays" value="sun" checked>周日</label>'
      + '</div><div class="field-error">至少选择一天</div></div>';

    // 工作时段
    html += '<div class="field full" data-field="timeSlots"><span class="field-label">工作时段 <span class="required">*</span></span>'
      + '<div class="checkbox-grid">';
    ['morning', 'afternoon', 'evening'].forEach(function (s, i) {
      html += '<label class="checkbox-cell"><input type="checkbox" name="timeSlots" value="' + s + '"' + (i < 2 ? ' checked' : '') + '>' + JZ.SLOT_LABELS[s] + '</label>';
    });
    html += '</div><div class="field-error">至少选择一个时段</div></div>';

    // 技能要求
    html += '<div class="field full" data-field="skills"><span class="field-label">技能要求 <span class="required">*</span></span>'
      + '<div class="chips" data-chip-group="skills">';
    JZ.SKILL_OPTIONS.forEach(function (s) {
      html += '<button type="button" class="chip" data-action="toggle-skill" data-value="' + esc(s) + '" aria-pressed="false">' + esc(s) + '</button>';
    });
    html += '</div><div class="field-error">至少选择一项技能（无要求可选「体力搬运」并注明）</div></div>';

    // 描述
    html += '<div class="field full" data-field="description"><label for="pb_description">岗位描述</label>'
      + '<textarea id="pb_description" name="description" rows="4" maxlength="200" placeholder="工作内容、任职要求、福利待遇等"></textarea>'
      + '<div class="field-hint">200 字以内</div><div class="field-error">描述不能超过 200 字</div></div>';

    html += '</div><div class="form-actions"><button type="submit" class="btn btn-primary">发布岗位</button></div></form>';
    return html;
  };

  // ===== 商家管理 =====

  JZ.Views.merchantManageHtml = function () {
    var html = '<h2 class="section-title">岗位管理</h2>';
    html += '<div class="legend-box">单机演示版：所有岗位（含示例数据）均可管理。点击「查看报名者」处理报名，下架后学生端不再展示。</div>';
    html += '<div class="manage-list">';

    var apps = JZ.state.applications;
    JZ.state.jobs.forEach(function (job) {
      var jobApps = apps.filter(function (a) { return a.jobId === job.id; });
      var offline = job.status !== 'active';
      var expanded = JZ.state.expandedJobId === job.id;

      html += '<div class="manage-row' + (offline ? ' is-offline' : '') + '">';
      html += '<div class="manage-row-head"><h3 class="job-title">' + esc(job.title) + '</h3>'
        + '<span class="status-badge ' + (offline ? 'status-offline' : 'status-active') + '">' + (offline ? '已下架' : '在招') + '</span>'
        + '<span style="font-size:13px;color:var(--text-2)">报名 ' + jobApps.length + ' / ' + job.headcount + ' 人</span></div>';
      html += '<div class="manage-row-meta"><span>' + esc(job.category) + '</span><span>¥' + job.pay + '/小时</span>'
        + '<span>' + fmtDays(job.weekendDays) + ' ' + fmtSlots(job.timeSlots) + '</span>'
        + '<span>' + esc(job.district) + '</span><span>发布于 ' + fmtDate(job.createdAt) + '</span></div>';
      html += '<div class="manage-row-actions">'
        + '<button type="button" class="btn btn-outline btn-sm" data-action="toggle-applicants" data-id="' + job.id + '">'
        + (expanded ? '收起报名者' : '查看报名者（' + jobApps.length + '）') + '</button>'
        + '<button type="button" class="btn ' + (offline ? 'btn-outline' : 'btn-danger-outline') + ' btn-sm" data-action="toggle-job-status" data-id="' + job.id + '">'
        + (offline ? '重新上架' : '下架') + '</button>'
        + '</div>';

      if (expanded) {
        html += '<div class="applicants-panel">';
        if (!jobApps.length) {
          html += '<p class="no-applicants">暂无报名，分享岗位给学生吧</p>';
        }
        var stMap = { pending: ['待确认', 'status-pending'], accepted: ['已录用', 'status-accepted'], rejected: ['已拒绝', 'status-rejected'] };
        jobApps.forEach(function (a) {
          var st = stMap[a.status] || stMap.pending;
          html += '<div class="applicant-row"><div class="applicant-head">'
            + '<span class="applicant-name">' + esc(a.studentName) + '</span>'
            + '<span class="applicant-phone">' + esc(a.studentPhone) + '</span>'
            + '<span class="status-badge ' + st[1] + '">' + st[0] + '</span>'
            + '<div class="applicant-actions">';
          if (a.status === 'pending') {
            html += '<button type="button" class="btn btn-primary btn-sm" data-action="update-app-status" data-app-id="' + a.id + '" data-status="accepted">录用</button>'
              + '<button type="button" class="btn btn-danger-outline btn-sm" data-action="update-app-status" data-app-id="' + a.id + '" data-status="rejected">拒绝</button>';
          }
          html += '</div></div>';
          if (a.note) html += '<div class="applicant-note">留言：' + esc(a.note) + '</div>';
          html += '<div class="applicant-time">报名于 ' + fmtDate(a.createdAt) + '</div></div>';
        });
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    return html;
  };
})(window.JZ);
