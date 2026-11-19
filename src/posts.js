// Blog posts. Body is trusted HTML written by the site owner.
const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&h=500&q=70`;

export const posts = [
  {
    slug: 'website-speed-matters',
    title: 'Why Website Speed Matters More Than Ever',
    category: 'Web Design',
    author: 'Lavanya Rao',
    date: '2025-01-14',
    image: img('photo-1460925895917-afdab827c52f'),
    alt: 'Laptop showing analytics charts on a desk',
    excerpt: 'Slow pages lose customers. Here is how load time affects sales and what you can do about it this week.',
    body: `<p>More than half of visitors leave a page that takes longer than three seconds to load. On mobile data, every extra kilobyte counts.</p>
<h2>Start with images</h2><p>Images are usually the heaviest part of a page. Serve modern formats like WebP or AVIF, size them to the screen, and lazy-load anything below the fold.</p>
<h2>Cut unused code</h2><p>Themes and plugins often ship scripts you never use. Remove them, and defer what is left.</p>
<h2>Measure, then repeat</h2><p>Run Lighthouse or PageSpeed Insights monthly and fix the biggest item first.</p>`,
  },
  {
    slug: 'local-seo-checklist',
    title: 'A Local SEO Checklist for Small Businesses',
    category: 'SEO',
    author: 'Arjun Mehta',
    date: '2024-12-02',
    image: img('photo-1432888498266-38ffec3eaf0a'),
    alt: 'Person writing a checklist in a notebook',
    excerpt: 'Ten simple steps to help nearby customers find you on Google Search and Maps.',
    body: `<p>Local search is where small businesses win. These steps take an afternoon and pay off for years.</p>
<h2>Claim your Business Profile</h2><p>Verify your Google Business Profile, choose accurate categories and add real photos.</p>
<h2>Keep your details consistent</h2><p>Your name, address and phone number should match everywhere: website, directories and social profiles.</p>
<h2>Ask for reviews</h2><p>Send a short link after every happy project. Reply to every review, good or bad.</p>`,
  },
  {
    slug: 'brand-colours-guide',
    title: 'Choosing Brand Colours that Work Online',
    category: 'Branding',
    author: 'Priya Nair',
    date: '2024-10-21',
    image: img('photo-1513364776144-60967b0f800f'),
    alt: 'Paint swatches and brushes on a table',
    excerpt: 'Colour shapes how people feel about your brand. Pick a palette that is memorable and accessible.',
    body: `<p>A good palette has one strong primary colour, one supporting colour and a neutral base.</p>
<h2>Check contrast</h2><p>Text must have a contrast ratio of at least 4.5:1 against its background to be readable for everyone.</p>
<h2>Test in dark mode</h2><p>Many visitors browse in dark mode. Make sure your colours still look right on dark backgrounds.</p>`,
  },
  {
    slug: 'social-ads-budget',
    title: 'How to Plan Your First Social Media Ad Budget',
    category: 'Marketing',
    author: 'Arjun Mehta',
    date: '2024-09-09',
    image: img('photo-1611162617213-7d7a39e9b1d7'),
    alt: 'Smartphone showing social media apps',
    excerpt: 'Start small, test fast and scale what works: a simple framework for your first ad campaign.',
    body: `<p>You do not need a big budget to learn what works. You need a clear goal and a test plan.</p>
<h2>Pick one goal</h2><p>Leads, sales or awareness: choose one, and measure only that.</p>
<h2>Test two to three creatives</h2><p>Run them side by side for a week, then move budget to the winner.</p>`,
  },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const readingTime = (html) => Math.max(1, Math.round(html.replace(/<[^>]+>/g, '').split(/\s+/).length / 200));
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

function card(p) {
  return `<article class="card post-card reveal" data-category="${esc(p.category)}" data-search="${esc(`${p.title} ${p.excerpt}`.toLowerCase())}">
  <img src="${p.image}" alt="${esc(p.alt)}" width="800" height="500" loading="lazy" decoding="async">
  <div class="card-body">
    <span class="tag">${esc(p.category)}</span>
    <h3><a href="/blog/${p.slug}/">${esc(p.title)}</a></h3>
    <p>${esc(p.excerpt)}</p>
    <p class="meta"><time datetime="${p.date}">${fmtDate(p.date)}</time> · ${readingTime(p.body)} min read</p>
  </div>
</article>`;
}

export const renderPostCards = (list) => list.map(card).join('\n');

export function renderPost(p, all) {
  const related = all.filter((o) => o.slug !== p.slug)
    .sort((a, b) => (b.category === p.category) - (a.category === p.category)).slice(0, 3);
  return `<article class="section"><div class="container narrow">
  <nav aria-label="Breadcrumb" class="breadcrumb"><a href="/">Home</a> / <a href="/blog/">Blog</a> / <span aria-current="page">${esc(p.title)}</span></nav>
  <span class="tag">${esc(p.category)}</span>
  <h1>${esc(p.title)}</h1>
  <p class="meta">By ${esc(p.author)} · <time datetime="${p.date}">${fmtDate(p.date)}</time> · ${readingTime(p.body)} min read</p>
  <img class="post-hero" src="${p.image.replace('w=800&h=500', 'w=1200&h=600')}" alt="${esc(p.alt)}" width="1200" height="600" fetchpriority="high">
  <div class="prose">${p.body}</div>
</div></article>
<section class="section alt" aria-labelledby="related-h"><div class="container">
  <h2 id="related-h">Related posts</h2>
  <div class="grid grid-3">${related.map(card).join('\n')}</div>
</div></section>`;
}
