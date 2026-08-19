"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { ProductDetailsToolInvocation } from "@/lib/agent";

interface AgentProductCardProps {
  invocation: ProductDetailsToolInvocation;
}

export function AgentProductCard({ invocation }: AgentProductCardProps) {
  if (
    invocation.state === "input-streaming" ||
    invocation.state === "input-available"
  ) {
    const idOrSlug = invocation.input?.idOrSlug;
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        Looking up{idOrSlug ? ` "${idOrSlug}"` : ""}…
      </div>
    );
  }

  if (invocation.state !== "output-available") return null;

  const output = invocation.output;

  if (!output) return null;

  if (output.error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {output.error}
      </div>
    );
  }

  if (!output.name) return null;

  const image = output.images[0];

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {image && (
        <div className="relative aspect-4/3 bg-secondary">
          <Image
            src={image}
            alt={output.name}
            fill
            sizes="(min-width: 768px) 480px, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold leading-tight">
              {output.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {formatPrice(output.price, output.currency)}
            </p>
          </div>
          {output.stock && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                !output.stock.inStock
                  ? "bg-destructive/10 text-destructive"
                  : output.stock.lowStock
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-emerald-500/10 text-emerald-600"
              }`}
            >
              {!output.stock.inStock
                ? "Out of stock"
                : output.stock.lowStock
                  ? "Low stock"
                  : "In stock"}
            </span>
          )}
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {output.description}
        </p>
        {output.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {output.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <Link
          href={`/products/${output.slug}`}
          className="inline-flex text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          View product →
        </Link>
        {output.relatedProducts.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              You might also like
            </p>
            <div className="flex gap-2 overflow-x-auto">
              {output.relatedProducts.map((related) => (
                <Link
                  key={related.id}
                  href={`/products/${related.slug}`}
                  className="w-20 shrink-0 space-y-1"
                >
                  <div className="relative aspect-square w-20 overflow-hidden rounded-md bg-secondary">
                    {related.image && (
                      <Image
                        src={related.image}
                        alt={related.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {related.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
