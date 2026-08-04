import { useEffect, useState } from 'react'
import { verifyAccess, fetchFile, saveFile } from '../lib/github.js'
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
          <ProfileEditor profile={data.profile} onChange={(v) => update('profile', v)} />
          <ExperienceEditor items={data.experience} onChange={(v) => update('experience', v)} />
          <EducationEditor items={data.education} onChange={(v) => update('education', v)} />
          <ProjectsEditor items={data.projects} onChange={(v) => update('projects', v)} />
          <SkillsEditor items={data.skills} onChange={(v) => update('skills', v)} />

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

function ProfileEditor({ profile, onChange }) {
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

function ProjectsEditor({ items, onChange }) {
  function update(id, field, value) {
    onChange(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  }
  function updateTags(id, text) {
    update(
      id,
      'tags',
      text.split(',').map((t) => t.trim()).filter(Boolean)
    )
  }
  function add() {
    onChange([
      ...items,
      { id: makeId('p'), title: '', description: '', tags: [], link: '', repo: '' }
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
            <input value={(it.tags || []).join(', ')} onChange={(e) => updateTags(it.id, e.target.value)} />
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
  function updateItems(id, text) {
    update(
      id,
      'items',
      text.split(',').map((t) => t.trim()).filter(Boolean)
    )
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
              <input value={(it.items || []).join(', ')} onChange={(e) => updateItems(it.id, e.target.value)} />
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
