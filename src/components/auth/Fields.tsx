"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { Localized, T } from "@/components/I18n";
import { fieldClass } from "@/components/SiteUi";
import { cn } from "@/lib/cn";

/** Tunisian mobile number with a fixed +216 prefix. Value is the 8 local digits. */
export function PhoneField({
  value,
  onChange,
  invalid,
  describedBy,
  autoFocus,
  label = "Phone number",
}: {
  value: string;
  onChange: (digits: string) => void;
  invalid?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
  label?: string;
}) {
  const formatted = value.replace(/(\d{2})(\d{0,3})(\d{0,3}).*/, (_, a, b, c) =>
    [a, b, c].filter(Boolean).join(" "),
  );
  return (
    <label className="block text-sm font-semibold text-gray-700">
      <T>{label}</T>
      <span
        dir="ltr"
        className={cn(
          "mt-2 flex overflow-hidden rounded-md border bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100",
          invalid ? "border-red-400" : "border-gray-300",
        )}
      >
        <span className="flex items-center gap-2 border-e border-gray-200 bg-gray-50 px-3 text-base font-medium text-gray-600">
          <span aria-hidden>🇹🇳</span> +216
        </span>
        <Localized
          as="input"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          placeholder="20 123 456"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          value={formatted}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 8))}
          className="min-w-0 flex-1 px-3 py-3 text-base tracking-wide text-gray-800 outline-none"
        />
      </span>
    </label>
  );
}

/** Six separate boxes for a one-time code, with paste and backspace support. */
export function OtpInput({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (code: string) => void;
  invalid?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");
  const set = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join("").slice(0, 6));
  };
  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft") refs.current[Math.max(0, i - 1)]?.focus();
    if (e.key === "ArrowRight") refs.current[Math.min(5, i + 1)]?.focus();
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    refs.current[Math.min(5, pasted.length)]?.focus();
  };
  return (
    <Localized as="div" role="group" aria-label="Verification code" dir="ltr" className="flex justify-between gap-2">
      {digits.map((d, i) => (
        <Localized
          as="input"
          key={i}
          ref={(el: HTMLInputElement | null) => {
            refs.current[i] = el;
          }}
          aria-label={`Digit ${i + 1}`}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d}
          onPaste={onPaste}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => onKey(i, e)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const v = e.target.value.replace(/\D/g, "").slice(-1);
            set(i, v);
            if (v && i < 5) refs.current[i + 1]?.focus();
          }}
          className={cn(
            "h-14 w-full max-w-14 rounded-lg border text-center font-display text-2xl font-bold text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
            invalid ? "border-red-400 bg-red-50" : d ? "border-brand bg-emerald-50/50" : "border-gray-300",
          )}
        />
      ))}
    </Localized>
  );
}

/** Simulated SMS shown on screen because no SMS gateway is connected in the prototype. */
export function SmsPreview({ phone, code }: { phone: string; code: string }) {
  return (
    <div className="animate-toast-in mt-5 flex gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
        SMS
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-gray-800">
          <T>Demo SMS to</T> <bdi dir="ltr">{phone}</bdi>
        </p>
        <p className="mt-1 text-gray-600">
          <T>Your Karrini code is</T>{" "}
          <bdi dir="ltr" className="font-mono text-base font-bold tracking-[0.2em] text-gray-900">
            {code}
          </bdi>
        </p>
        <p className="mt-1 text-xs text-gray-400">
          <T>No real SMS is sent in this prototype.</T>
        </p>
      </div>
    </div>
  );
}

export { fieldClass };
