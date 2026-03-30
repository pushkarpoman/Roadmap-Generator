"use client";

import { useState } from "react";
import { TextField, Button, Container, Typography, Box } from "@mui/material";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/app-context";

export default function RegisterForm() {
  const router = useRouter();
  const { registerUser } = useAppContext();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "", password: "" });

  const validateField = (name: "name" | "email" | "password", value: string) => {
    if (name === "name") {
      return value.trim() ? "" : "Full name is required";
    }
    if (name === "email") {
      return /\S+@\S+\.\S+/.test(value) ? "" : "Enter a valid email";
    }
    return value.length >= 6 ? "" : "Password must be at least 6 characters";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextFieldErrors = {
      name: validateField("name", formData.name),
      email: validateField("email", formData.email),
      password: validateField("password", formData.password),
    };

    setFieldErrors(nextFieldErrors);
    if (nextFieldErrors.name || nextFieldErrors.email || nextFieldErrors.password) {
      setError("Please fix the errors above");
      return;
    }

    try {
      await registerUser(formData.name, formData.email, formData.password);
      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Typography component="h1" variant="h5">
          Sign up
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="Full Name"
            name="name"
            autoComplete="name"
            autoFocus
            value={formData.name}
            onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
            onBlur={(event) => setFieldErrors((prev) => ({ ...prev, name: validateField("name", event.target.value) }))}
            error={Boolean(fieldErrors.name)}
            helperText={fieldErrors.name}
            inputProps={{ spellCheck: "false", "aria-invalid": Boolean(fieldErrors.name) }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
            onBlur={(event) => setFieldErrors((prev) => ({ ...prev, email: validateField("email", event.target.value) }))}
            error={Boolean(fieldErrors.email)}
            helperText={fieldErrors.email}
            inputProps={{ spellCheck: "false", "aria-invalid": Boolean(fieldErrors.email) }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
            onBlur={(event) => setFieldErrors((prev) => ({ ...prev, password: validateField("password", event.target.value) }))}
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password}
            inputProps={{ spellCheck: "false", "aria-invalid": Boolean(fieldErrors.password) }}
          />
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
            Sign Up
          </Button>
          <Button fullWidth variant="text" onClick={() => router.push("/login")}>
            Already have an account? Sign in
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
