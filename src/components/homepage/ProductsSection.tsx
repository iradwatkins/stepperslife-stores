"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  primaryImage?: string;
  trackInventory?: boolean;
  inventoryQuantity?: number;
}

interface ProductsSectionProps {
  products: Product[];
}

export function ProductsSection({ products }: ProductsSectionProps) {
  const hasProducts = products && products.length > 0;
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" as const },
    },
  };

  return (
    <section ref={sectionRef} className="container mx-auto px-4 py-16 overflow-hidden">
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <motion.h2
            className="text-3xl font-bold text-foreground flex items-center gap-2"
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <ShoppingBag className="w-8 h-8 text-primary" />
            </motion.div>
            Marketplace
          </motion.h2>
          <motion.p
            className="text-muted-foreground mt-2"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Browse our exclusive stepping merchandise and products
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          whileHover={{ scale: 1.02, x: 5 }}
        >
          <Link href="/marketplace" className="text-primary hover:underline font-medium">
            Visit Marketplace →
          </Link>
        </motion.div>
      </motion.div>

      {!hasProducts ? (
        <motion.div
          className="text-center py-12 bg-muted/30 rounded-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          </motion.div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Marketplace Coming Soon
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            We&apos;re working on bringing you exclusive stepping merchandise and products from local vendors.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              Explore Marketplace
            </Link>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {products.slice(0, 8).map((product, index) => (
            <motion.div
              key={product._id}
              variants={cardVariants}
              custom={index}
            >
              <motion.div
                className="bg-card rounded-xl shadow-md overflow-hidden h-full"
                whileHover={{
                  y: -8,
                  boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Link href={`/marketplace/${product._id}`} className="block group">
                  <div className="relative h-48 bg-muted overflow-hidden">
                    {product.primaryImage ? (
                      <Image
                        src={product.primaryImage}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <ShoppingBag className="w-16 h-16 text-muted-foreground" />
                        </motion.div>
                      </div>
                    )}
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                      <motion.div
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-2 py-1 rounded-md text-xs font-bold"
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", delay: 0.3 + index * 0.05 }}
                        whileHover={{ scale: 1.1 }}
                      >
                        SALE
                      </motion.div>
                    )}
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                      <span className="text-white font-medium text-sm">View Product</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-card-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <motion.span
                          className="text-xl font-bold text-primary"
                          whileHover={{ scale: 1.1 }}
                        >
                          ${(product.price / 100).toFixed(2)}
                        </motion.span>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <span className="ml-2 text-sm text-muted-foreground line-through">
                            ${(product.compareAtPrice / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {product.trackInventory && (
                        <motion.span
                          className={`text-xs ${product.inventoryQuantity && product.inventoryQuantity > 0 ? "text-success" : "text-destructive"}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 + index * 0.05 }}
                        >
                          {product.inventoryQuantity && product.inventoryQuantity > 0
                            ? `${product.inventoryQuantity} in stock`
                            : "Out of stock"}
                        </motion.span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}
