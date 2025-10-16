/**
 * Leora AI Copilot - Chat Router API
 *
 * Handles conversational analytics requests:
 * 1. Accepts user prompts with tenant context
 * 2. Detects intent and maps to whitelisted SQL queries
 * 3. Executes queries with proper tenant isolation
 * 4. Forwards results + context to GPT-5 for narrative response
 * 5. Returns structured AIResponse with confidence scoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/ai/openai-client';
import { QueryValidator, detectQueryIntent } from '@/lib/ai/query-validator';
import { ChatRequestSchema, ChatResponse, AIResponse, AIError } from '@/lib/ai/types';
import { CHAT_PROMPT_TEMPLATE, buildPrompt, QUERY_ROUTER_FUNCTIONS } from '@/lib/ai/prompts/system-prompts';

// ============================================================================
// Chat Session Management (in-memory for demo)
// ============================================================================

interface ChatSession {
  sessionId: string;
  tenantId: string;
  userId: string;
  conversationHistory: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  lastActivity: Date;
}

const sessions = new Map<string, ChatSession>();

function getOrCreateSession(
  sessionId: string | undefined,
  tenantId: string,
  userId: string
): ChatSession {
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    session.lastActivity = new Date();
    return session;
  }

  const newSessionId = sessionId || `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newSession: ChatSession = {
    sessionId: newSessionId,
    tenantId,
    userId,
    conversationHistory: [],
    createdAt: new Date(),
    lastActivity: new Date(),
  };

  sessions.set(newSessionId, newSession);
  return newSession;
}

// ============================================================================
// Main POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request
    const validatedRequest = ChatRequestSchema.parse(body);

    const { message, sessionId, context } = validatedRequest;
    const { tenantId, userId, userRole = 'sales_rep', conversationHistory = [] } = context;

    // Get or create chat session
    const session = getOrCreateSession(sessionId, tenantId, userId);

    // Add user message to history
    session.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Step 1: Detect query intent
    const intent = detectQueryIntent(message, tenantId);

    if (!intent) {
      // No SQL query needed - direct GPT conversation
      return handleDirectConversation(session, message, userRole);
    }

    // Step 2: Execute whitelisted query
    const queryResult = await executeQuery(intent.templateId, intent.suggestedParams, userRole);

    if (!queryResult.success) {
      return NextResponse.json({
        success: false,
        error: queryResult.error || 'Query execution failed',
      } as ChatResponse, { status: 400 });
    }

    // Step 3: Build context-enriched prompt
    const userPrompt = buildPrompt(CHAT_PROMPT_TEMPLATE, {
      userQuestion: message,
      tenantId,
      userRole,
      queryResults: JSON.stringify(queryResult.data, null, 2),
      conversationHistory: formatConversationHistory(session.conversationHistory.slice(-5)),
    });

    // Step 4: Get AI response
    const client = getOpenAIClient();
    const aiResponse = await client.chat(
      [
        { role: 'system', content: CHAT_PROMPT_TEMPLATE.systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: CHAT_PROMPT_TEMPLATE.model,
        temperature: CHAT_PROMPT_TEMPLATE.temperature,
        maxTokens: CHAT_PROMPT_TEMPLATE.maxTokens,
        tenantId,
        userId,
        operation: 'chat',
      }
    );

    // Step 5: Parse and structure response
    const structuredResponse: AIResponse = {
      summary: aiResponse.content,
      tables: queryResult.data ? [queryResult.data] : undefined,
      confidence: 0.85,
      dataSourceIds: [intent.templateId],
      recommendedActions: extractActions(aiResponse.content, queryResult.data),
    };

    // Add assistant response to history
    session.conversationHistory.push({
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date(),
    });

    // Step 6: Return response
    return NextResponse.json({
      success: true,
      data: {
        response: structuredResponse,
        sessionId: session.sessionId,
        usage: aiResponse.usage,
      },
    } as ChatResponse);

  } catch (error: any) {
    console.error('[Leora AI Chat] Error:', error);

    if (error instanceof AIError) {
      return NextResponse.json({
        success: false,
        error: error.message,
      } as ChatResponse, { status: error.statusCode });
    }

    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    } as ChatResponse, { status: 500 });
  }
}

// ============================================================================
// Query Execution with Safety Validation
// ============================================================================

async function executeQuery(
  templateId: string,
  parameters: Record<string, unknown>,
  userRole: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Validate query against whitelist
    const validation = QueryValidator.validateQuery(templateId, parameters, userRole);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Query validation failed',
      };
    }

    // TODO: Execute query using Prisma
    // For now, return mock data
    const mockData = getMockQueryData(templateId);

    return {
      success: true,
      data: mockData,
    };

    // Production implementation:
    /*
    const prisma = getPrismaClient();
    const template = QueryValidator.getTemplate(templateId);

    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    // Execute raw SQL with parameterized values
    const result = await prisma.$queryRawUnsafe(
      template.sqlTemplate,
      ...validation.sanitizedParams
    );

    return {
      success: true,
      data: result,
    };
    */
  } catch (error: any) {
    console.error('[Leora AI] Query execution error:', error);
    return {
      success: false,
      error: 'Failed to execute query',
    };
  }
}

