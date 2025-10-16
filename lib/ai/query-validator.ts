/**
 * Leora AI Copilot - SQL Query Whitelisting & Safety Layer
 *
 * Ensures GPT-5 only executes approved, parameterized queries with
 * proper tenant isolation and RBAC enforcement.
 */

import { z } from 'zod';
import { WhitelistedQuery, AIError } from './types';

// ============================================================================
// Whitelisted Query Templates
// ============================================================================

export const WHITELISTED_QUERIES: Record<string, WhitelistedQuery> = {
  // Customer Queries
  customers_by_pace_deviation: {
    templateId: 'customers_by_pace_deviation',
    description: 'Find customers with order pace deviations beyond threshold',
    sqlTemplate: `
      SELECT
        c.id,
        c.company_name,
        c.email,
        ahs.ordering_pace_days,
        ahs.pace_deviation_days,
        ahs.last_order_date,
        ahs.health_score
      FROM customers c
      JOIN account_health_snapshots ahs ON ahs.customer_id = c.id
      WHERE c.tenant_id = $1
        AND ahs.pace_deviation_days > $2
        AND ahs.snapshot_date >= NOW() - INTERVAL '$3 days'
      ORDER BY ahs.pace_deviation_days DESC
      LIMIT $4
    `,
    parameters: [
      { name: 'tenantId', type: 'string', required: true },
      { name: 'deviationThreshold', type: 'number', required: true },
      { name: 'daysLookback', type: 'number', required: false },
      { name: 'limit', type: 'number', required: false },
    ],
    maxRows: 1000,
    allowedRoles: ['admin', 'sales_rep', 'sales_manager'],
  },

  customers_revenue_drop: {
    templateId: 'customers_revenue_drop',
    description: 'Identify customers with significant revenue drops',
    sqlTemplate: `
      SELECT
        c.id,
        c.company_name,
        ahs.monthly_revenue_current,
        ahs.monthly_revenue_average,
        ahs.revenue_change_percent,
        ahs.health_score
      FROM customers c
      JOIN account_health_snapshots ahs ON ahs.customer_id = c.id
      WHERE c.tenant_id = $1
        AND ahs.revenue_change_percent < $2
        AND ahs.snapshot_date >= NOW() - INTERVAL '7 days'
      ORDER BY ahs.revenue_change_percent ASC
      LIMIT $3
    `,
    parameters: [
      { name: 'tenantId', type: 'string', required: true },
      { name: 'dropThreshold', type: 'number', required: true },
      { name: 'limit', type: 'number', required: false },
    ],
    maxRows: 1000,
    allowedRoles: ['admin', 'sales_rep', 'sales_manager'],
  },

  // Order Queries
  orders_recent: {
    templateId: 'orders_recent',
    description: 'Get recent orders with optional filters',
    sqlTemplate: `
      SELECT
        o.id,
        o.order_number,
        o.status,
        o.total_amount,
        o.order_date,
        o.customer_id,
        c.company_name as customer_name
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE o.tenant_id = $1
        AND ($2::text IS NULL OR o.status = $2)
        AND ($3::date IS NULL OR o.order_date >= $3)
        AND ($4::date IS NULL OR o.order_date <= $4)
      ORDER BY o.order_date DESC
      LIMIT $5
    `,
    parameters: [
      { name: 'tenantId', type: 'string', required: true },
      { name: 'status', type: 'string', required: false },
      { name: 'startDate', type: 'date', required: false },
      { name: 'endDate', type: 'date', required: false },
      { name: 'limit', type: 'number', required: false },
    ],
    maxRows: 1000,
    allowedRoles: ['admin', 'sales_rep', 'sales_manager', 'portal_user'],
  },

  // Sales Metrics
  sales_by_rep: {
    templateId: 'sales_by_rep',
    description: 'Sales performance by rep for time period',
    sqlTemplate: `
      SELECT
        u.id as rep_id,
        u.full_name as rep_name,
        COUNT(DISTINCT o.id) as order_count,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        COUNT(DISTINCT o.customer_id) as unique_customers
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      JOIN users u ON u.id = c.assigned_sales_rep_id
      WHERE o.tenant_id = $1
        AND o.order_date >= $2
        AND o.order_date <= $3
        AND o.status IN ('confirmed', 'fulfilled')
      GROUP BY u.id, u.full_name
      ORDER BY total_revenue DESC
      LIMIT $4
    `,
    parameters: [
      { name: 'tenantId', type: 'string', required: true },
      { name: 'startDate', type: 'date', required: true },
      { name: 'endDate', type: 'date', required: true },
      { name: 'limit', type: 'number', required: false },
    ],
    maxRows: 100,
    allowedRoles: ['admin', 'sales_manager'],
  },

  // Product Queries
  products_top_performers: {
    templateId: 'products_top_performers',
    description: 'Top selling products by revenue or volume',
    sqlTemplate: `
      SELECT
        p.id,
        p.name,
        p.category,
        SUM(ol.quantity) as units_sold,
        SUM(ol.line_total) as revenue,
        COUNT(DISTINCT ol.order_id) as order_count
      FROM products p
      JOIN skus s ON s.product_id = p.id
      JOIN order_lines ol ON ol.sku_id = s.id
      JOIN orders o ON o.id = ol.order_id
      WHERE p.tenant_id = $1
        AND o.order_date >= $2
        AND o.order_date <= $3
        AND o.status IN ('confirmed', 'fulfilled')
      GROUP BY p.id, p.name, p.category
      ORDER BY $4 DESC
      LIMIT $5
    `,
    parameters: [
      { name: 'tenantId', type: 'string', required: true },
      { name: 'startDate', type: 'date', required: true },
      { name: 'endDate', type: 'date', required: true },
      { name: 'orderBy', type: 'string', required: true, validation: 'z.enum(["revenue", "units_sold"])' },
      { name: 'limit', type: 'number', required: false },
    ],
    maxRows: 100,
    allowedRoles: ['admin', 'sales_rep', 'sales_manager'],
  },

  // Sample Management
  samples_by_rep: {
    templateId: 'samples_by_rep',
    description: 'Sample usage by rep with monthly allowance tracking',
    sqlTemplate: `
      SELECT
        u.id as rep_id,
        u.full_name as rep_name,
        COUNT(*) as sample_count,
        SUM(ol.quantity) as total_units,
        COALESCE(SUM(p.cost_per_unit * ol.quantity), 0) as estimated_cost
      FROM orders o
      JOIN order_lines ol ON ol.order_id = o.id
      JOIN skus s ON s.id = ol.sku_id
      JOIN products p ON p.id = s.product_id
      JOIN customers c ON c.id = o.customer_id
      JOIN users u ON u.id = c.assigned_sales_rep_id
      WHERE o.tenant_id = $1
        AND o.is_sample_order = true
        AND o.order_date >= $2
        AND o.order_date <= $3
      GROUP BY u.id, u.full_name
      ORDER BY sample_count DESC
      LIMIT $4
    `,
    parameters: [
      { name: 'tenantId', type: 'string', required: true },
      { name: 'startDate', type: 'date', required: true },
      { name: 'endDate', type: 'date', required: true },
      { name: 'limit', type: 'number', required: false },
    ],
    maxRows: 100,
    allowedRoles: ['admin', 'sales_manager'],
  },
};

