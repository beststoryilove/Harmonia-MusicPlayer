/* ================================================================
   Harmonia · 新液态玻璃引擎（Liquid Glass v2 · SVG 折射版）
   ================================================================
   来源：预览版「琉璃音乐 · Liquid Glass（已固化你的调参 160_15_60）.html」
   的液态玻璃引擎，按本项目（自适应布局、暗色主题、多端）做了适配。

   原理（Apple Liquid Glass 的网页复刻方案）：
   1) 运行时用 Canvas 逐像素生成「位移图」：圆角矩形 SDF 求内距，
      凸面 squircle 轮廓 h(x)=(1-(1-x)^4)^(1/4) 的斜率 → 折射强度，
      方向取 SDF 梯度（垂直于边缘指向外），编码进 R/G 通道（128 中性）；
   2) feImage 载入位移图 → feDisplacementMap 采样偏移（scale=2×depth）
      → feGaussianBlur 磨砂 → feColorMatrix 提饱和，挂到
      backdrop-filter:url(#id) 上（Chromium 支持）；
   3) 非 Chromium / 移动端 WebView 自动降级为 CSS blur+saturate+高光，
      材质本身由 liquid-glass-v2.css 提供，不受影响。

   与预览版的差异（适配要点）：
   - 预览版是固定尺寸手机舞台，本项目元素自适应尺寸 → 保留 ResizeObserver
     重建位移图；并加**尾随防抖**，避免灵动岛展开动画（0.55s）期间
     每帧重建一次 18 万像素的画布造成卡顿；
   - 预览版在 HTML 上逐个标注 data-lg-depth/bezel/blur，本项目改为
     在下方 TARGETS 表里按元素类型集中配置；
   - 预览版的三个滑杆（折射强度/毛玻璃/高光）不搬，按用户要求**固化**
     为 160 / 15 / 60，仅由设置页的「旧/新液态玻璃」二选一切换；
   - 移动端 WebView 对 backdrop-filter:url() 支持不可靠 → 显式排除，
     直接走降级路径。
   ================================================================ */
