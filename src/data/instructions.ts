import type { MovementInstructions } from '../types'

export const instructionsByExerciseId = {
  'strength-primer': {
    purpose:'Rehearse today’s movement patterns before the working sets begin.',
    setup:['Clear enough floor space to move without rushing.','Stand near a wall or sturdy support if balance is uncertain.'],
    motion:['March easily for a few breaths.','Practice two slow, unloaded repetitions of the first strength movement.','Practice two slow repetitions of the next movement, using a smaller range than the workout.','Finish with a gentle abdominal brace, then relax.'],
    breathing:'Keep breathing normally; exhale during the effort portion of each rehearsal.',
    feel:'Easy, coordinated movement. This should not create fatigue.'
  },
  'ten-minute-finish': {
    purpose:'Complete the daily movement commitment without adding another hard training block.',
    setup:['Stand near a wall with a clear patch of floor.','Choose movements that need no setup: marching, wall reaches, hinges, or supported squats.'],
    motion:['March slowly for several breaths.','Reach both hands up the wall, then lower them without shrugging.','Push the hips back into a comfortable hinge, then stand tall.','Use a shallow supported squat if it feels good; keep rotating through these motions until time ends.'],
    breathing:'Use an easy conversational breathing rhythm; never hold your breath.',
    feel:'Gentle whole-body movement that leaves you as good as or better than when it began.'
  },
  'breathing-march': {
    purpose:'Raise circulation gently while practicing posture, balance, and relaxed breathing.',
    setup:['Stand tall with feet under the hips.','Place fingertips on a wall if you want balance support.'],
    motion:['Shift your weight onto one foot without leaning.','Lift the opposite knee only as high as you can control.','Place the foot down quietly and repeat on the other side.','Continue at a slow, even rhythm.'],
    breathing:'Breathe continuously and make one slightly longer exhale every three or four steps.',
    feel:'Light work through the hips and trunk, with steady balance and no breathlessness.'
  },
  'cat-cow-flow': {
    purpose:'Move the spine gently between flexion and extension without forcing either end position.',
    setup:['Start on hands and knees, hands under shoulders and knees under hips.','Keep elbows soft and spread your fingers; use the standing regression if wrists or knees object.'],
    motion:['Exhale and gently tuck the tailbone, letting the middle back round toward the ceiling.','Allow the head to follow the curve without pulling the chin hard into the chest.','Inhale and slowly reverse: tip the pelvis, lengthen the chest forward, and let the abdomen soften.','Flow between the two shapes one spinal segment at a time.'],
    breathing:'Exhale while rounding; inhale while lengthening into the open position.',
    feel:'A smooth, comfortable motion along the spine—not a strong stretch or pinch.'
  },
  'wall-slide-flow': {
    purpose:'Practice upward shoulder motion while keeping the ribs and neck controlled.',
    setup:['Stand with your back or forearms near a wall and feet a small step forward.','Set the ribs over the pelvis; hands begin around shoulder height.'],
    motion:['Gently press the forearms toward the wall without forcing contact.','Slide the arms upward only as far as the ribs stay quiet and shoulders do not pinch.','Reach slightly upward at the top without shrugging toward the ears.','Lower along the same path to shoulder height.'],
    breathing:'Exhale during the upward slide; inhale as the arms return.',
    feel:'Muscles around the shoulder blades and upper back working, with a comfortable shoulder path.'
  },
  'hip-switch-flow': {
    purpose:'Rotate both hips through a comfortable seated range with active control.',
    setup:['Sit with knees bent, feet wider than hip width, and hands on the floor behind you.','Sit on a folded towel if that makes it easier to stay tall.'],
    motion:['Keeping both feet in place, let both knees travel slowly toward one side.','Stop before either hip or knee feels pinched or forced.','Press lightly through the feet and bring both knees back through center.','Continue to the other side; switch your leading side halfway through the block.'],
    breathing:'Exhale as the knees lower; inhale while passing through center.',
    feel:'Gentle rotation around the hips, not twisting pressure in the knees.'
  },
  'supported-squat-flow': {
    purpose:'Explore comfortable squat depth while using support to keep the feet and knees organized.',
    setup:['Face a sturdy support and hold it lightly with both hands.','Place feet about shoulder width, toes turned out only as much as feels natural.'],
    motion:['Bend the knees and send the hips down between the feet.','Keep the heel, base of the big toe, and base of the little toe grounded.','Pause at a comfortable depth for one calm breath.','Push the floor away and stand tall without pulling yourself up with the hands.'],
    breathing:'Inhale on the way down; exhale as you stand.',
    feel:'Legs and hips sharing the work, with stable feet and no joint pinch.'
  },
  'hip-flexor-reach': {
    purpose:'Open the front of the trailing hip while keeping the low back controlled.',
    setup:['Use a short split stance or half-kneeling position beside a wall.','If kneeling, pad the down knee; lightly squeeze that side’s glute.'],
    motion:['Gently tuck the pelvis as though bringing the belt buckle upward.','Shift the body forward a few centimeters without arching the low back.','Reach the arm on the kneeling or trailing-leg side overhead.','Add a small side bend away from that hip, return, and switch sides halfway.'],
    breathing:'Exhale during the tuck and reach; take a quiet breath in the comfortable end position.',
    feel:'A mild stretch across the front of the trailing hip and side of the torso.'
  },
  'ankle-rock-flow': {
    purpose:'Practice ankle bend while keeping the heel and foot firmly connected to the floor.',
    setup:['Face a wall in a short staggered stance, front foot flat.','Point the front knee in the same direction as the middle toes.'],
    motion:['Drive the front knee slowly toward the wall.','Stop before the heel lifts or the arch collapses.','Pause briefly, then move the knee back while keeping the foot planted.','Repeat smoothly and change legs halfway through the block.'],
    breathing:'Breathe normally; exhale gently as the knee travels forward.',
    feel:'A mild calf or ankle stretch with pressure distributed across the whole foot.'
  },
  'open-book-flow': {
    purpose:'Rotate the upper back while the stacked legs limit unwanted low-back movement.',
    setup:['Lie on one side with hips and knees comfortably bent and arms straight in front.','Support the head with a pillow or folded towel if needed.'],
    motion:['Keep the knees stacked and sweep the top arm toward the ceiling.','Follow the hand with your eyes as the arm continues toward the floor behind you.','Stop before the knees separate or the shoulder feels forced.','Reverse the arc to stack the hands again; switch sides halfway.'],
    breathing:'Exhale as the chest opens; inhale while returning to the start.',
    feel:'Gentle rotation through the chest and upper back, not strain in the shoulder or low back.'
  },
  'hinge-reach-flow': {
    purpose:'Link a controlled hip hinge with comfortable overhead shoulder motion.',
    setup:['Stand a short step in front of a wall, feet under hips and knees soft.','Hold the hands in front of the thighs.'],
    motion:['Push the hips backward toward the wall while the torso tips forward as one long unit.','Stop when the hamstrings tighten or before the back begins to round.','Push the floor away and bring the hips forward to stand.','Reach overhead without leaning backward, then lower the arms and repeat.'],
    breathing:'Inhale during the hinge; exhale while standing and reaching.',
    feel:'Hamstrings and glutes during the hinge, followed by an easy reach through the shoulders.'
  },
  'dead-bug-breathing': {
    purpose:'Coordinate breathing and gentle trunk control without turning mobility work into a hard set.',
    setup:['Lie on your back with knees bent and feet flat.','Let the back rest naturally; place fingertips on the lower ribs.'],
    motion:['Exhale slowly until the ribs settle toward the floor.','Maintain that quiet trunk position and lift one foot only if comfortable.','Tap that heel down softly, then return it.','Alternate sides with a small, controlled range; keep both feet down if needed.'],
    breathing:'Use a long relaxed exhale during each heel tap and inhale quietly between repetitions.',
    feel:'Low-level abdominal control while the neck, jaw, and low back stay relaxed.'
  },
  'wall-pushup': {
    purpose:'Build pressing strength with an upright angle that is easy to scale.',
    setup:['Face a wall and place hands just wider than shoulders at chest height.','Walk the feet back until the body forms one straight line from head through heels.'],
    motion:['Bend the elbows diagonally back, not straight out to the sides.','Lower the chest toward the space between the hands while the body stays rigid.','Stop at a pain-free depth before the hips sag or chin reaches forward.','Press the wall away until the elbows are straight but not forcefully locked.'],
    breathing:'Inhale while lowering; exhale as you press away.',
    feel:'Chest, triceps, and the front of the shoulders working while the trunk stays firm.'
  },
  'bodyweight-squat': {
    purpose:'Build leg strength and squat control without external load.',
    setup:['Stand with feet around shoulder width and toes in a natural direction.','Brace lightly and keep the whole foot connected to the floor.'],
    motion:['Bend the knees and hips together, sitting down between the legs.','Let the knees travel in the same direction as the toes.','Reach only the depth you can control without heels lifting or back rounding.','Push the floor away and stand tall, keeping the ribs over the pelvis.'],
    breathing:'Inhale and brace on the descent; exhale through the hardest part of standing.',
    feel:'Thighs and glutes working with balanced pressure through both feet.'
  },
  'pike-press': {
    purpose:'Train an overhead-style press using body weight and an adjustable incline.',
    setup:['Place hands on a wall, counter, or sturdy support just wider than shoulders.','Walk the feet back and push the hips behind you so the arms and torso form a long line.'],
    motion:['Keep the hips high and bend the elbows diagonally back.','Move the crown of the head toward the space between the hands.','Stop before the shoulders pinch or the trunk collapses.','Press the support away and return to long, active arms.'],
    breathing:'Inhale while lowering; exhale during the press.',
    feel:'Shoulders and triceps working, with the upper back supporting the movement.'
  },
  'prone-w': {
    purpose:'Train upper-back pulling muscles when no external load is available.',
    setup:['Lie face down with forehead on a folded towel, or stand facing a wall.','Place arms in a W shape: elbows below shoulder height and palms facing down or forward.'],
    motion:['Lengthen the back of the neck and keep the ribs resting on the floor.','Draw the shoulder blades gently down and toward each other.','Lift the hands and elbows only a small distance without raising the head or chest.','Pause across the upper back, then lower with control.'],
    breathing:'Exhale during the lift and pause; inhale while lowering.',
    feel:'Muscles between and below the shoulder blades—not the neck or low back.'
  },
  'bodyweight-split-squat': {
    purpose:'Build single-leg strength from a stable, repeatable stance.',
    setup:['Stand beside a wall with feet on two separate rails, not a tightrope.','Step one foot back and keep most of the front foot planted; use the wall lightly.'],
    motion:['Lower the back knee mostly straight toward the floor.','Allow the front knee to bend in line with the middle toes.','Stop at a controlled depth before the front heel lifts or balance changes.','Drive through the whole front foot to rise; finish all reps, then switch sides.'],
    breathing:'Inhale while lowering; exhale as you rise.',
    feel:'Front thigh and glute doing most of the work, with the rear leg assisting balance.'
  },
  'bodyweight-reverse-lunge': {
    purpose:'Build unilateral leg strength with less forward momentum than a forward lunge.',
    setup:['Stand tall with feet under the hips and a wall nearby if needed.','Shift your weight onto one foot before moving the other.'],
    motion:['Step the free foot far enough backward to create a stable split stance.','Lower both knees, directing the back knee toward the floor.','Keep the front foot rooted and front knee tracking with the toes.','Push through the front foot to step forward under control; alternate or complete one side at a time.'],
    breathing:'Inhale during the step and descent; exhale while returning to stand.',
    feel:'Front thigh and glute working without impact at the back knee.'
  },
  'tall-march': {
    purpose:'Train trunk stability and single-leg balance without a carried weight.',
    setup:['Stand tall with feet under hips and fingertips near a wall if needed.','Exhale gently to stack the ribs over the pelvis.'],
    motion:['Shift onto one foot while keeping shoulders and pelvis level.','Lift the other knee slowly without leaning away from it.','Pause briefly, then place the foot down quietly.','Repeat on the other side at a deliberate marching pace.'],
    breathing:'Keep breathing behind the brace; exhale as each knee lifts.',
    feel:'Abdominals and side hip working to prevent leaning, with quiet feet and steady balance.'
  },
  'incline-pushup': {
    purpose:'Build horizontal pressing strength at an angle matched to your current ability.',
    setup:['Use a counter, couch arm, or genuinely sturdy chair that cannot slide.','Place hands just wider than shoulders and walk feet back into one straight body line.'],
    motion:['Brace the abdomen and bend the elbows diagonally back.','Lower the chest toward the support; head, ribs, hips, and heels travel together.','Pause at a pain-free depth without resting on the support.','Press the support away until the arms are long and the shoulder blades can move naturally.'],
    breathing:'Inhale while lowering; exhale through the press.',
    feel:'Chest and triceps working while the abdomen and glutes keep the body rigid.'
  },
  'pushup': {
    purpose:'Build horizontal pressing strength with the body acting as one controlled unit.',
    setup:['Place hands slightly wider than shoulders and spread the fingers.','Extend the legs and brace the abdomen and glutes so head, ribs, hips, and heels align.'],
    motion:['Bend the elbows about halfway between the ribs and shoulders.','Lower chest and hips together toward the floor.','Stop at the deepest pain-free position you can maintain without sagging or shrugging.','Press the floor away so chest and hips rise together.'],
    breathing:'Inhale on the descent; exhale during the press.',
    feel:'Chest, triceps, and front shoulders working, with strong tension through the trunk.'
  },
  'floor-press': {
    purpose:'Train pressing strength with the floor limiting excessive shoulder extension.',
    setup:['Lie on your back with knees bent, feet flat, and one dumbbell in each hand.','Position upper arms about 30–45 degrees from the torso, wrists directly above elbows.'],
    motion:['Start with dumbbells above the chest and shoulder blades resting on the floor.','Lower under control until the backs of the upper arms touch down softly.','Pause without bouncing or relaxing the wrists.','Press the dumbbells up and slightly inward until arms are long over the chest.'],
    breathing:'Inhale while lowering; exhale as the dumbbells rise.',
    feel:'Chest and triceps working; the shoulders should feel supported, not pinched.'
  },
  'oh-press': {
    purpose:'Build single-arm overhead strength while the kneeling stance teaches trunk and hip control.',
    setup:['Kneel with one knee down and the opposite foot forward; pad the knee.','Hold the dumbbell at the shoulder on the same side as the down knee and squeeze that glute.'],
    motion:['Stack the ribs over the pelvis and keep the wrist above the elbow.','Press the dumbbell upward through a comfortable path without leaning back.','Finish with the arm long and biceps near the ear, but do not force the shoulder.','Lower the dumbbell to the shoulder under control; finish the side, then switch.'],
    breathing:'Exhale as you press; inhale while lowering.',
    feel:'Shoulder and triceps working while the glute and abdomen prevent arching or rotation.'
  },
  'one-arm-row': {
    purpose:'Build back and arm pulling strength one side at a time.',
    setup:['Place one hand on a sturdy chair or couch and step the opposite leg back.','Hold the dumbbell in the free hand with arm long; keep the spine long and hips square.'],
    motion:['Begin by letting the shoulder blade reach slightly toward the floor without rounding the back.','Pull the elbow toward the back pocket, keeping it close to the torso.','Stop before the torso twists or shoulder shrugs toward the ear.','Lower the dumbbell slowly until the arm is long again; finish the side, then switch.'],
    breathing:'Exhale during the pull; inhale through the controlled lowering.',
    feel:'Side of the upper back, shoulder blade area, and biceps—not twisting in the low back.'
  },
  'rear-delt-row': {
    purpose:'Train the rear shoulders and upper back with a deliberately light load.',
    setup:['Hold light dumbbells or bottles and hinge forward with knees soft.','Let the arms hang below the shoulders, palms facing each other.'],
    motion:['Keep the torso still and lead the elbows outward at roughly a 45–70 degree angle.','Lift until the upper arms approach the torso line; do not shrug.','Pause briefly across the upper back.','Lower the weights slowly to the hanging start position.'],
    breathing:'Exhale while rowing; inhale while lowering.',
    feel:'Rear shoulders and upper back working, with minimal neck and low-back effort.'
  },
  'goblet-squat': {
    purpose:'Build squat strength while the front-held load encourages an upright, controlled position.',
    setup:['Hold one dumbbell vertically against the chest with both hands.','Stand around shoulder width with toes in a comfortable direction and whole feet grounded.'],
    motion:['Brace gently, then bend knees and hips to sit down between the legs.','Keep the dumbbell close and guide knees in the same direction as the toes.','Stop at the deepest position you can own without heels lifting or back rounding.','Push the floor away and stand tall without leaning backward.'],
    breathing:'Inhale and brace before descending; exhale through the hardest part of standing.',
    feel:'Thighs and glutes working evenly, with the trunk firm and feet stable.'
  },
  'split-squat': {
    purpose:'Build unilateral leg strength with a fixed stance and optional balance support.',
    setup:['Stand beside a wall or chair with feet on two hip-width rails.','Step one foot back; hold dumbbells at your sides only if the unloaded version is controlled.'],
    motion:['Lower the back knee mostly straight down while keeping the torso tall.','Let the front knee bend in line with the toes and keep the entire front foot planted.','Stop before balance, heel contact, or joint comfort changes.','Drive through the front foot to rise; complete the weaker side first, then match it.'],
    breathing:'Inhale while lowering; exhale as you stand.',
    feel:'Front thigh and glute doing most of the work with no sharp pressure in either knee.'
  },
  'reverse-lunge': {
    purpose:'Build dynamic single-leg strength while stepping away from the loaded front leg.',
    setup:['Stand tall, holding dumbbells at the sides only if balance is reliable.','Create tension through the trunk before moving either foot.'],
    motion:['Step one foot backward far enough to make a stable stance.','Lower both knees, directing the back knee toward the floor rather than lunging forward.','Keep the front foot rooted and torso controlled.','Push through the front foot and bring the back foot forward quietly; repeat or alternate sides.'],
    breathing:'Inhale during the step and descent; exhale while returning to stand.',
    feel:'Front thigh and glute working, with controlled balance rather than impact.'
  },
  'rdl': {
    purpose:'Build hamstring, glute, and back strength through a controlled hip hinge.',
    setup:['Stand with dumbbells against the fronts of the thighs, feet about hip width.','Soften the knees, brace the trunk, and draw the shoulder blades gently toward the back pockets.'],
    motion:['Push the hips backward as the torso tips forward; the shins stay nearly vertical.','Slide the dumbbells close along the thighs and shins.','Stop when hamstrings strongly limit the range or before the spine changes shape.','Drive the floor away and bring the hips forward to stand tall—do not lean back.'],
    breathing:'Inhale and brace before hinging; exhale as you stand.',
    feel:'A loaded stretch in the hamstrings and strong glute work, with the back staying stable.'
  },
  'single-rdl': {
    purpose:'Build single-leg hip strength and balance without requiring unsupported stability.',
    setup:['Stand beside a wall or chair and hold it lightly.','Balance on one leg with its knee soft; hold the dumbbell in the opposite hand unless directed otherwise.'],
    motion:['Reach the free heel backward as the torso and rear leg tip together.','Keep both hip bones facing the floor and the weight close to the standing leg.','Stop before the back rounds, pelvis opens, or balance becomes the main challenge.','Push through the standing foot and squeeze that glute to return upright; then switch sides.'],
    breathing:'Inhale during the hinge; exhale as you return to standing.',
    feel:'Hamstring and glute of the standing leg, with light support used only for balance.'
  },
  'glute-bridge': {
    purpose:'Build hip-extension strength with the floor supporting the torso.',
    setup:['Lie on your back with knees bent, feet flat and about hip width.','Place feet close enough that fingertips can nearly reach the heels.'],
    motion:['Exhale, gently brace, and press through the whole foot.','Squeeze the glutes to lift the hips until shoulders, hips, and knees form a line.','Pause without flaring the ribs or arching the low back.','Lower the spine and hips under control until the pelvis returns to the floor.'],
    breathing:'Exhale during the lift; inhale while lowering.',
    feel:'Glutes doing most of the work, with some hamstring effort and no low-back compression.'
  },
  'dead-bug': {
    purpose:'Train the trunk to resist arching while the arms and legs move.',
    setup:['Lie on your back with hips and knees bent to about 90 degrees and arms above the chest.','Exhale gently until the ribs settle and the low back feels quietly supported.'],
    motion:['Slowly reach one arm overhead and the opposite leg away from you.','Stop the reach before the low back lifts or ribs flare.','Return both limbs to the start without losing the brace.','Alternate sides with deliberate control.'],
    breathing:'Exhale during each reach; inhale as the limbs return.',
    feel:'Deep abdominal work while the neck, hip flexors, and low back remain comfortable.'
  },
  'side-plank': {
    purpose:'Build lateral trunk and shoulder endurance without repeated spinal movement.',
    setup:['Lie on one side with elbow directly under shoulder and forearm pointing forward.','Stack or stagger the feet; use bent knees for the regression.'],
    motion:['Press the forearm firmly into the floor and lift the hips.','Align the back of the head, ribs, pelvis, knees, and ankles in one long line.','Keep the chest facing forward rather than rolling toward the floor or ceiling.','Hold only while breathing and alignment remain steady; lower, then switch sides.'],
    breathing:'Take small steady breaths throughout the hold; never bear down or hold your breath.',
    feel:'Side abdominals, lower-side glute, and supporting shoulder working together.'
  },
  'suitcase-carry': {
    purpose:'Train grip and trunk stability by resisting a one-sided load.',
    setup:['Hold one dumbbell or secure loaded backpack beside one thigh.','Stand tall with ribs over pelvis, shoulder relaxed, and clear walking space ahead.'],
    motion:['Walk forward with short, quiet steps.','Keep the weight beside the leg without letting it pull you sideways.','Maintain level shoulders and hips; turn carefully instead of pivoting quickly.','Set the weight down with a hinge, switch hands, and repeat.'],
    breathing:'Breathe steadily behind a light abdominal brace.',
    feel:'Grip and side abdominals working to keep you upright—not strain in the low back.'
  },
  'calf-raise': {
    purpose:'Build calf and ankle strength one side at a time.',
    setup:['Stand beside a wall or chair with fingertips resting lightly for balance.','Place weight over one foot and keep its toes spread; float the other foot.'],
    motion:['Press through the base of the big toe and rise onto the ball of the standing foot.','Keep the ankle centered rather than rolling outward.','Pause at the highest controlled position.','Lower the heel slowly through the full comfortable range; complete the side, then switch.'],
    breathing:'Exhale while rising; inhale during the slow lowering.',
    feel:'Calf and foot muscles working with the ankle tracking straight.'
  },
  'recovery-flow': {
    purpose:'Move the major joints gently and finish with less stiffness, not more fatigue.',
    setup:['Clear floor space near a wall and choose only comfortable positions.','Use a folded towel under the knees or head when helpful.'],
    motion:['Begin with slow breathing and easy marching.','Move through several cat-cow repetitions without forcing the spine.','Practice a few wall-supported hinges and wall slides.','Finish with another easy march, repeating the sequence at a relaxed pace.'],
    breathing:'Keep breathing slow and continuous; pair each motion with an unforced exhale.',
    feel:'Warm, easy motion through the whole body with no strong stretch or exertion.'
  }
} satisfies Record<string, MovementInstructions>
