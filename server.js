// server.js 
require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const connectDB = require('./config/database');
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const errorHandler = require('./middlewares/errorHandler');
const { registerDocumentSocket } = require('./sockets/documentSocket');

const app = express();
app.set('trust proxy', 1);
connectDB();

// ---- CORS (shared between express + socket.io) ----
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
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---- REST routes ----
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/docs', documentRoutes);

app.get('/api/health', (req, res) =>
  res.json({ status: 'success', timestamp: new Date().toISOString() })
);

app.use((req, res) => res.status(404).json({ status: 'error', message: 'Route not found' }));
app.use(errorHandler);

// ---- Create HTTP server + attach Socket.IO ----
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions,
  // large text = large payload; 1MB is plenty for a writing board
  maxHttpBufferSize: 1e6
});

registerDocumentSocket(io);

// ---- Start ----
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});