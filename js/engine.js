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
  root.CTX_ENGINE = { normalize, assess, summary, diff };
})(typeof window === 'undefined' ? globalThis : window);
