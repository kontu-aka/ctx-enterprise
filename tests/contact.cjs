const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {createServer}=require('./video-preview.cjs');
const endpoint='https://formspree.io/f/mqpenzan';
const evidence=process.env.CONTACT_TEST_EVIDENCE||fs.mkdtempSync(path.join(require('node:os').tmpdir(),'ctx-contact-'));fs.mkdirSync(evidence,{recursive:true});
const report=[];let browser,server,base;let externalForwarded=0;
async function check(name,fn){await fn();report.push(name);console.log('PASS '+name);}
async function setup(handler, width=1280){
 const context=await browser.newContext({viewport:{width,height:900}});const requests=[],errors=[];
 await context.route('**/*',async route=>{
  const req=route.request();
  if(req.url().startsWith(base))return route.continue();
  if(req.url()===endpoint){requests.push(req);return handler?handler(route):route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:'{"ok":true}'});}
  await route.abort();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(6000);
 await page.clock.install();await page.goto(base+'ctx-enterprise/');
 async function open(){await page.locator('footer [data-action="open-operator-info"]').click();await page.locator('#operator-dialog [data-action="open-contact-form"]').click();}
 await open();
 async function fill(){await page.locator('#scf-company').fill('架空テスト社');await page.locator('#scf-name').fill('テスト担当');await page.locator('#scf-email').fill('test@example.com');await page.locator('#scf-message').fill('架空情報による問い合わせ動作の確認です。');}
 async function send(){await page.clock.runFor(2600);await page.locator('#scf-submit').click();}
 async function state(value){await page.waitForFunction(v=>document.querySelector('#scf-status').dataset.state===v,value);}
 return {context,page,requests,errors,open,fill,send,state};
}
(async()=>{
 server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}/`;
 browser=await chromium.launch({channel:'chrome',headless:true});
 await check('Diagnosis engine unchanged; classification contract matches published baseline',async()=>{ require('./diagnosis-compat.cjs').assertDiagnosisContract(path.resolve(__dirname,'..')); });
 await check('Empty, malformed email, short message, overlong values: no request',async()=>{
  const t=await setup();await t.page.locator('#scf-submit').click();assert.equal(await t.page.locator('[aria-invalid="true"]').count(),3);
  await t.fill();await t.page.locator('#scf-email').fill('invalid');await t.page.locator('#scf-message').fill('短い');await t.send();assert.equal(await t.page.locator('[aria-invalid="true"]').count(),2);
  await t.fill();await t.page.locator('#scf-name').evaluate(e=>e.value='あ'.repeat(61));await t.send();assert.equal(await t.page.locator('#scf-name').getAttribute('aria-invalid'),'true');assert.equal(t.requests.length,0);await t.context.close();
 });
 await check('Honeypot and minimum fill time prevent sending',async()=>{
  const t=await setup();await t.fill();await t.page.locator('#scf-submit').click();assert.equal(t.requests.length,0);
  await t.page.locator('#scf-website').evaluate(e=>e.value='bot');await t.send();assert.equal(t.requests.length,0);assert.match(await t.page.locator('#scf-status').innerText(),/停止/);await t.context.close();
 });
 await check('Mock acceptance: exactly five fields, fixed source, no diagnosis data; reopen cannot resend',async()=>{
  const t=await setup();await t.fill();await t.send();await t.state('sent');assert.equal(t.requests.length,1);
  const req=t.requests[0],data=Object.fromEntries(new URLSearchParams(req.postData()));assert.deepEqual(Object.keys(data).sort(),['company','email','message','name','source']);assert.equal(data.source,'企業向けCTX 無料AI導入診断（体験版）');assert.equal(req.method(),'POST');assert.equal(req.headers().accept,'application/json');assert.equal(req.headers().cookie,undefined);
  assert.equal(await t.page.locator('#scf-email').inputValue(),'');await t.page.locator('#close-contact').click();await t.open();assert.ok(await t.page.locator('#scf-submit').isDisabled());assert.match(await t.page.locator('#scf-status').innerText(),/受け付けました/);await t.page.locator('.scf-form').evaluate(e=>e.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})));assert.equal(t.requests.length,1);await t.context.close();
 });
 await check('Double submit and close/reopen during pending keep one request',async()=>{
  let pending;const t=await setup(route=>{pending=route;});await t.fill();await t.send();await t.state('pending');
  await t.page.locator('.scf-form').evaluate(e=>{for(let i=0;i<5;i++)e.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));});
  await t.page.locator('#close-contact').click();await t.open();assert.ok(await t.page.locator('#scf-submit').isDisabled());assert.equal(t.requests.length,1);
  await pending.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});await t.state('sent');await t.context.close();
 });
 for(const code of [400,403,422,429,500])await check('HTTP '+code+' is not success; no automatic retry',async()=>{
  const t=await setup(route=>route.fulfill({status:code,contentType:'application/json',body:'{"errors":[{"message":"<img src=x onerror=alert(1)>"}]}'}));await t.fill();await t.send();await t.state('error');await t.page.clock.runFor(20000);assert.equal(t.requests.length,1);assert.equal(await t.page.locator('#scf-status img').count(),0);assert.equal(await t.page.locator('#scf-email').inputValue(),'test@example.com');await t.context.close();
 });
 await check('Network failure: unknown outcome; reopen preserves resend lock',async()=>{
  const t=await setup(route=>route.abort('failed'));await t.fill();await t.send();await t.state('unknown');await t.page.locator('#close-contact').click();await t.open();assert.ok(await t.page.locator('#scf-submit').isDisabled());await t.page.clock.runFor(20000);assert.equal(t.requests.length,1);await t.context.close();
 });
 await check('15 second timeout: unknown outcome and no automatic retry',async()=>{
  const t=await setup(()=>{});await t.fill();await t.send();await t.state('pending');await t.page.clock.runFor(15100);await t.state('unknown');assert.match(await t.page.locator('#scf-status').innerText(),/タイムアウト/);await t.page.clock.runFor(30000);assert.equal(t.requests.length,1);await t.context.close();
 });
 await check('Malformed success response is not represented as accepted',async()=>{
  const t=await setup(route=>route.fulfill({status:200,contentType:'text/html',body:'<html>error</html>'}));await t.fill();await t.send();await t.state('unknown');await t.context.close();
 });
 await check('Unconfigured/unapproved endpoints are disabled and cannot send',async()=>{
  const t=await setup();await t.page.evaluate(()=>{
   for(const endpoint of [null,'https://example.com/','https://formspree.io/f/other']){
    const el=document.createElement('div');document.body.append(el);const f=window.CTXContactForm.create({endpoint,idPrefix:'test'+document.querySelectorAll('.scf-form').length});f.mount(el);
    if(!el.querySelector('[type=submit]').disabled)throw Error('not disabled');el.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}));
   }
  });assert.equal(t.requests.length,0);await t.context.close();
 });
 await check('Close before sending clears input and errors',async()=>{
  const t=await setup();await t.fill();await t.page.locator('#close-contact').click();await t.open();assert.equal(await t.page.locator('#scf-name').inputValue(),'');assert.equal(await t.page.locator('#scf-status').innerText(),'');await t.context.close();
 });
 for(const width of [1280,320])await check('Chrome '+width+'px: 3 text sizes, 5 screens, instruction samples/review/consultation/reset',async()=>{
  const t=await setup(null,width);const p=t.page;
  for(const size of ['standard','large','xlarge']){
   await p.locator('#close-contact').click();await p.locator(`[data-text-size="${size}"]`).click();await t.open();
   assert.ok(await p.locator('#contact-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  await p.locator('#contact-dialog').screenshot({path:path.join(evidence,`contact-${width}.png`)});
  await p.locator('#close-contact').click();await p.locator('[data-action="begin"]').first().click();await p.locator('fieldset').first().waitFor();assert.equal(await p.locator('fieldset').count(),9);
  await p.locator('[data-action="results"]').click();await p.locator('.result-card').first().waitFor();assert.equal(await p.locator('.result-card').count(),9);assert.match(await p.locator('.summary-grid').innerText(),/不明・未回答/);
  await p.locator('[data-action="reassess"]').click();await p.locator('[data-action="sample"]').click();await p.locator('[data-action="results"]').click();
  await p.locator('[data-action="draft"]').click();await p.locator('[data-disclosure="draft-full"] summary').click();assert.match(await p.locator('.rule-text').innerText(),/Codex/);await p.locator('[data-product="Claude Code"]').click();assert.match(await p.locator('.rule-text').innerText(),/Claude Code/);
  await p.locator('.improvement-consult [data-action="open-contact-form"]').click();assert.ok(await p.locator('#contact-dialog').evaluate(e=>e.open));assert.equal(await p.locator('#scf-message').inputValue(),'');await p.locator('#close-contact').click();assert.equal(await p.locator('#steps button').count(),5);await p.locator('[data-action="review"]').click();await p.locator('.review-overview').waitFor();assert.equal(await p.locator('#acknowledge,[data-action="approve"],[data-action="hold"]').count(),0);await p.locator('[data-disclosure="comparison"] summary').click();assert.ok(await p.locator('.diff-line.add').count()>0);
  await p.locator('[data-action="reset"]').click();await p.locator('#confirm-reset').click();await p.waitForURL('**/#start');assert.match(p.url(),/#start$/);assert.equal(t.requests.length,0);assert.deepEqual(t.errors,[]);await t.context.close();
 });
 await check('CSP rejects any other Formspree form and other host',async()=>{
  const t=await setup();const result=await t.page.evaluate(async()=>{
   const urls=['https://formspree.io/f/other','https://example.com/'];return Promise.all(urls.map(u=>fetch(u).then(()=>false,()=>true)));
  });assert.deepEqual(result,[true,true]);assert.equal(t.requests.length,0);await t.context.close();
 });
 await check('Human preview has fail-closed CSP and mock success without external requests',async()=>{
  const mock=createServer({mock:true});await new Promise(r=>mock.listen(0,'127.0.0.1',r));
  const context=await browser.newContext();let external=0;await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();external++;return route.abort();});
  const p=await context.newPage();await p.clock.install();const response=await p.goto(`http://127.0.0.1:${mock.address().port}/ctx-enterprise/`);assert.match(response.headers()['content-security-policy'],/connect-src 'none'/);
  await p.locator('footer [data-action="open-operator-info"]').click();await p.locator('#operator-dialog [data-action="open-contact-form"]').click();assert.match(await p.locator('.contact-dialog-note').innerText(),/模擬送信/);
  await p.locator('#scf-name').fill('架空担当');await p.locator('#scf-email').fill('test@example.com');await p.locator('#scf-message').fill('ローカル模擬送信の確認です。');await p.clock.runFor(2600);await p.locator('#scf-submit').click();await p.clock.runFor(800);assert.match(await p.locator('#scf-status').innerText(),/受け付けました/);assert.equal(external,0);await context.close();await new Promise(r=>mock.close(r));
 });
 console.log('ALL '+report.length+' CHECKS PASSED; all external submissions mocked/blocked.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
 fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify({passed:report.length,checks:report,success:!process.exitCode,externalForwarded},null,2));
 if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));
});
