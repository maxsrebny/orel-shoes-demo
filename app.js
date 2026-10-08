/* ЛеВита — кликабельный прототип Telegram Mini App (Вариант 2 «Клуб салона»).
   Три роли: покупательница (по умолчанию), персонал (PIN 1111), кабинет владелицы (из меню персонала).
   Без сервера: состояние хранится в браузере, кнопка «Сбросить демо» в профиле. */
(function () {
  'use strict';
  const D = window.LEVITA_DATA;
  const KEY = 'levita-demo-v1';
  const BOT = new URLSearchParams(location.search).get('bot') || 'orel_shoes_demo_bot';
  const TGW = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  const inTG = !!(TGW && TGW.initDataUnsafe && TGW.initDataUnsafe.user);
  const tg = inTG ? TGW : null;
  const tgUser = inTG ? TGW.initDataUnsafe.user : null;
  const ME = 'c1';

  /* ---------- состояние ---------- */
  const clone = o => JSON.parse(JSON.stringify(o));
  function fresh() {
    const stock = {}; D.models.forEach(m => { stock[m.id] = clone(m.stock); });
    const cb = {}; D.clients.forEach(c => { cb[c.id] = c.balance; });
    return {
      v: 1, theme: 'auto', role: 'customer', staffOk: false, mySize: D.me.shoe, consentAds: true, fav: [3, 7],
      bookings: clone(D.bookings), waitlist: clone(D.waitlist), lost: clone(D.lostDemand), ops: clone(D.ops || D.me.ops),
      balance: D.me.balance, spent: D.me.spent, inbox: clone(D.inbox), inboxRead: 0, stock, cb, linked: [],
      mailingApproved: false, rsvp: false, filter: 'all', q: '', newSeg: 'arrivals', ownerPeriod: 'week', sel: {}, photoIdx: {}
    };
  }
  let S = load();
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return s; } catch (e) {} return fresh(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  /* ---------- утилиты ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
  const num = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const M = id => D.models.find(m => m.id === +id);
  const C = id => D.clients.find(c => c.id === id);
  const photo = (m, i) => 'assets/' + m.photos[i || 0] + '.jpg';
  const levelOf = spent => D.levels.slice().reverse().find(l => spent >= l.from);
  const pctOf = name => (D.levels.find(l => l.name === name) || D.levels[0]).pct;
  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return n + ' ' + (m10 === 1 && m100 !== 11 ? a : (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c)); };
  const myName = () => tgUser && tgUser.first_name ? tgUser.first_name : 'Анна';
  const isShoes = m => m.cat === 'shoes';
  const stockOf = (m, s) => S.stock[m.id] ? (S.stock[m.id][s] || 0) : 0;
  function sizeState(m, s) { const n = stockOf(m, s); return n === 0 ? 'none' : (n === 1 ? 'last' : 'ok'); }
  function availText(m) {
    if (!isShoes(m)) { const n = stockOf(m, 'one'); return n ? plural(n, 'штука', 'штуки', 'штук') : 'нет в наличии'; }
    const have = D.SIZES.filter(s => stockOf(m, s) > 0);
    if (!have.length) return 'нет в наличии';
    if (have.length === 1) return 'только ' + have[0];
    const mine = stockOf(m, S.mySize) > 0 ? ' · <b>' + S.mySize + ' есть</b>' : '';
    return have[0] + '–' + have[have.length - 1] + mine;
  }
  const lastPair = m => isShoes(m) ? D.SIZES.some(s => stockOf(m, s) === 1) && D.SIZES.filter(s => stockOf(m, s) > 0).length <= 2 : stockOf(m, 'one') === 1;
  const isNew = m => m.arrived <= 3;
  const myBookings = () => S.bookings.filter(b => b.client === ME);
  const myWait = () => S.waitlist.filter(w => w.client === ME);
  const unread = () => Math.max(0, S.inbox.length - S.inboxRead);
  function pushInbox(text, link) { S.inbox.unshift({ date: 'сейчас', text, link: link || '' }); }
  function haptic(t) { if (!tg || !tg.HapticFeedback) return; try { if (t === 'success' || t === 'error' || t === 'warning') tg.HapticFeedback.notificationOccurred(t); else tg.HapticFeedback.impactOccurred(t || 'light'); } catch (e) {} }

  /* ---------- тема и Telegram ---------- */
  function night() { if (S.theme === 'night') return true; if (S.theme === 'day') return false; if (tg) return tg.colorScheme === 'dark'; return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; }
  function applyTheme() {
    const n = night();
    if (n) document.documentElement.setAttribute('data-theme', 'night'); else document.documentElement.removeAttribute('data-theme');
    const bg = n ? '#17120F' : '#FBF9F6';
    document.querySelector('meta[name=theme-color]').setAttribute('content', bg);
    if (tg) { try { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); if (tg.setBottomBarColor) tg.setBottomBarColor(bg); } catch (e) {} }
  }
  function tgInit() {
    if (!TGW) return;
    try {
      TGW.ready(); TGW.expand();
      if (inTG) {
        document.body.classList.add('in-tg');
        if (TGW.isVersionAtLeast('7.7') && TGW.disableVerticalSwipes) TGW.disableVerticalSwipes();
        if (TGW.isVersionAtLeast('8.0') && !TGW.isFullscreen && TGW.requestFullscreen) { try { TGW.requestFullscreen(); } catch (e) {} }
        TGW.BackButton.onClick(() => { if (!document.getElementById('overlay').hidden) closeSheet(); else goBack(); });
        TGW.onEvent('themeChanged', () => { applyTheme(); render(); });
      }
    } catch (e) {}
  }
  function tgBack(show) { if (!tg) return; try { show ? tg.BackButton.show() : tg.BackButton.hide(); } catch (e) {} }
  function openLink(url) { if (tg && tg.openLink) tg.openLink(url); else window.open(url, '_blank'); }
  function shareText(text, url) {
    const link = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text);
    if (tg && tg.openTelegramLink) { tg.openTelegramLink(link); return; }
    if (navigator.share) { navigator.share({ text, url }).catch(() => {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + url).then(() => toast('Ссылка скопирована')).catch(() => toast('Скопируйте: ' + url));
  }
  function scanQR(cb) {
    if (tg && tg.showScanQrPopup && tg.isVersionAtLeast('6.4')) { tg.showScanQrPopup({ text: 'Наведите камеру на карту клиентки' }, txt => { cb(txt); return true; }); return; }
    openSheet(`<div class="grip"></div><h3>Сканер работает в Telegram</h3><p class="small muted">В браузере введите номер карты или телефон вручную.</p><div class="input"><input id="scan-in" placeholder="460252881380" inputmode="numeric"></div><button class="btn btn-primary btn-block" data-act="scan-manual">Найти</button>`);
  }

  /* ---------- роутер ---------- */
  const ROOTS = { customer: ['#/catalog', '#/new', '#/club', '#/profile'], staff: ['#/staff/today', '#/staff/clients', '#/staff/stock', '#/staff/more'] };
  function route() { const h = location.hash || '#/catalog'; return h.replace(/^#\/?/, '').split('/'); }
  function nav(h) { if (location.hash === h) { render(); return; } location.hash = h; }
  function goBack() { const r = route(); if (r[0] === 'model' || r[0] === 'inbox') nav(S.role === 'staff' ? '#/staff/stock' : '#/catalog'); else if (r[0] === 'owner') nav('#/staff/more'); else nav(ROOTS[S.role][0]); }
  function isRoot() { return ROOTS[S.role].includes(location.hash || '#/catalog'); }
  window.addEventListener('hashchange', render);

  /* ---------- общие куски ---------- */
  const ICONS = {
    grid: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
    spark: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l2.2 5.4L20 10l-5.8 1.6L12 17l-2.2-5.4L4 10l5.8-1.6z"/></svg>',
    card: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/></svg>',
    user: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/></svg>',
    today: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="15" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    users: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 19c1-3.2 3.5-5 6.5-5s5.5 1.8 6.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5c2.7 0 4.8 1.5 5.7 4.5"/></svg>',
    box: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/></svg>',
    more: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/></svg>'
  };
  function tabbar() {
    const h = location.hash || '#/catalog';
    const tabs = S.role === 'staff'
      ? [['#/staff/today', ICONS.today, 'Сегодня'], ['#/staff/clients', ICONS.users, 'Клиентки'], ['#/staff/stock', ICONS.box, 'Наличие'], ['#/staff/more', ICONS.more, 'Ещё']]
      : [['#/catalog', ICONS.grid, 'Каталог'], ['#/new', ICONS.spark, 'Новинки'], ['#/club', ICONS.card, 'Клуб'], ['#/profile', ICONS.user, 'Профиль']];
    return tabs.map(t => `<button class="tab ${h === t[0] ? 'is-active' : ''}" data-act="nav" data-to="${t[0]}">${t[1]}${t[2]}</button>`).join('');
  }
  function topbar(left, title, right) { return `<header class="topbar">${left || '<span></span>'}<div class="title ${/wordmark|display/.test(title) ? '' : ''}">${title}</div>${right || '<span></span>'}</header>`; }
  const backBtn = () => `<button class="icon-btn" data-act="back" aria-label="Назад">‹</button>`;
  const wm = size => `<span class="wordmark" style="font-size:${size || 15}px">Левита</span>`;
  function tile(m) {
    const badge = lastPair(m) ? '<span class="badge badge-accent">Последняя пара</span>' : (isNew(m) ? '<span class="badge">Новинка</span>' : '');
    return `<a class="tile" href="#/model/${m.id}"><div class="ph"><img src="${photo(m)}" alt="" loading="lazy">${badge}</div><div class="name">${esc(m.name)}</div><div class="meta"><span class="price">${fmt(m.price)}</span><span class="sizes-mini">${availText(m)}</span></div></a>`;
  }
  const pill = (cls, t) => `<span class="pill ${cls}">${t}</span>`;
  const statusPill = b => ({ pending: pill('pill-warn', 'Ждёт ответа'), held: pill('pill-ok', 'Отложено'), done: pill('pill-neutral', 'Куплено'), cancelled: pill('pill-danger', 'Снято') }[b.status] || '');

  /* ---------- экраны покупательницы ---------- */
  function vCatalog() {
    const q = S.q.trim().toLowerCase();
    let list = D.models.filter(m => {
      if (S.filter === 'shoes' && !isShoes(m)) return false;
      if (S.filter === 'bags' && isShoes(m)) return false;
      if (S.filter === 'new' && !isNew(m)) return false;
      if (S.filter === 'mine' && !(isShoes(m) && stockOf(m, S.mySize) > 0)) return false;
      if (q && !(m.name + ' ' + m.type + ' ' + m.color + ' ' + m.material).toLowerCase().includes(q)) return false;
      return true;
    });
    const chips = [['all', 'Все'], ['shoes', 'Обувь'], ['bags', 'Сумки'], ['new', 'Новинки'], ['mine', 'Мой размер ' + S.mySize]];
    const n = unread();
    return topbar(`<button class="icon-btn" data-act="search-toggle" aria-label="Поиск">⌕</button>`, wm(16), `<button class="icon-btn bell" data-act="nav" data-to="#/inbox" aria-label="Сообщения">${ICONS.spark.replace('class="ico"', 'class="ico" style="width:20px;height:20px"')}${n ? `<span class="n">${n}</span>` : ''}</button>`) +
      `<div class="screen">
        ${S.searchOpen ? `<div class="input"><span>⌕</span><input id="q" placeholder="Модель, цвет, материал" value="${esc(S.q)}" data-live="q"></div>` : ''}
        <div class="filters">${chips.map(c => `<span class="chip ${S.filter === c[0] ? 'is-active' : ''}" data-act="filter" data-f="${c[0]}">${c[1]}</span>`).join('')}</div>
        <div class="between"><h2>${S.filter === 'new' ? 'Новинки' : S.filter === 'bags' ? 'Сумки' : S.filter === 'mine' ? 'В вашем размере' : 'Каталог'}</h2><span class="caption">${plural(list.length, 'модель', 'модели', 'моделей')}</span></div>
        ${list.length ? `<div class="grid-2">${list.map(tile).join('')}</div>` : `<div class="empty"><h3>Ничего не нашли</h3><p class="small">Попробуйте другое слово или снимите фильтр.</p></div>`}
      </div>`;
  }
  function vModel(id) {
    const m = M(id); if (!m) return topbar(backBtn(), 'Модель', '') + '<div class="empty"><h3>Модель не найдена</h3></div>';
    const idx = S.photoIdx[m.id] || 0;
    const sel = S.sel[m.id];
    const fav = S.fav.includes(m.id);
    const myB = myBookings().find(b => b.model === m.id && (b.status === 'pending' || b.status === 'held'));
    const myW = myWait().find(w => w.model === m.id);
    let sizes = '', cta = '';
    if (isShoes(m)) {
      sizes = `<div class="sizes pick">${D.SIZES.map(s => { const st = sizeState(m, s); return `<button class="size ${st === 'last' ? 'is-last' : ''} ${st === 'none' ? 'is-none' : ''} ${s === S.mySize ? 'is-mine' : ''} ${sel === s ? 'is-selected' : ''}" data-act="pick" data-m="${m.id}" data-s="${s}">${s}</button>`; }).join('')}</div>
        <div class="size-legend">${D.SIZES.filter(s => sizeState(m, s) === 'last').length ? `<span><i></i>${D.SIZES.filter(s => sizeState(m, s) === 'last').join(', ')} — последняя пара</span>` : ''}${stockOf(m, S.mySize) > 0 ? `<span>${S.mySize} — ваш размер, есть в салоне</span>` : `<span>${S.mySize} — вашего размера сейчас нет</span>`}</div>`;
      if (myB) cta = `<div class="card card-soft"><div class="between"><div><div class="label">Ваша бронь · ${myB.size}</div><div class="small">${myB.status === 'held' ? 'Пара ждёт вас ' + esc(myB.until) : 'Продавец подтвердит в течение 30 минут'}</div></div>${statusPill(myB)}</div></div>`;
      else if (!sel) cta = `<button class="btn btn-primary btn-block" disabled>Выберите размер</button>`;
      else if (sizeState(m, sel) === 'none') cta = myW && myW.size === sel ? `<button class="btn btn-secondary btn-block" disabled>Сообщим, когда появится ${sel}</button>` : `<button class="btn btn-primary btn-block" data-act="wait-ask" data-m="${m.id}" data-s="${sel}">Сообщить, когда появится ${sel}</button>`;
      else cta = `<button class="btn btn-primary btn-block" data-act="book-ask" data-m="${m.id}" data-s="${sel}">Отложить на примерку · ${sel}</button>`;
    } else {
      const n = stockOf(m, 'one');
      sizes = `<p class="small muted">${n ? 'В наличии: ' + plural(n, 'штука', 'штуки', 'штук') : 'Сейчас нет в наличии'}</p>`;
      cta = n ? (myB ? `<div class="card card-soft"><div class="between"><div><div class="label">Ваша бронь</div><div class="small">${myB.status === 'held' ? 'Ждёт вас ' + esc(myB.until) : 'Продавец подтвердит в течение 30 минут'}</div></div>${statusPill(myB)}</div></div>` : `<button class="btn btn-primary btn-block" data-act="book-ask" data-m="${m.id}" data-s="one">Отложить до завтра</button>`) : `<button class="btn btn-primary btn-block" data-act="wait-ask" data-m="${m.id}" data-s="one">Сообщить, когда появится</button>`;
    }
    const similar = D.models.filter(x => x.id !== m.id && x.cat === m.cat && (x.type === m.type || x.color === m.color)).slice(0, 2);
    return topbar(backBtn(), isNew(m) ? 'Новинки' : 'Каталог', `<button class="icon-btn" data-act="fav" data-m="${m.id}" aria-label="В избранное">${fav ? '♥' : '♡'}</button>`) +
      `<div class="hero" data-act="photo-next" data-m="${m.id}"><img class="fade-in" src="${photo(m, idx)}" alt="">${lastPair(m) ? '<span class="badge badge-accent">Последняя пара</span>' : (isNew(m) ? '<span class="badge">Новинка</span>' : '')}${m.photos.length > 1 ? `<div class="dots">${m.photos.map((p, i) => `<i class="${i === idx ? 'is-on' : ''}"></i>`).join('')}</div>` : ''}</div>
      <div class="screen">
        ${m.photos.length > 1 ? `<div class="thumbs">${m.photos.map((p, i) => `<button class="${i === idx ? 'is-active' : ''}" style="background-image:url('assets/${p}.jpg')" data-act="photo" data-m="${m.id}" data-i="${i}" aria-label="Фото ${i + 1}"></button>`).join('')}</div>` : ''}
        <div><h1>${esc(m.name)}</h1><p class="small muted">Италия · ${esc(m.material)}${m.heel ? ' · ' + esc(m.heel) : ''}${m.fit ? ' · ' + esc(m.fit) : ''}</p></div>
        <div class="between"><span class="price" style="font-size:22px">${fmt(m.price)}</span><span class="caption">цвет: ${esc(m.color)} · арт. 26-${String(1100 + m.id)}</span></div>
        ${sizes}
        ${cta}
        <div class="cluster"><button class="btn btn-secondary btn-sm" data-act="ask" data-m="${m.id}">Спросить продавца</button><button class="btn btn-secondary btn-sm" data-act="share-model" data-m="${m.id}">Поделиться</button></div>
        <p class="caption">Пара ждёт вас до конца следующего дня. Оплата в салоне, бонусы клуба на кассе.</p>
        ${similar.length ? `<div class="divider"></div><h3>Похожие в салоне</h3><div class="grid-2">${similar.map(tile).join('')}</div>` : ''}
      </div>`;
  }
  function vNew() {
    const groups = [['Привезли сегодня', m => m.arrived === 0], ['Вчера', m => m.arrived === 1], ['На этой неделе', m => m.arrived >= 2 && m.arrived <= 7]];
    const mine = S.newSeg === 'mine';
    const body = groups.map(g => { const list = D.models.filter(m => g[1](m) && (!mine || (isShoes(m) && stockOf(m, S.mySize) > 0))); if (!list.length) return ''; return `<div class="between"><h3>${g[0]}</h3><span class="caption">${plural(list.length, 'модель', 'модели', 'моделей')}</span></div><div class="grid-2">${list.map(tile).join('')}</div>`; }).join('');
    return topbar('<span></span>', '<span class="display" style="font-size:20px">Новинки</span>', `<button class="icon-btn bell" data-act="nav" data-to="#/inbox" aria-label="Сообщения">${ICONS.spark.replace('class="ico"', 'class="ico" style="width:20px;height:20px"')}${unread() ? `<span class="n">${unread()}</span>` : ''}</button>`) +
      `<div class="screen">
        <div class="segmented"><button class="${!mine ? 'is-active' : ''}" data-act="newseg" data-v="arrivals">Все поступления</button><button class="${mine ? 'is-active' : ''}" data-act="newseg" data-v="mine">В моём размере · ${S.mySize}</button></div>
        <div class="card"><div class="between"><div><div class="label">Для клуба</div><h3>Закрытый показ коллекции</h3><p class="small muted">18 октября, 18:00 · примерка новых сапог до выхода в зал, бонусы ×2 на покупки вечера</p></div></div><div class="cluster" style="margin-top:10px"><button class="btn ${S.rsvp ? 'btn-secondary' : 'btn-primary'} btn-sm" data-act="rsvp">${S.rsvp ? 'Вы придёте ✓' : 'Приду'}</button><span class="caption">уже 14 гостей</span></div></div>
        ${body || '<div class="empty"><h3>Пока ничего нового</h3><p class="small">Как только привезут, напишем в Telegram.</p></div>'}
      </div>`;
  }
  function vClub() {
    const lvl = levelOf(S.spent); const next = D.levels.find(l => l.from > S.spent);
    const bw = myBookings().filter(b => b.status !== 'cancelled'), ww = myWait();
    return topbar('<span></span>', '<span class="display" style="font-size:20px">Клуб</span>', `<button class="icon-btn" data-act="rules" aria-label="Правила">?</button>`) +
      `<div class="screen">
        <div class="wordmark" style="font-size:18px;text-align:center">Левита<small>Салон обуви</small></div>
        <div class="club-card">
          <div class="level">${lvl.name} · ${lvl.pct} % бонусами</div>
          <div class="balance num">${num(S.balance)}<small>${plural(S.balance, 'бонус', 'бонуса', 'бонусов').replace(/^\d+\s/, '')}</small></div>
          <div class="expiry">${D.me.expiring ? num(D.me.expiring.sum) + ' сгорят ' + D.me.expiring.date : 'сгораний в ближайший месяц нет'}${next ? ' · до уровня «' + next.name + '» ' + fmt(next.from - S.spent) : ''}</div>
          <div class="qrbox" data-qrtext="${esc(D.me.card)}" data-qrsize="148"></div>
          <div class="caption" style="text-align:center">Карта ${esc(D.me.card)} · покажите на кассе или назовите телефон</div>
          <button class="btn btn-primary btn-block" data-act="card-big">Показать на кассе</button>
        </div>
        <div class="card"><div class="between"><h3>Брони и запросы</h3><span class="caption">${bw.length + ww.length}</span></div><div class="list">
          ${bw.map(b => { const m = M(b.model); return `<div class="row"><img class="thumb" src="${photo(m)}" alt=""><div><div class="title">${esc(m.name)}${isShoes(m) ? ' · ' + b.size : ''}</div><div class="sub">${b.status === 'held' ? 'ждёт вас ' + esc(b.until) : b.status === 'pending' ? 'продавец подтвердит в течение 30 минут' : b.status === 'done' ? 'куплено' : ''}</div></div>${statusPill(b)}</div>`; }).join('')}
          ${ww.map(w => { const m = M(w.model); return `<div class="row"><img class="thumb" src="${photo(m)}" alt=""><div><div class="title">${esc(m.name)}${isShoes(m) ? ' · ' + w.size : ''}</div><div class="sub">${w.notified ? 'размер появился в салоне' : 'сообщим, когда появится'}</div></div>${w.notified ? pill('pill-ok', 'Появился') : pill('pill-neutral', 'Ждём')}</div>`; }).join('')}
          ${!bw.length && !ww.length ? '<div class="empty"><h3>Пока пусто</h3><p class="small">Отложите пару в карточке модели — она появится здесь.</p></div>' : ''}
        </div></div>
        <div class="card"><div class="between"><h3>Пригласить подругу</h3></div><p class="small muted" style="margin:6px 0 10px">Подруга получит 500 бонусов на первую покупку, вы — 500 после неё.</p><button class="btn btn-secondary btn-block" data-act="share-ref">Отправить приглашение</button></div>
        <div class="card ops"><div class="between"><h3>История бонусов</h3></div><div class="list">${S.ops.map(o => `<div class="row row-plain"><div><div class="title">${esc(o.title)}</div><div class="sub">${esc(o.date)} · ${esc(o.note)}</div></div><span class="sum ${o.sum > 0 ? 'plus' : 'minus'}">${o.sum > 0 ? '+' : '−'}${num(Math.abs(o.sum))}</span></div>`).join('')}</div></div>
      </div>`;
  }
  function vInbox() {
    S.inboxRead = S.inbox.length; save();
    return topbar(backBtn(), 'Сообщения салона', '') + `<div class="screen inbox"><p class="caption">Так выглядят сообщения бота в Telegram: статусы броней, поступления вашего размера, бонусы. Рекламные — только с вашего согласия.</p><div class="card"><div class="list">${S.inbox.map(i => `<div class="row"><div><div class="sub">${esc(i.date)}</div><div class="title" style="font-weight:400;margin-top:2px">${esc(i.text)}</div>${i.link ? `<a class="linkish small" href="${esc(i.link)}">Открыть →</a>` : ''}</div></div>`).join('')}</div></div></div>`;
  }
  function vProfile() {
    return topbar('<span></span>', '<span class="display" style="font-size:20px">Профиль</span>', '') +
      `<div class="screen">
        <div class="card"><div class="greeting"><div><h2>${esc(myName())}</h2><p class="small muted">${esc(D.me.phone)} · в клубе с мая 2026</p></div><span class="pill pill-neutral">${levelOf(S.spent).name}</span></div></div>
        <div class="card stack"><div class="between"><h3>Мой размер</h3><span class="caption">подсвечиваем в каталоге</span></div><div class="sizes pick">${D.SIZES.map(s => `<button class="size ${S.mySize === s ? 'is-selected' : ''}" data-act="mysize" data-s="${s}">${s}</button>`).join('')}</div><p class="caption">По брендам: Италия — ${S.mySize}, замша маломерит — берите ${S.mySize + 1}. Продавец уточнит после примерки.</p></div>
        <div class="card stack"><h3>Тема</h3><div class="segmented">${[['auto', 'Как в Telegram'], ['day', 'День'], ['night', 'Ночь']].map(t => `<button class="${S.theme === t[0] ? 'is-active' : ''}" data-act="theme" data-v="${t[0]}">${t[1]}</button>`).join('')}</div></div>
        <div class="card"><div class="list">
          <div class="row row-plain"><div><div class="title">Статусы броней и бонусов</div><div class="sub">сервисные сообщения, всегда включены</div></div><button class="switch on" disabled aria-label="Включено"></button></div>
          <div class="row row-plain"><div><div class="title">Новинки и закрытые показы</div><div class="sub">рекламные сообщения, отдельное согласие</div></div><button class="switch ${S.consentAds ? 'on' : ''}" data-act="consent" aria-label="Согласие на рассылки"></button></div>
          <div class="row row-plain"><div><div class="title">Избранное</div><div class="sub">${plural(S.fav.length, 'модель', 'модели', 'моделей')}</div></div><button class="btn btn-secondary btn-sm" data-act="nav" data-to="#/catalog">Открыть</button></div>
          <div class="row row-plain"><div><div class="title">Оставить отзыв о салоне</div><div class="sub">Яндекс Карты или 2ГИС</div></div><button class="btn btn-secondary btn-sm" data-act="review">Открыть</button></div>
        </div></div>
        <div class="card"><div class="list">
          <div class="row row-plain"><div><div class="title">Для персонала</div><div class="sub">вход по PIN</div></div><button class="btn btn-secondary btn-sm" data-act="pin">Войти</button></div>
          <div class="row row-plain"><div><div class="title">Как смотреть демо</div><div class="sub">сценарий на 5 минут</div></div><button class="btn btn-secondary btn-sm" data-act="guide">Показать</button></div>
          <div class="row row-plain"><div><div class="title">Сбросить демо</div><div class="sub">вернуть исходные данные</div></div><button class="btn btn-secondary btn-sm" data-act="reset">Сбросить</button></div>
        </div></div>
        <p class="caption">ЛеВита · прототип 0.1 · ${inTG ? 'Telegram ' + esc(TGW.platform) + ' ' + esc(TGW.version) : 'браузер'} · данные вымышленные</p>
      </div>`;
  }

  /* ---------- экраны персонала ---------- */
  function guardStaff() { if (!S.staffOk) { nav('#/profile'); setTimeout(() => openPin(), 50); return false; } return true; }
  function vStaffToday() {
    const pend = S.bookings.filter(b => b.status === 'pending'), held = S.bookings.filter(b => b.status === 'held'), wl = S.waitlist.filter(w => !w.notified);
    const bk = S.bookings.filter(b => b.status === 'pending' || b.status === 'held').sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1));
    return topbar('<span></span>', '<span class="display" style="font-size:20px">Сегодня, среда</span>', '<span class="staff-badge" style="padding-right:8px">персонал</span>') +
      `<div class="screen">
        <div class="summary"><div class="kpi"><div class="v num">${pend.length}</div><div class="k">ждут ответа</div></div><div class="kpi"><div class="v num">${held.length}</div><div class="k">отложено</div></div><div class="kpi"><div class="v num">${wl.length}</div><div class="k">запросов на размер</div></div></div>
        <div class="card"><div class="between"><h3>Брони</h3><button class="btn btn-ghost btn-sm" data-act="lost-ask">Не было размера</button></div><div class="list">
          ${bk.map(b => { const m = M(b.model), c = C(b.client); return `<div class="row ${b.status === 'pending' ? 'is-pending' : ''}"><img class="thumb" src="${photo(m)}" alt=""><div><div class="title">${esc(c.name)} · ${esc(m.name)}${isShoes(m) ? ' · ' + b.size : ''}</div><div class="sub">${b.status === 'pending' ? 'запрос ' + esc(b.created) : 'отложено до ' + esc(b.until)}</div><div class="act" style="margin-top:6px">${b.status === 'pending' ? `<button class="btn btn-primary" data-act="b-confirm" data-id="${b.id}">Подтвердить</button><button class="btn btn-secondary" data-act="b-notfound" data-id="${b.id}">Не нашли</button>` : `<button class="btn btn-primary" data-act="b-done" data-id="${b.id}">Куплена</button><button class="btn btn-secondary" data-act="b-release" data-id="${b.id}">Снять</button>`}</div></div>${statusPill(b)}</div>`; }).join('') || '<div class="empty"><h3>Броней нет</h3></div>'}
        </div></div>
        <div class="card"><div class="between"><h3>Запросы на размер</h3><span class="caption">лист ожидания</span></div><div class="list">
          ${wl.map(w => { const m = M(w.model), c = C(w.client); return `<div class="row"><img class="thumb" src="${photo(m)}" alt=""><div><div class="title">${esc(c.name)} · ${esc(m.name)} · ${w.size}</div><div class="sub">ждёт с ${esc(w.created)} · сейчас ${stockOf(m, w.size) ? 'есть ' + stockOf(m, w.size) : 'нет'}</div></div><button class="btn btn-secondary btn-sm" data-act="arrive" data-m="${m.id}" data-s="${w.size}">Пришёл</button></div>`; }).join('') || '<div class="empty"><h3>Запросов нет</h3><p class="small">Когда клиентка нажмёт «Сообщить, когда появится», запрос появится здесь.</p></div>'}
        </div></div>
      </div>`;
  }
  function vStaffClients() {
    const q = (S.cq || '').toLowerCase();
    const list = D.clients.filter(c => !q || (c.name + c.phone + c.card).toLowerCase().includes(q));
    return topbar('<span></span>', '<span class="display" style="font-size:20px">Клиентки</span>', `<button class="icon-btn" data-act="scan" aria-label="Сканировать QR">▣</button>`) +
      `<div class="screen">
        <div class="input"><span>⌕</span><input placeholder="Имя, телефон или номер карты" value="${esc(S.cq || '')}" data-live="cq"></div>
        <button class="btn btn-secondary btn-block" data-act="scan">Сканировать карту клиентки</button>
        <div class="card"><div class="list">${list.map(c => `<div class="row row-plain" data-act="client" data-id="${c.id}" style="cursor:pointer"><div><div class="title">${esc(c.name)} <span class="caption">· ${esc(c.phone)}</span></div><div class="sub">${c.level} · размер ${c.sizes.shoe} · была ${esc(c.last)}</div></div><span class="price num">${num(S.cb[c.id])}</span></div>`).join('')}</div></div>
      </div>`;
  }
  function vStaffStock() {
    const q = (S.sq || '').toLowerCase();
    const list = D.models.filter(m => !q || (m.name + m.type + m.color).toLowerCase().includes(q));
    return topbar('<span></span>', '<span class="display" style="font-size:20px">Наличие</span>', '') +
      `<div class="screen">
        <div class="input"><span>⌕</span><input placeholder="Модель, тип или цвет" value="${esc(S.sq || '')}" data-live="sq"></div>
        <p class="caption">Остатки из МойСклада · обновлено 4 минуты назад · приёмка и инвентаризация — в МойСкладе</p>
        <div class="card"><div class="list">${list.map(m => { const total = isShoes(m) ? D.SIZES.reduce((a, s) => a + stockOf(m, s), 0) : stockOf(m, 'one'); return `<div class="row" data-act="stock" data-m="${m.id}" style="cursor:pointer"><img class="thumb" src="${photo(m)}" alt=""><div><div class="title">${esc(m.name)}</div><div class="sub">${isShoes(m) ? availText(m).replace(/<[^>]+>/g, '') : ''}${isShoes(m) ? ' · ' : ''}${plural(total, 'пара', 'пары', 'пар').replace(/пар[аы]?$/, total === 1 ? 'шт.' : 'шт.')}</div></div><span class="price num">${total}</span></div>`; }).join('')}</div></div>
      </div>`;
  }
  function vStaffMore() {
    const lost = S.lost.slice().sort((a, b) => b.count - a.count);
    return topbar('<span></span>', '<span class="display" style="font-size:20px">Ещё</span>', '') +
      `<div class="screen">
        <div class="card"><div class="between"><h3>Упущенный спрос</h3><span class="caption">за 30 дней</span></div><table class="table"><thead><tr><th>Модель</th><th>Размер</th><th class="num">Раз</th><th>Когда</th></tr></thead><tbody>${lost.map(l => `<tr><td>${esc(M(l.model).name)}</td><td>${l.size}</td><td class="num">${l.count}</td><td>${esc(l.last)}</td></tr>`).join('')}</tbody></table><p class="caption" style="margin-top:8px">Продавец фиксирует отказ кнопкой «Не было размера». Владелица видит, что дозаказать.</p></div>
        <div class="card"><div class="list">
          <div class="row row-plain"><div><div class="title">Кабинет владелицы</div><div class="sub">выручка, клуб, брони, дайджест</div></div><button class="btn btn-secondary btn-sm" data-act="nav" data-to="#/owner">Открыть</button></div>
          <div class="row row-plain"><div><div class="title">Приёмка и инвентаризация</div><div class="sub">открывается МойСклад</div></div><button class="btn btn-secondary btn-sm" data-act="toast" data-t="В прототипе: открылся бы МойСклад">Открыть</button></div>
          <div class="row row-plain"><div><div class="title">Выйти из режима персонала</div><div class="sub">вернуться к экрану покупательницы</div></div><button class="btn btn-secondary btn-sm" data-act="staff-exit">Выйти</button></div>
        </div></div>
      </div>`;
  }
  function vOwner() {
    const w = D.week; const rev = w.reduce((a, d) => a + d.rev, 0), checks = w.reduce((a, d) => a + d.checks, 0), club = w.reduce((a, d) => a + d.club, 0);
    const max = Math.max(...w.map(d => d.rev));
    const lost = S.lost.slice().sort((a, b) => b.count - a.count).slice(0, 4);
    const doneB = S.bookings.filter(b => b.status === 'done').length + 8, allB = S.bookings.length + 10;
    return topbar(backBtn(), '<span class="display" style="font-size:20px">Кабинет владелицы</span>', '') +
      `<div class="screen">
        <div class="segmented">${[['today', 'Сегодня'], ['week', 'Неделя'], ['month', 'Месяц']].map(t => `<button class="${S.ownerPeriod === t[0] ? 'is-active' : ''}" data-act="period" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>
        <div class="kpis">
          <div class="kpi"><div class="v">${num(rev)} тыс. ₽</div><div class="k">выручка · МойСклад</div><div class="d">+12 % к прошлой неделе</div></div>
          <div class="kpi"><div class="v">${checks}</div><div class="k">чеков · средний ${num(rev / checks * 1000)} ₽</div></div>
          <div class="kpi"><div class="v">${Math.round(club / checks * 100)} %</div><div class="k">чеков по карте клуба</div><div class="d">+6 п. п.</div></div>
          <div class="kpi"><div class="v">${Math.round(doneB / allB * 100)} %</div><div class="k">броней стали покупками · ${doneB} из ${allB}</div></div>
        </div>
        <div class="card"><div class="between"><h3>Выручка по дням</h3><span class="caption">тыс. ₽</span></div><div class="bars">${w.map(d => { const h = Math.round(d.rev / max * 96); return `<div><b style="height:${h}px"><i style="height:${Math.round(h * d.club / d.checks)}px"></i></b><span>${d.d}</span></div>`; }).join('')}</div><p class="caption">Тёмная часть столбца — доля чеков по карте клуба.</p></div>
        <div class="card"><div class="between"><h3>Не было размера</h3><span class="caption">топ за 30 дней</span></div><div class="list">${lost.map(l => `<div class="row row-plain"><div><div class="title">${esc(M(l.model).name)} · ${l.size}</div><div class="sub">последний раз ${esc(l.last)}</div></div><span class="pill pill-danger">${l.count} раз</span></div>`).join('')}</div><button class="btn btn-secondary btn-block" style="margin-top:10px" data-act="toast" data-t="В прототипе: сформирована заявка поставщику на 4 позиции">Собрать заявку поставщику</button></div>
        <div class="card"><div class="between"><h3>Клуб</h3></div><div class="list">
          <div class="row row-plain"><div><div class="title">В клубе</div><div class="sub">+38 за неделю, из них 29 из Instagram</div></div><span class="price num">412</span></div>
          <div class="row row-plain"><div><div class="title">Спят больше 90 дней</div><div class="sub">не покупали с июня</div></div><span class="price num">23</span></div>
          <div class="row row-plain"><div><div class="title">Бонусы: начислено / списано</div><div class="sub">за неделю</div></div><span class="price num">21 400 / 8 300</span></div>
        </div></div>
        <div class="card"><div class="label">Дайджест недели · ${S.mailingApproved ? 'рассылка одобрена' : 'ждёт одобрения'}</div><h3 style="margin:6px 0">Привезли 6 моделей 38-го размера</h3><p class="small muted">Предлагаю написать 12 клиенткам с 38-м размером, которые не покупали больше двух месяцев: «В салоне новые лодочки и ботинки вашего размера. Отложить на примерку можно в приложении». Сообщение уйдёт только тем, кто согласился на рассылки.</p><div class="cluster" style="margin-top:10px">${S.mailingApproved ? '<span class="pill pill-ok">Уйдёт сегодня в 12:00</span>' : `<button class="btn btn-primary btn-sm" data-act="approve">Одобрить рассылку</button><button class="btn btn-secondary btn-sm" data-act="toast" data-t="Черновик открыт для правки">Изменить текст</button>`}</div></div>
        <div class="cluster"><button class="btn btn-secondary btn-sm" data-act="toast" data-t="В прототипе: выгрузка в Excel">Экспорт в Excel</button><button class="btn btn-secondary btn-sm" data-act="toast" data-t="В прототипе: открылся бы кабинет «Бонус Плюс»">Правила бонусов</button></div>
      </div>`;
  }

  /* ---------- шторки ---------- */
  function openSheet(html) { const o = document.getElementById('overlay'); document.getElementById('sheet').innerHTML = html; o.hidden = false; tgBack(true); drawQR(); const f = o.querySelector('input'); if (f) setTimeout(() => f.focus(), 60); }
  function closeSheet() { const o = document.getElementById('overlay'); o.hidden = true; o.querySelector('#sheet').innerHTML = ''; tgBack(!isRoot()); }
  function toast(t) { const el = document.getElementById('toast'); el.innerHTML = `<div class="toast">${esc(t)}</div>`; el.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => { el.hidden = true; }, 2600); }
  function openPin() {
    S.pin = '';
    openSheet(`<div class="grip"></div><h3>Вход для персонала</h3><p class="small muted">Демо-PIN 1111. В приложении — своя учётная запись у каждого продавца.</p><div class="pin-dots" id="pin-dots"><i></i><i></i><i></i><i></i></div><div class="pin">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button data-act="pin-key" data-k="${k}">${k}</button>`).join('')}</div>`);
  }
  function openClient(id) {
    const c = C(id); const lvl = c.level;
    openSheet(`<div class="grip"></div><div class="between"><div><h3>${esc(c.name)}</h3><p class="small muted">${esc(c.phone)} · карта ${esc(c.card)}</p></div><span class="pill pill-neutral">${lvl} · ${pctOf(lvl)} %</span></div>
      <div class="club-card" style="padding:14px"><div class="level">Баланс</div><div class="balance num" style="font-size:32px">${num(S.cb[c.id])}<small>бонусов</small></div><div class="expiry">${c.expiring ? num(c.expiring.sum) + ' сгорят ' + c.expiring.date + ' · ' : ''}размер ${c.sizes.shoe} · всего покупок на ${fmt(c.spent)}${c.birthday ? ' · ДР ' + c.birthday : ''}</div></div>
      <div class="cluster"><button class="btn btn-primary btn-sm" data-act="accrue-ask" data-id="${c.id}">Начислить по чеку</button><button class="btn btn-secondary btn-sm" data-act="redeem-ask" data-id="${c.id}">Списать</button><button class="btn btn-secondary btn-sm" data-act="link-ask" data-id="${c.id}">Привязать чек с кассы</button></div>
      <div class="card"><div class="label" style="margin-bottom:6px">Покупки</div><div class="list">${c.purchases.map(p => `<div class="row row-plain"><div><div class="title">${esc(M(p.model).name)}</div><div class="sub">${esc(p.date)}</div></div><span class="price num">${fmt(p.sum)}</span></div>`).join('')}</div></div>
      <p class="caption">Бонусы на кассе Эвотора считает «Бонус Плюс»; здесь продавец видит клиентку, её размеры и брони.</p>`);
  }
  function openStock(mid) {
    const m = M(mid);
    const line = isShoes(m) ? `<div class="stock-line">${D.SIZES.map(s => `<span class="${stockOf(m, s) ? '' : 'zero'}"><b>${s}</b>·${stockOf(m, s)}</span>`).join('')}</div>` : `<p class="small">В наличии: ${stockOf(m, 'one')} шт.</p>`;
    openSheet(`<div class="grip"></div><div class="row" style="border:0;padding:0"><img class="thumb" src="${photo(m)}" alt=""><div><h3>${esc(m.name)}</h3><p class="small muted">${fmt(m.price)} · ${esc(m.color)}</p></div></div>${line}
      ${isShoes(m) ? `<div class="field"><span class="label">Размер</span><div class="sizes pick">${D.SIZES.map(s => `<button class="size ${S.stockSel === s ? 'is-selected' : ''}" data-act="stock-pick" data-m="${m.id}" data-s="${s}">${s}</button>`).join('')}</div></div>` : ''}
      <div class="cluster"><button class="btn btn-primary btn-sm" data-act="arrive" data-m="${m.id}" data-s="${isShoes(m) ? (S.stockSel || '') : 'one'}">Поступление +1</button><button class="btn btn-secondary btn-sm" data-act="lost-add" data-m="${m.id}" data-s="${isShoes(m) ? (S.stockSel || '') : 'one'}">Не было размера</button></div>
      <p class="caption">Поступление в приложении — только для демо: в системе приход делается в МойСкладе, остатки приходят оттуда, а клиентки из листа ожидания получают сообщение сами.</p>`);
  }

  /* ---------- действия ---------- */
  function bookAsk(m, s) {
    openSheet(`<div class="grip"></div><h3>Отложить ${esc(m.name.toLowerCase())}${s !== 'one' ? ', ' + s : ''}?</h3><p class="small muted">Продавец найдёт пару и подтвердит в течение 30 минут. Пара будет ждать вас до конца следующего дня. Оплата в салоне.</p><button class="btn btn-primary btn-block" data-act="book" data-m="${m.id}" data-s="${s}">Отложить</button><button class="btn btn-secondary btn-block" data-act="close">Отмена</button>`);
  }
  function book(m, s) {
    S.bookings.unshift({ id: 'b' + Date.now(), client: ME, model: m.id, size: s === 'one' ? '' : +s, status: 'pending', until: '', created: 'только что' });
    pushInbox('Запрос на примерку принят: ' + m.name + (s !== 'one' ? ', ' + s : '') + '. Продавец подтвердит в течение 30 минут.', '#/club');
    save(); closeSheet(); haptic('success'); toast('Запрос отправлен продавцу'); render();
  }
  function waitAsk(m, s) {
    openSheet(`<div class="grip"></div><h3>Сообщить, когда появится ${s !== 'one' ? s : ''}?</h3><p class="small muted">Напишем в Telegram, как только размер привезут в салон. Продавец увидит, что вы ждёте.</p><button class="btn btn-primary btn-block" data-act="wait" data-m="${m.id}" data-s="${s}">Сообщить</button><button class="btn btn-secondary btn-block" data-act="close">Отмена</button>`);
  }
  function wait(m, s) {
    S.waitlist.unshift({ id: 'w' + Date.now(), client: ME, model: m.id, size: s === 'one' ? '' : +s, created: 'сегодня' });
    pushInbox('Сообщим, когда появится ' + m.name + (s !== 'one' ? ', ' + s : '') + '.', '#/club');
    save(); closeSheet(); haptic('success'); toast('Запрос на размер записан'); render();
  }
  function confirmBooking(id) { const b = S.bookings.find(x => x.id === id); if (!b) return; b.status = 'held'; b.until = 'завтра, 20:00'; if (b.client === ME) pushInbox('Пара отложена: ' + M(b.model).name + (b.size ? ', ' + b.size : '') + '. Ждёт вас в салоне до завтра, 20:00.', '#/club'); save(); haptic('success'); toast('Подтверждено, клиентке ушло сообщение'); render(); }
  function notFound(id) { const b = S.bookings.find(x => x.id === id); if (!b) return; b.status = 'cancelled'; addLost(b.model, b.size); if (b.client === ME) pushInbox('К сожалению, ' + M(b.model).name + (b.size ? ' в ' + b.size : '') + ' сейчас нет. Мы записали ваш размер и сообщим, когда привезём.', '#/club'); if (!S.waitlist.find(w => w.client === b.client && w.model === b.model && w.size === b.size)) S.waitlist.unshift({ id: 'w' + Date.now(), client: b.client, model: b.model, size: b.size, created: 'сегодня' }); save(); haptic('warning'); toast('Отмечено в упущенном спросе, клиентка в листе ожидания'); render(); }
  function doneBooking(id) { const b = S.bookings.find(x => x.id === id); if (!b) return; const m = M(b.model); b.status = 'done'; const key = b.size || 'one'; if (S.stock[m.id][key] > 0) S.stock[m.id][key]--; accrue(b.client, m.price, m.name); save(); haptic('success'); toast('Покупка отмечена, бонусы начислены'); render(); }
  function release(id) { const b = S.bookings.find(x => x.id === id); if (!b) return; b.status = 'cancelled'; if (b.client === ME) pushInbox('Бронь на ' + M(b.model).name + ' снята. Если ещё нужна, отложите заново.', '#/club'); save(); toast('Бронь снята'); render(); }
  function accrue(cid, sum, title) {
    const c = C(cid); const pct = pctOf(c.level); const bonus = Math.round(sum * pct / 100);
    S.cb[cid] = (S.cb[cid] || 0) + bonus;
    if (cid === ME) { S.balance += bonus; S.spent += sum; S.ops.unshift({ date: 'сегодня', title: 'Покупка: ' + (title || 'чек ' + fmt(sum)), sum: bonus, note: pct + ' % от ' + fmt(sum) }); pushInbox('Спасибо за покупку! Начислено ' + bonus + ' бонусов, на балансе ' + num(S.balance) + '. Как сидит пара? Напишите нам.', '#/club'); }
    return bonus;
  }
  function redeem(cid, amount) { amount = Math.min(amount, S.cb[cid] || 0); S.cb[cid] -= amount; if (cid === ME) { S.balance -= amount; S.ops.unshift({ date: 'сегодня', title: 'Списание на кассе', sum: -amount, note: 'по вашей просьбе' }); } return amount; }
  function addLost(mid, size) { const l = S.lost.find(x => x.model === mid && x.size === size); if (l) { l.count++; l.last = 'сегодня'; } else S.lost.unshift({ model: mid, size, count: 1, last: 'сегодня' }); }
  function arrive(mid, size) {
    const m = M(mid); const key = size === 'one' || !size ? 'one' : +size; if (key !== 'one' && !D.SIZES.includes(key)) { toast('Выберите размер'); return; }
    S.stock[m.id][key] = (S.stock[m.id][key] || 0) + 1;
    let n = 0; S.waitlist.forEach(w => { if (w.model === m.id && (key === 'one' || w.size === key) && !w.notified) { w.notified = true; n++; if (w.client === ME) pushInbox('Появился ваш размер: ' + m.name + (key !== 'one' ? ', ' + key : '') + '. Отложить на примерку →', '#/model/' + m.id); } });
    save(); closeSheet(); haptic('success'); toast(n ? 'Поступление записано, сообщили ' + plural(n, 'клиентке', 'клиенткам', 'клиенткам') : 'Поступление записано'); render();
  }

  /* ---------- делегирование кликов ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act, d = el.dataset;
    switch (a) {
      case 'nav': nav(d.to); break;
      case 'back': goBack(); break;
      case 'close': closeSheet(); break;
      case 'toast': toast(d.t); break;
      case 'search-toggle': S.searchOpen = !S.searchOpen; if (!S.searchOpen) S.q = ''; save(); render(); if (S.searchOpen) { const q = document.getElementById('q'); if (q) q.focus(); } break;
      case 'filter': S.filter = d.f; save(); render(); break;
      case 'newseg': S.newSeg = d.v; save(); render(); break;
      case 'rsvp': S.rsvp = !S.rsvp; save(); haptic('light'); toast(S.rsvp ? 'Ждём вас 18 октября в 18:00' : 'Запись отменена'); render(); break;
      case 'pick': S.sel[d.m] = +d.s; save(); haptic('light'); render(); break;
      case 'photo': S.photoIdx[d.m] = +d.i; save(); render(); break;
      case 'photo-next': { const m = M(d.m); S.photoIdx[d.m] = ((S.photoIdx[d.m] || 0) + 1) % m.photos.length; save(); render(); break; }
      case 'fav': { const id = +d.m; const i = S.fav.indexOf(id); if (i >= 0) S.fav.splice(i, 1); else S.fav.push(id); save(); haptic('light'); render(); break; }
      case 'book-ask': bookAsk(M(d.m), d.s); break;
      case 'book': book(M(d.m), d.s); break;
      case 'wait-ask': waitAsk(M(d.m), d.s); break;
      case 'wait': wait(M(d.m), d.s); break;
      case 'ask': openSheet(`<div class="grip"></div><h3>Спросить продавца</h3><p class="small muted">Ответим в Telegram в рабочее время салона: пн–пт 10:00–20:00, сб–вс 10:00–19:00.</p><textarea class="input" id="ask-text" placeholder="Например: маломерят ли, есть ли в другом цвете, можно ли отложить две пары"></textarea><button class="btn btn-primary btn-block" data-act="ask-send" data-m="${d.m}">Отправить</button>`); break;
      case 'ask-send': closeSheet(); haptic('success'); toast('Вопрос отправлен, ответим в Telegram'); break;
      case 'share-model': { const m = M(d.m); shareText('Смотри, какие ' + m.name.toLowerCase() + ' в ЛеВите: ' + fmt(m.price), 'https://t.me/' + BOT + '?startapp=model_' + m.id); break; }
      case 'share-ref': shareText('Приглашаю в клуб салона обуви ЛеВита: 500 бонусов на первую покупку по моей ссылке', 'https://t.me/' + BOT + '?startapp=ref_' + D.me.card); break;
      case 'card-big': openSheet(`<div class="grip"></div><h3 style="text-align:center">Карта клуба</h3><div class="qrbox" data-qrtext="${esc(D.me.card)}" data-qrsize="220"></div><p class="caption" style="text-align:center">${esc(D.me.card)} · ${esc(myName())} · ${levelOf(S.spent).name}</p><p class="small" style="text-align:center">Кассир сканирует код сканером терминала, бонусы начислятся и спишутся в чеке.</p><button class="btn btn-secondary btn-block" data-act="close">Закрыть</button>`); break;
      case 'rules': openSheet(`<div class="grip"></div><h3>Правила клуба</h3><div class="stack small"><p>Бонусы начисляются с каждой покупки: Серебро 5 %, Золото 7 % от 60 000 ₽ за год, Платина 10 % от 150 000 ₽.</p><p>1 бонус = 1 ₽. Списать можно до 30 % чека. Бонусы активируются через 14 дней после покупки и действуют 365 дней; подарочные — по сроку подарка.</p><p>При возврате товара бонусы за него аннулируются. На уценённые модели бонусы не начисляются.</p><p>Это демо-текст; правила салона утверждает владелица, полный текст — публичная оферта клуба.</p></div><button class="btn btn-secondary btn-block" data-act="close">Понятно</button>`); break;
      case 'mysize': S.mySize = +d.s; save(); haptic('light'); render(); break;
      case 'theme': S.theme = d.v; save(); applyTheme(); render(); break;
      case 'consent': S.consentAds = !S.consentAds; save(); toast(S.consentAds ? 'Будем писать о новинках и показах' : 'Рекламные сообщения выключены, сервисные остаются'); render(); break;
      case 'review': openSheet(`<div class="grip"></div><h3>Спасибо, что делитесь мнением</h3><p class="small muted">Честный отзыв помогает другим выбрать салон. Бонусы за отзыв мы не даём: так честнее и так требуют правила карт.</p><button class="btn btn-primary btn-block" data-act="open-url" data-u="https://yandex.ru/maps/?text=ЛеВита%20салон%20обуви%20Орёл">Яндекс Карты</button><button class="btn btn-secondary btn-block" data-act="open-url" data-u="https://2gis.ru/orel/firm/70000001033693665">2ГИС</button>`); break;
      case 'open-url': openLink(d.u); break;
      case 'pin': openPin(); break;
      case 'pin-key': { if (d.k === '⌫') S.pin = (S.pin || '').slice(0, -1); else if ((S.pin || '').length < 4) S.pin = (S.pin || '') + d.k; const dots = document.querySelectorAll('#pin-dots i'); dots.forEach((x, i) => x.classList.toggle('on', i < S.pin.length)); if (S.pin.length === 4) { if (S.pin === '1111') { S.staffOk = true; S.role = 'staff'; save(); closeSheet(); haptic('success'); nav('#/staff/today'); } else { S.pin = ''; dots.forEach(x => x.classList.remove('on')); haptic('error'); toast('Неверный PIN. Демо: 1111'); } } break; }
      case 'guide': openSheet(`<div class="grip"></div><h3>Как смотреть демо</h3><div class="stack">
        ${[['Каталог', 'откройте лодочки, выберите 38 — «Отложить на примерку»'], ['Новинки', 'переключите «В моём размере», запишитесь на закрытый показ'], ['Клуб', 'карта с QR, «Показать на кассе», история бонусов, приглашение'], ['Профиль → Для персонала', 'PIN 1111: на экране «Сегодня» подтвердите вашу бронь, потом «Куплена»'], ['Наличие', 'откройте модель, «Не было размера» и «Поступление +1» — клиентка получит сообщение'], ['Ещё → Кабинет владелицы', 'цифры недели, упущенный спрос, «Одобрить рассылку»'], ['Профиль', 'переключите тему и сбросьте демо перед следующим показом']].map((s, i) => `<div class="step"><b>${i + 1}</b><div><div class="small" style="font-weight:600">${s[0]}</div><div class="small muted">${s[1]}</div></div></div>`).join('')}
        </div><button class="btn btn-secondary btn-block" data-act="close">Закрыть</button>`); break;
      case 'reset': openSheet(`<div class="grip"></div><h3>Сбросить демо?</h3><p class="small muted">Вернутся исходные брони, бонусы и остатки.</p><button class="btn btn-primary btn-block" data-act="reset-yes">Сбросить</button><button class="btn btn-secondary btn-block" data-act="close">Отмена</button>`); break;
      case 'reset-yes': try { localStorage.removeItem(KEY); } catch (x) {} S = fresh(); closeSheet(); applyTheme(); toast('Демо сброшено'); nav('#/catalog'); break;
      case 'staff-exit': S.role = 'customer'; save(); nav('#/profile'); break;
      case 'client': openClient(d.id); break;
      case 'scan': scanQR(txt => { const c = D.clients.find(x => x.card === String(txt).trim() || x.phone.replace(/\D/g, '').endsWith(String(txt).replace(/\D/g, '').slice(-4)) && String(txt).length > 3); if (c) openClient(c.id); else toast('Карта не найдена'); }); break;
      case 'scan-manual': { const v = (document.getElementById('scan-in') || {}).value || ''; const c = D.clients.find(x => x.card === v.trim()); closeSheet(); if (c) openClient(c.id); else toast('Карта не найдена. Демо: 460252881380'); break; }
      case 'accrue-ask': openSheet(`<div class="grip"></div><h3>Начислить по чеку</h3><p class="small muted">${esc(C(d.id).name)} · ${C(d.id).level} · ${pctOf(C(d.id).level)} %</p><div class="field"><span class="label">Сумма чека, ₽</span><div class="input"><input id="sum" inputmode="numeric" placeholder="13 900"></div></div><button class="btn btn-primary btn-block" data-act="accrue-do" data-id="${d.id}">Начислить</button><p class="caption">В системе это делает «Бонус Плюс» по чеку Эвотора. Здесь — демо вручную.</p>`); break;
      case 'accrue-do': { const sum = parseInt((document.getElementById('sum').value || '').replace(/\D/g, ''), 10); if (!sum) { toast('Введите сумму'); break; } const b = accrue(d.id, sum); save(); closeSheet(); haptic('success'); toast('Начислено ' + b + ' бонусов'); render(); break; }
      case 'redeem-ask': openSheet(`<div class="grip"></div><h3>Списать бонусы</h3><p class="small muted">${esc(C(d.id).name)} · доступно ${num(S.cb[d.id])}</p><div class="field"><span class="label">Сколько списать</span><div class="input"><input id="sum" inputmode="numeric" placeholder="до 30 % чека"></div></div><button class="btn btn-primary btn-block" data-act="redeem-do" data-id="${d.id}">Списать</button>`); break;
      case 'redeem-do': { const sum = parseInt((document.getElementById('sum').value || '').replace(/\D/g, ''), 10); if (!sum) { toast('Введите сумму'); break; } const r = redeem(d.id, sum); save(); closeSheet(); haptic('success'); toast('Списано ' + r + ' бонусов'); render(); break; }
      case 'link-ask': openSheet(`<div class="grip"></div><h3>Привязать чек с кассы</h3><p class="small muted">Последние продажи из МойСклада. Выберите чек клиентки.</p><div class="card"><div class="list">${D.receipts.filter(r => !S.linked.includes(r.id)).map(r => `<div class="row row-plain" data-act="link-do" data-id="${d.id}" data-r="${r.id}" style="cursor:pointer"><div><div class="title">${esc(r.items)}</div><div class="sub">сегодня, ${r.time}</div></div><span class="price num">${fmt(r.sum)}</span></div>`).join('') || '<div class="empty"><p class="small">Все чеки привязаны</p></div>'}</div></div>`); break;
      case 'link-do': { const r = D.receipts.find(x => x.id === d.r); S.linked.push(r.id); const b = accrue(d.id, r.sum, r.items); save(); closeSheet(); haptic('success'); toast('Чек привязан, начислено ' + b + ' бонусов'); render(); break; }
      case 'stock': S.stockSel = null; openStock(d.m); break;
      case 'stock-pick': S.stockSel = +d.s; openStock(d.m); break;
      case 'arrive': arrive(+d.m, d.s); break;
      case 'lost-add': { const m = M(d.m); const key = isShoes(m) ? +d.s : 'one'; if (isShoes(m) && !D.SIZES.includes(key)) { toast('Выберите размер'); break; } addLost(m.id, isShoes(m) ? key : ''); save(); closeSheet(); haptic('warning'); toast('Записано в упущенный спрос'); render(); break; }
      case 'lost-ask': openSheet(`<div class="grip"></div><h3>Не было размера</h3><p class="small muted">Два касания — и владелица увидит, что дозаказать.</p><div class="field"><span class="label">Модель</span><select class="select" id="lost-m">${D.models.filter(isShoes).map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select></div><div class="field"><span class="label">Размер</span><div class="sizes pick" id="lost-sizes">${D.SIZES.map(s => `<button class="size ${S.lostSel === s ? 'is-selected' : ''}" data-act="lost-pick" data-s="${s}">${s}</button>`).join('')}</div></div><button class="btn btn-primary btn-block" data-act="lost-save">Записать</button>`); break;
      case 'lost-pick': S.lostSel = +d.s; document.querySelectorAll('#lost-sizes .size').forEach(x => x.classList.toggle('is-selected', +x.dataset.s === S.lostSel)); break;
      case 'lost-save': { const mid = +document.getElementById('lost-m').value; if (!S.lostSel) { toast('Выберите размер'); break; } addLost(mid, S.lostSel); S.lostSel = null; save(); closeSheet(); haptic('warning'); toast('Записано в упущенный спрос'); render(); break; }
      case 'b-confirm': confirmBooking(d.id); break;
      case 'b-notfound': notFound(d.id); break;
      case 'b-done': doneBooking(d.id); break;
      case 'b-release': release(d.id); break;
      case 'period': S.ownerPeriod = d.v; save(); toast(d.v === 'week' ? 'Неделя' : 'В прототипе показана неделя'); render(); break;
      case 'approve': S.mailingApproved = true; save(); haptic('success'); toast('Рассылка уйдёт 12 клиенткам сегодня в 12:00'); render(); break;
    }
  });
  document.addEventListener('input', e => { const k = e.target.dataset.live; if (!k) return; S[k] = e.target.value; save(); const pos = e.target.selectionStart; render(); const el = document.querySelector(`[data-live="${k}"]`); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (x) {} } });
  document.getElementById('overlay').addEventListener('click', e => { if (e.target.id === 'overlay') closeSheet(); });

  /* ---------- QR ---------- */
  function drawQR() {
    document.querySelectorAll('[data-qrtext]').forEach(box => {
      if (box.dataset.done) return; box.dataset.done = '1'; const size = +box.dataset.qrsize || 148;
      try { if (window.QRCode) { new window.QRCode(box, { text: box.dataset.qrtext, width: size, height: size, colorDark: '#111111', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M }); return; } } catch (e) {}
      box.innerHTML = `<div class="qr" style="width:${size}px">${'<i class="on"></i><i></i>'.repeat(220)}</div>`;
    });
  }

  /* ---------- рендер ---------- */
  function render() {
    const r = route(); let html = '';
    if (r[0] === 'staff' || r[0] === 'owner') { if (!guardStaff()) return; S.role = 'staff'; }
    if (r[0] === 'catalog' || r[0] === '') html = vCatalog();
    else if (r[0] === 'model') html = vModel(r[1]);
    else if (r[0] === 'new') html = vNew();
    else if (r[0] === 'club') html = vClub();
    else if (r[0] === 'inbox') html = vInbox();
    else if (r[0] === 'profile') html = vProfile();
    else if (r[0] === 'staff') html = ({ today: vStaffToday, clients: vStaffClients, stock: vStaffStock, more: vStaffMore }[r[1]] || vStaffToday)();
    else if (r[0] === 'owner') html = vOwner();
    else html = vCatalog();
    document.getElementById('view').innerHTML = html;
    const tabs = document.getElementById('tabs'); const hideTabs = r[0] === 'model' || r[0] === 'inbox' || r[0] === 'owner';
    tabs.hidden = hideTabs; if (!hideTabs) tabs.innerHTML = tabbar();
    tgBack(!isRoot());
    drawQR();
    if (r[0] === 'model') window.scrollTo(0, 0);
  }

  /* ---------- старт ---------- */
  tgInit(); applyTheme();
  const start = (tg && tg.initDataUnsafe.start_param) || new URLSearchParams(location.search).get('startapp');
  if (start && /^model_\d+$/.test(start)) location.hash = '#/model/' + start.slice(6);
  else if (start === 'staff') { location.hash = '#/profile'; setTimeout(openPin, 300); }
  else if (start && start.startsWith('ref_')) { toast('Вы пришли по приглашению: 500 бонусов после первой покупки'); }
  if (S.role === 'staff' && !/^#\/(staff|owner)/.test(location.hash)) S.role = 'customer';
  render();
})();
