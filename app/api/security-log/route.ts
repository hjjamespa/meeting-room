// Security logging is now internal-only.
// All security log operations are performed server-side within the login API route.
// This endpoint has been intentionally removed to prevent unauthenticated access.

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'This endpoint has been removed.' }, { status: 404 })
}
