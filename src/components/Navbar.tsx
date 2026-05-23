"use client";

import { useState } from "react";
import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, Avatar, Box } from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { usePathname, useRouter } from "next/navigation";
import { useAppContext } from "@/context/app-context";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, theme, toggleTheme, logoutUser } = useAppContext();

  const handleHistory = () => {
    router.push("/history");
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
    setAnchorEl(null);
  };

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 0,
        width: "100%",
        background: "transparent",
        backdropFilter: "none",
        boxShadow: "none",
        borderBottom: "none",
        borderRadius: 0,
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: "70px !important",
          px: { xs: 2, sm: 3 },
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: "1120px",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Typography
            component="button"
            onClick={() => router.push("/")}
            sx={{
              all: "unset",
              cursor: "pointer",
              color: "var(--nav-text)",
              fontSize: "1.05rem",
              fontWeight: 800,
              letterSpacing: "0.01em",
              textTransform: "none",
              whiteSpace: "nowrap",
              opacity: 0.95,
              transition: "opacity 180ms ease",
              "&:hover": { opacity: 1 },
            }}
          >
            Roadmap Generator
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <IconButton
            className="theme-toggle"
            sx={{
              color: "var(--nav-text)",
              backgroundColor: "transparent",
              border: "1px solid color-mix(in srgb, var(--glass-border) 40%, transparent)",
              "&:hover": {
                backgroundColor: "var(--nav-control-bg)",
                borderColor: "color-mix(in srgb, var(--glass-border) 75%, transparent)",
              },
            }}
            onClick={toggleTheme}
            aria-label="toggle theme"
            aria-pressed={theme === "light"}
          >
            {theme === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>

          {user ? (
            <div>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={(event) => setAnchorEl(event.currentTarget)}
                color="inherit"
              >
                <Avatar sx={{ width: 34, height: 34, background: "var(--btn-gradient)", color: "#fff" }}>
                  {user.name ? user.name[0].toUpperCase() : "U"}
                </Avatar>
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                keepMounted
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                PaperProps={{
                  sx: {
                    mt: 0.8,
                    borderRadius: 2,
                    border: "1px solid var(--glass-border)",
                    background: "var(--nav-surface)",
                    backdropFilter: "blur(10px)",
                    boxShadow: "var(--shadow-soft)",
                  },
                }}
              >
                <MenuItem onClick={handleHistory}>History</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </div>
          ) : (
            <IconButton size="large" color="inherit" onClick={() => router.push("/login")}>
              <Avatar>?</Avatar>
            </IconButton>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
