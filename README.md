# fabiofurini.github.io

Personal academic website of Fabio Furini — Sapienza University of Rome.
Live at **https://fabiofurini.github.io**

## How it works

A small static-site generator. There is **no hand-written HTML**: every page is
rendered from a Jinja template and the content lives in YAML.

```
content/      the text of the site — edit these
  site.yaml       name, bio, interests, stats, profile links
  software.yaml   released code and data, each linked to its paper
  teaching.yaml   courses and their public course sites
  people.yaml     students and researchers supervised
  cv.yaml         appointments, education, service, grants
templates/    Jinja templates (base + one per page)
static/       CSS, JS, images
build.py      renders everything into dist/
```

Publication data is **not** duplicated here: it is read at build time from the
paper archive at `1_RICERCA/100_PAPERI` (one `meta.yaml` per paper), together
with the uniform author-version PDFs and the research themes.

## Build

```bash
python3 build.py            # render into dist/
python3 build.py --serve    # render, then serve at http://localhost:8000
```

Pushing to `main` publishes `dist/` to GitHub Pages via the workflow in
`.github/workflows/deploy.yml`.

## To change something

| What | Where |
|---|---|
| Bio, photo, stats, profile links | `content/site.yaml` |
| A new course or course website | `content/teaching.yaml` |
| A new student | `content/people.yaml` |
| A released piece of software | `content/software.yaml` |
| Appointments, grants, service | `content/cv.yaml` |
| A new paper | add it to the archive; it appears automatically |
| Colours, spacing, typography | `static/css/site.css` |
