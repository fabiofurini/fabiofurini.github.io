#!/usr/bin/env python3
"""
Build the personal website into docs/.

Content lives in content/*.yaml; the publication data comes from the
research-papers archive (PAPERS/*/meta.yaml). Nothing here is hand-written HTML:
edit the YAML, re-run this script.

    python3 build.py            # build into docs/
    python3 build.py --serve    # build, then serve on http://localhost:8000
"""
import json, os, re, shutil, sys, subprocess, hashlib
from pathlib import Path
import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).resolve().parent
ARCHIVE = Path('/home/fabio/Dropbox/1_RICERCA/100_PAPERI')
DIST = ROOT / 'docs'   # GitHub Pages serves this folder from main

NAV = [
    {'label': 'Research',     'href': '/research/'},
    {'label': 'Publications', 'href': '/publications/'},
    {'label': 'Software',     'href': '/software/'},
    {'label': 'Teaching',     'href': '/teaching/'},
    {'label': 'Group',        'href': '/people/'},
    {'label': 'CV',           'href': '/cv/'},
]

def load(name):
    return yaml.safe_load((ROOT / 'content' / name).read_text(encoding='utf-8'))

def clean_venue(v):
    v = (v or '').rstrip('.').strip()
    return re.sub(r',\s*(Elsevier|Springer|INFORMS|IEEE|Wiley)\.?$', '', v).strip()

def load_papers():
    """Read the archive: one meta.yaml per paper, plus the published PDF."""
    papers = []
    for d in sorted((ARCHIVE / 'PAPERS').iterdir()):
        mf = d / 'meta.yaml'
        if not mf.is_file():
            continue
        m = yaml.safe_load(mf.read_text(encoding='utf-8'))
        pdf_src = None
        if (d / 'open' / 'main.pdf').is_file() and m['id'] not in SKIP_OPEN:
            pdf_src = d / 'open' / 'main.pdf'
        elif (d / 'pdf' / 'aam.pdf').is_file():
            pdf_src = d / 'pdf' / 'aam.pdf'
        papers.append({
            'id': m['id'], 'title': m['title'], 'authors': m['authors'],
            'year': m['year'], 'kind': m['kind'], 'venue': clean_venue(m['venue']),
            'doi': m.get('doi'), 'themes': m.get('themes') or [],
            'code': m.get('code_url'), 'abstract': m.get('abstract'),
            'status': m.get('status'), '_pdf_src': pdf_src,
            'pdf': f"/papers/{d.name}.pdf" if pdf_src else None,
        })
    papers.sort(key=lambda p: (-p['year'], p['title']))
    return papers

def write_bib(papers, out):
    """The full bibliography, generated from the same metadata as the site."""
    lines = []
    for p in sorted(papers, key=lambda x: (x['kind'] != 'journal', int(x['id'][1:]))):
        kind = 'article' if p['kind'] == 'journal' else 'inproceedings'
        key = p['authors'][0].split()[-1].replace('.', '') + str(p['year']) + p['id']
        field = 'journal' if kind == 'article' else 'booktitle'
        lines += [f"@{kind}{{{key},",
                  f"  author  = {{{' and '.join(p['authors'])}}},",
                  f"  title   = {{{p['title'].replace('&', chr(92) + '&')}}},",
                  f"  {field} = {{{p['venue'].replace('&', chr(92) + '&')}}},",
                  f"  year    = {{{p['year']}}},"]
        if p.get('doi'):
            lines += [f"  doi     = {{{p['doi']}}},", f"  url     = {{https://doi.org/{p['doi']}}},"]
        lines += ["}", ""]
    out.write_text('\n'.join(lines), encoding='utf-8')


SKIP_OPEN = {'C06'}   # archived source is an earlier draft, see the archive README

