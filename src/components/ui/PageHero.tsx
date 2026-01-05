"use client";

import Image from "next/image";

interface PageHeroProps {
  title: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
}

export function PageHero({ title, subtitle, imageUrl, imageAlt }: PageHeroProps) {
  return (
    <div className="relative w-full h-[280px] md:h-[320px] overflow-hidden bg-gradient-to-br from-foreground to-foreground/90">
      {/* Background Image - scaled to show complete image */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          priority
          className="object-contain opacity-50"
          sizes="100vw"
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/30 to-foreground/20" />

      {/* Content */}
      <div className="relative h-full container mx-auto px-4 flex flex-col justify-end pb-8">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 drop-shadow-lg">
          {title}
        </h1>
        <p className="text-lg md:text-xl text-foreground max-w-2xl drop-shadow-md">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
