import { cookies } from "next/headers";
import { Navbar } from "./Navbar";

export async function AuthHeader() {
  try {
    const cookieStore = await cookies();
    const hasAuth = !!(cookieStore.get("mr_auth")?.value || cookieStore.get("sess")?.value);

    if (hasAuth) {
      return <Navbar initialAuth={{ isAuthenticated: true, userName: null }} />;
    }
  } catch {
    // Silently fallback to unauthenticated
  }

  return <Navbar initialAuth={{ isAuthenticated: false, userName: null }} />;
}
