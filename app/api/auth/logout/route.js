// app/api/auth/logout/route.js
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("auth-session");
  return Response.json({ success: true });
}
