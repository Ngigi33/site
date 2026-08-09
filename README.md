# CV Site

A CV/portfolio site with two parts:

- **Public site** (`index.html`) — reads `docs/data/cv.json` and renders it.
- **Admin panel** (`admin.html`) — a form that edits that same data and commits
  it straight to your GitHub repo using the GitHub API. No hardcoding, no
  backend server, no database.

Because the admin panel commits directly to the file GitHub Pages serves,
**editing content never requires a rebuild.** You only rebuild if you change
the code/design itself.

## 1. One-time setup

You need [Node.js](https://nodejs.org) installed locally for this first step only.

```bash
npm install
npm run build
```

This creates a `docs/` folder — that's the actual static site GitHub Pages
will serve.

## 2. Push to GitHub

1. Create a new **public** repo on GitHub (private repos work too, but then
   only you can see the CV — public is usually the point of a CV site).
   - If you want the site at `https://yourusername.github.io` (no extra
     path), name the repo exactly `yourusername.github.io`.
   - Any other repo name works too — the site will just live at
     `https://yourusername.github.io/repo-name/`.
2. Push everything, **including the `docs/` folder** (it's not gitignored on
   purpose):
   ```bash
   git init
   git add .
   git commit -m "Initial CV site"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

## 3. Turn on GitHub Pages

In your repo: **Settings → Pages → Source → Deploy from a branch**, branch
`main`, folder `/docs`. Save. Give it a minute, then visit the URL GitHub
shows you.

## 4. Edit your content

Go to `your-site-url/admin.html`. You'll be asked to connect a GitHub
personal access token:

1. On GitHub: **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. Under **Repository access**, select only this repo.
3. Under **Permissions**, set **Contents** to **Read and write**.
4. Generate, copy the token, paste it into the admin panel.

The token is stored only in your browser (`localStorage`), never committed.
Don't share it, and don't use it on a public/shared computer.

From there, edit your profile, experience, education, projects, and skills
through the forms and click **Save changes**. It commits directly to
`docs/data/cv.json` in your repo — refresh the public site in ~10–30 seconds
(GitHub Pages caches briefly) to see it live.

## Changing the design/code later

If you edit anything in `src/`, `index.html`, or `admin.html`, you do need to
rebuild and push:

```bash
npm run build
git add .
git commit -m "Update design"
git push
```

Content edits through `/admin.html` don't need this — only code/design
changes do.

## Project structure

```
src/
  pages/
    PublicSite.jsx   — the public CV page
    Admin.jsx         — the admin editing forms
  lib/
    github.js         — GitHub API calls (read/write cv.json, upload files)
    defaultData.js     — the data shape + starter placeholder content
  data/
    starter-cv.json    — copied into docs/data/cv.json only on the very first build
scripts/
  build.mjs            — builds the site, then backs up/restores your live
                          data and uploads so a design change never wipes them
docs/                  — build output, this is what GitHub Pages serves
docs/data/cv.json      — the LIVE data file the admin panel edits directly
docs/assets/uploads/   — photos, project thumbnails, certificate files you upload
```

## Sections included

Profile, Experience, Education, Projects, Skills, Awards, and Certifications
— all editable from `/admin.html`. Profile supports a photo and an intro
video (YouTube/Vimeo link, or a small uploaded clip). Projects support a
thumbnail image. Certifications support an uploaded certificate file (image
or PDF) plus an optional "verify online" link.

Uploads go straight into your repo under `docs/assets/uploads/` — same
mechanism as saving text content, just for binary files. There's an 8MB
cap per file in the admin panel; for anything bigger (like real video),
use a URL instead (YouTube, Vimeo, Google Drive, etc.) rather than
uploading it into the repo.

## Security note (anyone can open `admin.html`), but
it's useless without your personal access token, which only you have. Treat
that token like a password — it grants write access to this repo. If you
ever think it's been exposed, revoke it from GitHub's token settings and
generate a new one.
