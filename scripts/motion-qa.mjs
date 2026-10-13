import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const checks=[],errors=[],metrics=[];
const check=(name,ok)=>{assert.ok(ok,name);checks.push(name);};
try {
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
    const page=await browser.newPage({viewport,deviceScaleFactor:1});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:5178/');
    await page.waitForFunction(()=>window.__engineDebug?.parts===1267,null,{timeout:60000});
    const start=await page.locator('#experience').evaluate(e=>e.getBoundingClientRect().top+scrollY);
    // Deliberately reverse a large scroll change before the camera finishes it.
    const samples=await page.evaluate(async(start)=>{
      const samples=[];const beginning=performance.now();let previous=beginning;
      scrollTo({top:start+innerHeight*12*.58,behavior:'instant'});
      let reversed=false;
      await new Promise(resolve=>{
        const frame=now=>{
          if(now-beginning>950&&!reversed){scrollTo({top:start+innerHeight*12*.268,behavior:'instant'});reversed=true;}
          samples.push({dt:now-previous,position:window.__camera.position});previous=now;
          if(now-beginning<6000)requestAnimationFrame(frame);else resolve();
        };requestAnimationFrame(frame);
      });return samples;
    },start);
    await page.waitForFunction(()=>Math.abs(window.__engineDebug.progress-.268)<.0002);
    await page.waitForTimeout(1000);
    const steps=samples.slice(1).map((s,i)=>Math.hypot(...s.position.map((v,j)=>v-samples[i].position[j])));
    const timings=samples.slice(2).map(s=>s.dt).sort((a,b)=>a-b);
    metrics.push({viewport,frames:samples.length,p95FrameMs:timings[Math.floor(timings.length*.95)],maxCameraStep:Math.max(...steps)});
    check(`${viewport.width}px: camera remains finite during an interrupted transition`,samples.every(s=>s.position.every(Number.isFinite)));
    check(`${viewport.width}px: no camera teleport while reversing scroll`,Math.max(...steps)<.45);
    const labels=await page.locator('.technical-label').evaluateAll(nodes=>nodes.filter(e=>getComputedStyle(e).visibility==='visible').map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}));
    check(`${viewport.width}px: macro labels remain screen-sized and inside the viewport`,labels.length>0&&labels.every(r=>r.w<=211&&r.x>=0&&r.x+r.w<=viewport.width+1&&r.y>=0&&r.y+r.h<=viewport.height+1));
    check(`${viewport.width}px: settled macro labels do not overlap`,labels.every((a,i)=>labels.slice(i+1).every(b=>a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y)));
    await page.screenshot({path:`artifacts/revision/smooth-macro-${viewport.width}.png`});
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.waitForFunction(()=>window.__engineDebug.progress===0);
    check(`${viewport.width}px: reverse scroll restores exact assembly`,await page.evaluate(()=>Object.values(window.__engineDebug.groups).every(p=>p.every(v=>Math.abs(v)<1e-6))));
    await page.close();
  }
  check('No runtime errors during motion QA',errors.length===0);
  await fs.writeFile('artifacts/motion-qa.json',JSON.stringify({date:new Date().toISOString(),checks,errors,metrics},null,2));
  console.log(JSON.stringify({passed:checks.length,errors,metrics},null,2));
} finally {await browser.close();}
