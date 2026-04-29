import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ─── Firebase Admin (for ID token verification) ──────────────────
// Service-account JSON is preferred; project-id only also verifies ID tokens
// since Google's signing keys are publicly fetchable. Use service account
// when you need to do server-side Firestore writes (audit log etc).
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
try {
  if (SERVICE_ACCOUNT_JSON) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(SERVICE_ACCOUNT_JSON)) });
    console.log('✅ firebase-admin: initialized with service account');
  } else {
    admin.initializeApp({ projectId: firebaseConfig.projectId });
    console.warn('⚠️  firebase-admin: initialized with projectId only (no service account). ID token verification works but server-side Firestore writes will not.');
  }
} catch (err) {
  console.error('❌ firebase-admin init failed:', err);
}

// ─── AI client (server-side, key never reaches browser) ──────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
if (!ai) console.warn('⚠️  GEMINI_API_KEY not set — AI endpoints disabled');

// ─── Slack ───────────────────────────────────────────────────────
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
if (!SLACK_BOT_TOKEN) console.warn('⚠️  SLACK_BOT_TOKEN not set — Slack notifications disabled');

// ─── ImgBB ───────────────────────────────────────────────────────
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || process.env.VITE_IMGBB_API_KEY;
if (!IMGBB_API_KEY) console.warn('⚠️  IMGBB_API_KEY not set — image upload via ImgBB disabled');

// ─── Uploads dir ─────────────────────────────────────────────────
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// ─── Mimetype whitelist + extension lookup ───────────────────────
// Excludes html / svg / js / wasm / executables — those are blocked because
// they can run in the browser context. Static files are also served with
// X-Content-Type-Options: nosniff to prevent type sniffing.
const ALLOWED_MIME: Record<string, string> = {
  // Images
  'image/png':       '.png',
  'image/jpeg':      '.jpg',
  'image/gif':       '.gif',
  'image/webp':      '.webp',
  'image/bmp':       '.bmp',
  // Video
  'video/mp4':        '.mp4',
  'video/quicktime':  '.mov',
  'video/webm':       '.webm',
  'video/x-msvideo':  '.avi',
  // Audio
  'audio/mpeg':      '.mp3',
  'audio/wav':       '.wav',
  'audio/ogg':       '.ogg',
  'audio/x-m4a':     '.m4a',
  // Documents
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  // Plain text
  'text/plain':      '.txt',
  'text/csv':        '.csv',
  'text/markdown':   '.md',
  'application/json': '.json',
  'application/xml': '.xml',
  // Archives (don't auto-execute, safe to store)
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'application/x-7z-compressed': '.7z',
  'application/x-rar-compressed': '.rar',
  'application/gzip': '.gz',
  'application/x-tar': '.tar',
};

// Dangerous extensions blocked regardless of advertised mimetype.
// Browsers may send `application/octet-stream` for unknown types — in that case
// we fall back to extension-based validation.
const BLOCKED_EXT = /\.(html?|svg|js|mjs|cjs|jsx|ts|tsx|wasm|exe|bat|cmd|sh|ps1|vbs|jar|app|dmg|msi|com|scr)$/i;
const FALLBACK_ALLOWED_EXT = /\.(png|jpe?g|gif|webp|bmp|mp4|mov|webm|avi|mp3|wav|ogg|m4a|pdf|docx?|xlsx?|pptx?|txt|csv|md|json|xml|zip|7z|rar|gz|tar|log)$/i;

function pickFilenameAndExt(file: Express.Multer.File): string | null {
  // Primary: use whitelisted mimetype's canonical extension.
  const direct = ALLOWED_MIME[file.mimetype];
  if (direct) return direct;
  // Fallback: octet-stream / generic types — accept by extension if it's safe.
  if (FALLBACK_ALLOWED_EXT.test(file.originalname) && !BLOCKED_EXT.test(file.originalname)) {
    return path.extname(file.originalname).toLowerCase();
  }
  return null;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = pickFilenameAndExt(file);
      if (!ext) return cb(new Error(`unsupported file: ${file.originalname} (${file.mimetype})`), '');
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + ext);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (BLOCKED_EXT.test(file.originalname)) {
      console.warn('[upload] rejected (blocked extension):', file.originalname, file.mimetype);
      return cb(new Error(`不允許的檔案類型：${path.extname(file.originalname)}`));
    }
    if (pickFilenameAndExt(file)) {
      cb(null, true);
    } else {
      console.warn('[upload] rejected (mimetype not allowed):', file.originalname, file.mimetype);
      cb(new Error(`不支援的檔案類型：${file.mimetype} (${file.originalname})`));
    }
  },
});

// ─── Middleware: helmet, CORS, JSON, rate limit ──────────────────
app.use(helmet({
  // Vite dev injects inline scripts; keep CSP off in dev to avoid breaking HMR.
  contentSecurityPolicy: isProd ? undefined : false,
  // We serve uploaded images via <img>, must allow same-origin embed.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Default helmet sets COOP=same-origin which BLOCKS Firebase Auth popup
  // from posting back to the parent window. Allow popups explicitly.
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));

const allowedOrigins = (process.env.CORS_ORIGINS || 'https://p4-qa-tracker.onrender.com')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // No Origin header = same-origin / curl / native fetch. Allow.
    if (!origin) return cb(null, true);
    // In dev, allow any localhost / 127.0.0.1 / 0.0.0.0 port.
    if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(origin)) {
      return cb(null, true);
    }
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // Reject without throwing — let cors send 403 cleanly.
    return cb(null, false);
  },
  credentials: false,
}));

