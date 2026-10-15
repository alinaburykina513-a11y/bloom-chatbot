/* AI chat widget. Settings come from the <script> tag:
   data-name, data-greeting, data-open ("true" opens on load), data-endpoint */
(function () {
  var me = document.currentScript;
  var NAME = me.getAttribute('data-name') || 'AI Assistant';
  var GREETING = me.getAttribute('data-greeting') || 'Hi! How can I help you today?';
  var ENDPOINT = me.getAttribute('data-endpoint') || '/.netlify/functions/chat';
  var OPEN = me.getAttribute('data-open') === 'true';
  var history = [];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  var launcher = el('button', 'bc-launcher');
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Open chat');
  launcher.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  var panel = el('div', 'bc-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', NAME);

  var head = el('div', 'bc-head');
  head.appendChild(el('div', 'bc-avatar', 'AI'));
  var info = el('div');
  info.appendChild(el('div', 'bc-title', NAME));
  var status = el('div', 'bc-status');
  status.appendChild(el('i'));
  status.appendChild(document.createTextNode('Online now'));
  info.appendChild(status);
  head.appendChild(info);
  var close = el('button', 'bc-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close chat');
  head.appendChild(close);

  var msgs = el('div', 'bc-msgs');
  msgs.setAttribute('aria-live', 'polite');
  var form = el('form', 'bc-form');
  var input = el('input', 'bc-input');
  input.type = 'text';
  input.placeholder = 'Type your question...';
  input.setAttribute('aria-label', 'Your message');
  input.maxLength = 500;
  var send = el('button', 'bc-send');
  send.type = 'submit';
  send.setAttribute('aria-label', 'Send');
  send.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 3l17 9-17 9 3-9z"/></svg>';
  form.appendChild(input);
  form.appendChild(send);

  panel.appendChild(head);
  panel.appendChild(msgs);
  panel.appendChild(form);
  document.body.appendChild(panel);
  document.body.appendChild(launcher);

  function add(text, who) {
    var m = el('div', 'bc-msg ' + (who === 'me' ? 'bc-me' : 'bc-bot'), text);
    msgs.appendChild(m);
    msgs.scrollTop = msgs.scrollHeight;
    return m;
  }

  function open() { panel.classList.add('bc-open'); input.focus(); }
  function toggle() { panel.classList.toggle('bc-open'); if (panel.classList.contains('bc-open')) input.focus(); }
  launcher.addEventListener('click', toggle);
  close.addEventListener('click', function () { panel.classList.remove('bc-open'); });

  add(GREETING, 'bot');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) return;
    add(q, 'me');
    history.push({ role: 'user', content: q });
    input.value = '';
    send.disabled = true;
    var typing = el('div', 'bc-msg bc-bot');
    typing.innerHTML = '<span class="bc-typing"><span></span><span></span><span></span></span>';
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-10) })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        typing.remove();
        var reply = (data && data.reply) || "Sorry, I couldn't answer that. Please contact the salon directly.";
        add(reply, 'bot');
        history.push({ role: 'assistant', content: reply });
      })
      .catch(function () {
        typing.remove();
        add('Sorry, something went wrong. Please try again in a moment.', 'bot');
      })
      .finally(function () { send.disabled = false; input.focus(); });
  });

  window.BloomChat = { open: open };
  if (OPEN) open();
})();
