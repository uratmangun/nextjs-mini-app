import { NextRequest, NextResponse } from 'next/server';
import type { CloudflareEnv } from '@/../../env';

// OpenNext/Cloudflare Workers runs at the edge by default

export async function GET(request: NextRequest) {
  try {
    // Access Cloudflare-specific properties if available
    const cf = (request as any).cf;
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name') || 'World';
    
    // Example response with Cloudflare metadata
    const response = {
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
      edge: {
        colo: cf?.colo || 'unknown',
        country: cf?.country || 'unknown',
        city: cf?.city || 'unknown',
        timezone: cf?.timezone || 'unknown',
        latitude: cf?.latitude || null,
        longitude: cf?.longitude || null,
      },
      headers: {
        'user-agent': request.headers.get('user-agent'),
        'accept-language': request.headers.get('accept-language'),
      },
    };
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
      },
    });
  } catch (error) {
    console.error('Error in hello API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { name?: string };
    
    // Validate input
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    // Process the data
    const response = {
      message: `Hello, ${body.name}!`,
      received: body,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error in hello POST:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}