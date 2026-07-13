import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock3, LockKeyhole } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAppState } from '../AppState'
import { exerciseById } from '../data/exercises'
import { phaseForDay, programForDay, resolveTemplateById } from '../data/program'
import { challengeDateForDay, differenceInCalendarDays } from '../lib/date'
import { trainingTemplateForDay } from '../lib/engine'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

function targetFor(item: { repMin?: number; repMax?: number; seconds?: number }): string {
  if (item.seconds !== undefined) return `${item.seconds} seconds`
  if (item.repMin === item.repMax || item.repMax === undefined) return `${item.repMin ?? 0} reps`
  return `${item.repMin}–${item.repMax} reps`
}

function kindLabel(kind: 'strength' | 'recovery' | 'assessment'): string {
  if (kind === 'recovery') return 'mobility'
  if (kind === 'strength') return 'workout'
  return 'assessment'
}

export function DayPreviewPage() {
  const { day: dayParam } = useParams()
  const { data } = useAppState()
  const day = Number(dayParam)

  if (!Number.isInteger(day) || day < 1 || day > 90) return <Navigate to="/calendar" replace />

  const calendarPlan = programForDay(day)
  const loggedSession = data.sessions.find((session) => session.day === day)
  const date = challengeDateForDay(data.profile.startDate, day)
  const dateDistance = differenceInCalendarDays(date, new Date())
  const isToday = dateDistance === 0
  const isFuture = dateDistance > 0
  const currentDecision = isToday ? trainingTemplateForDay(data, day) : null
  const template = loggedSession
    ? resolveTemplateById(loggedSession.templateId)
    : resolveTemplateById(currentDecision?.templateId ?? calendarPlan.templateId)
  const phase = phaseForDay(day)
  const activeMinutes = loggedSession
    ? Math.round((loggedSession.activitySeconds ?? loggedSession.durationSeconds) / 60)
    : null
  const completedSets = loggedSession?.sets.filter((set) => set.completed).length ?? 0

  if (!template) return <Navigate to="/calendar" replace />

  return <div className="page day-preview-page">
    <Link className="preview-back" to="/calendar"><ArrowLeft /> All 90 days</Link>

    <header className="day-preview-hero">
      <div className="preview-title-row">
        <div>
          <div className="eyebrow">Day {day} · {dateFormatter.format(date)}</div>
          <h1>{template.title}</h1>
          <p className="lede small">{template.focus}</p>
        </div>
        <span className={`kind ${template.kind}`}>{kindLabel(template.kind)}</span>
      </div>
      <div className="day-browser" aria-label="Browse challenge days">
        {day > 1
          ? <Link className="button secondary" to={`/day/${day - 1}`} aria-label={`Preview Day ${day - 1}`}><ChevronLeft /> Day {day - 1}</Link>
          : <span />}
        <Link className="icon-button" to="/calendar" aria-label="Open 90-day calendar"><CalendarDays /></Link>
        {day < 90
          ? <Link className="button secondary" to={`/day/${day + 1}`} aria-label={`Preview Day ${day + 1}`}>Day {day + 1} <ChevronRight /></Link>
          : <span />}
      </div>
    </header>

    {loggedSession ? <section className="card preview-status-card" aria-label="Recorded result">
      <div><span className="eyebrow">Recorded result</span><strong>{loggedSession.status === 'recovery' ? 'Mobility completed' : loggedSession.status}</strong></div>
      <div><strong>{activeMinutes}</strong><span>active min</span></div>
      <div><strong>{completedSets}</strong><span>sets logged</span></div>
    </section> : <section className="preview-lock-note" aria-label={isFuture ? 'Future day preview' : isToday ? 'Today preview' : 'Past day preview'}>
      <LockKeyhole />
      <div>
        <strong>{isFuture ? 'Preview only — nothing is being started.' : isToday ? 'This is today’s scheduled session.' : 'This day remains read-only.'}</strong>
        <p>{isFuture
          ? 'The exact load, reps, and exercise versions will adapt to your equipment, readiness, and progress when this date arrives.'
          : isToday
            ? <>Use the readiness check on <Link to="/today">Today</Link> to get your exact prescription and begin.</>
            : 'Ten Strong does not backfill missed days or double tomorrow’s work. Return to Today and continue from there.'}</p>
      </div>
    </section>}

    <section className="preview-session" aria-labelledby="session-outline-title">
      <div className="section-heading">
        <div><div className="eyebrow">Ten-minute outline</div><h2 id="session-outline-title">What’s on the schedule</h2></div>
        <div className="preview-duration"><Clock3 /> About 10 min</div>
      </div>
      <ol className="preview-exercise-list">
        {template.items.map((item, index) => {
          const exercise = exerciseById[item.exerciseId]
          return <li className="card preview-exercise" key={`${item.exerciseId}-${index}`}>
            <span className="preview-exercise-number">{index + 1}</span>
            <div>
              <strong>{exercise?.name ?? item.exerciseId}</strong>
              <span>{item.sets} {item.sets === 1 ? 'set' : 'sets'} · {targetFor(item)} · {item.tempo} tempo</span>
              {item.note && <small>{item.note}</small>}
            </div>
          </li>
        })}
      </ol>
      <p className="micro">This is the session structure, not a fixed promise. Today’s readiness and dumbbell check can reduce volume, switch to mobility, or safely rebuild the queue with bodyweight movements.</p>
    </section>

    <section className="card preview-context">
      <div><span>Phase {phase.id}</span><strong>{phase.name}</strong></div>
      <div><span>Effort</span><strong>{phase.effort}</strong></div>
      <div><span>Planned equipment</span><strong>{template.equipment.join(' · ')}</strong></div>
    </section>
  </div>
}