def build():
    site     = load('site.yaml')
    software = load('software.yaml')
    teaching = load('teaching.yaml')
    people   = load('people.yaml')
    cv       = load('cv.yaml')
    themes_y = load('themes.yaml')          # the research themes live with the site

    papers = load_papers()
    by_id  = {p['id']: p for p in papers}

    themes = []
    for slug, t in themes_y.items():
        tp = [p for p in papers if slug in p['themes']]
        if not tp:
            continue
        yrs = [p['year'] for p in tp]
        themes.append({
            'slug': slug, 'name': t['name'], 'description': t['description'],
            'papers': tp, 'count': len(tp),
            'span': f"{min(yrs)}–{max(yrs)}" if min(yrs) != max(yrs) else str(min(yrs)),
        })
    themes.sort(key=lambda t: -t['count'])

    for group in ('tools', 'libraries'):
        for s in software.get(group, []):
            s['paper_obj'] = by_id.get(s.get('paper') or '')

    build_id = hashlib.sha1(
        (ROOT / 'static' / 'css' / 'site.css').read_bytes()
        + (ROOT / 'static' / 'js' / 'publications.js').read_bytes()
    ).hexdigest()[:8]

    env = Environment(loader=FileSystemLoader(ROOT / 'templates'),
                      autoescape=select_autoescape(['html']),
                      trim_blocks=True, lstrip_blocks=True)

    stats = {
        'journal': sum(1 for p in papers if p['kind'] == 'journal'),
        'conference': sum(1 for p in papers if p['kind'] == 'conference'),
        'from': min(p['year'] for p in papers), 'to': max(p['year'] for p in papers),
    }
    ctx = dict(site=site, nav=NAV, themes=themes, papers=papers, stats=stats,
               software=software, teaching=teaching, people=people, cv=cv,
               build_id=build_id, recent=papers[:5])

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    pages = [('home.html', '', '/'),
             ('research.html', 'research', '/research/'),
             ('publications.html', 'publications', '/publications/'),
             ('software.html', 'software', '/software/'),
             ('teaching.html', 'teaching', '/teaching/'),
             ('people.html', 'people', '/people/'),
             ('cv.html', 'cv', '/cv/')]
    for tpl, out, path in pages:
        html = env.get_template(tpl).render(section=path, path=path, **ctx)
        target = DIST / out / 'index.html' if out else DIST / 'index.html'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html, encoding='utf-8')

    shutil.copytree(ROOT / 'static', DIST / 'static')

    (DIST / 'papers').mkdir()
    n = 0
    for p in papers:
        if p['_pdf_src']:
            shutil.copy2(p['_pdf_src'], DIST / 'papers' / f"{p['_pdf_src'].parent.parent.name}.pdf")
            n += 1

    pub_json = {
        'papers': [{k: v for k, v in p.items() if not k.startswith('_')} for p in papers],
        'themes': [{'slug': t['slug'], 'name': t['name']} for t in themes],
    }
    (DIST / 'static' / 'publications.json').write_text(
        json.dumps(pub_json, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    write_bib(papers, DIST / 'static' / 'publications.bib')

    cvpdf = Path('/home/fabio/Dropbox/5_CARRIERA/DOC/CV/CV_FabioFurini_ENG.pdf')
    if cvpdf.is_file():
        shutil.copy2(cvpdf, DIST / 'static' / cv['cv_pdf'])

    (DIST / '.nojekyll').write_text('')
    urls = ''.join(f"<url><loc>{site['url']}{p}</loc></url>" for _, _, p in pages)
    (DIST / 'sitemap.xml').write_text(
        f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>',
        encoding='utf-8')
    (DIST / 'robots.txt').write_text(
        f"User-agent: *\nAllow: /\nSitemap: {site['url']}/sitemap.xml\n", encoding='utf-8')

    size = sum(f.stat().st_size for f in DIST.rglob('*') if f.is_file())
    print(f"built {len(pages)} pages · {len(papers)} publications · {n} PDFs · "
          f"{len(themes)} themes · {size/1e6:.1f} MB → {DIST}")
    return DIST

if __name__ == '__main__':
    d = build()
    if '--serve' in sys.argv:
        os.chdir(d)
        print("serving http://localhost:8000  (ctrl-c to stop)")
        subprocess.run([sys.executable, '-m', 'http.server', '8000'])
