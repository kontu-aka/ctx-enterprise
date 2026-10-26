(function () {
  'use strict';
  const D = window.CTX_DATA, E = window.CTX_ENGINE, P = window.CTX_PRESENTATION;
  const pages = ['start', 'assessment', 'results', 'draft', 'review'];
  const names = ['スタート', 'AI導入診断', '診断結果', 'ルール草案', '変更・承認'];
  const descriptions = ['まずは全体を知る', '9つのテーマを確認', '対策と担当を整理', '2つのAI向けに作成', '差分を見て模擬体験'];
  const state = { page: 0, max: 0, answers: {}, product: 'Codex', options: { review: true, strict: true, budget: false }, decision: '', acknowledged: false, notice: '', disclosures: {} };
  const app = document.getElementById('app');
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const button = (action, label, kind = 'primary', extra = '') => `<button type="button" class="button ${kind}" data-action="${action}" ${extra}>${label}</button>`;
  const heading = (n, title, description) => `<div class="eyebrow">STEP 0${n + 1} <span>/ 05</span></div><h1>${title}</h1><p class="lead">${description}</p>`;
  const note = (text, cls = '') => `<div class="notice ${cls}"><span aria-hidden="true">ⓘ</span><p>${text}</p></div>`;
  const tabs = () => `<div class="product-tabs" role="group" aria-label="対象のAI">${['Codex', 'Claude Code'].map(p => `<button type="button" data-product="${p}" class="${state.product === p ? 'selected' : ''}" aria-pressed="${state.product === p}">${p}<span>向け</span></button>`).join('')}</div>`;
  const productScopeHelper = () => `<p class="helper">Codex向け・Claude Code向けの草案は、同じ内容の製品名を入れ替えたものです（各製品提供元との提携・公認はありません）。</p>`;
  const consultNote = () => `<section class="consult-note"><p>診断結果に応じた改善の実施や、会社ごとのAI利用ルールの整備についても、有償でご相談いただけます。</p><div class="toolbar-buttons">${button('open-contact-form', 'お問い合わせフォームを開く', 'primary')}${button('open-operator-info', '運営者情報を見る', 'secondary')}</div></section>`;
  function priorityTop3(rows) {
    const priority = { gap: 0, unknown: 1, unanswered: 1, partial: 2, ready: 3 };
    const top = rows.filter(r => r.status !== 'ready').sort((a, b) => priority[a.status] - priority[b.status]).slice(0, 3);
    if (!top.length) return '';
    return `<div class="section-heading"><h2>優先して確認したい3件</h2><span class="mini-label">PRIORITY</span></div><p class="flow-lead">回答から、特に優先度が高いと考えられるテーマです。</p><div class="plan-grid">${top.map(r => `<article class="issue-card"><h3>${esc(r.title)}</h3><span class="status-tag ${r.status}">${r.label}</span><p>${esc(r.next)}</p></article>`).join('')}</div>`;
  }
  // 表示専用の提案文。診断・集計・草案・差分の計算は既存エンジンを使う。
  const guidance = {
    information: ['入力してよい情報と禁止する情報を分ける', '大切な情報を誤ってAIへ渡す可能性を減らすこと', '情報管理・契約の担当者と、利用できる情報の一覧を確認する。'],
    workspace: ['AI専用の作業場所を用意する', '必要のないファイルにAIが触れる可能性を減らすこと', '使える場所を決め、パソコンや実行環境の制限を管理担当者に確認する。'],
    secrets: ['パスワードや秘密のコードをAIから分けて保管する', '秘密情報の流出や不正利用の可能性を減らすこと', '保管場所と、AIの記憶・操作記録に秘密情報を残さない手順を確認する。'],
    network: ['利用できる接続先と費用の上限を決める', '未承認の外部送信や、予想外の利用費用を抑えること', '接続先・外部ツール・費用上限と、利用を止める方法を担当者と確認する。'],
    operations: ['削除・上書き・公開の前に人が確認する', '誤った削除や公開の可能性を減らすこと', '確認する担当者、変更の確認方法、元へ戻す方法を決める。AIの出力も確認する。'],
    permissions: ['利用者と管理者の役割・使える範囲を分ける', '必要以上の権限が残る状態を減らすこと', '権限を与える担当者と、異動・退職時に権限を外す担当者を確認する。'],
    policy: ['共通ルールと共有する作業手順を管理する', '利用者ごとの判断のばらつきや、古い手順の利用を減らすこと', 'ルールの責任者、最新版の管理方法、共有前の確認担当者を決める。'],
    incident: ['操作の記録と、トラブル時の連絡・停止手順を用意する', '異常に気づくことや対応が遅れる可能性を減らすこと', '記録する内容、連絡先、停止できる担当者を確認する。記録に秘密情報を残さない。'],
    education: ['ルールの更新・既読・同意・理解を確認する', 'ルールが伝わらない状態や、使い方の誤解を減らすこと', '配布・教育・既読確認の担当者と、実際の設定を確認する担当者を決める。']
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
    return `<div class="plan-grid">${rows.slice(0, 3).map(renderCard).join('')}</div>${rows.length > 3 ? `<details class="more-plans" data-disclosure="${key}" ${opened(key)}><summary>残り${rows.length - 3}件の${noun}を確認する <span class="muted">（全${rows.length}件）</span></summary><div class="plan-grid">${rows.slice(3).map(renderCard).join('')}</div></details>` : ''}`;
  }
  function issueSection(rows) {
    const ready = rows.all.length - rows.pending.length;
    return `<section class="flow-section">${flowTitle('1', '診断で見つかった課題')}<p class="flow-lead">回答から整理した確認事項です。会社の実際の設定や運用を調査したものではありません。</p>${rows.pending.length ? groupedCards(rows.pending, row => `<article class="issue-card"><h3>${esc(row.title)}</h3><span class="status-tag ${row.status}">${row.label}</span><p>${reportedStatus(row)}</p></article>`, 'issues-more', '課題') : '<p class="plan-empty">未整備・一部整備・不明／未回答に該当する回答はありません。整備済みとの申告も、有効性の確認が必要です。</p>'}${ready ? `<p class="helper">整備の申告があった${ready}件も、実際に機能するかを担当者と確認してください。</p>` : ''}</section>`;
  }
  function proposalSection(rows, reviewMode = false) {
    return `<section class="flow-section">${flowTitle(reviewMode ? '1' : '2', reviewMode ? '診断結果から作成した提案内容' : '企業向けCTXからの改善提案')}<p class="flow-lead">${rows.pending.length ? '課題と同じテーマに沿った検討用の提案です。会社の状況に合うか、担当者と確認してください。' : '整備の申告があった対策を維持・確認するための提案です。'} 効果を検証したものではありません。</p>${groupedCards(rows.proposals, row => {
      const copy = guidance[row.id];
      return `<article class="proposal-card"><h3>${esc(row.title)}</h3><p class="proposal-basis">${row.label}（回答上の状況）</p><p class="proposal-title">${esc(copy[0])}</p><dl><div><dt>改善を目指す点</dt><dd>${esc(copy[1])}</dd></div><div><dt>次にすること</dt><dd>${esc(copy[2])}</dd></div>${contact(row.owner)}</dl></article>`;
    }, reviewMode ? 'review-proposals-more' : 'draft-proposals-more', '提案')}</section>`;
  }
  function rulePreview(rows) {
    return `<div class="draft-preview"><p class="flow-lead">${esc(state.product)}向け草案の抜粋です。全文には9テーマのルールと確認先を含みます。</p><ul>${rows.proposals.slice(0, 3).map(row => `<li><strong>${esc(row.title)}</strong><p>${esc(row.rule)}</p></li>`).join('')}</ul></div>`;
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
    return `<details class="document-panel full-rule" data-disclosure="${key}" ${opened(key)}><summary>ルール全文を見る <span class="muted">（${esc(state.product)}・未適用の草案）</span></summary><pre class="rule-text" tabindex="0" aria-label="${esc(state.product)}向け運用ルール草案">${esc(E.draft(state.product, state.answers, state.options))}</pre>${draftActions()}</details>`;
  }
  function invalidate() { state.decision = ''; state.acknowledged = false; }
  function navigate(index) { state.max = Math.max(state.max, index); if (location.hash === '#' + pages[index]) { state.page = index; render(); } else location.hash = pages[index]; }
  function start() {
    return `<div class="start-heading"><div class="eyebrow">ENTERPRISE AI / START HERE</div><span class="version-tag">無料体験版</span></div>
      <section class="hero"><div class="hero-copy"><h1>AIを使い始める前に、<br><em>会社で決めること</em>を<br>見える形に。</h1><p class="lead">何を渡していい？ 誰が確認する？<br>9つのテーマから導入準備を整理し、<br>自社ルールを考えるための草案を体験できます。</p><div class="hero-actions">${button('begin', 'AI導入診断をはじめる <span aria-hidden="true">→</span>')}<span class="muted">9テーマ・目安5分</span></div><p class="micro">登録・インストール・APIキー不要</p></div>
      <div class="hero-visual" aria-label="診断からルール草案、模擬承認へ進む流れ"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="visual-kicker">YOUR AI READINESS</span><div class="visual-card card-a"><span class="visual-icon">01</span><div><small>CHECK</small><strong>導入の準備を知る</strong></div><span class="visual-dots">•••</span></div><div class="visual-connector">↓</div><div class="visual-card card-b"><span class="visual-icon">02</span><div><small>MAKE A DRAFT</small><strong>ルールを言葉にする</strong></div><span class="visual-tick">↗</span></div><div class="visual-connector lower">↓</div><div class="visual-card card-c"><span class="visual-icon">03</span><div><small>REVIEW TOGETHER</small><strong>差分を見て、考える</strong></div><span class="visual-tick">✓</span></div><div class="visual-caption"><span class="signal"></span> すべて画面内のシミュレーション</div></div></section>
      ${note('<strong>自社の状況に近いものを選んで、実際にお試しいただけます。</strong> 会社名や顧客情報・認証情報などの実データの入力は不要です。回答はこのタブのメモリ上だけで扱い、外部送信・保存・AI設定への適用は行いません。')}
      <section class="journey"><div class="section-heading"><h2>この体験版でできること</h2><span class="mini-label">3 SMALL STEPS</span></div><div class="three-col"><article><span class="feature-number">01 / CHECK</span><h3>現状を整理する</h3><p>分からないことも、そのままで。<br>未確認の項目を見つけます。</p></article><article><span class="feature-number">02 / DRAFT</span><h3>対策を草案にする</h3><p>Codex・Claude Code向けに、<br>対策と確認先をまとめます。</p></article><article><span class="feature-number">03 / REVIEW</span><h3>変更と承認を体験する</h3><p>変更前後を見比べて、<br>模擬承認・保留を試せます。</p></article></div></section><p class="footnote">Codex・Claude CodeなどのAIコーディング支援ツールを社内で導入する企業向けの検討ツールです。OpenAI社・Anthropic社など、各製品の提供元との提携・公認関係はありません。Codex向け・Claude Code向けの草案は、同じ検討内容の製品名を入れ替えたものであり、製品ごとに異なる安全設定が完了していることを示すものではありません。</p>`;
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
    return `${heading(2, 'いま決めることが、見えてきました。', '回答をもとに、対策と社内の確認先を整理しました。整備の申告があっても、有効性は別途確認が必要です。')}
      <div class="summary-grid" role="list" aria-label="9テーマの回答集計"><article class="summary-card" role="listitem"><span class="summary-label">整備の申告あり</span><strong>${s.ready}<small>/ 9</small></strong></article><article class="summary-card amber" role="listitem"><span class="summary-label">一部整備・未整備</span><strong>${s.action}<small>/ 9</small></strong></article><article class="summary-card violet" role="listitem"><span class="summary-label">不明・未回答</span><strong>${s.unknown}<small>/ 9</small></strong></article></div>
      ${note('これは導入準備の整理です。<strong>「安全」「法令適合」の保証や、導入可否の判定は行いません。</strong> 不明・未回答を利用可能の根拠にしないでください。')}
      ${priorityTop3(rows)}
      <div class="section-heading"><h2>テーマ別の対策・確認先</h2><span class="mini-label">9 THEMES</span></div>
      <p class="helper">確認する担当者は一例です。小規模な会社では、同じ方が複数の役割を兼任しても構いません。</p>
      <div class="result-list">${rows.map((r, i) => `<details class="result-card" ${r.status === 'ready' ? '' : 'open'}><summary><span class="result-number">${String(i + 1).padStart(2, '0')}</span><strong>${r.title}</strong><span class="status-tag ${r.status}">${r.label}</span><span class="chevron" aria-hidden="true">⌄</span></summary><div class="result-body"><p class="next-action">${r.next}</p><dl><div><dt>想定されるリスク</dt><dd>${r.risk}${r.status === 'ready' ? '（対策が機能していない場合の残存リスク）' : ''}</dd></div><div><dt>必要な対策</dt><dd>${r.action}</dd></div><div><dt>会社で決めること</dt><dd>${r.decision}</dd></div><div><dt>確認する担当者</dt><dd><span class="owner">${r.owner}</span></dd></div></dl></div></details>`).join('')}</div>
      ${consultNote()}
      <div class="bottom-actions"><span>次は、対策をルールの草案にまとめます。</span><div>${button('print-results', '印刷・PDFとして保存', 'secondary')}${button('reassess', '← 回答を見直す', 'secondary')}${button('draft', 'ルール草案を作る →')}</div></div>`;
  }
  function draft() {
    const rows = planningRows();
    return `${heading(3, '課題から、ルールの草案へ', '何を確認し、何を改善したいのかを整理してから、AI向けのルールを確認できます。')}
      ${note('<strong>文章の指示と、実際の制限は別です。</strong> AIへの禁止指示だけでは実際のアクセス制限になりません。この体験版は設定ファイルを作成・変更せず、OS・AIの権限設定にも適用しません。')}
      ${issueSection(rows)}${proposalSection(rows)}
      <section class="flow-section">${flowTitle('3', 'Codex／Claude Code向けルール草案')}${tabs()}${productScopeHelper()}${rulePreview(rows)}
      <details class="draft-options" data-disclosure="rule-conditions" ${opened('rule-conditions')}><summary>草案に含める条件を確認・変更する</summary><p>選択した内容は草案と、任意で開ける差分に反映されます。</p>${[{ id: 'review', label: '変更前の確認を具体化', text: '差分・影響・復元方法の確認を追記' }, { id: 'strict', label: '高リスク操作は停止', text: '権限のある担当者への確認を追記' }, { id: 'budget', label: '検討用のコスト上限を追加', text: '月額10,000円の検討例を追記' }].map(o => `<label class="option-row"><input type="checkbox" data-option="${o.id}" ${state.options[o.id] ? 'checked' : ''}><span><strong>${o.label}</strong><small>${o.text}</small></span></label>`).join('')}<div class="small-note">画面内の検討用です。費用の停止や操作の制限を実行するものではありません。</div></details></section>
      <section class="flow-section">${flowTitle('4', '必要なときに、ルール全文を確認')}${fullDraft('draft-full')}</section>
      <div class="bottom-actions"><span>2製品の草案を、まとめて比較できます。</span><div>${button('back', '← 診断結果へ', 'secondary')}${button('review', '変更・模擬承認へ →')}</div></div>`;
  }
  function review() {
    const rows = planningRows();
    const before = E.baseline(state.product), after = E.draft(state.product, state.answers, state.options), diff = E.diff(before, after);
    const added = diff.filter(x => x.type === 'add').length, removed = diff.filter(x => x.type === 'remove').length;
    return `${heading(4, '提案内容を確認して、模擬承認する', '改善を目指す点とルール草案を確認し、画面内で承認・保留の流れを試せます。')}
      ${note('<strong>この画面の承認はシミュレーションです。</strong> 実際の会社の承認・監査記録にはなりません。実際の会社・AIへの設定適用や配布は一切行いません。', 'warm')}
      ${proposalSection(rows, true)}
      <section class="flow-section">${flowTitle('2', 'ルール草案を確認')}${tabs()}${productScopeHelper()}<div class="rule-review-stack">
      <details class="document-panel review-document" data-disclosure="review-after" ${opened('review-after')}><summary>変更後のルール <span class="muted">（${esc(state.product)}・未適用の草案）</span></summary><pre class="rule-text compare-text" tabindex="0" aria-label="変更後のルール">${esc(after)}</pre>${draftActions()}</details>
      <details class="document-panel review-document comparison-disclosure" data-disclosure="comparison" ${opened('comparison')}><summary>変更差分 <span class="muted">（${esc(state.product)}・任意）</span></summary><div class="diff-count"><span>＋${added} 追加</span> <span>−${removed} 削除</span></div><div class="diff-lines" tabindex="0" aria-label="行単位の変更差分">${diff.map(l => `<div class="diff-line ${l.type}${l.text.trim() ? '' : ' empty'}"><span aria-label="${({ add: '追加', remove: '削除', same: '同一' })[l.type]}">${({ add: '+', remove: '−', same: ' ' })[l.type]}</span><code>${esc(l.text) || ' '}</code></div>`).join('')}</div></details></div></section>
      <section class="approval-panel"><div class="section-heading"><h2>3. 画面内で模擬承認・保留</h2><span class="status-tag ${state.decision === 'approved' ? 'ready' : 'unknown'}">${state.decision === 'approved' ? '模擬承認済み・実適用なし' : state.decision === 'held' ? '保留中・実適用なし' : '模擬確認待ち'}</span></div><p>対象：Codex・Claude Code。上の切替で両方の草案を確認できます。承認は画面内のシミュレーションです。</p><label class="acknowledgement"><input id="acknowledge" type="checkbox" ${state.acknowledged ? 'checked' : ''}><span>提案内容と2製品のルール草案を確認しました。これは模擬承認であり、実際の承認・設定適用ではないことを理解しました。</span></label><div class="approval-actions">${button('approve', '模擬承認する', 'primary', state.acknowledged ? '' : 'disabled')}${button('hold', '保留にする', 'secondary')}</div><p id="decision-message" role="status" class="decision-message">${state.decision === 'approved' ? '模擬承認の体験が完了しました。実際の会社・AIへの変更や配布はありません。' : state.decision === 'held' ? '画面内で保留しました。草案や回答を見直して、再度確認できます。' : '確認チェックを入れると、模擬承認できます。'}</p></section>
      ${consultNote()}
      <div class="bottom-actions"><div>${button('back', '← 草案を見直す', 'secondary')}${button('reassess', '再診断する', 'text')}</div>${button('reset', '最初からやり直す', 'secondary')}</div>`;
  }
  function render(focus = true, preserveDisclosures = true) {
    if (preserveDisclosures) rememberDisclosures();
    document.getElementById('steps').innerHTML = names.map((name, i) => `<button type="button" data-step="${i}" class="step ${state.page === i ? 'active' : ''}" ${state.page === i ? 'aria-current="step"' : ''} ${i > state.max ? 'disabled' : ''}><span class="step-number">${String(i + 1).padStart(2, '0')}</span><span><strong>${name}</strong><small>${descriptions[i]}</small></span>${state.page === i ? '<span class="step-dot"></span>' : ''}</button>`).join('');
    app.innerHTML = (state.notice ? `<div class="notice transient" role="status"><p>${esc(state.notice)}</p></div>` : '') + [start, assessment, results, draft, review][state.page]();
    if (state.page === 1) document.getElementById('answer-bar').style.setProperty('--progress', `${E.summary(state.answers).answered / 9 * 100}%`);
    document.title = `${names[state.page]} | 企業向けCTX 無料AI導入診断（体験版）`;
    if (focus) { app.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }
  function changed() {
    const hadDecision = !!state.decision;
    invalidate();
    state.notice = hadDecision ? '回答・草案の変更に伴い、以前の模擬判断を取り消しました。新しい差分を確認してください。' : '';
  }
  function announce(text) { document.getElementById('announcer').textContent = text; }
  document.addEventListener('click', event => {
    const sizeButton = event.target.closest('button[data-text-size]');
    if (sizeButton) {
      const size = sizeButton.dataset.textSize;
      if (!['standard', 'large', 'xlarge'].includes(size)) return;
      document.documentElement.dataset.textSize = size;
      document.querySelectorAll('button[data-text-size]').forEach(item => item.setAttribute('aria-pressed', String(item === sizeButton)));
      announce(`文字サイズを「${sizeButton.textContent}」に変更しました。回答・草案・模擬判断は保持されています。`);
      return;
    }
    const product = event.target.closest('[data-product]');
    if (product) { state.product = product.dataset.product; render(false); app.querySelector(`[data-product="${state.product}"]`).focus(); return; }
    const step = event.target.closest('[data-step]');
    if (step && Number(step.dataset.step) <= state.max) { navigate(Number(step.dataset.step)); return; }
    const target = event.target.closest('[data-action]'); if (!target) return;
    switch (target.dataset.action) {
      case 'begin': navigate(1); break;
      case 'back': navigate(Math.max(0, state.page - 1)); break;
      case 'results': state.notice = ''; navigate(2); break;
      case 'draft': state.notice = ''; navigate(3); break;
      case 'review': navigate(4); break;
      case 'reassess': navigate(1); break;
      case 'sample': changed(); D.themes.forEach((t, i) => { state.answers[t.id] = D.sample[i]; }); render(false); app.querySelector('[data-action="sample"]').focus(); announce('架空の回答例を9テーマに設定しました。'); break;
      case 'clear-answers': changed(); state.answers = {}; render(false); app.querySelector('[data-action="clear-answers"]').focus(); announce('回答をクリアしました。未回答は確認が必要として扱います。'); break;
      case 'approve': if (state.acknowledged) { state.decision = 'approved'; render(false); app.querySelector('[data-action="approve"]').focus(); announce('模擬承認しました。実際の適用はありません。'); } break;
      case 'hold': state.decision = 'held'; state.acknowledged = false; render(false); app.querySelector('[data-action="hold"]').focus(); announce('画面内で保留しました。実際の適用はありません。'); break;
      case 'reset': document.getElementById('reset-dialog').showModal(); break;
      case 'open-operator-info': document.getElementById('operator-dialog').showModal(); break;
      case 'open-contact-form': {
        const wasOpen = document.getElementById('operator-dialog').open;
        if (wasOpen) document.getElementById('operator-dialog').close();
        contactForm.onOpen();
        document.getElementById('contact-dialog').showModal();
        break;
      }
      case 'print-results': window.print(); break;
      case 'copy-draft': {
        const text = E.draft(state.product, state.answers, state.options);
        copyText(text).then(ok => {
          state.notice = ok ? `${state.product}向けのルール草案をコピーしました。メモ帳などに貼り付けてご利用ください。` : 'コピーできませんでした。草案のテキストを選択して手動でコピーしてください。';
          render(false);
          const again = app.querySelector('[data-action="copy-draft"]'); if (again) again.focus({ preventScroll: true });
          announce(state.notice);
        });
        break;
      }
      case 'save-draft': {
        const text = E.draft(state.product, state.answers, state.options);
        const ok = saveTextFile(`企業向けCTX_${state.product}向けAI利用ルール草案.txt`, text);
        state.notice = ok ? `${state.product}向けのルール草案をテキストファイルに保存しました。保存先はブラウザの既定のダウンロード先です。` : 'ファイル保存に失敗しました。コピーしてメモ帳などに貼り付けてください。';
        render(false);
        const again = app.querySelector('[data-action="save-draft"]'); if (again) again.focus({ preventScroll: true });
        announce(state.notice);
        break;
      }
    }
  });
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
    } else if (input.id === 'acknowledge') { state.acknowledged = input.checked; app.querySelector('[data-action="approve"]').disabled = !input.checked; }
  });
  const dialog = document.getElementById('reset-dialog');
  document.getElementById('cancel-reset').addEventListener('click', () => dialog.close());
  document.getElementById('confirm-reset').addEventListener('click', () => {
    dialog.close(); state.answers = {}; state.product = 'Codex'; state.options = { review: true, strict: true, budget: false }; invalidate(); state.notice = ''; state.max = 0; state.page = 0; state.disclosures = {};
    location.hash = 'start'; render(true, false); announce('すべての回答と模擬判断を消去しました。');
  });
  document.getElementById('close-operator').addEventListener('click', () => document.getElementById('operator-dialog').close());
  const contactForm = window.CTXContactForm.create({ sourceLabel: '企業向けCTX 無料AI導入診断（体験版）' });
  contactForm.mount(document.getElementById('contact-form-mount'));
  document.getElementById('close-contact').addEventListener('click', () => document.getElementById('contact-dialog').close());
  document.getElementById('contact-dialog').addEventListener('close', () => contactForm.reset());
  window.addEventListener('hashchange', () => {
    const requested = pages.indexOf(location.hash.slice(1));
    if (requested >= 0 && requested <= state.max) state.page = requested;
    else { state.page = 0; history.replaceState(null, '', '#start'); }
    render();
  });
  history.replaceState(null, '', '#start'); render(false);
})();
