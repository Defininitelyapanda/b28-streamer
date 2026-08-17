import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";

export const revalidate = 300;

export async function GET() {
  const catalog = await getCatalog();
  return NextResponse.json(catalog, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
