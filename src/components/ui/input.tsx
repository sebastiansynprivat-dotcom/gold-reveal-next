import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  /** Force native <input> (e.g. when a feature is unsupported by contenteditable) */
  nativeInput?: boolean;
}

// Types that MUST stay native (passwords, numeric keyboards, special pickers, autofill-critical)
const NATIVE_TYPES = new Set([
  "password",
  "number",
  "email",
  "tel",
  "url",
  "search",
  "date",
  "datetime-local",
  "time",
  "month",
  "week",
  "file",
  "color",
  "range",
  "checkbox",
  "radio",
  "hidden",
  "submit",
  "reset",
  "button",
  "image",
]);

const baseClasses =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, nativeInput, value, defaultValue, onChange, onInput, placeholder, disabled, readOnly, ...props }, ref) => {
    const useNative = nativeInput || (type && NATIVE_TYPES.has(type));

    if (useNative) {
      return (
        <input
          type={type}
          className={cn(baseClasses, className)}
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onInput={onInput}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          {...props}
        />
      );
    }

    // contenteditable wrapper to suppress iOS form-assistant bar
    const divRef = React.useRef<HTMLDivElement | null>(null);

    // Bridge ref so callers using HTMLInputElement-style refs still get a focusable element.
    React.useImperativeHandle(
      ref as React.Ref<any>,
      () => {
        const el = divRef.current as any;
        if (!el) return null;
        return new Proxy(el, {
          get(target, prop) {
            if (prop === "value") return target.textContent ?? "";
            if (prop === "focus") return target.focus.bind(target);
            if (prop === "blur") return target.blur.bind(target);
            const v = (target as any)[prop];
            return typeof v === "function" ? v.bind(target) : v;
          },
          set(target, prop, val) {
            if (prop === "value") {
              target.textContent = val ?? "";
              return true;
            }
            (target as any)[prop] = val;
            return true;
          },
        });
      },
      [],
    );

    // Sync external value -> DOM only when different (avoids caret jump)
    React.useEffect(() => {
      if (value === undefined) return;
      const el = divRef.current;
      if (!el) return;
      const str = value == null ? "" : String(value);
      if (el.textContent !== str) el.textContent = str;
    }, [value]);

    // Set initial defaultValue once
    React.useEffect(() => {
      if (value !== undefined) return;
      if (defaultValue === undefined) return;
      const el = divRef.current;
      if (el && el.textContent === "") el.textContent = String(defaultValue);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fireChange = (el: HTMLDivElement) => {
      const text = el.textContent ?? "";
      const synthetic = {
        target: Object.assign(el, { value: text, name: (props as any).name }),
        currentTarget: el,
        preventDefault: () => {},
        stopPropagation: () => {},
        nativeEvent: new Event("input"),
        bubbles: true,
        cancelable: true,
        type: "change",
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      onChange?.(synthetic);
      onInput?.(synthetic as any);
    };

    return (
      <div
        ref={divRef}
        role="textbox"
        aria-multiline="false"
        aria-disabled={disabled || undefined}
        aria-readonly={readOnly || undefined}
        contentEditable={!disabled && !readOnly}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        spellCheck={(props as any).spellCheck}
        inputMode={(props as any).inputMode ?? "text"}
        onInput={(e) => fireChange(e.currentTarget)}
        onBlur={(e) => {
          (props as any).onBlur?.(e);
        }}
        onKeyDown={(e) => {
          // single-line behavior: block Enter from inserting newline
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLDivElement).blur();
          }
          (props as any).onKeyDown?.(e);
        }}
        onPaste={(e) => {
          // Force plaintext paste
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        className={cn(
          baseClasses,
          "whitespace-nowrap overflow-hidden text-ellipsis cursor-text",
          "before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
          className,
        )}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
