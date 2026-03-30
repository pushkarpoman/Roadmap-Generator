"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircularProgress, Box } from "@mui/material";
import { useAppContext } from "@/context/app-context";

const PUBLIC_ROUTES = new Set(["/login", "/register"]);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, authLoading } = useAppContext();

  useEffect(() => {
    if (authLoading) return;

    if (!user && !PUBLIC_ROUTES.has(pathname)) {
      router.replace("/login");
      return;
    }

    if (user && PUBLIC_ROUTES.has(pathname)) {
      router.replace("/");
    }
  }, [authLoading, pathname, router, user]);

  if (authLoading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user && !PUBLIC_ROUTES.has(pathname)) {
    return null;
  }

  if (user && PUBLIC_ROUTES.has(pathname)) {
    return null;
  }

  return <>{children}</>;
}
