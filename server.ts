import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import multer from 'multer';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { db } from './src/server/db'; // Import database connection from src/server/
import { Transaction, ClientRequest, HiringOffer, DiscountedSlot } from './src/server/types'; // Import entity types

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Entities Interfaces
interface Transaction {
  id: string;
  salon_id: string;
  direction: 'income' | 'cost';
  category: string;
  amount: number;
  date: string;
  description: string | null;
  receipt_url: string | null;
  related_staff_id: string | null;
  related_request_id: string | null;
  created_at: string;
}

interface ClientRequest {
  id: string;
  client_id: string;
  target_id: string;
  target_type: string;
  service_type: string;
  service_id: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  note: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  price: number;
  cancellation_json: string;
  created_at: string;
}

interface HiringOffer {
  id: string;
  manager_id: string;
  artist_id: string;
  salon_name: string | null;
  message: string | null;
  offer_amount: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

interface DiscountedSlot {
  id: string;
  original_request_id: string;
  artist_id: string;
  artist_name: string | null;
  salon_name: string | null;
  service_type: string | null;
  date: string | null;
  time: string | null;
  original_price: number;
  discounted_price: number;
  discount_percent: number;
  app_commission_percent: number;
  status: 'available' | 'claimed' | 'expired';
  claimed_by_client_id: string | null;
  created_at: string;
}

// Middleware
app.use(express.json());

// Multer upload configuration
const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const category = ['avatars','covers','portfolio','posts','receipts','contracts']
      .includes(req.params.category) ? req.params.category : 'misc';
    const dir = path.join(UPLOAD_ROOT, category);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// Upload endpoint
app.post('/api/upload/:category', upload.single('file'), (req: express.Request, res: express.Response) => {
  if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشده است' });
  const relativeUrl = `/uploads/${req.params.category}/${req.file.filename}`;
  res.json({ url: relativeUrl });
});

// Serve uploads as static files
app.use('/uploads', express.static(UPLOAD_ROOT));

// Transactions API
app.get('/api/transactions', (req: express.Request, res: express.Response) => {
  const transactions = db.prepare('SELECT * FROM transactions').all();
  res.json(transactions);
});

app.post('/api/transactions', (req: express.Request, res: express.Response) => {
  const { salon_id, direction, category, amount, date, description, receipt_url, related_staff_id, related_request_id } = req.body;
  
  if (!salon_id || !direction || !category || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const stmt = db.prepare(`
    INSERT INTO transactions 
    (salon_id, direction, category, amount, date, description, receipt_url, related_staff_id, related_request_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    salon_id, direction, category, amount, date, description || null, receipt_url || null,
    related_staff_id || null, related_request_id || null
  );
  
  res.status(201).json(result);
});

// Client Requests API
app.get('/api/client-requests', (req: express.Request, res: express.Response) => {
  const requests = db.prepare('SELECT * FROM client_requests').all();
  res.json(requests);
});

app.post('/api/client-requests', (req: express.Request, res: express.Response) => {
  const { client_id, target_id, target_type, service_type, service_id, preferred_date, preferred_time, note, status, price, cancellation_json } = req.body;
  
  if (!client_id || !target_id || !target_type || !service_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const stmt = db.prepare(`
    INSERT INTO client_requests 
    (client_id, target_id, target_type, service_type, service_id, preferred_date, preferred_time, note, status, price, cancellation_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    client_id, target_id, target_type, service_type, service_id || null, preferred_date || null, preferred_time || null,
    note || null, status || 'pending', price || 0, cancellation_json || '[]'
  );
  
  res.status(201).json(result);
});

// Hiring Offers API
app.get('/api/hiring-offers', (req: express.Request, res: express.Response) => {
  const offers = db.prepare('SELECT * FROM hiring_offers').all();
  res.json(offers);
});

app.post('/api/hiring-offers', (req: express.Request, res: express.Response) => {
  const { manager_id, artist_id, salon_name, message, offer_amount, status } = req.body;
  
  if (!manager_id || !artist_id || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const stmt = db.prepare(`
    INSERT INTO hiring_offers 
    (manager_id, artist_id, salon_name, message, offer_amount, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    manager_id, artist_id, salon_name || null, message || null, offer_amount || '0', status || 'pending'
  );
  
  res.status(201).json(result);
});

// Discounted Slots API
app.get('/api/discounted-slots', (req: express.Request, res: express.Response) => {
  const slots = db.prepare('SELECT * FROM discounted_slots').all();
  res.json(slots);
});

app.post('/api/discounted-slots', (req: express.Request, res: express.Response) => {
  const { original_request_id, artist_id, artist_name, salon_name, service_type, date, time, original_price, discounted_price, discount_percent, app_commission_percent, status, claimed_by_client_id } = req.body;
  
  if (!original_request_id || !artist_id || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const stmt = db.prepare(`
    INSERT INTO discounted_slots 
    (original_request_id, artist_id, artist_name, salon_name, service_type, date, time, original_price, discounted_price, discount_percent, app_commission_percent, status, claimed_by_client_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    original_request_id, artist_id, artist_name || null, salon_name || null, service_type || null, date || null, time || null,
    original_price || 0, discounted_price || 0, discount_percent || 0, app_commission_percent || 0, status || 'available', claimed_by_client_id || null
  );
  
  res.status(201).json(result);
});

// Users API routes
app.get('/api/users', (req: express.Request, res: express.Response) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

app.get('/api/users/:id', (req: express.Request, res: express.Response) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Posts API
app.get('/api/posts', (req: express.Request, res: express.Response) => {
  const posts = db.prepare('SELECT * FROM posts').all();
  res.json(posts);
});

app.post('/api/posts', (req: express.Request, res: express.Response) => {
  const { author_id, content, image, tag } = req.body;
  if (!author_id || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const stmt = db.prepare(`
    INSERT INTO posts (author_id, content, image, tag, created_at, likes_count, liked_by_json)
    VALUES (?, ?, ?, ?, datetime('now'), 0, '[]')
  `);
  const result = stmt.run(author_id, content, image || null, tag || null);
  res.status(201).json(result);
});

// Services API
app.get('/api/services', (req: express.Request, res: express.Response) => {
  const services = db.prepare('SELECT * FROM services').all();
  res.json(services);
});

// Reviews API
app.get('/api/reviews', (req: express.Request, res: express.Response) => {
  const reviews = db.prepare('SELECT * FROM reviews').all();
  res.json(reviews);
});

// Leave Requests API
app.get('/api/leave-requests', (req: express.Request, res: express.Response) => {
  const leaveRequests = db.prepare('SELECT * FROM leave_requests').all();
  res.json(leaveRequests);
});

// Colleague Messages API
app.get('/api/colleague-messages', (req: express.Request, res: express.Response) => {
  const messages = db.prepare('SELECT * FROM colleague_messages').all();
  res.json(messages);
});

// Job Applications API
app.get('/api/job-applications', (req: express.Request, res: express.Response) => {
  const applications = db.prepare('SELECT * FROM job_applications').all();
  res.json(applications);
});

// Discounts API
app.get('/api/discounts', (req: express.Request, res: express.Response) => {
  const discounts = db.prepare('SELECT * FROM discounts').all();
  res.json(discounts);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Upload root: ${UPLOAD_ROOT}`);
  console.log(`Database: ${process.env.DB_PATH || path.join(process.cwd(), 'data', 'legendin.db')}`);
});