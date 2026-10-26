(function (root) {
  'use strict';
  const data = root.CTX_DATA;
  const labels = { ready: '整備の申告あり', partial: '一部整備・要補完', gap: '未整備・対策が必要', unknown: '不明・確認が必要', unanswered: '未回答・確認が必要' };
  function normalize(value) { return data.choices.some(c => c.value === value) ? value : 'unanswered'; }
  function assess(answers) {
    return data.themes.map(theme => {
      const status = normalize(answers[theme.id]);
      return { ...theme, status, label: labels[status], next: status === 'ready' ? '申告内容の証跡・有効性を担当者と確認し、定期的に見直す。' : status === 'unknown' || status === 'unanswered' ? '未確認のため、利用可能と判断せず担当者への確認を優先する。' : status === 'partial' ? '整備済みの範囲と不足を切り分け、未対応部分の対策を決める。' : '運用開始前に対策・責任者・確認方法を決める。' };
    });
  }
  function summary(answers) {
    const rows = assess(answers);
    return { ready: rows.filter(x => x.status === 'ready').length, action: rows.filter(x => ['partial', 'gap'].includes(x.status)).length, unknown: rows.filter(x => ['unknown', 'unanswered'].includes(x.status)).length, answered: rows.filter(x => x.status !== 'unanswered').length };
  }
  function draft(product, answers, options) {
    const opts = options || {};
    const lines = [
      `【画面内の草案】${product}向け AI運用ルールの検討用たたき台`,
      '文書状態：検討用。実設定への適用なし。',
      '目的：AI導入前に確認事項と担当を整理する。',
      '対象：この診断の回答をもとにした検討用のたたき台。会社固有の事実を確認済みのものではない。',
      'AIへの禁止指示だけでは実際のアクセス制限にならない。',
      '実行環境・OS・管理設定での制御と、その有効性の検証は別途必要。',
      `${product}の設定ファイルとして利用できることを検証した文書ではない。`,
      '禁止された情報・操作は、人の承認でも自動的に許可されない。',
      ''
    ];
    for (const row of assess(answers)) lines.push(`■ ${row.title}：${row.label}`, row.rule, row.next, `確認先：${row.owner}`, '');
    lines.push(`変更確認：${opts.review ? '差分・影響・復元方法を確認してから承認する。' : '確認手順は検討中。'}`);
    lines.push(`危険操作：${opts.strict ? '高リスク操作は停止し、権限のある担当者へ確認する。' : '危険度の分類と承認者は検討中。'}`);
    lines.push(`費用管理：${opts.budget ? '月額上限10,000円（検討のための例。実際の上限は別途決める）。到達時の停止方法を担当者が検討する。' : '利用上限と停止方法は検討中。'}`);
    lines.push('この草案は、DLP（情報の外部流出を防ぐ仕組み）・監査ログ・アクセス制御・費用停止の実行はしない。');
    return lines.join('\n');
  }
  function baseline(product) {
    return [`【画面内の草案】${product}向け AI運用ルールの検討用たたき台`, '文書状態：検討用。実設定への適用なし。', '目的：AI導入前に確認事項と担当を整理する。', '対象：この診断の回答をもとにした検討用のたたき台。会社固有の事実を確認済みのものではない。', 'AIへの禁止指示だけでは実際のアクセス制限にならない。', '実行環境・OS・管理設定での制御と、その有効性の検証は別途必要。', `${product}の設定ファイルとして利用できることを検証した文書ではない。`, '禁止された情報・操作は、人の承認でも自動的に許可されない。', '', '診断項目：未反映。担当と対策は未決定。', '変更確認：確認手順は検討中。', '危険操作：危険度の分類と承認者は検討中。', '費用管理：利用上限と停止方法は検討中。', 'この草案は、DLP（情報の外部流出を防ぐ仕組み）・監査ログ・アクセス制御・費用停止の実行はしない。'].join('\n');
  }
  // 行単位LCS。並びを保ち、削除・追加・同一を実際の文面から算出する。
  function diff(before, after) {
    const a = before.split('\n'), b = after.split('\n');
    const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const result = []; let i = 0, j = 0;
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) { result.push({ type: 'same', text: a[i] }); i++; j++; }
      else if (i < a.length && (j === b.length || dp[i + 1][j] >= dp[i][j + 1])) result.push({ type: 'remove', text: a[i++] });
      else result.push({ type: 'add', text: b[j++] });
    }
    return result;
  }
  root.CTX_ENGINE = { normalize, assess, summary, draft, baseline, diff };
})(typeof window === 'undefined' ? globalThis : window);
