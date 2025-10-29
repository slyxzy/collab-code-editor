# WeaveKit

**Live Demo:** [https://weavekit.netlify.app](https://weavekit.netlify.app)

A production-ready real-time collaborative code editor that enables multiple users to write code together simultaneously. Built with modern web technologies and deployed on cloud infrastructure, WeaveKit demonstrates full-stack development capabilities including distributed systems, database management, and real-time communication protocols.

---

## Live Demo

### Quick Start Guide:
1. Visit the live demo link
2. Start typing code in the editor
3. Open the same link on another device or share with a friend
4. Watch real-time synchronization in action!

### Sharing Sessions:
- Click **"Share"** button to copy session link
- Send link to collaborators via text, email, or any messaging app
- All users with the link will join the same collaborative session

---

## Features

### Core Functionality
- **Real-Time Collaboration**: Multiple users can edit code simultaneously with instant synchronization via WebSocket connections
- **Session Persistence**: All coding sessions are automatically saved to SQL database with CRUD operations
- **Multi-Language Support**: Syntax highlighting for JavaScript, TypeScript, Python, Java, C++, C#, and Go
- **Session Management**: Create, save, load, and share coding sessions across devices
- **Live User Tracking**: See active collaborators with color-coded indicators
- **Cross-Platform**: Works seamlessly on desktop, tablet, and mobile devices

### Technical Highlights
- Production deployment on cloud infrastructure (Netlify + Render)
- WebSocket-based bidirectional communication
- RESTful API with Express.js
- SQL database with optimized queries and indexing
- Monaco Editor integration (VS Code's editor engine)
- Responsive UI with modern CSS animations

---

## Possible Use Cases

- **Remote Pair Programming**: Collaborate on code with teammates in real-time
- **Code Interviews**: Conduct technical interviews with live coding
- **Teaching & Tutoring**: Demonstrate coding concepts with students
- **Code Reviews**: Review and discuss code changes collaboratively
- **Hackathons**: Quick collaborative coding environment

---

## Tech Stack

### Frontend
- **React 18** with TypeScript for type-safe component architecture
- **Monaco Editor** for professional code editing experience
- **Socket.io Client** for real-time WebSocket communication
- **CSS3** with custom animations and responsive design
- **Deployed on Netlify** with CI/CD pipeline

### Backend
- **Node.js** with Express.js framework
- **Socket.io** for WebSocket server implementation
- **SQLite** database for session and activity persistence
- **RESTful API** architecture with proper error handling
- **Deployed on Render** with automatic scaling

### Database Schema
```sql
sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  language TEXT,
  created_at DATETIME,
  updated_at DATETIME
)

activity_logs (
  id INTEGER PRIMARY KEY,
  user_id TEXT,
  session_id TEXT,
  action TEXT,
  metadata TEXT,
  timestamp DATETIME
)
```

---

## Architecture Overview

### System Design
```
┌─────────────┐         WebSocket           ┌──────────────┐
│   Client 1  │◄──────────────────────────► │              │
│  (Browser)  │         HTTPS/WSS           │   Backend    │
└─────────────┘                             │   Server     │
                                            │  (Node.js)   │
┌─────────────┐         WebSocket           │              │
│   Client 2  │◄──────────────────────────► │  Socket.io   │
│  (Browser)  │         HTTPS/WSS           │              │
└─────────────┘                             └──────┬───────┘
                                                   │
┌─────────────┐         WebSocket                  │
│   Client N  │◄───────────────────────────────────┘
│  (Browser)  │         HTTPS/WSS                  │
└─────────────┘                                    │
                                                   ▼
                                            ┌──────────────┐
                                            │   SQLite     │
                                            │   Database   │
                                            └──────────────┘
```

### Key Technical Components

**Real-Time Communication:**
- WebSocket protocol for bidirectional data flow
- Room-based session management for isolation
- Automatic reconnection with exponential backoff
- Event-driven architecture for code updates

**Data Persistence:**
- SQL database with ACID compliance
- Optimized queries with proper indexing
- Activity logging for analytics
- Debounced write operations to reduce I/O

**State Management:**
- In-memory session cache for performance
- React hooks (useState, useRef, useEffect)
- Synchronized state across distributed clients

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check endpoint |
| GET | `/api/sessions` | Retrieve all saved sessions |
| GET | `/api/sessions/:id` | Get specific session details |
| POST | `/api/sessions` | Create or update a session |
| DELETE | `/api/sessions/:id` | Delete a session |
| GET | `/api/sessions/:id/stats` | Get session analytics |
| GET | `/api/analytics/active` | Get most active sessions |

---

## Local Development Setup

### Prerequisites
- Node.js v18 or higher
- npm or yarn package manager
- Git

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/YOUR_USERNAME/collab-code-editor.git
cd collab-code-editor
```

2. **Install backend dependencies:**
```bash
cd server
npm install
```

3. **Install frontend dependencies:**
```bash
cd ../client
npm install
```

4. **Create environment variable:**
```bash
# In client folder, create .env file
echo "REACT_APP_API_URL=http://localhost:3001" > .env
```

### Running Locally

**Terminal 1 - Start Backend:**
```bash
cd server
node index.js
```
Server runs on `http://localhost:3001`

**Terminal 2 - Start Frontend:**
```bash
cd client
npm start
```
Application opens at `http://localhost:3000`

---

## Deployment

### Production Environment
- **Frontend:** Netlify with automatic deployments from GitHub
- **Backend:** Render with automatic scaling and health monitoring
- **Database:** SQLite with persistent storage on Render infrastructure

### Environment Configuration

**Netlify Environment Variables:**
```
REACT_APP_API_URL=https://weavekit-api.onrender.com
```

**Render Configuration:**
- Build Command: `npm install`
- Start Command: `node index.js`
- Auto-deploy: Enabled on `main` branch

---

## AWS S3 Backups (Automated, rolling 23 snapshots)

This project supports optional automated backups of session data to AWS S3 with a rolling retention of 23 snapshots per session. The oldest backups are deleted automatically once the limit is exceeded.

### What this does for your website
- **Data durability**: Stores session snapshots in S3, protecting against local DB loss.
- **Point-in-time restore**: You can fetch any of the last 23 snapshots per session.
- **Low overhead**: Backups are fire-and-forget and prune themselves.

### When backups trigger
- On REST saves to `/api/sessions`
- On code edits (`code-change` WebSocket event)
- On language changes (`language-change` WebSocket event)
- Optional: a `backup-now` WebSocket event can be emitted by the client to force a snapshot

### Setup
1) Create an S3 bucket (e.g., `weavekit-backups`).

2) Provision IAM credentials with permissions for:
   - `s3:PutObject`, `s3:ListBucket`, `s3:DeleteObject` on that bucket.

