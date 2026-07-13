import type { Exercise } from '../types'

export function ExerciseVisual({ exercise, compact = false }: { exercise: Exercise; compact?: boolean }) {
  const pose = exercise.visual
  return (
    <svg className={`exercise-visual ${compact ? 'compact' : ''}`} viewBox="0 0 240 140" role="img" aria-label={`Simple start and finish position guide for ${exercise.name}`}>
      <rect width="240" height="140" rx="16" fill="currentColor" opacity=".06" />
      <path d="M18 119H222" stroke="currentColor" opacity=".22" strokeWidth="2" />
      {pose === 'push' && <><circle cx="52" cy="61" r="10"/><path d="M62 69l55 19 39 1M73 73l-16 33M102 84l-6 28M156 89l24 25"/><path d="M139 48l-1 30 48 0M137 58l-29 17M137 58l26 18"/><circle cx="139" cy="35" r="10"/></>}
      {pose === 'squat' && <><circle cx="64" cy="32" r="10"/><path d="M64 43v42l-22 32M64 85l30 31M47 57h34"/><circle cx="47" cy="58" r="7" fill="none"/><circle cx="81" cy="58" r="7" fill="none"/><circle cx="161" cy="43" r="10"/><path d="M161 54l-9 34-31 5M152 88l28 28M152 88l-10 29M143 65l32 5"/></>}
      {pose === 'row' && <><circle cx="54" cy="42" r="10"/><path d="M62 50l43 26 32-2M76 58l-21 35M102 74l-10 42M136 74l22 40M106 76l21-28"/><circle cx="127" cy="48" r="7" fill="none"/><path d="M160 51h43M179 51v65M163 60l-18 28"/><circle cx="151" cy="37" r="10"/><path d="M158 45l22 29 23 0M177 72l-19 43M179 73l22 41M164 52l-25 2"/><circle cx="136" cy="54" r="7" fill="none"/></>}
      {pose === 'hinge' && <><circle cx="61" cy="31" r="10"/><path d="M61 42v48l-18 27M61 89l18 27M47 58l-2 32M75 58l2 32"/><circle cx="45" cy="95" r="6" fill="none"/><circle cx="77" cy="95" r="6" fill="none"/><circle cx="152" cy="48" r="10"/><path d="M145 56l-34 30M112 86l12 30M112 86l-10 30M129 72l17 28M139 63l23 29"/><circle cx="146" cy="104" r="6" fill="none"/><circle cx="162" cy="96" r="6" fill="none"/></>}
      {pose === 'press' && <><circle cx="64" cy="49" r="10"/><path d="M64 60v37l-19 21M64 97l20 21M55 69l-20-23M73 68l20-24"/><circle cx="33" cy="42" r="6" fill="none"/><circle cx="95" cy="40" r="6" fill="none"/><circle cx="166" cy="49" r="10"/><path d="M166 60v37l-19 21M166 97l20 21M159 67l-6-43M173 67l8-43"/><circle cx="152" cy="19" r="6" fill="none"/><circle cx="182" cy="19" r="6" fill="none"/></>}
      {pose === 'lunge' && <><circle cx="62" cy="38" r="10"/><path d="M62 49v38l-31 29M62 87l34 29M51 59h23"/><circle cx="158" cy="50" r="10"/><path d="M158 61v29l-29 25M158 90l42 19M148 70h23"/></>}
      {pose === 'core' && <><circle cx="45" cy="87" r="10"/><path d="M56 89l46 2 39-25M82 90l-18-38M102 91l34 26"/><circle cx="158" cy="83" r="10"/><path d="M169 85l38 0M170 88l16 29M184 85l19-30M157 94l-21 23"/></>}
      {pose === 'carry' && <><circle cx="76" cy="36" r="10"/><path d="M76 47v44l-18 27M76 91l20 27M61 57l-9 38M91 57l12 38"/><rect x="42" y="94" width="20" height="19" rx="3" fill="none"/><path d="M143 117h42M151 107l11 10-11 10M178 107l11 10-11 10"/></>}
      {pose === 'mobility' && <><circle cx="52" cy="78" r="10"/><path d="M61 84l49 1 31 31M85 85l-20 32M109 85l23-34"/><circle cx="170" cy="38" r="10"/><path d="M170 49v43l-23 25M170 92l24 25M160 58l-22 20M180 58l22 20"/></>}
    </svg>
  )
}
