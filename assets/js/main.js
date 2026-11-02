(function () {
  var buttons = document.querySelectorAll('.filter button');
  var rows = document.querySelectorAll('.works li');
  if (!buttons.length) return;

  function apply(type) {
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.filter === type));
    });
    rows.forEach(function (li) {
      li.hidden = !(type === 'all' || li.dataset.type === type);
    });
  }

  function fromHash() {
    var h = location.hash.replace('#', '');
    var ok = Array.prototype.some.call(buttons, function (b) { return b.dataset.filter === h; });
    apply(ok ? h : 'all');
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.filter;
      history.replaceState(null, '', t === 'all' ? location.pathname : '#' + t);
      apply(t);
    });
  });
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();

