/* Enterprise CTX contact form: no dependencies, no diagnosis state access.
 * Only the approved endpoint is accepted. Sending requires an explicit submit.
 * Formspree protocol: POST /f/{id}, Accept: application/json, named form fields.
 * Transport success means service acceptance, not confirmed mailbox delivery.
 */
(function (global) {
  'use strict';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var LIMITS = { company: 120, name: 60, email: 254, message: 2000 };
  var MIN_MESSAGE_LENGTH = 10;
  var APPROVED_ENDPOINT = 'https://formspree.io/f/mqpenzan';
  var SOURCE = '企業向けCTX 無料AI導入診断（体験版）';
  var TIMEOUT_MS = 15000;
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
      idPrefix: 'scf'
    }, options || {});

    var configured = config.endpoint === APPROVED_ENDPOINT;
    var phase = 'idle';
    var resultMessage = '';
    var root = null;
    var openedAt = 0;
    var lastResult = null; // for tests / host pages that want to inspect the outcome

    function fieldId(name) { return config.idPrefix + '-' + name; }

    function markup() {
      return (
        '<form class="scf-form" novalidate>' +
          '<p class="scf-lead">' + (config.sourceLabel ? esc(config.sourceLabel) + 'についての' : '') + 'ご相談・お問い合わせ内容をご記入ください。<strong>診断回答・AI向け指示案は送信されません。</strong></p>' +
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
          '<p class="scf-privacy">送信ボタンを押した場合のみ、会社名（任意）・氏名・メールアドレス・相談内容・固定の送信元識別子（企業向けCTX）を、第三者の受付サービスFormspreeへ送信します。お問い合わせ対応に利用します。顧客情報・認証情報などの秘密情報は記入しないでください。</p>' +
          '<p class="scf-privacy">Formspreeは通信に伴うIPアドレス・ブラウザ情報等を扱い、米国等で情報を処理します。詳しくは<a href="https://formspree.io/legal/privacy-policy/" target="_blank" rel="noopener noreferrer">Formspreeのプライバシーポリシー</a>をご確認ください。迷惑送信の検出欄と入力時間は端末内で確認し、送信しません。診断データと問い合わせ内容を結合せず、このフォームはCookieやローカルストレージに入力内容を保存しません。</p>' +
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
      Object.keys(LIMITS).forEach(function (name) {
        if (values[name].length > LIMITS[name]) { setError(name, LIMITS[name] + '文字以内で入力してください。'); ok = false; }
      });
      return ok;
    }

    function isLikelySpam(values) {
      if (values.website && values.website.trim()) return true;
      if (openedAt && (Date.now() - openedAt) < MIN_FILL_MS) return true;
      return false;
    }

    function renderState() {
      var locked = phase === 'pending' || phase === 'sent' || phase === 'unknown';
      var button = root.querySelector('#' + fieldId('submit'));
      button.disabled = !configured || locked;
      button.textContent = !configured ? '送信先未設定' : phase === 'pending' ? '送信中…' : phase === 'sent' ? '受付済み' : phase === 'unknown' ? '結果不明・再送停止中' : '送信する';
      root.querySelector('form').setAttribute('aria-busy', String(phase === 'pending'));
      root.querySelectorAll('input, textarea').forEach(function (input) { input.disabled = locked; });
      var status = root.querySelector('#' + fieldId('status'));
      status.dataset.state = phase;
      status.textContent = !configured ? '送信先が未設定、または未承認のため送信できません。' : resultMessage;
    }

    async function attemptSend(values) {
      if (!configured) { lastResult = { sent: false, reason: 'no-endpoint' }; renderState(); return; }
      if (isLikelySpam(values)) {
        lastResult = { sent: false, reason: 'spam-guard' };
        resultMessage = '送信前の確認で停止しました。入力内容を確認し、少し待ってから操作してください。';
        renderState(); return;
      }
      // Explicit allowlist: never serialize the form, application state or URL.
      var payload = new URLSearchParams({
        company: values.company.trim(), name: values.name.trim(),
        email: values.email.trim(), message: values.message.trim(), source: SOURCE
      });
      phase = 'pending'; resultMessage = '送信中です。結果が表示されるまでお待ちください。'; renderState();
      var controller = new AbortController();
      var timedOut = false;
      var timer = setTimeout(function () { timedOut = true; controller.abort(); }, TIMEOUT_MS);
      try {
        var response = await global.fetch(APPROVED_ENDPOINT, {
          method: 'POST', headers: { Accept: 'application/json' }, body: payload,
          signal: controller.signal, credentials: 'omit', redirect: 'error',
          referrerPolicy: 'strict-origin-when-cross-origin'
        });
        if (!response.ok) {
          phase = 'error';
          resultMessage = response.status === 429
            ? '受付制限により送信できませんでした。時間をおいてご確認ください。自動再送はしません。'
            : response.status === 400 || response.status === 422
              ? '受付先で入力内容が受理されませんでした。入力内容をご確認ください。'
              : response.status === 403
                ? '受付先が送信を拒否しました。入力を繰り返さず、受付設定の確認をお待ちください。'
                : '受付先からエラーが返されました（HTTP ' + response.status + '）。受付完了は確認できません。自動再送はしません。';
          lastResult = { sent: false, reason: 'http-error', status: response.status };
        } else {
          var data = await response.json();
          if (!data || typeof data !== 'object' || Array.isArray(data) || data.ok === false || data.errors || data.error) throw new Error('unconfirmed-response');
          phase = 'sent';
          resultMessage = 'Formspreeが問い合わせを受け付けました。担当者へのメール到着を保証する表示ではありません。重複送信を防ぐため、このタブでは再送できません。';
          lastResult = { sent: true, reason: 'accepted' };
          root.querySelector('form').reset();
        }
      } catch (error) {
        phase = 'unknown';
        resultMessage = (timedOut ? '通信がタイムアウトしました。' : '通信失敗、または受付応答を確認できませんでした。') +
          '送信結果は不明です。既に受け付けられた可能性があるため、自動再送せず、このタブでの再送を停止しました。再入力する前に受付状況をご確認ください。';
        lastResult = { sent: false, reason: timedOut ? 'timeout' : 'unknown', outcome: 'unknown' };
      } finally {
        clearTimeout(timer); renderState();
      }
    }

    function onSubmit(event) {
      event.preventDefault();
      if (!configured || ['pending', 'sent', 'unknown'].includes(phase)) return;
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
      attemptSend(values);
    }

    function mount(container) {
      if (!container) throw new Error('CTXContactForm.mount requires a container element');
      root = container;
      root.innerHTML = markup();
      root.querySelector('form').addEventListener('submit', onSubmit);
      renderState();
    }

    function onOpen() {
      openedAt = Date.now();
      if (root) renderState();
    }

    function reset() {
      if (!root) return;
      // Closing/reopening must not release the pending or uncertain-send lock.
      if (['pending', 'sent', 'unknown'].includes(phase)) return;
      root.querySelector('form').reset();
      ['company', 'name', 'email', 'message'].forEach(function (name) { setError(name, ''); });
      phase = 'idle'; resultMessage = ''; lastResult = null;
      renderState();
    }

    return { mount: mount, onOpen: onOpen, reset: reset, getLastResult: function () { return lastResult; } };
  }

  global.CTXContactForm = { create: create };
})(typeof window === 'undefined' ? globalThis : window);