app.use(express.json({ limit: '1mb' }));

// Per-IP rate limit on /api/* — 60 reqs/min default, 10 reqs/min on AI/Slack endpoints
const generalApiLimiter = rateLimit({
  windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false,
});
const tightApiLimiter = rateLimit({
  windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false,
});

app.use('/api/', generalApiLimiter);

// ─── Auth middleware: verify Firebase ID token ───────────────────
interface AuthedRequest extends Request {
  auth?: { uid: string; email?: string; emailVerified?: boolean };
}
async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ error: 'missing bearer token' });
  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    req.auth = { uid: decoded.uid, email: decoded.email, emailVerified: decoded.email_verified };
    next();
  } catch {
    res.status(401).json({ error: 'invalid token' });
  }
}

// Static uploads — set CT correctly to avoid sniff-driven exec
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Force HTML/SVG to download rather than render in our origin
    if (/\.(html?|svg)$/i.test(filePath)) {
      res.setHeader('Content-Disposition', 'attachment');
    }
  },
}));

// ─── /api/health ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ─── /api/upload (auth + mimetype whitelist) ─────────────────────
app.post('/api/upload', requireAuth, (req: AuthedRequest, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'upload failed' });
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) return res.status(400).json({ error: 'no file' });
    res.json({
      success: true,
      url: `/uploads/${file.filename}`,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
    });
  });
});

// ─── /api/imgbb/upload (server-side proxy, key stays on server) ──
app.post('/api/imgbb/upload', tightApiLimiter, requireAuth, (req: AuthedRequest, res) => {
  if (!IMGBB_API_KEY) return res.status(503).json({ error: 'imgbb not configured' });
  const memUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (/^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype)) cb(null, true);
      else cb(new Error(`mimetype ${file.mimetype} not allowed`));
    },
  }).single('image');
  memUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'upload failed' });
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) return res.status(400).json({ error: 'no file' });
    try {
      const fd = new FormData();
      fd.append('image', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
      const r = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: fd });
      const data = await r.json();
      if (!r.ok || !data?.success) return res.status(502).json({ error: 'imgbb upload failed' });
      res.json({ success: true, url: data.data.url, displayUrl: data.data.display_url });
    } catch (e) {
      console.error('imgbb proxy error:', e);
      res.status(500).json({ error: 'imgbb proxy error' });
    }
  });
});

// ─── /api/slack/notify (sender from token, not client body) ──────
async function getSlackUserId(email: string, cache: Record<string, string>): Promise<string | null> {
  if (cache[email]) return cache[email];
  if (!SLACK_BOT_TOKEN) return null;
  try {
    const r = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
    });
    const data = await r.json() as { ok: boolean; user?: { id: string } };
    if (data.ok && data.user?.id) {
      cache[email] = data.user.id;
      return data.user.id;
    }
  } catch (e) { console.error('Slack lookup error:', e); }
  return null;
}
const slackUserCache: Record<string, string> = {};

app.post('/api/slack/notify', tightApiLimiter, requireAuth, async (req: AuthedRequest, res) => {
  if (!SLACK_BOT_TOKEN) return res.status(503).json({ error: 'slack not configured' });
  const { recipientEmail, message, itemId, itemTitle, type } = req.body ?? {};
  if (!recipientEmail || !message) return res.status(400).json({ error: 'missing recipientEmail or message' });
  if (typeof message !== 'string' || message.length > 2000) return res.status(400).json({ error: 'bad message' });

  // Sender identity comes from the verified token, NOT from request body.
  const senderEmail = req.auth?.email ?? '(unknown)';

  try {
    const slackUserId = await getSlackUserId(recipientEmail, slackUserCache);
    if (!slackUserId) return res.status(404).json({ error: 'slack user not found' });
    const emoji = type === 'status_change' ? '🔄' : type === 'assignment' ? '👤' : '💬';
    const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: slackUserId,
        text: `${emoji} *OVideo Team* (來自 ${senderEmail})\n${message}\n📌 _${itemTitle || ''}_ ${itemId ? `(${itemId})` : ''}`.trim(),
      }),
    });
    const data = await slackRes.json() as { ok: boolean; error?: string };
    if (data.ok) res.json({ success: true });
    else res.status(502).json({ error: data.error || 'slack postMessage failed' });
  } catch (e) {
    console.error('slack notify error:', e);
    res.status(500).json({ error: 'slack notify failed' });
  }
});

// ─── /api/ai/* (server-side Gemini, key stays on server) ─────────
const aiLimiter = rateLimit({ windowMs: 60_000, max: 15 });
async function callGemini(prompt: string, mimeType?: 'application/json'): Promise<string> {
  if (!ai) throw new Error('AI not configured');
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: prompt,
    config: mimeType ? { responseMimeType: mimeType } : undefined,
  });
  return response.text || '';
}

app.post('/api/ai/generate', aiLimiter, requireAuth, async (req: AuthedRequest, res) => {
  if (!ai) return res.status(503).json({ error: 'ai not configured' });
  const { prompt, json } = req.body ?? {};
  if (typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({ error: 'missing prompt' });
  if (prompt.length > 50_000) return res.status(400).json({ error: 'prompt too long' });
  try {
    const text = await callGemini(prompt, json ? 'application/json' : undefined);
    res.json({ text });
  } catch (e) {
    console.error('ai generate error:', e);
    res.status(502).json({ error: 'ai upstream error' });
  }
});

// ─── Vite middleware / static ────────────────────────────────────
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
}
startServer();