// ============================================================================
// Parameter Validation Schemas
// ============================================================================

const parameterValidators = {
  string: z.string().min(1).max(255),
  number: z.number().int().min(0),
  date: z.coerce.date(),
  boolean: z.boolean(),
};

// ============================================================================
// Query Validator Class
// ============================================================================

export class QueryValidator {
  /**
   * Validates and sanitizes query parameters against whitelist
   */
  static validateQuery(
    templateId: string,
    parameters: Record<string, unknown>,
    userRole: string
  ): { valid: boolean; sanitizedParams?: unknown[]; error?: string } {
    const template = WHITELISTED_QUERIES[templateId];

    if (!template) {
      return {
        valid: false,
        error: `Query template '${templateId}' is not whitelisted`,
      };
    }

    // Check role authorization
    if (!template.allowedRoles.includes(userRole)) {
      return {
        valid: false,
        error: `Role '${userRole}' is not authorized for this query`,
      };
    }

    // Validate and sanitize parameters
    const sanitizedParams: unknown[] = [];

    for (const paramDef of template.parameters) {
      const value = parameters[paramDef.name];

      // Check required parameters
      if (paramDef.required && (value === undefined || value === null)) {
        return {
          valid: false,
          error: `Required parameter '${paramDef.name}' is missing`,
        };
      }

      // Skip optional parameters that are not provided
      if (!paramDef.required && (value === undefined || value === null)) {
        sanitizedParams.push(null);
        continue;
      }

      // Validate parameter type
      try {
        const validator = parameterValidators[paramDef.type];
        if (!validator) {
          return {
            valid: false,
            error: `Invalid parameter type '${paramDef.type}'`,
          };
        }

        const validatedValue = validator.parse(value);
        sanitizedParams.push(validatedValue);
      } catch (error) {
        return {
          valid: false,
          error: `Parameter '${paramDef.name}' validation failed: ${error}`,
        };
      }
    }

    return {
      valid: true,
      sanitizedParams,
    };
  }

