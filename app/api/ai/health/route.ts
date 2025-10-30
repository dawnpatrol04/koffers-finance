import { NextRequest, NextResponse } from "next/server";
import { healthCheck } from "@/lib/claude-client";

/**
 * Health check endpoint for Claude API
 * GET /api/ai/health
 */
export async function GET(request: NextRequest) {
  try {
    const isHealthy = await healthCheck();

    if (isHealthy) {
      return NextResponse.json({
        success: true,
        message: "Claude API is healthy",
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Claude API health check failed",
        },
        { status: 503 }
      );
    }
  } catch (error: any) {
    console.error("Claude health check error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check Claude API health",
      },
      { status: 500 }
    );
  }
}
