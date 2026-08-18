import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";

export const revalidate = 30;

export async function GET() {
  const catalog = await getCatalog();
  return NextResponse.json(catalog, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
