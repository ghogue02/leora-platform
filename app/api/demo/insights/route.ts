import { NextResponse } from 'next/server';
import { getDemoInsights } from '@/lib/demo/insights';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: getDemoInsights(),
  });
}
