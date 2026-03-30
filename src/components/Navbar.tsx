"use client";

import { useState } from "react";
import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, Avatar } from "@mui/material";
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
        top: 12,
        mx: { xs: 1, md: 2 },
        width: "auto",
        borderRadius: "14px",
        background: "var(--nav-surface)",
        backdropFilter: "blur(12px)",
        boxShadow: "var(--shadow-soft)",
        border: "1px solid var(--glass-border)",
      }}
    >
      <Toolbar sx={{ px: { xs: 1.2, sm: 1.8 }, minHeight: "60px !important" }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              margin: 0,
              color: "var(--nav-text)",
              fontSize: "1.15rem",
              fontWeight: 700,
              letterSpacing: "0.01em",
              cursor: "pointer",
              textTransform: "none",
            }}
          >
            Roadmap
          </button>
        </Typography>

        <IconButton
          className="theme-toggle"
          sx={{
            mr: 1,
            color: "var(--nav-text)",
            backgroundColor: "var(--nav-control-bg)",
            border: "1px solid var(--glass-border)",
            "&:hover": { backgroundColor: "var(--nav-control-hover)" },
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
              <Avatar sx={{ background: "var(--btn-gradient)", color: "#fff" }}>
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
      </Toolbar>
    </AppBar>
  );
}
