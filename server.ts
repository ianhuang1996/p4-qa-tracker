import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Setup Multer for local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    // Keep original extension
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + ext)
  }
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// API Routes for File Upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${file.filename}`;
  res.json({ 
    success: true, 
    url: fileUrl,
    name: file.originalname,
    size: file.size,
    type: file.mimetype
  });
});

// Slack notification API
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

// Cache: email -> Slack user ID
const slackUserCache: Record<string, string> = {};

async function getSlackUserId(email: string): Promise<string | null> {
  if (slackUserCache[email]) return slackUserCache[email];
  if (!SLACK_BOT_TOKEN) return null;

  try {
    const res = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
      headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
    });
    const data = await res.json() as any;
    if (data.ok && data.user?.id) {
      slackUserCache[email] = data.user.id;
      return data.user.id;
    }
  } catch (error) {
    console.error('Slack lookupByEmail error:', error);
  }
  return null;
}

app.post('/api/slack/notify', async (req, res) => {
  if (!SLACK_BOT_TOKEN) {
    return res.status(500).json({ error: 'Slack not configured' });
  }

  const { email, message, itemId, itemTitle, type } = req.body;
  if (!email || !message) {
    return res.status(400).json({ error: 'Missing email or message' });
  }

  try {
    const slackUserId = await getSlackUserId(email);
    if (!slackUserId) {
      return res.status(404).json({ error: 'Slack user not found for email' });
    }

    const emoji = type === 'status_change' ? '🔄' : type === 'assignment' ? '👤' : '💬';

    const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: slackUserId,
        text: `${emoji} *OVideo Team*\n${message}\n📌 _${itemTitle}_ (${itemId})`,
      }),
    });

    const slackData = await slackRes.json() as any;
    if (slackData.ok) {
      res.json({ success: true });
    } else {
      console.error('Slack postMessage error:', slackData.error);
      res.status(500).json({ error: slackData.error });
    }
  } catch (error) {
    console.error('Slack notify error:', error);
    res.status(500).json({ error: 'Failed to send Slack notification' });
  }
});

// Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
