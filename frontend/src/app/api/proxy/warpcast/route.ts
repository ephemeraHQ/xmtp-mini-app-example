import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const targetUrl = new URL('https://client.warpcast.com' + url.pathname.replace('/api/proxy/warpcast', ''));
  
  // Add query parameters
  url.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  try {
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': request.headers.get('origin') || 'https://wallet.warpcast.com',
      },
    });

    const data = await response.json();
    
    // Create a response with CORS headers
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch from Warpcast API' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const targetUrl = new URL('https://client.warpcast.com' + url.pathname.replace('/api/proxy/warpcast', ''));
  
  try {
    const body = await request.json();
    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': request.headers.get('origin') || 'https://wallet.warpcast.com',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    // Create a response with CORS headers
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch from Warpcast API' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Content-Length': '0',
    },
  });
} 