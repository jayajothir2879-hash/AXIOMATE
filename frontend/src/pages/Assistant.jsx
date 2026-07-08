// src/pages/Assistant.jsx
import React, { useEffect, useRef, useState } from 'react';
import api from '../lib/api';


const SUGGESTIONS = [
  'Which projects are delayed?',
  'Which employees are overloaded?',
  'Show all high-risk projects',
  'Which client has the highest number of active projects?',
];

export default function Assistant() {
  const [messages, setMessages] = useState([{ role: 'bot', text: "Hi! I'm your AI project assistant. Ask me about delays, workload, risk levels or client activity." }]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  const send = async (text) => {
    const q = text ?? input;
    if (!q.trim()) return;
    setMessages(m => [...m, { role: 'user', text: q }]);
    setInput('');
    try {
      const res = await api.post('/assistant/ask', { question: q });
      setMessages(m => [...m, { role: 'bot', text: res.data.answer }]);
    } catch {
      setMessages(m => [...m, { role: 'bot', text: 'Sorry, I could not reach the assistant service.' }]);
    }
  };

  return (
    <div>
      <div className="font-semibold text-[15px]">AI Project Assistant</div>
      <div className="text-[12.5px] text-slate-500 mb-4">Ask about delays, workload, risk or client activity</div>

      <div className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-sm">
        <div ref={scrollRef} className="flex flex-col gap-3 overflow-y-auto pb-2" style={{ height: 'calc(100vh - 360px)', minHeight: 320 }}>
          {messages.map((m, i) => (
            <div key={i} className={`max-w-[74%] px-3.5 py-2.5 rounded-xl text-[13.5px] leading-relaxed ${
              m.role === 'bot' ? 'bg-slate-50 border border-slate-200 self-start rounded-bl-sm' : 'bg-teal text-white self-end rounded-br-sm'
            }`}>{m.text}</div>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap mt-2.5">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)} className="px-3 py-1.5 rounded-full border border-slate-200 text-[12px] hover:bg-slate-50">{s}</button>
          ))}
        </div>
        <div className="flex gap-2.5 mt-3">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask the assistant…" className="flex-1 px-3.5 py-2.5 rounded-full border border-slate-200 text-sm" />
          <button onClick={() => send()} className="px-4.5 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold">Send</button>
        </div>
      </div>
    </div>
  );
}
