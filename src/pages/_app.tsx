import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/components/auth/AuthContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          className: 'toast-base',
          success: {
            className: 'toast-success'
          },
          error: {
            className: 'toast-error'
          },
          loading: {
            className: 'toast-loading'
          }
        }}
      />
    </AuthProvider>
  );
}
