import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { exercises } from '../src/data/exercises'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

// Weight and height are now required with no fabricated defaults; start date defaults to today.
async function completeOnboarding(page: import('@playwright/test').Page, dumbbells = '') {
  await expect(page.getByRole('heading',{ name:/Build practical strength/ })).toBeVisible()
  await page.getByLabel('Current weight (lb)').fill('165')
  await page.getByLabel('Height').fill(`5'10"`)
  if (dumbbells) await page.getByLabel('Dumbbell weights in pounds optional').fill(dumbbells)
  await page.getByLabel('Habit anchor').fill('After coffee')
  await page.getByRole('button',{ name:'Begin my challenge' }).click()
}

async function finishTenMinutePractice(page: import('@playwright/test').Page) {
  await expect(page.getByRole('heading',{name:/cruise it home/})).toBeVisible()
  await page.waitForTimeout(50)
  // Park the finisher far from zero so the auto-started countdown cannot race the disabled assertion.
  await page.evaluate(()=>{for(let index=0;index<localStorage.length;index+=1){const key=localStorage.key(index);if(!key?.startsWith('ten-strong-draft-d'))continue;const draft=JSON.parse(localStorage.getItem(key)??'{}');draft.elapsed=300;draft.activeSeconds=300;draft.finisherRemaining=300;draft.finishing=true;draft.startedAt=Date.now();localStorage.setItem(key,JSON.stringify(draft))}})
  await page.reload()
  await expect(page.getByRole('button',{name:/remaining/})).toBeDisabled()
  await page.evaluate(()=>{for(let index=0;index<localStorage.length;index+=1){const key=localStorage.key(index);if(!key?.startsWith('ten-strong-draft-d'))continue;const draft=JSON.parse(localStorage.getItem(key)??'{}');draft.elapsed=600;draft.activeSeconds=600;draft.finisherRemaining=0;draft.finishing=true;draft.startedAt=Date.now();localStorage.setItem(key,JSON.stringify(draft))}})
  await page.reload()
  await page.getByRole('button',{name:/Complete today/}).click()
}

