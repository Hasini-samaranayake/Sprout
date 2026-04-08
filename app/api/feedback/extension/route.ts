import { NextResponse } from "next/server";

/**
 * Reserved for future AI-assisted explanations. MVP returns 501.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "AI feedback extension is not enabled in this deployment.",
    },
    { status: 501 }
  );
}
