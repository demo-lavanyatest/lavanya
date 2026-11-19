// Static site builder: wraps each page body in the shared layout, writes dist/,
// and generates sitemap.xml + robots.txt. No runtime dependencies.
import 'dotenv/config';
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site, pages } from './src/site.js';
import { posts, renderPost, renderPostCards } from './src/posts.js';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');
const siteUrl = (process.env.SITE_URL || site.url).replace(/\/$/, '');

const escapeAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const [layout, header, footer] = await Promise.all(
  ['layout.html', 'header.html', 'footer.html'].map((f) => readFile(join(root, 'src/partials', f), 'utf8'))
);

function navLinks(current) {
  return site.nav
    .map(({ href, label }) => {
      const active = href === current || (href !== '/' && current.startsWith(href));
      return `<li><a href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a></li>`;
    })
    .join('');
}

function render({ path, title, description, image, body, type = 'website', jsonLd = [] }) {
  const canonical = siteUrl + path;
  const ogImage = image || site.ogImage;
  const ld = [site.organizationLd(siteUrl), ...jsonLd]
    .map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`)
    .join('\n');
  const vars = {
    title: escapeAttr(title),
    description: escapeAttr(description),
    canonical,
    ogImage,
    ogType: type,
    jsonLd: ld,
    header: header.replace('{{nav}}', navLinks(path)),
    footer: footer.replace('{{year}}', String(new Date().getFullYear())),
    body,
  };
  return layout.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}

async function out(path, html) {
  const file = path.endsWith('.html') ? join(dist, path) : join(dist, path, 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, 'public'), dist, { recursive: true });

const sitemap = [];
for (const page of pages) {
  let body = await readFile(join(root, 'src/pages', page.file), 'utf8');
  body = body.replace('{{postCards}}', renderPostCards(posts));
  await out(page.output || page.path, render({ ...page, body }));
  if (!page.noindex) sitemap.push(page.path);
}
for (const post of posts) {
  const path = `/blog/${post.slug}/`;
  await out(path, render({
    path,
    title: `${post.title} | ${site.name} Blog`,
    description: post.excerpt,
    image: post.image,
    type: 'article',
    body: renderPost(post, posts),
    jsonLd: [{
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title,
      datePublished: post.date, author: { '@type': 'Person', name: post.author }, image: post.image,
    }],
  }));
  sitemap.push(path);
}

const today = new Date().toISOString().slice(0, 10);
await writeFile(join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap
    .map((p) => `  <url><loc>${siteUrl}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);

console.log(`Built ${sitemap.length} pages + 404 into dist/`);
