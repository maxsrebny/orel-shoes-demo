/* ЛеВита — прототип. Демо-данные: вымышленные модели, цены, клиенты и остатки. Фото — из открытых публикаций салона, только для показа. */
window.LEVITA_DATA = (function () {
  const SIZES = [35, 36, 37, 38, 39, 40, 41];
  // остаток по размерам: число пар; 0 — нет
  const models = [
    { id: 1, name: 'Лодочки с острым носом, замша', cat: 'shoes', type: 'Лодочки', color: 'карамель', material: 'натуральная замша', heel: 'каблук 8 см', fit: 'маломерят на полразмера', price: 13900, photos: ['g03', 'g07'], stock: { 35: 1, 36: 1, 37: 2, 38: 1, 39: 0, 40: 1, 41: 0 }, arrived: 0, tags: ['new'] },
    { id: 2, name: 'Лодочки на низком каблуке, замша', cat: 'shoes', type: 'Лодочки', color: 'шоколад', material: 'натуральная замша', heel: 'каблук 4 см', fit: 'в размер', price: 12900, photos: ['g07', 'g03'], stock: { 35: 0, 36: 2, 37: 1, 38: 2, 39: 1, 40: 0, 41: 0 }, arrived: 1, tags: ['new'] },
    { id: 3, name: 'Босоножки на шпильке, кожа', cat: 'shoes', type: 'Босоножки', color: 'чёрный', material: 'натуральная кожа, золотая фурнитура', heel: 'каблук 10 см', fit: 'в размер', price: 16900, photos: ['g06', 'g04'], stock: { 35: 0, 36: 1, 37: 1, 38: 1, 39: 2, 40: 0, 41: 0 }, arrived: 12, tags: [] },
    { id: 4, name: 'Босоножки с ремешками, лак', cat: 'shoes', type: 'Босоножки', color: 'красный', material: 'лаковая кожа', heel: 'каблук 9 см', fit: 'в размер', price: 9900, photos: ['g04'], stock: { 35: 0, 36: 0, 37: 1, 38: 0, 39: 0, 40: 0, 41: 0 }, arrived: 40, tags: ['sale'] },
    { id: 5, name: 'Босоножки с кольцом, замша', cat: 'shoes', type: 'Босоножки', color: 'красный', material: 'натуральная замша', heel: 'каблук 10 см', fit: 'большемерят на полразмера', price: 11900, photos: ['g23'], stock: { 35: 1, 36: 1, 37: 0, 38: 1, 39: 1, 40: 0, 41: 0 }, arrived: 30, tags: [] },
    { id: 6, name: 'Ботинки на устойчивом каблуке, лак', cat: 'shoes', type: 'Ботинки', color: 'шоколад', material: 'лаковая кожа и замша', heel: 'каблук 4 см', fit: 'в размер', price: 18900, photos: ['g05', 'g13'], stock: { 35: 0, 36: 1, 37: 2, 38: 2, 39: 1, 40: 1, 41: 0 }, arrived: 0, tags: ['new'] },
    { id: 7, name: 'Сапоги со сборкой, кожа', cat: 'shoes', type: 'Сапоги', color: 'чёрный', material: 'натуральная кожа', heel: 'каблук 7 см', fit: 'в размер', price: 24900, photos: ['g13', 'boots_05'], stock: { 35: 0, 36: 0, 37: 1, 38: 1, 39: 0, 40: 1, 41: 0 }, arrived: 2, tags: ['new'] },
    { id: 8, name: 'Слингбэки на низком каблуке', cat: 'shoes', type: 'Слингбэки', color: 'жёлтый', material: 'текстиль и кожа', heel: 'каблук 3 см', fit: 'в размер', price: 11900, photos: ['g09'], stock: { 35: 1, 36: 2, 37: 2, 38: 1, 39: 1, 40: 0, 41: 0 }, arrived: 1, tags: ['new'] },
    { id: 9, name: 'Лодочки классические, кожа', cat: 'shoes', type: 'Лодочки', color: 'шоколад', material: 'натуральная кожа', heel: 'каблук 9 см', fit: 'в размер', price: 14500, photos: ['g22', 'g02'], stock: { 35: 0, 36: 1, 37: 1, 38: 0, 39: 1, 40: 0, 41: 0 }, arrived: 20, tags: [] },
    { id: 10, name: 'Сапоги замшевые, высокие', cat: 'shoes', type: 'Сапоги', color: 'шоколад', material: 'натуральная замша', heel: 'каблук 8 см', fit: 'маломерят на полразмера', price: 26900, photos: ['g19'], stock: { 35: 0, 36: 0, 37: 1, 38: 1, 39: 1, 40: 0, 41: 0 }, arrived: 5, tags: [] },
    { id: 11, name: 'Сумка-кроссбоди, замша', cat: 'bags', type: 'Сумки', color: 'зелёный', material: 'натуральная замша', heel: '', fit: '', price: 8900, photos: ['g15', 'g20'], stock: { one: 2 }, arrived: 1, tags: ['new'] },
    { id: 12, name: 'Сумка с клапаном, кожа крокодил', cat: 'bags', type: 'Сумки', color: 'бордо', material: 'натуральная кожа', heel: '', fit: '', price: 15900, photos: ['g18'], stock: { one: 1 }, arrived: 3, tags: [] },
    { id: 13, name: 'Сумка-тоут, замша', cat: 'bags', type: 'Сумки', color: 'шоколад', material: 'натуральная замша', heel: '', fit: '', price: 13500, photos: ['g14', 'g12'], stock: { one: 1 }, arrived: 9, tags: [] },
    { id: 14, name: 'Сумка с бантом, кожа', cat: 'bags', type: 'Сумки', color: 'фисташковый', material: 'натуральная кожа', heel: '', fit: '', price: 12900, photos: ['g17'], stock: { one: 1 }, arrived: 0, tags: ['new'] },
    { id: 15, name: 'Рюкзак, лак', cat: 'bags', type: 'Сумки', color: 'серебро', material: 'лаковая кожа', heel: '', fit: '', price: 9900, photos: ['g08'], stock: { one: 0 }, arrived: 35, tags: [] },
    { id: 16, name: 'Сумка-багет, замша', cat: 'bags', type: 'Сумки', color: 'бордо', material: 'натуральная замша', heel: '', fit: '', price: 10900, photos: ['g16', 'g21'], stock: { one: 2 }, arrived: 2, tags: ['new'] }
  ];

  const levels = [
    { name: 'Серебро', pct: 5, from: 0 },
    { name: 'Золото', pct: 7, from: 60000 },
    { name: 'Платина', pct: 10, from: 150000 }
  ];

  // клиентки салона для режима персонала (имена вымышленные)
  const clients = [
    { id: 'c1', name: 'Анна Л.', phone: '+7 910 ··· 12-07', card: '460252881380', level: 'Серебро', balance: 1775, expiring: { sum: 554, date: '14.10' }, sizes: { shoe: 38 }, spent: 41800, last: '02.10.2026', purchases: [{ date: '02.10.2026', model: 3, sum: 16900 }, { date: '14.09.2026', model: 12, sum: 15900 }, { date: '21.05.2026', model: 2, sum: 9000 }], birthday: '14.10' },
    { id: 'c2', name: 'Мария К.', phone: '+7 920 ··· 45-31', card: '460252881411', level: 'Золото', balance: 3240, expiring: null, sizes: { shoe: 39 }, spent: 92300, last: '29.09.2026', purchases: [{ date: '29.09.2026', model: 6, sum: 18900 }], birthday: '03.03' },
    { id: 'c3', name: 'Елена В.', phone: '+7 905 ··· 88-02', card: '460252881466', level: 'Серебро', balance: 420, expiring: null, sizes: { shoe: 37 }, spent: 23800, last: '11.06.2026', purchases: [{ date: '11.06.2026', model: 8, sum: 11900 }], birthday: '22.11' },
    { id: 'c4', name: 'Ольга С.', phone: '+7 953 ··· 17-64', card: '460252881502', level: 'Платина', balance: 6810, expiring: { sum: 1200, date: '31.10' }, sizes: { shoe: 36 }, spent: 168400, last: '05.10.2026', purchases: [{ date: '05.10.2026', model: 10, sum: 26900 }], birthday: '09.01' },
    { id: 'c5', name: 'Наталья Д.', phone: '+7 910 ··· 03-19', card: '460252881539', level: 'Серебро', balance: 0, expiring: null, sizes: { shoe: 40 }, spent: 12900, last: '18.03.2026', purchases: [{ date: '18.03.2026', model: 9, sum: 12900 }], birthday: '27.07' },
    { id: 'c6', name: 'Ирина П.', phone: '+7 919 ··· 70-25', card: '460252881570', level: 'Золото', balance: 1980, expiring: null, sizes: { shoe: 38 }, spent: 74500, last: '30.09.2026', purchases: [{ date: '30.09.2026', model: 11, sum: 8900 }], birthday: '16.05' }
  ];

  // последние чеки с кассы (как придут из МойСклада): для привязки к клиенту
  const receipts = [
    { id: 'r1', time: '18:42', sum: 13900, items: 'Лодочки, замша · 38' },
    { id: 'r2', time: '18:15', sum: 8900, items: 'Сумка-кроссбоди, замша' },
    { id: 'r3', time: '17:03', sum: 16900, items: 'Босоножки на шпильке · 39' },
    { id: 'r4', time: '15:30', sum: 24900, items: 'Сапоги со сборкой · 38' }
  ];

  // брони и запросы, которые уже есть в салоне (для режима персонала)
  const bookings = [
    { id: 'b1', client: 'c2', model: 6, size: 39, status: 'held', until: 'сегодня, 20:00', created: '10:12' },
    { id: 'b2', client: 'c3', model: 1, size: 37, status: 'pending', until: '', created: '12:48' },
    { id: 'b3', client: 'c6', model: 8, size: 38, status: 'held', until: 'завтра, 20:00', created: 'вчера' }
  ];
  const waitlist = [
    { id: 'w1', client: 'c4', model: 7, size: 36, created: '03.10' },
    { id: 'w2', client: 'c5', model: 3, size: 40, created: '01.10' },
    { id: 'w3', client: 'c1', model: 9, size: 38, created: '28.09' }
  ];
  const lostDemand = [
    { model: 3, size: 35, count: 2, last: '06.10' },
    { model: 7, size: 36, count: 3, last: '05.10' },
    { model: 1, size: 39, count: 2, last: '04.10' },
    { model: 9, size: 38, count: 1, last: '02.10' }
  ];

  // текущая клиентка (вы): бонусы и история
  const me = {
    phone: '+7 910 ··· 12-07', card: '460252881380', level: 'Серебро', balance: 1775, spent: 41800,
    expiring: { sum: 554, date: '14 октября' }, shoe: 38,
    ops: [
      { date: '02.10', title: 'Покупка: босоножки на шпильке', sum: +845, note: '5 % от 16 900 ₽' },
      { date: '25.09', title: 'Подарок на день рождения', sum: +1000, note: 'действует до 14.10' },
      { date: '14.09', title: 'Покупка: сумка с клапаном', sum: +795, note: '5 % от 15 900 ₽' },
      { date: '14.09', title: 'Списание на кассе', sum: -1200, note: 'сумка с клапаном' },
      { date: '21.05', title: 'Покупка: лодочки, замша', sum: +450, note: '5 % от 9 000 ₽' },
      { date: '20.05', title: 'Приветственные бонусы', sum: +300, note: 'за регистрацию в клубе' }
    ]
  };

  // «сообщения бота»: что клиентка получила бы в Telegram
  const inbox = [
    { date: 'сегодня, 09:10', text: 'Привезли 14 новых моделей. В вашем 38-м — 6. Посмотреть →', link: '#/new' },
    { date: '05.10', text: 'Напоминаем: 554 бонуса сгорят 14 октября. Успейте использовать на кассе.', link: '#/club' },
    { date: '02.10', text: 'Спасибо за покупку! Начислено 845 бонусов. Как сидят босоножки? Оставьте отзыв →', link: '#/club' }
  ];

  // неделя для кабинета владельца (выручка по дням из МойСклада, тыс. ₽)
  const week = [
    { d: 'пн', rev: 38, checks: 4, club: 1 }, { d: 'вт', rev: 54, checks: 6, club: 2 }, { d: 'ср', rev: 71, checks: 7, club: 3 },
    { d: 'чт', rev: 46, checks: 5, club: 2 }, { d: 'пт', rev: 93, checks: 9, club: 4 }, { d: 'сб', rev: 128, checks: 12, club: 5 }, { d: 'вс', rev: 84, checks: 8, club: 3 }
  ];

  return { SIZES, models, levels, clients, receipts, bookings, waitlist, lostDemand, me, inbox, week };
})();
