import { NextRequest } from 'next/server';

/**
 * MCP SSE (Server-Sent Events) Endpoint
 *
 * This endpoint provides an SSE interface for the MCP server to work with
 * Claude Code's mcp-remote client. It wraps the existing HTTP POST endpoint.
 */

export async function GET(request: NextRequest) {
  // Get API key from Authorization header
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');

  if (!apiKey) {
    return new Response('API key required', { status: 401 });
  }

  // Create SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send SSE message
      const send = (data: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Helper to make internal MCP request
      const callMcp = async (method: string, params?: any, id?: number) => {
        const response = await fetch(
          `${request.nextUrl.origin}/api/mcp`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method,
              params: params || {},
              id: id || 1,
            }),
          }
        );

        return await response.json();
      };

      try {
        // Handle incoming SSE messages
        // For now, we'll send the server info and keep connection alive
        send({
          jsonrpc: '2.0',
          method: 'serverInfo',
          params: {
            name: 'Koffers Finance MCP',
            version: '1.0.0',
            protocolVersion: '2024-11-05',
          },
        });

        // Keep connection alive with periodic pings
        const interval = setInterval(() => {
          try {
            send({ type: 'ping' });
          } catch (e) {
            clearInterval(interval);
          }
        }, 30000); // Every 30 seconds

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      } catch (error) {
        console.error('SSE error:', error);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Handle POST requests for bidirectional communication
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key required' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Forward to main MCP endpoint
  const body = await request.json();

  const response = await fetch(
    `${request.nextUrl.origin}/api/mcp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
