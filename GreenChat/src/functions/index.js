/*
 * GreenChat API Entry Point
 * Handles: User auth, KV storage, friend management, chat messages
 * 
 * Bind SHARED_KV namespace in Cloudflare Pages > Settings > Bindings
 */

import { handler as sharedHandler } from './api/shared.js';

export async function onRequest(context) {
    const req = context.request;
    const url = new URL(req.url);
    const path = url.pathname;
    
    // Add CORS headers
    const headers = new Headers(context.responseHeaders);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers
        });
    }
    
    // Route to shared handler for basic operations
    if (path === '/api' || path === '/api/') {
        return sharedHandler(req, context.env);
    }
    
    // Specific routes
    if (path === '/api/user' || path === '/api/auth') {
        return sharedHandler(req, context.env);
    }
    
    if (path === '/api/kv' || path.startsWith('/api/kv/')) {
        return sharedHandler(req, context.env);
    }
    
    // Not found
    return new Response('Not found', { status: 404, headers });
}