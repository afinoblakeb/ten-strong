import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ShieldCheck, Smartphone } from 'lucide-react'
import { useAppState } from '../AppState'
import { formatISODate } from '../lib/date'
import { parseDumbbellInput, parseWeightLb, toggleDumbbell } from '../lib/parse'
import type { UserProfile } from '../types'

const QUICK_WEIGHTS = [5, 8, 10, 12, 15, 20, 25, 30]
type StartChoice = 'today' | 'tomorrow' | 'pick'
interface FieldErrors { weight?: string; height?: string; date?: string }

export function OnboardingPage() {
  const { data, completeOnboarding } = useAppState()
  const [profile, setProfile] = useState<UserProfile>(data.profile)
  const [weights, setWeights] = useState(data.profile.dumbbells.join(', '))
  const [weightStr, setWeightStr] = useState('')
  const [heightStr, setHeightStr] = useState('')
  const [startChoice, setStartChoice] = useState<StartChoice>('today')
  const [pickedDate, setPickedDate] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const weightRef = useRef<HTMLInputElement>(null)
  const heightRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  if (data.profile.onboardingComplete) return <Navigate to="/today" replace/>
  const todayISO = formatISODate(new Date())
  const parsed = parseDumbbellInput(weights)
  function submit(event: FormEvent) {
    event.preventDefault()
    const weightLb = parseWeightLb(weightStr)
    const nextErrors: FieldErrors = {}
    if (weightLb === null) nextErrors.weight = 'Enter your current weight in pounds (80–500).'
    if (!heightStr.trim()) nextErrors.height = 'Enter your height — any format works.'
    if (startChoice === 'pick') {
      if (!pickedDate) nextErrors.date = 'Pick a start date, or choose today.'
      else if (pickedDate < todayISO) nextErrors.date = 'Pick today or a future date.'
    }
    if (nextErrors.weight || nextErrors.height || nextErrors.date) {
      setErrors(nextErrors)
      ;(nextErrors.weight ? weightRef.current : nextErrors.height ? heightRef.current : dateRef.current)?.focus()
      return
    }
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    const startDate = startChoice === 'today' ? todayISO : startChoice === 'tomorrow' ? formatISODate(tomorrow) : pickedDate
    completeOnboarding({ ...profile, label:profile.label.trim() || 'My 90-Day Challenge', weightLb:weightLb!, height:heightStr.trim(), startDate, dumbbells:parsed.weights, onboardingComplete:true })
    navigate('/today')
  }
  function pickStart(choice: StartChoice) { setStartChoice(choice); if (errors.date) setErrors({ ...errors, date:undefined }) }
  return <main id="main-content" tabIndex={-1} className="onboarding page narrow">
    <div className="eyebrow">Your 90-day starting line</div>
    <h1>Build practical strength.<br/><em>Ten minutes at a time.</em></h1>
    <p className="lede">A progressive, local-first challenge designed for returning to training without trying to win Day 1.</p>
    <aside className="install-nudge" aria-label="Install tip"><Smartphone aria-hidden/><div><strong>Using your iPhone?</strong><span>Open this page in Safari, tap Share, then <b>Add to Home Screen</b>. Ten Strong will launch like an app and keep working offline.</span></div></aside>
    <form onSubmit={submit} className="stack-lg" noValidate>
      <section className="card form-card"><span className="step" aria-hidden>01</span><h2>Make it yours</h2>
        <label>Challenge label<input value={profile.label} onChange={(e)=>setProfile({...profile,label:e.target.value})}/></label>
        <div className="two-col"><label>Age range<select value={profile.ageRange} onChange={(e)=>setProfile({...profile,ageRange:e.target.value})}><option>18–29</option><option>30–39</option><option>40–49</option><option>50–59</option><option>60+</option></select></label>
          <label>Current weight (lb)<input ref={weightRef} inputMode="decimal" autoComplete="off" placeholder="e.g. 165" value={weightStr} aria-invalid={errors.weight?true:undefined} aria-describedby={errors.weight?'ob-weight-error':undefined} onChange={(e)=>{setWeightStr(e.target.value); if(errors.weight) setErrors({...errors,weight:undefined})}}/>{errors.weight && <span className="field-error" id="ob-weight-error">{errors.weight}</span>}</label></div>
        <label>Height<input ref={heightRef} placeholder={`e.g. 5'9"`} value={heightStr} aria-invalid={errors.height?true:undefined} aria-describedby={errors.height?'ob-height-error':undefined} onChange={(e)=>{setHeightStr(e.target.value); if(errors.height) setErrors({...errors,height:undefined})}}/>{errors.height && <span className="field-error" id="ob-height-error">{errors.height}</span>}</label>
        <label>Training history<select value={profile.trainingHistory} onChange={(e)=>setProfile({...profile,trainingHistory:e.target.value})}><option>Formerly athletic; detrained</option><option>Some past training</option><option>New to strength training</option><option>Recently active</option></select></label>
      </section>
      <section className="card form-card"><span className="step" aria-hidden>02</span><h2>What do you have?</h2>
        <label htmlFor="ob-dumbbells">Dumbbell weights in pounds <span className="optional">optional</span></label>
        <input id="ob-dumbbells" inputMode="text" autoComplete="off" placeholder="e.g. 10 15 25 — leave blank if unsure" value={weights} onChange={(e)=>setWeights(e.target.value)}/>
        <p className="parse-feedback" aria-live="polite">{parsed.weights.length>0 && <span className="parse-preview">We read: {parsed.weights.join(', ')} lb.</span>}{parsed.dropped.length>0 && <span className="parse-warn"> Skipping “{parsed.dropped.join('”, “')}” — we couldn’t read {parsed.dropped.length>1?'those':'that'} as a weight.</span>}</p>
        <div className="chip-row" role="group" aria-label="Common dumbbell weights — tap to add or remove">{QUICK_WEIGHTS.map((value)=><button key={value} type="button" className="chip" aria-pressed={parsed.weights.includes(value)} onClick={()=>setWeights(toggleDumbbell(weights,value))}>{value}</button>)}</div>
        <p className="micro">Tap the weights you own, or type your own list. You can update this anytime in Settings.</p>
        <label>Current activity<select value={profile.activityLevel} onChange={(e)=>setProfile({...profile,activityLevel:e.target.value})}><option>Mostly sedentary</option><option>Lightly active</option><option>Moderately active</option></select></label>
        <label>Known limitations or past injuries <span className="optional">optional</span><textarea rows={3} placeholder="This does not diagnose or screen an injury." value={profile.limitations} onChange={(e)=>setProfile({...profile,limitations:e.target.value})}/></label>
        <label className="check"><input type="checkbox" checked={profile.hasSturdyChair} onChange={(e)=>setProfile({...profile,hasSturdyChair:e.target.checked})}/><span>I have a sturdy, non-rolling chair, couch, or counter for support.</span></label>
      </section>
      <section className="card form-card"><span className="step" aria-hidden>03</span><h2>Anchor the habit</h2>
        <fieldset className="start-picker"><legend>Start date</legend>
          <div className="segmented" role="group" aria-label="Start date">
            <button type="button" className={startChoice==='today'?'selected':''} aria-pressed={startChoice==='today'} onClick={()=>pickStart('today')}>Start today</button>
            <button type="button" className={startChoice==='tomorrow'?'selected':''} aria-pressed={startChoice==='tomorrow'} onClick={()=>pickStart('tomorrow')}>Start tomorrow</button>
            <button type="button" className={startChoice==='pick'?'selected':''} aria-pressed={startChoice==='pick'} onClick={()=>pickStart('pick')}>Pick a date</button>
          </div>
          {startChoice==='pick' && <><input ref={dateRef} type="date" aria-label="Start date" min={todayISO} value={pickedDate} aria-invalid={errors.date?true:undefined} aria-describedby={errors.date?'ob-date-error':undefined} onChange={(e)=>{setPickedDate(e.target.value); if(errors.date) setErrors({...errors,date:undefined})}}/>{errors.date && <span className="field-error" id="ob-date-error">{errors.date}</span>}</>}
        </fieldset>
        <label>Preferred time<select value={profile.preferredTime} onChange={(e)=>setProfile({...profile,preferredTime:e.target.value})}><option>Morning</option><option>Midday</option><option>Evening</option><option>Flexible</option></select></label>
        <label>Habit anchor<input value={profile.habitAnchor} placeholder="After I make coffee" onChange={(e)=>setProfile({...profile,habitAnchor:e.target.value})}/><small>Complete this sentence: “{profile.habitAnchor || 'After I…'}, I will open Ten Strong.”</small></label>
        <label className="check"><input type="checkbox" checked={profile.photoReminder} onChange={(e)=>setProfile({...profile,photoReminder:e.target.checked})}/><span>Remind me that optional progress photos work best under similar conditions.</span></label>
      </section>
      <aside className="safety-note" aria-label="Safety note"><ShieldCheck aria-hidden/><div><strong>A calm safety note</strong><p>Ten Strong is general fitness education, not medical care. If you have a heart condition, uncontrolled blood pressure, a recent surgery, or an injury that limits movement, check in with a clinician before starting. <Link to="/methodology">Read the full safety guidance in Methodology.</Link></p></div></aside>
      <button className="button primary wide" type="submit">Begin my challenge</button>
      <p className="micro center">No account. No analytics. Your workout data stays in this browser.</p>
    </form>
  </main>
}
