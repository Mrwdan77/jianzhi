/* store.js — localStorage 封装（file:// 下所有本地页面共享存储区，键统一加 jz: 前缀）
 * 不可用时降级为内存存储（刷新丢失，顶部出现警告条）；所有写操作不抛异常 */
window.JZ = window.JZ || {};
(function (JZ) {
  'use strict';

  var PREFIX = 'jz:';
  var SCHEMA_VERSION = 1;
  var mem = {};          // localStorage 不可用时的内存兜底
  var usable = true;

  try {
    localStorage.setItem(PREFIX + '__probe', '1');
    localStorage.removeItem(PREFIX + '__probe');
  } catch (e) {
    usable = false;
  }

  function read(key, fallback) {
    var raw = usable ? localStorage.getItem(PREFIX + key) : mem[key];
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[jz] 数据损坏，已回退默认值:', key);
      return fallback;
    }
  }

  function write(key, val) {
    var s = JSON.stringify(val);
    if (!usable) { mem[key] = s; return true; }
    try {
      localStorage.setItem(PREFIX + key, s);
      return true;
    } catch (e) {
      // QuotaExceeded 或隐私模式写入失败：不抛异常，仅提示
      if (typeof JZ.App !== 'undefined' && JZ.App.toast) JZ.App.toast('本地存储写入失败，本次改动可能丢失');
      return false;
    }
  }

  /** 首次打开或 schemaVersion 变化时，将 mock 数据 seed 进 localStorage */
  function seedIfNeeded() {
    var meta = read('meta', null);
    if (meta && meta.schemaVersion === SCHEMA_VERSION) return;
    write('jobs', JZ.MOCK_JOBS);
    write('applications', JZ.MOCK_APPLICATIONS);
    write('profile', JZ.DEFAULT_PROFILE);
    write('meta', { schemaVersion: SCHEMA_VERSION });
  }

  JZ.Store = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    isUsable: function () { return usable; },

    seedIfNeeded: seedIfNeeded,

    /** 清空全部 jz:* 键并重新 seed，恢复演示数据 */
    reset: function () {
      if (usable) {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0) keys.push(k);
        }
        keys.forEach(function (k) { localStorage.removeItem(k); });
      } else {
        mem = {};
      }
      seedIfNeeded();
    },

    // ---- jobs ----
    getJobs: function () { return read('jobs', []); },
    saveJobs: function (jobs) { return write('jobs', jobs); },
    addJob: function (j) {
      var jobs = read('jobs', []);
      jobs.unshift(j);
      return write('jobs', jobs);
    },
    updateJob: function (id, patch) {
      var jobs = read('jobs', []);
      for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].id === id) {
          for (var k in patch) { jobs[i][k] = patch[k]; }
          break;
        }
      }
      return write('jobs', jobs);
    },

    // ---- applications ----
    getApplications: function () { return read('applications', []); },
    saveApplications: function (apps) { return write('applications', apps); },
    addApplication: function (a) {
      var apps = read('applications', []);
      apps.push(a);
      return write('applications', apps);
    },
    updateApplication: function (id, patch) {
      var apps = read('applications', []);
      for (var i = 0; i < apps.length; i++) {
        if (apps[i].id === id) {
          for (var k in patch) { apps[i][k] = patch[k]; }
          break;
        }
      }
      return write('applications', apps);
    },

    // ---- profile ----
    getProfile: function () { return read('profile', JZ.DEFAULT_PROFILE); },
    saveProfile: function (p) { return write('profile', p); },

    // ---- ui（角色 / 排序 / 筛选持久化） ----
    getUi: function () { return read('ui', null); },
    saveUi: function (ui) { return write('ui', ui); }
  };
})(window.JZ);
