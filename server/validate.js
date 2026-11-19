const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;

// Trim, drop control characters, and enforce max length.
const clean = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max) : '');

export function validateContact(body) {
  const data = {
    name: clean(body.name, 100),
    email: clean(body.email, 254).toLowerCase(),
    phone: clean(body.phone, 20),
    subject: clean(body.subject, 150),
    message: clean(body.message, 5000),
    plan: clean(body.plan, 20),
  };
  const errors = {};
  if (data.name.length < 2) errors.name = 'Please enter your name (at least 2 characters).';
  if (!EMAIL_RE.test(data.email)) errors.email = 'Please enter a valid email address.';
  if (data.phone && !PHONE_RE.test(data.phone)) errors.phone = 'Please enter a valid phone number.';
  if (data.subject.length < 3) errors.subject = 'Please enter a subject (at least 3 characters).';
  if (data.message.length < 10) errors.message = 'Please enter a message (at least 10 characters).';
  if (!/^[a-z]*$/.test(data.plan)) data.plan = '';
  return { data, errors };
}

export function validateNewsletter(body) {
  const email = clean(body.email, 254).toLowerCase();
  return { data: { email }, errors: EMAIL_RE.test(email) ? {} : { email: 'Please enter a valid email address.' } };
}

export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
