import { getServerAuth } from "@/lib/auth-server";
import { Navbar } from "./Navbar";

export async function AuthHeader() {
  const auth = await getServerAuth();
  return <Navbar initialAuth={auth} />;
}
