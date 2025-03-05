// app/api/auth/session/route.js
import { cookies } from 'next/headers';

export async function GET() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth-session')?.value;
  
  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie);
      return Response.json({ loggedIn: true, username: session.username });
    } catch (e) {
      return Response.json({ loggedIn: false });
    }
  }
  
  return Response.json({ loggedIn: false });
}