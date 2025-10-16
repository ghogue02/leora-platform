/**
 * Leora AI Copilot - OpenAI Client Wrapper
 *
 * Server-side OpenAI client with:
 * - Automatic retry logic with exponential backoff
 * - Token usage tracking and cost estimation
 * - Timeout handling
 * - Streaming support
 * - Rate limit management
 */

import OpenAI from 'openai';
import { AIError, TokenUsageLog, AIClientConfig } from './types';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<Omit<AIClientConfig, 'apiKey'>> = {
  model: 'gpt-4-turbo-preview', // Will update to gpt-5 when available
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 60000, // 60 seconds
  baseURL: 'https://api.openai.com/v1',
};

// Cost estimates per 1K tokens (USD) - update as pricing changes
const TOKEN_COSTS = {
  'gpt-4-turbo-preview': { prompt: 0.01, completion: 0.03 },
  'gpt-4': { prompt: 0.03, completion: 0.06 },
  'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
};

// ============================================================================
// OpenAI Client Singleton
// ============================================================================

class LeoraOpenAIClient {
  private client: OpenAI | null = null;
  private config: Required<AIClientConfig>;
  private usageLogs: TokenUsageLog[] = [];

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new AIError(
        'OPENAI_API_KEY environment variable is not set',
        'INVALID_REQUEST',
        500
      );
    }

    this.config = {
      apiKey,
      ...DEFAULT_CONFIG,
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      maxRetries: this.config.maxRetries,
      timeout: this.config.timeout,
      baseURL: this.config.baseURL,
    });
  }

  // ==========================================================================
  // Core Chat Completion with Retry Logic
  // ==========================================================================

  async chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      tenantId?: string;
      userId?: string;
      operation?: 'chat' | 'briefing' | 'insight';
    } = {}
  ): Promise<{
    content: string;
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    if (!this.client) {
      throw new AIError('OpenAI client not initialized', 'API_ERROR', 500);
    }

    const model = options.model || this.config.model;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const completion = await this.client.chat.completions.create({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2000,
        });

        const content = completion.choices[0]?.message?.content || '';
        const usage = {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        };

        // Track token usage
        if (options.tenantId) {
          this.trackUsage({
            tenantId: options.tenantId,
            userId: options.userId,
            timestamp: new Date(),
            model,
            operation: options.operation || 'chat',
            ...usage,
            costEstimate: this.estimateCost(model, usage),
          });
        }

        return { content, usage };
      } catch (error: any) {
        lastError = error;

        // Don't retry on certain errors
        if (error.status === 400 || error.status === 401 || error.status === 403) {
          throw new AIError(
            error.message || 'OpenAI API request failed',
            'INVALID_REQUEST',
            error.status,
            error
          );
        }

        // Handle rate limits
        if (error.status === 429) {
          const retryAfter = error.headers?.['retry-after'];
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.config.retryDelay * Math.pow(2, attempt);

          console.warn(`[Leora AI] Rate limited, retrying after ${delay}ms (attempt ${attempt + 1}/${this.config.maxRetries})`);
          await this.sleep(delay);
          continue;
        }

        // Exponential backoff for other errors
        if (attempt < this.config.maxRetries - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          console.warn(`[Leora AI] Request failed, retrying after ${delay}ms (attempt ${attempt + 1}/${this.config.maxRetries})`);
          await this.sleep(delay);
        }
      }
    }

    throw new AIError(
      lastError?.message || 'OpenAI API request failed after retries',
      'API_ERROR',
      500,
      lastError
    );
  }

  // ==========================================================================
  // Streaming Support
  // ==========================================================================

  async *chatStream(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    if (!this.client) {
      throw new AIError('OpenAI client not initialized', 'API_ERROR', 500);
    }

    const model = options.model || this.config.model;

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield content;
        }
      }
    } catch (error: any) {
      throw new AIError(
        error.message || 'OpenAI streaming request failed',
        'API_ERROR',
        error.status || 500,
        error
      );
    }
  }

  // ==========================================================================
  // Function Calling Support
  // ==========================================================================

  async chatWithFunctions(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    functions: Array<{
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }>,
    options: {
      model?: string;
      temperature?: number;
      functionCall?: 'auto' | 'none' | { name: string };
    } = {}
  ): Promise<{
    content?: string;
    functionCall?: { name: string; arguments: string };
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    if (!this.client) {
      throw new AIError('OpenAI client not initialized', 'API_ERROR', 500);
    }

    const model = options.model || this.config.model;

    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages,
        functions,
        function_call: options.functionCall,
        temperature: options.temperature ?? 0.7,
      });

      const choice = completion.choices[0];
      const usage = {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      };

      return {
        content: choice?.message?.content || undefined,
        functionCall: choice?.message?.function_call
          ? {
              name: choice.message.function_call.name,
              arguments: choice.message.function_call.arguments,
            }
          : undefined,
        usage,
      };
    } catch (error: any) {
      throw new AIError(
        error.message || 'OpenAI function calling failed',
        'API_ERROR',
        error.status || 500,
        error
      );
    }
  }

  // ==========================================================================
  // Token Usage Tracking
  // ==========================================================================

  private trackUsage(log: TokenUsageLog): void {
    this.usageLogs.push(log);

    // Keep only last 1000 logs in memory
    if (this.usageLogs.length > 1000) {
      this.usageLogs = this.usageLogs.slice(-1000);
    }

    // In production, persist to database
    // TODO: Add Prisma model for token usage tracking
  }

  getUsageLogs(tenantId?: string, startDate?: Date): TokenUsageLog[] {
    let logs = this.usageLogs;

    if (tenantId) {
      logs = logs.filter(log => log.tenantId === tenantId);
    }

    if (startDate) {
      logs = logs.filter(log => log.timestamp >= startDate);
    }

    return logs;
  }

  // ==========================================================================
  // Cost Estimation
  // ==========================================================================

  private estimateCost(
    model: string,
    usage: { promptTokens: number; completionTokens: number }
  ): number {
    const costs = TOKEN_COSTS[model as keyof typeof TOKEN_COSTS] || TOKEN_COSTS['gpt-4-turbo-preview'];
    const promptCost = (usage.promptTokens / 1000) * costs.prompt;
    const completionCost = (usage.completionTokens / 1000) * costs.completion;
    return promptCost + completionCost;
  }

  getTotalCost(tenantId?: string, startDate?: Date): number {
    const logs = this.getUsageLogs(tenantId, startDate);
    return logs.reduce((sum, log) => sum + (log.costEstimate || 0), 0);
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==========================================================================
  // Health Check
  // ==========================================================================

  async healthCheck(): Promise<{ status: 'ok' | 'error'; message: string }> {
    try {
      await this.chat(
        [{ role: 'user', content: 'Hello' }],
        { maxTokens: 5, operation: 'chat' }
      );
      return { status: 'ok', message: 'OpenAI client is healthy' };
    } catch (error: any) {
      return { status: 'error', message: error.message };
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let clientInstance: LeoraOpenAIClient | null = null;

export function getOpenAIClient(): LeoraOpenAIClient {
  if (!clientInstance) {
    clientInstance = new LeoraOpenAIClient();
  }
  return clientInstance;
}

export { LeoraOpenAIClient };