(function () {
  'use strict';

  /* ---------- 固化参数（对应预览版 160 / 15 / 60） ---------- */
  var FIXED = {
    depth: 160,   /* 折射强度滑杆值 → 倍率 1.6 */
    blur: 15,     /* 毛玻璃模糊滑杆值 → 倍率 0.15 */
    spec: 60      /* 高光亮度滑杆值 → 描边环不透明度 0.60（CSS 侧使用） */
  };

  /* ---------- 目标元素与各自的基准参数 ----------
     基准值沿用预览版的量级（8~40），再乘 FIXED 的倍率，
     得到与「已固化调参」一致的观感。
       depth → feDisplacementMap scale = depth × 2 × 1.6
       blur  → feGaussianBlur stdDeviation = blur × 0.15
     bezel 为边缘折射带宽度（CSS px）。 */
  var TARGETS = [
    { sel: '.settings-container',   depth: 40, bezel: 30, blur: 26 },
    { sel: '.discovery-modal',      depth: 40, bezel: 30, blur: 26 },
    { sel: '.sidebar',              depth: 40, bezel: 30, blur: 26 },
    { sel: '.poster-modal-content', depth: 26, bezel: 20, blur: 16 },
    { sel: '.dynamic-island',       depth: 30, bezel: 22, blur: 18 },
    { sel: '.player-controls',      depth: 30, bezel: 22, blur: 18 }
  ];

  /* 重建位移图的尾随防抖（ms）。灵动岛展开/收起、模态缩放入场都会触发
     连续 resize；防抖后只在尺寸稳定时重建一次。 */
  var REBUILD_DEBOUNCE = 140;

  var NS = 'http://www.w3.org/2000/svg';
  var UA = navigator.userAgent;

  /* 桌面 Chromium 才启用 SVG 折射：Electron / Chrome / Edge / Opera。
     移动端 WebView（Android WebView、iOS WKWebView）的 UA 也含 Chrome/Safari
     字样，但其 backdrop-filter:url() 支持不可靠，显式排除走降级。 */
  var isDesktopChromium =
    (/Chrom(e|ium)/.test(UA) || /Edg\//.test(UA) || /OPR\//.test(UA)) &&
    !/Android|iPhone|iPad|iPod|Mobile/i.test(UA);

  /* 窄屏断点与 css/liquid-glass-v2.css 及 responsive.css 的降级断点一致：
     768px 以下 responsive.css 会强制 backdrop-filter:none，折射滤镜无从生效，
     故这里也不注册，省掉无谓的位移图计算。 */
  var narrowQuery = window.matchMedia('(max-width: 768px)');

  function canRefract() {
    return isDesktopChromium && !narrowQuery.matches;
  }

  var defs = null;
  var items = [];
  var uid = 0;
  var active = false;

  function ensureDefs() {
    if (defs) return defs;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('data-lg-v2-defs', '');
    svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    defs = document.createElementNS(NS, 'defs');
    svg.appendChild(defs);
    document.body.appendChild(svg);
    return defs;
  }

  /* 凸面 squircle 斜率（rim 处最大，向内平滑衰减到 0） */
  function profileSlope(x) {          /* x∈[0,1] 0=边缘 1=平面起点 */
    var u = 1 - x;
    var denom = Math.max(1 - Math.pow(u, 4), 1e-9);
    return Math.min(Math.pow(u, 3) * Math.pow(denom, -0.75), 2.4);  /* 钳制边缘无穷斜率 */
  }

  /* 生成位移图（dataURL）：圆角矩形 SDF → 边缘折射方向编码进 R/G */
  function makeMap(w, h, radius, bezel) {
    var s = Math.min(1, Math.sqrt(180000 / (w * h)));   /* 限制画布像素量 */
    var W = Math.max(4, Math.round(w * s)), H = Math.max(4, Math.round(h * s));
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var im = ctx.createImageData(W, H), d = im.data;
    var hw = w / 2, hh = h / 2, r = Math.min(radius, hw, hh);
    function sd(px, py) {              /* 圆角矩形 SDF（负值在内） */
      var qx = Math.abs(px - hw) - (hw - r), qy = Math.abs(py - hh) - (hh - r);
      var ax = Math.max(qx, 0), ay = Math.max(qy, 0);
      return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
    }
    var i = 0;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++, i += 4) {
      var px = (x + .5) / s, py = (y + .5) / s;
      var dIn = -sd(px, py);           /* 内距：0=边缘 */
      var R = 128, G = 128;
      if (dIn < bezel) {
        var slope = profileSlope(Math.max(dIn, 0) / bezel);
        if (slope > .01) {
          var gx = sd(px + .8, py) - sd(px - .8, py);
          var gy = sd(px, py + .8) - sd(px, py - .8);
          var gl = Math.hypot(gx, gy) || 1;
          var m = slope / 2.4;
          R = Math.round(128 + gx / gl * m * 127);
          G = Math.round(128 + gy / gl * m * 127);
        }
      }
      d[i] = R; d[i + 1] = G; d[i + 2] = 128; d[i + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
    return cv.toDataURL();
  }

  function register(el, cfg) {
    if (!el || el.__lgv2) return;
    el.__lgv2 = true;

    var id = 'lgv2f' + (++uid);
    var filter = document.createElementNS(NS, 'filter');
    filter.setAttribute('id', id);
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    filter.setAttribute('x', '-40%'); filter.setAttribute('y', '-40%');
    filter.setAttribute('width', '180%'); filter.setAttribute('height', '180%');

    /* 两个位移图结果名：MAP_RES = 位移图叠过中性灰（正常折射），
       NEUTRAL_RES = 纯中性灰（零位移，用于尺寸变化期间）。 */
    var MAP_RES = 'mapSafe', NEUTRAL_RES = 'neutral';

    var feB = document.createElementNS(NS, 'feGaussianBlur');
    feB.setAttribute('in', 'SourceGraphic');
    feB.setAttribute('stdDeviation', Math.max(cfg.blur * (FIXED.blur / 100), .01));
    feB.setAttribute('result', 'frost');

    var feI = document.createElementNS(NS, 'feImage');
    feI.setAttribute('x', '0'); feI.setAttribute('y', '0');
    feI.setAttribute('preserveAspectRatio', 'none');
    feI.setAttribute('result', 'map');

    /* 中性兜底：位移图只覆盖「上一次重建时的盒子」。元素尺寸一变（灵动岛 0.55s 展开
       动画、窗口拖动）位移图必然滞后，未被覆盖的像素在 feDisplacementMap 眼里是
       transparent black → R/G = 0 → 折算成 (0/255 − 0.5) × scale 的最大负向偏移
       （.dynamic-island 的 scale = 30 × 2 × 1.6 = 96，即整块背景被推走 48px——
       肉眼看到的「展开时背景错位」）。故先铺一层中性灰（feDisplacementMap 的零位移
       取值），再把位移图 over 上去：未覆盖处变成「零位移」，背景不再跳位。 */
    var feF = document.createElementNS(NS, 'feFlood');
    feF.setAttribute('flood-color', 'rgb(128,128,128)');
    feF.setAttribute('result', NEUTRAL_RES);

    var feC = document.createElementNS(NS, 'feComposite');
    feC.setAttribute('in', 'map'); feC.setAttribute('in2', NEUTRAL_RES);
    feC.setAttribute('operator', 'over');
    feC.setAttribute('result', MAP_RES);

    var feD = document.createElementNS(NS, 'feDisplacementMap');
    feD.setAttribute('in', 'frost'); feD.setAttribute('in2', MAP_RES);
    feD.setAttribute('scale', cfg.depth * 2 * (FIXED.depth / 100));
    feD.setAttribute('xChannelSelector', 'R'); feD.setAttribute('yChannelSelector', 'G');

    var feS = document.createElementNS(NS, 'feColorMatrix');
    feS.setAttribute('type', 'saturate'); feS.setAttribute('values', '1.7');

    filter.append(feB, feF, feI, feC, feD, feS);
    ensureDefs().appendChild(filter);

    var it = { el: el, cfg: cfg, feB: feB, feI: feI, feD: feD, filter: filter, id: id, timer: 0, ro: null, stale: false };
    items.push(it);

    it.build = function () {
      /* 必须用 offsetWidth/offsetHeight（布局尺寸），不能用 getBoundingClientRect()：
         后者返回的是**变换后的视觉尺寸**，元素带 scale/translate 动画时（如弹窗
         入场动画 transform: matrix(0.98,...)）会得到偏小的宽高，位移图随之被拉伸
         错位，边缘折射位置全错。隐藏元素 offsetWidth 为 0，正好作为「尚未可测」的判据。 */
      var w = el.offsetWidth, h = el.offsetHeight;
      if (w < 2 || h < 2) return;                         /* 隐藏元素：等 ResizeObserver 再建 */
      w = Math.max(4, Math.round(w)); h = Math.max(4, Math.round(h));
      var rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || Math.min(w, h) / 2;
      rad = Math.min(rad, Math.min(w, h) / 2);
      feI.setAttribute('width', w); feI.setAttribute('height', h);
      feI.setAttribute('href', makeMap(w, h, rad, cfg.bezel));
      feD.setAttribute('in2', MAP_RES);                  /* 位移图已与当前盒子对齐 → 启用折射 */
      /* 必须用 important 内联声明：.dynamic-island / .liquid-glass 等在样式表里
         对 backdrop-filter 也标了 !important，普通内联声明会输给它们。
         「内联 important」优先级高于「样式表 important」，故此处必须带 important。 */
      el.style.setProperty('backdrop-filter', 'url(#' + id + ')', 'important');
      el.style.setProperty('-webkit-backdrop-filter', 'url(#' + id + ')', 'important');
      it.stale = false;
    };

    /* 尺寸一变就把位移量切成中性灰（= 零位移），其余滤镜链原样保留：
       feGaussianBlur + feColorMatrix 不变，外观仍是同一块玻璃，只是暂时没有边缘折射。
       绝不换成 CSS 兜底毛玻璃——那是另一种材质（blur 20px vs 折射态的 2.7px），
       展开动画里会看出「先旧玻璃、后新玻璃」的跳变。 */
    it.markStale = function () {
      if (it.stale) return;
      it.stale = true;
      feD.setAttribute('in2', NEUTRAL_RES);
    };

    /* 尾随防抖：尺寸稳定后再重建，避免动画期间每帧重算位移图 */
    it.schedule = function () {
      it.markStale();
      if (it.timer) clearTimeout(it.timer);
      it.timer = setTimeout(function () {
        it.timer = 0;
        it.build();
      }, REBUILD_DEBOUNCE);
    };

    it.ro = new ResizeObserver(function () {
      if (el.offsetWidth > 2 && el.offsetHeight > 2) it.schedule();
    });
    it.ro.observe(el);

    it.build();
  }

  function teardown() {
    items.forEach(function (it) {
      if (it.timer) { clearTimeout(it.timer); it.timer = 0; }
      if (it.ro) { it.ro.disconnect(); it.ro = null; }
      if (it.filter && it.filter.parentNode) it.filter.parentNode.removeChild(it.filter);
      it.el.style.removeProperty('backdrop-filter');
      it.el.style.removeProperty('-webkit-backdrop-filter');
      it.el.__lgv2 = false;
    });
    items = [];
  }

  /* 启用：注册全部目标元素并建立折射 */
  function enable() {
    if (active) return;
    active = true;
    if (!canRefract()) return;          /* 降级：材质仍由 CSS 提供，不做折射 */
    TARGETS.forEach(function (cfg) {
      document.querySelectorAll(cfg.sel).forEach(function (el) { register(el, cfg); });
    });
  }

  /* 停用：移除滤镜与内联 backdrop-filter，回到 CSS 变量驱动的旧玻璃 */
  function disable() {
    if (!active) return;
    active = false;
    teardown();
    if (defs && defs.parentNode) {
      defs.parentNode.parentNode.removeChild(defs.parentNode);
      defs = null;
    }
  }

  /* 隐藏容器（如设置模态）显示后补建位移图 */
  function flush() {
    if (!active || !canRefract()) return;
    items.forEach(function (it) {
      if (it.el.offsetWidth > 2 && it.el.offsetHeight > 2) it.build();
    });
  }

  /* 跨过 768px 断点时重估：从窄屏拉宽需补建折射，拉窄则拆除省开销。
     由 main.js 在切换时与窗口尺寸变化时调用。 */
  function refresh() {
    if (!active) return;
    var want = canRefract();
    var have = items.length > 0;
    if (want && !have) {
      TARGETS.forEach(function (cfg) {
        document.querySelectorAll(cfg.sel).forEach(function (el) { register(el, cfg); });
      });
    } else if (!want && have) {
      teardown();
    }
  }

  window.HarmoniaLiquidGlassV2 = {
    FIXED: FIXED,
    enable: enable,
    disable: disable,
    flush: flush,
    refresh: refresh,
    get supported() { return isDesktopChromium; },
    get active() { return active; }
  };
})();