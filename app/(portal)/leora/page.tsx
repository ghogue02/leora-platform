import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ask Leora',
  description: 'AI-powered sales intelligence assistant',
};

/**
 * Leora AI Chat Page
 *
 * Conversational analytics powered by GPT-5
 *
 * Features:
 * - Natural language queries
 * - Conversational analytics interface
 * - Grounded responses from Supabase data
 * - Action drill-downs to dashboards
 * - Follow-up task proposals
 * - Session memory for context
 *
 * Data source:
 * - /api/leora/chat (GPT-5 orchestration)
 * - Insight composer (scheduled/on-demand)
 * - Whitelisted SQL templates
 * - Optional: enhanced Postgres MCP server for read-only queries
 *
 * Implementation notes:
 * - OPENAI_API_KEY required (server-side only)
 * - Response contract: { summary, tables, visualHints, recommendedActions, confidence }
 * - Fallback messaging when GPT-5 unavailable
 * - Cost tracking per tenant
 */
export default function LeoraPage() {
  return (
    <div className="container mx-auto p-6 h-[calc(100vh-4rem)]">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="mb-6">
          <h1 className="mb-2">Ask Leora</h1>
          <p className="text-muted-foreground">
            Your AI-powered sales intelligence assistant.
          </p>
        </div>

        {/* Chat container */}
        <div className="flex-1 rounded-[var(--radius-elevated)] bg-card elevated-shadow overflow-hidden flex flex-col">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Welcome message */}
            <div className="mb-6 max-w-2xl">
              <div className="rounded-[var(--radius-default)] bg-muted p-4">
                <p className="font-medium mb-2">Welcome to Leora</p>
                <p className="text-small text-muted-foreground">
                  Ask me about your accounts, orders, revenue trends, or anything else.
                  I can help you understand your business and suggest next actions.
                </p>
              </div>
            </div>

            {/* Example queries */}
            <div className="space-y-3">
              <p className="text-small font-medium text-muted-foreground">Try asking:</p>
              <button className="w-full text-left rounded-[var(--radius-default)] border border-border-color bg-background px-4 py-3 hover:bg-muted transition-colors">
                Which customers slipped pace this week?
              </button>
              <button className="w-full text-left rounded-[var(--radius-default)] border border-border-color bg-background px-4 py-3 hover:bg-muted transition-colors">
                Show sell-through by region last 30 days
              </button>
              <button className="w-full text-left rounded-[var(--radius-default)] border border-border-color bg-background px-4 py-3 hover:bg-muted transition-colors">
                What are my top revenue opportunities?
              </button>
            </div>
          </div>

          {/* Input area */}
          <div className="border-t border-border-color p-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask Leora: 'show sell-through by region last 30 days'"
                className="flex-1 rounded-[var(--radius-default)] border border-input bg-background px-4 py-3"
              />
              <button className="rounded-[var(--radius-default)] bg-primary px-6 py-3 font-medium text-primary-foreground">
                Ask
              </button>
            </div>
            <p className="mt-2 text-small text-muted-foreground">
              Powered by GPT-5. Responses grounded in your Supabase data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
