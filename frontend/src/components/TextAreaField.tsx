import { forwardRef, useId, type TextareaHTMLAttributes } from "react";

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, error, id, ...textareaProps },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className="mb-4">
      <label htmlFor={textareaId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        ref={ref}
        id={textareaId}
        aria-invalid={Boolean(error)}
        rows={4}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          error ? "border-red-400" : "border-slate-300"
        }`}
        {...textareaProps}
      />
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
});

export default TextAreaField;
