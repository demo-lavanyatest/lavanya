# Lavanya Digital: agency website

A fast, accessible and SEO-friendly business/agency website. The pages are plain **HTML + CSS + JavaScript**, built by a small Node script. A small **Node.js + Express** API handles the contact form and the newsletter.

- Pages: Home, About, Services & Pricing, Portfolio (filters and a lightbox), Blog (search, categories, pagination, single post pages), Contact, Privacy Policy, Terms, 404
- Dark mode toggle that remembers the visitor's choice, sticky header, mobile menu, back-to-top button, WhatsApp button
- SEO: a unique title and description on every page, canonical URLs, Open Graph and Twitter tags, JSON-LD (`ProfessionalService` + `BlogPosting`), auto-generated `sitemap.xml` and `robots.txt`
- Security: Helmet (CSP, HSTS, X-Frame-Options), rate limiting, honeypot, JSON-only and same-origin API (CSRF defence), server-side validation, HTML escaping in emails

## Setup

Requires Node.js 20 or later.

```bash
npm install
cp .env.example .env     # then edit values
npm run dev              # builds dist/ and starts the server with auto-reload
npm test                 # API tests
```

`npm run build` writes the static site to `dist/`. Run it again after you edit anything in `src/` or `public/`.

## Environment variables

| Name | Purpose |
|---|---|
| `PORT` | Port the server listens on (default 3000) |
| `SITE_URL` | Public URL. Used for canonical URLs, the sitemap and the API Origin check |
| `NODE_ENV` | Set to `production` for the HTTPS redirect, HSTS and caching |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP server for contact emails (Brevo, Gmail, SES…). If `SMTP_HOST` is empty, no email is sent |
| `MAIL_FROM`, `MAIL_TO` | Sender address and the inbox that receives enquiries |

All submissions are also appended to `data/contacts.jsonl` and `data/subscribers.jsonl`. These files are git-ignored.

## Deployment

The site needs the Express server for the forms, so deploy it to a Node host such as Render, Railway, Fly.io or a VPS:

- Build command: `npm ci && npm run build`
- Start command: `node server/index.js`
- Set the environment variables above. Use a persistent disk for `data/`, or rely on email only.

The server assumes it runs behind one HTTPS reverse proxy (`trust proxy = 1`).

## File overview

| Path | What it does |
|---|---|
| `build.js` | Wraps each page in the layout, injects SEO tags, and writes `dist/`, `sitemap.xml` and `robots.txt` |
| `src/site.js` | Brand details, navigation, page titles and descriptions, organisation JSON-LD |
| `src/posts.js` | Blog posts and the blog card and post templates |
| `src/partials/` | `layout.html` (head, floating buttons), `header.html`, `footer.html` |
| `src/pages/` | Body content of each page |
| `public/css/styles.css` | Design tokens, components, dark theme, breakpoints (480/768/1024/1280) |
| `public/js/theme-init.js` | Applies the saved theme before the first paint |
| `public/js/main.js` | Menu, theme toggle, scroll reveal, counters, filters, lightbox, blog search and pagination, form validation and submission |
| `public/img/logo.svg` | Placeholder logo |
| `server/app.js` | Express app: security headers, rate limits, API routes, static files, 404 |
| `server/validate.js` | Input cleaning and validation |
| `server/index.js` | Entry point |
| `test/api.test.js` | API tests (validation, honeypot, CSRF, headers, rate limit) |

## Replace with your own content

- **Brand name, phone, email, address, WhatsApp number:** `src/site.js`, `src/partials/footer.html`, `src/partials/layout.html` (WhatsApp link), `src/pages/contact.html`
- **Logo:** `public/img/logo.svg`
- **Text and images:** every file in `src/pages/`. The images are Unsplash placeholders, so replace them and update the `alt` text
- **Team, timeline, testimonials, statistics:** `src/pages/about.html`, `src/pages/home.html`
- **Prices and FAQ:** `src/pages/services.html`
- **Portfolio projects:** `src/pages/portfolio.html` (`data-category` controls the filters)
- **Blog posts:** `src/posts.js`
- **Map:** the `iframe` in `src/pages/contact.html`
- **Social links:** footer and team cards
- **Legal pages:** have `privacy.html` and `terms.html` reviewed by a lawyer
- **Colours and fonts:** the `:root` variables in `public/css/styles.css`
- **Secrets:** `.env` only, never in code
