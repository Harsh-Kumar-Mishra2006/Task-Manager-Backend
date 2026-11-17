// server.js
require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const connectDB = require('./config/database');
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const errorHandler = require('./middlewares/errorHandler');
const { registerDocumentSocket } = require('./sockets/documentSocket');

// FIX #6: fail fast if JWT_SECRET missing/default in production
if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret-change-me')
) {
  throw new Error('JWT_SECRET must be set to a strong value in production');
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const app = express();
app.set('trust proxy', 1);
connectDB();

// ---- CORS ----
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://colledge-connect-assignment-frontend.onrender.com'
].filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    return allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// FIX #5: global limiter loosened for collaborative traffic; auth gets its own strict limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts. Try again in 15 minutes.' }
});

app.use(generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// ---- REST routes ----
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/docs', documentRoutes);

app.get('/api/health', (req, res) =>
  res.json({ status: 'success', timestamp: new Date().toISOString() })
);

app.use((req, res) => res.status(404).json({ status: 'error', message: 'Route not found' }));
app.use(errorHandler);

// ---- HTTP + Socket.IO ----
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions,
  maxHttpBufferSize: 1e6
});

// FIX #10: authenticate every socket handshake
const parseCookie = (cookieHeader = '') =>
  Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    })
  );

io.use((socket, next) => {
  try {
    const bearer = socket.handshake.auth?.token;
    const cookieToken = parseCookie(socket.handshake.headers.cookie).token;
    const token = bearer || cookieToken;
    if (!token) return next(new Error('unauthorized'));

    socket.user = jwt.verify(token, JWT_SECRET); // { userId, email, role, name }
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

registerDocumentSocket(io);  // uses socket.user for room authz

// ---- Start ----
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});