// ============================================================================
// Direct Conversation Handler (no SQL query)
// ============================================================================

async function handleDirectConversation(
  session: ChatSession,
  message: string,
  userRole: string
): Promise<NextResponse<ChatResponse>> {
  try {
    const client = getOpenAIClient();

    const messages = [
      { role: 'system' as const, content: CHAT_PROMPT_TEMPLATE.systemPrompt },
      ...session.conversationHistory.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const response = await client.chat(messages, {
      model: CHAT_PROMPT_TEMPLATE.model,
      temperature: 0.7,
      maxTokens: 1000,
      tenantId: session.tenantId,
      userId: session.userId,
      operation: 'chat',
    });

    session.conversationHistory.push({
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        response: {
          summary: response.content,
          confidence: 0.7,
        },
        sessionId: session.sessionId,
        usage: response.usage,
      },
    } as ChatResponse);
  } catch (error: any) {
    console.error('[Leora AI] Direct conversation error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to process conversation',
    } as ChatResponse, { status: 500 });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatConversationHistory(
  history: ChatSession['conversationHistory']
): string {
  return history
    .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');
}

function extractActions(
  content: string,
  queryData: any
): AIResponse['recommendedActions'] {
  // Simple action extraction based on keywords
  // In production, use GPT function calling for structured action extraction
  const actions: AIResponse['recommendedActions'] = [];

  if (content.toLowerCase().includes('contact') || content.toLowerCase().includes('call')) {
    actions.push({
      title: 'Schedule Follow-up',
      description: 'Reach out to the customer mentioned',
      priority: 'medium',
      actionType: 'contact',
    });
  }

  if (content.toLowerCase().includes('review') || content.toLowerCase().includes('investigate')) {
    actions.push({
      title: 'Review Account',
      description: 'Investigate the issue mentioned',
      priority: 'high',
      actionType: 'review',
    });
  }

  return actions.length > 0 ? actions : undefined;
}

// ============================================================================
// Mock Data (replace with actual Prisma queries)
// ============================================================================

function getMockQueryData(templateId: string): any {
  const mockData: Record<string, any> = {
    customers_by_pace_deviation: [
      {
        id: '1',
        company_name: 'Harborview Cellars',
        email: 'orders@harborview.com',
        ordering_pace_days: 14,
        pace_deviation_days: 12,
        last_order_date: new Date('2024-09-15'),
        health_score: 65,
      },
      {
        id: '2',
        company_name: 'Mountain View Spirits',
        email: 'info@mountainview.com',
        ordering_pace_days: 21,
        pace_deviation_days: 8,
        last_order_date: new Date('2024-10-01'),
        health_score: 72,
      },
    ],
    customers_revenue_drop: [
      {
        id: '3',
        company_name: 'Coastal Wines',
        monthly_revenue_current: 12000,
        monthly_revenue_average: 15000,
        revenue_change_percent: -20,
        health_score: 58,
      },
    ],
    orders_recent: [
      {
        id: 'o1',
        order_number: 'ORD-2024-001',
        status: 'fulfilled',
        total_amount: 2450.00,
        order_date: new Date('2024-10-10'),
        customer_id: '1',
        customer_name: 'Harborview Cellars',
      },
    ],
    products_top_performers: [
      {
        id: 'p1',
        name: 'Premium Cabernet Sauvignon',
        category: 'Wine',
        units_sold: 245,
        revenue: 45000,
        order_count: 42,
      },
    ],
  };

  return mockData[templateId] || [];
}

// ============================================================================
// GET Handler (Session Info)
// ============================================================================

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId parameter required' },
      { status: 400 }
    );
  }

  const session = sessions.get(sessionId);

  if (!session) {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    sessionId: session.sessionId,
    messageCount: session.conversationHistory.length,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity,
  });
}
