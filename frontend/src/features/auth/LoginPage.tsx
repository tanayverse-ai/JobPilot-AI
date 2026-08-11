import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { ApiError, useAuth } from "@/app/AuthContext";
import AuthLayout from "@/components/AuthLayout";
import FormError from "@/components/FormError";
import PasswordField from "@/components/PasswordField";
import SubmitButton from "@/components/SubmitButton";
import TextField from "@/components/TextField";

interface LocationState {
  from?: { pathname: string };
}

export default function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setPending(true);
    try {
      await login({ email: email.trim(), password });
      const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && (error.code === "invalid_credentials" || error.status === 401)) {
        setFormError("Email or password is incorrect.");
      } else if (error instanceof ApiError && error.status === 429) {
        setFormError("Too many attempts. Please wait a few minutes and try again.");
      } else if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      heading="Welcome back"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-800">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormError message={formError} />
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <SubmitButton pending={pending} pendingLabel="Signing in…">
          Log in
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
