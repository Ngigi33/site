import { useEffect, useState } from 'react'
import './publicSite.css'

const SECTIONS = [
  { id: 'profile', num: '00', label: 'Profile' },
  { id: 'experience', num: '01', label: 'Experience' },
  { id: 'education', num: '02', label: 'Education' },
  { id: 'projects', num: '03', label: 'Projects' },
  { id: 'skills', num: '04', label: 'Skills' }
]

export default function PublicSite() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}data/cv.json?t=${Date.now()}`
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('cv.json not found')
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div className="state-screen">
        <p>Couldn't load CV data ({error}).</p>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="state-screen">
        <p>Loading…</p>
      </div>
    )
  }

  const { profile, experience, education, projects, skills } = data

  return (
    <div className="doc">
      <aside className="index">
        <div className="index-mark">FILE</div>
        <nav>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="index-link">
              <span className="index-num">{s.num}</span>
              <span>{s.label}</span>
            </a>
          ))}
        </nav>
        <a href="./admin.html" className="index-admin">
          Admin →
        </a>
      </aside>

      <main className="sheet">
        <section id="profile" className="block profile-block">
          <p className="eyebrow">Curriculum Vitae</p>
          <h1>{profile.name}</h1>
          <p className="title-line">{profile.title}</p>
          <p className="tagline">{profile.tagline}</p>
          <p className="bio">{profile.bio}</p>
          <div className="meta-row">
            {profile.location && <span>{profile.location}</span>}
            {profile.email && (
              <a href={`mailto:${profile.email}`}>{profile.email}</a>
            )}
            {profile.links?.map((l) => (
              <a key={l.id} href={l.url} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ))}
          </div>
        </section>

        <section id="experience" className="block">
          <h2>
            <span className="index-num">01</span> Experience
          </h2>
          <div className="timeline">
            {experience?.map((e) => (
              <article key={e.id} className="entry">
                <div className="entry-date">
                  {e.start} — {e.end}
                </div>
                <div className="entry-body">
                  <h3>{e.role}</h3>
                  <p className="entry-sub">
                    {e.company}
                    {e.location ? ` · ${e.location}` : ''}
                  </p>
                  {e.bullets?.length > 0 && (
                    <ul>
                      {e.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}
            {!experience?.length && <p className="empty">Nothing here yet.</p>}
          </div>
        </section>

        <section id="education" className="block">
          <h2>
            <span className="index-num">02</span> Education
          </h2>
          <div className="timeline">
            {education?.map((ed) => (
              <article key={ed.id} className="entry">
                <div className="entry-date">
                  {ed.start} — {ed.end}
                </div>
                <div className="entry-body">
                  <h3>{ed.school}</h3>
                  <p className="entry-sub">{ed.degree}</p>
                  {ed.details && <p className="entry-details">{ed.details}</p>}
                </div>
              </article>
            ))}
            {!education?.length && <p className="empty">Nothing here yet.</p>}
          </div>
        </section>

        <section id="projects" className="block">
          <h2>
            <span className="index-num">03</span> Projects
          </h2>
          <div className="project-grid">
            {projects?.map((p) => (
              <article key={p.id} className="project-card">
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                {p.tags?.length > 0 && (
                  <div className="tags">
                    {p.tags.map((t, i) => (
                      <span key={i} className="tag">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="project-links">
                  {p.link && (
                    <a href={p.link} target="_blank" rel="noreferrer">
                      View
                    </a>
                  )}
                  {p.repo && (
                    <a href={p.repo} target="_blank" rel="noreferrer">
                      Repo
                    </a>
                  )}
                </div>
              </article>
            ))}
            {!projects?.length && <p className="empty">Nothing here yet.</p>}
          </div>
        </section>

        <section id="skills" className="block">
          <h2>
            <span className="index-num">04</span> Skills
          </h2>
          <div className="skills-grid">
            {skills?.map((s) => (
              <div key={s.id} className="skill-group">
                <h4>{s.category}</h4>
                <p>{s.items?.join(' · ')}</p>
              </div>
            ))}
            {!skills?.length && <p className="empty">Nothing here yet.</p>}
          </div>
        </section>

        <footer className="doc-footer">
          <a href="./admin.html">Edit this page</a>
        </footer>
      </main>
    </div>
  )
}
