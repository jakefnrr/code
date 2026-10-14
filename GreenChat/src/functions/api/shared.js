// Shared API utilities for Cloudflare KV
// This file is included by other API route files

export async function handler(req, env) {
    const url = new URL(req.request);
    const path = url.pathname;
    const method = req.method;
    
    // Add CORS headers
    const headers = new Headers(context.responseHeaders);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS preflight
    if (method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers
        });
    }
    
    // GET /api/kv?key=xxx - Get single KV value
    if (method === 'GET' && url.searchParams.has('key')) {
        const key = url.searchParams.get('key');
        const value = await env.SHARED_KV.get(key);
        if (value === undefined) {
            return new Response(JSON.stringify({}), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // Try to parse as JSON, fall back to string
        try {
            const parsed = JSON.parse(value);
            return new Response(JSON.stringify(parsed), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch {
            return new Response(value, {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        }
    }
    
    // POST /api/kv - Put value to KV key
    if (method === 'POST') {
        const body = await req.json();
        const key = body.key;
        const value = body.value;
        
        if (!key) {
            return new Response('Key required', { status: 400 });
        }
        
        await env.SHARED_KV.put(key, JSON.stringify(value));
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // GET /api/kv?prefix=xxx - List keys with prefix (approximate)
    if (method === 'GET' && url.searchParams.has('prefix')) {
        const prefix = url.searchParams.get('prefix');
        // Cloudflare KV doesn't support direct prefix queries
        // We'll return all keys and let the client filter
        // For now, return empty - client should use structured keys
        return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // GET /api/user - Get user info
    if (path === '/api/user' && method === 'GET') {
        // Try to get current user from KV or return null
        const userKey = 'greenchat_current_user';
        const value = await env.SHARED_KV.get(userKey);
        if (value) {
            try {
                return new Response(JSON.parse(value), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch {
                return new Response(value, {
                    status: 200,
                    headers: { 'Content-Type': 'text/plain' }
                });
            }
        }
        return new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // POST /api/user - Save user info
    if (path === '/api/user' && method === 'POST') {
        const body = await req.json();
        const username = body.username;
        const email = body.email;
        
        if (!username) {
            return new Response('Username required', { status: 400 });
        }
        
        const userKey = `user:${username}`;
        await env.SHARED_KV.put(userKey, JSON.stringify({
            username,
            email,
            lastSeen: new Date().toISOString()
        }));
        
        // Set as current user
        const currentKey = 'greenchat_current_user';
        await env.SHARED_KV.put(currentKey, JSON.stringify({ username, email }));
        
        return new Response(JSON.stringify({ success: true, username }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // Default 404
    return new Response('Not found', { status: 404 });
}