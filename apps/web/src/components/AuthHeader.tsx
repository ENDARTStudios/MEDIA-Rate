import { cookies } from "next/headers";
import { Navbar } from "./Navbar";

export async function AuthHeader() {
  try {
    const cookieStore = await cookies();
    const hasSession = !!cookieStore.get("sess")?.value;

    if (hasSession) {
      return <Navbar initialAuth={{ isAuthenticated: true, userName: null }} />;
    }
  } catch {
    // cookies() can throw in some build contexts — silently fallback
  }

  return <Navbar initialAuth={{ isAuthenticated: false, userName: null }} />;
}
