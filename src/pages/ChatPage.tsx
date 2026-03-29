import { useEffect, useState, useRef, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';

interface ChatMsg {
  id?: number;
  role: string;
  message: string;
  time?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getChatHistory().then(setMessages).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', message: userMsg }]);
    setLoading(true);

    try {
      const data = await api.sendChat(userMsg);
      setMessages(prev => [...prev, { role: 'assistant', message: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', message: 'Sorry, I couldn\'t process that request. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>AI Assistant</h2>
        <p>Chat with your context-aware AI companion</p>
      </div>

      <motion.div
        className="card"
        style={{ padding: 0, overflow: 'hidden' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="chat-container">
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="empty-state" style={{ padding: '60px 20px' }}>
                <div className="empty-icon">🤖</div>
                <p>Start a conversation with your AI assistant.<br/>
                Ask about medications, activities, or health status.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                className={`chat-bubble ${msg.role}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {msg.message}
              </motion.div>
            ))}
            {loading && (
              <motion.div
                className="chat-bubble assistant"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span style={{ display: 'inline-flex', gap: 4 }}>
                  <span style={{ animation: 'pulse-dot 1s infinite' }}>●</span>
                  <span style={{ animation: 'pulse-dot 1s infinite 0.2s' }}>●</span>
                  <span style={{ animation: 'pulse-dot 1s infinite 0.4s' }}>●</span>
                </span>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSend}>
            <input
              className="form-input"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button className="btn btn-primary" type="submit" disabled={loading}>
              Send
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
