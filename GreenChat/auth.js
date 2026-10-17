export async function setupTokenAuth(request, env) {
  // This will be used by the worker to handle auth
  const authHeader = request.headers.get('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return { user: { id: payload.sub, email: payload.email } };
    } catch (e) {
      return { user: null };
    }
  }
  
  // Check for session in KV or cookie
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/greenchat_token=([^;]+)/);
  if (match) {
    try {
      const payload = JSON.parse(Buffer.from(match[1].split('.')[1], 'base64').toString());
      return { user: { id: payload.sub, email: payload.email } };
    } catch (e) {
      return { user: null };
    }
  }
  
  return { user: null };
}