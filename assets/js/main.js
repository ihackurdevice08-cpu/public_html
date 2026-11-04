(function () {
  var html = document.documentElement;
  html.classList.add('js');

  var header = document.getElementById('header');
  if (header) initHeader();
  if (document.getElementById('ho-wo')) initHome();
  initCase();
  initContact();
  initLightbox();

  /* ---------- 헤더: 서울 시각, 등장 ---------- */
  function initHeader() {
    var dq = window.matchMedia('(min-width: 961px) and (hover: hover) and (pointer: fine)');
    var setDesk = function () { html.classList.toggle('desk', dq.matches); };
    setDesk();
    if (dq.addEventListener) dq.addEventListener('change', setDesk); else if (dq.addListener) dq.addListener(setDesk);
    var t = document.querySelector('#header-time span');
    var tick = function () {
      try {
        t.textContent = '서울 ' + new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false });
      } catch (e) { t.textContent = ''; }
    };
    tick();
    setInterval(tick, 20000);
    requestAnimationFrame(function () { requestAnimationFrame(function () { html.classList.add('is-in'); }); });
  }

  /* ---------- 홈: 프로젝트 선택기 ---------- */
  function initHome() {
    var mq = window.matchMedia('(min-width: 961px) and (hover: hover) and (pointer: fine)');
    var root = document.getElementById('ho-wo');
    var logo = document.getElementById('logo');
    var fix = document.getElementById('fix');
    var btns = [].slice.call(document.querySelectorAll('#ho-wo-mo button'));
    var els = [].slice.call(document.querySelectorAll('#ho-items .it'));
    var n = els.length;
    var ti = [document.querySelector('#ho-wo-0-ti > div'), document.querySelector('#ho-wo-1-ti > div')];
    var tiLines = ti.map(function (d) { return [].slice.call(d.children); });
    var me0 = [].slice.call(document.querySelectorAll('#ho-wo-0-me > div'));
    var me1 = [].slice.call(document.querySelectorAll('#ho-wo-1-me > div:first-child > div'));
    var cellsEl = document.getElementById('ho-wo-2-cells');
    var hvs = [].slice.call(document.querySelectorAll('#ho-wo-2-ov .hv'));

    var PU = 0.09, SU = 0.07, C0 = 0.09; // 레퍼런스에서 측정한 보간 계수
    var desk = false, mode = 0, W = 0, H = 0, REM = 10;
    var sc = [{ cur: 0, tar: 0 }, { cur: 0, tar: 0 }, { cur: 0, tar: 0 }];
    var lp = [{}, {}, {}];
    var snapped = true, scrolling = false, hasScrolled = false, centerIdx = 0, active = -1;
    var logoGap = 0, logoBase = 0, maxItemH = 0, morph = false, hoverIdx = -1;
    var last = performance.now();

    var items = els.map(function (el) {
      var g = el.dataset.grid.split(',').map(Number);
      return {
        el: el, im: el.querySelector('.im'), img: el.querySelector('img'),
        rem: +el.dataset.w, a: +el.dataset.a, gr: g[0], gc: g[1], gs: g[2],
        bw: 1, op: 0, tbw: 1, top: 1,
        rect: { x: 0, y: 0, w: 0, h: 0, rz: 0 }, off: { x: 0, y: 0, w: 0, h: 0, rz: 0 }
      };
    });

    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    var mod = function (v, m) { return ((v % m) + m) % m; };
    var wrap = function (v, L, at) { var q = mod(v, L); if (q > at) q -= L; return q; };
    var pad2 = function (v) { return (v < 10 ? '0' : '') + v; };

    /* 모드별 배치 (스크롤 0 기준 화면 좌표) */
    function compute() {
      W = window.innerWidth; H = window.innerHeight;
      REM = parseFloat(getComputedStyle(html).fontSize);
      var gap = REM * 0.5, y = 0, x = 0, maxH = 0, maxVW = 0, maxVH = 0;
      items.forEach(function (it) {
        it.w = it.rem * REM; it.h = it.w / it.a;
        it.l0 = { x: (W - it.w) / 2, y: y }; y += it.h + gap; maxH = Math.max(maxH, it.h);
        it.l1 = { x: x }; x += it.h + gap; maxVW = Math.max(maxVW, it.h); maxVH = Math.max(maxVH, it.w);
      });
      lp[0] = { L: Math.max(y, H + 2 * maxH + 100) }; lp[0].at = lp[0].L / 2 + maxH;
      logoBase = REM * 13.25; maxItemH = maxVW; // 간격 = 13.25rem + (가장 넓은 폭 - 활성 항목 폭) / 2
      var gapMax = logoBase + maxVW / 2; // 이웃 항목이 밀려나는 최대 거리
      lp[1] = { at: W + gapMax + 20 }; lp[1].L = Math.max(x, lp[1].at + maxVW + gapMax + 20); // 화면 밖에서만 순환되도록
      var c = (W - 13 * REM) / 12, ch = c * 1.4923;
      items.forEach(function (it) {
        var wd = it.gs * c + (it.gs - 1) * REM;
        it.l2 = { x: REM + (it.gc - 1) * (c + REM), y: 3 * REM + (it.gr - 1) * (ch + 8 * REM), w: wd, h: wd / it.a };
      });
      var rows = parseInt(cellsEl.style.getPropertyValue('--rows'), 10) || 5;
      lp[2] = { max: Math.max(0, 6 * REM + rows * ch + (rows - 1) * 8 * REM - H) };
      cellsEl.style.setProperty('--ch', ch + 'px');
    }

    function gapOff(cx, mid) {
      if (logoGap <= 0) return 0;
      var u = cx - mid, e = clamp(u / (logoGap * 0.65), -1, 1);
      return e * Math.abs(e) * logoGap;
    }

    function target(it) {
      if (mode === 0) {
        return { x: it.l0.x, y: wrap(it.l0.y - sc[0].cur, lp[0].L, lp[0].at), w: it.w, h: it.h, rz: 0 };
      }
      if (mode === 1) {
        var sx = wrap(it.l1.x - sc[1].cur, lp[1].L, lp[1].at);
        var cx = sx + it.h / 2;
        cx += gapOff(cx, W / 2);
        return { x: cx - it.w / 2, y: H / 2 - it.h / 2, w: it.w, h: it.h, rz: -90 };
      }
      return { x: it.l2.x, y: it.l2.y - sc[2].cur, w: it.l2.w, h: it.l2.h, rz: 0 };
    }

    function closest() {
      var best = 0, bd = Infinity;
      items.forEach(function (it, i) {
        var r = it.rect;
        var d = mode === 1 ? Math.abs(r.x + r.w / 2 - W / 2) : Math.abs(r.y + r.h / 2 - H / 2);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    }
    var curIdx = function () { return hasScrolled ? closest() : centerIdx; };

    function nearestSnap(h) {
      var it = items[closest()];
      var j = mode === 1 ? it.l1.x + it.h / 2 - W / 2 : it.l0.y + it.h / 2 - H / 2;
      var L = lp[mode].L;
      return h + (mod(j - h + L / 2, L) - L / 2);
    }

    /* 활성 항목이 바뀌면 목록과 메타가 즉시 바뀜 */
    function setActive(k) {
      if (k === active) return;
      active = k;
      var lh = 1.32 * REM, loop = n * lh;
      tiLines.forEach(function (lines) {
        lines.forEach(function (a, i) {
          var o = i * lh, pos = mod(o - k * lh + loop / 2 - lh / 2, loop);
          a.style.transform = 'translate3d(0,' + (pos - o) + 'px,0)';
          a.style.opacity = i === k ? '1' : '0.21';
        });
      });
      [me0, me1].forEach(function (rows) { rows.forEach(function (r, i) { r.classList.toggle('is-on', i === k); }); });
    }

    function updLogoGap() {
      var mid = W / 2, u = 0, e = 0, b2 = logoBase * 2;
      items.forEach(function (it) {
        var q = it.rect.x + it.rect.w / 2, o = Math.abs(q - mid);
        if (o > b2) return;
        var j = 1 - o / b2, x = j * j;
        e += it.h * x; u += x;
      });
      var avg = u > 0 ? e / u : maxItemH, tgt = logoBase + (maxItemH - avg) * 0.5;
      logoGap = Math.abs(logoGap - tgt) < 0.3 ? tgt : logoGap + (tgt - logoGap) * F(C0);
    }

    var Fk = 0.016;
    function F(T) { return 1 - Math.exp(-T * 60 * Fk); }

    function scrollTick() {
      var s = sc[mode];
      if (mode < 2 && !snapped && scrolling && Math.abs(s.cur - s.tar) < 3) {
        s.tar = nearestSnap(s.cur); snapped = true; scrolling = false;
      }
      if (Math.abs(s.cur - s.tar) > 0.5) s.cur += (s.tar - s.cur) * F(snapped ? SU : PU);
      else s.cur = s.tar;
    }

    function tick(now) {
      Fk = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      if (desk) frame();
      requestAnimationFrame(tick);
    }

    function frame() {
      scrollTick();
      if (mode === 1) updLogoGap();
      var k = mode < 2 ? curIdx() : -1;
      if (mode < 2) setActive(k);
      var still = true;
      items.forEach(function (it, i) {
        var o = it.off;
        ['x', 'y', 'w', 'h'].forEach(function (p) { o[p] = Math.abs(o[p]) < 0.5 ? 0 : o[p] + (0 - o[p]) * F(C0); });
        o.rz = Math.abs(o.rz) < 0.05 ? 0 : o.rz + (0 - o.rz) * F(C0);
        if (o.x || o.y || o.w || o.h || o.rz) still = false;
        var t = target(it);
        var r = { x: t.x + o.x, y: t.y + o.y, w: t.w + o.w, h: t.h + o.h, rz: t.rz + o.rz };
        it.rect = r;
        it.el.style.width = r.w.toFixed(2) + 'px';
        it.el.style.height = r.h.toFixed(2) + 'px';
        it.el.style.transform = 'translate3d(' + r.x.toFixed(2) + 'px,' + r.y.toFixed(2) + 'px,0) rotate(' + r.rz.toFixed(3) + 'deg)';
        // 흑백과 불투명도
        if (mode < 2) { it.tbw = i === k ? 0 : 1; it.top = i === k ? 1 : 0.7; }
        else { it.tbw = 1; it.top = i === hoverIdx ? 0 : 0.14; }
        it.bw = Math.abs(it.bw - it.tbw) < 0.005 ? it.tbw : it.bw + (it.tbw - it.bw) * F(C0);
        it.op = Math.abs(it.op - it.top) < 0.005 ? it.top : it.op + (it.top - it.op) * F(C0);
        it.im.style.filter = it.bw > 0.001 ? 'grayscale(' + it.bw.toFixed(3) + ')' : '';
        it.el.style.opacity = it.op.toFixed(3);
        // 이미지 안쪽 시차
        var py = 0;
        if (mode === 0) py = -0.05 * clamp((r.y + r.h / 2 - H / 2) / (H / 2 + r.h / 2), -1, 1);
        else if (mode === 1) py = -0.05 * clamp((r.x + r.w / 2 - W / 2) / (W / 2), -1, 1);
        it.img.style.transform = py ? 'translate3d(0,' + (py * r.h).toFixed(2) + 'px,0)' : '';
      });
      if (mode === 2) cellsEl.style.transform = 'translate3d(0,' + (-sc[2].cur).toFixed(2) + 'px,0)';
      if (morph && still) morph = false;
    }

    /* 보기 전환: 이전 화면 위치와의 차이를 보간으로 줄임 */
    function setMode(m) {
      if (!desk || m === mode) return;
      var old = items.map(function (it) { return { x: it.rect.x, y: it.rect.y, w: it.rect.w, h: it.rect.h, rz: it.rect.rz }; });
      var from = mode, k = from === 2 ? Math.floor(n / 2) : closest();
      hideHover();
      mode = m;
      if (m === 2) { sc[2].cur = sc[2].tar = 0; }
      else {
        var it = items[k];
        sc[m].cur = sc[m].tar = m === 1 ? it.l1.x + it.h / 2 - W / 2 : it.l0.y + it.h / 2 - H / 2;
        centerIdx = k; hasScrolled = false;
      }
      snapped = true; scrolling = false;
      items.forEach(function (it, i) {
        var t = target(it), o = old[i];
        it.off = { x: o.x - t.x, y: o.y - t.y, w: o.w - t.w, h: o.h - t.h, rz: o.rz - t.rz };
      });
      morph = true;
      applyModeState();
      if (m < 2) { active = -1; setActive(k); }
    }

    function applyModeState() {
      root.dataset.mode = String(mode);
      document.body.dataset.mode = String(mode);
      btns.forEach(function (b) { b.classList.toggle('is-on', +b.dataset.m === mode); });
      logo.classList.toggle('is-spread', mode < 2);
      fix.classList.toggle('is-out', mode === 2);
      if (mode === 2) cellsEl.style.transform = '';
    }

    /* 입력: 휠, 키보드 */
    function addScroll(d) {
      if (morph) return;
      var s = sc[mode];
      snapped = false; scrolling = true; hasScrolled = true;
      s.tar += d;
      if (mode === 2) s.tar = clamp(s.tar, 0, lp[2].max);
    }
    document.body.addEventListener('wheel', function (e) {
      if (!desk) return;
      e.preventDefault();
      var dx = e.deltaX, dy = e.deltaY;
      if (e.deltaMode === 1) { dx *= 16; dy *= 16; } else if (e.deltaMode === 2) { dx *= H; dy *= H; }
      addScroll(e.shiftKey ? dy : Math.abs(dx) > Math.abs(dy) ? dx : dy);
    }, { passive: false });
    document.addEventListener('keydown', function (e) {
      if (!desk || e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      var d = 0;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') d = -100;
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') d = 100;
      else if (e.key === ' ') d = (H - 40) * (e.shiftKey ? -1 : 1);
      else return;
      e.preventDefault();
      addScroll(d);
    });
    btns.forEach(function (b) { b.addEventListener('click', function () { setMode(+b.dataset.m); }); });

    /* 격자 보기: 항목에 마우스를 올리면 가운데에 미리보기와 큰 제목 */
    var slide = function (el, y) { el.style.transition = 'none'; el.style.transform = 'translate3d(0,' + y + ',0)'; void el.offsetWidth; el.style.transition = ''; };
    var rise = function (el) { el.style.transform = 'translate3d(0,0,0)'; };
    function showHover(i) {
      if (mode !== 2 || morph) return;
      if (hoverIdx === i) return;
      if (hoverIdx >= 0) hideHover();
      hoverIdx = i;
      var hv = hvs[i];
      hv.classList.add('is-on');
      var big = hv.querySelector('.ti > div');
      slide(big, '110%'); rise(big);
      [].slice.call(hv.querySelectorAll('.me > div > div')).forEach(function (d) { slide(d, '110%'); rise(d); });
      logo.classList.add('is-spread');
      items[i].el.classList.add('is-hv');
    }
    function hideHover() {
      if (hoverIdx < 0) return;
      var hv = hvs[hoverIdx];
      hv.classList.remove('is-on');
      hv.querySelector('.ti > div').style.transform = 'translate3d(0,-110%,0)';
      [].slice.call(hv.querySelectorAll('.me > div > div')).forEach(function (d) { d.style.transform = 'translate3d(0,-110%,0)'; });
      items[hoverIdx].el.classList.remove('is-hv');
      hoverIdx = -1;
      if (mode === 2) logo.classList.remove('is-spread');
    }
    items.forEach(function (it, i) {
      it.el.addEventListener('mouseenter', function () { showHover(i); });
      it.el.addEventListener('mouseleave', function () { if (hoverIdx === i) hideHover(); });
      it.el.addEventListener('focus', function () { showHover(i); });
      it.el.addEventListener('blur', function () { if (hoverIdx === i) hideHover(); });
    });

    function applyDesk() {
      var was = desk;
      desk = mq.matches;
      html.classList.toggle('desk', desk);
      if (!desk) {
        items.forEach(function (it) { it.el.style.cssText = ''; it.im.style.filter = ''; it.img.style.transform = ''; });
        return;
      }
      compute();
      if (!was) {
        mode = 0; hoverIdx = -1; active = -1; hasScrolled = false; centerIdx = 0;
        var it0 = items[0];
        sc[0].cur = sc[0].tar = it0.l0.y + it0.h / 2 - H / 2;
        items.forEach(function (it, i) { var t = target(it); it.rect = t; it.off = { x: 0, y: 0, w: 0, h: 0, rz: 0 }; });
        logoGap = logoBase;
        applyModeState();
        setActive(0);
        setTimeout(function () { logo.classList.add('is-spread'); }, 200);
      }
    }

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (!desk) return;
        var k = mode < 2 ? curIdx() : 0;
        compute();
        if (mode < 2) {
          var it = items[k];
          sc[mode].cur = sc[mode].tar = mode === 1 ? it.l1.x + it.h / 2 - W / 2 : it.l0.y + it.h / 2 - H / 2;
          snapped = true; scrolling = false;
        } else sc[2].cur = sc[2].tar = clamp(sc[2].cur, 0, lp[2].max);
        active = -1; if (mode < 2) setActive(k);
      }, 120);
    });
    if (mq.addEventListener) mq.addEventListener('change', applyDesk); else if (mq.addListener) mq.addListener(applyDesk);
    applyDesk();
    requestAnimationFrame(tick);
  }

  /* ---------- 상세: 한 장씩 넘기는 카드 뷰어 ---------- */
  function initCase() {
    var track = document.getElementById('track');
    var tabs = document.querySelectorAll('.tabs [role="tab"]');
    document.documentElement.classList.add('js');
    if (tabs.length) {
      var show = function (id) {
        tabs.forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-t') === id)); });
        document.querySelectorAll('.tab-panel').forEach(function (p) { p.hidden = p.id !== id; });
      };
      tabs.forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-t')); }); });
      show(tabs[0].getAttribute('data-t'));
    }
    if (!track) return;
    var slides = [].slice.call(track.children);
    var ths = [].slice.call(document.querySelectorAll('#thumbs .th'));
    var docBtns = [].slice.call(document.querySelectorAll('.doc'));
    var prev = document.querySelector('.nav.prev'), nxt = document.querySelector('.nav.next');
    var cnt = document.querySelector('.stage-cap .cnt'), cap = document.querySelector('.stage-cap .cap');
    var thBox = document.getElementById('thumbs');
    var cur = 0, ticking = false;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    function firstOf(d) { for (var k = 0; k < slides.length; k++) if (slides[k].getAttribute('data-doc') === String(d)) return k; return 0; }
    function setCur(k) {
      cur = k;
      var s = slides[k];
      cnt.textContent = (k + 1) + ' / ' + slides.length;
      cap.textContent = s.getAttribute('data-dt') + ' · ' + s.getAttribute('data-cap');
      prev.disabled = k === 0; nxt.disabled = k === slides.length - 1;
      ths.forEach(function (t, j) { t.classList.toggle('is-on', j === k); });
      docBtns.forEach(function (d) { d.classList.toggle('is-on', d.getAttribute('data-doc') === s.getAttribute('data-doc')); });
      var t = ths[k];
      if (t && thBox) thBox.scrollTo({ left: t.offsetLeft - thBox.clientWidth / 2 + t.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
    }
    function go(k, instant) {
      k = Math.max(0, Math.min(slides.length - 1, k));
      track.scrollTo({ left: k * track.clientWidth, behavior: instant || reduce ? 'auto' : 'smooth' });
      if (instant) setCur(k);
    }
    track.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var k = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        if (k !== cur) setCur(k);
      });
    }, { passive: true });
    prev.addEventListener('click', function () { go(cur - 1); });
    nxt.addEventListener('click', function () { go(cur + 1); });
    ths.forEach(function (t, j) { t.addEventListener('click', function () { go(j); }); });
    docBtns.forEach(function (d) { d.addEventListener('click', function () { go(firstOf(d.getAttribute('data-doc'))); }); });
    document.addEventListener('keydown', function (e) {
      if (document.querySelector('dialog[open]') || e.altKey || e.ctrlKey || e.metaKey) return;
      var tg = e.target && e.target.tagName;
      if (tg === 'INPUT' || tg === 'TEXTAREA' || (e.target && e.target.getAttribute && e.target.getAttribute('role') === 'tab')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
    });
    window.addEventListener('resize', function () { track.scrollTo({ left: cur * track.clientWidth, behavior: 'auto' }); });
    var m = /^#d(\d+)$/.exec(location.hash || '');
    if (m) go(firstOf(Number(m[1]) - 1), true);
  }

  /* ---------- 상세: 이미지를 누르면 크게 보기 ---------- */
  function initContact() {
    var btn = document.querySelector('.btn-contact');
    var dlg = document.getElementById('cdlg');
    if (!btn) return;
    if (!dlg || typeof dlg.showModal !== 'function') { btn.hidden = true; return; }
    var q = dlg.querySelector('#cd-q'), opts = dlg.querySelector('#cd-opts'), err = dlg.querySelector('#cd-err');
    var chk = dlg.querySelector('#cd-check'), done = dlg.querySelector('#cd-done');
    var mail = dlg.querySelector('#cd-mail'), link = dlg.querySelector('#cd-link');
    var copy = dlg.querySelector('#cd-copy'), msg = dlg.querySelector('#cd-copied');
    var ans = 0, t0 = 0;
    function rnd(n) { return Math.floor(Math.random() * n); }
    function newQ() {
      var a = 3 + rnd(7), b = 3 + rnd(7), set, d;
      ans = a + b;
      q.textContent = a + ' + ' + b + ' = ?';
      set = [ans];
      while (set.length < 4) { d = ans + rnd(9) - 4; if (d > 0 && set.indexOf(d) < 0) set.push(d); }
      set.sort(function () { return Math.random() - 0.5; });
      opts.textContent = '';
      set.forEach(function (v) {
        var o = document.createElement('button');
        o.type = 'button'; o.className = 'cd-opt'; o.textContent = v; o.setAttribute('data-v', v);
        opts.appendChild(o);
      });
      t0 = Date.now();
    }
    btn.addEventListener('click', function () {
      chk.hidden = false; done.hidden = true; err.textContent = ''; msg.textContent = ''; mail.textContent = '';
      newQ();
      dlg.showModal();
    });
    opts.addEventListener('click', function (e) {
      var o = e.target.closest ? e.target.closest('.cd-opt') : null, m;
      if (!o || Date.now() - t0 < 600) return;
      if (Number(o.getAttribute('data-v')) === ans) {
        m = atob(btn.getAttribute('data-c'));
        mail.textContent = m;
        link.href = 'mailto:' + m + '?subject=' + encodeURIComponent(document.title.split(' | ')[0] + ' 문의');
        chk.hidden = true; done.hidden = false;
        link.focus();
      } else {
        err.textContent = '다시 선택해 주세요.';
        newQ();
      }
    });
    copy.addEventListener('click', function () {
      var m = mail.textContent;
      function ok() { msg.textContent = '복사했습니다.'; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(m).then(ok, function () {});
      else {
        var r = document.createRange(), sel = window.getSelection();
        r.selectNodeContents(mail); sel.removeAllRanges(); sel.addRange(r);
        try { document.execCommand('copy'); ok(); } catch (x) {}
      }
    });
    dlg.querySelector('.cd-x').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { mail.textContent = ''; btn.focus(); });
  }

  function initLightbox() {
    var zooms = document.querySelectorAll('a.zoom');
    if (!zooms.length || typeof HTMLDialogElement !== 'function') return;
    var dlg = document.createElement('dialog');
    dlg.className = 'lb';
    dlg.innerHTML = '<button type="button">닫기</button><img alt="">';
    document.body.appendChild(dlg);
    var big = dlg.querySelector('img');
    dlg.querySelector('button').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    zooms.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var img = a.querySelector('img');
        big.src = a.getAttribute('href');
        big.alt = img ? img.alt : '';
        dlg.showModal();
      });
    });
  }
})();
