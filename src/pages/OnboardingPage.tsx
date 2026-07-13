import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Smartphone } from 'lucide-react'
import { useAppState } from '../AppState'
import type { UserProfile } from '../types'

export function OnboardingPage() {
  const { data, completeOnboarding } = useAppState()
  const [profile, setProfile] = useState<UserProfile>(data.profile)
  const [weights, setWeights] = useState(data.profile.dumbbells.join(', '))
  const navigate = useNavigate()
  function submit(event: FormEvent) {
    event.preventDefault()
    const dumbbells = weights.split(',').map((value) => Number(value.trim())).filter((value) => Number.isFinite(value) && value > 0)
    completeOnboarding({ ...profile, dumbbells:[...new Set(dumbbells)].sort((a,b) => a-b), onboardingComplete:true })
    navigate('/today')
  }
  return <div className="onboarding page narrow">
    <div className="eyebrow">Your 90-day starting line</div>
    <h1>Build practical strength.<br/><em>Ten minutes at a time.</em></h1>
    <p className="lede">A progressive, local-first challenge designed for returning to training without trying to win Day 1.</p>
    <aside className="install-nudge"><Smartphone/><div><strong>Using your iPhone?</strong><span>Open this page in Safari, tap Share, then <b>Add to Home Screen</b>. Ten Strong will launch like an app and keep working offline.</span></div></aside>
    <form onSubmit={submit} className="stack-lg">
      <section className="card form-card"><span className="step">01</span><h2>Make it yours</h2>
        <label>Challenge label<input required value={profile.label} onChange={(e)=>setProfile({...profile,label:e.target.value})}/></label>
        <div className="two-col"><label>Age range<select value={profile.ageRange} onChange={(e)=>setProfile({...profile,ageRange:e.target.value})}><option>18–29</option><option>30–39</option><option>40–49</option><option>50–59</option><option>60+</option></select></label><label>Current weight (lb)<input type="number" min="80" max="500" value={profile.weightLb} onChange={(e)=>setProfile({...profile,weightLb:Number(e.target.value)})}/></label></div>
        <label>Height<input required value={profile.height} placeholder={`e.g. 5'9"`} onChange={(e)=>setProfile({...profile,height:e.target.value})}/></label>
        <label>Training history<select value={profile.trainingHistory} onChange={(e)=>setProfile({...profile,trainingHistory:e.target.value})}><option>Formerly athletic; detrained</option><option>Some past training</option><option>New to strength training</option><option>Recently active</option></select></label>
      </section>
      <section className="card form-card"><span className="step">02</span><h2>What do you have?</h2>
        <label>Dumbbell weights in pounds <span className="optional">optional</span><input inputMode="decimal" placeholder="e.g. 10, 15, 25 — leave blank if unsure" value={weights} onChange={(e)=>setWeights(e.target.value)}/><small>List one of each available weight. You can update this later.</small></label>
        <label>Current activity<select value={profile.activityLevel} onChange={(e)=>setProfile({...profile,activityLevel:e.target.value})}><option>Mostly sedentary</option><option>Lightly active</option><option>Moderately active</option></select></label>
        <label>Known limitations or past injuries <span className="optional">optional</span><textarea rows={3} placeholder="This does not diagnose or screen an injury." value={profile.limitations} onChange={(e)=>setProfile({...profile,limitations:e.target.value})}/></label>
        <label className="check"><input type="checkbox" checked={profile.hasSturdyChair} onChange={(e)=>setProfile({...profile,hasSturdyChair:e.target.checked})}/><span>I have a sturdy, non-rolling chair, couch, or counter for support.</span></label>
      </section>
      <section className="card form-card"><span className="step">03</span><h2>Anchor the habit</h2>
        <div className="two-col"><label>Start date<input type="date" required value={profile.startDate} onChange={(e)=>setProfile({...profile,startDate:e.target.value})}/></label><label>Preferred time<select value={profile.preferredTime} onChange={(e)=>setProfile({...profile,preferredTime:e.target.value})}><option>Morning</option><option>Midday</option><option>Evening</option><option>Flexible</option></select></label></div>
        <label>Habit anchor<input value={profile.habitAnchor} placeholder="After I make coffee" onChange={(e)=>setProfile({...profile,habitAnchor:e.target.value})}/><small>Complete this sentence: “{profile.habitAnchor || 'After I…'}, I will open Ten Strong.”</small></label>
        <label className="check"><input type="checkbox" checked={profile.photoReminder} onChange={(e)=>setProfile({...profile,photoReminder:e.target.checked})}/><span>Remind me that optional progress photos work best under similar conditions.</span></label>
      </section>
      <aside className="safety-note"><ShieldCheck/><div><strong>A calm safety note</strong><p>Ten Strong provides general fitness education, not medical care. Consider medical clearance before starting if you have known cardiovascular disease, uncontrolled blood pressure, unexplained chest pain, dizziness or fainting, recent surgery, a significant joint injury, or another serious condition that may affect exercise.</p></div></aside>
      <button className="button primary wide" type="submit">Begin my challenge</button>
      <p className="micro center">No account. No analytics. Your workout data stays in this browser.</p>
    </form>
  </div>
}
