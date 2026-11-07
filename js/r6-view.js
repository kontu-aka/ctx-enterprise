(function(root){
 'use strict';
 const H=root.CTX_R6_PROPOSALS;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const paragraphMarkup=text=>String(text).split(/(\r?\n[ \t]*\r?\n(?:[ \t]*\r?\n)*)/u).map((s,i)=>i%2?'<span class="copy-paragraph-gap">'+esc(s)+'</span>':esc(s)).join('');
 const field=(key,text)=>'<span class="r6-copy" data-copy-key="draft-r6-'+key+'">'+paragraphMarkup(text)+'</span>';
 const para=(key,text,cls='')=>'<p class="r6-paragraph '+cls+'">'+field(key,text)+'</p>';
 function read(key,fallback){const el=document.querySelector('#app [data-copy-key="draft-r6-'+key+'"]');if(el)return el.textContent;
  const detail={key,original:fallback,text:fallback};document.dispatchEvent(new CustomEvent('ctx-read-r6-field',{detail}));return detail.text;}
 const statusLabel=status=>({ready:'できている',partial:'一部できている',gap:'できていない',unknown:'わからない',unanswered:'未回答'})[status]||'未回答';
 function renderProposals(rows,helpers){
  const pending=rows.filter(r=>r.status!=='ready'),intro=H.intro;
  return '<div class="r6-draft r6-proposals"><div class="eyebrow">STEP 04 <span>/ 0'+root.CTX_EDITION.screenCount+'</span></div><h1>改善提案</h1><p class="page-role-description" data-copy-key="page-role-3">診断結果に合わせて、必要な対策と社内で相談する確認先の候補を表示します。</p>'+
   '<section class="flow-section"><h2>改善の進め方の提案：'+pending.length+'件</h2>'+para('proposal-explanation',intro.proposal_explanation)+para('owner-explanation',intro.owner_explanation,'r6-notice')+
   '<p class="helper">件数は「一部できている・できていない・わからない・未回答」のテーマ数です。カードは整備状況の維持・確認も含めて全9テーマを表示しています。見出しで全文と確認先を開閉できます。確認が必要なテーマは最初から開いています。</p>'+
   '<div class="plan-grid">'+rows.map((r,i)=>{const n=String(i+1).padStart(2,'0'),h=H.themes[n],key='human-proposal-'+n;
    return '<details class="proposal-card r6-human-card" data-r6-human="'+n+'" data-disclosure="'+key+'" '+helpers.opened(key,r.status!=='ready')+'>'+
     '<summary><h3>'+n+' '+field('human-'+n+'-heading',h.heading)+'</h3><span class="status-tag '+r.status+'">'+esc(statusLabel(r.status))+'</span><span class="chevron" aria-hidden="true">⌄</span></summary>'+
     '<div class="r6-human-body"><div class="proposal-copy"><p class="proposal-title">'+field('human-'+n+'-title',h.text.title)+'</p><dl><dt>改善を目指す点</dt><dd>'+para('human-'+n+'-goal',h.text.goal)+'</dd><dt>次にすること</dt><dd>'+para('human-'+n+'-actions',h.text.actions)+'</dd></dl></div><dl class="proposal-contact">'+helpers.contact(r.owner)+'</dl></div></details>';
   }).join('')+'</div></section>'+helpers.consult()+'</div>';
 }
 root.CTX_R6_VIEW={esc,paragraphMarkup,read,renderProposals,statusLabel};
})(globalThis);
