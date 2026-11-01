/* =========================================================
 *  عملاؤنا — Clients banner
 *  لإضافة عميل جديد: ضع صورة الشعار في public/assets/clients/
 *  ثم أضف سطرًا في القائمة التالية { name, logo, url (اختياري) }
 * ========================================================= */
const CLIENTS = [
  { name: 'أرباح تك', logo: '/assets/clients/arbah-tech.png' },
  // { name: 'اسم الشركة', logo: '/assets/clients/company.png', url: 'https://example.com' },
];

function renderClients() {
  const track = document.getElementById('clientsTrack');
  if (!track || !CLIENTS.length) return;

  const makeItem = (c) => {
    const el = document.createElement(c.url ? 'a' : 'div');
    el.className = 'client-logo';
    el.title = c.name;
    if (c.url) { el.href = c.url; el.target = '_blank'; el.rel = 'noopener'; }
    const img = document.createElement('img');
    img.src = c.logo;
    img.alt = c.name;
    img.loading = 'lazy';
    el.appendChild(img);
    return el;
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    CLIENTS.forEach((c) => track.appendChild(makeItem(c)));
    return;
  }

  // Repeat the list so one half of the track is wider than the screen,
  // then duplicate it so the -50% animation loops seamlessly.
  const itemWidth = 204; // logo width + gap
  const minPerHalf = Math.ceil((window.innerWidth + itemWidth) / itemWidth);
  const reps = Math.max(1, Math.ceil(minPerHalf / CLIENTS.length));
  const half = [];
  for (let r = 0; r < reps; r++) half.push(...CLIENTS);

  [...half, ...half].forEach((c, i) => {
    const item = makeItem(c);
    if (i >= half.length) item.setAttribute('aria-hidden', 'true');
    track.appendChild(item);
  });
  track.style.setProperty('--marquee-duration', `${half.length * 3}s`);
}

function setupNav() {
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('mainNav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );
}

function setupQuoteForm() {
  const form = document.getElementById('quoteForm');
  const msg = document.getElementById('formMsg');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.className = 'form-msg';
    if (!form.checkValidity()) {
      msg.textContent = 'يرجى تعبئة جميع الحقول المطلوبة.';
      msg.classList.add('err');
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    data.quantity = parseInt(data.quantity, 10) || 10;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    msg.textContent = 'جارٍ الإرسال...';
    try {
      const res = await fetch('/api/b2b/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      form.reset();
      msg.textContent = 'تم استلام طلبك بنجاح، سيتواصل معك فريقنا قريبًا. شكرًا لثقتك بالقريني!';
      msg.classList.add('ok');
    } catch {
      msg.textContent = 'تعذّر إرسال الطلب حاليًا، يرجى المحاولة مرة أخرى.';
      msg.classList.add('err');
    } finally {
      btn.disabled = false;
    }
  });
}

document.getElementById('year').textContent = new Date().getFullYear();
renderClients();
setupNav();
setupQuoteForm();
