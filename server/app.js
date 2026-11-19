import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import { appendFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContact, validateNewsletter, escapeHtml } from './validate.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function createApp({ dataDir = join(root, 'data'), distDir = join(root, 'dist'), env = process.env } = {}) {
  const app = express();
  const isProd = env.NODE_ENV === 'production';
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind one reverse proxy (Render, Railway, nginx…)

  if (isProd) {
    app.use((req, res, next) => (req.secure ? next() : res.redirect(301, `https://${req.headers.host}${req.originalUrl}`)));
  }

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
        frameSrc: ['https://www.google.com'],
        connectSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProd ? [] : null,
      },
    },
    frameguard: { action: 'deny' },
    hsts: isProd ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
  }));

  const mailer = env.SMTP_HOST
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT || 587),
        secure: Number(env.SMTP_PORT) === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      })
    : null;

  const save = async (file, record) => {
    await mkdir(dataDir, { recursive: true });
    await appendFile(join(dataDir, file), `${JSON.stringify({ ...record, at: new Date().toISOString() })}\n`);
  };

  const api = express.Router();
  api.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { message: 'Too many requests. Please try again in a few minutes.' } }));
  api.use(express.json({ limit: '20kb' }));

  // CSRF defence: require JSON (blocks plain cross-site form posts) and a same-site Origin when present.
  api.use((req, res, next) => {
    if (!req.is('application/json')) return res.status(415).json({ message: 'Unsupported request.' });
    const origin = req.get('origin');
    if (origin) {
      const allowed = [req.get('host'), env.SITE_URL && new URL(env.SITE_URL).host];
      let host = null;
      try { host = new URL(origin).host; } catch { /* "null" or malformed origin */ }
      if (!allowed.includes(host)) return res.status(403).json({ message: 'Forbidden.' });
    }
    next();
  });

  api.post('/contact', async (req, res, next) => {
    try {
      // Honeypot: bots fill the hidden "website" field. Pretend success.
      if (req.body.website) return res.json({ message: 'Thank you! We will be in touch soon.' });
      const { data, errors } = validateContact(req.body);
      if (Object.keys(errors).length) return res.status(422).json({ message: 'Please fix the highlighted fields.', errors });

      await save('contacts.jsonl', data);
      if (mailer) {
        await mailer.sendMail({
          from: env.MAIL_FROM,
          to: env.MAIL_TO,
          replyTo: data.email,
          subject: `New enquiry: ${data.subject.replace(/[\r\n]+/g, ' ')}`,
          text: `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || '-'}\nPlan: ${data.plan || '-'}\n\n${data.message}`,
          html: `<p><b>Name:</b> ${escapeHtml(data.name)}<br><b>Email:</b> ${escapeHtml(data.email)}<br><b>Phone:</b> ${escapeHtml(data.phone || '-')}<br><b>Plan:</b> ${escapeHtml(data.plan || '-')}</p><p>${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>`,
        });
      }
      res.json({ message: 'Thank you! Your message has been sent. We will reply within one business day.' });
    } catch (err) { next(err); }
  });

  api.post('/newsletter', async (req, res, next) => {
    try {
      if (req.body.website) return res.json({ message: 'Thanks for subscribing!' });
      const { data, errors } = validateNewsletter(req.body);
      if (Object.keys(errors).length) return res.status(422).json({ message: errors.email, errors });
      await save('subscribers.jsonl', data);
      res.json({ message: 'Thanks for subscribing!' });
    } catch (err) { next(err); }
  });

  app.use('/api', api);
  app.use('/api', (req, res) => res.status(404).json({ message: 'Not found.' }));

  app.use(express.static(distDir, { extensions: ['html'], maxAge: isProd ? '7d' : 0,
    setHeaders: (res, path) => { if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); } }));
  app.use((req, res) => res.status(404).sendFile(join(distDir, '404.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
      return res.status(400).json({ message: 'Invalid request.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Sorry, something went wrong on our side. Please try again or contact us on WhatsApp.' });
  });

  return app;
}
