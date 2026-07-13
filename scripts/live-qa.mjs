import { chromium, webkit } from '@playwright/test'

const url=process.argv[2] ?? 'https://afinoblakeb.github.io/ten-strong/'
for (const [name,browserType] of [['chromium',chromium],['webkit',webkit]]) {
  const browser=await browserType.launch()
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})
  const page=await context.newPage()
  await page.goto(url,{waitUntil:'networkidle'})
  const heading=await page.getByRole('heading',{name:/Build practical strength/}).isVisible()
  if(!heading) throw new Error(`${name}: onboarding did not render`)
  const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,controlled:Boolean(navigator.serviceWorker?.controller)}))
  if(dimensions.scroll>dimensions.client) throw new Error(`${name}: horizontal overflow ${dimensions.scroll}/${dimensions.client}`)
  await page.evaluate(async()=>{if('serviceWorker' in navigator)await navigator.serviceWorker.ready})
  await page.reload({waitUntil:'networkidle'})
  const controlled=await page.evaluate(()=>Boolean(navigator.serviceWorker?.controller))
  if(!controlled) throw new Error(`${name}: page is not controlled by the service worker`)
  if(name==='chromium') {
    await context.setOffline(true)
    await page.reload({waitUntil:'domcontentloaded'})
    if(!await page.getByRole('heading',{name:/Build practical strength/}).isVisible()) throw new Error(`${name}: offline reload did not render`)
  } else {
    const cacheState=await page.evaluate(async()=>{const keys=await caches.keys();const requests=[];for(const key of keys){const cache=await caches.open(key);requests.push(...(await cache.keys()).map((request)=>request.url))}return {keys,requests}})
    if(!cacheState.requests.some((request)=>new URL(request).pathname.endsWith('/ten-strong/index.html'))) throw new Error(`${name}: the offline app shell was not present in Cache Storage (${JSON.stringify(cacheState)})`)
  }
  await page.screenshot({path:`/tmp/ten-strong-live-${name}.png`,fullPage:true})
  await browser.close()
  console.log(`${name}: live, mobile-width, service-worker, and offline checks passed`)
}
