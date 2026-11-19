const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---- Theme toggle ---- */
const themeBtn = $('.theme-toggle');
const syncThemeBtn = () => themeBtn.setAttribute('aria-pressed', String(document.documentElement.dataset.theme === 'dark'));
syncThemeBtn();
themeBtn.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch {}
  syncThemeBtn();
});

/* ---- Mobile nav ---- */
const navToggle = $('.nav-toggle');
const nav = $('#main-nav');
const setNav = (open) => {
  nav.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};
navToggle.addEventListener('click', () => setNav(!nav.classList.contains('open')));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nav.classList.contains('open')) { setNav(false); navToggle.focus(); }
});

/* ---- Sticky header shadow + back to top ---- */
const header = $('.site-header');
const toTop = $('.back-to-top');
const onScroll = () => {
  header.classList.toggle('scrolled', scrollY > 8);
  toTop.hidden = scrollY < 600;
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();
toTop.addEventListener('click', () => { scrollTo({ top: 0 }); $('#main').focus({ preventScroll: true }); });

/* ---- Reveal on scroll ---- */
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if ('IntersectionObserver' in window && !reduced) {
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  $$('.reveal').forEach((el) => io.observe(el));
} else {
  $$('.reveal').forEach((el) => el.classList.add('visible'));
}

/* ---- Stat counters ---- */
if (!reduced) {
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    const end = Number(en.target.dataset.count);
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / 1200);
      en.target.textContent = Math.round(end * (1 - (1 - p) ** 3));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }));
  $$('[data-count]').forEach((el) => io.observe(el));
}

/* ---- Chip filter groups ---- */
function bindChips(group, onChange) {
  const chips = $$('.chip', group);
  chips.forEach((chip) => chip.addEventListener('click', () => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    onChange(chip.dataset.filter);
  }));
}

/* ---- Portfolio filter + lightbox ---- */
const gallery = $('.gallery');
if (gallery) {
  const status = $('#filter-status');
  bindChips($('.filters'), (f) => {
    let shown = 0;
    $$('li', gallery).forEach((li) => { li.hidden = f !== 'all' && li.dataset.category !== f; shown += !li.hidden; });
    status.textContent = `${shown} projects shown`;
  });

  const box = $('.lightbox');
  const boxImg = $('img', box);
  let opener;
  $$('.project', gallery).forEach((btn) => btn.addEventListener('click', () => {
    const img = $('img', btn);
    opener = btn;
    boxImg.src = btn.dataset.full;
    boxImg.alt = img.alt;
    $('figcaption', box).textContent = $('.project-info', btn).textContent.replace(/\s+/g, ' ').trim();
    box.showModal();
  }));
  $('.lightbox-close').addEventListener('click', () => box.close());
  box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
  box.addEventListener('close', () => opener?.focus());
}

/* ---- Blog search, categories, pagination ---- */
const postList = $('.post-list');
if (postList) {
  const cards = $$('.post-card', postList);
  const size = Number(postList.dataset.pageSize);
  const pager = $('.pagination');
  const status = $('.results-status');
  const search = $('#blog-search');
  let category = 'all';
  let page = 1;

  const render = () => {
    const q = search.value.trim().toLowerCase();
    const matches = cards.filter((c) => (category === 'all' || c.dataset.category === category) && c.dataset.search.includes(q));
    const pages = Math.max(1, Math.ceil(matches.length / size));
    page = Math.min(page, pages);
    cards.forEach((c) => { c.hidden = true; });
    matches.slice((page - 1) * size, page * size).forEach((c) => { c.hidden = false; c.classList.add('visible'); });
    status.textContent = matches.length ? `${matches.length} article${matches.length > 1 ? 's' : ''} found` : 'No articles match your search.';
    pager.replaceChildren(...(pages > 1 ? Array.from({ length: pages }, (_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = String(i + 1);
      b.setAttribute('aria-label', `Page ${i + 1}`);
      if (i + 1 === page) b.setAttribute('aria-current', 'page');
      b.setAttribute('aria-pressed', String(i + 1 === page));
      b.addEventListener('click', () => { page = i + 1; render(); postList.scrollIntoView(); });
      return b;
    }) : []));
  };
  search.addEventListener('input', () => { page = 1; render(); });
  bindChips($('.blog-tools .filters'), (f) => { category = f; page = 1; render(); });
  render();
}

/* ---- Forms (contact + newsletter) ---- */
const planInput = $('.contact-form input[name="plan"]');
if (planInput) {
  const plan = new URLSearchParams(location.search).get('plan');
  if (plan && /^[a-z]{1,20}$/.test(plan)) {
    planInput.value = plan;
    $('#c-subject').value = `Enquiry about the ${plan[0].toUpperCase() + plan.slice(1)} plan`;
  }
}

const messages = {
  name: 'Please enter your name (at least 2 characters).',
  email: 'Please enter a valid email address.',
  phone: 'Please enter a valid phone number.',
  subject: 'Please enter a subject (at least 3 characters).',
  message: 'Please enter a message (at least 10 characters).',
};

function showError(field, msg) {
  const err = field.id && document.getElementById(`${field.id}-err`);
  field.setAttribute('aria-invalid', String(Boolean(msg)));
  if (err) err.textContent = msg || '';
}

$$('.js-api-form').forEach((form) => {
  const status = $('.form-status', form);
  const submit = $('button[type="submit"]', form);
  const fields = $$('input:not([type="hidden"]):not([name="website"]), textarea', form);

  fields.forEach((f) => f.addEventListener('blur', () => {
    if (f.getAttribute('aria-invalid') === 'true') showError(f, f.checkValidity() ? '' : messages[f.name]);
  }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.className = 'form-status';
    status.textContent = '';
    let firstInvalid = null;
    fields.forEach((f) => {
      const ok = f.checkValidity() && !(f.required && !f.value.trim());
      showError(f, ok ? '' : messages[f.name]);
      if (!ok && !firstInvalid) firstInvalid = f;
    });
    if (firstInvalid) {
      if (!firstInvalid.id || !document.getElementById(`${firstInvalid.id}-err`)) {
        status.className = 'form-status fail';
        status.textContent = messages[firstInvalid.name];
      }
      firstInvalid.focus();
      return;
    }

    submit.disabled = true;
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        form.reset();
        status.className = 'form-status ok';
        status.textContent = data.message || 'Thank you!';
      } else {
        Object.entries(data.errors || {}).forEach(([name, msg]) => {
          const f = form.elements[name];
          if (f) showError(f, msg);
        });
        status.className = 'form-status fail';
        status.textContent = data.message || 'Something went wrong. Please try again.';
      }
    } catch {
      status.className = 'form-status fail';
      status.textContent = 'Network error. Please check your connection and try again.';
    } finally {
      submit.disabled = false;
    }
  });
});
