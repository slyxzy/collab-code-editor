import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { io, Socket } from 'socket.io-client';
import './App.css';

interface User {
  id: string;
  color: string;
}

interface Session {
  id: string;
  name: string;
  language: string;
  created_at: string;
  updated_at: string;
}

function App() {
  const [code, setCode] = useState('// Start coding together!\n');
  const [users, setUsers] = useState<User[]>([]);
  const [language, setLanguage] = useState('javascript');
  const [sessionId, setSessionId] = useState('default-session');
  const [sessionName, setSessionName] = useState('My Coding Session');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showSessionList, setShowSessionList] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  const socketRef = useRef<Socket | null>(null);
  const editorRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io('http://localhost:3001');

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      socketRef.current?.emit('join-session', sessionId);
    });

    socketRef.current.on('session-init', (data: any) => {
      setCode(data.code);
      setLanguage(data.language);
      setUsers(data.users);
    });

    socketRef.current.on('code-update', (data: any) => {
      setCode(data.code);
    });

    socketRef.current.on('language-update', (data: any) => {
      setLanguage(data.language);
    });

    socketRef.current.on('users-update', (updatedUsers: User[]) => {
      setUsers(updatedUsers);
    });

    socketRef.current.on('user-joined', (user: User) => {
      console.log('User joined:', user.id);
    });

    socketRef.current.on('user-left', (data: any) => {
      console.log('User left:', data.id);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [sessionId]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/sessions');
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      socketRef.current?.emit('code-change', { 
        code: value,
        sessionName 
      });

      // Debounced save status
      setSaveStatus('Saving...');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('Saved ✓');
        setTimeout(() => setSaveStatus(''), 2000);
      }, 1000);
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    socketRef.current?.emit('language-change', { 
      language: newLanguage,
      sessionName 
    });
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const createNewSession = () => {
    const newSessionId = `session-${Date.now()}`;
    const newSessionName = prompt('Enter session name:', 'New Session');
    if (newSessionName) {
      setSessionId(newSessionId);
      setSessionName(newSessionName);
      setCode('// Start coding together!\n');
      
      // Create session in database
      fetch('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newSessionId,
          name: newSessionName,
          code: '// Start coding together!\n',
          language: 'javascript'
        })
      }).then(() => {
        loadSessions();
        socketRef.current?.emit('join-session', newSessionId);
      });
    }
  };

  const loadSession = (session: Session) => {
    setSessionId(session.id);
    setSessionName(session.name);
    setShowSessionList(false);
    socketRef.current?.emit('join-session', session.id);
  };

  const saveCurrentSession = async () => {
    try {
      await fetch('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          name: sessionName,
          code: code,
          language: language
        })
      });
      setSaveStatus('Saved ✓');
      setTimeout(() => setSaveStatus(''), 2000);
      loadSessions();
    } catch (error) {
      console.error('Error saving session:', error);
      setSaveStatus('Save failed ✗');
    }
  };

  return (
    <div className="App">
      <header className="header">
        <div className="header-left">
          <h1>WeaveKit</h1>
          <span className="session-name">{sessionName}</span>
        </div>
        
        <div className="controls">
          <button onClick={createNewSession} className="btn-new">
           New Session
          </button>
          
          <button onClick={() => setShowSessionList(!showSessionList)} className="btn-sessions">
             Sessions
          </button>
          
          <button onClick={saveCurrentSession} className="btn-save">
            Save
          </button>
          
          {saveStatus && <span className="save-status">{saveStatus}</span>}
          
          <select 
            value={language} 
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="language-select"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="csharp">C#</option>
            <option value="go">Go</option>
          </select>
          
          <div className="users-count">
           {users.length} online
          </div>
        </div>
      </header>

      {showSessionList && (
        <div className="session-list-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Your Sessions</h2>
              <button onClick={() => setShowSessionList(false)} className="btn-close">✕</button>
            </div>
            <div className="session-list">
              {sessions.length === 0 ? (
                <p className="no-sessions">No saved sessions yet</p>
              ) : (
                sessions.map(session => (
                  <div 
                    key={session.id} 
                    className="session-item"
                    onClick={() => loadSession(session)}
                  >
                    <div className="session-info">
                      <h3>{session.name}</h3>
                      <span className="session-lang">{session.language}</span>
                    </div>
                    <span className="session-date">
                      {new Date(session.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="editor-container">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>
      
      <div className="user-list">
        {users.map((user) => (
          <div 
            key={user.id} 
            className="user-badge" 
            style={{ backgroundColor: user.color }}
            title={user.id}
          >
            {user.id.slice(0, 6)}
          </div>
        ))}
      </div>

      <div className="footer">
        <span>Session ID: {sessionId.slice(0, 12)}...</span>
        <span>Full-Stack Collaborative Editor</span>
      </div>
    </div>
  );
}

export default App;