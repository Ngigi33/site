// vite build empties docs/ before rebuilding (so old JS/CSS bundles don't
// pile up forever) — but docs/data/cv.json and docs/assets/uploads/* are
// LIVE CONTENT saved through admin.html, not build output. This wrapper
// backs them up before the build and restores them after, so rebuilding the
// site's code/design never touches your real CV data or uploaded files.
import { existsSync, mkdirSync, cpSync, rmSync, copyFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const docsDir = join(root, 'docs')
const backupDir = join(root, '.build-backup')
const dataFile = join(docsDir, 'data', 'cv.json')
const uploadsDir = join(docsDir, 'assets', 'uploads')

// 1. Back up whatever live content already exists.
rmSync(backupDir, { recursive: true, force: true })
mkdirSync(backupDir, { recursive: true })

const hadData = existsSync(dataFile)
if (hadData) {
  mkdirSync(join(backupDir, 'data'), { recursive: true })
  copyFileSync(dataFile, join(backupDir, 'data', 'cv.json'))
}

const hadUploads = existsSync(uploadsDir)
if (hadUploads) {
  cpSync(uploadsDir, join(backupDir, 'uploads'), { recursive: true })
}

// 2. Run the real build (this empties and regenerates docs/).
execSync('npx vite build', { stdio: 'inherit', cwd: root })

// 3. Restore live content, or seed it for the very first build.
mkdirSync(join(docsDir, 'data'), { recursive: true })
if (hadData) {
  copyFileSync(join(backupDir, 'data', 'cv.json'), dataFile)
  console.log('Restored your existing docs/data/cv.json after the build.')
} else {
  copyFileSync(join(root, 'src', 'data', 'starter-cv.json'), dataFile)
  console.log('First build — created docs/data/cv.json from the starter template.')
}

if (hadUploads) {
  mkdirSync(uploadsDir, { recursive: true })
  cpSync(join(backupDir, 'uploads'), uploadsDir, { recursive: true })
  console.log('Restored your uploaded files after the build.')
}

rmSync(backupDir, { recursive: true, force: true })
