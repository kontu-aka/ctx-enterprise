'use strict';
globalThis.CTX_FREE_UI=Object.freeze({create({esc,button}){
  const uiCopy=window.CTX_UI_COPY;
  const uiField=(key,text)=>'<span data-copy-key="ui-'+key+'">'+esc(text)+'</span>';
  function approvedParagraphs(prefix,lines){return lines.map((t,i)=>'<p>'+uiField(prefix+'-'+i,t)+'</p>').join('');}
  function freeDiagnosisCard(){
    const c=uiCopy.freeCard;
    return '<article class="diagnosis-scope-card"><h3>'+uiField('free-card-title',c.heading)+'</h3>'+approvedParagraphs('free-card-body',c.paragraphs)+'<p class="small-note">'+uiField('free-card-note',c.note)+'</p></article>';
  }
  function improvementConsult(page){
    const c=uiCopy.consultation;
    return '<section class="consult-note improvement-consult"><h2>'+uiField('consult-heading',c.heading)+'</h2>'+approvedParagraphs('consult-body',c.paragraphs)+
      (page==='review'?'<p>'+uiField('consult-review-note',c.completionNote)+'</p>':'')+
      '<div class="toolbar-buttons">'+button('open-contact-form','改善・導入について相談する →')+'</div></section>';
  }
  function freeCompletion(){
    const c=uiCopy.completion;
    return '<section class="completion-panel"><h2>'+uiField('free-end-heading',c.heading)+'</h2>'+approvedParagraphs('free-end-body',c.paragraphs)+'</section>'+
      (window.CTX_EDITION.coconalaURL?'<section class="consult-note paid-product-info"><h2>'+uiField('premium-heading',uiCopy.premium.heading)+'</h2>'+approvedParagraphs('premium-body',uiCopy.premium.paragraphs)+'<a class="button secondary" href="'+esc(window.CTX_EDITION.coconalaURL)+'" target="_blank" rel="noopener noreferrer">'+uiField('premium-link',uiCopy.premium.button)+'</a></section>':'')+
      improvementConsult('review');
  }
  function introVideoCard(){
    return `<button type="button" class="sales-video-card" data-action="open-sales-video" aria-haspopup="dialog" aria-controls="sales-video-dialog" aria-label="約57秒でわかる企業向けCTX：紹介動画を大きく表示する"><span class="video-thumbnail"><img src="assets/ctx-enterprise-sales-r5-poster.jpg" width="1280" height="720" alt="" decoding="sync"><span class="video-play-mark" aria-hidden="true">▶</span></span><span class="video-card-label">約57秒でわかる企業向けCTX</span><span class="video-card-hint">クリックして動画を開く</span></button>`;
  }
  const salesVideoDialog = document.getElementById('sales-video-dialog');
  const salesVideoPlayer = document.getElementById('sales-video-player');
  const closeSalesVideo = document.getElementById('close-sales-video');
  let videoTrigger = null;
  salesVideoDialog.addEventListener('focusin', event => {
    if (event.target.dataset.videoFocus === 'start') salesVideoPlayer.focus({ preventScroll: true });
    if (event.target.dataset.videoFocus === 'end') closeSalesVideo.focus({ preventScroll: true });
  });
  salesVideoDialog.addEventListener('close', () => {
    salesVideoPlayer.pause();
    salesVideoPlayer.removeAttribute('src');
    salesVideoPlayer.load();
    const trigger = videoTrigger;
    videoTrigger = null;
    if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', () => {
    if (salesVideoDialog.open) salesVideoDialog.close();
  });
  const contactForm = window.CTXContactForm.create({ sourceLabel: '企業向けCTX 無料AI導入診断（体験版）', endpoint: 'https://formspree.io/f/mqpenzan' });
  contactForm.mount(document.getElementById('contact-form-mount'));
  document.getElementById('close-contact').addEventListener('click', () => document.getElementById('contact-dialog').close());
  document.getElementById('contact-dialog').addEventListener('close', () => contactForm.reset());
  return {
    diagnosisCard:freeDiagnosisCard, completion:freeCompletion, consult:improvementConsult, video:introVideoCard,
    start:uiCopy.start,caption:uiCopy.start.caption,
    onAction(action,target){
      switch(action){
      case 'open-sales-video': {
        videoTrigger = target;
        if (!salesVideoPlayer.hasAttribute('src')) {
          salesVideoPlayer.poster = salesVideoPlayer.dataset.poster;
          salesVideoPlayer.src = salesVideoPlayer.dataset.src;
          salesVideoPlayer.load();
        }
        salesVideoDialog.showModal();
        salesVideoDialog.scrollTop = 0;
        closeSalesVideo.focus({ preventScroll: true });
        break;
      }
      case 'close-sales-video': salesVideoDialog.close(); break;
      case 'open-contact-form': {
        const wasOpen = document.getElementById('operator-dialog').open;
        if (wasOpen) document.getElementById('operator-dialog').close();
        contactForm.onOpen();
        const contactDialog = document.getElementById('contact-dialog');
        contactDialog.showModal();
        document.getElementById('contact-title').focus({ preventScroll: true });
        contactDialog.scrollTop = 0;
        break;
      }
      }
    }
  };
}});
