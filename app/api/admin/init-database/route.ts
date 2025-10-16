/**
 * Database Initialization API
 * POST /api/admin/init-database?secret=ADMIN_SECRET
 *
 * Runs Prisma db push to initialize the database schema.
 * This endpoint is protected by ADMIN_SECRET and should only be called once.
 *
 * IMPORTANT: This runs from Vercel, which CAN connect to Supabase.
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for schema push

export async function POST(request: NextRequest) {
  try {
    // Check admin secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
      return NextResponse.json(
        {
          success: false,
          error: 'ADMIN_SECRET not configured in environment variables',
        },
        { status: 500 }
      );
    }

    if (!secret || secret !== adminSecret) {
      console.warn('[Admin API] Unauthorized database init attempt');
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Invalid or missing admin secret',
        },
        { status: 401 }
      );
    }

    console.log('[Admin API] Starting database initialization...');

    // Run prisma db push
    const { stdout, stderr } = await execAsync(
      'npx prisma db push --accept-data-loss --skip-generate',
      {
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
          DIRECT_URL: process.env.DIRECT_URL,
        },
        timeout: 240000, // 4 minute timeout
      }
    );

    console.log('[Admin API] Database push completed');
    console.log('STDOUT:', stdout);
    if (stderr) console.log('STDERR:', stderr);

    return NextResponse.json({
      success: true,
      message: 'Database schema initialized successfully',
      output: stdout,
      warnings: stderr || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Admin API] Database initialization failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stderr: error.stderr,
        stdout: error.stdout,
        code: error.code,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check if database is initialized
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Try to import prisma and check connection
    const { prisma } = await import('@/lib/prisma');

    // Test connection
    await prisma.$connect();

    // Check if tables exist
    const result = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const tableNames = (result as any[]).map((row) => row.table_name);

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      database_connected: true,
      tables_found: tableNames.length,
      tables: tableNames,
      expected_tables: [
        'tenants',
        'tenant_settings',
        'users',
        'portal_users',
        'products',
        'orders',
        'invoices',
        // ... add more as needed
      ],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        database_connected: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
