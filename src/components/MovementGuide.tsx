import type { Exercise } from '../types'

function tempoInstruction(tempo:string) {
  const numbers=tempo.split(/[–-]/).map(Number)
  if(numbers.length===3&&numbers.every(Number.isFinite)){
    const [lower,pause,returnSeconds]=numbers
    return `${lower} second${lower===1?'':'s'} into the lowered or lengthened position · ${pause} second${pause===1?'':'s'} paused there · ${returnSeconds} second${returnSeconds===1?'':'s'} through the lifting or returning phase.`
  }
  const descriptions:Record<string,string>={
    easy:'Move continuously at a relaxed pace. There is no target repetition speed.',
    slow:'Make every change of direction deliberate; do not bounce into range.',
    steady:'Hold the position without racing the clock, and keep breathing throughout.',
    controlled:'Use a smooth pace in both directions and pause before momentum takes over.',
    'easy control':'Move slowly enough to keep the trunk quiet and the breathing relaxed.',
    'slow walk':'Take short, quiet steps while keeping the torso vertical.',
    'easy rehearsal':'Use small, unhurried practice repetitions. This is preparation, not a work set.',
  }
  return descriptions[tempo]??`Use a ${tempo} pace with no bouncing or rushed changes of direction.`
}

interface MovementGuideProps {
  exercise:Exercise
  tempo?:string
  variation?:string
  compact?:boolean
}

export function MovementGuide({exercise,tempo,variation,compact=false}:MovementGuideProps){
  const guide=exercise.instructions
  const version=variation??exercise.standard
  const instructions=<>
    <div className="movement-section"><h3>Set up</h3><ul>{guide.setup.map(item=><li key={item}>{item}</li>)}</ul></div>
    <div className="movement-section"><h3>Do the motion</h3><ol>{guide.motion.map(item=><li key={item}>{item}</li>)}</ol></div>
    <div className="movement-notes"><div><strong>Breathe</strong><p>{guide.breathing}</p></div><div><strong>You should feel</strong><p>{guide.feel}</p></div></div>
    {tempo&&<div className="tempo-guide"><strong>Today’s tempo: {tempo}</strong><p>{tempoInstruction(tempo)}</p></div>}
    <details className="movement-safety"><summary>Make it easier, harder, or stop</summary><dl><dt>Easier</dt><dd>{exercise.regression}</dd><dt>Standard</dt><dd>{exercise.standard}</dd><dt>Harder</dt><dd>{exercise.progression}</dd><dt>No equipment</dt><dd>{exercise.noEquipment}</dd><dt>Avoid</dt><dd>{exercise.mistakes.join(' · ')}</dd></dl><p className="warning"><strong>Stop or change the movement:</strong> {exercise.warning}</p></details>
  </>
  return <section className={`movement-guide ${compact?'compact':''}`} aria-label={`Written movement guide for ${exercise.name}`}>
    <header><div><span>Written movement guide</span><h2>How to do it</h2></div>{variation&&<div className="version-chip"><span>Version today</span><strong>{version}</strong></div>}</header>
    <p className="movement-purpose">{guide.purpose}</p>
    {compact?<details className="library-instructions"><summary>Read step-by-step instructions</summary>{instructions}</details>:instructions}
  </section>
}
