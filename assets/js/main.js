(function () {
  // ---------- Languages ----------
  var I = window.I18N || { text: {}, ph: {}, js: {} };
  var lang = 'en';
  var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-i18n]'));
  nodes.forEach(function (el) { el._en = el.innerHTML; });
  var phNodes = Array.prototype.slice.call(document.querySelectorAll('[data-i18n-ph]'));
  phNodes.forEach(function (el) { el._en = el.getAttribute('placeholder'); });
  function t(key) { var e = I.js && I.js[key]; return e ? (e[lang] || e.en) : key; }
  window.__t = t;
  function setLang(l) {
    if (l !== 'en' && !(I.langs || []).some(function (x) { return x[0] === l; })) l = 'en';
    lang = l;
    nodes.forEach(function (el) {
      var tr = I.text[el.getAttribute('data-i18n')];
      el.innerHTML = (l === 'en' || !tr || !tr[l]) ? el._en : tr[l];
    });
    phNodes.forEach(function (el) {
      var tr = I.ph[el.getAttribute('data-i18n-ph')];
      el.setAttribute('placeholder', (l === 'en' || !tr || !tr[l]) ? el._en : tr[l]);
    });
    document.querySelectorAll('[data-i18n-js]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n-js')); });
    document.documentElement.lang = l;
    if (I.js && I.js.title) document.title = t('title');
    var sel = document.getElementById('lang'); if (sel) sel.value = l;
    try { localStorage.setItem('bk-lang', l); } catch (e) {}
  }
  var start = 'en';
  try { start = localStorage.getItem('bk-lang') || 'en'; } catch (e) {}
  var m = /[?&]lang=([a-z]{2})/.exec(window.location.search); if (m) start = m[1];
  if (start !== 'en') setLang(start);
  var picker = document.getElementById('lang');
  if (picker) { picker.value = lang; picker.addEventListener('change', function () { setLang(picker.value); }); }
  var nav = document.getElementById('nav');
  function onScroll() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 10); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var replay = document.getElementById('replay');
  if (replay) replay.addEventListener('click', function () { window.__playIntro && window.__playIntro(); });

  var btn = document.getElementById('copy');
  var email = document.getElementById('email');
  function copyEmail() {
    var text = email.textContent.trim();
    function selectIt() {
      var r = document.createRange(); r.selectNodeContents(email);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      btn.textContent = t('selected');
    }
    try {
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = t('copied');
        setTimeout(function () { btn.textContent = t('copy'); }, 1800);
      }, selectIt);
    } catch (e) { selectIt(); }
  }
  if (btn && email) {
    btn.addEventListener('click', copyEmail);
  }


  // Contact form
  var form = document.getElementById('cform');
  if (form) {
    var status = document.getElementById('f-status');
    var send = document.getElementById('f-send');

    // Buttons in the lessons / babysitting cards preselect the topic
    document.querySelectorAll('[data-interest]').forEach(function (a) {
      a.addEventListener('click', function () {
        var v = a.getAttribute('data-interest');
        form.querySelectorAll('input[name="interest"]').forEach(function (r) { r.checked = (r.value === v); });
        setTimeout(function () { var n = document.getElementById('f-name'); if (n) n.focus({ preventScroll: true }); }, 600);
      });
    });

    var rules = [
      { id: 'f-name', err: 'e-name', ok: function (el) { return el.value.trim().length >= 2; } },
      { id: 'f-email', err: 'e-email', ok: function (el) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim()); } },
      { id: 'f-message', err: 'e-message', ok: function (el) { return el.value.trim().length >= 10; } },
      { id: 'f-consent', err: 'e-consent', ok: function (el) { return el.checked; } }
    ];
    function check(rule) {
      var el = document.getElementById(rule.id), err = document.getElementById(rule.err);
      var good = rule.ok(el);
      err.hidden = good;
      var wrap = el.closest('.field'); if (wrap) wrap.classList.toggle('invalid', !good);
      el.setAttribute('aria-invalid', good ? 'false' : 'true');
      return good;
    }
    rules.forEach(function (rule) {
      var el = document.getElementById(rule.id);
      el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', function () {
        if (!document.getElementById(rule.err).hidden) check(rule);
      });
    });
    function setStatus(text, kind) { status.textContent = text; status.className = 'status ' + (kind || ''); }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      rules.forEach(function (rule) { if (!check(rule) && !firstBad) firstBad = document.getElementById(rule.id); });
      if (firstBad) { firstBad.focus(); setStatus(t('check'), 'bad'); return; }

      if (form.getAttribute('data-preview') === '1') {
        setStatus(t('preview'), 'ok');
        return;
      }
      var fd = new FormData(form);
      if (fd.get('website')) return;
      // Static hosting (no PHP): open the visitor's email app with the message filled in
      function viaMail() {
        var interest = fd.get('interest') || 'Something else';
        var body = 'Name: ' + fd.get('name') + '\nEmail: ' + fd.get('email') +
          (fd.get('phone') ? '\nPhone: ' + fd.get('phone') : '') +
          '\nInterested in: ' + interest + '\n\n' + fd.get('message');
        window.location.href = 'mailto:kbianka05@gmail.com?subject=' +
          encodeURIComponent('Website message: ' + interest) + '&body=' + encodeURIComponent(body);
        setStatus(t('mailto'), 'ok');
      }
      if (!window.fetch) { viaMail(); return; }
      // Hosting with PHP (Plesk): contact.php emails the message to Bianka directly
      send.disabled = true;
      setStatus(t('sending'), '');
      fetch(form.getAttribute('action'), { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return null; }); })
        .then(function (j) {
          send.disabled = false;
          if (j && j.ok) { setStatus(t('ok'), 'ok'); form.reset(); }
          else if (j) { setStatus(t('fail'), 'bad'); }
          else { viaMail(); }
        }, function () { send.disabled = false; viaMail(); });
    });

    // Message after a non-JavaScript submit (contact.php redirects back here)
    var q = window.location.search;
    if (q.indexOf('sent=1') > -1) setStatus(t('okShort'), 'ok');
    if (q.indexOf('sent=0') > -1) setStatus(t('fail'), 'bad');
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.magnet').forEach(function (el) {
      var base = el.closest('.contact-line') ? 'translateY(-50%)' : '';
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.3;
        var y = (e.clientY - r.top - r.height / 2) * 0.3;
        el.style.transform = 'translate(' + x + 'px,' + y + 'px) ' + base;
      });
      el.addEventListener('pointerleave', function () { el.style.transform = base; });
    });
  }
  // ---------- Photo viewer: click a photo to see it larger ----------
  var photos = Array.prototype.slice.call(document.querySelectorAll('img[src*="assets/img/"]'))
    .filter(function (img) { return !/logo|favicon/.test(img.getAttribute('src')); });
  if (photos.length) {
    var lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.hidden = true;
    lb.innerHTML = '<figure class="lb-fig"><img class="lb-img" alt=""></figure>' +
      '<button type="button" class="lb-btn lb-close">&times;</button>' +
      '<button type="button" class="lb-btn lb-prev" aria-label="Previous">&#8249;</button>' +
      '<button type="button" class="lb-btn lb-next" aria-label="Next">&#8250;</button>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('.lb-img'), lbClose = lb.querySelector('.lb-close');
    var group = [], idx = 0, opener = null;
    function show(i) {
      idx = (i + group.length) % group.length;
      var img = group[idx];
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lb.classList.toggle('lb-single', group.length < 2);
    }
    function open(img) {
      var sec = img.closest('section') || document.body;
      group = photos.filter(function (p) { return sec.contains(p); });
      opener = img;
      show(group.indexOf(img));
      lbClose.setAttribute('aria-label', t('close'));
      lb.hidden = false;
      document.documentElement.classList.add('lb-on');
      lbClose.focus();
    }
    function close() {
      lb.hidden = true;
      document.documentElement.classList.remove('lb-on');
      lbImg.removeAttribute('src');
      if (opener) opener.focus();
    }
    photos.forEach(function (img) {
      img.classList.add('zoomable');
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.addEventListener('click', function () { open(img); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
      });
    });
    lbClose.addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-fig')) close(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'Tab') {
        var f = Array.prototype.slice.call(lb.querySelectorAll('button')).filter(function (b) { return b.offsetParent; });
        var i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
  }
})();
