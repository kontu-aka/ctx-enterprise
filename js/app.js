(function () {
  'use strict';
  const D = window.CTX_DATA, E = window.CTX_ENGINE, P = window.CTX_PRESENTATION;
  const pages = ['start', 'assessment', 'results', 'draft', 'review'];
  document.body.dataset.edition=window.CTX_EDITION.name;
  const names = ['AI導入前の準備', 'AI導入診断', '診断結果', '改善提案', '改善内容の確認'];
  const descriptions = ['診断の内容と進め方を知る', '9つのテーマを確認', '課題と確認先を知る', '改善提案と担当者を確認する', '課題と次の行動をまとめる'];
  const state = { page: 0, max: 0, answers: {}, notice: '', disclosures: {} };
  const app = document.getElementById('app');
  let dockObserver;
  const tabSession=window.CTX_RUN_SESSION.create({
    edition:window.CTX_EDITION.name,ids:D.themes.map(t=>t.id),choices:D.choices.map(c=>c.value),pageCount:pages.length,
  });
  const recovered=tabSession.load();
  if(recovered){state.answers=recovered.answers;state.max=recovered.max;
  }
  function persistRun(){
    const ok=tabSession.save(state),note=document.getElementById('run-state-status');
    if(note)note.textContent=ok?'診断回答は同じタブの再読み込み時に復元します。タブを閉じると終了します。「最初からやり直す」で一時保存も消去します。':'このブラウザでは回答の一時保存ができません。再読み込み前に結果を手元に残してください。';
  }
  window.addEventListener('beforeunload',e=>{if(!tabSession.available&&Object.keys(state.answers).length){e.preventDefault();e.returnValue='';}});
  function updateNavigation(){
    const control=document.getElementById('mobile-progress');
    if(control){control.innerHTML='<span>'+String(state.page+1).padStart(2,'0')+' '+names[state.page]+'</span><span>'+(state.page+1)+'/'+pages.length+' <span aria-hidden="true">⌄</span></span>';control.setAttribute('aria-expanded','false');}
  }
  function installFixedActions(){
    dockObserver?.disconnect();
    const dockPages=[2];
    document.body.dataset.hasDock=String(dockPages.includes(state.page));
    document.documentElement.style.setProperty('--action-bar-height','0px');
    if(!dockPages.includes(state.page))return;
    const bar=document.createElement('aside');bar.id='fixed-actions';bar.className='fixed-actions';bar.setAttribute('aria-label','診断結果の次の操作');
    if(state.page===2){
      const next=app.querySelector('.bottom-actions [data-action="draft"]');
      bar.innerHTML='<span class="fixed-actions-label">次に改善の進め方を確認します</span>';
      if(next)bar.append(next);
    }
    app.append(bar);
    const size=()=>document.documentElement.style.setProperty('--action-bar-height',Math.ceil(bar.getBoundingClientRect().height)+'px');
    dockObserver=new ResizeObserver(size);dockObserver.observe(bar);size();
  }

  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const copyLines = value => esc(value).replace(/\n/g, '<br class="human-copy-break">');
  const button = (action, label, kind = 'primary', extra = '') => `<button type="button" class="button ${kind}" data-action="${action}" ${extra}>${label}</button>`;
  const heading = (n, title, description, role = '') => `<div class="eyebrow">STEP 0${n + 1} <span>/ 0${pages.length}</span></div><h1>${title}</h1>${role ? `<p class="page-role-description" data-copy-key="page-role-${n}">${esc(role)}</p>` : ''}<p class="lead">${description}</p>`;
  const note = (text, cls = '') => `<div class="notice ${cls}"><span aria-hidden="true">ⓘ</span><p>${text}</p></div>`;
  const freeUI=window.CTX_FREE_UI?.create({esc,button});

  // UI wording is separate from the unchanged classification/diff engine.
  const termDefinitions = [["コンテキスト", "このサイトでは、AIへ渡す情報・作業範囲・守ってほしい指示など、AIを使う前提（コンテキスト）を整理する考え方を指します。会社で決めることを整理するための体験版です。"], ["AI向け指示案", "Codex／Claude CodeなどのAIに渡す指示文のサンプルです。社内AI運用ルールは、会社が人間の従業員向けに定めるAI利用の決まりです。両者は別のものであり、このサイトのサンプルが会社の正式なルールや実際の設定になることはありません。"], ["送信前チェック（DLP）", "送信前チェックは、AIへ渡す内容に機密情報などが含まれていないか、送信する前に確かめることです。DLPは、こうした情報の外部流出を防ぐ仕組みを指します。仕組みによる見逃しもあるため、人による確認と併用します。この体験版にはDLP機能はありません。"], ["外部ツール接続の仕組み（MCP）", "外部ツール接続の仕組み（MCP）は、AIが外部の情報や道具を利用するための共通の接続方法です。コネクタなどを通じた社内文書検索・ファイル操作・外部サービスへの接続には、利用範囲と送信内容の確認が必要です。"], ["AIのメモリ機能（個人記憶）", "会話や利用者の情報を、後の会話で使うためAIサービスが保持する機能などを指します。保存の有無・削除方法・機密情報を残さない方針を、サービスごとに確認します。"], ["外部ツール・接続先", "AIが利用するファイル操作・社内文書検索・メール連携などの道具と、アクセス先のサービス・外部サイトを指します。会社が許可したものだけを使い、実際のアクセス制限も確認します。"], ["AI利用料金・API従量課金", "AIサービスの月額料金や、APIの使用量に応じて増える料金です。予算管理者が上限・通知・停止方法を検討します。草案に金額を書くだけで課金を止めることはできません。"], ["外部の不正な指示（プロンプトインジェクション）", "外部ページや文書に、AIをだまして情報を送らせるなどの指示が混ぜられることです。外部の文章を、社内の許可や実行承認として扱わない対策が必要です。"], ["監査ログ", "誰がいつ何を操作したかを確認する記録です。トラブルの原因や対応を後から確認するために使います。記録にはパスワードなどの秘密情報を残さないようにします。"], ["共有スキル", "AIが使う作業手順などをまとめ、ほかの利用者と共有するものです。配布前に内容を審査し、最新版を管理して古い手順を使わないようにします。"], ["ログ保存", "操作した日時・内容・エラーなどを、後から確認できるよう記録に残すことです。パスワードなどの秘密情報をそのまま記録せず、保存場所・閲覧する人・保存期間を決めます。"], ["基本ソフト（OS）", "WindowsやmacOSなど、パソコンを動かす基本ソフトです。AIに見せるファイルや操作を制限する設定を、管理担当者が確認します。"], ["APIキー", "サービスの機能をソフトから使うための秘密のコードです。パスワードと同じように扱い、AIへの入力や公開を避け、必要な担当者だけが保管・利用します。"]];
  // One explanation per meaning within each question, result or proposal.
  const termAliases = [["コンテキスト"], ["AI向け指示案", "AI指示案"], ["情報の外部流出を防ぐ仕組み（DLP）", "送信前チェック（DLP）", "DLP"], ["外部ツール接続の仕組み（MCP）", "MCP", "コネクタ"], ["AIのメモリ機能（個人記憶）", "AIのメモリ機能", "メモリ機能", "個人記憶"], ["外部ツール・接続先", "外部ツール", "接続先"], ["AI利用料金・API従量課金", "API従量課金", "AI利用料金", "利用料金"], ["外部の不正な指示（プロンプトインジェクション）", "プロンプトインジェクション"], ["監査ログ"], ["共有スキル"], ["ログ保存"], ["基本ソフト（OS）", "OS"], ["APIキー"]];
  const termIndex = new Map(termAliases.flatMap((words, i) => words.map(word => [word, i])));
  const termPattern = new RegExp([...termIndex.keys()].sort((a, b) => b.length - a.length).map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  const termPanel = document.getElementById('term-explanation');
  let activeTerm = null, termSequence = 0;
  function japaneseNotation(text) {
    const definitions = [
      ['DLP（送信前チェック）', '送信前チェック（DLP）'],
      ['DLP（情報の外部流出を防ぐ仕組み）', '情報の外部流出を防ぐ仕組み（DLP）'],
      ['MCP（外部ツール接続の仕組み）', '外部ツール接続の仕組み（MCP）'],
      ['AI（人工知能）', '人工知能（AI）']
    ];
    for (const [before, after] of definitions) text = text.replaceAll(before, after);
    return text;
  }
  function enhanceTerms(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return (([3,5].includes(state.page) && node.parentElement.closest('h1,h2')) || node.parentElement.closest('button,a,label,summary,pre,code,script,style,textarea,select,.term-note,.important-caution,.r6-copy')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    const scopes = new Map(), nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = japaneseNotation(node.data); termPattern.lastIndex = 0;
      const matches = [...text.matchAll(termPattern)];
      if (!matches.length) { node.data = text; continue; }
      const scope = node.parentElement.closest('.question-card,.result-card,.issue-card,.proposal-card,.draft-preview li,.screen-guide li,.three-col article,.purpose-panel,.hero-copy,.notice') || node.parentElement.closest('p,h1,h2,h3,dd,li') || root;
      if (!scopes.has(scope)) scopes.set(scope, new Set());
      const seen = scopes.get(scope), fragment = document.createDocumentFragment(); let offset = 0;
      for (const match of matches) {
        fragment.append(document.createTextNode(text.slice(offset, match.index)));
        const id = termIndex.get(match[0]);
        const word = id === 2 ? '送信前チェック（DLP）' : match[0] === 'MCP' ? '外部ツール接続の仕組み（MCP）' : match[0] === 'OS' ? '基本ソフト（OS）' : match[0];
        // This requested plain phrase remains plain, including its embedded API-key name.
        const plainRevocation = match[0] === 'APIキー' && text.slice(Math.max(0, match.index - 3), match.index + match[0].length + 4) === '権限やAPIキーの無効化';
        if (seen.has(id) || (state.page === 2 && id === 4 && text.includes('（会話の内容を覚えておく機能）')) || plainRevocation || (state.page === 0 && id === 1)) fragment.append(document.createTextNode(word));
        else {
          seen.add(id);
          const pair = [2, 11].includes(id) ? null : word.match(/^(.+)（([^（）]+)）$/);
          if (pair) fragment.append(document.createTextNode(`${pair[1]}（`));
          const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'term-trigger';
          trigger.id = `term-trigger-${++termSequence}`; trigger.dataset.term = String(id); trigger.textContent = pair ? pair[2] : word;
          trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-controls', 'term-explanation');
          fragment.append(trigger); if (pair) fragment.append(document.createTextNode('）'));
        }
        offset = match.index + match[0].length;
      }
      fragment.append(document.createTextNode(text.slice(offset))); node.replaceWith(fragment);
    }
  }
  // Only explicitly selected cautions are underlined; parentheses alone carry no style.
  function decorateSupplementNotes(root) {
    if (state.page !== 2 || document.body.dataset.copyEditing === 'true') return;
    const scope = root.querySelector('[data-copy-key="results-permissions-action-5"]');
    const sentence = '社員が使える範囲を、AIにまるごと任せないようにしましょう。';
    if (scope && !scope.querySelector('.permission-scope-caution')) {
      const walk = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT), matches = [];
      while (walk.nextNode()) if (walk.currentNode.data.includes(sentence)) matches.push(walk.currentNode);
      for (const node of matches) {
        const at = node.data.indexOf(sentence), fragment = document.createDocumentFragment();
        fragment.append(document.createTextNode(node.data.slice(0, at)));
        const mark = document.createElement('span'); mark.className = 'permission-scope-caution'; mark.textContent = sentence;
        fragment.append(mark, document.createTextNode(node.data.slice(at + sentence.length))); node.replaceWith(fragment);
      }
    }
    const field = root.querySelector('[data-copy-key="results-incident-action-10"]');
    if (!field || field.querySelector('strong')) return;
    const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    for(const node of nodes){
      if(!node.data.includes('APIキー')) continue;
      const parts=node.data.split('APIキー'),fragment=document.createDocumentFragment();
      parts.forEach((part,i)=>{if(i){const strong=document.createElement('strong');strong.textContent='APIキー';fragment.append(strong);}fragment.append(document.createTextNode(part));});node.replaceWith(fragment);
    }
  }
  function closeTerm(restoreFocus = false) {
    const trigger = activeTerm; activeTerm = null;
    if (trigger) { trigger.setAttribute('aria-expanded', 'false'); trigger.removeAttribute('aria-describedby'); }
    termPanel.hidden = true; document.body.appendChild(termPanel);
    if (restoreFocus && trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
  }
  function fitTermPanel(trigger) {
    termPanel.style.width = ''; termPanel.style.marginLeft = '';
    const host = trigger.closest('.question-card,.result-card,.proposal-card,.issue-card,.hero-copy,.purpose-panel,.draft-preview,.hero-visual') || app;
    const box = host.getBoundingClientRect();
    const left = Math.max(12, box.left + 12), right = Math.min(window.innerWidth - 12, box.right - 12);
    const width = Math.min(right - left, 28 * parseFloat(getComputedStyle(document.documentElement).fontSize));
    termPanel.style.width = `${Math.max(0, width)}px`;
    const naturalLeft = termPanel.getBoundingClientRect().left;
    const desiredLeft = Math.max(left, Math.min(trigger.getBoundingClientRect().left, right - width));
    termPanel.style.marginLeft = `${desiredLeft - naturalLeft}px`;
  }
  function toggleTerm(trigger) {
    if (activeTerm === trigger) { closeTerm(true); return; }
    closeTerm(); activeTerm = trigger;
    const [title, description] = termDefinitions[Number(trigger.dataset.term)];
    document.getElementById('term-title').textContent = title;
    document.getElementById('term-description').textContent = '';
    trigger.insertAdjacentElement('afterend', termPanel); termPanel.hidden = false;
    document.getElementById('term-description').textContent = description;
    trigger.setAttribute('aria-expanded', 'true'); trigger.setAttribute('aria-describedby', 'term-description');
    fitTermPanel(trigger); trigger.focus({ preventScroll: true }); termPanel.scrollTop = 0;
    termPanel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function pendingOverview(rows) {
    const pending = rows.filter(row => row.status !== 'ready');
    return `<section class="pending-overview" data-pending-count="${pending.length}"><h2>確認が必要なテーマ：${pending.length}件 <span>／ 全9テーマ</span></h2><p>一部整備・未整備・不明・未回答の項目です。下の一覧で、全9テーマの対策と確認先を確認できます。</p>${pending.length ? `<ul>${pending.map(row => `<li><strong>${esc(row.title)}</strong><span class="status-tag ${row.status}">${row.label}</span></li>`).join('')}</ul>` : '<p>確認が必要な回答は0件ですが、整備の申告は安全性や有効性の保証ではありません。</p>'}</section>`;
  }
  // 表示専用の提案文。診断・集計・草案・差分の計算は既存エンジンを使う。
  const guidance = {
    information: ['入力してよい情報と禁止する情報を分ける', '大切な情報を誤ってAIへ渡す可能性を減らすこと', '情報管理・契約の担当者と、利用できる情報の一覧を確認する。'],
    workspace: ['AI専用の作業場所を用意する', '必要のないファイルにAIが触れる可能性を減らすこと', '使える場所を決め、パソコンや実行環境の制限を管理担当者に確認する。'],
    secrets: ['パスワードや秘密のコードをAIから分けて保管する', '秘密情報の流出や不正利用の可能性を減らすこと', 'パスワード・APIキーの保管場所と、誰が取り出して使うかを決める。AIのメモリ機能や操作記録へ残さない手順も確認する。'],
    network: ['AIが使えるサービス・外部サイトと、AI利用料金の上限を決める', '未承認の外部送信や、予想外の利用費用を抑えること', 'AIがアクセスできるサービス・外部サイト、文書検索やメール連携などの外部ツールを確認する。AIの月額料金・API従量課金の上限と停止方法も決める。'],
    operations: ['削除・上書き・公開の前に人が確認する', '誤った削除や公開の可能性を減らすこと', '確認する担当者、変更の確認方法、元へ戻す方法を決める。AIの出力も確認する。'],
    permissions: ['利用者と管理者の役割・使える範囲を分ける', '必要以上の権限が残る状態を減らすこと', '権限を与える担当者と、異動・退職時に権限を外す担当者を確認する。'],
    policy: ['社員が守る社内AI運用ルールと、AIに渡す共有手順を管理する', '利用者ごとの判断のばらつきや、古い手順の利用を減らすこと', '社内AI運用ルールの責任者と最新版の管理方法を決める。AIに渡す共有手順は、配る前の確認担当者と更新・廃止方法も決める。'],
    incident: ['操作の記録と、トラブル時の連絡・停止手順を用意する', '異常に気づくことや対応が遅れる可能性を減らすこと', '記録する内容、連絡先、停止できる担当者を確認する。記録に秘密情報を残さない。'],
    education: ['社内AI運用ルールの更新・既読・同意・理解を確認する', 'ルールが伝わらない状態や、使い方の誤解を減らすこと', '配布・教育・既読確認の担当者と、実際の設定を確認する担当者を決める。']
  };
  const opened = (key, defaultOpen = false) => (state.disclosures[key] ?? defaultOpen) ? 'open' : '';
  function contact(owner) {
    const candidate = typeof owner === 'string' ? owner.trim() : '';
    return `<div class="contact-callout"><dt>確認先（候補）</dt><dd><strong>${candidate ? esc(candidate) : '未設定：確認先が決まっていません'}</strong><span class="contact-status">担当者は未確定です。社内で確認してください。</span></dd></div>`;
  }
  const flowTitle = (n, title) => `<div class="flow-title"><span class="flow-number">${n}</span><h2>${title}</h2></div>`;
  function rememberDisclosures() {
    app.querySelectorAll('details[data-disclosure]').forEach(el => { state.disclosures[el.dataset.disclosure] = el.open; });
  }
  function planningRows() {
    const all = E.assess(state.answers), pending = all.filter(row => row.status !== 'ready');
    return { all, pending, proposals: pending.length ? pending : all };
  }
  function reportedStatus(row) {
    if (['unknown', 'unanswered'].includes(row.status)) return '実際の整備状況は、この回答からは確認できません。担当者への確認が必要です。';
    if (row.status === 'partial') return '一部整備との回答です。不足している範囲を担当者と確認してください。';
    if (row.status === 'gap') return '未整備との回答です。必要な対応と担当者を確認してください。';
    return '整備の申告がある項目です。実際に機能するかは担当者との確認が必要です。';
  }
  function groupedCards(rows, renderCard, key, noun) {
    return `<div class="plan-grid" data-visible-count="${rows.length}">${rows.map(renderCard).join('')}</div>`;
  }
  function uncertainDetails(row, content, key) {
    return `<details class="uncertain-details" data-disclosure="${key}" ${opened(key, true)}><summary><span class="status-tag ${row.status}">${row.label}</span><span class="chevron" aria-hidden="true">⌄</span></summary>${content}</details>`;
  }
  const uncertain = row => ['unknown', 'unanswered'].includes(row.status);
  function issueSection(rows) {
    const ready = rows.all.length - rows.pending.length;
    return `<section class="flow-section">${flowTitle('1', `診断で見つかった課題：${rows.pending.length}件`)}<p class="flow-lead">回答から整理した確認事項です。会社の実際の設定や運用を調査したものではありません。</p>${rows.pending.length ? groupedCards(rows.pending, row => `<article class="issue-card"><h3>${esc(row.title)}</h3>${uncertain(row) ? uncertainDetails(row, `<p>${reportedStatus(row)}</p>`, `issue-${row.id}`) : `<span class="status-tag ${row.status}">${row.label}</span><p>${reportedStatus(row)}</p>`}</article>`, 'issues-more', '課題') : '<p class="plan-empty">未整備・一部整備・不明／未回答に該当する回答はありません。整備済みとの申告も、有効性の確認が必要です。</p>'}${ready ? `<p class="helper">整備の申告があった${ready}件も、実際に機能するかを担当者と確認してください。</p>` : ''}</section>`;
  }
  function proposalSection(rows) {
    return `<section class="flow-section">${flowTitle('2', `企業向けCTXからの改善提案：${rows.proposals.length}件`)}<p class="flow-lead">${rows.pending.length ? '課題と同じテーマに沿った検討用の提案です。会社の状況に合うか担当者と確認してください。' : '整備の申告があった対策を維持・確認するための提案です。'} 効果を検証したものではありません。</p>${groupedCards(rows.proposals, row => {
      const copy = guidance[row.id];
      const detail = `<p class="proposal-title">${esc(copy[0])}</p><dl><div><dt>改善を目指す点</dt><dd>${esc(copy[1])}</dd></div><div><dt>次にすること</dt><dd>${esc(copy[2])}</dd></div></dl>`;
      return `<article class="proposal-card"><div class="proposal-copy"><h3>${esc(row.title)}</h3>${uncertain(row) ? uncertainDetails(row, detail, `draft-proposal-${row.id}`) : `<p class="proposal-basis">${row.label}（回答上の状況）</p>${detail}`}</div><dl class="proposal-contact">${contact(row.owner)}</dl></article>`;
    }, 'draft-proposals-more', '提案')}</section>`;
  }
  // Approved display copy: fixed wording is independent of product and counts.
  const proposalOverview = count => "確認が必要な回答は全9テーマ中" + count + "件です。" + (count ? "対象の課題と提案が改善を目指す点を要約しています。詳しい手順や確認先は04で確認できます。" : "全テーマに整備の申告がありますが、有効性の確認は別途必要です。維持・確認のための提案を要約しています。");
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    try {
      const area = document.createElement('textarea');
      area.value = text; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0';
      document.body.appendChild(area); area.focus(); area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch (e) { return false; }
  }
  function saveTextFile(filename, text) {
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch (e) { return false; }
  }
  function navigate(index) { if (!Number.isInteger(index) || index < 0 || index >= pages.length) return; state.max = Math.max(state.max, index); if (location.hash === '#' + pages[index]) { state.page = index; render(); } else location.hash = pages[index]; }
  // Display copy is separate from diagnosis and instruction-generation logic.
  const startCopy = Object.freeze({
  "title": "AI導入前の準備",
  "intro": freeUI?.start.intro ?? "AIを使い始める前に会社で決めておくことを9つの質問で確認する診断です。",
  "audience": "対象：Claude Code・Codexを仕事で使う企業・個人事業主の方",
  "details": "詳しい説明はこちら",
  "differenceTitle": "ChatGPT・ClaudeとCodex・Claude Codeの違い",
  "chat": "ChatGPTとClaudeは、質問や相談ができるAIです。",
  "coding": "CodexとClaude Codeは、ファイルを読んだり、プログラムの作成や修正ができるAIです。",
  "relationshipTitle": "それぞれの関係",
  "codexTitle": "Codex：",
  "codex": "ChatGPTと同じ開発元のOpenAI（オープンエーアイ）が提供する、プログラムの作成や修正などに特化したAIです。",
  "claudeTitle": "Claude Code：",
  "claude": "Claudeと同じ開発元のAnthropic（アンソロピック）が提供する、プログラムの作成や修正などに特化したAIです。",
  "reasonTitle": "なぜ導入前の準備が必要なの？",
  "capabilities": "Claude CodeやCodexは、許可された範囲でファイルを読み書きしたり、パソコンへの命令（コマンド）を実行したりできます。",
  "preparation": "そのため、会社の大切な情報を勝手に扱ったり、必要なファイルを書き換えたりしないように、事前にルールを決めておく必要があります。",
  "diagnosis": "この診断では、会社の回答をもとに、必要な準備がどこまでできているかを整理します。",
  "note": "※実際のAIの設定や安全性を自動で調べるものではありません。",
  "outcomesTitle": "診断後に確認できるもの",
  "riskLabel": "課題",
  "riskTitle": "必要な対策を確認する",
  "riskBody": "わからないところは空欄のままでも大丈夫です。確認が必要なことと、検討したい対策をまとめます。",
  "ownerLabel": "担当者候補",
  "ownerTitle": "誰に確認すればよいかを知る",
  "ownerBody": "確認が必要なことについて、社内のどの担当者に聞けばよいかの目安を表示します。",
  "officialNote": "※この診断はOpenAI・Anthropicが提供する公式サービスではありません。",
  "guideTitle": "AI導入準備の進め方",
  "guideIntro": freeUI?.start.guideIntro ?? "診断の中身を知る"
});
  const startText = (key, emphasis = false) => `<span data-copy-key="start-${key}"${emphasis ? ' data-copy-emphasis="products"' : ''}>${emphasis ? esc(startCopy[key]).replace(/Claude Code|ChatGPT|Claude|Codex/g, word => `<strong>${word}</strong>`) : esc(startCopy[key])}</span>`;
  function startEdition(){
    return {scope:'',card:freeUI.diagnosisCard(),note:'',caption:freeUI.caption};
  }
  function start() {
    const edition=startEdition();
    return `<div class="start-heading"><div class="eyebrow">ENTERPRISE AI / START HERE</div><span class="version-tag">${esc(window.CTX_EDITION.displayName)}</span></div>
      <section class="hero"><div class="hero-copy"><h1>${startText('title')}</h1><p class="lead">${startText('intro')}</p><p class="start-audience">${startText('audience')}</p><div class="hero-actions">${button('begin', '<span data-copy-key="start-begin">AI導入診断を始める</span> <span aria-hidden="true">→</span>')}<span class="muted">9テーマ・目安5分</span></div>
      <details class="start-explanation"><summary>${startText('details')}</summary><div class="start-explanation-body">
        <section><h2>${startText('differenceTitle', true)}</h2><p>${startText('chat', true)}</p><p>${startText('coding', true)}</p></section>
        <section><h2>${startText('relationshipTitle')}</h2><h3>${startText('codexTitle')}</h3><p>${startText('codex', true)}</p><h3>${startText('claudeTitle')}</h3><p>${startText('claude', true)}</p></section>
        <section><h2>${startText('reasonTitle')}</h2><p>${startText('capabilities', true)}</p><p>${startText('preparation')}</p><p>${startText('diagnosis')}</p><p class="start-explanation-note">${startText('note')}</p></section>
      </div></details>${edition.scope}<p class="micro">登録・インストール・APIキー不要</p></div>
      ${freeUI?.video()||''}
      </section>

      ${note('<strong>自社の状況に近いものを選んで実際にお試しいただけます。</strong> 会社名や顧客情報・認証情報などの実データの入力は不要です。診断回答はこのタブのメモリ上だけで扱い、<br class="human-copy-break">外部送信・保存・AI設定への適用は行いません。')}
      <section class="journey"><div class="section-heading"><h2>${startText('outcomesTitle')}</h2></div><div class="three-col"><article><span class="feature-number">${startText('riskLabel')}</span><h3>${startText('riskTitle')}</h3><p>${startText('riskBody')}</p></article><article><span class="feature-number">${startText('ownerLabel')}</span><h3>${startText('ownerTitle')}</h3><p>${startText('ownerBody')}</p></article>${edition.card}</div></section><div class="start-disclaimers"><p class="footnote">${startText('officialNote')}</p>${edition.note}</div>
      <div class="hero-visual start-guide" aria-label="AI導入準備の進め方"><span class="mini-label">${pages.length} STEPS</span><h2>${startText('guideTitle')}</h2><ol class="screen-guide">${names.map((name, i) => `<li><span class="guide-number">${String(i + 1).padStart(2, '0')}</span><div><strong>${i === 0 ? startText('title') : name}</strong><p>${i === 0 ? startText('guideIntro') : descriptions[i]}</p></div></li>`).join('')}</ol><p class="visual-caption">${edition.caption}</p></div>
      <div class="start-bottom-actions">${button('begin', '<span data-copy-key="start-begin">AI導入診断を始める</span> <span aria-hidden="true">→</span>')}</div>
      ${freeUI?.consult('start')||''}`;
  }
  const assessmentCopy = Object.freeze({
  "title": "AI導入前の9つの質問",
  "description": "自社の状況に近いものを選んでください。判断できないときは「わからない」を選ぶか、回答せずに進めます。"
});
  const assessmentText = (key, text) => `<span data-copy-key="assessment-${key}">${esc(text)}</span>`;
  function assessment() {
    const s = E.summary(state.answers);
    return `${heading(1, assessmentText('title', assessmentCopy.title), assessmentText('description', assessmentCopy.description))}
      <div class="assessment-tools"><div class="progress-copy"><strong id="answer-count">${s.answered} <span>/ 9 回答</span></strong><div class="progress-track"><span id="answer-bar"></span></div></div><div class="sample-actions">${button('sample', '架空の回答例を入れる', 'secondary')}${button('clear-answers', '回答をクリア', 'text')}</div></div>
      <p class="helper">未回答でも結果を確認できます。未回答・「わからない」は「確認が必要」として扱います。</p>
      <div class="questions">${D.themes.map((t, i) => {
        const copy = P[t.id];
        return `<fieldset class="question-card" aria-describedby="example-${t.id}"><legend><span class="question-number">${String(i + 1).padStart(2, '0')}</span>${t.title}</legend><h2>${assessmentText(t.id + '-question', copy.question)}</h2><div class="question-example" id="example-${t.id}"><span class="example-label">考え方の例</span><p>${assessmentText(t.id + '-example', copy.example)}</p></div><div class="choices">${D.choices.map(c => `<label class="choice"><input type="radio" name="${t.id}" value="${c.value}" ${state.answers[t.id] === c.value ? 'checked' : ''}><span><strong>${assessmentText(t.id + '-answer-' + c.value, copy.answers[c.value][0])}</strong><small>${esc(copy.answers[c.value][1])}</small><span class="choice-check" aria-hidden="true">✓ 選択中</span></span></label>`).join('')}</div></fieldset>`;
      }).join('')}</div>
      <div class="bottom-actions"><span>回答は自動保存されません。</span><div>${button('back', '← スタートへ', 'secondary')}${button('results', '診断結果を見る →')}</div></div>`;
  }
  // R6 results-only copy: does not feed assessment, draft generation or review.
  const resultsCopy = {
  "information": {
    "title": "機密・顧客情報",
    "risk": [
      "渡してはいけない機密情報や顧客情報を、AIに入力したり読み込ませたりするおそれがあります。",
      "情報漏えいや、取引先との契約違反につながる可能性があります。"
    ],
    "action": [
      "AIに入力してよい情報と、入力してはいけない情報を会社で決めます。",
      "AIへ送る前に担当者が内容を確認し、必要に応じて送信前チェックの仕組みも検討します。",
      "自動チェックでは見落とす場合もあるため、人による確認も必要です。"
    ],
    "decision": [
      "AIに入力したり読み込ませたりしてよい情報と、禁止する情報を決めます。",
      "取引先との契約を確認する方法や、判断に迷ったときの相談先も決めておきます。"
    ],
    "owner": "情報管理担当者・契約担当者",
    "check": "AIに渡してよい情報の範囲、取引先との契約で禁止されている内容、送信前チェックの方法を確認します。"
  },
  "workspace": {
    "title": "AIの作業場所",
    "risk": [
      "AIが作業に必要のないフォルダまで開き、機密資料や個人情報を読み取るおそれがあります。",
      "読み取った内容がAIサービスに送られ、社外に出てしまう可能性があります。"
    ],
    "action": [
      "AI専用の作業場所を用意して、ほかのファイルに触れられないようにする",
      "AIが作業するフォルダやPCを、普段の仕事用とは分けましょう。",
      "ただし、フォルダを分けるだけでは、AIが中身を見られなくなるわけではありません。",
      "AIに見せてはいけないフォルダは、AIから開けないように設定しましょう。",
      "設定方法や確認方法がわからない場合は、パソコンの管理担当者に相談してください。"
    ],
    "decision": [
      "AIが作業してよいフォルダやPCと、アクセスしてはいけない場所を決めます。",
      "アクセス制限を設定する担当者と、本当に制限できているか確認する担当者も決めます。"
    ],
    "owner": "PC・システム管理担当者",
    "check": "AIが作業できる場所と禁止する場所を確認し、アクセスできない設定が実際に機能しているか確かめます。"
  },
  "secrets": {
    "title": "パスワード・秘密情報の管理",
    "risk": [
      "パスワードやAPIキーなどの秘密情報が、AIに読み取られたり、会話の記録やAIのメモリに残ったりするおそれがあります。",
      "外に漏れると、第三者に悪用される可能性があります。"
    ],
    "action": [
      "① パスワードやAPIキーは、AIが読み取れる場所に置かない",
      "AIが読み取れるフォルダや会話の中には置かず、別の場所で管理しましょう。使うときに誰が取り出すかも決めておきます。",
      "② 必要な情報だけ見られるようにする",
      "社員やAI用のアカウントは、仕事に必要なものだけ見たり使ったりできるように設定しましょう。使わなくなったアカウントやAPIキーは、誰がどうやって止めるかも決めておきましょう。",
      "③ AIに何を覚えさせるか決める",
      "AIの「メモリ機能（会話の内容を覚えておく機能）」に保存してよいもの・ダメなもの、消すタイミングを決めておきましょう。",
      "また、AIの操作記録にもパスワードなどの秘密情報が残らないようにしましょう。"
    ],
    "decision": [
      "パスワードやAPIキーの保管場所、使える人、不要になったときに使用を止める方法を決めます。",
      "AIのメモリや操作記録に残してはいけない情報と、保存された情報の削除を担当する人も決めます。"
    ],
    "owner": "パスワード・アカウント管理担当者",
    "check": "秘密情報の保管方法、使える人の範囲、不要なAPIキーの停止方法、AIのメモリや操作記録への保存について確認します。"
  },
  "network": {
    "title": "外部送信・通信",
    "risk": [
      "AIが許可されていない外部の送信先に情報を送ったり、読み込んだWebページやファイルに紛れ込んだ不正な指示に従って操作したりするおそれがあります。",
      "外部サービスの使いすぎなどで、思わぬ料金が発生する可能性もあります。"
    ],
    "action": [
      "① AIが接続してよいサイトやサービスを決める",
      "AIが利用してよい外部サイトやサービスと、外部に送ってよい情報を会社で決めましょう。",
      "文書検索やメール連携などの外部ツールも、つなぐ前に安全性と使える範囲を確認しましょう。",
      "AIへの文章の指示だけでなく、実際の接続設定でも、許可していない通信や操作を制限しましょう。",
      "② 外部から読み込んだ内容の不正な指示に備える",
      "AIが読み込むWebページやファイルには、AIをだまして情報を送らせたり、勝手な操作をさせたりする指示が含まれている場合があります。",
      "（AIはこうした指示を確実には見分けられません。外部から読み込んだ内容を会社の許可として扱わず、外部送信や重要な操作には担当者と確認をしましょう。）",
      "",
      "外部の内容を読み込む作業では、機密情報へのアクセスや不要な外部送信を実際の設定で制限しましょう。",
      "③ AIの利用料金の上限と止め方を決める",
      "AIサービスの月額料金や、利用量に応じて増える料金の上限を決めましょう。",
      "サービス側で上限や通知を設定できる場合は、実際に設定しておきましょう。",
      "通知だけでは自動的に利用が止まらない場合もあるため、料金が増えたときに利用を止める方法と担当者も決めておきましょう。"
    ],
    "decision": [
      "AIが接続してよいサイトやサービス、外部に送ってよい情報を決めます。",
      "新しい接続先を許可する担当者、不正な指示を見つけたときの対応、利用料金の上限と停止方法も決めます。"
    ],
    "owner": "システム管理担当者・情報管理担当者・予算管理担当者",
    "check": "AIの接続先、外部に送る情報、不正な指示への対策、利用料金の上限と停止方法を確認します。"
  },
  "operations": {
    "title": "ファイルの削除・上書き・公開",
    "risk": [
      "AIがファイルを誤って削除・上書きしたり、AIが作った内容が確認されないまま使用・公開されたりするおそれがあります。",
      "大切なデータが元に戻せなくなったり、間違った内容による損失や機密情報の流出につながったりする可能性があります。"
    ],
    "action": [
      "① ファイルを勝手に変更・削除しないようにする",
      "AIがファイルを削除・上書きする前に、対象ファイルや変更内容を担当者が確認する仕組みを用意しましょう。",
      "大量の削除や公開など、影響の大きい操作ほどしっかり確認しましょう。",
      "AIに許可する操作と、許可しない操作を決め、禁止する操作は実際の設定でも制限しましょう。",
      "作業の途中でAIに許可を求められても、禁止した操作は認めないようにしましょう。",
      "② 間違えても元に戻せるようにする",
      "大切なファイルは、AIが変更できない場所にもバックアップを保存しましょう。",
      "間違えて削除・上書きした場合に、元に戻せるか実際に試して確認しておきましょう。",
      "③ AIが作った資料を公開前に確認する",
      "AIが作った文章や資料を使用・公開する前に、担当者が内容の正確さや機密情報の有無を確認しましょう。",
      "確認していない資料が外部に送信されたり、公開されたりしないようにしましょう。"
    ],
    "decision": [
      "AIに禁止する操作と、人の確認が必要な操作を決めます。",
      "バックアップと復元の方法、AIが作った資料を使用・公開する前に内容の正確さや機密情報を確認する担当者も決めます。"
    ],
    "owner": "業務責任者・ファイル管理担当者・内容確認担当者",
    "check": "削除・上書き・公開の前に必要な確認、バックアップと復元の方法、AIが作った内容の正確さや機密情報の確認方法を確かめます。"
  },
  "permissions": {
    "title": "AIの利用者・管理者の権限",
    "risk": [
      "AIを使う人やAI用のアカウントが、仕事に関係のない情報まで見られたり、AIの設定を勝手に変えられたりするおそれがあります。",
      "異動・退職した人がAIを使い続けたり、誰が操作したか分からなくなったりする可能性があります。"
    ],
    "action": [
      "① AIを使える人と、設定を変更できる人を決める",
      "会社で利用を認めるAIと、AIを使える人を決め、一覧にして記録しておきましょう。",
      "AIを利用する人と、AIの設定を変更できる人の役割を分け、設定を変更できる人はできるだけ少なくしましょう。",
      "② 権限を与える人と見直しの時期を決める",
      "AIを使う人やAI用のアカウントを、誰が使えるようにして、誰がOKを出すかを決めましょう。",
      "また、社員が使える範囲を、AIにまるごと任せないようにしましょう。",
      "不要な権限が残っていないか、定期的に確認しましょう。",
      "③ 異動・退職した人が使えないようにする",
      "異動・退職などでAIを使う必要がなくなった人の利用権限を停止しましょう。",
      "その人専用のAI用アカウントやAPIキーも忘れずに停止しましょう。",
      "誰が確認し、いつ停止するかも決めておきましょう。"
    ],
    "decision": [
      "AIを使える人、利用できるAI、設定を変更できる人を決めます。",
      "権限を定期的に確認し、異動・退職した人が使えないようにする担当者と手順も決めます。"
    ],
    "owner": "AI利用管理担当者・部署責任者・人事担当者",
    "check": "AIを使える人と設定を変更できる人、それぞれに許可する操作、異動・退職時に利用を停止する方法を確認します。"
  },
  "policy": {
    "title": "社内ルールとAIへの作業指示",
    "risk": [
      "部署によってAIの使い方がばらばらになったり、古い作業手順や中身を確認していないAI用の作業手順（スキルなど）が使われたりするおそれがあります。",
      "会社のルールに反する操作や、作業手順に紛れた不正な指示による意図しない操作が行われる可能性があります。"
    ],
    "action": [
      "① 会社のルールとAIへの作業指示を分けて管理する",
      "AIを使う人が守る会社のルールと、AIに渡す作業指示は分けて管理しましょう。",
      "AIに「禁止」と書くだけでは、実際の操作を制限できないことにも注意しましょう。",
      "② 最新のルールと作業手順を使う",
      "会社のルールとAI用の作業手順は、確認された最新版だけを使えるように管理し、古い版は使えないようにしましょう。",
      "AI用の作業手順（スキルなど）は、使う前に担当者が中身を確認しましょう。",
      "特に外部から入手したものには、不正な指示や意図しない操作が含まれている場合があります。",
      "内容を確認するだけで安全になるとは限らないため、使える操作やアクセス先も制限しましょう。",
      "③ ルールが食い違ったときの対応を決める",
      "会社のルールとAIへの作業指示が食い違った場合は、AIも利用者も作業を止めて、担当者に確認しましょう。",
      "会社・部署・個人のルールのどれを優先するか、誰に確認するかを会社で決めておきましょう。"
    ],
    "decision": [
      "会社で守るルールと、AIに渡す作業指示を分けて管理する方法を決めます。",
      "ルールが食い違ったときの判断方法や、AI用の作業手順（スキルなど）を確認・更新する担当者も決めます。"
    ],
    "owner": "社内ルール管理担当者・AIの作業手順を管理する担当者",
    "check": "最新のルールと作業指示の管理方法、指示が食い違ったときの対応、AI用の作業手順（スキルなど）の内容確認と更新方法を確かめます。"
  },
  "incident": {
    "title": "操作記録・トラブルへの対応",
    "risk": [
      "AIの間違った操作や情報漏えいに気づくのが遅れたり、すぐに止められなかったりするおそれがあります。",
      "操作の記録が足りないと、原因や影響の範囲を調べられず、被害が広がる可能性があります。"
    ],
    "action": [
      "① AIが何をしたか記録を残す",
      "AIを使った人、操作した日時、行った操作などを後から確認できるようにしましょう。",
      "記録はAIの自己申告に頼らず、システム側で自動的に残る仕組みを使いましょう。",
      "操作記録にはパスワードなどの秘密情報を残さず、記録を見られる人と保存期間も決めましょう。",
      "② トラブルが起きたときの止め方を決める",
      "AIが間違った操作をしたり、情報漏えいが疑われたりした場合に、操作や外部への通信を止める方法を決めましょう。",
      "実際に止められるか、安全な環境で試しておきましょう。",
      "担当者への連絡方法と、問題が広がらないようにする手順も用意しましょう。",
      "③ 元に戻す方法と再開の条件を確認する",
      "問題が起きた場合に、バックアップから元に戻す方法を確認しておきましょう。",
      "（ただし、すでに外部へ漏れた情報は、ファイルを元に戻しても取り消せません。\n\n漏れた可能性のあるパスワードやAPIキーは、すぐに無効にして作り直しましょう。）",
      "",
      "個人データが漏れた場合は、法律に基づく報告や本人への連絡が必要になることもあるため、担当者が確認しましょう。",
      "原因を調べ、問題が解消されたことを確認してから利用を再開しましょう。"
    ],
    "decision": [
      "AIのどの操作を記録するか、記録を見ることができる人、保存期間を決めます。",
      "問題が起きたときの連絡先、操作の止め方、復旧方法、利用を再開する条件も決めます。"
    ],
    "owner": "操作記録の管理担当者・トラブル対応担当者",
    "check": "記録する操作、記録を見られる人と保存期間、問題発生時の連絡・停止・復旧・再開の方法を確認します。"
  },
  "education": {
    "title": "ルールの更新・周知",
    "risk": [
      "ルールを変更しても、AIを使う人に伝わっていなかったり、AIの設定に反映されていなかったりするおそれがあります。",
      "古いルールのまま、AIが使われ続ける可能性があります。"
    ],
    "action": [
      "① 新しいルールを使う人全員に伝える",
      "AIの利用ルールを変更したときは、使う人全員が新しいルールを読んで納得しているか確認し、誰がいつ同意したかを記録しましょう。",
      "必要に応じて説明や理解を確認する機会を設けましょう。",
      "② AIの設定や作業手順も新しいルールに合わせる",
      "ルールを変更したら、AIの設定や作業手順も新しい内容に合わせましょう。",
      "ルールの文書を直しただけで終わらせず、実際の設定にも反映されているか確認しましょう。",
      "③ 特別な許可や新しいAIの利用も見直す",
      "通常とは異なる特別な許可を出す場合は、理由と期限を決め、期限が来たら見直しましょう。",
      "新しいAIや作業手順を導入するときも、安全性や利用できる範囲、費用を確認しましょう。"
    ],
    "decision": [
      "ルールを変更したときに、AIを使う人全員が新しいルールを読んで納得しているか確認する方法を決めます。",
      "AIの設定に変更が反映されているか、特別な許可や新しく導入したAIをいつ見直すかも決めます。"
    ],
    "owner": "AI運用管理担当者・教育担当者・各部署の責任者",
    "check": "新しいルールが利用者に伝わり理解されているか、AIの設定にも反映されているか、特別な許可や新しいAIの利用を見直す方法を確認します。"
  }
};
  const resultsText = (key, text) => `<span data-copy-key="results-${key}"${['network-action-6', 'incident-action-10'].includes(key) ? ' class="important-caution"' : ''}>${esc(text)}</span>`;
  const resultsParagraphs = (key, lines) => {
    const isAction = key.endsWith('-action');
    let copyOpen = false, html = '';
    for (const [i, line] of lines.entries()) {
      if (!line) continue; // Keep existing copy keys and saved drafts stable.
      const tag = /^[①②③]/.test(line) || (key === 'workspace-action' && i === 0) ? 'h3' : 'p';
      if (tag === 'h3' && copyOpen) { html += '</div>'; copyOpen = false; }
      if (isAction && tag === 'p' && !copyOpen) { html += '<div class="result-action-copy">'; copyOpen = true; }
      const bold = key === 'information-action' && i < 2;
      html += `<${tag}>${bold ? '<strong>' : ''}${resultsText(key + '-' + i, line)}${bold ? '</strong>' : ''}</${tag}>`;
    }
    return html + (copyOpen ? '</div>' : '');
  };
  function results() {
    const s = E.summary(state.answers), rows = E.assess(state.answers);
    const labels = { ready: 'できている', partial: '一部できている', gap: 'できていない', unknown: 'わからない', unanswered: '未回答' };
    const rt = resultsText;
    return `${heading(2, rt('title', '診断結果：会社で確認すること'), rt('intro', '回答をもとに、次に確認すること・決めることを整理しました。'), '診断結果と、社内で状況を確認するときの担当者の例を表示します。')}
      <p class="results-intro">${rt('intro-help', '分からない場合は、社内の管理担当者や専門家に確認してください。')}</p>
      <div class="summary-grid" role="list" aria-label="9テーマの回答集計">${[['ready','できている',''],['action','一部できている・できていない','amber'],['unknown','わからない・未回答','violet']].map(([key,label,cls])=>`<article class="summary-card ${cls}" role="listitem"><span class="summary-label">${rt('summary-'+key,label)}</span><strong>${s[key]}<small>/ 9</small></strong></article>`).join('')}</div>
      ${note(rt('safety', 'これは導入準備の整理です。「安全」「法令適合」の保証や導入可否の判定は行いません。不明・未回答を利用可能の根拠にしないでください。') + ' ' + rt('ready-caution', '整備の申告があっても有効性は別途確認が必要です。'))}
      <div class="section-heading"><h2>${rt('items-heading','確認する9項目')}</h2><span class="mini-label">9 THEMES</span></div>
      <section class="results-owner-guide"><h2>${rt('owners-heading','確認する担当者と確認内容')}</h2><p>${rt('owners-help','表示している担当者は一例です。会社の状況に合わせて決めてください。1人が複数の役割を担当しても問題ありません。')}</p></section>
      <div class="result-list">${rows.map((r,i)=>{
        const c=resultsCopy[r.id];
        return `<details class="result-card" data-disclosure="result-${r.id}" ${opened('result-'+r.id,r.status !== 'ready')}><summary><span class="result-number">${String(i+1).padStart(2,'0')}</span><strong>${rt(r.id+'-title',c.title)}</strong><span class="status-tag ${r.status}">${rt('state-'+r.status,labels[r.status])}</span><span class="chevron" aria-hidden="true">⌄</span></summary><div class="result-body"><dl>
        <div><dt>${rt('risk-label','想定されるリスク')}</dt><dd>${resultsParagraphs(r.id+'-risk',c.risk)}${r.status==='ready'?`<p class="helper">${rt('ready-risk','（対策が機能していない場合の残存リスク）')}</p>`:''}</dd></div>
        <div><dt>${rt('action-label','必要な対策')}</dt><dd>${resultsParagraphs(r.id+'-action',c.action)}</dd></div>
        <div><dt>${rt('decision-label','会社で決めること')}</dt><dd>${resultsParagraphs(r.id+'-decision',c.decision)}</dd></div>
        <div><dt>${rt('owner-label','担当者の例')}</dt><dd><span class="owner">${rt(r.id+'-owner',c.owner)}</span></dd></div>
        <div><dt>${rt('check-label','確認内容')}</dt><dd><p>${rt(r.id+'-check',c.check)}</p></dd></div>
        </dl></div></details>`;
      }).join('')}</div>
      <div class="bottom-actions results-actions"><div class="results-tools">${button('print-results',rt('print-button','印刷・PDFとして保存'),'secondary')}${button('reassess',rt('back-button','← 回答を見直す'),'secondary')}</div><div class="results-next">${button('draft',rt('next-button','改善提案を見る →'))}</div></div>`;
  }
  // Expand results for print/PDF, then restore the user's disclosure state.
  let printedResults = [];
  window.addEventListener('beforeprint', () => {
    if (state.page !== 2 || printedResults.length) return;
    printedResults = [...app.querySelectorAll('.result-card')].map(el => [el, el.open]);
    printedResults.forEach(([el]) => { el.open = true; });
  });
  window.addEventListener('afterprint', () => {
    printedResults.forEach(([el, open]) => { el.open = open; }); printedResults = [];
  });
  function draft() {
    return window.CTX_R6_VIEW.renderProposals(E.assess(state.answers), {button, contact, opened, consult:()=>freeUI?.consult('draft')||''});
  }
  function summaryDocument() {
    const H=window.CTX_R6_PROPOSALS.themes,V=window.CTX_R6_VIEW;
    const themes=E.assess(state.answers).map((row,i)=>{
      const n=String(i+1).padStart(2,'0'), h=H[n];
      return {...row, heading:n+' '+h.heading, label:V.statusLabel(row.status),
        point:'改善の要点：'+V.read('human-'+n+'-title',h.text.title), ownerLine:'確認先（候補）：'+row.owner};
    });
    const pending=themes.filter(row=>row.status!=='ready').length;
    return {pending,themes,
      intro:['企業向けCTX｜改善内容の確認・まとめ','診断の回答に基づく検討用のまとめです。実際の設定や会社のルールは変更しません。','確認が必要なテーマ：'+pending+'件／全9テーマ'],
      footer:['担当者は役割の例です。会社の状況に合わせて確認してください。','詳細な進め方は04の改善提案で確認できます。','安全性や効果を保証するものではありません。']};
  }
  function summaryText() {
    const {intro,themes,footer}=summaryDocument();
    return [...intro,...themes.flatMap(r=>[r.heading+'｜'+r.label,r.point,r.ownerLine]),...footer].join('\n\n');
  }
  function summaryMarkup({intro,themes,footer}) {
    const blocks=[...intro.map((t,i)=>i===0?'<h3>'+esc(t)+'</h3>':'<p>'+esc(t)+'</p>'),
      ...themes.map(r=>'<section><h4>'+esc(r.heading+'｜'+r.label)+'</h4>\n\n<p>'+esc(r.point)+'</p>\n\n<p>'+esc(r.ownerLine)+'</p></section>'),
      ...footer.map(t=>'<p>'+esc(t)+'</p>')];
    return '<div id="summary-output" class="summary-full-text">'+blocks.join('\n\n')+'</div>';
  }
  function review() {
    const documentData=summaryDocument(), {themes,pending}=documentData;
    const item=r=>'<li><details data-summary-theme="'+r.id+'" data-disclosure="summary-theme-'+r.id+'" '+opened('summary-theme-'+r.id)+'><summary><span class="summary-theme-heading">'+esc(r.heading)+'</span><span class="status-tag '+r.status+'">'+esc(r.label)+'</span></summary><div class="summary-theme-body"><p>'+esc(r.point)+'</p><p class="small-note">'+esc(r.ownerLine)+'</p></div></details></li>';
    return heading(4,'改善内容の確認','診断で確認が必要だったテーマと、次に確認することをまとめます。詳しい手順や担当者は04で確認できます。実際の会社の設定やルールを変更する画面ではありません。','改善内容をまとめて確認できます。コピーや保存をして、社内での相談や検討に利用できます。')+
      '<section class="review-overview"><h2>'+esc(documentData.intro[2])+'</h2>'+
      (pending?'':'<p>全テーマに整備の申告があります。安全性や対策の有効性が確認できたことを意味するものではありません。</p>')+
      '<ul class="review-theme-list summary-theme-list">'+themes.map(item).join('')+'</ul>'+
      '<p class="helper">「不明・未回答」は、安全を確認できた状態として扱いません。担当者に確認するところから始めてください。</p></section>'+
      '<section class="flow-section"><h2>まとめを手元に残す</h2><p>診断結果と改善の要点・確認先を、コピー・保存して相談や社内確認に利用できます。AIに渡す指示文は含みません。</p>'+
      '<details class="document-panel summary-document" data-disclosure="summary-full" '+opened('summary-full')+'><summary>確認用まとめの全文を見る</summary>'+summaryMarkup(documentData)+'</details>'+
      '<div class="toolbar-buttons">'+button('copy-summary','まとめをコピー','secondary')+button('save-summary','まとめを保存','secondary')+button('print-results','印刷・PDF保存','secondary')+'</div></section>'+
      '<div class="bottom-actions"><div>'+button('back','← 改善提案へ','secondary')+button('reassess','回答を見直す','text')+'</div>'+
      '</div>'+(freeUI?.completion()||'')+
      '<div class="review-branding"><img src="assets/kontu-studio-logo.png" width="1448" height="1086" alt="こんつの制作室のロゴ：猫のしっぽがペンにつながるデザイン" loading="lazy" decoding="async"></div>';
  }

  function render(focus = true, preserveDisclosures = true) {
    closeTerm();
    if (preserveDisclosures) rememberDisclosures();
    document.body.dataset.page = pages[state.page];
    document.body.dataset.mobileNav='closed';
    document.getElementById('steps').innerHTML = names.map((name, i) => `<button type="button" data-step="${i}" class="step ${state.page === i ? 'active' : ''}" ${state.page === i ? 'aria-current="step"' : ''} ${i > state.max ? 'disabled' : ''}><span class="step-number">${String(i + 1).padStart(2, '0')}</span><span><strong>${state.page === 0 && i === 0 ? startText('title') : name}</strong><small>${state.page === 0 && i === 0 ? startText('guideIntro') : descriptions[i]}</small></span>${state.page === i ? '<span class="step-dot"></span>' : ''}</button>`).join('');
    app.innerHTML = (state.notice ? `<div class="notice transient" role="status"><p>${esc(state.notice)}</p></div>` : '') + [start, assessment, results, draft, review
    ][state.page]();
    if(state.page===0){
      for(const legacy of app.querySelectorAll('.notice'))if(legacy.textContent.includes('このタブのメモリ上だけ')){
        legacy.hidden=true;legacy.insertAdjacentHTML('afterend','<div class="notice run-storage-notice"><p>会社名・顧客情報・認証情報など、実データの入力は不要です。診断回答は同じタブ内に一時保存し、再読み込み時に復元します。「最初からやり直す」で一時保存も消去できます。外部送信や実際のAI設定の変更は行いません。</p></div>');
      }
    }
    if(state.page===2&&freeUI)app.insertAdjacentHTML('beforeend',freeUI.consult('results'));
    enhanceTerms(app); decorateSupplementNotes(app);
    updateNavigation(); installFixedActions(); persistRun();
    if (state.page === 1) document.getElementById('answer-bar').style.setProperty('--progress', `${E.summary(state.answers).answered / 9 * 100}%`);
    document.getElementById('steps').setAttribute('aria-label','診断の'+pages.length+'画面');
    document.title = `${names[state.page]} | ${window.CTX_EDITION.displayName} | 企業向けCTX`;
    if (focus) { app.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }
  // Local editor requests only a display refresh after editing plain text; classification is untouched.
  document.addEventListener('ctx-copy-preview', () => { if ([0, 1, 2].includes(state.page) && document.body.dataset.copyEditing === 'false') { enhanceTerms(app); decorateSupplementNotes(app); } });
  function changed() { state.notice = ''; }
  function announce(text) { document.getElementById('announcer').textContent = text; }
  document.addEventListener('click', event => {
    const term = event.target.closest('.term-trigger');
    if (term) { event.preventDefault(); toggleTerm(term); return; }
    if (event.target.closest('[data-action="close-term"]')) { closeTerm(true); return; }
    if (activeTerm && !termPanel.contains(event.target)) closeTerm();
    const sizeButton = event.target.closest('button[data-text-size]');
    if (sizeButton) {
      const size = sizeButton.dataset.textSize;
      if (!['standard', 'large', 'xlarge'].includes(size)) return;
      document.documentElement.dataset.textSize = size;
      document.querySelectorAll('button[data-text-size]').forEach(item => item.setAttribute('aria-pressed', String(item === sizeButton)));
      announce(`文字サイズを「${sizeButton.textContent}」に変更しました。回答は保持されています。`);
      return;
    }
    const step = event.target.closest('[data-step]');
    if (step && Number(step.dataset.step) <= state.max) { navigate(Number(step.dataset.step)); return; }
    const target = event.target.closest('[data-action]'); if (!target) return;
    const fromDock=Boolean(target.closest('.fixed-actions'));
    switch (target.dataset.action) {
      case 'toggle-mobile-nav': {const open=document.body.dataset.mobileNav!=='open';document.body.dataset.mobileNav=open?'open':'closed';document.getElementById('mobile-progress').setAttribute('aria-expanded',String(open));break;}
      case 'begin': navigate(1); break;
      case 'back': navigate(Math.max(0, state.page - 1)); break;
      case 'results': state.notice = ''; navigate(2); break;
      case 'draft': state.notice = ''; navigate(3); break;
      case 'review': state.notice = ''; navigate(4); break;
      case 'reassess': navigate(1); break;
      case 'sample': changed(); D.themes.forEach((t, i) => { state.answers[t.id] = D.sample[i]; }); render(false); app.querySelector('[data-action="sample"]').focus(); announce('架空の回答例を9テーマに設定しました。'); break;
      case 'clear-answers': changed(); state.answers = {}; render(false); app.querySelector('[data-action="clear-answers"]').focus(); announce('回答をクリアしました。未回答は確認が必要として扱います。'); break;
      case 'reset': document.getElementById('reset-dialog').showModal(); break;
      case 'open-operator-info': document.getElementById('operator-dialog').showModal(); break;
      default: freeUI?.onAction(target.dataset.action, target); break;
      case 'print-results': window.print(); break;
      case 'copy-summary': copyText(summaryText()).then(ok=>{state.notice=ok?'改善内容のまとめをコピーしました。':'コピーできませんでした。表示されたまとめを選択してください。';render(false);});break;
      case 'save-summary': saveTextFile('企業向けCTX_改善内容のまとめ.txt', summaryText());break;
    }
  });
  document.addEventListener('keydown', event => {
    const term = event.target.closest('.term-trigger');
    if (event.key === ' ' && term) {
      event.preventDefault();
      if (!event.repeat) toggleTerm(term);
      return;
    }
    if (event.key === 'Escape' && activeTerm) { event.preventDefault(); closeTerm(true); }
  });
  window.addEventListener('resize', () => { if (activeTerm) fitTermPanel(activeTerm); });
  document.addEventListener('change', event => {
    const input = event.target;
    if (input.matches('input[type="radio"]')) {
      changed(); state.answers[input.name] = input.value; persistRun();
      const s = E.summary(state.answers);
      document.getElementById('answer-count').innerHTML = `${s.answered} <span>/ 9 回答</span>`;
      document.getElementById('answer-bar').style.setProperty('--progress', `${s.answered / 9 * 100}%`);
      if (state.notice) announce(state.notice);
    }
  });
  const dialog = document.getElementById('reset-dialog');
  document.getElementById('cancel-reset').addEventListener('click', () => dialog.close());
  document.getElementById('confirm-reset').addEventListener('click', () => {
    tabSession.clear();
    dialog.close(); state.answers = {};
    state.notice = ''; state.max = 0; state.page = 0; state.disclosures = {};
    location.hash = 'start'; render(true, false);
    announce('すべての回答を消去しました。');
  });
  document.getElementById('close-operator').addEventListener('click', () => document.getElementById('operator-dialog').close());
  function readRoute(focus = true) {
    const requested = pages.indexOf(location.hash.slice(1));
    if (requested >= 0) { state.page = requested; state.max = Math.max(state.max, requested); }
    else { state.page = 0; history.replaceState(null, '', '#start'); }
    render(focus);
  }
  window.addEventListener('hashchange', () => readRoute());
  readRoute(false);
})();
