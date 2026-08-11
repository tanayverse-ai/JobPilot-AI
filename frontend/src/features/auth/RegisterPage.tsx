import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { ApiError, useAuth } from "@/app/AuthContext";
import AuthLayout from "@/components/AuthLayout";
import FormError from "@/components/FormError";
import PasswordField from "@/components/PasswordField";
import SubmitButton from "@/components/SubmitButton";
import TextField from "@/components/TextField";

interface FieldErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

export default function RegisterPage() {
  const { register, status } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (displayName.trim().length < 2) {
      errors.displayName = "Enter your name (at least 2 characters).";
    }
    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    if (!agreedToTerms) {
      errors.terms = "You must accept the Terms and Privacy Policy to continue.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) {
      return;
    }

    setPending(true);
    try {
      await register({ email: email.trim(), password, display_name: displayName.trim() });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === "email_already_registered") {
        setFormError("This email is already registered. Log in or reset your password.");
      } else if (error instanceof ApiError && error.code === "validation_failed") {
        setFormError("Please check the highlighted fields and try again.");
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
      heading="Create your account"
      subheading="Track applications, tailor materials, and prep for interviews in one place."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-800">
            Log in instead
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormError message={formError} />
        <TextField
          label="Display name"
          name="displayName"
          autoComplete="name"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          error={fieldErrors.displayName}
        />
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
        />
        <div className="mb-4">
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
            />
            <span>I agree to the Terms of Service and Privacy Policy.</span>
          </label>
          {fieldErrors.terms ? <p className="mt-1 text-sm text-red-600">{fieldErrors.terms}</p> : null}
        </div>
        <SubmitButton pending={pending} pendingLabel="Creating account…">
          Create account
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
