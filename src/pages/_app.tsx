import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { AuthProvider } from "@/components/auth/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  return (
    <AuthProvider>
      <ProtectedRoute>
        <Component {...pageProps} />
      </ProtectedRoute>
    </AuthProvider>
  );
}
