import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:5178/');
await page.waitForFunction(()=>window.__engineDebug?.parts===1267,null,{timeout:60000});
await fs.mkdir('artifacts/revision',{recursive:true});
const start=await page.locator('#experience').evaluate(e=>e.getBoundingClientRect().top+scrollY);
for(const p of (process.argv.includes('--lab')?[.82]:[.0,.145,.235,.268,.29,.345,.435,.477,.54,.577,.637,.737,.82])) {
  await page.evaluate(({start,p})=>window.scrollTo({top:start+innerHeight*12*p,behavior:'instant'}),{start,p});
  await page.waitForFunction(target=>Math.abs(window.__engineDebug.progress-target)<.0002,p,{timeout:15000});
  await page.waitForTimeout(1500);
  await page.screenshot({path:`artifacts/revision/story-${Math.round(p*1000)}.png`});
  console.log('frame',p,await page.evaluate(()=>[window.__engineDebug.progress,window.__camera.position]));
}
await page.getByRole('button',{name:'Перейти в лабораторию',exact:false}).click();
await page.waitForTimeout(1200);
for(const assembly of [0,.12,.35,.55,.8,1]) {
  const slider=page.getByRole('slider',{name:'Степень разборки двигателя',exact:true});
  await slider.evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},assembly);
  await page.waitForFunction(target=>Math.abs(window.__engineDebug.assembly-target)<.0002,assembly,{timeout:10000});
  await page.waitForTimeout(1100);
  await page.screenshot({path:`artifacts/revision/lab-${assembly}.png`});
  console.log('assembly',assembly,await slider.inputValue(),await page.evaluate(()=>window.__engineDebug.assembly));
}
await page.getByRole('button',{name:'Рабочий цикл',exact:true}).click();
await page.waitForTimeout(2500);
await page.screenshot({path:'artifacts/revision/cycle.png'});
console.log('errors',errors);
await browser.close();
