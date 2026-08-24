require('dotenv').config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');
const teamRoutes = require('./routes/teamRoutes');
const matchRoutes = require('./routes/matchRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

// Allowed origins configuration
const allowedOrigins = (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000']);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation: Origin not allowed.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

// Configure Socket.io
const io = socketio(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Connect to database
connectDB();

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Support base64 image uploads

// Attach Socket.io to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

const disputeRoutes = require('./routes/disputeRoutes');
const searchRoutes = require('./routes/searchRoutes');
const aiAssistantRoutes = require('./routes/aiAssistantRoutes');
const followRoutes = require('./routes/followRoutes');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const nextGenRoutes = require('./routes/nextGenRoutes');
const enterpriseRoutes = require('./routes/enterpriseRoutes');
const ultimateRoutes = require('./routes/ultimateRoutes');

// Swagger Spec Definition
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'ArenaVerse Esports Platform API',
    version: '2.0.0',
    description: 'Complete OpenAPI 3.0 Documentation for ArenaVerse Tournament Engine & Community Services',
  },
  servers: [{ url: 'http://localhost:5000/api' }],
};

// Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.',
});

// Strict Rate Limiter for Sensitive Auth Routes (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(globalLimiter);

// Apply strict rate limiting to sensitive authentication endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/2fa/verify', authLimiter);
app.use('/api/auth/2fa/resend', authLimiter);
app.use('/api/auth/2fa/enable', authLimiter);
app.use('/api/auth/2fa/disable', authLimiter);

const certificateRoutes = require('./routes/certificateRoutes');

const moderatorRoutes = require('./routes/moderatorRoutes');

// Mount Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/moderator', moderatorRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/ai-assistant', aiAssistantRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/nextgen', nextGenRoutes);
app.use('/api/enterprise', enterpriseRoutes);
app.use('/api/ultimate', ultimateRoutes);

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join_user', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`User joined notification room: user_${userId}`);
    }
  });

  socket.on('join_tournament', (tournamentId) => {
    socket.join(`tournament_${tournamentId}`);
    console.log(`User joined tournament room: tournament_${tournamentId}`);
  });

  socket.on('leave_tournament', (tournamentId) => {
    socket.leave(`tournament_${tournamentId}`);
    console.log(`User left tournament room: tournament_${tournamentId}`);
  });

  socket.on('join_team', (teamId) => {
    if (teamId) {
      socket.join(`team_${teamId}`);
      console.log(`User joined team room: team_${teamId}`);
    }
  });

  socket.on('leave_team', (teamId) => {
    if (teamId) {
      socket.leave(`team_${teamId}`);
      console.log(`User left team room: team_${teamId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Fallback// Server entry point - registration 2FA enabled
app.get('/', (req, res) => {
  res.send('Arena-Verse Backend API is running...');
});

const PORT = process.env.PORT || 5000;
server.timeout = 120000; // 2 minutes server timeout for long-running AI requests
server.keepAliveTimeout = 120000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
