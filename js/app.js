(function () {
  'use strict';
  const D = window.CTX_DATA, E = window.CTX_ENGINE, P = window.CTX_PRESENTATION;
  const pages = ['start', 'assessment', 'results', 'draft', 'review'];
  const names = ['スタート', 'AI導入診断', '診断結果', '改善提案・AI向け指示案', '提案内容の確認'];
  const descriptions = ['無料診断の目的を知る', '9つのテーマを確認', '自社の課題を知る・相談する', '改善のサンプルを見る・相談する', '指示案・差分を確認する'];
  const state = { page: 0, max: 0, answers: {}, product: 'Codex', options: { review: true, strict: true, budget: false }, notice: '', disclosures: {} };
  const app = document.getElementById('app');
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const copyLines = value => esc(value).replace(/\n/g, '<br class="human-copy-break">');
  const button = (action, label, kind = 'primary', extra = '') => `<button type="button" class="button ${kind}" data-action="${action}" ${extra}>${label}</button>`;
  const heading = (n, title, description) => `<div class="eyebrow">STEP 0${n + 1} <span>/ 05</span></div><h1>${title}</h1><p class="lead">${description}</p>`;
  const note = (text, cls = '') => `<div class="notice ${cls}"><span aria-hidden="true">ⓘ</span><p>${text}</p></div>`;
  const tabs = () => `<div class="product-tabs" role="group" aria-label="対象のAI">${['Codex', 'Claude Code'].map(p => `<button type="button" data-product="${p}" class="${state.product === p ? 'selected' : ''}" aria-pressed="${state.product === p}">${p}<span>向け</span></button>`).join('')}</div>`;
  const productScopeHelper = () => `<p class="helper">Codex向け・Claude Code向けの指示案サンプルは、同じ内容の製品名を入れ替えたものです（各製品提供元との提携・公認はありません）。</p>`;
  const consultNote = () => `<section class="consult-note"><h2>診断後の改善・社内AI運用ルール整備もご相談いただけます</h2><p>診断結果に応じた改善の実施や、会社ごとの社内AI運用ルールの整備についてもこんつの制作室へ有償でご相談いただけます。</p><div class="toolbar-buttons">${button('open-contact-form', 'お問い合わせフォームを開く', 'primary')}${button('open-operator-info', '運営者情報を見る', 'secondary')}</div></section>`;
  const improvementConsult = page => {
    const copy = {
      title: page === 'results' ? "診断結果をもとにAI導入・運用の改善をご相談いただけます" : "診断結果をもとに、AI導入・運用の改善をご相談いただけます",
      message: page === 'draft' ? "診断で見つかった課題に合わせて社内AI運用ルールの整備やCodex・Claude Codeなどを利用する環境の改善についてご相談いただけます。" : "診断で見つかった課題に合わせて社内AI運用ルールの整備や、Codex・Claude Codeなどを利用する環境の改善についてご相談いただけます。",
      provider: page === 'review' ? "こんつの制作室への有償相談・制作依頼の窓口です。具体的な対応範囲・費用はご相談の内容に応じて確認します。" : "こんつの制作室への有償相談・制作依頼の窓口です。具体的な対応範囲・費用は、ご相談の内容に応じて確認します。"
    };
    return `<section class="consult-note improvement-consult"><h2>${esc(copy.title)}</h2><p>${esc(copy.message)}</p><p class="consult-provider">${esc(copy.provider)}</p><h3>ご相談いただけるテーマの例</h3><ul class="consult-examples"><li>社内AI運用ルールの作成・整備</li><li>AIがアクセスできる情報やフォルダの制限</li><li>機密情報や顧客情報の取り扱いに関する対策</li><li>AI導入後の運用管理方法の検討</li></ul><div class="toolbar-buttons">${button('open-contact-form', '改善・導入について相談する <span aria-hidden="true">→</span>')}</div></section>`;
  };
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
        return ((state.page === 3 && node.parentElement.closest('h1,h2')) || node.parentElement.closest('button,a,label,summary,pre,code,script,style,textarea,select,.term-note')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
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
        if (seen.has(id) || plainRevocation) fragment.append(document.createTextNode(word));
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
  function instructionText(text) {
    return text.replace('【画面内の草案】', '【AI向け指示文のサンプル】').replaceAll('AI運用ルールの検討用たたき台', 'AI向け指示案')
      .replace('文書状態：検討用。実設定への適用なし。', '文書状態：検討用。実設定への適用なし。\n用途：会社で人が守る「社内AI運用ルール」とは別の、AIへ渡す指示の案。会社の決定内容と実設定を担当者が確認してから利用を検討する。')
      .replace('費用管理：', '費用管理（AI利用料金・API従量課金）：')
      .replace('利用上限と停止方法は検討中。', 'AI利用料金・API従量課金の上限と停止方法は検討中。');
  }
  const draftText = (product, answers, options) => japaneseNotation(instructionText(E.draft(product, answers, options)));
  const baselineText = product => japaneseNotation(instructionText(E.baseline(product)));
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
  const instructionOverview = (product, count) => esc(product) + "向け指示案の要点を対象" + count + "テーマすべて表示しています。全文には全9テーマの指示と確認先を含みます。サンプルとして確認でき、会社の正式なルールを決定・適用するものではありません。";
  const proposalOverview = count => "確認が必要な回答は全9テーマ中" + count + "件です。" + (count ? "対象の課題と提案が改善を目指す点を要約しています。詳しい手順や確認先は04で確認できます。" : "全テーマに整備の申告がありますが、有効性の確認は別途必要です。維持・確認のための提案を要約しています。");
  function rulePreview(rows) {
    return `<div class="draft-preview"><p class="flow-lead">${instructionOverview(state.product, rows.proposals.length)}</p><ul>${rows.proposals.map(row => `<li><strong>${esc(row.title)}</strong><p>${esc(row.rule)}</p></li>`).join('')}</ul></div>`;
  }
  function draftActions() {
    return `<div class="document-toolbar"><span class="muted">保存・コピーはお使いの端末内だけで行われます。外部への送信はしません。</span><div class="toolbar-buttons">${button('copy-draft', 'コピーする', 'secondary')}${button('save-draft', 'テキストファイルに保存', 'secondary')}</div></div>`;
  }
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
  function fullDraft(key) {
    return `<details class="document-panel full-rule" data-disclosure="${key}" ${opened(key)}><summary>AI向け指示案の全文を見る <span class="muted">（${esc(state.product)}・未適用のサンプル）</span></summary><pre class="rule-text" tabindex="0" aria-label="${esc(state.product)}向けAI指示案のサンプル">${esc(draftText(state.product, state.answers, state.options))}</pre>${draftActions()}</details>`;
  }
  function navigate(index) { if (!Number.isInteger(index) || index < 0 || index >= pages.length) return; state.max = Math.max(state.max, index); if (location.hash === '#' + pages[index]) { state.page = index; render(); } else location.hash = pages[index]; }
  function start() {
    return `<div class="start-heading"><div class="eyebrow">ENTERPRISE AI / START HERE</div><span class="version-tag">無料体験版</span></div>
      <section class="hero"><div class="hero-copy"><h1>AIを使い始める前に<br><em>会社で決めること</em>を<br>見える形に</h1><p class="lead">AI導入前の確認事項を9つのテーマで整理します。<br>診断結果をもとに社内AI運用ルールを検討するための材料やAIに渡す指示文の<br class="human-copy-break">サンプルを確認できます。</p><p class="purpose-summary"><strong>得られるもの：</strong>自社の課題・改善のヒント・AI向け指示案のサンプル<br><strong>体験版の範囲：</strong>実際のAI設定や会社のルールは変更しません。</p><div class="hero-actions">${button('begin', 'AI導入診断を始める <span aria-hidden="true">→</span>')}<span class="muted">9テーマ・目安5分</span></div><p class="micro">登録・インストール・APIキー不要</p></div>
      <button type="button" class="sales-video-card" data-action="open-sales-video" aria-haspopup="dialog" aria-controls="sales-video-dialog" aria-label="約57秒でわかる企業向けCTX：紹介動画を大きく表示する"><span class="video-thumbnail"><img src="assets/ctx-enterprise-sales-r5-poster.jpg" width="1280" height="720" alt="" decoding="sync"><span class="video-play-mark" aria-hidden="true">▶</span></span><span class="video-card-label">約57秒でわかる企業向けCTX</span><span class="video-card-hint">クリックして動画を開く</span></button>
      </section>
      <section class="purpose-panel"><h2>無料診断で課題を知り 改善の相談へ</h2><p>AI導入を検討している企業・個人事業主向けの無料診断です。9つのテーマから自社の課題と担当者候補を整理し、改善方法やAI向け指示案のサンプルを確認できます。<br class="human-copy-break">結果をもとにこんつの制作室への有償相談・制作依頼をご検討いただけます。<strong>実際のAI設定や会社のルールは変更しません。</strong></p></section>

      ${note('<strong>自社の状況に近いものを選んで実際にお試しいただけます。</strong> 会社名や顧客情報・認証情報などの実データの入力は不要です。診断回答はこのタブのメモリ上だけで扱い、<br class="human-copy-break">外部送信・保存・AI設定への適用は行いません。')}
      <section class="journey"><div class="section-heading"><h2>診断後に確認できるもの</h2></div><div class="three-col"><article><span class="feature-number">課題</span><h3>必要な対策を知る</h3><p>分からないことも そのままで。未確認の項目と会社で検討する対策を整理します。</p></article><article><span class="feature-number">担当者候補</span><h3>誰に確認するかを知る</h3><p>社内で確認したい役割の候補を示します。担当者が確定したことを意味しません。</p></article><article><span class="feature-number">AI向け指示案</span><h3>指示文のサンプルを持ち帰る</h3><p>Codex・Claude Codeに渡す指示文のサンプルを<br class="human-copy-break">確認し、端末にコピー・保存できます。<br class="human-copy-break">社内AI運用ルールの決定やAI設定の適用は行いません。</p></article></div></section><p class="footnote">Codex・Claude CodeなどのAIコーディング支援ツールを業務で導入する企業・個人事業主向けの検討ツールです。OpenAI社・Anthropic社など、各製品の提供元との提携・公認関係はありません。2製品の指示案サンプルは同じ検討内容の製品名を入れ替えたものであり、製品ごとに異なる安全設定が完了していることを示すものではありません。</p>
      <div class="hero-visual start-guide" aria-label="5画面の進め方"><span class="mini-label">5 STEPS</span><h2>5画面の進め方</h2><ol class="screen-guide">${names.map((name, i) => `<li><span class="guide-number">${String(i + 1).padStart(2, '0')}</span><div><strong>${name}</strong><p>${descriptions[i]}</p></div></li>`).join('')}</ol><p class="visual-caption">無料診断 → 自社の課題を把握 → 改善のサンプルを確認 → 提案内容・差分を確認 → こんつの制作室へ相談。実際のAI設定は変更しません。</p></div>
      <div class="start-bottom-actions">${button('begin', 'AI導入診断を始める <span aria-hidden="true">→</span>')}</div>
      ${consultNote()}`;
  }
  function assessment() {
    const s = E.summary(state.answers);
    return `${heading(1, 'AI導入の準備をチェック', '自社の状況に近いものを選んでください。会社名や実データの入力は不要です。判断できないときは「わからない」を選んで進めます。')}
      <div class="assessment-tools"><div class="progress-copy"><strong id="answer-count">${s.answered} <span>/ 9 回答</span></strong><div class="progress-track"><span id="answer-bar"></span></div></div><div class="sample-actions">${button('sample', '架空の回答例を入れる', 'secondary')}${button('clear-answers', '回答をクリア', 'text')}</div></div>
      <p class="helper">未回答でも結果を確認できます。未回答・「わからない」は「確認が必要」として扱います。</p>
      <div class="questions">${D.themes.map((t, i) => {
        const copy = P[t.id];
        return `<fieldset class="question-card" aria-describedby="example-${t.id}"><legend><span class="question-number">${String(i + 1).padStart(2, '0')}</span>${t.title}</legend><h2>${esc(copy.question)}</h2><div class="question-example" id="example-${t.id}"><span class="example-label">考え方の例</span><p>${esc(copy.example)}</p></div><div class="choices">${D.choices.map(c => `<label class="choice"><input type="radio" name="${t.id}" value="${c.value}" ${state.answers[t.id] === c.value ? 'checked' : ''}><span><strong>${esc(copy.answers[c.value][0])}</strong><small>${esc(copy.answers[c.value][1])}</small><span class="choice-check" aria-hidden="true">✓ 選択中</span></span></label>`).join('')}</div></fieldset>`;
      }).join('')}</div>
      <div class="bottom-actions"><span>回答は自動保存されません。</span><div>${button('back', '← スタートへ', 'secondary')}${button('results', '診断結果を見る →')}</div></div>`;
  }
  function results() {
    const s = E.summary(state.answers), rows = E.assess(state.answers);
    return `${heading(2, 'いま決めることが 見えてきました', '回答をもとに対策と社内の確認先を整理しました。整備の申告があっても有効性は別途確認が必要です。')}
      <div class="summary-grid" role="list" aria-label="9テーマの回答集計"><article class="summary-card" role="listitem"><span class="summary-label">整備の申告あり</span><strong>${s.ready}<small>/ 9</small></strong></article><article class="summary-card amber" role="listitem"><span class="summary-label">一部整備・未整備</span><strong>${s.action}<small>/ 9</small></strong></article><article class="summary-card violet" role="listitem"><span class="summary-label">不明・未回答</span><strong>${s.unknown}<small>/ 9</small></strong></article></div>
      ${note('これは導入準備の整理です。<strong>「安全」「法令適合」の保証や導入可否の判定は行いません。</strong> 不明・未回答を利用可能の根拠にしないでください。')}
      ${pendingOverview(rows)}
      <div class="section-heading"><h2>テーマ別の対策・確認先</h2><span class="mini-label">9 THEMES</span></div>
      <p class="helper">確認する担当者は一例です。小規模な会社では、同じ方が複数の役割を兼任しても構いません。</p>
      <div class="result-list">${rows.map((r, i) => `<details class="result-card" ${r.status === 'ready' ? '' : 'open'}><summary><span class="result-number">${String(i + 1).padStart(2, '0')}</span><strong>${r.title}</strong><span class="status-tag ${r.status}">${r.label}</span><span class="chevron" aria-hidden="true">⌄</span></summary><div class="result-body"><p class="next-action">${r.next}</p><dl><div><dt>想定されるリスク</dt><dd>${r.risk}${r.status === 'ready' ? '（対策が機能していない場合の残存リスク）' : ''}</dd></div><div><dt>必要な対策</dt><dd>${copyLines(r.action)}</dd></div><div><dt>会社で決めること</dt><dd>${r.decision}</dd></div><div><dt>確認する担当者</dt><dd><span class="owner">${r.owner}</span></dd></div></dl></div></details>`).join('')}</div>
      <div class="bottom-actions"><span>回答の見直しや、診断結果の印刷・PDF保存もできます。</span><div>${button('print-results', '印刷・PDFとして保存', 'secondary')}${button('reassess', '← 回答を見直す', 'secondary')}${button('draft', '改善提案を見る <span aria-hidden="true">→</span>')}</div></div>
      ${improvementConsult('results')}`;
  }
  function draft() {
    const rows = planningRows();
    return `${heading(3, '改善提案・AI向け指示案', '診断で見つかった課題に沿って、改善方法とAI向け指示案のサンプルを確認できます。社内AI運用ルールは従業員向けの決まり、AI向け指示案はCodexやClaude CodeなどのAIに渡す指示文のサンプルです。両者は別のものです。')}
      ${note('<strong>AIへ渡す文章の指示だけでは実際のアクセス制限にはなりません。</strong> AIへの禁止指示とは別に管理担当者がパソコン・実行環境・接続サービスの権限を設定し、制限が機能するか確認する必要があります。この体験版は設定ファイルを作成・変更せず、OS・AIの権限設定にも適用しません。')}
      ${issueSection(rows)}${proposalSection(rows)}
      <section class="flow-section">${flowTitle('3', 'Codex／Claude Code向け指示案')}${tabs()}${productScopeHelper()}${rulePreview(rows)}
      <details class="draft-options" data-disclosure="rule-conditions" ${opened('rule-conditions')}><summary>指示案サンプルに含める条件を確認する</summary><p>選択した内容はAI向け指示案のサンプルに反映されます。実際のAI設定は変更しません。</p>${[{ id: 'review', label: '実作業前の確認手順を含める', text: '差分・影響・復元方法の確認を追記' }, { id: 'strict', label: '高リスク操作は停止', text: '権限のある担当者への確認を追記' }, { id: 'budget', label: 'AI利用料金の上限例を追加', text: 'AIサービスの月額料金・API従量課金について、月額10,000円の検討例を追記' }].map(o => `<label class="option-row"><input type="checkbox" data-option="${o.id}" ${state.options[o.id] ? 'checked' : ''}><span><strong>${o.label}</strong><small>${o.text}</small></span></label>`).join('')}<div class="small-note">サンプルに含める文章の条件です。費用の停止や操作の制限を実行するものではありません。</div></details></section>
      <section class="flow-section">${flowTitle('4', '必要なときに、AI向け指示案の全文を確認')}${fullDraft('draft-full')}</section>
      <div class="bottom-actions"><span>指示案の全文と、診断反映前の見本との差分を次の画面で確認できます。</span><div>${button('back', '← 診断結果へ', 'secondary')}${button('review', '提案内容を確認する →')}</div></div>
      ${improvementConsult('draft')}`;
  }
  function review() {
    const rows = planningRows(), before = baselineText(state.product), after = draftText(state.product, state.answers, state.options), diff = E.diff(before, after);
    const added = diff.filter(line => line.type === 'add').length, removed = diff.filter(line => line.type === 'remove').length;
    return `${heading(4, '提案内容の確認', '04で確認した改善提案をもとに診断を反映したAI向け指示案と見本との差分を確認します。会社の実際の設定を読み込んだり、変更・適用したりする画面ではありません。')}
      <section class="review-overview"><h2>診断結果から作成した提案内容：${rows.proposals.length}テーマ</h2><p>${proposalOverview(rows.pending.length)}</p><ul class="review-theme-list">${rows.proposals.map(row => `<li><div><strong>${esc(row.title)}</strong><span class="status-tag ${row.status}">${row.label}</span></div><p>${esc(guidance[row.id][1])}</p></li>`).join('')}</ul><p class="helper">改善を目指す点の説明です。効果・安全性・法令適合を確認または保証したものではありません。</p></section>
      <section class="flow-section"><h2>AI向け指示案と変更内容</h2>${tabs()}${productScopeHelper()}<p class="helper">選択中：${esc(state.product)}。サンプルに含める条件：${[state.options.review ? '実作業前の確認手順' : '', state.options.strict ? '高リスク操作の停止' : '', state.options.budget ? 'AI利用料金の上限例' : ''].filter(Boolean).join('・') || '条件の追加なし'}。条件は04で変更できます。</p><div class="rule-review-stack">
      <details class="document-panel review-document" data-disclosure="review-after" ${opened('review-after')}><summary>診断を反映したAI向け指示案の全文 <span class="muted">（${esc(state.product)}・未適用のサンプル）</span></summary><pre class="rule-text" tabindex="0" aria-label="診断を反映したAI向け指示案">${esc(after)}</pre>${draftActions()}</details>
      <details class="document-panel review-document" data-disclosure="comparison" ${opened('comparison')}><summary>診断反映前の見本との差分 <span class="muted">（＋${added} 追加・−${removed} 削除）</span></summary><p class="comparison-context">比較元は体験版に用意された見本です。会社の実際の社内AI運用ルールやAI設定を読み込んだものではありません。差分は文章の比較であり、実際の変更や設定適用を表しません。</p><div class="diff-lines" tabindex="0" aria-label="行単位の変更差分">${diff.map(line => `<div class="diff-line ${line.type}${line.text.trim() ? '' : ' empty'}"><span aria-label="${({ add: '追加', remove: '削除', same: '同一' })[line.type]}">${({ add: '+', remove: '−', same: ' ' })[line.type]}</span><code>${esc(line.text) || ' '}</code></div>`).join('')}</div></details></div></section>
      <div class="bottom-actions"><div>${button('back', '← 改善提案・指示案へ', 'secondary')}${button('reassess', '回答を見直す', 'text')}</div>${button('reset', '最初からやり直す', 'secondary')}</div>
      ${improvementConsult('review')}
      <div class="review-branding"><img src="assets/kontu-studio-logo.png" width="1448" height="1086" alt="こんつの制作室のロゴ：猫のしっぽがペンにつながるデザイン" loading="lazy" decoding="async"></div>`;
  }
  function render(focus = true, preserveDisclosures = true) {
    closeTerm();
    if (preserveDisclosures) rememberDisclosures();
    document.getElementById('steps').innerHTML = names.map((name, i) => `<button type="button" data-step="${i}" class="step ${state.page === i ? 'active' : ''}" ${state.page === i ? 'aria-current="step"' : ''} ${i > state.max ? 'disabled' : ''}><span class="step-number">${String(i + 1).padStart(2, '0')}</span><span><strong>${name}</strong><small>${descriptions[i]}</small></span>${state.page === i ? '<span class="step-dot"></span>' : ''}</button>`).join('');
    app.innerHTML = (state.notice ? `<div class="notice transient" role="status"><p>${esc(state.notice)}</p></div>` : '') + [start, assessment, results, draft, review][state.page]();
    enhanceTerms(app);
    if (state.page === 1) document.getElementById('answer-bar').style.setProperty('--progress', `${E.summary(state.answers).answered / 9 * 100}%`);
    document.title = `${names[state.page]} | 企業向けCTX 無料AI導入診断（体験版）`;
    if (focus) { app.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }
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
      announce(`文字サイズを「${sizeButton.textContent}」に変更しました。回答・AI向け指示案は保持されています。`);
      return;
    }
    const product = event.target.closest('[data-product]');
    if (product) { state.product = product.dataset.product; render(false); app.querySelector(`[data-product="${state.product}"]`).focus(); return; }
    const step = event.target.closest('[data-step]');
    if (step && Number(step.dataset.step) <= state.max) { navigate(Number(step.dataset.step)); return; }
    const target = event.target.closest('[data-action]'); if (!target) return;
    switch (target.dataset.action) {
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
      case 'print-results': window.print(); break;
      case 'copy-draft': {
        const text = draftText(state.product, state.answers, state.options);
        copyText(text).then(ok => {
          state.notice = ok ? `${state.product}に渡すAI向け指示案をコピーしました。メモ帳などに貼り付けてご利用ください。` : 'コピーできませんでした。AI向け指示案のテキストを選択して手動でコピーしてください。';
          render(false);
          const again = app.querySelector('[data-action="copy-draft"]'); if (again) again.focus({ preventScroll: true });
          announce(state.notice);
        });
        break;
      }
      case 'save-draft': {
        const text = draftText(state.product, state.answers, state.options);
        const ok = saveTextFile(`企業向けCTX_${state.product}向けAI指示案サンプル.txt`, text);
        state.notice = ok ? `${state.product}に渡すAI向け指示案をテキストファイルに保存しました。保存先はブラウザの既定のダウンロード先です。` : 'ファイル保存に失敗しました。コピーしてメモ帳などに貼り付けてください。';
        render(false);
        const again = app.querySelector('[data-action="save-draft"]'); if (again) again.focus({ preventScroll: true });
        announce(state.notice);
        break;
      }
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
      changed(); state.answers[input.name] = input.value;
      const s = E.summary(state.answers);
      document.getElementById('answer-count').innerHTML = `${s.answered} <span>/ 9 回答</span>`;
      document.getElementById('answer-bar').style.setProperty('--progress', `${s.answered / 9 * 100}%`);
      if (state.notice) announce(state.notice);
    } else if (input.dataset.option) {
      changed(); state.options[input.dataset.option] = input.checked;
      const top = window.scrollY; render(false); app.querySelector(`[data-option="${input.dataset.option}"]`).focus({ preventScroll: true }); window.scrollTo(0, top);
    }
  });
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
  const dialog = document.getElementById('reset-dialog');
  document.getElementById('cancel-reset').addEventListener('click', () => dialog.close());
  document.getElementById('confirm-reset').addEventListener('click', () => {
    dialog.close(); state.answers = {}; state.product = 'Codex'; state.options = { review: true, strict: true, budget: false }; state.notice = ''; state.max = 0; state.page = 0; state.disclosures = {};
    location.hash = 'start'; render(true, false); announce('すべての回答とAI向け指示案の選択を消去しました。');
  });
  document.getElementById('close-operator').addEventListener('click', () => document.getElementById('operator-dialog').close());
  const contactForm = window.CTXContactForm.create({ sourceLabel: '企業向けCTX 無料AI導入診断（体験版）', endpoint: 'https://formspree.io/f/mqpenzan' });
  contactForm.mount(document.getElementById('contact-form-mount'));
  document.getElementById('close-contact').addEventListener('click', () => document.getElementById('contact-dialog').close());
  document.getElementById('contact-dialog').addEventListener('close', () => contactForm.reset());
  function readRoute(focus = true) {
    const requested = pages.indexOf(location.hash.slice(1));
    if (requested >= 0) { state.page = requested; state.max = Math.max(state.max, requested); }
    else { state.page = 0; history.replaceState(null, '', '#start'); }
    render(focus);
  }
  window.addEventListener('hashchange', () => readRoute());
  readRoute(false);
})();