test('onboards, completes Day 1, and restores history after refresh', async ({ page }) => {
  await completeOnboarding(page,'10, 15, 25')
  await expect(page.getByRole('heading',{ name:'Starting point' })).toBeVisible()
  await expect(page.getByText(/After coffee · morning/)).toBeVisible()
  await page.getByRole('button',{ name:/Start today's workout/ }).click()
  await page.getByRole('button',{ name:'Start the assessment' }).click()
  await expect(page.getByRole('heading',{ name:'Movement Primer' })).toBeVisible()
  await page.getByRole('button',{ name:/Start timer/ }).last().click()
  await page.getByRole('button',{ name:/Complete set/ }).click()
  await expect(page.getByRole('heading',{ name:'Incline Push-up' })).toBeVisible()
  for (let index=0;index<3;index+=1) await page.getByRole('button',{ name:/Complete set/ }).click()
  await page.getByRole('button',{ name:/Start timer/ }).last().click()
  await page.getByRole('button',{ name:/Finish/ }).click()
  await finishTenMinutePractice(page)
  await expect(page.getByRole('heading',{ name:'Today is in the books.' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading',{ name:'Today is in the books.' })).toBeVisible()
})

test('pain overrides the workout and the layout does not overflow a phone viewport', async ({ page }) => {
  await completeOnboarding(page)
  await page.getByRole('button',{ name:/Start today's workout/ }).click()
  await expect(page.getByRole('dialog',{name:'How are you arriving?'})).toBeVisible()
  await page.getByRole('radiogroup',{name:/Pain beyond normal muscle effort/}).getByRole('radio',{ name:'Yes' }).click()
  await page.getByRole('button',{ name:'View safety guidance' }).click()
  await expect(page.getByRole('heading',{ name:'Stop and check the symptom.' })).toBeVisible()
  const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}))
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client)
  await page.getByRole('button',{name:'Log safety stop for today'}).click()
  await expect(page.getByRole('heading',{name:'Safety stop logged'})).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading',{name:'Safety stop logged'})).toBeVisible()
})

test('onboarding blocks empty submits and reads messy dumbbell input', async ({ page }) => {
  await page.getByRole('button',{ name:'Begin my challenge' }).click()
  await expect(page.getByText('Enter your current weight in pounds (80–500).')).toBeVisible()
  await page.getByLabel('Current weight (lb)').fill('165')
  await page.getByLabel('Height').fill(`5'10"`)
  await page.getByLabel('Dumbbell weights in pounds optional').fill('10lb 15 and 25')
  await expect(page.getByText(/We read: 10, 15, 25 lb/)).toBeVisible()
  await page.getByRole('button',{ name:'Begin my challenge' }).click()
  await expect(page.getByRole('heading',{ name:'Starting point' })).toBeVisible()
})

test('onboarding and Today have no automatically detectable WCAG A/AA violations', async ({ page }) => {
  const onboarding=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()
  expect(onboarding.violations).toEqual([])
  await completeOnboarding(page)
  const today=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()
  expect(today.violations).toEqual([])
  await page.getByRole('button',{name:/Start today's workout/}).click()
  await page.getByRole('button',{name:'Start the assessment'}).click()
  const workout=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()
  expect(workout.violations).toEqual([])
})

test('uses specific written guidance instead of generic exercise drawings', async ({ page }) => {
  await completeOnboarding(page)
  await page.getByRole('button',{name:/Start today's workout/}).click()
  await page.getByRole('button',{name:'Start the assessment'}).click()
  await expect(page.locator('.exercise-visual')).toHaveCount(0)
  const guide=page.getByRole('region',{name:/Written movement guide for Movement Primer/})
  await expect(guide.getByRole('heading',{name:'Set up'})).toBeVisible()
  await expect(guide.getByRole('heading',{name:'Do the motion'})).toBeVisible()
  await expect(guide.getByText('Breathe',{exact:true})).toBeVisible()
  await expect(guide.getByText('You should feel',{exact:true})).toBeVisible()
  await expect(guide.getByText(/Today’s tempo:/)).toBeVisible()
  await page.getByRole('button',{name:/Exit workout/}).click()
  await page.goto('/#/exercises')
  await expect(page.locator('.exercise-card')).toHaveCount(exercises.length)
  const libraryAccessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()
  expect(libraryAccessibility.violations).toEqual([])
})

test('resumes an in-progress workout from Today at the exact next exercise', async ({ page }) => {
  await completeOnboarding(page,'10, 15')
  await page.getByRole('button',{name:/Start today's workout/}).click()
  await page.getByRole('button',{name:'Start the assessment'}).click()
  await page.getByRole('button',{name:/Start timer/}).last().click()
  await page.getByRole('button',{name:/Complete set/}).click()
  await page.getByRole('button',{name:/Complete set/}).click()
  await expect(page.getByRole('heading',{name:'Goblet Squat'})).toBeVisible()
  await page.getByRole('button',{name:/Exit workout/}).click()
  await page.reload()
  await page.getByRole('button',{name:/Resume workout · \d+ of \d+ done/}).click()
  await expect(page.getByRole('heading',{name:'Goblet Squat'})).toBeVisible()
})

test('swaps today to a separate bodyweight queue and keeps the loaded queue safe', async ({ page }) => {
  await completeOnboarding(page,'10, 15, 25')
  await page.getByRole('button',{name:/Start today's workout/}).click()
  await page.getByRole('radio',{name:'Not today'}).click()
  await expect(page.getByText(/Bodyweight session queued/)).toBeVisible()
  await expect(page.getByText('Bodyweight Tempo Squat')).toBeVisible()
  await page.getByRole('button',{name:'Start the assessment'}).click()
  await expect(page.getByText(/Bodyweight travel session/)).toBeVisible()
  await page.getByRole('button',{name:/Start timer/}).last().click()
  await page.getByRole('button',{name:/Complete set/}).click()
  await expect(page.getByRole('heading',{name:'Wall Push-up'})).toBeVisible()
  await expect(page.getByLabel(/Weight/)).toHaveCount(0)
  await page.getByRole('button',{name:/Exit workout/}).click()
  // The abandoned bodyweight session is resumable from Today without a readiness re-check…
  await expect(page.getByRole('button',{name:/Resume workout/})).toBeVisible()
  // …and when its draft is gone, the untouched dumbbell queue comes back with equipment remembered.
  await page.evaluate(()=>{for(const key of Object.keys(localStorage))if(key.startsWith('ten-strong-draft-d'))localStorage.removeItem(key)})
  await page.reload()
  await page.getByRole('button',{name:/Start today's workout/}).click()
  await expect(page.getByRole('radiogroup',{name:'Dumbbells today?'}).getByRole('radio',{name:'Yes'})).toHaveAttribute('aria-checked','true')
  await page.getByRole('button',{name:'Start the assessment'}).click()
  await page.getByRole('button',{name:/Start timer/}).last().click()
  await page.getByRole('button',{name:/Complete set/}).click()
  await expect(page.getByRole('heading',{name:'Incline Push-up'})).toBeVisible()
})

test('keeps the daily goal at ten minutes and chooses mobility for significant soreness', async ({ page }) => {
  await completeOnboarding(page)
  await page.getByRole('button',{name:/Start today's workout/}).click()
  await expect(page.getByRole('button',{name:'5 minutes'})).toHaveCount(0)
  await page.getByRole('radio',{name:'Significant'}).click()
  await expect(page.getByText('Ten-minute mobility',{exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Start the assessment'}).click()
  await expect(page.getByText(/How does today’s comfortable range feel/)).toBeVisible()
  await expect(page.getByRole('radio',{name:'Comfortable'})).toHaveAttribute('aria-checked','true')
})

test('finishes Day 90 with the same assessment setup and a continuation plan', async ({ page }) => {
  const date=new Date(); date.setDate(date.getDate()-89)
  const local=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  const profile={label:'My 90-Day Challenge',ageRange:'30–39',height:`5'9"`,weightLb:140,trainingHistory:'Formerly athletic; detrained',activityLevel:'Mostly sedentary',dumbbells:[10,15],limitations:'',preferredTime:'Morning',habitAnchor:'After coffee',hasSturdyChair:true,startDate:local,photoReminder:false,onboardingComplete:true,soundCues:false}
  const assessments=[['incline-pushup',8,0,'Incline push-up'],['goblet-squat',10,10,'Goblet squat'],['one-arm-row',10,10,'Supported dumbbell row'],['side-plank',20,0,'Full side plank']].map(([exerciseId,value,weight,variation],index)=>({id:`a${index}`,date:local,day:1,metric:exerciseId==='side-plank'?'clean hold':'clean repetitions',value:Number(value),unit:exerciseId==='side-plank'?'seconds':'reps',exerciseId:String(exerciseId),weight:Number(weight)||undefined,variation:String(variation)}))
  const fixture=JSON.stringify({version:1,profile,sessions:[{id:'day-1',day:1,date:local,templateId:'assessment',mode:'normal',status:'completed',durationSeconds:600,activitySeconds:600,readiness:{energy:'normal',soreness:'none',pain:'none',hasDumbbells:true,availableWeight:15},sets:[]}],assessments,bodyWeights:[{date:local,weightLb:140}],lastOpenedDate:local})
  await page.addInitScript((serialized)=>localStorage.setItem('ten-strong-data-v1',serialized),fixture)
  await page.goto('/?day90=1#/today')
  await expect(page.getByRole('heading',{name:'90-day check-in'})).toBeVisible()
  await page.getByRole('button',{name:/Start today's workout/}).click()
  await page.getByRole('button',{name:'Start the assessment'}).click()
  await page.getByRole('button',{name:/Start timer/}).last().click()
  await page.getByRole('button',{name:/Complete set/}).click()
  await expect(page.getByText(/Repeat the Day 1 setup exactly/)).toBeVisible()
  for(let index=0;index<3;index+=1) await page.getByRole('button',{name:/Complete set/}).click()
  await page.getByRole('button',{name:/Start timer/}).last().click()
  await page.getByRole('button',{name:/Finish/}).click()
  await finishTenMinutePractice(page)
  await expect(page.getByRole('heading',{name:'You finished Ten Strong.'})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Keep the ten-minute anchor.'})).toBeVisible()
})

test('opens Day 91 continuation without resetting the completed challenge', async ({ page }) => {
  const date=new Date(); date.setDate(date.getDate()-90)
  const local=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  const profile={label:'My 90-Day Challenge',ageRange:'30–39',height:`5'9"`,weightLb:140,trainingHistory:'Formerly athletic; detrained',activityLevel:'Mostly sedentary',dumbbells:[10,15],limitations:'',preferredTime:'Morning',habitAnchor:'After coffee',hasSturdyChair:true,startDate:local,photoReminder:false,onboardingComplete:true,soundCues:false}
  const fixture=JSON.stringify({version:1,profile,sessions:[{id:'day-90',day:90,date:local,templateId:'final-assessment',mode:'normal',status:'completed',durationSeconds:600,readiness:{energy:'normal',soreness:'none',pain:'none',hasDumbbells:true,availableWeight:15,minutes:10},sets:[]}],assessments:[],bodyWeights:[],lastOpenedDate:local})
  await page.addInitScript((serialized)=>localStorage.setItem('ten-strong-data-v1',serialized),fixture)
  await page.goto('/?day91=1#/today')
  await expect(page.getByText(/Continue Strong · Week 1/)).toBeVisible()
  await expect(page.getByRole('heading',{name:'Hips, ankles + spine'})).toBeVisible()
  await expect(page.getByText('10 min',{exact:true})).toBeVisible()
  await expect(page.getByText(/After coffee · morning/)).toBeVisible()
})
