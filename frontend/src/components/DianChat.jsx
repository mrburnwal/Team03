import React, { useState, useRef, useEffect } from 'react';

const DianChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am Dian. How can I help you with your infrastructure resilience today?' }
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const response = await fetch(`http://localhost:8000/api/chat?message=${encodeURIComponent(input)}`, {
        method: 'POST'
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting to the brain. Please check the backend." }]);
    }
  };

  return (
    <div className="dian-bot">
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div style={{width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>D</div>
            <div>
              <div style={{fontWeight: 600, fontSize: '0.9rem'}}>Dian</div>
              <div style={{fontSize: '0.7rem', color: 'var(--success)'}}>Online</div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{marginLeft: 'auto', background: 'none', border: 'none', color: 'white', cursor: 'pointer'}}>×</button>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg msg-${m.role}`}>
                {m.content}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form className="chat-input" onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder="Ask me anything..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="filter-btn" style={{padding: '0.5rem'}}>Send</button>
          </form>
        </div>
      )}
      <button className="dian-trigger" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '?' : 'Dian'}
      </button>
    </div>
  );
};

export default DianChat;
