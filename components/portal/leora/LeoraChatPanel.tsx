/**
 * Leora AI Copilot - Chat Panel Component
 *
 * Conversational interface for asking questions and receiving
 * AI-powered insights about operations data.
 */

'use client';

import Link from 'next/link';
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatResponse, AIResponse } from '@/lib/ai/types';

// ============================================================================
// Types
// ============================================================================

type RecommendedAction = NonNullable<AIResponse['recommendedActions']>[number];

interface Message extends ChatMessage {
  id: string;
  response?: AIResponse;
  isLoading?: boolean;
}

interface LeoraChatPanelProps {
  tenantId: string;
  userId: string;
  userRole?: string;
  className?: string;
  initialPrompt?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function LeoraChatPanel({
  tenantId,
  userId,
  userRole = 'sales_rep',
  className = '',
  initialPrompt,
}: LeoraChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialPrompt || '');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ============================================================================
  // Message Sending
  // ============================================================================

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/leora/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          sessionId,
          context: {
            tenantId,
            userId,
            userRole,
            conversationHistory: messages.slice(-5).map(m => ({
              role: m.role,
              content: m.content,
            })),
          },
        }),
      });

      const data: ChatResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Update session ID
      if (data.data?.sessionId && !sessionId) {
        setSessionId(data.data.sessionId);
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: data.data!.response.summary,
        timestamp: new Date(),
        response: data.data!.response,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('[Leora Chat] Error:', err);
      setError(err.message || 'Failed to send message');

      // Add error message
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ============================================================================
  // Quick Actions
  // ============================================================================

  const quickActions = [
    'Which customers are late on orders?',
    'Show revenue by product this month',
    'Top performers last 30 days',
    'Sample usage by rep',
  ];

  const handleQuickAction = (action: string) => {
    setInput(action);
    sendMessage(action);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ask Leora</h2>
            <p className="text-xs text-gray-500">Your operations copilot</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">L</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              What would you like to know?
            </h3>
            <p className="text-gray-600 mb-6">
              Ask me about customers, orders, products, or sales performance.
            </p>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickAction(action)}
                  className="px-4 py-3 text-left text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm">Leora is thinking...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Leora: 'show customers late on orders'"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Message Bubble Component
// ============================================================================

function resolveActionHref(action: RecommendedAction) {
  if (!action.targetId) return null;

  switch (action.targetType) {
    case 'customer':
      return `/customers/${action.targetId}`;
    case 'order':
      return `/orders/${action.targetId}`;
    case 'product':
      return `/products/${action.targetId}`;
    case 'invoice':
      return `/invoices/${action.targetId}`;
    case 'sample':
      return `/insights`;
    default:
      return null;
  }
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-amber-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Recommended Actions */}
        {message.response?.recommendedActions && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
            <p className="text-xs font-semibold text-gray-700">Recommended Actions:</p>
            {message.response.recommendedActions.map((action, idx) => (
              <div
                key={idx}
                className="text-xs p-2 bg-white rounded border border-gray-200"
              >
                <div className="font-medium text-gray-900">{action.title}</div>
                <div className="text-gray-600">{action.description}</div>
                {(() => {
                  const href = resolveActionHref(action);

                  if (!href) return null;

                  return (
                    <Link
                      href={href}
                      className="mt-1 inline-block text-amber-600 hover:underline"
                    >
                      View details →
                    </Link>
                  );
                })()}
              </div>
            ))}
          </div>
        )}

        {/* Tables */}
        {message.response?.tables && message.response.tables.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs bg-white rounded p-2 overflow-x-auto">
              <pre className="text-gray-700">
                {JSON.stringify(message.response.tables[0], null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Timestamp */}
        {message.timestamp && (
          <p className="text-xs mt-2 opacity-70">
            {message.timestamp.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}

export default LeoraChatPanel;
