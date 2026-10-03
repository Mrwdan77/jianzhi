/* mock-data.js — 内置演示数据（file:// 下无法 fetch 本地 JSON，数据必须以 JS 常量提供）
 * 首次打开时由 store.js seed 进 localStorage，之后以 localStorage 为准 */
window.JZ = window.JZ || {};
(function (JZ) {
  'use strict';

  /** 统一技能词表（学生档案与岗位发布共用，是技能可匹配的前提） */
  JZ.SKILL_OPTIONS = [
    '沟通表达', '收银', '点单制作', '理货陈列', '促销叫卖', '学科辅导', 'PPT文档',
    'Excel表格', '视频剪辑', '摄影', '体力搬运', '宠物照料', '活动执行', '电话客服'
  ];

  /** 岗位分类枚举 */
  JZ.CATEGORIES = ['餐饮', '零售', '家教', '促销', '物流', '文娱', '其他'];

  /** 时段 / 日期标签（views.js 与 app.js 共用） */
  JZ.DAY_LABELS = { sat: '周六', sun: '周日' };
  JZ.SLOT_LABELS = { morning: '上午', afternoon: '下午', evening: '晚上' };

  var BASE = 1790380800000; // 2026-09-26 00:00 UTC，mock 数据统一以此为发布基准

  /**
   * @param {object} o 覆盖字段
   * @param {number} i 序号，决定 createdAt（越靠后越新）
   */
  function job(o, i) {
    var base = {
      id: 'job_' + (1001 + i),
      title: '',
      merchantName: '',
      category: '餐饮',
      description: '',
      pay: 20,
      district: '大学城',
      distanceKm: 1.5,
      weekendDays: ['sat', 'sun'],
      timeSlots: ['morning', 'afternoon'],
      headcount: 2,
      skills: [],
      contact: '',
      status: 'active',
      createdAt: BASE + i * 3600000,
      isMock: true
    };
    var j = {};
    for (var k in base) { j[k] = base[k]; }
    for (var k2 in o) { j[k2] = o[k2]; }
    return j;
  }

  /** 24 条岗位：22 active + 2 offline；时薪 15–80、距离 0.3–8km 的跨度保证匹配度分布有差异 */
  JZ.MOCK_JOBS = [
    job({ title: '奶茶店店员', merchantName: '一点点奶茶(大学城店)', category: '餐饮', pay: 22, district: '大学城', distanceKm: 0.8, weekendDays: ['sat', 'sun'], timeSlots: ['morning', 'afternoon'], headcount: 3, skills: ['沟通表达', '点单制作'], contact: '13800001001', description: '周末奶茶店店员，负责点单、饮品制作与店面整理。有经验者优先，可培训，工作轻松氛围好，离学校步行 10 分钟。' }, 0),
    job({ title: '餐厅传菜员', merchantName: '湘江小厨', category: '餐饮', pay: 20, district: '大学城', distanceKm: 1.5, weekendDays: ['sat', 'sun'], timeSlots: ['morning', 'afternoon', 'evening'], headcount: 4, skills: ['沟通表达'], contact: '13800001002', description: '周末用餐高峰期传菜、上菜，包工作餐。要求手脚麻利、有服务意识。' }, 1),
    job({ title: '咖啡师助理', merchantName: '星巴克(西门店)', category: '餐饮', pay: 25, district: '西门商圈', distanceKm: 2.0, weekendDays: ['sat', 'sun'], timeSlots: ['morning', 'afternoon'], headcount: 2, skills: ['沟通表达', '点单制作'], contact: '13800001003', description: '协助咖啡师完成点单、出品与清洁，可学习拉花技巧。咖啡爱好者优先。' }, 2),
    job({ title: '食堂帮厨', merchantName: '学生三食堂', category: '餐饮', pay: 18, district: '大学城', distanceKm: 0.3, weekendDays: ['sat', 'sun'], timeSlots: ['morning'], headcount: 5, skills: ['体力搬运'], contact: '13800001004', description: '食堂后厨帮工，洗菜备菜、整理食材，包三餐。就在校内，无需通勤。' }, 3),
    job({ title: '外卖打包员', merchantName: '李先生黄焖鸡', category: '餐饮', pay: 20, district: '大学城', distanceKm: 1.0, weekendDays: ['sat', 'sun'], timeSlots: ['evening'], headcount: 2, skills: [], contact: '13800001005', description: '晚餐高峰时段外卖打包、核对订单，无需经验，包晚餐。' }, 4),
    job({ title: '便利店理货员', merchantName: '罗森便利店', category: '零售', pay: 20, district: '大学城', distanceKm: 0.5, weekendDays: ['sat', 'sun'], timeSlots: ['morning', 'afternoon'], headcount: 2, skills: ['理货陈列'], contact: '13800001006', description: '周末白天负责货架补货、陈列整理与临期检查。细心耐心即可。' }, 5),
    job({ title: '超市促销员', merchantName: '永辉超市', category: '零售', pay: 25, district: '西门商圈', distanceKm: 2.5, weekendDays: ['sat', 'sun'], timeSlots: ['afternoon'], headcount: 3, skills: ['沟通表达', '促销叫卖'], contact: '13800001007', description: '周末下午在超市做品牌促销，向顾客介绍产品、引导试吃。口才好者优先，有提成。' }, 6),
    job({ title: '服装导购', merchantName: '优衣库(万达店)', category: '零售', pay: 23, district: '万达广场', distanceKm: 3.0, weekendDays: ['sun'], timeSlots: ['afternoon', 'evening'], headcount: 2, skills: ['沟通表达'], contact: '13800001008', description: '周日下午至晚间门店导购，整理服装、协助顾客。形象良好、性格开朗。' }, 7),
    job({ title: '水果店收银', merchantName: '鲜丰水果', category: '零售', pay: 18, district: '大学城', distanceKm: 0.9, weekendDays: ['sat'], timeSlots: ['morning', 'afternoon'], headcount: 2, skills: ['收银'], contact: '13800001009', status: 'offline', description: '周六白天负责收银与水果打包。需细心、算账清楚。（演示数据：已下架）' }, 8),
    job({ title: '小学数学辅导', merchantName: '陈女士(家长)', category: '家教', pay: 60, district: '城南小区', distanceKm: 3.0, weekendDays: ['sun'], timeSlots: ['morning'], headcount: 1, skills: ['学科辅导'], contact: '13900002001', description: '为五年级孩子辅导数学作业与预习，周日上午 2 小时。要求耐心、数学基础扎实，数学专业或师范优先。' }, 9),
    job({ title: '初中英语家教', merchantName: '王先生(家长)', category: '家教', pay: 70, district: '翰林雅苑', distanceKm: 4.5, weekendDays: ['sat'], timeSlots: ['afternoon'], headcount: 1, skills: ['学科辅导', '沟通表达'], contact: '13900002002', description: '初二英语辅导，周六下午 2 小时。要求英语六级以上，能带动孩子开口说。' }, 10),
    job({ title: '高中物理答疑', merchantName: '李女士(家长)', category: '家教', pay: 80, district: '香樟花园', distanceKm: 6.0, weekendDays: ['sat', 'sun'], timeSlots: ['evening'], headcount: 1, skills: ['学科辅导'], contact: '13900002003', description: '高一物理作业答疑与知识梳理，周末晚上 1.5 小时。要求物理相关专业或竞赛经历。' }, 11),
    job({ title: '传单派发员', merchantName: '新东方教育', category: '促销', pay: 20, district: '大学城', distanceKm: 1.2, weekendDays: ['sat', 'sun'], timeSlots: ['morning', 'afternoon'], headcount: 10, skills: ['沟通表达'], contact: '13800003001', description: '在校园及商圈派发课程宣传单页，按小时计薪，日结。性格外向、不怕被拒绝。' }, 12),
    job({ title: '地推扫码员', merchantName: '美团优选', category: '促销', pay: 25, district: '西门商圈', distanceKm: 1.8, weekendDays: ['sat', 'sun'], timeSlots: ['afternoon'], headcount: 6, skills: ['沟通表达', '促销叫卖'], contact: '13800003002', description: '商圈地推，引导路人扫码下单领新人礼，有效单有额外提成。表达能力强、脸皮厚者优先。' }, 13),
    job({ title: '新品试饮促销', merchantName: '元气森林', category: '促销', pay: 30, district: '万达广场', distanceKm: 4.0, weekendDays: ['sat', 'sun'], timeSlots: ['afternoon'], headcount: 3, skills: ['沟通表达', '促销叫卖'], contact: '13800003003', description: '商超内新品饮料试饮推广，需穿着品牌工作服，工作 4 小时。形象好、有促销经验优先。' }, 14),
    job({ title: '快递分拣员', merchantName: '菜鸟驿站(大学城站)', category: '物流', pay: 22, district: '物流园', distanceKm: 6.5, weekendDays: ['sat', 'sun'], timeSlots: ['evening'], headcount: 8, skills: ['体力搬运'], contact: '13800004001', description: '晚间快递包裹分拣上架，扫码入库。体力活，多劳多得，可按件计酬。' }, 15),
    job({ title: '仓库理货员', merchantName: '京东物流', category: '物流', pay: 26, district: '物流园', distanceKm: 8.0, weekendDays: ['sat'], timeSlots: ['morning', 'afternoon'], headcount: 5, skills: ['体力搬运', '理货陈列'], contact: '13800004002', description: '周六全天仓库理货、盘点，提供班车接送与午餐。需能适应站立作业。' }, 16),
    job({ title: '生鲜配送协助', merchantName: '叮咚买菜', category: '物流', pay: 24, district: '西门商圈', distanceKm: 5.0, weekendDays: ['sat', 'sun'], timeSlots: ['morning'], headcount: 3, skills: ['体力搬运'], contact: '13800004003', description: '周末上午协助生鲜分装与配送装车，工作量稳定，日结。' }, 17),
    job({ title: '活动执行助理', merchantName: '会展中心', category: '文娱', pay: 25, district: '会展中心', distanceKm: 6.0, weekendDays: ['sat', 'sun'], timeSlots: ['morning', 'afternoon'], headcount: 8, skills: ['活动执行', '沟通表达'], contact: '13800005001', description: '周末展会现场执行：物料摆放、签到引导、秩序维护。可近距离接触大型活动策划流程。' }, 18),
    job({ title: '展会引导员', merchantName: '车展主办方', category: '文娱', pay: 30, district: '会展中心', distanceKm: 7.0, weekendDays: ['sun'], timeSlots: ['morning', 'afternoon'], headcount: 10, skills: ['沟通表达', '活动执行'], contact: '13800005002', description: '周日车展观众引导与咨询解答，提供统一服装与午餐。要求形象良好、普通话标准。' }, 19),
    job({ title: '摄影助理', merchantName: '拾光工作室', category: '文娱', pay: 35, district: '大学城', distanceKm: 1.5, weekendDays: ['sat'], timeSlots: ['afternoon'], headcount: 1, skills: ['摄影'], contact: '13800005003', description: '周六下午外拍协助：打光、道具、场景布置。懂相机基础操作，摄影爱好者优先，可学习人像摄影。' }, 20),
    job({ title: '宠物照料员', merchantName: '宠乐多宠物店', category: '其他', pay: 20, district: '大学城', distanceKm: 1.0, weekendDays: ['sat', 'sun'], timeSlots: ['morning'], headcount: 2, skills: ['宠物照料'], contact: '13800006001', description: '周末上午宠物店帮忙：遛狗、喂食、清理猫砂。喜欢小动物、不怕猫狗即可。' }, 21),
    job({ title: '图书馆整理员', merchantName: '校图书馆', category: '其他', pay: 15, district: '大学城', distanceKm: 0.6, weekendDays: ['sat', 'sun'], timeSlots: ['morning'], headcount: 4, skills: [], contact: '13800006002', status: 'offline', description: '周末上午图书上架、书架整理、阅览室巡查。安静轻松。（演示数据：已下架）' }, 22),
    job({ title: '问卷调研员', merchantName: '益普索市场调查', category: '其他', pay: 25, district: '西门商圈', distanceKm: 2.2, weekendDays: ['sat', 'sun'], timeSlots: ['morning', 'afternoon'], headcount: 5, skills: ['沟通表达', 'Excel表格'], contact: '13800006003', description: '商圈内拦访做问卷调研，使用平板录入，需要会用 Excel 汇总。按有效问卷计酬。' }, 23)
  ];

  /** 4 条预置报名：覆盖 pending / accepted / rejected 三种状态
   *  isMine: false —— 它们是演示用的「其他学生」的报名；学生端自己提交的报名 isMine 为 true */
  JZ.MOCK_APPLICATIONS = [
    { id: 'app_mock1', jobId: 'job_1001', studentName: '李同学', studentPhone: '13900000001', note: '有奶茶店兼职经验，会制作基础饮品', status: 'pending', createdAt: BASE + 500000, isMine: false },
    { id: 'app_mock2', jobId: 'job_1001', studentName: '王同学', studentPhone: '13900000002', note: '', status: 'accepted', createdAt: BASE + 400000, isMine: false },
    { id: 'app_mock3', jobId: 'job_1002', studentName: '赵同学', studentPhone: '13900000003', note: '周六下午可到岗', status: 'rejected', createdAt: BASE + 300000, isMine: false },
    { id: 'app_mock4', jobId: 'job_1003', studentName: '刘同学', studentPhone: '13900000004', note: '热爱咖啡，想学习拉花', status: 'pending', createdAt: BASE + 200000, isMine: false }
  ];

  /** 示例学生档案（首屏即可看到匹配度差异；档案页顶部提示可修改） */
  JZ.DEFAULT_PROFILE = {
    name: '张同学',
    school: '理工大学',
    phone: '13800138000',
    skills: ['沟通表达', '收银', '理货陈列'],
    availableDays: ['sat', 'sun'],
    availableSlots: ['morning', 'afternoon'],
    expectPay: 25,
    maxDistanceKm: 5
  };
})(window.JZ);
