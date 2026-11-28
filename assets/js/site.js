/* gangadharsingh.me — behaviour. No framework, no build step.
   Everything on the page is readable without this file; it adds the live checks,
   the repository index, the command palette and the motion. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GH = 'https://github.com/Gangadhar017/';
  var EMAIL = ['gangadhar000017', 'gmail.com'].join('@');

  /* ---------- theme ---------- */

  var cordCtrl = null;
  function setTheme(t, fromCord) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch (e) {}
    var m = $('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? '#0b0b0a' : '#f2eee5');
    var hitEl = $('#cordHit');
    if (hitEl) hitEl.setAttribute('aria-checked', String(t === 'dark'));
    if (cordCtrl) {
      if (!fromCord) cordCtrl.tug();
      else cordCtrl.redraw();
    }
  }
  function toggleTheme(fromCord) {
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', fromCord === true);
  }
  var themeBtn = $('#theme');
  if (themeBtn) themeBtn.addEventListener('click', function () { toggleTheme(false); });

  /* ---------- hanging pull cord ---------- */

  cordCtrl = (function pullCord() {
    var wrap = $('#cord'), cv = $('.cord__cv', wrap), hit = $('#cordHit');
    if (!wrap || !cv || !hit || !cv.getContext) return null;
    var ctx = cv.getContext('2d');
    var N = 20, G = 4600, ITER = 16;
    var dpr = 1, W = 120, H = 220;
    var L = 104, EXT_MAX = 56, HIDDEN = 74, seg = 9, ax = 60, thick = 2.6;
    var pts = [];
    var ext = 0, extV = 0, armed = true, suppressToggle = false, hover = false;
    var grab = -1, grabOff = { x: 0, y: 0 }, target = null, ptr = null, ptrPrev = null;
    var downAt = 0, downPos = null, moved = 0, t = 0;
    var lastT = 0, rafId = 0, isRunning = false, restFrames = 0;

    function isDark() {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    function layout() {
      var vw = window.innerWidth;
      L = vw < 640 ? 74 : 104;
      EXT_MAX = vw < 640 ? 44 : 56;
      HIDDEN = EXT_MAX + 18;
      W = 120;
      H = Math.round(L + EXT_MAX + 56);
      wrap.style.height = H + 'px';
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      var newAx = W / 2;
      seg = (L + HIDDEN) / N;
      if (!pts.length) {
        for (var i = 0; i <= N; i++) {
          var x = newAx, y = -HIDDEN + i * seg;
          pts.push({ x: x, y: y, px: x, py: y, w: i === 0 ? 0 : i === N ? 0.28 : 1 });
        }
      } else {
        var dx = newAx - ax;
        for (var j = 0; j < pts.length; j++) { pts[j].x += dx; pts[j].px += dx; }
      }
      ax = newAx;
    }

    function playSwitchSound() {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        var actx = new AC();
        var osc = actx.createOscillator();
        var g = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(820, actx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(130, actx.currentTime + 0.045);
        g.gain.setValueAtTime(0.2, actx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.045);
        osc.connect(g);
        g.connect(actx.destination);
        osc.start();
        osc.stop(actx.currentTime + 0.05);
      } catch (e) {}
    }

    function step(dt) {
      t += dt;
      if (grab < 0) {
        var K = 760, C = 21;
        extV += (-K * ext - C * extV) * dt;
        ext += extV * dt;
      }
      if (ext > EXT_MAX * 0.72 && armed) {
        armed = false;
        if (!suppressToggle) {
          toggleTheme(true);
          playSwitchSound();
        }
      }
      if (ext < EXT_MAX * 0.22) {
        armed = true;
        if (extV <= 0) suppressToggle = false;
      }

      var a = pts[0];
      a.x = a.px = ax;
      a.y = a.py = -HIDDEN + ext;

      var wind = Math.sin(t * 0.7) * 10 + Math.sin(t * 1.8 + 1.1) * 4;
      var damp = grab >= 0 ? 0.992 : 0.986;
      for (var i = 1; i <= N; i++) {
        if (i === grab) continue;
        var p = pts[i];
        var vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
        p.px = p.x; p.py = p.y;
        p.x += vx + wind * dt * dt * (i / N);
        p.y += vy + G * dt * dt;
      }
      if (grab >= 0 && target) {
        var g = pts[grab];
        g.px = g.x; g.py = g.y;
        g.x = target.x; g.y = target.y;
      }
      for (var k = 0; k < ITER; k++) {
        for (var idx = 0; idx < N; idx++) {
          var p1 = pts[idx], p2 = pts[idx + 1];
          var w1 = idx === grab ? 0 : p1.w, w2 = idx + 1 === grab ? 0 : p2.w;
          var sw = w1 + w2;
          if (!sw) continue;
          var dx = p2.x - p1.x, dy = p2.y - p1.y;
          var d = Math.hypot(dx, dy) || 1e-6;
          var diff = (d - seg) / d / sw;
          p1.x += dx * diff * w1; p1.y += dy * diff * w1;
          p2.x -= dx * diff * w2; p2.y -= dy * diff * w2;
        }
      }
      for (var m = 1; m <= N; m++) {
        var pm = pts[m];
        if (pm.x < 14) pm.x = 14; else if (pm.x > W - 14) pm.x = W - 14;
        if (pm.y > H - 36) pm.y = H - 36;
      }
    }

    function updateDrag() {
      if (grab < 0 || !ptr) return;
      var tx = ptr.x - grabOff.x, ty = ptr.y - grabOff.y;
      var bx = ax, by = -HIDDEN;
      var reach = grab * seg;
      var dx = tx - bx, dy = ty - by, d = Math.hypot(dx, dy) || 1e-6;
      var need = d - reach;
      if (need > EXT_MAX) {
        var over = need - EXT_MAX;
        var allowed = reach + EXT_MAX + over * 0.14 / (1 + over / 160);
        tx = bx + dx / d * allowed; ty = by + dy / d * allowed;
        need = EXT_MAX;
      }
      var targetExt = Math.max(0, need);
      var prevExt = ext;
      ext += (targetExt - ext) * 0.55;
      extV = (ext - prevExt) * 60;
      target = { x: Math.max(14, Math.min(W - 14, tx)), y: Math.min(H - 36, ty) };
    }

    function draw() {
      ctx.clearRect(0, 0, W * dpr, H * dpr);
      ctx.save();
      ctx.scale(dpr, dpr);

      var dark = isDark();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i <= N; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = dark ? 'rgba(239, 235, 225, 0.48)' : 'rgba(20, 19, 16, 0.44)';
      ctx.lineWidth = thick;
      ctx.setLineDash([3, 2.2]);
      ctx.stroke();
      ctx.setLineDash([]);

      var end = pts[N], prev = pts[N - 1];
      var ang = Math.atan2(end.y - prev.y, end.x - prev.x) - Math.PI / 2;

      ctx.save();
      ctx.translate(end.x, end.y);
      ctx.rotate(ang);
      if (hover || grab >= 0) ctx.scale(1.06, 1.06);

      ctx.beginPath();
      ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
      ctx.fillStyle = dark ? '#bcb7aa' : '#48453d';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-6, 3.5);
      ctx.bezierCurveTo(-7, 15, -9.5, 22, 0, 29);
      ctx.bezierCurveTo(9.5, 22, 7, 15, 6, 3.5);
      ctx.closePath();
      ctx.fillStyle = dark ? '#ff5527' : '#f0421c';
      ctx.shadowColor = dark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(20, 19, 16, 0.22)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 2;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 1;
      ctx.strokeStyle = dark ? 'rgba(239, 235, 225, 0.22)' : 'rgba(20, 19, 16, 0.24)';
      ctx.stroke();

      ctx.restore();
      ctx.restore();

      hit.style.transform = 'translate(' + end.x.toFixed(1) + 'px, ' + (end.y + 15).toFixed(1) + 'px)';
    }

    function local(e) {
      var r = wrap.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function stopLoop() {
      isRunning = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    }

    function loop(now) {
      if (!isRunning) return;
      var dt = Math.min((now - lastT) / 1000, 0.033);
      lastT = now;
      updateDrag();
      step(dt);
      draw();

      if (grab < 0 && Math.abs(ext) < 0.08 && Math.abs(extV) < 0.08) {
        var maxSpeed = 0;
        for (var i = 1; i <= N; i++) {
          var p = pts[i];
          maxSpeed = Math.max(maxSpeed, Math.abs(p.x - p.px), Math.abs(p.y - p.py));
        }
        if (maxSpeed < 0.025) {
          restFrames++;
          if (restFrames > 18) { stopLoop(); return; }
        } else {
          restFrames = 0;
        }
      } else {
        restFrames = 0;
      }
      rafId = requestAnimationFrame(loop);
    }

    function wakeLoop() {
      if (reduce) { draw(); return; }
      if (isRunning || document.hidden) return;
      isRunning = true;
      restFrames = 0;
      lastT = performance.now();
      rafId = requestAnimationFrame(loop);
    }

    function startDrag(e, idx) {
      if (reduce) return;
      suppressToggle = false;
      wakeLoop();
      grab = idx;
      var p = local(e), g = pts[idx];
      grabOff = { x: p.x - g.x, y: p.y - g.y };
      ptr = ptrPrev = p;
      target = { x: g.x, y: g.y };
      downAt = performance.now();
      downPos = p;
      moved = 0;
      wrap.classList.add('dragging');
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    }

    function onMove(e) {
      if (grab < 0) return;
      e.preventDefault();
      ptrPrev = ptr; ptr = local(e);
      moved = Math.max(moved, Math.hypot(ptr.x - downPos.x, ptr.y - downPos.y));
    }

    function endDrag() {
      if (grab < 0) return;
      var g = pts[grab];
      if (ptr && ptrPrev) {
        g.px = g.x - (ptr.x - ptrPrev.x) * 0.5;
        g.py = g.y - (ptr.y - ptrPrev.y) * 0.5;
      }
      var tap = moved < 6 && performance.now() - downAt < 300;
      grab = -1; target = null; ptr = ptrPrev = null;
      wrap.classList.remove('dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      if (tap) {
        extV = EXT_MAX * 42;
        pts[N].px = pts[N].x + 1.5;
      }
      wakeLoop();
    }

    hit.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (reduce) { toggleTheme(true); return; }
      try { hit.setPointerCapture(e.pointerId); } catch (_) {}
      startDrag(e, N);
    });
    hit.addEventListener('pointerenter', function () { hover = true; draw(); wakeLoop(); });
    hit.addEventListener('pointerleave', function () { hover = false; draw(); });
    hit.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        suppressToggle = false;
        if (reduce) { toggleTheme(true); return; }
        wakeLoop();
        extV = EXT_MAX * 42;
        pts[N].px = pts[N].x + 1.5;
      }
    });

    layout();
    draw();
    hit.setAttribute('aria-checked', String(isDark()));
    window.addEventListener('resize', function () { layout(); draw(); wakeLoop(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopLoop(); else wakeLoop(); });
    if (!reduce) {
      pts[N].px = pts[N].x - 2.2;
      wakeLoop();
    }

    return {
      redraw: draw,
      tug: function () {
        if (reduce) { draw(); return; }
        suppressToggle = true;
        extV = EXT_MAX * 16;
        pts[N].px = pts[N].x + 1.4;
        wakeLoop();
      }
    };
  })();

  /* ---------- top bar ---------- */

  var bar = $('.topbar');
  function onScroll() { if (bar) bar.classList.toggle('stuck', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- name: set the type so it spans the column exactly ---------- */

  var nameEl = $('#name');
  function fitName() {
    if (!nameEl) return;
    var box = nameEl.parentElement.clientWidth -
      parseFloat(getComputedStyle(nameEl.parentElement).paddingLeft) -
      parseFloat(getComputedStyle(nameEl.parentElement).paddingRight);
    nameEl.style.fontSize = '100px';
    var words = $$('.w > span', nameEl);
    var stacked = getComputedStyle(words[0].parentElement).display === 'block';
    var natural = stacked
      ? Math.max.apply(null, words.map(function (w) { return w.getBoundingClientRect().width; }))
      : $('.name-in', nameEl).getBoundingClientRect().width;
    if (natural > 0) nameEl.style.fontSize = (100 * box / natural * 0.992).toFixed(2) + 'px';
  }
  fitName();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitName);
  window.addEventListener('resize', fitName);

  /* ---------- clock (India Standard Time) ---------- */

  var clock = $('#clock');
  if (clock && window.Intl) {
    var fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var tickClock = function () { clock.textContent = fmt.format(new Date()) + ' IST'; };
    tickClock();
    setInterval(tickClock, 1000);
  }

  /* ---------- ticker: duplicate the list once so the loop has no seam ---------- */

  var track = $('.ticker-track');
  if (track && !reduce) {
    var copy = track.firstElementChild.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    track.appendChild(copy);
  }

  /* ---------- reveal on scroll ---------- */

  var rvs = $$('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    rvs.forEach(function (el) { io.observe(el); });
  } else {
    rvs.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- section highlight in the nav ---------- */

  var navLinks = $$('.nav a');
  if ('IntersectionObserver' in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { var h = a.getAttribute('href'); if (h.charAt(0) === '#') byId[h.slice(1)] = a; });
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove('on'); });
        if (byId[e.target.id]) byId[e.target.id].classList.add('on');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) so.observe(s); });
  }

  /* ---------- screenshot tabs ---------- */

  $$('.shot-tabs').forEach(function (tabs) {
    var img = $('.shot-img', tabs.closest('.shot'));
    var buttons = $$('button', tabs);
    buttons.forEach(function (b) {
      var warm = function () { var i = new Image(); i.src = b.dataset.src; };
      b.addEventListener('pointerenter', warm, { once: true });
      b.addEventListener('focus', warm, { once: true });
      b.addEventListener('click', function () {
        buttons.forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
        img.src = b.dataset.src;
        img.alt = b.dataset.alt || img.alt;
      });
    });
  });

  /* ---------- live checks ----------
     A no-cors request cannot read the reply, only whether one came back and how long it
     took, so the wording is "responding", not "healthy". Hosts that are always on are
     checked when the page opens. Render's free tier sleeps when idle and has a monthly
     hour budget, so those are only contacted when the visitor asks. */

  var onDomain = /(^|\.)gangadharsingh\.me$/.test(location.hostname);
  var FLEET = {
    vigilops: { url: 'https://frontend-sigma-one-0hshbxb8vj.vercel.app/', auto: true },
    zenith: { url: 'https://zenith-project-management.vercel.app/', auto: true },
    nebula: { url: 'https://nebulastream-alpha.vercel.app/', auto: true },
    leafguard: { url: 'https://leaveguarai.vercel.app/', auto: true },
    juris: { url: 'https://botjuris-six.vercel.app/', auto: true },
    chaska: { url: onDomain ? location.origin + '/Chaska-Food-Delivery/' : 'https://gangadhar017.github.io/Chaska-Food-Delivery/', auto: true },
    balcony: { url: onDomain ? location.origin + '/Balcony-Movie-Streaming/' : 'https://gangadhar017.github.io/Balcony-Movie-Streaming/', auto: true },
    katori: { url: onDomain ? location.origin + '/Katori-Food-Waste-Management/' : 'https://gangadhar017.github.io/Katori-Food-Waste-Management/', auto: true },
    satquery: { url: onDomain ? location.origin + '/Lunar_circle/' : 'https://gangadhar017.github.io/Lunar_circle/', auto: true },
    vigilapi: { url: 'https://vigilops.onrender.com/api/health' },
    dealflow: { url: 'https://dealflow360-t22l.onrender.com/' },
    tag: { url: 'https://tag-coding-platform1.onrender.com/' },
    transitops: { url: 'https://transitops-1xru.onrender.com/api/health' },
    satapi: { url: 'https://satquery-ai-skyy.onrender.com/docs' }
  };
  var state = {};

  function paint(key, kind, text) {
    $$('[data-st="' + key + '"]').forEach(function (el) {
      var d = $('.dot', el), t = $('.tx', el);
      if (d) d.className = 'dot ' + (kind === 'ok' ? 'ok' : kind === 'warn' ? 'warn live' : kind === 'wait' ? 'live' : '');
      if (t) t.textContent = text;
    });
  }

  function summary() {
    var el = $('#fleet-sum');
    if (!el) return;
    var auto = Object.keys(FLEET).filter(function (k) { return FLEET[k].auto; });
    var done = auto.filter(function (k) { return state[k]; });
    var ok = auto.filter(function (k) { return state[k] === 'ok'; });
    el.textContent = done.length < auto.length
      ? 'checking ' + done.length + '/' + auto.length
      : ok.length + '/' + auto.length + ' always-on responding';
  }

  function ping(key, patient) {
    var svc = FLEET[key];
    if (!svc || !window.fetch || !window.AbortController) return Promise.resolve();
    state[key] = null;
    paint(key, 'wait', patient ? 'Waking… 0 s' : 'Checking…');
    var t0 = performance.now();
    var ctl = new AbortController();
    var limit = setTimeout(function () { ctl.abort(); }, patient ? 150000 : 12000);
    var tick = patient && setInterval(function () {
      paint(key, 'warn', 'Waking… ' + Math.round((performance.now() - t0) / 1000) + ' s');
    }, 1000);
    return fetch(svc.url, {
      mode: 'no-cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
      headers: { Accept: 'application/json' }, signal: ctl.signal
    }).then(function () {
      var ms = performance.now() - t0;
      state[key] = 'ok';
      paint(key, 'ok', patient
        ? (ms > 4000 ? 'Awake · took ' + Math.round(ms / 1000) + ' s' : 'Awake · ' + Math.round(ms) + ' ms')
        : 'Responding · ' + Math.round(ms) + ' ms');
    }).catch(function () {
      state[key] = 'off';
      paint(key, 'off', patient ? 'No reply in 150 s' : 'No reply');
    }).then(function () {
      clearTimeout(limit);
      if (tick) clearInterval(tick);
      summary();
    });
  }

  function checkAlwaysOn() {
    Object.keys(FLEET).forEach(function (k) { if (FLEET[k].auto) ping(k, false); });
    summary();
  }

  $$('[data-wake]').forEach(function (b) {
    b.addEventListener('click', function () {
      b.disabled = true;
      ping(b.dataset.wake, true).then(function () { b.disabled = false; b.textContent = 'Check again'; });
    });
  });
  var recheck = $('#recheck');
  if (recheck) recheck.addEventListener('click', checkAlwaysOn);

  if (document.readyState === 'complete') setTimeout(checkAlwaysOn, 400);
  else window.addEventListener('load', function () { setTimeout(checkAlwaysOn, 400); });

  /* ---------- Codeforces rating history ---------- */

  var CF = [568, 869, 992, 1103, 1220, 1183, 1072, 1145, 1169];
  function drawSpark(data) {
    var svg = $('#cf-spark');
    if (!svg || data.length < 2) return;
    var W = 300, H = 96, pad = 8, top = 16;
    var lo = Math.min.apply(null, data), hi = Math.max.apply(null, data);
    var x = function (i) { return pad + i * (W - pad * 2) / (data.length - 1); };
    var y = function (v) { return top + (H - top - 14) * (1 - (v - lo) / (hi - lo || 1)); };
    var pts = data.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); });
    var peak = data.indexOf(hi), last = data.length - 1;
    var h = '<line class="gl" x1="' + pad + '" x2="' + (W - pad) + '" y1="' + y(hi).toFixed(1) + '" y2="' + y(hi).toFixed(1) + '"/>' +
      '<polygon class="ar" points="' + pad + ',' + (H - 14) + ' ' + pts.join(' ') + ' ' + (W - pad) + ',' + (H - 14) + '"/>' +
      '<polyline class="ln" points="' + pts.join(' ') + '"/>';
    data.forEach(function (v, i) {
      h += '<circle class="pt' + (i === peak ? ' pk' : '') + '" cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="' + (i === peak || i === last ? 3.2 : 2.2) + '"/>';
    });
    h += '<text x="' + x(peak).toFixed(1) + '" y="' + (y(hi) - 7).toFixed(1) + '" text-anchor="middle">' + hi + '</text>' +
      '<text x="' + pad + '" y="' + (H - 1) + '">first contest ' + data[0] + '</text>' +
      '<text x="' + (W - pad) + '" y="' + (H - 1) + '" text-anchor="end">now ' + data[last] + '</text>';
    svg.innerHTML = h;
  }
  drawSpark(CF);

  // Refresh from the public API when it answers; the numbers in the page stay as the fallback.
  if (window.fetch) {
    fetch('https://codeforces.com/api/user.rating?handle=gangadhar_017')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || j.status !== 'OK' || !j.result.length) return;
        var d = j.result.map(function (c) { return c.newRating; });
        drawSpark(d);
        var set = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
        set('cf-now', d[d.length - 1]);
        set('cf-max', Math.max.apply(null, d));
        set('cf-n', d.length);
      }).catch(function () {});
  }

  /* ---------- repository index ---------- */

  var REPOS = [
    ['VigilOps', 'cloud', 2026, 'Python', 'Monitoring, incidents, configuration security and approved fixes in one Compose stack.', 'live'],
    ['SLM-agent-Lab', 'ai', 2026, 'Python', 'Evaluation harness, LoRA sweep and quantisation study for small tool-calling agents.'],
    ['DealFlow-v1', 'product', 2026, 'JavaScript', 'DealFlow360: quote-to-cash sales operations with discount risk scoring and approval routing.', 'live'],
    ['TransitOps', 'product', 2026, 'JavaScript', 'Fleet operations platform with 37 end-to-end tests and atomic dispatch transactions.', 'live'],
    ['TAG-CODING-PLATFORM', 'product', 2025, 'JavaScript', 'Code judge and live interview room: Monaco, Socket.IO, WebRTC and a Docker compiler image.', 'live'],
    ['Zenith-Project-Management', 'product', 2026, 'JavaScript', 'Project management with live Kanban boards, shared cursors and Gemini tools.', 'live'],
    ['NebulaStream-video-processing-system', 'cloud', 2026, 'JavaScript', 'Queue-driven video transcoding: BullMQ, Redis and an FFmpeg worker.', 'live'],
    ['LeaveGuard-AI', 'ai', 2026, 'Python', 'LeafGuard AI: plant-disease classification from a leaf photo, 80.34% test accuracy.', 'live'],
    ['Lunar_circle', 'ai', 2026, 'TypeScript', 'SatQuery AI: plain-language questions over satellite imagery (Smart India Hackathon, ISRO / SAC).', 'live'],
    ['Chaska-Food-Delivery', 'product', 2026, 'JavaScript', 'Chaska: food ordering with restaurants by area, dish customisation, coupons, checkout and live order tracking.', 'live'],
    ['Balcony-Movie-Streaming', 'product', 2026, 'JavaScript', 'Balcony: streaming for public-domain and open films, with profiles, a list, a player that resumes and a next-episode countdown.', 'live'],
    ['Katori-Food-Waste-Management', 'ai', 2026, 'Python', 'Katori: food-waste forecasting for hostel messes, with cook sheets, a live token queue and models scored on days they had not seen.', 'live'],
    ['Juris', 'ai', 2026, 'JavaScript', 'Legal research, contract review and drafting assistant for Indian law. Team project: I worked on the backend and the deployment.', 'live', 'https://github.com/raiyashu2004/Juris'],
    ['Smart-Incident-Management-Platform', 'product', 2026, 'Java', 'Incident ticketing on Spring Boot microservices: gateway, Kafka events, Redis locks, SLA tracking, Angular 19.'],
    ['starbucks-kubernetes', 'cloud', 2026, 'TypeScript', 'DevSecOps pipeline: Jenkins, SonarQube, Trivy and Terraform taking a Next.js app to Amazon EKS with Prometheus and Grafana.'],
    ['CloudShield', 'cloud', 2026, 'JavaScript', 'The prototype that became VigilOps: five policy checks, alert rules and approval-gated remediation.'],
    ['cloud-autoscaling-urlshortner-webapp', 'cloud', 2026, 'JavaScript', 'URL shortener built to demonstrate Kubernetes HPA autoscaling with Prometheus and Grafana.'],
    ['ml-deployment-platform', 'cloud', 2026, 'Python', 'Multi-tenant ML platform on OpenStack: Kubernetes, MLflow tracking, KServe serving, per-team quotas.'],
    ['cloud-support-troubleshooting-lab', 'cloud', 2026, 'Python', 'Terminal simulator for practising cloud-support incidents, with runbooks for Linux, SQL and Nginx.'],
    ['MLOPS-PROJECT', 'cloud', 2026, 'Python', 'MLOps practice project.'],
    ['cloud-ide', 'cloud', 2025, 'HTML', 'Browser IDE: Monaco editor in front of a Docker executor for Python, Java and C++.'],
    ['CodeView-Coding-Interview-Platform', 'product', 2026, 'TypeScript', 'CodeContest: a contest judge with locked-down Docker runners, signed verdicts and rate limits.'],
    ['CLOUD-PROJECT-1', 'product', 2026, 'TypeScript', 'An earlier cut of the CodeContest platform.'],
    ['odoo-ag', 'product', 2026, 'JavaScript', 'DealFlow360, hackathon edition: vanilla JavaScript on node:sqlite with a 54-check end-to-end test.'],
    ['lc-daily-copilot', 'tools', 2026, 'JavaScript', 'Browser extension that shows the LeetCode daily problem and drafts a Gemini solution for you to review.'],
    ['VideoVault', 'tools', 2026, 'Python', 'Windows desktop video library: FFprobe indexing, thumbnails, duplicate detection and a built-in player.'],
    ['Group_15_Gangadhar', 'product', 2025, 'JavaScript', 'GODOWN: B2B wholesale order-management backend on Express, MySQL and Prisma. Team exam project.'],
    ['janmat-sentiment-analyzer', 'ai', 2025, 'TypeScript', 'JanMat: interface for a public-opinion sentiment analysis system, built for a Smart India Hackathon problem.'],
    ['Tag-web-app', 'product', 2025, 'TypeScript', 'First interface for the TAG platform.'],
    ['sih', 'product', 2025, 'JavaScript', 'Smart India Hackathon web prototype.'],
    ['OpenCV-Face-Recognition', 'ai', 2024, 'Python', 'Face recognition with OpenCV.'],
    ['Cognizant_Gangadhar', 'practice', 2026, 'Java', 'Cognizant Digital Nurture Java FSE: Spring, JPA, JUnit, Mockito and microservices exercises.'],
    ['DSA_ONGOING', 'practice', 2026, 'Java', 'Data structures and algorithms in Java, lecture by lecture.'],
    ['DSA', 'practice', 2024, 'Java', 'DSA solutions in Java, kept since January 2024.'],
    ['LeetCF', 'practice', 2026, 'Java', 'LeetCode and Codeforces solutions.'],
    ['ICP', 'practice', 2025, 'Java', 'Coding practice sets in Java.'],
    ['student-crud-gangadhar', 'practice', 2026, 'Java', 'Spring Boot and JDBC CRUD service on PostgreSQL.'],
    ['Gangadhar-WebExam-2315100006-CG', 'practice', 2025, 'JavaScript', 'Web development exam submission.'],
    ['gdp-dashboard', 'practice', 2024, 'Python', 'Streamlit dashboard built from the GDP template.'],
    ['ml_proj', 'practice', 2024, 'HTML', 'Early machine-learning mini project.'],
    ['Gangadhar017.github.io', 'tools', 2026, 'HTML', 'This site. Hand-written HTML, CSS and JavaScript on GitHub Pages.']
  ];
  var CATS = [['all', 'All'], ['cloud', 'Cloud & DevOps'], ['ai', 'AI / ML'], ['product', 'Full-stack'], ['tools', 'Tools'], ['practice', 'Practice & coursework']];

  var idx = $('#idx'), filters = $('#filters');
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function renderIndex(cat) {
    if (!idx) return;
    var rows = REPOS.filter(function (r) { return cat === 'all' || r[1] === cat; });
    idx.innerHTML = rows.map(function (r, i) {
      return '<a class="idx-row" href="' + (r[6] || GH + encodeURIComponent(r[0])) + '" target="_blank" rel="noopener">' +
        '<span class="i">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="t">' + esc(r[0]) + (r[5] ? '<em>Live</em>' : '') + '</span>' +
        '<span class="d">' + esc(r[4]) + '</span>' +
        '<span class="l">' + esc(r[3]) + '</span>' +
        '<span class="y">' + r[2] + '</span>' +
        '<span class="a" aria-hidden="true">↗</span></a>';
    }).join('');
  }
  if (filters) {
    filters.innerHTML = CATS.map(function (c) {
      var n = c[0] === 'all' ? REPOS.length : REPOS.filter(function (r) { return r[1] === c[0]; }).length;
      return '<button type="button" data-cat="' + c[0] + '" aria-pressed="' + (c[0] === 'all') + '">' + c[1] + '<span>' + n + '</span></button>';
    }).join('');
    filters.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      $$('button', filters).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      renderIndex(b.dataset.cat);
    });
  }
  renderIndex('all');

  /* ---------- copy email ---------- */

  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2200);
  }
  function copyEmail() {
    var done = function () { toast('Email copied: ' + EMAIL); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(EMAIL).then(done, function () { toast(EMAIL); });
    else toast(EMAIL);
  }
  $$('[data-copy-email]').forEach(function (b) { b.addEventListener('click', copyEmail); });

  /* ---------- command palette ---------- */

  var dlg = $('#cmdk');
  if (dlg && dlg.showModal) {
    var input = $('input', dlg), list = $('.cmdk-list', dlg), sel = 0, shown = [];
    var go = function (hash) { return function () { var el = document.querySelector(hash); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }; };
    var open = function (url) { return function () { window.open(url, '_blank', 'noopener'); }; };
    var ITEMS = [
      ['Go to', 'Selected work', 'section', go('#work')],
      ['Go to', 'Live right now', 'section', go('#fleet')],
      ['Go to', 'Problem solving', 'section', go('#practice')],
      ['Go to', 'Experience and education', 'section', go('#path')],
      ['Go to', 'Certifications and toolbox', 'section', go('#creds')],
      ['Go to', 'Index of every repository', 'section', go('#index')],
      ['Go to', 'Contact', 'section', go('#contact')],
      ['Projects', 'VigilOps', 'cloud operations', go('#vigilops')],
      ['Projects', 'SLM-Agent Lab', 'AI research', go('#slm')],
      ['Projects', 'DealFlow360', 'sales operations', go('#dealflow')],
      ['Projects', 'TransitOps', 'fleet platform', go('#transitops')],
      ['Projects', 'TAG Coding Platform', 'judge + interviews', go('#tag')],
      ['Projects', 'Zenith PM', 'project management', go('#zenith')],
      ['Projects', 'NebulaStream', 'video transcoding', go('#nebula')],
      ['Projects', 'LeafGuard AI', 'computer vision', go('#leafguard')],
      ['Projects', 'SatQuery AI', 'remote sensing', go('#satquery')],
      ['Projects', 'Chaska', 'food ordering', go('#chaska')],
      ['Projects', 'Balcony', 'film streaming', go('#balcony')],
      ['Projects', 'Katori', 'food-waste forecasting', go('#katori')],
      ['Projects', 'Juris', 'legal research', go('#juris')],
      ['Elsewhere', 'GitHub', 'Gangadhar017', open('https://github.com/Gangadhar017')],
      ['Elsewhere', 'LinkedIn', 'in/gangadhar17', open('https://www.linkedin.com/in/gangadhar17')],
      ['Elsewhere', 'LeetCode, main profile', 'Gangadhar_cs23', open('https://leetcode.com/u/Gangadhar_cs23/')],
      ['Elsewhere', 'LeetCode, contest profile', 'Gangadhar_Singh', open('https://leetcode.com/u/Gangadhar_Singh/')],
      ['Elsewhere', 'Codeforces', 'gangadhar_017', open('https://codeforces.com/profile/gangadhar_017')],
      ['Elsewhere', 'Microsoft Learn', 'gangadharsingh-9927', open('https://learn.microsoft.com/en-us/users/gangadharsingh-9927/')],
      ['Actions', 'Download résumé (PDF)', 'one page, A4', function () { var a = document.createElement('a'); a.href = 'Gangadhar_Singh_Resume.pdf'; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); }],
      ['Actions', 'Read the résumé online', 'opens /resume', function () { location.href = 'resume/'; }],
      ['Actions', 'Copy email address', 'clipboard', copyEmail],
      ['Actions', 'Write an email', 'mail app', function () { location.href = 'mailto:' + EMAIL; }],
      ['Actions', 'Switch light / dark theme', 'appearance', toggleTheme]
    ];
    var render = function () {
      var q = input.value.trim().toLowerCase();
      shown = ITEMS.filter(function (it) { return !q || (it[1] + ' ' + it[2] + ' ' + it[0]).toLowerCase().indexOf(q) > -1; });
      if (sel >= shown.length) sel = Math.max(0, shown.length - 1);
      if (!shown.length) { list.innerHTML = '<p class="cmdk-empty">Nothing matches. Try “vigil”, “leetcode” or “theme”.</p>'; return; }
      var h = '', grp = '';
      shown.forEach(function (it, i) {
        if (it[0] !== grp) { grp = it[0]; h += '<div class="grp label">' + grp + '</div>'; }
        h += '<button type="button" role="option" data-i="' + i + '" aria-selected="' + (i === sel) + '">' + esc(it[1]) + '<small>' + esc(it[2]) + '</small></button>';
      });
      list.innerHTML = h;
      var cur = $('[aria-selected="true"]', list);
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
    };
    var run = function (i) { var it = shown[i]; if (!it) return; dlg.close(); setTimeout(it[3], 60); };
    var show = function () { if (dlg.open) return; input.value = ''; sel = 0; render(); dlg.showModal(); input.focus(); };
    input.addEventListener('input', function () { sel = 0; render(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    });
    list.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) run(+b.dataset.i); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); show(); }
      else if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) { e.preventDefault(); show(); }
    });
    $$('[data-cmdk]').forEach(function (b) { b.addEventListener('click', show); });
    var kb = $('#kbd');
    if (kb && /Mac|iPhone|iPad/.test(navigator.platform || '')) kb.textContent = '⌘K';
  }

  /* ---------- footer year ---------- */
  var yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();
})();
