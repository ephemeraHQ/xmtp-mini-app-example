// This file sets global Next.js configurations to disable caching
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "edge";

// Exporting these configurations makes them available for any route
// that imports them or for the Next.js framework when placed in layout files
