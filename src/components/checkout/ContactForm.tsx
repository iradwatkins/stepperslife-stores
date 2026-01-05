/**
 * Reusable Contact Information Form Component
 *
 * Features:
 * - Field-level validation
 * - Phone number formatting
 * - Email validation (when required)
 * - Error message display
 * - Accessibility compliant
 */

import { User, Mail, Phone, AlertCircle } from "lucide-react";
import { ChangeEvent } from "react";

export interface ContactFormValues {
  name: string;
  email: string;
  phone: string;
}

export interface ContactFormProps {
  /** Form values */
  values: ContactFormValues;
  /** Callback when field value changes */
  onChange: (field: keyof ContactFormValues, value: string) => void;
  /** Validation errors by field */
  errors: Partial<Record<keyof ContactFormValues, string>>;
  /** Email is required (false for cash payments) */
  emailRequired?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Format phone number as user types
 * Converts: 1234567890 -> (123) 456-7890
 */
function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, "");

  // Limit to 10 digits
  const limited = digits.slice(0, 10);

  // Format based on length
  if (limited.length <= 3) {
    return limited;
  } else if (limited.length <= 6) {
    return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  } else {
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
  }
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function ContactForm({
  values,
  onChange,
  errors,
  emailRequired = true,
  disabled = false,
}: ContactFormProps) {
  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange("phone", formatted);
  };

  const handleEmailBlur = () => {
    // Validate email on blur if required and value exists
    if (emailRequired && values.email && !isValidEmail(values.email)) {
      // Parent component should handle this via errors prop
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground mb-4">Contact Information</h3>

      {/* Name Field */}
      <div>
        <label htmlFor="contact-name" className="block text-sm font-medium text-muted-foreground mb-2">
          Full Name <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            id="contact-name"
            type="text"
            value={values.name}
            onChange={(e) => onChange("name", e.target.value)}
            disabled={disabled}
            className={`
              block w-full pl-10 pr-3 py-3 border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${errors.name ? "border-destructive bg-destructive/10" : "border-border"}
            `}
            placeholder="John Doe"
            required
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
        </div>
        {errors.name && (
          <div id="name-error" className="mt-1 flex items-center gap-1 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>{errors.name}</span>
          </div>
        )}
      </div>

      {/* Email Field */}
      <div>
        <label htmlFor="contact-email" className="block text-sm font-medium text-muted-foreground mb-2">
          Email Address{" "}
          {emailRequired ? (
            <span className="text-destructive">*</span>
          ) : (
            <span className="text-muted-foreground font-normal">(Optional for cash payments)</span>
          )}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            id="contact-email"
            type="email"
            value={values.email}
            onChange={(e) => onChange("email", e.target.value)}
            onBlur={handleEmailBlur}
            disabled={disabled}
            className={`
              block w-full pl-10 pr-3 py-3 border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${errors.email ? "border-destructive bg-destructive/10" : "border-border"}
            `}
            placeholder="john@example.com"
            required={emailRequired}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
        </div>
        {errors.email && (
          <div id="email-error" className="mt-1 flex items-center gap-1 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>{errors.email}</span>
          </div>
        )}
        {emailRequired && (
          <p className="mt-1 text-xs text-muted-foreground">
            Your ticket confirmation and QR code will be sent to this email
          </p>
        )}
      </div>

      {/* Phone Field */}
      <div>
        <label htmlFor="contact-phone" className="block text-sm font-medium text-muted-foreground mb-2">
          Phone Number <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Phone className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            id="contact-phone"
            type="tel"
            value={values.phone}
            onChange={handlePhoneChange}
            disabled={disabled}
            className={`
              block w-full pl-10 pr-3 py-3 border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${errors.phone ? "border-destructive bg-destructive/10" : "border-border"}
            `}
            placeholder="(555) 123-4567"
            required
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
        </div>
        {errors.phone && (
          <div id="phone-error" className="mt-1 flex items-center gap-1 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>{errors.phone}</span>
          </div>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Used for order confirmation and ticket transfer
        </p>
      </div>

      {/* Privacy Notice */}
      <div className="mt-4 p-3 bg-accent/50 border border-border rounded-lg">
        <p className="text-xs text-foreground">
          <strong>Privacy:</strong> Your information is securely stored and will only be used for
          this order. We will never share your contact details with third parties.
        </p>
      </div>
    </div>
  );
}

/**
 * Validate contact form values
 *
 * @param values - Form values to validate
 * @param emailRequired - Whether email is required
 * @returns Validation errors or empty object if valid
 */
export function validateContactForm(
  values: ContactFormValues,
  emailRequired: boolean = true
): Partial<Record<keyof ContactFormValues, string>> {
  const errors: Partial<Record<keyof ContactFormValues, string>> = {};

  // Name validation
  if (!values.name || values.name.trim().length === 0) {
    errors.name = "Please enter your full name";
  } else if (values.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters";
  }

  // Email validation
  if (emailRequired) {
    if (!values.email || values.email.trim().length === 0) {
      errors.email = "Please enter your email address";
    } else if (!isValidEmail(values.email)) {
      errors.email = "Please enter a valid email address";
    }
  } else if (values.email && !isValidEmail(values.email)) {
    // Email is optional but if provided, must be valid
    errors.email = "Please enter a valid email address";
  }

  // Phone validation
  const phoneDigits = values.phone.replace(/\D/g, "");
  if (!values.phone || phoneDigits.length === 0) {
    errors.phone = "Please enter your phone number";
  } else if (phoneDigits.length !== 10) {
    errors.phone = "Phone number must be 10 digits";
  }

  return errors;
}
