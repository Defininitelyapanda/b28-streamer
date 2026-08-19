"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

interface WatchLinkProps extends Omit<ComponentProps<typeof Link>, "href"> {
  slug: string;
}

export default function WatchLink({ slug, children, onMouseEnter, onFocus, ...props }: WatchLinkProps) {
  const router = useRouter();
  const href = `/watch/${slug}`;

  function prefetchWatch() {
    router.prefetch(href);
  }

  return (
    <Link
      href={href}
      onMouseEnter={(event) => {
        prefetchWatch();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        prefetchWatch();
        onFocus?.(event);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
