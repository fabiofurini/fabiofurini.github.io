(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var L = window.FP_LANG || {};
  function T(k, d) { return L[k] || d; }
  var DATA = null, theme = null;
  var state = { q: '', kind: '' };

  function themeName(slug) {
    for (var i = 0; i < DATA.themes.length; i++)
      if (DATA.themes[i].slug === slug) return DATA.themes[i].name;
    return slug;
  }

  function matches(p) {
    if (state.kind && p.kind !== state.kind) return false;
    if (theme && (p.themes || []).indexOf(theme) === -1) return false;
    if (state.q) {
      var hay = (p.title + ' ' + p.authors.join(' ') + ' ' + p.venue + ' ' + (p.abstract || '')).toLowerCase();
      var words = state.q.toLowerCase().split(/\s+/);
      for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) === -1) return false;
    }
    return true;
  }

  function pubHTML(p) {
    var authors = p.authors.map(function (a) {
      return /Furini/.test(a) ? '<b>' + esc(a) + '</b>' : esc(a);
    }).join(', ');
    var links = [];
    if (p.doi) links.push('<a class="lk primary" href="https://doi.org/' + esc(p.doi) + '" target="_blank" rel="noopener">' + esc(T('published', 'Published version ↗')) + '</a>');
    if (p.pdf) links.push('<a class="lk" href="' + esc(p.pdf) + '" target="_blank" rel="noopener">' + esc(T('pdf', 'PDF')) + '</a>');
    if (['J36','J41','J29','J23','J06'].indexOf(p.id) !== -1) links.push('<a class="lk" href="/reading/' + esc(p.id) + '/" target="_blank" rel="noopener">MD ↗</a>');
    if (p.code) links.push('<a class="lk" href="' + esc(p.code) + '" target="_blank" rel="noopener">' + esc(T('code', 'Code ↗')) + '</a>');
    links.push('<button class="lk" type="button" data-cite="' + esc(p.id) + '">' + esc(T('cite', 'Cite')) + '</button>');
    if (p.abstract) links.push('<button class="lk ghost" type="button" data-more="' + esc(p.id) + '">' + esc(T('more', 'Read more')) + '</button>');
    var tags = (p.themes || []).map(function (t) { return '<span class="tag">' + esc(themeName(t)) + '</span>'; }).join('');
    return '<article class="pub" id="' + esc(p.id) + '">' +
      '<p class="t">' + esc(p.title) + '</p>' +
      '<p class="a">' + authors + '</p>' +
      '<p class="v"><i>' + esc(p.venue) + '</i>, ' + p.year + (p.status === 'accepted' ? ' · ' + esc(T('accepted', 'accepted')) : '') + '</p>' +
      (p.abstract ? '<p class="abs">' + esc(p.abstract) + '</p>' : '') +
      '<div class="links">' + links.join('') + tags + '</div></article>';
  }

  function render() {
    var found = DATA.papers.filter(matches);
    found.sort(function (a, b) { return (b.year - a.year) || a.title.localeCompare(b.title); });

    $('#countLine').textContent = found.length + ' ' + T('of', 'of') + ' ' + DATA.papers.length + ' ' + T('pubs', 'publications') +
      (theme ? ' · ' + themeName(theme) : '');

    if (!found.length) {
      $('#list').innerHTML = '<p class="empty">' + esc(T('none', 'No publication matches these filters.')) + '</p>';
    } else {
      var html = '', year = null;
      found.forEach(function (p) {
        if (p.year !== year) {
          if (year !== null) html += '</div>';
          year = p.year;
          html += '<div class="year-group"><div class="year-label">' + year + '</div>';
        }
        html += pubHTML(p);
      });
      html += '</div>';
      $('#list').innerHTML = html;
    }

    var chips = document.querySelectorAll('#chips .chip');
    for (var i = 0; i < chips.length; i++)
      chips[i].setAttribute('aria-pressed', String(chips[i].dataset.slug === theme));
  }

  function bibtex(p) {
    var last = p.authors[0].split(' ').pop().replace(/\./g, '');
    var type = p.kind === 'journal' ? 'article' : 'inproceedings';
    var field = p.kind === 'journal' ? 'journal' : 'booktitle';
    return '@' + type + '{' + last + p.year + p.id + ',\n' +
      '  author  = {' + p.authors.join(' and ') + '},\n' +
      '  title   = {' + p.title + '},\n' +
      '  ' + field + ' = {' + p.venue + '},\n' +
      '  year    = {' + p.year + '},\n' +
      (p.doi ? '  doi     = {' + p.doi + '},\n' : '') + '}';
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    if (b.dataset.more) {
      var card = b.closest('.pub');
      var open = card.classList.toggle('open');
      b.textContent = open ? T('less', 'Show less') : T('more', 'Read more');
    } else if (b.dataset.cite) {
      var p = DATA.papers.filter(function (x) { return x.id === b.dataset.cite; })[0];
      var t = bibtex(p);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(t).then(function () {
          b.textContent = T('copied', 'Copied');
          setTimeout(function () { b.textContent = T('cite', 'Cite'); }, 1500);
        }, function () { window.prompt('BibTeX entry:', t); });
      } else { window.prompt('BibTeX:', t); }
    } else if (b.dataset.slug !== undefined) {
      theme = (theme === b.dataset.slug) ? null : b.dataset.slug;
      var u = new URL(location.href);
      if (theme) u.searchParams.set('theme', theme); else u.searchParams.delete('theme');
      history.replaceState(null, '', u);
      render();
    }
  });

  fetch(T('data', '/static/publications.json'))
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) {
      DATA = d;
      var counts = {};
      d.papers.forEach(function (p) {
        (p.themes || []).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
      });
      $('#chips').innerHTML = d.themes.map(function (t) {
        return '<button class="chip" type="button" data-slug="' + esc(t.slug) + '" aria-pressed="false">' +
          esc(t.name) + ' <span class="faint">' + (counts[t.slug] || 0) + '</span></button>';
      }).join('');
      var qs = new URLSearchParams(location.search).get('theme');
      if (qs && counts[qs] !== undefined) theme = qs;
      $('#q').addEventListener('input', function (e) { state.q = e.target.value; render(); });
      $('#kind').addEventListener('change', function (e) { state.kind = e.target.value; render(); });
      render();
      if (location.hash) {
        var el = document.getElementById(location.hash.slice(1));
        if (el) el.scrollIntoView();
      }
    })
    .catch(function (err) {
      $('#list').innerHTML = '<p class="empty">Could not load the publication list (' + esc(err.message) + ').</p>';
    });
})();
