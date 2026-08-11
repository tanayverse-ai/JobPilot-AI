import type { ReactNode } from "react";

interface AuthLayoutProps {
  heading: string;
  subheading?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthLayout({ heading, subheading, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">JobPilot AI</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{heading}</h1>
          {subheading ? <p className="mt-1 text-sm text-slate-500">{subheading}</p> : null}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
        {footer ? <div className="mt-6 text-center text-sm text-slate-500">{footer}</div> : null}
      </div>
    </div>
  );
}
