import React, { useEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiSend, FiFile, FiDownload } from 'react-icons/fi';
import { storageApi } from '../services/api';

interface DocumentChatPageProps {
  documentName: string;
  folderName: string;
  onBack: () => void;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const DocumentChatPage: React.FC<DocumentChatPageProps> = ({ documentName, folderName, onBack }) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [pendingFileCreation, setPendingFileCreation] = useState<{ document: string; content: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Load recommendations on mount
  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const { data } = await storageApi.listRecommendations(folderName, documentName);
        if (data.trail && data.trail.length > 0) {
          const recs = data.trail[0].recommendations.map((r: any) => r.point);
          setRecommendations(recs);
          
          // Add initial AI message with recommendations
          if (recs.length > 0) {
            const recsText = recs.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n');
            setChatMessages([{
              role: 'ai',
              text: `I've analyzed **${documentName}** and found the following recommendations:\n\n${recsText}\n\nYou can ask me questions about these recommendations, request changes, or say "apply all" to generate an updated document.`,
              timestamp: new Date()
            }]);
          }
        } else {
          // No recommendations yet - start fresh
          setChatMessages([{
            role: 'ai',
            text: `I'm ready to help you with **${documentName}**. Ask me any questions about this document, or I can analyze it for recommendations.`,
            timestamp: new Date()
          }]);
        }
      } catch (err) {
        console.error('Error loading recommendations:', err);
        setChatMessages([{
          role: 'ai',
          text: `I'm ready to help you with **${documentName}**. What would you like to know?`,
          timestamp: new Date()
        }]);
      }
    };
    
    loadRecommendations();
  }, [documentName, folderName]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    const lowerMsg = userMessage.toLowerCase();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage, timestamp: new Date() }]);
    setChatLoading(true);

    // Check if user wants to apply recommendations
    const isApplyRequest = 
      lowerMsg.includes('apply all') || 
      lowerMsg.includes('apply recommendations') ||
      lowerMsg.includes('update the document') ||
      lowerMsg.includes('make the changes');

    try {
      if (isApplyRequest && recommendations.length > 0) {
        // Apply recommendations to document
        const recsToApply = recommendations.map((point, idx) => ({ 
          id: `rec-${idx}`, 
          point, 
          status: 'pending' as const 
        }));
        
        const { data } = await storageApi.applyChangesWithGPT(folderName, documentName, recsToApply);
        
        if (data.modifiedContent) {
          setPendingFileCreation({
            document: documentName,
            content: data.modifiedContent
          });
        }
        
        setChatMessages(prev => [...prev, {
          role: 'ai',
          text: `✅ **Document updated!**\n\nI've applied all ${recommendations.length} recommendations to your document.\n\n📄 New file created: **${data.newFileName || documentName.replace(/\.[^.]+$/, '_modified.txt')}**\n\nClick the green "Download Modified Document" button above to get your updated file.`,
          timestamp: new Date()
        }]);
      } else {
        // Regular chat
        const { data } = await storageApi.chatAboutRecommendations(folderName, documentName, userMessage);
        setChatMessages(prev => [...prev, { 
          role: 'ai', 
          text: data.reply || 'I understand. How can I help you further?', 
          timestamp: new Date() 
        }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        text: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pendingFileCreation) return;
    const blob = new Blob([pendingFileCreation.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pendingFileCreation.document.replace(/\.[^.]+$/, '_modified.txt');
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatChatText = (text: string) => {
    // Simple markdown-like formatting
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Bold text
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Check if it's a numbered item
      if (/^\d+\./.test(line)) {
        return <div key={idx} style={{ marginBottom: 6 }} dangerouslySetInnerHTML={{ __html: formatted }} />;
      }
      return <div key={idx} dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0a0f1a',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 2000
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #1f2937',
        background: '#111827',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <button
          onClick={onBack}
          style={{
            background: '#1f2937',
            border: '1px solid #374151',
            color: '#e2e8f0',
            padding: '10px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 500
          }}
        >
          <FiArrowLeft /> Back to Storage
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: 16, 
            fontWeight: 600, 
            color: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <FiFile style={{ color: '#3b82f6' }} />
            {documentName}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {folderName} • {recommendations.length} recommendations
          </div>
        </div>
        {pendingFileCreation && (
          <button
            onClick={handleDownload}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: 'white',
              padding: '10px 20px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 600
            }}
          >
            <FiDownload /> Download Modified Document
          </button>
        )}
      </div>

      {/* Chat Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{
              maxWidth: '70%',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #3b82f6, #06b6d4)'
                : '#1e293b',
              color: '#f1f5f9',
              padding: '14px 18px',
              borderRadius: 12,
              fontSize: 14,
              lineHeight: 1.6,
              wordBreak: 'break-word'
            }}>
              {formatChatText(msg.text)}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {chatLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: '#1e293b',
              color: '#94a3b8',
              padding: '14px 18px',
              borderRadius: 12,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span style={{
                display: 'inline-flex',
                gap: 4
              }}>
                <span style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: '50%', animation: 'pulse 1.4s infinite ease-in-out' }} />
                <span style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: '50%', animation: 'pulse 1.4s infinite ease-in-out 0.2s' }} />
                <span style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: '50%', animation: 'pulse 1.4s infinite ease-in-out 0.4s' }} />
              </span>
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '16px 32px 24px',
        borderTop: '1px solid #1f2937',
        background: '#111827'
      }}>
        <div style={{
          display: 'flex',
          gap: 12,
          maxWidth: 900,
          margin: '0 auto'
        }}>
          <input
            ref={inputRef}
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Ask about the document, request changes, or say 'apply all' to update..."
            style={{
              flex: 1,
              padding: '14px 18px',
              background: '#1e293b',
              border: '1px solid #374151',
              borderRadius: 10,
              color: '#e2e8f0',
              fontSize: 14,
              outline: 'none'
            }}
            disabled={chatLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || chatLoading}
            style={{
              background: chatInput.trim() && !chatLoading
                ? 'linear-gradient(135deg, #3b82f6, #06b6d4)'
                : '#374151',
              border: 'none',
              color: 'white',
              padding: '14px 24px',
              borderRadius: 10,
              cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 600,
              opacity: chatInput.trim() && !chatLoading ? 1 : 0.5
            }}
          >
            <FiSend /> Send
          </button>
        </div>
        <div style={{
          textAlign: 'center',
          fontSize: 11,
          color: '#475569',
          marginTop: 12
        }}>
          Try: "Summarize this document" • "What are the key compliance issues?" • "Apply all recommendations"
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default DocumentChatPage;
