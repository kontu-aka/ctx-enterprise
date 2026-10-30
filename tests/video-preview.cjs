// Local preview only. GET/HEAD allowlist, byte ranges for native video seeking.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const files=new Set(['index.html','styles.css','contact-form.css',...['app','data','engine','presentation','contact-form'].map(x=>'js/'+x+'.js'),'assets/ctx-enterprise-sales-v6-r1-ginga.mp4','assets/ctx-enterprise-sales-v6-r1-poster.jpg','assets/kontu-studio-logo.png']);
const mockScript = `
window.fetch = function(input, options) {
  if (String(input) !== 'https://formspree.io/f/mqpenzan') return Promise.reject(new Error('Preview blocks network'));
  return new Promise(function(resolve, reject) {
    var timer = setTimeout(function(){ resolve(new Response(JSON.stringify({ok:true}), {status:200,headers:{'Content-Type':'application/json'}})); }, 700);
    if (options.signal) options.signal.addEventListener('abort',function(){clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));},{once:true});
  });
};
document.addEventListener('DOMContentLoaded',function(){
  document.title = '模擬送信・ローカル確認用 | ' + document.title;
  var text='【ローカル確認用・模擬送信】実際の送信・メール通知は行いません。架空情報で確認してください。';
  document.querySelector('.demo-strip').textContent=text;
  document.querySelector('.contact-dialog-note').textContent=text;
});`;

function createServer({mock=false}={}){
 return http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  const name=new URL(req.url,'http://localhost').pathname.replace(/^\/ctx-enterprise\//,'/').replace(/^\//,'')||'index.html';
  res.setHeader('Cache-Control','no-store');if(mock)res.setHeader('Content-Security-Policy',"connect-src 'none'; form-action 'none'");
  if(mock&&name==='preview-mock.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');return res.end(req.method==='HEAD'?'':mockScript);}
  if(!files.has(name)){res.writeHead(404);return res.end('Not found');}
  const filename=path.join(root,name);
  if(name.startsWith('assets/')){
   const size=fs.statSync(filename).size;res.setHeader('Content-Type',name.endsWith('.mp4')?'video/mp4':name.endsWith('.png')?'image/png':'image/jpeg');res.setHeader('Accept-Ranges','bytes');
   let start=0,end=size-1;const range=req.headers.range;
   if(range){
    const match=/^bytes=(\d*)-(\d*)$/.exec(range);
    if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':'bytes */'+size});return res.end();}
    if(!match[1])start=Math.max(0,size-Number(match[2]));else{start=Number(match[1]);if(match[2])end=Math.min(size-1,Number(match[2]));}
    if(start>=size||start>end){res.writeHead(416,{'Content-Range':'bytes */'+size});return res.end();}
    res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);res.statusCode=206;
   }
   res.setHeader('Content-Length',end-start+1);if(req.method==='HEAD')return res.end();
   const stream=fs.createReadStream(filename,{start,end});res.on('close',()=>stream.destroy());stream.pipe(res);return;
  }
  let data=fs.readFileSync(filename);if(mock&&name==='index.html')data=Buffer.from(data.toString().replace('</head>','<script src="preview-mock.js"></script></head>'));
  res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8');res.setHeader('Content-Length',data.length);res.end(req.method==='HEAD'?undefined:data);
 });
}
module.exports={createServer};
if(require.main===module){const s=createServer({mock:true});s.listen(Number(process.argv[2]||8769),'127.0.0.1',()=>console.log('MOCK ONLY http://127.0.0.1:'+s.address().port+'/ctx-enterprise/ PID '+process.pid));}
