import Link from 'next/link'
import Image from 'next/image'
import { Star, ShoppingBag, ArrowRight } from 'lucide-react'

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  compareAtPrice: number | null
  salesCount: number
  averageRating: number | null
  reviewCount: number
  vendorStore: {
    slug: string
    name: string
    isVerified: boolean
  }
  productImages: Array<{
    url: string
  }>
}

interface MarketplaceSectionProps {
  products: Product[]
}

export function MarketplaceSection({ products }: MarketplaceSectionProps) {
  if (products.length === 0) {
    return null
  }

  const displayProducts = products.slice(0, 8)

  return (
    <section className="bg-muted/50 py-16 sm:py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Trending Products
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              Shop unique products from local vendors
            </p>
          </div>
          <Link
            href="/marketplace"
            className="hidden items-center gap-2 text-sm font-medium text-primary hover:underline sm:flex"
          >
            Browse marketplace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Products Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {displayProducts.map((product) => {
            const image = product.productImages[0]

            return (
              <Link
                key={product.id}
                href={`/marketplace/${product.id}`}
                className="group rounded-lg border bg-card transition-all hover:shadow-lg"
              >
                {/* Product Image */}
                <div className="relative aspect-square overflow-hidden rounded-t-lg bg-muted">
                  {image ? (
                    <Image
                      src={image.url}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ShoppingBag className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}

                  {/* Sale Badge */}
                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <div className="absolute right-2 top-2 rounded-full bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground z-10">
                      SALE
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-2 group-hover:text-primary">
                    {product.name}
                  </h3>

                  {/* Store Name */}
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                    {product.vendorStore.name}
                  </p>

                  {/* Price */}
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-lg font-bold">
                      ${(product.price / 100).toFixed(2)}
                    </span>
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                      <span className="text-sm text-muted-foreground line-through">
                        ${(product.compareAtPrice / 100).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Rating */}
                  {product.averageRating && product.reviewCount > 0 ? (
                    <div className="mt-2 flex items-center gap-1 text-sm">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      <span className="font-medium">
                        {Number(product.averageRating).toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">
                        ({product.reviewCount})
                      </span>
                    </div>
                  ) : null}

                  {/* Sales Count */}
                  {product.salesCount > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {product.salesCount} sold
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        {/* Mobile View All Link */}
        <div className="mt-8 flex justify-center sm:hidden">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Browse marketplace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
