// app/api/auth/login/route.js
import { cookies } from "next/headers";

const users = [
  { username: "user", password: "password" },
];

export async function POST(request) {
  const { username, password } = await request.json();

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(
      "auth-session",
      JSON.stringify({ username: user.username }),
      {
        httpOnly: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24,
        path: "/",
      }
    );

    return Response.json({ success: true, username: user.username });
  } else {
    return Response.json(
      { success: false, message: "Invalid credentials" },
      { status: 401 }
    );
  }
}
