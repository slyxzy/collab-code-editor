const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'sessions.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Initialize database tables - MUST complete before server starts
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Sessions table
      db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT DEFAULT '// Start coding together!\n',
          language TEXT DEFAULT 'javascript',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating sessions table:', err);
          reject(err);
        } else {
          console.log('✓ Sessions table ready');
        }
      });

      // Activity logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT,
          session_id TEXT,
          action TEXT,
          metadata TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating activity_logs table:', err);
          reject(err);
        } else {
          console.log('✓ Activity logs table ready');
        }
      });

      // Create indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_session_updated ON sessions(updated_at DESC)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_activity_session ON activity_logs(session_id, timestamp)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id, timestamp)`, (err) => {
        if (err) {
          console.error('Error creating indexes:', err);
          reject(err);
        } else {
          console.log('✓ Database indexes created');
          resolve();
        }
      });
    });
  });
}

// Database query functions
const dbQueries = {
  // Create or update session
  saveSession: (id, name, code, language) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO sessions (id, name, code, language, updated_at) 
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, name, code, language],
        function(err) {
          if (err) reject(err);
          else resolve({ id, name, code, language });
        }
      );
    });
  },

  // Get session by ID
  getSession: (id) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM sessions WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Get all sessions
  getAllSessions: () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, name, language, created_at, updated_at 
         FROM sessions 
         ORDER BY updated_at DESC 
         LIMIT 50`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },

  // Delete session
  deleteSession: (id) => {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM sessions WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else resolve({ deleted: this.changes > 0 });
        }
      );
    });
  },

  // Log activity - with error handling
  logActivity: (userId, sessionId, action, metadata = {}) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO activity_logs (user_id, session_id, action, metadata) 
         VALUES (?, ?, ?, ?)`,
        [userId, sessionId, action, JSON.stringify(metadata)],
        function(err) {
          if (err) {
            console.warn('Failed to log activity (non-critical):', err.message);
            resolve({ skipped: true }); // Don't fail the operation
          } else {
            resolve({ id: this.lastID });
          }
        }
      );
    });
  },

  // Get session statistics
  getSessionStats: (sessionId) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          s.id,
          s.name,
          s.language,
          s.created_at,
          COUNT(DISTINCT a.user_id) as unique_users,
          COUNT(CASE WHEN a.action = 'edit' THEN 1 END) as total_edits,
          MAX(a.timestamp) as last_activity
         FROM sessions s
         LEFT JOIN activity_logs a ON s.id = a.session_id
         WHERE s.id = ?
         GROUP BY s.id`,
        [sessionId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Get most active sessions
  getMostActiveSessions: () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          s.id,
          s.name,
          s.language,
          COUNT(DISTINCT a.user_id) as user_count,
          COUNT(CASE WHEN a.action = 'edit' THEN 1 END) as edit_count
         FROM sessions s
         LEFT JOIN activity_logs a ON s.id = a.session_id
         WHERE a.timestamp > datetime('now', '-7 days')
         GROUP BY s.id
         ORDER BY edit_count DESC
         LIMIT 10`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }
};

module.exports = { db, dbQueries, initializeDatabase };