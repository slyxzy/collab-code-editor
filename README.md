# WeaveKit

A real-time collaborative code editor built with modern web technologies. Multiple users can write code together simultaneously with live synchronization, session persistence, and multi-language support.

## Features

- **Real-time Collaboration**: Multiple users can edit code simultaneously with instant synchronization via WebSockets
- **Session Management**: Create, save, and load coding sessions with automatic persistence to SQL database
- **Multi-Language Support**: Syntax highlighting for JavaScript, TypeScript, Python, Java, C++, C#, and Go
- **Live User Tracking**: See who's currently editing with color-coded user indicators
- **Professional Editor**: Powered by Monaco Editor (VS Code's editor engine)
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## Tech Stack

### Frontend
- React 18 with TypeScript
- Monaco Editor for code editing
- Socket.io Client for real-time communication
- CSS3 with animations and gradients

### Backend
- Node.js with Express
- Socket.io for WebSocket connections
- SQLite database for session persistence
- RESTful API endpoints

### Database Schema
```sql
sessions (id, name, code, language, created_at, updated_at)
activity_logs (id, user_id, session_id, action, metadata, timestamp)
```

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/collab-code-editor.git
cd collab-code-editor
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

## Running the Application

### Start the Backend Server
```bash
cd server
node index.js
```
Server will run on `http://localhost:3001`

### Start the Frontend
Open a new terminal:
```bash
cd client
npm start
```
Application will open at `http://localhost:3000`

## Usage

1. **Creating a Session**: Click "New Session" to create a new collaborative coding session
2. **Saving Work**: Click "Save" to persist your code to the database
3. **Loading Sessions**: Click "Sessions" to view and load previously saved sessions
4. **Changing Languages**: Use the language dropdown to switch syntax highlighting
5. **Collaboration**: Share your session - multiple users can join by accessing the same URL

## Testing Multi-User Collaboration

1. Open the application in two browser windows
2. Type in one window and watch the code appear in real-time in the other
3. User count and color-coded badges update automatically

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | Retrieve all sessions |
| GET | `/api/sessions/:id` | Get specific session |
| POST | `/api/sessions` | Create or update session |
| DELETE | `/api/sessions/:id` | Delete session |
| GET | `/api/sessions/:id/stats` | Get session statistics |
| GET | `/api/analytics/active` | Get most active sessions |

## Project Structure

```
collab-code-editor/
├── server/
│   ├── index.js           # Express server and WebSocket handlers
│   ├── database.js        # SQLite database configuration and queries
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.tsx        # Main React component
│   │   └── App.css        # Styling and animations
│   └── package.json
└── README.md
```

## Key Technical Features

### WebSocket Communication
- Real-time bidirectional communication between clients and server
- Automatic reconnection handling
- Room-based session management

### Database Operations
- CRUD operations for session management
- Activity logging for analytics
- Optimized queries with proper indexing

### State Management
- React hooks (useState, useRef, useEffect)
- Socket event handling
- Debounced auto-save functionality

## Performance Optimizations

- Debounced database writes to reduce I/O operations
- Efficient WebSocket event handling
- Optimized re-renders with proper React patterns
- Monaco Editor with lazy loading

## Future Enhancements

- User authentication and authorization
- Code execution capabilities
- Syntax error detection and linting
- Code sharing via unique URLs
- Video/audio chat integration
- Theme customization
- Export code to files

## Acknowledgments

- Monaco Editor by Microsoft
- Socket.io for WebSocket implementation
- Create React App for project bootstrapping