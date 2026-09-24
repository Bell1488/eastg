'use strict';

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

const required = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'SOCKS5H_PROXY'];
const missing = required.filter(name => !process.env[name]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
if (!process.env.SOCKS5H_PROXY.startsWith('socks5h://')) {
  throw new Error('SOCKS5H_PROXY must use the socks5h:// scheme');
}

const services = {
  delivery: 'Доставка груза',
  supplier: 'Оплата поставщику / инвойс',
  alipay: 'Пополнение Alipay',
  wechat: 'Пополнение WeChat Pay',
  card: 'Китайская карта',
  sourcing: 'Поиск поставщика',
  consultation: 'Консультация',
};

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function formatLead(body) {
  const service = services[body.service];
  if (!service) return null;

  const name = cleanText(body.name, 80);
  const route = cleanText(body.route, 160);
  const details = cleanText(body.details, 1500);
  const amount = body.amount == null || body.amount === '' ? null : Number(body.amount);
  if (amount !== null && (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000_000)) return null;

  const lines = [
    'Новая заявка с сайта East-Gade',
    `Услуга: ${service}`,
  ];
  if (name) lines.push(`Имя: ${name}`);
  if (amount !== null) lines.push(`Сумма: ${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(amount)} CNY`);
  if (route) lines.push(`Маршрут: ${route}`);
  if (details) lines.push(`Детали: ${details}`);
  lines.push(`Время: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК)`);
  return lines.join('\n');
}

const app = express();
const proxyAgent = new SocksProxyAgent(process.env.SOCKS5H_PROXY, { timeout: 10_000 });
app.disable('x-powered-by');
app.use('/api/', express.json({ limit: '8kb', type: 'application/json' }));

const requestsByIp = new Map();
app.post('/api/lead', (req, res, next) => {
  const now = Date.now();
  const ip = req.ip;
  const limit = requestsByIp.get(ip) || { count: 0, resetAt: now + 60_000 };
  if (now >= limit.resetAt) {
    limit.count = 0;
    limit.resetAt = now + 60_000;
  }
  if (limit.count >= 10) return res.status(429).json({ error: 'Слишком много заявок. Попробуйте позже.' });
  limit.count++;
  requestsByIp.set(ip, limit);
  if (requestsByIp.size > 10_000) {
    for (const [key, entry] of requestsByIp) if (entry.resetAt <= now) requestsByIp.delete(key);
  }
  next();
}, async (req, res) => {
  const text = formatLead(req.body || {});
  if (!text) return res.status(400).json({ error: 'Проверьте заполнение формы.' });

  try {
    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      { chat_id: process.env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true },
      { httpsAgent: proxyAgent, proxy: false, timeout: 15_000 },
    );
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram lead delivery failed:', error.code || 'unknown error');
    res.status(502).json({ error: 'Не удалось отправить заявку. Попробуйте ещё раз или напишите менеджеру в Telegram.' });
  }
});

app.use((req, res, next) => {
  if (/^\/(?:node_modules|server\.js|package(?:-lock)?\.json|START-HERE\.txt)(?:\/|$)/i.test(req.path)) {
    return res.sendStatus(404);
  }
  next();
});
app.use(express.static(__dirname, { dotfiles: 'ignore', index: 'index.html' }));
app.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Слишком большой запрос.' });
  if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'Некорректный формат запроса.' });
  console.error('Request failed:', error.message);
  res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => console.log(`East-Gade server listening on port ${port}`));