3) Set backend environment variables (Render or local `.env` in `server/`):
```
AWS_ACCESS_KEY_ID=YOUR_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET
AWS_REGION=us-east-1
S3_BUCKET_NAME=weavekit-backups
# Optional: override retention (default 23)
S3_MAX_BACKUPS=23
```

4) Deploy/restart the backend.

Backups are stored under `sessions/<sessionId>/backup-<timestamp>.json`.

---

## Performance Optimizations

- **Debounced Database Writes**: Reduces I/O operations during rapid typing
- **Efficient WebSocket Events**: Minimized payload sizes for low-latency updates
- **Optimized SQL Queries**: Indexed columns for fast session retrieval
- **React Component Optimization**: Proper memoization to prevent unnecessary re-renders
- **Monaco Editor Lazy Loading**: Code editor loads on-demand for faster initial page load

---

## Security Features

- CORS configuration restricting API access to authorized domains
- Input validation on all API endpoints
- SQL injection prevention through parameterized queries
- Rate limiting on WebSocket connections
- Secure WebSocket (WSS) connections in production

---

## Key Technical Achievements

### Distributed Systems
- Implemented WebSocket-based real-time synchronization across multiple concurrent clients
- Built room-based session isolation for scalable multi-tenant architecture
- Developed automatic reconnection logic with graceful degradation

### Database Design
- Normalized SQL schema with foreign key relationships
- Optimized query performance with strategic indexing
- Activity logging system for user analytics and debugging

### Full-Stack Integration
- RESTful API following industry best practices
- Type-safe frontend with TypeScript interfaces
- Error handling and logging throughout the stack
- Production deployment with CI/CD pipeline

---

## Browser Compatibility

- Chrome/Edge (Recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Project Structure

```
collab-code-editor/
├── client/                    # React frontend application
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── App.tsx          # Main React component
│   │   ├── App.css          # Styling and animations
│   │   └── index.tsx        # Application entry point
│   └── package.json
├── server/                    # Node.js backend server
│   ├── index.js             # Express server & WebSocket handlers
│   ├── database.js          # SQLite database layer
│   ├── sessions.db          # SQLite database file (generated)
│   └── package.json
└── README.md
```

---

## Future Enhancements

### Planned Features
- User authentication with OAuth 2.0
- AWS S3 integration for code export and sharing
- Code execution capabilities with sandboxed environments
- Video/audio chat integration for enhanced collaboration
- Syntax error detection and real-time linting
- Code sharing via unique short URLs
- Theme customization (light/dark modes)
- File upload and multi-file project support

### Scalability Improvements
- Migration to PostgreSQL or DynamoDB for horizontal scaling
- Redis pub/sub for multi-server WebSocket synchronization
- CloudWatch monitoring and alerting
- Load balancing with multiple backend instances