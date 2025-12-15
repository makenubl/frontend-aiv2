import React, { useEffect, useRef, useState } from 'react';
import { FiMessageSquare, FiSend } from 'react-icons/fi';
import { storageApi } from '../services/api';
import { toast } from '../utils/toast';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface StorageChatProps {
  folder: string;
  document?: string;
}

const chatShell: React.CSSProperties = {
  background: '#111827',
  border: '1px solid #1f2937',
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  minHeight: 320
};

const chatBody: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 10,
  background: '#0f172a',
  borderRadius: 10,
  border: '1px solid #1f2937'
};

const chatInput: React.CSSProperties = {
  flex: 1,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e2e8f0'
};

const chatSend: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'linear-gradient(135deg,#6366f1,#22d3ee)',
  color: 'white',
  border: 'none',
  padding: '0 14px',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 600
};

export const StorageChat: React.FC<StorageChatProps> = ({ folder, document }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: `🏛️ Welcome! I'm your PVARA Regulatory Auditor Assistant. ${document ? `I'll review "${document}" from a regulatory, legal, and policy perspective. Ask me to analyze compliance, identify gaps, or provide recommendations.` : 'Select a document to review, or ask me about your current recommendations and compliance status.'}`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const { data } = await storageApi.chatAboutRecommendations(folder, document, userMessage.content);
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        content: data.reply || 'I processed your request.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
      if (data.applied) {
        toast.success(`Applied ${data.applied} recommendation(s)`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Chat failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={chatShell}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <FiMessageSquare size={18} color="#22d3ee" />
        <div>
          <div style={{ fontWeight: 700, color: '#e2e8f0' }}>PVARA Regulatory Auditor</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Review documents from regulatory, legal & policy perspective</div>
        </div>
      </div>

      <div style={chatBody}>
        {messages.map(m => (
          <div key={m.id} style={{ marginBottom: 10, display: 'flex', justifyContent: m.type === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '75%',
              padding: '10px 12px',
              borderRadius: 12,
              background: m.type === 'user' ? 'linear-gradient(135deg,#6366f1,#22d3ee)' : '#0b1220',
              color: '#e2e8f0',
              fontSize: 14,
              border: m.type === 'user' ? 'none' : '1px solid #1e293b'
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#94a3b8', fontSize: 12 }}>
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
          placeholder="Ask to apply all pending recommendations"
          disabled={loading}
          style={chatInput}
        />
        <button
          onClick={onSendMessage}
          disabled={loading || !inputValue.trim()}
          style={{ ...chatSend, opacity: loading ? 0.7 : 1, cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer' }}
        >
          <FiSend size={16} /> Send
        </button>
      </div>
    </div>
  );
};

export default StorageChat;
