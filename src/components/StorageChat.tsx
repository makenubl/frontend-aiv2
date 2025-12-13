import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiMessageSquare } from 'react-icons/fi';
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

export const StorageChat: React.FC<StorageChatProps> = ({ folder, document }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I can help you manage recommendations. Try asking: "Apply all recommendations" or "What are my pending items?"',
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
      const { data } = await storageApi.chatAboutRecommendations(folder, document, inputValue);
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        content: data.reply || 'I processed your request.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
      if (data.applied) {
        toast.success(`✅ Applied ${data.applied} recommendation(s)`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Chat failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      height: '400px',
      marginTop: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <FiMessageSquare size={20} color="#667eea" />
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>AI Recommendations Chat</h3>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              background: msg.type === 'user'
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : '#f3f4f6',
              color: msg.type === 'user' ? 'white' : '#374151',
              padding: '10px 14px',
              borderRadius: '10px',
              maxWidth: '80%',
              fontSize: '13px',
              lineHeight: '1.5',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px', color: '#9ca3af' }}>
            <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && onSendMessage()}
          placeholder="Ask about recommendations..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '13px',
          }}
        />
        <button
          onClick={onSendMessage}
          disabled={loading || !inputValue.trim()}
          style={{
            background: loading || !inputValue.trim()
              ? '#d1d5db'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          <FiSend size={14} />
        </button>
      </div>
    </div>
  );
};

export default StorageChat;
