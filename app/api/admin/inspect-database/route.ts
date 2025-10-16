/**
 * Database Inspection API
 * GET /api/admin/inspect-database?secret=ADMIN_SECRET
 *
 * Inspects the current database schema and returns:
 * - List of existing tables
 * - Column definitions for each table
 * - Sample row counts
 * - Existing data preview
 *
 * This helps understand what's already in the database before running migrations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check admin secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Admin API] Inspecting database...');

    // Get list of all tables
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const tableNames = tables.map((t) => t.table_name);

    // Get column information for each table
    const tableDetails: Record<string, any> = {};

    for (const tableName of tableNames) {
      // Get columns
      const columns = await prisma.$queryRaw<
        Array<{
          column_name: string;
          data_type: string;
          is_nullable: string;
          column_default: string | null;
        }>
      >`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
        ORDER BY ordinal_position
      `;

      // Get row count
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM "${tableName}"`
      );
      const rowCount = Number(countResult[0]?.count || 0);

      // Get sample data (first 3 rows)
      let sampleData = [];
      try {
        sampleData = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}" LIMIT 3`);
      } catch (error) {
        console.log(`Could not fetch sample data from ${tableName}`);
      }

      tableDetails[tableName] = {
        columns: columns.map((c) => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable === 'YES',
          default: c.column_default,
        })),
        rowCount,
        sampleData: sampleData.slice(0, 3),
      };
    }

    // Get ENUM types
    const enums = await prisma.$queryRaw<Array<{ typname: string; enumlabel: string }>>`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `;

    const enumTypes: Record<string, string[]> = {};
    enums.forEach((e) => {
      if (!enumTypes[e.typname]) {
        enumTypes[e.typname] = [];
      }
      enumTypes[e.typname].push(e.enumlabel);
    });

    // Database info
    const dbInfo = await prisma.$queryRaw<Array<{ version: string }>>`
      SELECT version()
    `;

    return NextResponse.json({
      success: true,
      database: {
        version: dbInfo[0]?.version || 'unknown',
        connected: true,
      },
      schema: {
        tableCount: tableNames.length,
        tables: tableNames,
        enumTypes: Object.keys(enumTypes),
      },
      tables: tableDetails,
      enums: enumTypes,
      summary: {
        totalTables: tableNames.length,
        totalRows: Object.values(tableDetails).reduce((sum, t: any) => sum + t.rowCount, 0),
        tablesWithData: Object.values(tableDetails).filter((t: any) => t.rowCount > 0).length,
        emptyTables: Object.values(tableDetails).filter((t: any) => t.rowCount === 0).length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Admin API] Database inspection failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
