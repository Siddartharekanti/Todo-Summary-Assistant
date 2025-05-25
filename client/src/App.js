import React, { useState, useEffect } from "react";
import { Plus, Trash2, Send, CheckCircle, Circle, AlertCircle, Loader2 } from "lucide-react";
import './App.css';

const API_BASE = "http://localhost:5000";

function App() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkConnection();
    fetchTodos();
  }, []);

  const checkConnection = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        setIsConnected(true);
      }
    } catch (error) {
      setIsConnected(false);
      setStatus("❌ Cannot connect to server. Please ensure the backend is running.");
    }
  };

  const fetchTodos = async () => {
    try {
      const res = await fetch(`${API_BASE}/todos`);
      if (res.ok) {
        const data = await res.json();
        setTodos(data);
        setIsConnected(true);
      }
    } catch (error) {
      console.error("Error fetching todos:", error);
      setStatus("❌ Failed to fetch todos. Is the server running?");
      setIsConnected(false);
    }
  };

  const addTodo = async () => {
    if (!newTodo.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newTodo })
      });
      
      if (res.ok) {
        setNewTodo("");
        fetchTodos();
        showStatus("✅ Todo added successfully!", "success");
      }
    } catch (error) {
      console.error("Error adding todo:", error);
      showStatus("❌ Failed to add todo", "error");
    }
  };

  const updateTodo = async (id, updates) => {
    try {
      const res = await fetch(`${API_BASE}/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (res.ok) {
        fetchTodos();
        if (updates.text) {
          showStatus("✅ Todo updated successfully!", "success");
        }
      }
    } catch (error) {
      console.error("Error updating todo:", error);
      showStatus("❌ Failed to update todo", "error");
    }
  };

  const deleteTodo = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/todos/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        fetchTodos();
        showStatus("✅ Todo deleted successfully!", "success");
      }
    } catch (error) {
      console.error("Error deleting todo:", error);
      showStatus("❌ Failed to delete todo", "error");
    }
  };

  const summarizeAndSend = async () => {
    if (todos.length === 0) {
      showStatus("❌ No todos to summarize", "error");
      return;
    }

    setLoading(true);
    setStatus("🤖 Generating AI summary and sending to Slack...");

    try {
      const res = await fetch(`${API_BASE}/summarize`, {
        method: 'POST'
      });
      
      const data = await res.json();
      
      if (res.ok) {
        showStatus(data.message, "success");
      } else {
        showStatus(data.message || "❌ Failed to send summary", "error");
      }
    } catch (error) {
      console.error("Error summarizing:", error);
      showStatus("❌ Failed to send summary to Slack. Check server logs.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (message, type) => {
    setStatus({ message, type });
    setTimeout(() => setStatus(""), 5000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  const startEdit = (todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = () => {
    if (editText.trim()) {
      updateTodo(editingId, { text: editText.trim() });
    }
    setEditingId(null);
    setEditText("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const toggleComplete = (todo) => {
    updateTodo(todo.id, { completed: !todo.completed });
  };

  const completedCount = todos.filter(todo => todo.completed).length;
  const pendingCount = todos.length - completedCount;

  return (
    <div className="app-container">
      <div className="main-content">
        {/* Header */}
        <div className="header">
          <h1 className="title">📝 Todo Summary Assistant</h1>
          <p className="subtitle">
            Manage your tasks and get AI-powered summaries sent to Slack
          </p>
          <div className="connection-status">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <div className="status-dot"></div>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">Total Tasks</p>
                <p className="stat-value">{todos.length}</p>
              </div>
              <div className="stat-icon blue">
                <Circle size={24} />
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">Pending</p>
                <p className="stat-value orange">{pendingCount}</p>
              </div>
              <div className="stat-icon orange">
                <AlertCircle size={24} />
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">Completed</p>
                <p className="stat-value green">{completedCount}</p>
              </div>
              <div className="stat-icon green">
                <CheckCircle size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Add Todo Section */}
        <div className="card">
          <h2 className="card-title">Add New Task</h2>
          <div className="add-todo-form">
            <input
              type="text"
              value={newTodo}
              placeholder="What needs to be done?"
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyPress={handleKeyPress}
              className="todo-input"
            />
            <button 
              onClick={addTodo}
              disabled={!newTodo.trim()}
              className="add-button"
            >
              <Plus size={20} />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Todo List */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Your Tasks</h2>
          </div>
          
          <div className="card-content">
            {todos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <p className="empty-title">No tasks yet</p>
                <p className="empty-subtitle">Add your first task above to get started!</p>
              </div>
            ) : (
              <div className="todo-list">
                {todos.map((todo) => (
                  <div 
                    key={todo.id}
                    className={`todo-item ${todo.completed ? 'completed' : ''}`}
                  >
                    <div className="todo-content">
                      <button
                        onClick={() => toggleComplete(todo)}
                        className="complete-button"
                      >
                        {todo.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
                      </button>
                      
                      <div className="todo-text-container">
                        {editingId === todo.id ? (
                          <div className="edit-form">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                              className="edit-input"
                              autoFocus
                            />
                            <button onClick={saveEdit} className="save-button">Save</button>
                            <button onClick={cancelEdit} className="cancel-button">Cancel</button>
                          </div>
                        ) : (
                          <span 
                            onClick={() => startEdit(todo)}
                            className="todo-text"
                          >
                            {todo.text}
                          </span>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => deleteTodo(todo.id)}
                        className="delete-button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summarize Section */}
        <div className="card">
          <h2 className="card-title">AI Summary</h2>
          <p className="card-description">
            Get an AI-powered summary of your tasks and send it to your Slack channel
          </p>
          <button 
            onClick={summarizeAndSend}
            disabled={loading || todos.length === 0 || !isConnected}
            className={`summary-button ${loading ? 'loading' : ''} ${
              todos.length === 0 || !isConnected ? 'disabled' : ''
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="spin" />
                <span>Generating Summary...</span>
              </>
            ) : (
              <>
                <Send size={20} />
                <span>Generate AI Summary & Send to Slack</span>
              </>
            )}
          </button>
        </div>

        {/* Status Messages */}
        {status && (
          <div className={`status-message ${status.type || 'info'}`}>
            <div className="status-content">
              {status.type === 'success' ? (
                <CheckCircle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <span>{typeof status === 'string' ? status : status.message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;