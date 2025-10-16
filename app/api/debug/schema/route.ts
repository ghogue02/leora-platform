/**
 * DEBUG: Test schema on Vercel
 * GET /api/debug/schema
 */

import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: [],
    errors: []
  };

  try {
    // Test 1: Tenant
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'well-crafted' }
    });
    results.tests.push({ test: 'tenant', status: 'PASS', data: { id: tenant?.id, name: tenant?.name } });

    if (!tenant) {
      return Response.json({ error: 'No tenant found' }, { status: 500 });
    }

    // Test 2: Order count
    try {
      const orderCount = await prisma.order.count({
        where: { tenantId: tenant.id }
      });
      results.tests.push({ test: 'order.count', status: 'PASS', count: orderCount });
    } catch (e: any) {
      results.errors.push({ test: 'order.count', error: e.message });
    }

    // Test 3: OrderLine
    try {
      const line = await prisma.orderLine.findFirst({
        where: { tenantId: tenant.id },
        select: { id: true, netPrice: true, quantity: true }
      });
      results.tests.push({ test: 'orderLine', status: 'PASS', data: line });
    } catch (e: any) {
      results.errors.push({ test: 'orderLine', error: e.message });
    }

    // Test 4: Customer with company
    try {
      const customer = await prisma.customer.findFirst({
        where: { tenantId: tenant.id },
        include: {
          company: { select: { name: true } }
        }
      });
      results.tests.push({ test: 'customer+company', status: 'PASS', companyName: customer?.company?.name });
    } catch (e: any) {
      results.errors.push({ test: 'customer+company', error: e.message });
    }

    return Response.json(results, { status: 200 });

  } catch (error: any) {
    return Response.json({
      error: error.message,
      stack: error.stack,
      tests: results.tests,
      errors: results.errors
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
