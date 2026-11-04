(function () {
  var holder = document.getElementById('gate-data');
  if (!holder) return;
  var D = JSON.parse(holder.textContent);
  var KEY = 'pf-key';
  var form = document.getElementById('gate-form');
  var pw = document.getElementById('gate-pw');
  var err = document.getElementById('gate-err');
  var go = document.getElementById('gate-go');
  var ask = document.getElementById('gate-ask');
  var subtle = window.crypto && window.crypto.subtle;

  function bytes(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function show(m) { err.textContent = m || ''; }

  function open(raw) {
    return subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']).then(function (k) {
      return subtle.decrypt({ name: 'AES-GCM', iv: bytes(D.i) }, k, bytes(D.c));
    }).then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
  }
  function mount(p, raw) {
    try { sessionStorage.setItem(KEY, btoa(String.fromCharCode.apply(null, new Uint8Array(raw)))); } catch (e) {}
    var root = document.documentElement;
    root.className = p.h || '';
    document.body.className = p.b || '';
    // main.js가 불러와지기 전에 모바일용 배치가 비치지 않도록 화면을 가렸다가 연다
    var dq = window.matchMedia && window.matchMedia('(min-width: 961px) and (hover: hover) and (pointer: fine)');
    root.classList.add('js');
    if (dq && dq.matches) root.classList.add('desk');
    root.style.visibility = 'hidden';
    var shown = false;
    var reveal = function () { if (shown) return; shown = true; root.style.visibility = ''; };
    document.body.innerHTML = p.html;
    document.title = p.t || 'Portfolio';
    var s = document.createElement('script');
    s.src = '/assets/js/main.js?v=62ef68f91a';
    s.onload = function () { requestAnimationFrame(function () { requestAnimationFrame(reveal); }); };
    s.onerror = reveal;
    setTimeout(reveal, 4000);
    document.body.appendChild(s);
  }

  if (!subtle) { show('보안 연결(https) 주소에서 열어 주세요.'); form.querySelector('button').disabled = true; return; }

  // 같은 탭에서 한 번 통과했으면 다른 페이지는 바로 연다
  var saved = null;
  try { saved = sessionStorage.getItem(KEY); } catch (e) {}
  if (saved) {
    var raw0 = bytes(saved);
    open(raw0).then(function (p) { mount(p, raw0); }).catch(function () { try { sessionStorage.removeItem(KEY); } catch (e) {} });
  }

  var busy = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var v = pw.value;
    if (!v) { show('비밀번호를 입력해 주세요.'); pw.focus(); return; }
    busy = true; go.disabled = true; go.textContent = '확인 중'; show('');
    var enc = new TextEncoder();
    subtle.importKey('raw', enc.encode(v), 'PBKDF2', false, ['deriveBits']).then(function (m) {
      return subtle.deriveBits({ name: 'PBKDF2', salt: bytes(D.s), iterations: D.n, hash: 'SHA-256' }, m, 256);
    }).then(function (raw) {
      return open(raw).then(function (p) { mount(p, raw); });
    }).catch(function () {
      busy = false; go.disabled = false; go.textContent = '열기';
      show('비밀번호가 맞지 않습니다. 다시 입력해 주세요.');
      pw.select();
    });
  });
  pw.addEventListener('input', function () { show(''); });

  ask.addEventListener('click', function () {
    var a = atob(ask.getAttribute('data-c'));
    window.location.href = 'mailto:' + a + '?subject=' + encodeURIComponent('Portfolio 비밀번호 문의');
  });
  pw.focus();
})();
