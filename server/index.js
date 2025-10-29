const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const { dbQueries, initializeDatabase } = require('./database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://weavekit.netlify.app",  // Remove trailing slash
      "https://weavekit.netlify.app/",  // Keep with trailing slash
      "https://*.netlify.app"  // Allow all Netlify subdomains
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://weavekit.netlify.app",  // Remove trailing slash
    "https://weavekit.netlify.app/",  // Keep with trailing slash
    "https://*.netlify.app"
  ],
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory storage for active sessions
const activeSessions = new Map();

// Generate random color for users
function getRandomColor() {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ===== REST API ENDPOINTS =====

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Get all sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await dbQueries.getAllSessions();
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get specific session
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const session = await dbQueries.getSession(req.params.id);
    if (session) {
      res.json(session);
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Create or update session
app.post('/api/sessions', async (req, res) => {
  try {
    const { id, name, code, language } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: 'Session ID and name are required' });
    }
    const session = await dbQueries.saveSession(id, name, code || '// Start coding together!\n', language || 'javascript');
    res.json(session);
  } catch (error) {
    console.error('Error saving session:', error);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

// Delete session
app.delete('/api/sessions/:id', async (req, res) => {
  try {
    const result = await dbQueries.deleteSession(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Get session statistics
app.get('/api/sessions/:id/stats', async (req, res) => {
  try {
    const stats = await dbQueries.getSessionStats(req.params.id);
    res.json(stats || {});
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get analytics - most active sessions
app.get('/api/analytics/active', async (req, res) => {
  try {
    const sessions = await dbQueries.getMostActiveSessions();
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ===== WEBSOCKET HANDLERS =====

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  let currentSessionId = null;
  let currentUserId = socket.id;

  // Join a session
  socket.on('join-session', async (sessionId) => {
    try {
      currentSessionId = sessionId;
      socket.join(sessionId);

      // Initialize session in memory if not exists
      if (!activeSessions.has(sessionId)) {
        const dbSession = await dbQueries.getSession(sessionId);
        activeSessions.set(sessionId, {
          code: dbSession ? dbSession.code : '// Start coding together!\n',
          language: dbSession ? dbSession.language : 'javascript',
          users: new Map()
        });
      }

      const session = activeSessions.get(sessionId);
      
      // Add user to session
      session.users.set(socket.id, {
        id: socket.id,
        color: getRandomColor()
      });

      // Send current session state to new user
      socket.emit('session-init', {
        code: session.code,
        language: session.language,
        users: Array.from(session.users.values())
      });

      // Notify others about new user
      socket.to(sessionId).emit('user-joined', {
        id: socket.id,
        color: session.users.get(socket.id).color
      });

      // Update all clients with user list
      io.to(sessionId).emit('users-update', Array.from(session.users.values()));

      // Log activity
      await dbQueries.logActivity(currentUserId, sessionId, 'join', {});

      console.log(`User ${socket.id} joined session ${sessionId}`);
    } catch (error) {
      console.error('Error joining session:', error);
      socket.emit('error', { message: 'Failed to join session' });
    }
  });

  // Handle code changes
  socket.on('code-change', async (data) => {
    if (!currentSessionId) return;

    try {
      const session = activeSessions.get(currentSessionId);
      if (session) {
        session.code = data.code;
        
        // Broadcast to others in the session
        socket.to(currentSessionId).emit('code-update', {
          code: data.code,
          userId: socket.id
        });

        // Save to database (debounced in production, immediate for demo)
        await dbQueries.saveSession(
          currentSessionId,
          data.sessionName || 'Untitled',
          data.code,
          session.language
        );

        // Log activity
        await dbQueries.logActivity(currentUserId, currentSessionId, 'edit', {
          codeLength: data.code.length
        });
      }
    } catch (error) {
      console.error('Error handling code change:', error);
    }
  });

  // Handle language change
  socket.on('language-change', async (data) => {
    if (!currentSessionId) return;

    try {
      const session = activeSessions.get(currentSessionId);
      if (session) {
        session.language = data.language;
        
        // Broadcast to others
        socket.to(currentSessionId).emit('language-update', {
          language: data.language
        });

        // Save to database
        await dbQueries.saveSession(
          currentSessionId,
          data.sessionName || 'Untitled',
          session.code,
          data.language
        );

        // Log activity
        await dbQueries.logActivity(currentUserId, currentSessionId, 'language_change', {
          language: data.language
        });
      }
    } catch (error) {
      console.error('Error handling language change:', error);
    }
  });

  // Handle cursor position updates
  socket.on('cursor-move', (position) => {
    if (!currentSessionId) return;
    socket.to(currentSessionId).emit('cursor-update', {
      userId: socket.id,
      position: position
    });
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    if (currentSessionId) {
      const session = activeSessions.get(currentSessionId);
      if (session) {
        session.users.delete(socket.id);
        
        // Notify others
        socket.to(currentSessionId).emit('user-left', { id: socket.id });
        io.to(currentSessionId).emit('users-update', Array.from(session.users.values()));

        // Clean up empty sessions
        if (session.users.size === 0) {
          activeSessions.delete(currentSessionId);
        }

        // Log activity
        try {
          await dbQueries.logActivity(currentUserId, currentSessionId, 'leave', {});
        } catch (error) {
          console.error('Error logging leave activity:', error);
        }
      }
    }
  });
});

// Start server
// Start server AFTER database is initialized
const PORT = process.env.PORT || 3001;

initializeDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 WebSocket server ready`);
      console.log(`💾 Database initialized and ready`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });