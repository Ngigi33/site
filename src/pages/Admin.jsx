import { useEffect, useState } from 'react'
import { verifyAccess, fetchFile, saveFile, uploadAsset } from '../lib/github.js'
import { defaultData, makeId } from '../lib/defaultData.js'
import './admin.css'

const CONFIG_KEY = 'cv-admin-config'
const DATA_PATH = 'docs/data/cv.json'

export default function Admin() {
  const [config, setConfig] = useState(null) // { owner, repo, branch, token }
  const [data, setData] = useState(null)
  const [sha, setSha] = useState(null)
  const [status, setStatus] = useState({ type: 'idle', message: '' })

  // Load saved connection details (not the actual CV data) from localStorage.
  useEffect(() => {
    const saved = localStorage.getItem(CONFIG_KEY)
    if (saved) {
      try {
        setConfig(JSON.parse(saved))
      } catch {
        /* ignore corrupt storage */
      }
    }
  }, [])

  if (!config) {
    return <ConnectForm onConnect={setConfig} />
  }

  return (
    <Editor
      config={config}
      data={data}
      setData={setData}
      sha={sha}
      setSha={setSha}
      status={status}
      setStatus={setStatus}
      onDisconnect={() => {
        localStorage.removeItem(CONFIG_KEY)
        setConfig(null)
        setData(null)
        setSha(null)
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Connect screen
// ---------------------------------------------------------------------------
function ConnectForm({ onConnect }) {
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('main')
  const [token, setToken] = useState('')
  const [remember, setRemember] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setChecking(true)
    try {
      await verifyAccess({ token, owner, repo })
      const config = { owner, repo, branch, token }
      if (remember) localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
      onConnect(config)
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="admin-shell">
      <div className="connect-card">
        <p className="eyebrow">Admin</p>
        <h1>Connect your repo</h1>
        <p className="hint">
          This panel edits <code>{DATA_PATH}</code> directly in your GitHub repo using a
          personal access token. The token is stored only in this browser and is never
          committed anywhere.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            GitHub username / org
            <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="yourname" required />
          </label>
          <label>
            Repository name
            <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="yourname.github.io" required />
          </label>
          <label>
            Branch
            <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" required />
          </label>
          <label>
            Personal access token
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="github_pat_..."
              required
            />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember on this device
          </label>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" disabled={checking}>
            {checking ? 'Checking…' : 'Connect'}
          </button>
        </form>

        <details className="token-help">
          <summary>How do I get a token?</summary>
          <ol>
            <li>
              On GitHub go to Settings → Developer settings → Personal access tokens → Fine‑grained
              tokens → Generate new token.
            </li>
            <li>Under Repository access, select only this repository.</li>
            <li>
              Under Permissions, set <strong>Contents</strong> to <strong>Read and write</strong>.
            </li>
            <li>Generate it, copy it, and paste it above. Keep it private — don't share it or commit it.</li>
          </ol>
        </details>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor screen
// ---------------------------------------------------------------------------
function Editor({ config, data, setData, sha, setSha, status, setStatus, onDisconnect }) {
  useEffect(() => {
    if (data) return
    let cancelled = false
    setStatus({ type: 'loading', message: 'Loading current data…' })
    fetchFile({ token: config.token, owner: config.owner, repo: config.repo, branch: config.branch, path: DATA_PATH })
      .then(({ data: loaded, sha: loadedSha }) => {
        if (cancelled) return
        setData(loaded || defaultData)
        setSha(loadedSha)
        setStatus({
          type: 'idle',
          message: loaded ? 'Loaded.' : `No ${DATA_PATH} found yet — starting from defaults.`
        })
      })
      .catch((err) => {
        if (cancelled) return
        setStatus({ type: 'error', message: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [config, data, setData, setSha, setStatus])

  async function handleSave() {
    setStatus({ type: 'saving', message: 'Saving…' })
    try {
      const result = await saveFile({
        token: config.token,
        owner: config.owner,
        repo: config.repo,
        branch: config.branch,
        path: DATA_PATH,
        data,
        sha,
        message: 'Update CV data via admin panel'
      })
      setSha(result.content.sha)
      setStatus({ type: 'success', message: 'Saved. Live in a few seconds.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  function update(section, value) {
    setData((d) => ({ ...d, [section]: value }))
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Edit CV</h1>
          <p className="hint">
            {config.owner}/{config.repo} · {config.branch}
          </p>
        </div>
        <div className="header-actions">
          <a href="./index.html" className="ghost-link">
            View site ↗
          </a>
          <button className="ghost-btn" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      </header>

      {!data ? (
        <p className="hint">{status.message}</p>
      ) : (
        <>
          <ProfileEditor profile={data.profile} onChange={(v) => update('profile', v)} config={config} />
          <ExperienceEditor items={data.experience} onChange={(v) => update('experience', v)} />
          <EducationEditor items={data.education} onChange={(v) => update('education', v)} />
          <ProjectsEditor items={data.projects} onChange={(v) => update('projects', v)} config={config} />
          <SkillsEditor items={data.skills} onChange={(v) => update('skills', v)} />
          <AwardsEditor items={data.awards || []} onChange={(v) => update('awards', v)} />
          <CertificationsEditor items={data.certifications || []} onChange={(v) => update('certifications', v)} config={config} />

          <div className="save-bar">
            <span className={`status status-${status.type}`}>{status.message}</span>
            <button className="primary" onClick={handleSave} disabled={status.type === 'saving'}>
              {status.type === 'saving' ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// A comma-separated text input. Keeps its own raw text in state so the
// display doesn't get rewritten mid-keystroke — re-deriving the input value
// from the parsed array on every change would silently eat trailing commas
// and spaces as you type.
function TagsInput({ value, onChange, placeholder }) {
  const [text, setText] = useState((value || []).join(', '))

  function handleChange(e) {
    const t = e.target.value
    setText(t)
    onChange(t.split(',').map((s) => s.trim()).filter(Boolean))
  }

  return <input value={text} onChange={handleChange} placeholder={placeholder} />
}

// ---------------------------------------------------------------------------
// Reusable file upload field — uploads immediately to the repo and hands
// back the resulting relative path via onChange.
// ---------------------------------------------------------------------------
const MAX_UPLOAD_MB = 8

function UploadField({ label, value, onChange, config, accept, kind = 'image' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`That file is over ${MAX_UPLOAD_MB}MB — pick something smaller, or use a URL instead.`)
      return
    }
    setError('')
    setBusy(true)
    try {
      const path = await uploadAsset({
        token: config.token,
        owner: config.owner,
        repo: config.repo,
        branch: config.branch,
        file
      })
      onChange(path)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="upload-field">
      <p className="sub-label">{label}</p>
      {value && kind === 'image' && (
        <img src={value.startsWith('http') ? value : `./${value}`} alt="" className="upload-preview" />
      )}
      {value && kind !== 'image' && (
        <a href={value.startsWith('http') ? value : `./${value}`} target="_blank" rel="noreferrer" className="upload-file-link">
          Current file ↗
        </a>
      )}
      <div className="upload-row">
        <input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Uploaded path, or paste a URL"
        />
        <label className="upload-btn">
          {busy ? 'Uploading…' : 'Upload'}
          <input type="file" accept={accept} onChange={handleFile} disabled={busy} hidden />
        </label>
      </div>
      {error && <p className="error-msg">{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section editors
// ---------------------------------------------------------------------------
function Card({ title, num, children, onAdd, addLabel }) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <span className="index-num">{num}</span> {title}
        </h2>
        {onAdd && (
          <button className="ghost-btn" onClick={onAdd}>
            + {addLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

function ProfileEditor({ profile, onChange, config }) {
  function set(field, value) {
    onChange({ ...profile, [field]: value })
  }
  function setLink(id, field, value) {
    onChange({ ...profile, links: profile.links.map((l) => (l.id === id ? { ...l, [field]: value } : l)) })
  }
  function addLink() {
    onChange({ ...profile, links: [...(profile.links || []), { id: makeId('l'), label: '', url: '' }] })
  }
  function removeLink(id) {
    onChange({ ...profile, links: profile.links.filter((l) => l.id !== id) })
  }

  return (
    <Card title="Profile" num="00">
      <label>
        Name
        <input value={profile.name} onChange={(e) => set('name', e.target.value)} />
      </label>
      <label>
        Title
        <input value={profile.title} onChange={(e) => set('title', e.target.value)} />
      </label>
      <label>
        Tagline
        <input value={profile.tagline} onChange={(e) => set('tagline', e.target.value)} />
      </label>
      <label>
        Bio
        <textarea rows={4} value={profile.bio} onChange={(e) => set('bio', e.target.value)} />
      </label>
      <div className="row-2">
        <label>
          Location
          <input value={profile.location} onChange={(e) => set('location', e.target.value)} />
        </label>
        <label>
          Email
          <input value={profile.email} onChange={(e) => set('email', e.target.value)} />
        </label>
      </div>
      <label>
        Currently (short status line — e.g. "Open to opportunities", "Building X at Y")
        <input value={profile.status || ''} onChange={(e) => set('status', e.target.value)} />
      </label>

      <UploadField
        label="Profile photo"
        value={profile.photo}
        onChange={(v) => set('photo', v)}
        config={config}
        accept="image/*"
        kind="image"
      />

      <div className="upload-field">
        <p className="sub-label">Intro video</p>
        <p className="hint" style={{ marginBottom: 8 }}>
          Paste a YouTube/Vimeo link (recommended), or upload a short clip directly.
        </p>
        <input
          value={profile.videoUrl || ''}
          onChange={(e) => set('videoUrl', e.target.value)}
          placeholder="https://youtube.com/watch?v=... or uploaded path"
        />
        <UploadFieldTrigger
          config={config}
          accept="video/*"
          onUploaded={(path) => set('videoUrl', path)}
        />
      </div>

      <p className="sub-label">Links</p>
      {profile.links?.map((l) => (
        <div key={l.id} className="row-2 with-remove">
          <input placeholder="Label" value={l.label} onChange={(e) => setLink(l.id, 'label', e.target.value)} />
          <input placeholder="URL" value={l.url} onChange={(e) => setLink(l.id, 'url', e.target.value)} />
          <button className="remove-btn" onClick={() => removeLink(l.id)} aria-label="Remove link">
            ×
          </button>
        </div>
      ))}
      <button className="ghost-btn" onClick={addLink}>
        + Add link
      </button>
    </Card>
  )
}

// A bare upload trigger (no text field of its own) — used where a URL field
// already exists and we just need an "or upload instead" button next to it.
function UploadFieldTrigger({ config, accept, onUploaded }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`That file is over ${MAX_UPLOAD_MB}MB — pick something smaller, or use a URL instead.`)
      return
    }
    setError('')
    setBusy(true)
    try {
      const path = await uploadAsset({
        token: config.token,
        owner: config.owner,
        repo: config.repo,
        branch: config.branch,
        file
      })
      onUploaded(path)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <label className="upload-btn">
        {busy ? 'Uploading…' : 'Upload file instead'}
        <input type="file" accept={accept} onChange={handleFile} disabled={busy} hidden />
      </label>
      {error && <p className="error-msg">{error}</p>}
    </div>
  )
}

function ExperienceEditor({ items, onChange }) {
  function update(id, field, value) {
    onChange(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  }
  function updateBullets(id, text) {
    update(id, 'bullets', text.split('\n').filter((b) => b.trim() !== ''))
  }
  function add() {
    onChange([
      ...items,
      { id: makeId('e'), role: '', company: '', location: '', start: '', end: '', bullets: [] }
    ])
  }
  function remove(id) {
    onChange(items.filter((it) => it.id !== id))
  }

  return (
    <Card title="Experience" num="01" onAdd={add} addLabel="Add role">
      {items?.map((it) => (
        <div key={it.id} className="entry-card">
          <div className="row-2">
            <label>
              Role
              <input value={it.role} onChange={(e) => update(it.id, 'role', e.target.value)} />
            </label>
            <label>
              Company
              <input value={it.company} onChange={(e) => update(it.id, 'company', e.target.value)} />
            </label>
          </div>
          <div className="row-3">
            <label>
              Location
              <input value={it.location} onChange={(e) => update(it.id, 'location', e.target.value)} />
            </label>
            <label>
              Start
              <input value={it.start} onChange={(e) => update(it.id, 'start', e.target.value)} />
            </label>
            <label>
              End
              <input value={it.end} onChange={(e) => update(it.id, 'end', e.target.value)} placeholder="Present" />
            </label>
          </div>
          <label>
            Bullet points (one per line)
            <textarea
              rows={3}
              value={(it.bullets || []).join('\n')}
              onChange={(e) => updateBullets(it.id, e.target.value)}
            />
          </label>
          <button className="remove-btn-wide" onClick={() => remove(it.id)}>
            Remove this role
          </button>
        </div>
      ))}
      {!items?.length && <p className="empty">No experience entries yet.</p>}
    </Card>
  )
}

function EducationEditor({ items, onChange }) {
  function update(id, field, value) {
    onChange(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  }
  function add() {
    onChange([...items, { id: makeId('ed'), school: '', degree: '', start: '', end: '', details: '' }])
  }
  function remove(id) {
    onChange(items.filter((it) => it.id !== id))
  }

  return (
    <Card title="Education" num="02" onAdd={add} addLabel="Add entry">
      {items?.map((it) => (
        <div key={it.id} className="entry-card">
          <div className="row-2">
            <label>
              School
              <input value={it.school} onChange={(e) => update(it.id, 'school', e.target.value)} />
            </label>
            <label>
              Degree / Field
              <input value={it.degree} onChange={(e) => update(it.id, 'degree', e.target.value)} />
            </label>
          </div>
          <div className="row-2">
            <label>
              Start
              <input value={it.start} onChange={(e) => update(it.id, 'start', e.target.value)} />
            </label>
            <label>
              End
              <input value={it.end} onChange={(e) => update(it.id, 'end', e.target.value)} />
            </label>
          </div>
          <label>
            Details (optional)
            <textarea rows={2} value={it.details} onChange={(e) => update(it.id, 'details', e.target.value)} />
          </label>
          <button className="remove-btn-wide" onClick={() => remove(it.id)}>
            Remove this entry
          </button>
        </div>
      ))}
      {!items?.length && <p className="empty">No education entries yet.</p>}
    </Card>
  )
}

function ProjectsEditor({ items, onChange, config }) {
  function update(id, field, value) {
    onChange(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  }
  function add() {
    onChange([
      ...items,
      { id: makeId('p'), title: '', description: '', tags: [], link: '', repo: '', image: '' }
    ])
  }
  function remove(id) {
    onChange(items.filter((it) => it.id !== id))
  }

  return (
    <Card title="Projects" num="03" onAdd={add} addLabel="Add project">
      {items?.map((it) => (
        <div key={it.id} className="entry-card">
          <label>
            Title
            <input value={it.title} onChange={(e) => update(it.id, 'title', e.target.value)} />
          </label>
          <label>
            Description
            <textarea rows={2} value={it.description} onChange={(e) => update(it.id, 'description', e.target.value)} />
          </label>
          <label>
            Tags (comma separated)
            <TagsInput value={it.tags} onChange={(v) => update(it.id, 'tags', v)} />
          </label>
          <div className="row-2">
            <label>
              Live link
              <input value={it.link} onChange={(e) => update(it.id, 'link', e.target.value)} />
            </label>
            <label>
              Repo link
              <input value={it.repo} onChange={(e) => update(it.id, 'repo', e.target.value)} />
            </label>
          </div>
          <UploadField
            label="Thumbnail image"
            value={it.image}
            onChange={(v) => update(it.id, 'image', v)}
            config={config}
            accept="image/*"
            kind="image"
          />
          <button className="remove-btn-wide" onClick={() => remove(it.id)}>
            Remove this project
          </button>
        </div>
      ))}
      {!items?.length && <p className="empty">No projects yet.</p>}
    </Card>
  )
}

function SkillsEditor({ items, onChange }) {
  function update(id, field, value) {
    onChange(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  }
  function add() {
    onChange([...items, { id: makeId('s'), category: '', items: [] }])
  }
  function remove(id) {
    onChange(items.filter((it) => it.id !== id))
  }

  return (
    <Card title="Skills" num="04" onAdd={add} addLabel="Add category">
      {items?.map((it) => (
        <div key={it.id} className="entry-card">
          <div className="row-2 with-remove">
            <label>
              Category
              <input value={it.category} onChange={(e) => update(it.id, 'category', e.target.value)} />
            </label>
            <label>
              Items (comma separated)
              <TagsInput value={it.items} onChange={(v) => update(it.id, 'items', v)} />
            </label>
            <button className="remove-btn" onClick={() => remove(it.id)} aria-label="Remove category">
              ×
            </button>
          </div>
        </div>
      ))}
      {!items?.length && <p className="empty">No skill categories yet.</p>}
    </Card>
  )
}

function AwardsEditor({ items, onChange }) {
  function update(id, field, value) {
    onChange(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  }
  function add() {
    onChange([...items, { id: makeId('aw'), title: '', issuer: '', date: '', description: '' }])
  }
  function remove(id) {
    onChange(items.filter((it) => it.id !== id))
  }

  return (
    <Card title="Awards" num="05" onAdd={add} addLabel="Add award">
      {items?.map((it) => (
        <div key={it.id} className="entry-card">
          <div className="row-3">
            <label>
              Title
              <input value={it.title} onChange={(e) => update(it.id, 'title', e.target.value)} />
            </label>
            <label>
              Issuer
              <input value={it.issuer} onChange={(e) => update(it.id, 'issuer', e.target.value)} />
            </label>
            <label>
              Date
              <input value={it.date} onChange={(e) => update(it.id, 'date', e.target.value)} />
            </label>
          </div>
          <label>
            Description (optional)
            <textarea rows={2} value={it.description} onChange={(e) => update(it.id, 'description', e.target.value)} />
          </label>
          <button className="remove-btn-wide" onClick={() => remove(it.id)}>
            Remove this award
          </button>
        </div>
      ))}
      {!items?.length && <p className="empty">No awards yet.</p>}
    </Card>
  )
}

function CertificationsEditor({ items, onChange, config }) {
  function update(id, field, value) {
    onChange(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  }
  function add() {
    onChange([
      ...items,
      { id: makeId('c'), title: '', issuer: '', date: '', credentialUrl: '', file: '' }
    ])
  }
  function remove(id) {
    onChange(items.filter((it) => it.id !== id))
  }

  return (
    <Card title="Certifications" num="06" onAdd={add} addLabel="Add certification">
      {items?.map((it) => (
        <div key={it.id} className="entry-card">
          <div className="row-3">
            <label>
              Title
              <input value={it.title} onChange={(e) => update(it.id, 'title', e.target.value)} />
            </label>
            <label>
              Issuer
              <input value={it.issuer} onChange={(e) => update(it.id, 'issuer', e.target.value)} />
            </label>
            <label>
              Date
              <input value={it.date} onChange={(e) => update(it.id, 'date', e.target.value)} />
            </label>
          </div>
          <label>
            Credential URL (optional — link to verify online)
            <input value={it.credentialUrl} onChange={(e) => update(it.id, 'credentialUrl', e.target.value)} />
          </label>
          <UploadField
            label="Certificate file (image or PDF)"
            value={it.file}
            onChange={(v) => update(it.id, 'file', v)}
            config={config}
            accept="image/*,application/pdf"
            kind="file"
          />
          <button className="remove-btn-wide" onClick={() => remove(it.id)}>
            Remove this certification
          </button>
        </div>
      ))}
      {!items?.length && <p className="empty">No certifications yet.</p>}
    </Card>
  )
}