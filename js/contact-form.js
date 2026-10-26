/*
 * Shared, framework-free contact form module.
 *
 * Design goals (see README.md for the full rationale and integration guide):
 *  - Zero dependencies, zero build step: a single <script> + <link> works anywhere.
 *  - Never sends anything over the network by itself. Real submission only happens
 *    if the embedding page passes a non-empty `endpoint`, and only on an explicit
 *    user click of the submit button — never automatically, never on mount.
 *  - If no `endpoint` is configured (the default), the module falls back to a
 *    "copy to clipboard" / "save as a text file" flow so the completed form is
 *    still useful before a real send destination has been decided.
 *  - Diagnosis/app state is never read by this module. It only knows about the
 *    four fields it renders (company, name, email, message) plus whatever
 *    `sourceLabel` string the embedding page passes in for context.
 *
 * Usage:
 *   const form = window.CTXContactForm.create({
 *     sourceLabel: '企業向けCTX 無料AI導入診断（体験版）',
 *     endpoint: null,       // string URL to POST JSON to, or null to keep sending disabled
 *     mailtoFallback: null, // e.g. 'contact@example.com' - optional alternate "open mail app" path
 *   });
 *   form.mount(document.getElementById('contact-form-mount'));
 *   // Call this every time the host page is about to SHOW the form (e.g. before
 *   // a dialog's showModal()) so the spam-timing check measures real fill time:
 *   form.onOpen();
 */
