/* app.js — formule dell'intera pagina e indice con evidenziazione della sezione corrente. */
(() => {
  DR.texAll(document.body);
  const links = [...document.querySelectorAll('nav.toc a')];
  const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const obs = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      links.forEach((a) => a.classList.remove('active'));
      const a = byId.get(e.target.id); if (a) { a.classList.add('active'); a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    }
  }, { rootMargin: '-35% 0px -60% 0px' });
  document.querySelectorAll('section.chapter').forEach((s) => obs.observe(s));
})();
