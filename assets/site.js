'use strict';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const menu = $('.menu-toggle');
const mobileNav = $('#mobile-nav');
menu?.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(expanded));
  menu.setAttribute('aria-label', expanded ? 'Закрыть меню' : 'Открыть меню');
  mobileNav.hidden = !expanded;
});
$$('#mobile-nav a').forEach(a => a.addEventListener('click', () => {
  mobileNav.hidden = true;
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Открыть меню');
}));
const routes = {
  sea: ['Морские перевозки', 'Для контейнерных и сборных поставок. Подбираем порт прибытия и организуем дальнейший участок маршрута по России.', 'morskie-perevozki.html'],
  rail: ['Железнодорожные перевозки', 'Для коммерческих партий и контейнерных грузов. Согласуем узлы отправления и прибытия, документы и доставку до получателя.', 'zheleznodorozhnye-perevozki.html'],
  road: ['Автомобильные перевозки', 'Для автомобильных и комбинированных маршрутов. Подбираем схему с учётом товара, объёма и адреса доставки, включая последнюю милю по России.', 'avtoperevozki.html']
};
const tabs = $$('[data-route]');
function selectRoute(tab) {
  tabs.forEach(t => { t.setAttribute('aria-selected', String(t === tab)); t.tabIndex = t === tab ? 0 : -1; });
  const [title, description, url] = routes[tab.dataset.route];
  $('#route-title').textContent = title;
  $('#route-description').textContent = description;
  $('#route-link').href = url;
  $('#route-panel').setAttribute('aria-labelledby', tab.id);
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectRoute(tab));
  tab.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const index = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[index].focus(); selectRoute(tabs[index]);
  });
});
const dialog = $('#quote-dialog');
const form = $('#quote-form');
const service = $('#quote-service');
const paymentServices = new Set(['supplier', 'alipay', 'wechat', 'card']);
const names = {delivery:'Доставка груза', supplier:'Оплата поставщику / инвойс', alipay:'Пополнение Alipay', wechat:'Пополнение WeChat Pay', card:'Китайская карта', sourcing:'Поиск поставщика', consultation:'Консультация'};
let lastTrigger;
function updateQuoteFields() {
  const payment = paymentServices.has(service.value);
  $('#amount-field').hidden = !payment;
  form.elements.amount.required = payment;
  form.elements.amount.disabled = !payment;
  $('#route-field').hidden = payment || service.value === 'consultation';
  form.elements.route.disabled = $('#route-field').hidden;
  form.elements.details.placeholder = payment ? 'Например, назначение платежа и желаемая дата' : 'Товар, количество, вес и объём — или ваши вопросы';
  $('#quote-title').textContent = payment ? 'Рассчитаем ваш платёж' : service.value === 'delivery' ? 'Начнём с вашего груза' : 'Обсудим вашу задачу';
}
function openQuote(kind, trigger, amount = '') {
  lastTrigger = trigger;
  service.value = names[kind] ? kind : 'consultation';
  form.elements.amount.value = amount;
  form.hidden = false;
  $('#quote-result').hidden = true;
  $('.dialog-intro').hidden = false;
  updateQuoteFields();
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('modal-open');
}
$$('[data-quote]').forEach(button => button.addEventListener('click', () => openQuote(button.dataset.quote, button)));
service?.addEventListener('change', updateQuoteFields);
$('.dialog-close')?.addEventListener('click', () => dialog.close());
dialog?.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
dialog?.addEventListener('close', () => { document.body.classList.remove('modal-open'); lastTrigger?.focus(); });
$('.back-form')?.addEventListener('click', () => { form.hidden = false; $('#quote-result').hidden = true; $('.dialog-intro').hidden = false; service.focus(); });
let currentMessage = '';
form?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalSubmitLabel = submitButton?.firstChild?.textContent || '';
  if (submitButton) { submitButton.disabled = true; submitButton.firstChild.textContent = 'Отправляем...'; }
  const parts = ['Здравствуйте! Хочу обсудить ' + names[service.value].toLowerCase() + '.'];
  if (paymentServices.has(service.value)) parts.push('Сумма: ' + new Intl.NumberFormat('ru-RU', {maximumFractionDigits:2}).format(Number(form.elements.amount.value)) + ' CNY.');
  if (!form.elements.route.disabled && form.elements.route.value.trim()) parts.push('Маршрут: ' + form.elements.route.value.trim());
  if (form.elements.details.value.trim()) parts.push('Задача: ' + form.elements.details.value.trim());
  parts.push('Подскажите, пожалуйста, условия и следующие шаги.');
  currentMessage = parts.join('\n\n');
  const payload = {
    service: service.value,
    amount: paymentServices.has(service.value) ? Number(form.elements.amount.value) : null,
    route: form.elements.route.disabled ? '' : form.elements.route.value.trim(),
    details: form.elements.details.value.trim()
  };
  let sent = false;
  try {
    const response = await fetch('/api/lead', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    sent = response.ok;
    if (sent && typeof window.ym === 'function') window.ym(112999474, 'reachGoal', 'lead_submitted');
  } catch { /* The manual Telegram fallback remains available below. */ }
  if (submitButton) { submitButton.disabled = false; submitButton.firstChild.textContent = originalSubmitLabel; }
  $('#message-preview').textContent = currentMessage;
  $('#telegram-send').href = 'https://t.me/eastgade_support?text=' + encodeURIComponent(currentMessage);
  $('#quote-result h3').textContent = sent ? 'Заявка отправлена' : 'Не удалось отправить автоматически';
  $('#quote-result > p').textContent = sent ? 'Заявка уже передана менеджеру в рабочую Telegram-группу.' : 'Проверьте соединение или откройте Telegram и отправьте подготовленный текст вручную.';
  form.hidden = true;
  $('.dialog-intro').hidden = true;
  $('#quote-result').hidden = false;
  $('.copy-status').textContent = '';
  $('#telegram-send').focus();
});
$('#copy-message')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentMessage);
    $('.copy-status').textContent = 'Текст скопирован. Вставьте его в чат с менеджером.';
  } catch {
    const range = document.createRange(); range.selectNodeContents($('#message-preview'));
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    $('.copy-status').textContent = 'Выделили текст. Скопируйте его вручную и вставьте в Telegram.';
  }
});
const paymentAmount = $('#pay-amount');
$$('[data-amount]').forEach(b => b.addEventListener('click', () => {
  paymentAmount.value = b.dataset.amount;
  paymentAmount.dispatchEvent(new Event('input'));
}));
paymentAmount?.addEventListener('input', () => {
  $$('[data-amount]').forEach(b => b.classList.toggle('selected', Number(b.dataset.amount) === Number(paymentAmount.value)));
});
$('#payment-quote')?.addEventListener('click', e => {
  if (!paymentAmount.value) { paymentAmount.setCustomValidity('Укажите сумму в юанях'); }
  else paymentAmount.setCustomValidity('');
  if (!paymentAmount.reportValidity()) return;
  openQuote($('#pay-method').value, e.currentTarget, paymentAmount.value);
});
paymentAmount?.addEventListener('input', () => paymentAmount.setCustomValidity(''));
// Structured tools only prepare a request. They never send messages or report a lead.
if (navigator.modelContext?.registerTool) {
  try {
    navigator.modelContext.registerTool({name:'prepare_east_gade_request',description:'Open the East-Gade request form for a user to review. Does not send a message or submit a lead.',inputSchema:{type:'object',properties:{service:{type:'string',enum:Object.keys(names)},amount_cny:{type:'number',minimum:1}},required:['service']},execute:async args => {
      if (!names[args.service]) throw new Error('Unsupported service');
      openQuote(args.service, document.activeElement, Number.isFinite(args.amount_cny) && args.amount_cny > 0 ? String(args.amount_cny) : '');
      return {content:[{type:'text',text:'Request form opened for user review. No message has been sent.'}]};
    }});
  } catch { /* Optional browser API. The normal form remains available. */ }
}
