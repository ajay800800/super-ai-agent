// Updated Chat.js to use ChatGPT-style layout and structured message rendering

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import NewChatButton from './NewChatButton';

export default function Chat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! 👋 What can I do for you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [image, setImage] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() && !image) return;
    const userMsg = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const res = await axios.post('/super-agent', { prompt: input });
      const answer = res.data.answer || '🤖 No response.';
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: '❌ Error contacting LLM' }]);
    }

    setIsThinking(false);
    setImage(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-box">
      <h1>🤖 LLM Assistant</h1>
      <div className="messages-container">
        <div className="messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.role}`}>
              <div className="avatar">{msg.role === 'user' ? '🧑' : '🤖'}</div>
              <div className="message">{msg.text}</div>
            </div>
          ))}
          {isThinking && (
            <div className="chat-bubble assistant">
              <div className="avatar">🤖</div>
              <div className="message"><em>Thinking...</em></div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      <div className="input-row">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your question..."
          rows={2}
        />
        <input type="file" onChange={(e) => setImage(e.target.files[0])} />
        <button onClick={sendMessage} disabled={isThinking}>Ask</button>
      </div>

      <NewChatButton onClick={() => {
        setMessages([{ role: 'assistant', text: 'Hello! 👋 What can I do for you today?' }]);
        setInput('');
      }} />
    </div>
  );
}