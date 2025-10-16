'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useProducts } from '@/lib/hooks/useProducts';
import { useAddToCart } from '@/lib/hooks/useCart';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, EmptySearchState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/lib/utils';
import { Search, ShoppingCart, Package, AlertCircle } from 'lucide-react';

/**
 * Products Catalog Page
 *
 * Browse and search product catalog
 *
 * Features:
 * - Product grid/list view
 * - Search and filters (category, supplier, price)
 * - Product details modal/drawer
 * - Add to cart functionality
 * - Inventory availability
 * - Pricing display (tenant-specific pricing waterfall)
 *
 * Data source:
 * - /api/portal/products
 * - Product, Sku, Inventory models
 */
export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useProducts({
    search: searchQuery,
    category: category || undefined,
    supplier: supplier || undefined,
    page,
    limit: 12,
  });

  const addToCart = useAddToCart();

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleAddToCart = (productId: string) => {
    addToCart.mutate({ productId, quantity: 1 });
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          icon={AlertCircle}
          title="Failed to load products"
          description="We encountered an error loading the product catalog. Please try again."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-heading-xl font-semibold">Product Catalog</h1>
        <p className="text-muted">
          Browse and order from our available products.
        </p>
      </div>

      {/* Search and filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <Input
            type="search"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            className="flex-1"
          />
        </div>

        <div className="flex gap-4">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="rounded-input border-2 border-border bg-background px-4 py-2 text-body-md"
          >
            <option value="">All Categories</option>
            <option value="Wine">Wine</option>
            <option value="Beer">Beer</option>
            <option value="Spirits">Spirits</option>
            <option value="Non-Alcoholic">Non-Alcoholic</option>
          </select>

          <select
            value={supplier}
            onChange={(e) => {
              setSupplier(e.target.value);
              setPage(1);
            }}
            className="rounded-input border-2 border-border bg-background px-4 py-2 text-body-md"
          >
            <option value="">All Suppliers</option>
            <option value="Well Crafted">Well Crafted</option>
            <option value="Premium Imports">Premium Imports</option>
          </select>
        </div>
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-48 w-full rounded-t-card" />
              <CardContent className="pt-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.products && data.products.length > 0 ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.products.map((product) => (
              <Card key={product.id} interactive>
                <CardContent className="pt-6">
                  <div className="mb-4">
                    {product.imageUrl ? (
                      <div className="relative h-48 w-full overflow-hidden rounded-card bg-muted">
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-48 w-full bg-muted rounded-card flex items-center justify-center">
                        <Package className="h-12 w-12 text-slate-400" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-body-lg line-clamp-2">
                        {product.name}
                      </h3>
                      <Badge variant={product.inStock ? 'success' : 'warning'}>
                        {product.inStock ? 'In Stock' : 'Low Stock'}
                      </Badge>
                    </div>

                    <p className="text-body-sm text-muted line-clamp-2">
                      {product.description}
                    </p>

                    <div className="flex items-center gap-2 text-caption text-muted">
                      <span>{product.category}</span>
                      <span>•</span>
                      <span>{product.supplier}</span>
                    </div>

                    <div className="pt-3 flex items-center justify-between">
                      <p className="text-heading-md font-semibold">
                        {formatCurrency(product.price)}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(product.id)}
                        disabled={!product.inStock || addToCart.isPending}
                        loading={addToCart.isPending}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-body-sm text-muted">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === data.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : searchQuery ? (
        <EmptySearchState query={searchQuery} />
      ) : (
        <EmptyState
          icon={Package}
          title="No products available"
          description="Connect your distributor feeds to populate the product catalog."
        />
      )}
    </div>
  );
}
