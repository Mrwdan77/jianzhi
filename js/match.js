/* match.js — 匹配度打分纯函数（不碰 DOM、不碰 storage，可独立测试）
 * 输出 { total: 0-100, parts: {skill,time,distance,pay}, reasons: [中文解释] }
 * 原则：缺失字段给中性分/满分，绝不因「没填」而变 0 分 */
window.JZ = window.JZ || {};
(function (JZ) {
  'use strict';

  JZ.Match = {};

  /** 岗位要求项中被学生覆盖的比例；岗位无要求视为 1 */
  function coverage(required, owned) {
    if (!required || !required.length) return 1;
    if (!owned || !owned.length) return 0;
    var hit = 0;
    for (var i = 0; i < required.length; i++) {
      if (owned.indexOf(required[i]) >= 0) hit++;
    }
    return hit / required.length;
  }

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

  /**
   * @param {object} job     岗位（weekendDays/timeSlots/skills/pay/distanceKm）
   * @param {object} profile 学生档案（availableDays/availableSlots/skills/expectPay/maxDistanceKm）
   */
  JZ.Match.score = function (job, profile) {
    profile = profile || {};
    var parts = { skill: 0, time: 0, distance: 0, pay: 0 };
    var reasons = [];

    // 技能 35：岗位要求被覆盖比例
    var jobSkills = job.skills || [];
    var mySkills = profile.skills || [];
    if (!jobSkills.length) {
      parts.skill = 35;
      reasons.push('岗位无技能门槛，此项满分');
    } else if (!mySkills.length) {
      parts.skill = 0;
      reasons.push('技能满足 0/' + jobSkills.length + ' 项，完善档案可提升此项');
    } else {
      var covered = 0;
      for (var i = 0; i < jobSkills.length; i++) {
        if (mySkills.indexOf(jobSkills[i]) >= 0) covered++;
      }
      parts.skill = 35 * covered / jobSkills.length;
      reasons.push('技能满足 ' + covered + '/' + jobSkills.length + ' 项');
    }

    // 时间 30：天覆盖比例 × 时段覆盖比例（乘法：一个时段对不上即归零）
    var days = profile.availableDays || [];
    var slots = profile.availableSlots || [];
    if (!days.length || !slots.length) {
      parts.time = 18; // 未填可用时间 → 中性分
      reasons.push('未填写周末可用时间，完善档案可提升此项');
    } else {
      var dayRatio = coverage(job.weekendDays, days);
      var slotRatio = coverage(job.timeSlots, slots);
      parts.time = 30 * dayRatio * slotRatio;
      if (dayRatio >= 1 && slotRatio >= 1) {
        reasons.push('时间完全匹配');
      } else {
        reasons.push('时间覆盖 ' + Math.round(dayRatio * 100) + '% × ' + Math.round(slotRatio * 100) + '%');
      }
    }

    // 距离 20：线性衰减，越近越高；未设置可接受距离按 5km
    var maxD = profile.maxDistanceKm;
    if (!maxD || maxD <= 0) maxD = 5;
    var dist = job.distanceKm || 0;
    parts.distance = 20 * clamp01(1 - dist / maxD);
    reasons.push('距离 ' + dist + 'km（可接受 ' + maxD + 'km 内）');

    // 薪资 15：达标满分，缺口按比例温和衰减；未设置期望视为满分
    var expect = profile.expectPay;
    if (!expect || expect <= 0) {
      parts.pay = 15;
      reasons.push('未设置期望薪资，此项满分');
    } else if (job.pay >= expect) {
      parts.pay = 15;
      reasons.push('薪资 ' + job.pay + ' 元/时，达到期望');
    } else {
      parts.pay = 15 * clamp01(1 - (expect - job.pay) / expect);
      reasons.push('薪资 ' + job.pay + ' 元/时，低于期望 ' + (expect - job.pay) + ' 元');
    }

    var total = Math.round(parts.skill + parts.time + parts.distance + parts.pay);
    total = Math.max(0, Math.min(100, total));
    return { total: total, parts: parts, reasons: reasons };
  };

  /** 档案完全为空（无技能、无可用时间、无期望薪资）→ 不显示分数，引导完善 */
  JZ.Match.isProfileEmpty = function (profile) {
    profile = profile || {};
    return !(profile.skills && profile.skills.length) &&
           !(profile.availableDays && profile.availableDays.length) &&
           !(profile.availableSlots && profile.availableSlots.length) &&
           !(profile.expectPay && profile.expectPay > 0);
  };

  /** 分数 → 星级（1-5） */
  JZ.Match.stars = function (total) {
    var n = Math.max(1, Math.round(total / 20));
    var s = '';
    for (var i = 1; i <= 5; i++) s += (i <= n ? '★' : '☆');
    return s;
  };

  /** 分数 → 徽章 {label, cls}；低于 55 无徽章 */
  JZ.Match.tier = function (total) {
    if (total >= 85) return { label: '强烈推荐', cls: 'tier-gold' };
    if (total >= 70) return { label: '高匹配', cls: 'tier-green' };
    if (total >= 55) return { label: '较匹配', cls: 'tier-blue' };
    return null;
  };
})(window.JZ);
