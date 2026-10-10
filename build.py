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

LANGS = ['en', 'it']          # 'en' alla radice, le altre in /<lang>/

def load(name, lang='en'):
    """Legge un file di contenuto; per l'inglese sta in content/, per le
    altre lingue in content/<lang>/ con lo stesso nome."""
    base = ROOT / 'content' if lang == 'en' else ROOT / 'content' / lang
    f = base / name
    if not f.is_file() and lang != 'en':
        f = ROOT / 'content' / name        # ripiego sull'inglese
    return yaml.safe_load(f.read_text(encoding='utf-8'))

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

def build_lang(lang, env, papers, by_id, build_id, assets_done):
    """Rende le pagine di una lingua. L'inglese sta alla radice, le altre
    sotto /<lang>/. I PDF e i dati sono condivisi: si scrivono una volta sola."""
    prefix   = '' if lang == 'en' else f'/{lang}'
    site     = load('site.yaml', lang)
    software = load('software.yaml', lang)
    teaching = load('teaching.yaml', lang)
    people   = load('people.yaml', lang)
    cv       = load('cv.yaml', lang)
    themes_y = load('themes.yaml', lang)
    strings  = load(f'ui.{lang}.yaml')
    nav = [{'label': n['label'], 'href': f"{prefix}/{n['href']}/"} for n in strings['nav']]

    themes = []
    for slug, t in themes_y.items():
        tp = [p for p in papers if slug in p['themes']]
        if not tp:
            continue
        yrs = [p['year'] for p in tp]
        themes.append({
            'slug': slug, 'name': t['name'], 'description': t['description'],
            'papers': tp, 'count': len(tp),
            'span': f"{min(yrs)}\u2013{max(yrs)}" if min(yrs) != max(yrs) else str(min(yrs)),
        })
    themes.sort(key=lambda t: -t['count'])

    for group in ('tools', 'libraries'):
        for sw in software.get(group, []):
            sw['paper_obj'] = by_id.get(sw.get('paper') or '')

    stats = {
        'journal': sum(1 for p in papers if p['kind'] == 'journal'),
        'conference': sum(1 for p in papers if p['kind'] == 'conference'),
        'from': min(p['year'] for p in papers), 'to': max(p['year'] for p in papers),
    }

    sel = [by_id[i] for i in (site.get('selected') or []) if i in by_id]
    selected = sel or papers[:5]

    pages = [('home.html', '', '/'),
             ('research.html', 'research', '/research/'),
             ('publications.html', 'publications', '/publications/'),
             ('software.html', 'software', '/software/'),
             ('teaching.html', 'teaching', '/teaching/'),
             ('people.html', 'people', '/people/'),
             ('cv.html', 'cv', '/cv/')]

    out_base = DIST if lang == 'en' else DIST / lang
    written = []
    for tpl, out, path in pages:
        full = f'{prefix}{path}'
        # la stessa pagina nell'altra lingua, per il selettore
        other = '' if lang != 'en' else '/it'
        other_url = f"{other}{path}" if lang == 'en' else path
        html = env.get_template(tpl).render(
            section=full, path=full, lang=lang, prefix=prefix,
            t=strings['ui'], strings=strings, other_url=other_url,
            site=site, nav=nav, themes=themes, papers=papers, stats=stats,
            software=software, teaching=teaching, people=people, cv=cv,
            build_id=build_id, selected=selected)
        target = (out_base / out / 'index.html') if out else (out_base / 'index.html')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html, encoding='utf-8')
        written.append(full)

    if not assets_done:
        shutil.copytree(ROOT / 'static', DIST / 'static')
        (DIST / 'papers').mkdir(exist_ok=True)
        for p in papers:
            if p['_pdf_src']:
                shutil.copy2(p['_pdf_src'],
                             DIST / 'papers' / f"{p['_pdf_src'].parent.parent.name}.pdf")
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
    else:
        # i nomi dei filoni cambiano con la lingua: un file per lingua
        pub_json = {
            'papers': [{k: v for k, v in p.items() if not k.startswith('_')} for p in papers],
            'themes': [{'slug': t['slug'], 'name': t['name']} for t in themes],
        }
        (DIST / 'static' / f'publications.{lang}.json').write_text(
            json.dumps(pub_json, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    return written, site


def build():
    papers = load_papers()
    by_id  = {p['id']: p for p in papers}
    build_id = hashlib.sha1(
        (ROOT / 'static' / 'css' / 'site.css').read_bytes()
        + (ROOT / 'static' / 'js' / 'publications.js').read_bytes()
    ).hexdigest()[:8]
    env = Environment(loader=FileSystemLoader(ROOT / 'templates'),
                      autoescape=select_autoescape(['html']),
                      trim_blocks=True, lstrip_blocks=True)

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    all_urls = []
    site = None
    for k, lang in enumerate(LANGS):
        urls, site = build_lang(lang, env, papers, by_id, build_id, assets_done=(k > 0))
        all_urls += urls

    # Preserve the standalone visual big-M teaching guide across site rebuilds.
    guide_source = ROOT / 'static' / 'big-m-guide' / 'index.html'
    if guide_source.is_file():
        guide_target = DIST / 'big-m-guide' / 'index.html'
        guide_target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(ROOT / 'static' / 'big-m-guide', DIST / 'big-m-guide', dirs_exist_ok=True)

    # Keep Google Search Console verification available after every site rebuild.
    for verification in ROOT.glob('google*.html'):
        shutil.copy2(verification, DIST / verification.name)

    # Preserve the standalone interactive interdiction teaching guides.
    for guide_name in ('benders-cut-guide', 'supervalid-guide', 'benders-aggregation-guide'):
        guide_dir = ROOT / 'static' / guide_name
        if guide_dir.is_dir():
            shutil.copytree(guide_dir, DIST / guide_name, dirs_exist_ok=True)

    (DIST / '.nojekyll').write_text('')
    urls = ''.join(f"<url><loc>{site['url']}{u}</loc></url>" for u in all_urls)
    (DIST / 'sitemap.xml').write_text(
        f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>',
        encoding='utf-8')
    (DIST / 'robots.txt').write_text(
        f"User-agent: *\nAllow: /\nSitemap: {site['url']}/sitemap.xml\n", encoding='utf-8')

    size = sum(f.stat().st_size for f in DIST.rglob('*') if f.is_file())
    npdf = len(list((DIST / 'papers').glob('*.pdf')))
    print(f"built {len(all_urls)} pages in {len(LANGS)} languages \u00b7 {len(papers)} publications "
          f"\u00b7 {npdf} PDFs \u00b7 {size/1e6:.1f} MB \u2192 {DIST}")
    return DIST


if __name__ == '__main__':
    d = build()
    if '--serve' in sys.argv:
        os.chdir(d)
        print("serving http://localhost:8000  (ctrl-c to stop)")
        subprocess.run([sys.executable, '-m', 'http.server', '8000'])
