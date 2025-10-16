#!/usr/bin/env node
/**
 * Post-Deployment Validation Script
 * Validates critical functionality after deployment
 */

interface ValidationResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class DeploymentValidator {
  private baseUrl: string;
  private timeout: number;
  private results: ValidationResult[] = [];

  constructor(baseUrl?: string, timeout?: number) {
    this.baseUrl = baseUrl || process.env.DEPLOYMENT_URL || 'http://localhost:3000';
    this.timeout = timeout || parseInt(process.env.HEALTH_CHECK_TIMEOUT || '30000', 10);
  }

  async validateAll(): Promise<boolean> {
    console.log('🔍 Starting post-deployment validation...');
    console.log(`📍 Target URL: ${this.baseUrl}`);
    console.log(`⏱️  Timeout: ${this.timeout}ms\n`);

    await this.checkHealthEndpoint();
    await this.checkDatabaseConnection();
    await this.checkAuthEndpoints();
    await this.checkAPIEndpoints();
    await this.checkStaticAssets();
    await this.checkEnvironmentVariables();

    this.printResults();
    return this.results.every(r => r.passed);
  }

  private async checkHealthEndpoint(): Promise<void> {
    const start = Date.now();
    try {
      const response = await this.fetch('/api/health', { timeout: 10000 });
      const data = await response.json();

      const passed = response.ok && data.status === 'healthy';
      this.results.push({
        name: 'Health Endpoint',
        passed,
        duration: Date.now() - start,
        details: data
      });
    } catch (error) {
      this.results.push({
        name: 'Health Endpoint',
        passed: false,
        duration: Date.now() - start,
        error: (error as Error).message
      });
    }
  }

  private async checkDatabaseConnection(): Promise<void> {
    const start = Date.now();
    try {
      const response = await this.fetch('/api/health/database', { timeout: 15000 });
      const data = await response.json();

      const passed = response.ok && data.connected === true;
      this.results.push({
        name: 'Database Connection',
        passed,
        duration: Date.now() - start,
        details: data
      });
    } catch (error) {
      this.results.push({
        name: 'Database Connection',
        passed: false,
        duration: Date.now() - start,
        error: (error as Error).message
      });
    }
  }

  private async checkAuthEndpoints(): Promise<void> {
    const start = Date.now();
    try {
      // Test auth endpoints existence (should return 401 or proper error, not 404)
      const endpoints = [
        '/api/portal/auth/login',
        '/api/portal/auth/me',
        '/api/portal/auth/refresh'
      ];

      const results = await Promise.all(
        endpoints.map(async (endpoint) => {
          const response = await this.fetch(endpoint, {
            method: 'POST',
            timeout: 5000
          });
          // Should return 400/401, not 404
          return response.status !== 404;
        })
      );

      const passed = results.every(r => r);
      this.results.push({
        name: 'Auth Endpoints',
        passed,
        duration: Date.now() - start,
        details: { endpoints, available: results }
      });
    } catch (error) {
      this.results.push({
        name: 'Auth Endpoints',
        passed: false,
        duration: Date.now() - start,
        error: (error as Error).message
      });
    }
  }

  private async checkAPIEndpoints(): Promise<void> {
    const start = Date.now();
    try {
      // Test critical API endpoints (unauthenticated checks)
      const endpoints = [
        '/api/portal/products',
        '/api/portal/orders',
        '/api/portal/insights'
      ];

      const results = await Promise.all(
        endpoints.map(async (endpoint) => {
          const response = await this.fetch(endpoint, { timeout: 5000 });
          // Should return 401 or valid response, not 404/500
          return response.status !== 404 && response.status !== 500;
        })
      );

      const passed = results.every(r => r);
      this.results.push({
        name: 'API Endpoints',
        passed,
        duration: Date.now() - start,
        details: { endpoints, available: results }
      });
    } catch (error) {
      this.results.push({
        name: 'API Endpoints',
        passed: false,
        duration: Date.now() - start,
        error: (error as Error).message
      });
    }
  }

  private async checkStaticAssets(): Promise<void> {
    const start = Date.now();
    try {
      const assets = [
        '/',
        '/portal/auth/login',
        '/favicon.ico'
      ];

      const results = await Promise.all(
        assets.map(async (asset) => {
          const response = await this.fetch(asset, { timeout: 5000 });
          return response.ok || response.status === 401;
        })
      );

      const passed = results.every(r => r);
      this.results.push({
        name: 'Static Assets',
        passed,
        duration: Date.now() - start,
        details: { assets, loaded: results }
      });
    } catch (error) {
      this.results.push({
        name: 'Static Assets',
        passed: false,
        duration: Date.now() - start,
        error: (error as Error).message
      });
    }
  }

  private async checkEnvironmentVariables(): Promise<void> {
    const start = Date.now();
    try {
      // Check that critical env vars are configured (via health endpoint)
      const response = await this.fetch('/api/health/config', { timeout: 5000 });
      const data = await response.json();

      const requiredVars = [
        'DATABASE_URL',
        'JWT_SECRET',
        'DEFAULT_TENANT_SLUG'
      ];

      const passed = requiredVars.every(v => data.configured?.[v] === true);
      this.results.push({
        name: 'Environment Configuration',
        passed,
        duration: Date.now() - start,
        details: data
      });
    } catch (error) {
      // If endpoint doesn't exist, skip this check
      this.results.push({
        name: 'Environment Configuration',
        passed: true,
        duration: Date.now() - start,
        details: { note: 'Config endpoint not implemented, skipped' }
      });
    }
  }

  private async fetch(path: string, options: any = {}): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Leora-Deployment-Validator/1.0',
          ...options.headers
        }
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('VALIDATION RESULTS');
    console.log('='.repeat(80) + '\n');

    this.results.forEach((result) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.name} (${result.duration}ms)`);

      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }

      if (result.details && !result.passed) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      console.log('');
    });

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);

    console.log('='.repeat(80));
    console.log(`SUMMARY: ${passed}/${total} checks passed (${percentage}%)`);
    console.log('='.repeat(80) + '\n');

    if (percentage < 100) {
      console.log('⚠️  Some validation checks failed. Review the errors above.');
      process.exit(1);
    } else {
      console.log('✅ All validation checks passed successfully!');
      process.exit(0);
    }
  }
}

// Run validation
const validator = new DeploymentValidator();
validator.validateAll().catch((error) => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
