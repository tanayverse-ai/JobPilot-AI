import { useState, type FormEvent, type ReactNode } from "react";

import FormError from "@/components/FormError";
import SelectField from "@/components/SelectField";
import SubmitButton from "@/components/SubmitButton";
import TextAreaField from "@/components/TextAreaField";
import TextField from "@/components/TextField";
import { STATUS_LABELS, STATUS_ORDER, WORKPLACE_LABELS, type ApplicationFormValues } from "@/types/application";

import { validateFormValues } from "./formHelpers";

interface ApplicationFormProps {
  initialValues: ApplicationFormValues;
  onSubmit: (values: ApplicationFormValues) => Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  serverError?: string | null;
  secondaryAction?: ReactNode;
}

export default function ApplicationForm({
  initialValues,
  onSubmit,
  submitLabel,
  pendingLabel,
  serverError,
  secondaryAction,
}: ApplicationFormProps) {
  const [values, setValues] = useState<ApplicationFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ApplicationFormValues, string>>>({});
  const [pending, setPending] = useState(false);

  function update<K extends keyof ApplicationFormValues>(key: K, value: ApplicationFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validateFormValues(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    setPending(true);
    try {
      await onSubmit(values);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormError message={serverError ?? null} />

      <div className="grid gap-x-4 sm:grid-cols-2">
        <TextField
          label="Company name"
          required
          value={values.company_name}
          onChange={(e) => update("company_name", e.target.value)}
          error={fieldErrors.company_name}
        />
        <TextField
          label="Job title"
          required
          value={values.job_title}
          onChange={(e) => update("job_title", e.target.value)}
          error={fieldErrors.job_title}
        />
      </div>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <SelectField label="Status" value={values.status} onChange={(e) => update("status", e.target.value as ApplicationFormValues["status"])}>
          {STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Workplace type"
          value={values.workplace_type}
          onChange={(e) => update("workplace_type", e.target.value as ApplicationFormValues["workplace_type"])}
        >
          <option value="">Not specified</option>
          {(Object.keys(WORKPLACE_LABELS) as Array<keyof typeof WORKPLACE_LABELS>).map((type) => (
            <option key={type} value={type}>
              {WORKPLACE_LABELS[type]}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <TextField
          label="Location"
          value={values.location}
          onChange={(e) => update("location", e.target.value)}
          placeholder="e.g. Bengaluru, India"
        />
        <TextField
          label="Salary"
          value={values.salary}
          onChange={(e) => update("salary", e.target.value)}
          placeholder="e.g. ₹18–24 LPA"
        />
      </div>

      <TextField
        label="Job posting URL"
        type="url"
        value={values.job_url}
        onChange={(e) => update("job_url", e.target.value)}
        error={fieldErrors.job_url}
        placeholder="https://…"
      />

      <div className="grid gap-x-4 sm:grid-cols-2">
        <TextField
          label="Applied on"
          type="date"
          value={values.applied_at}
          onChange={(e) => update("applied_at", e.target.value)}
        />
        <TextField
          label="Next action date"
          type="date"
          value={values.next_action_at}
          onChange={(e) => update("next_action_at", e.target.value)}
        />
      </div>

      <TextAreaField
        label="Job description"
        value={values.job_description}
        onChange={(e) => update("job_description", e.target.value)}
        rows={4}
      />

      <TextAreaField
        label="Notes"
        value={values.notes}
        onChange={(e) => update("notes", e.target.value)}
        rows={3}
        placeholder="Interview prep, contacts, follow-ups…"
      />

      <div className="mt-6 flex items-center gap-3">
        <SubmitButton pending={pending} pendingLabel={pendingLabel}>
          {submitLabel}
        </SubmitButton>
        {secondaryAction}
      </div>
    </form>
  );
}
