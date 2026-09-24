'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches;
const toggle=$('.motion-toggle');
function applyMotion(){document.body.classList.toggle('motion-paused',paused);toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Включить анимации':'Приостановить анимации');toggle.querySelector('span').textContent=paused?'▷':'Ⅱ';}
toggle.addEventListener('click',()=>{paused=!paused;applyMotion();});
reduced.addEventListener('change',e=>{paused=e.matches;applyMotion();});applyMotion();
const menu=$('.menu-button'),mobile=$('#mobile-menu');
function closeMenu(){mobile.hidden=true;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Открыть меню');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');mobile.hidden=!open;});
$$('#mobile-menu a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
const quickAmount=$('#quick-amount'), service=$('#request-service'),amount=$('#request-amount');
let method='supplier';
$$('[data-method]').forEach(b=>b.addEventListener('click',()=>{method=b.dataset.method;$$('[data-method]').forEach(t=>{t.classList.toggle('active',t===b);t.setAttribute('aria-pressed',String(t===b));});}));
$$('[data-amount]').forEach(b=>b.addEventListener('click',()=>{quickAmount.value=b.dataset.amount;quickAmount.dispatchEvent(new Event('input'));}));
quickAmount.addEventListener('input',()=>{quickAmount.setCustomValidity('');$$('[data-amount]').forEach(b=>b.classList.toggle('active',Number(b.dataset.amount)===Number(quickAmount.value)));});
function configureRequest(kind,value){service.value=kind;amount.required=kind!=='consultation';if(value)amount.value=value;$('#request-form').hidden=false;$('#request-result').hidden=true;$('#request').scrollIntoView({behavior:paused?'instant':'smooth',block:'start'});service.focus({preventScroll:true});}
$('#get-quote').addEventListener('click',()=>{quickAmount.setCustomValidity(quickAmount.value?'':'Укажите сумму в юанях');if(!quickAmount.reportValidity())return;configureRequest(method,quickAmount.value);});
$$('[data-request]').forEach(b=>b.addEventListener('click',()=>configureRequest(b.dataset.request,'')));
service.addEventListener('change',()=>{amount.required=service.value!=='consultation';amount.setCustomValidity('');});
const names={supplier:'оплату поставщику по инвойсу',alipay:'пополнение Alipay',wechat:'пополнение WeChat Pay',card:'пополнение китайской карты',consultation:'обмен рублей на юани / консультацию'};
let message='';
$('#request-form').addEventListener('submit', async e=>{
 e.preventDefault();
 const form=e.currentTarget;
 if(!form.reportValidity())return;
 const button=form.querySelector('[type="submit"]');
 button.disabled=true;
 const payload={service:service.value,amount:amount.value?Number(amount.value):null,name:$('#request-name').value.trim(),details:$('#request-details').value.trim()};
 const parts=['Здравствуйте! Хочу обсудить '+names[service.value]+'.'];
 if(payload.name)parts.push('Меня зовут '+payload.name+'.');
 if(payload.amount)parts.push('Сумма получателю: '+new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(payload.amount)+' CNY.');
 if(payload.details)parts.push('Детали: '+payload.details);
 parts.push('Подскажите, пожалуйста, актуальный курс, итог в рублях и условия проведения.');
 message=parts.join('\n\n');
 let sent=false;
 try{const response=await fetch('/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});sent=response.ok;}catch{}
 button.disabled=false;
 $('#message-preview').textContent=message;
 $('#send-telegram').href='https://t.me/VDS_Logistic_Support?text='+encodeURIComponent(message);
 $('#request-result h3').textContent=sent?'Заявка отправлена':'Не удалось отправить автоматически';
 $('#request-result > p').textContent=sent?'Заявка передана в рабочую Telegram-группу.':'Попробуйте ещё раз или отправьте подготовленный текст менеджеру в Telegram.';
 form.hidden=true;
 $('#request-result').hidden=false;
 $('#copy-status').textContent='';
 $('#request-result').focus({preventScroll:true});
});
$('#edit-request').addEventListener('click',()=>{$('#request-result').hidden=true;$('#request-form').hidden=false;service.focus({preventScroll:true});});
$('#copy-request').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(message);$('#copy-status').textContent='Текст скопирован. Вставьте его в чат с менеджером.';}catch{const r=document.createRange();r.selectNodeContents($('#message-preview'));const s=window.getSelection();s.removeAllRanges();s.addRange(r);$('#copy-status').textContent='Скопируйте выделенный текст и вставьте в Telegram.';}});
if('IntersectionObserver' in window){
 const reveal=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.remove('pending');reveal.unobserve(e.target);}},{threshold:.07,rootMargin:'0px 0px -25px 0px'});
 $$('.section-heading,.service-card,.benefit,.process-step,.term-card,.request-copy,.request-panel,.faq-grid>div,.about-grid>div').forEach((el,i)=>{el.classList.add('reveal');el.style.setProperty('--delay',(i%3)*65+'ms');if(!paused&&el.getBoundingClientRect().top>window.innerHeight){el.classList.add('pending');reveal.observe(el);}});
 const navObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){$$('.desktop-nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+e.target.id));}});},{rootMargin:'-15% 0px -65% 0px',threshold:0});
 $$('section[id]').forEach(s=>navObserver.observe(s));
}
if(matchMedia('(hover: hover) and (pointer: fine)').matches){$$('.glow-card').forEach(card=>{card.addEventListener('pointermove',e=>{if(paused)return;const r=card.getBoundingClientRect();card.style.setProperty('--px',(e.clientX-r.left)+'px');card.style.setProperty('--py',(e.clientY-r.top)+'px');});});}
let ticking=false;
function onScroll(){const y=window.scrollY,range=document.documentElement.scrollHeight-innerHeight;$('.reading-progress').style.transform='scaleX('+(range>0?Math.min(1,y/range):0)+')';$('.site-header').classList.toggle('scrolled',y>30);const rect=$('#request').getBoundingClientRect(),inRequest=rect.top<innerHeight&&rect.bottom>0;$('.mobile-cta').classList.toggle('visible',y>650&&!inRequest);ticking=false;}
addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(onScroll);ticking=true;}},{passive:true});addEventListener('resize',onScroll);onScroll();
if(navigator.modelContext?.registerTool){try{navigator.modelContext.registerTool({name:'prepare_payment_request',description:'Prepares the East-Gade payment request form for user review. Never sends a message or payment.',inputSchema:{type:'object',properties:{service:{type:'string',enum:Object.keys(names)},amount_cny:{type:'number',minimum:1}},required:['service']},execute:async args=>{if(!names[args.service])throw Error('Unsupported payment service');configureRequest(args.service,Number.isFinite(args.amount_cny)&&args.amount_cny>0?String(args.amount_cny):'');return{content:[{type:'text',text:'Request prepared for review. No message or payment was sent.'}]};}});}catch{}}