  /**
   * Get query template with description
   */
  static getTemplate(templateId: string): WhitelistedQuery | null {
    return WHITELISTED_QUERIES[templateId] || null;
  }

  /**
   * List all available query templates for a role
   */
  static getAvailableQueries(userRole: string): WhitelistedQuery[] {
    return Object.values(WHITELISTED_QUERIES).filter(query =>
      query.allowedRoles.includes(userRole)
    );
  }

  /**
   * Detect SQL injection attempts (additional safety layer)
   */
  static detectSQLInjection(input: string): boolean {
    const suspiciousPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
      /(--|;|\/\*|\*\/)/,
      /(\bor\b.*=.*\bor\b)/i,
      /('.*--.*')/,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Build safe query with parameterized values
   */
  static buildSafeQuery(
    templateId: string,
    parameters: Record<string, unknown>,
    userRole: string
  ): { query: string; params: unknown[] } | { error: string } {
    const validation = this.validateQuery(templateId, parameters, userRole);

    if (!validation.valid) {
      return { error: validation.error || 'Validation failed' };
    }

    const template = WHITELISTED_QUERIES[templateId];
    return {
      query: template.sqlTemplate,
      params: validation.sanitizedParams || [],
    };
  }
}

// ============================================================================
// Intent Detection Helper
// ============================================================================

export interface QueryIntent {
  templateId: string;
  confidence: number;
  suggestedParams: Record<string, unknown>;
}

/**
 * Maps natural language queries to whitelisted templates
 * This is a simple keyword-based approach; production would use GPT-5 function calling
 */
export function detectQueryIntent(userQuery: string, tenantId: string): QueryIntent | null {
  const query = userQuery.toLowerCase();

  // Pace deviation queries
  if (query.includes('pace') || query.includes('late') || query.includes('overdue')) {
    return {
      templateId: 'customers_by_pace_deviation',
      confidence: 0.8,
      suggestedParams: {
        tenantId,
        deviationThreshold: 7, // 7 days late
        daysLookback: 30,
        limit: 20,
      },
    };
  }

  // Revenue drop queries
  if (query.includes('revenue') && (query.includes('drop') || query.includes('down') || query.includes('declining'))) {
    return {
      templateId: 'customers_revenue_drop',
      confidence: 0.8,
      suggestedParams: {
        tenantId,
        dropThreshold: -15, // 15% drop
        limit: 20,
      },
    };
  }

  // Recent orders
  if (query.includes('recent') && query.includes('order')) {
    return {
      templateId: 'orders_recent',
      confidence: 0.7,
      suggestedParams: {
        tenantId,
        limit: 50,
      },
    };
  }

  // Top products
  if (query.includes('top') && (query.includes('product') || query.includes('selling'))) {
    const orderBy = query.includes('revenue') ? 'revenue' : 'units_sold';
    return {
      templateId: 'products_top_performers',
      confidence: 0.75,
      suggestedParams: {
        tenantId,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate: new Date(),
        orderBy,
        limit: 20,
      },
    };
  }

  return null;
}