(function (global) {
  'use strict';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var LIMITS = { company: 120, name: 60, email: 254, message: 2000 };
  var MIN_MESSAGE_LENGTH = 10;
  var MIN_FILL_MS = 2500; // submissions faster than this are treated as automated

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function create(options) {
    var config = Object.assign({
      sourceLabel: '',
      endpoint: null,
      mailtoFallback: null,
      idPrefix: 'scf'
    }, options || {});

    var root = null;
    var openedAt = 0;
    var lastResult = null; // for tests / host pages that want to inspect the outcome

    function fieldId(name) { return config.idPrefix + '-' + name; }

    function markup() {
      var p = config.idPrefix;
      return (
        '<form class="scf-form" novalidate>' +
          '<p class="scf-lead">' + (config.sourceLabel ? esc(config.sourceLabel) + 'についての' : '') + 'ご相談・お問い合わせ内容をご記入ください。<strong>診断の回答内容は送信されません。</strong></p>' +
          '<div class="scf-row">' +
            '<label for="' + fieldId('company') + '">会社名<span class="scf-optional">（任意）</span></label>' +
            '<input id="' + fieldId('company') + '" name="company" type="text" maxlength="' + LIMITS.company + '" autocomplete="organization">' +
            '<span class="scf-error" id="' + fieldId('company') + '-error" role="alert"></span>' +
          '</div>' +
          '<div class="scf-row">' +
            '<label for="' + fieldId('name') + '">お名前<span class="scf-required">必須</span></label>' +
            '<input id="' + fieldId('name') + '" name="name" type="text" maxlength="' + LIMITS.name + '" autocomplete="name" required>' +
            '<span class="scf-error" id="' + fieldId('name') + '-error" role="alert"></span>' +
          '</div>' +
          '<div class="scf-row">' +
            '<label for="' + fieldId('email') + '">メールアドレス<span class="scf-required">必須</span></label>' +
            '<input id="' + fieldId('email') + '" name="email" type="email" maxlength="' + LIMITS.email + '" autocomplete="email" required>' +
            '<span class="scf-error" id="' + fieldId('email') + '-error" role="alert"></span>' +
          '</div>' +
          '<div class="scf-row">' +
            '<label for="' + fieldId('message') + '">ご相談内容<span class="scf-required">必須</span></label>' +
            '<textarea id="' + fieldId('message') + '" name="message" rows="5" maxlength="' + LIMITS.message + '" required></textarea>' +
            '<span class="scf-error" id="' + fieldId('message') + '-error" role="alert"></span>' +
          '</div>' +
          // Honeypot: hidden from sighted users and from screen readers (aria-hidden +
          // tabindex -1 keeps it out of the normal tab/reading order), but a naive bot
          // that fills every input it can find will still populate it.
          '<div class="scf-honeypot" aria-hidden="true">' +
            '<label for="' + fieldId('website') + '">ウェブサイト</label>' +
            '<input id="' + fieldId('website') + '" name="website" type="text" tabindex="-1" autocomplete="off">' +
          '</div>' +
          '<p class="scf-privacy">送信される情報は、会社名・お名前・メールアドレス・相談内容のみです。これらは、お問い合わせへの返信以外の目的には使用しません。自動入力検出用の項目（上記以外に1件）と入力時間を、迷惑送信対策として内部的に確認しますが、これらの値自体は保存・送信しません。</p>' +
          '<div class="scf-status" id="' + fieldId('status') + '" role="status" aria-live="polite"></div>' +
          '<div class="scf-actions">' +
            '<button type="submit" class="button primary" id="' + fieldId('submit') + '">送信する</button>' +
          '</div>' +
        '</form>'
      );
    }

    function setError(name, message) {
      var el = root.querySelector('#' + fieldId(name) + '-error');
      var input = root.querySelector('#' + fieldId(name));
      if (el) el.textContent = message || '';
      if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
      return !message;
    }

    function validate(values) {
      var ok = true;
      ok = setError('name', values.name.trim() ? '' : 'お名前を入力してください。') && ok;
      if (!values.email.trim()) { setError('email', 'メールアドレスを入力してください。'); ok = false; }
      else if (!EMAIL_RE.test(values.email.trim())) { setError('email', 'メールアドレスの形式をご確認ください。'); ok = false; }
      else setError('email', '');
      if (!values.message.trim()) { setError('message', 'ご相談内容を入力してください。'); ok = false; }
      else if (values.message.trim().length < MIN_MESSAGE_LENGTH) { setError('message', `もう少し詳しくご記入ください（${MIN_MESSAGE_LENGTH}文字以上）。`); ok = false; }
      else setError('message', '');
      setError('company', '');
      return ok;
    }

    function isLikelySpam(values) {
      if (values.website && values.website.trim()) return true;
      if (openedAt && (Date.now() - openedAt) < MIN_FILL_MS) return true;
      return false;
    }

    function composeText(values) {
      var lines = [
        '【お問い合わせ】' + (config.sourceLabel || ''),
        '会社名：' + (values.company.trim() || '（未記入）'),
        'お名前：' + values.name.trim(),
        'メールアドレス：' + values.email.trim(),
        '',
        'ご相談内容：',
        values.message.trim()
      ];
      return lines.join('\n');
    }

    function fallbackCopy(text) {
      try {
        var area = document.createElement('textarea');
        area.value = text; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0';
        document.body.appendChild(area); area.focus(); area.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(area);
        return ok;
      } catch (e) { return false; }
    }

    function copyText(text) {
      if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
        return global.navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return fallbackCopy(text); });
      }
      return Promise.resolve(fallbackCopy(text));
    }

    function saveTextFile(filename, text) {
      try {
        var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        return true;
      } catch (e) { return false; }
    }

    function renderBlockedState(values, reason) {
      var status = root.querySelector('#' + fieldId('status'));
      var text = composeText(values);
      var lead = reason === 'spam-guard'
        ? '送信前の確認でブロックされました。入力し直しても解決しない場合は、下記からコピーしてメールでご連絡ください。'
        : '現在、送信先の設定が完了していないため、この体験版からの送信はできません。下記からコピーまたは保存し、メールなどでご連絡ください。';
      status.innerHTML =
        '<div class="scf-blocked">' +
          '<p>' + lead + '</p>' +
          '<div class="toolbar-buttons">' +
            '<button type="button" class="button secondary" id="' + fieldId('copy') + '">内容をコピーする</button>' +
            '<button type="button" class="button secondary" id="' + fieldId('save') + '">テキストで保存する</button>' +
          '</div>' +
          '<p class="scf-status-note" id="' + fieldId('status-note') + '"></p>' +
        '</div>';
      root.querySelector('#' + fieldId('copy')).addEventListener('click', function () {
        copyText(text).then(function (ok) {
          root.querySelector('#' + fieldId('status-note')).textContent = ok ? 'コピーしました。メールなどに貼り付けてご利用ください。' : 'コピーできませんでした。テキストを選択して手動でコピーしてください。';
        });
      });
      root.querySelector('#' + fieldId('save')).addEventListener('click', function () {
        var ok = saveTextFile('お問い合わせ内容.txt', text);
        root.querySelector('#' + fieldId('status-note')).textContent = ok ? 'テキストファイルに保存しました。' : '保存に失敗しました。コピーをお試しください。';
      });
    }

    function attemptSend(values) {
      // This is the only place a real network request could ever originate from.
      // It is intentionally unreachable while config.endpoint is null/undefined,
      // which is the default and will remain so until a destination is decided.
      if (isLikelySpam(values)) { lastResult = { sent: false, reason: 'spam-guard' }; return lastResult; }
      if (!config.endpoint) { lastResult = { sent: false, reason: 'no-endpoint' }; return lastResult; }
      // Not implemented: no endpoint has been approved yet. When one is, this is
      // the single spot to add a fetch(config.endpoint, { method: 'POST', ... }).
      lastResult = { sent: false, reason: 'no-endpoint' };
      return lastResult;
    }

    function onSubmit(event) {
      event.preventDefault();
      var values = {
        company: root.querySelector('#' + fieldId('company')).value,
        name: root.querySelector('#' + fieldId('name')).value,
        email: root.querySelector('#' + fieldId('email')).value,
        message: root.querySelector('#' + fieldId('message')).value,
        website: root.querySelector('#' + fieldId('website')).value
      };
      if (!validate(values)) {
        var firstInvalid = root.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      var result = attemptSend(values);
      renderBlockedState(values, result.reason);
    }

    function mount(container) {
      if (!container) throw new Error('CTXContactForm.mount requires a container element');
      root = container;
      root.innerHTML = markup();
      root.querySelector('form').addEventListener('submit', onSubmit);
    }

    function onOpen() {
      openedAt = Date.now();
      if (root) {
        var status = root.querySelector('#' + fieldId('status'));
        if (status) status.innerHTML = '';
      }
    }

    function reset() {
      if (!root) return;
      var form = root.querySelector('form');
      if (form) form.reset();
      ['company', 'name', 'email', 'message'].forEach(function (name) { setError(name, ''); });
      var status = root.querySelector('#' + fieldId('status'));
      if (status) status.innerHTML = '';
    }

    return { mount: mount, onOpen: onOpen, reset: reset, getLastResult: function () { return lastResult; } };
  }

  global.CTXContactForm = { create: create };
})(typeof window === 'undefined' ? globalThis : window);
