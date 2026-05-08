import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Force native <textarea> if needed */
  nativeInput?: boolean;
}

const baseClasses =
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, nativeInput, value, defaultValue, onChange, onInput, placeholder, disabled, readOnly, ...props }, ref) => {
    if (nativeInput) {
      return (
        <textarea
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

    const divRef = React.useRef<HTMLDivElement | null>(null);

    React.useImperativeHandle(
      ref as React.Ref<any>,
      () => {
        const el = divRef.current as any;
        if (!el) return null;
        return new Proxy(el, {
          get(target, prop) {
            if (prop === "value") return target.innerText ?? "";
            if (prop === "focus") return target.focus.bind(target);
            if (prop === "blur") return target.blur.bind(target);
            const v = (target as any)[prop];
            return typeof v === "function" ? v.bind(target) : v;
          },
          set(target, prop, val) {
            if (prop === "value") {
              target.innerText = val ?? "";
              return true;
            }
            (target as any)[prop] = val;
            return true;
          },
        });
      },
      [],
    );

    React.useEffect(() => {
      if (value === undefined) return;
      const el = divRef.current;
      if (!el) return;
      const str = value == null ? "" : String(value);
      if (el.innerText !== str) el.innerText = str;
    }, [value]);

    React.useEffect(() => {
      if (value !== undefined) return;
      if (defaultValue === undefined) return;
      const el = divRef.current;
      if (el && el.innerText === "") el.innerText = String(defaultValue);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fireChange = (el: HTMLDivElement) => {
      const text = el.innerText ?? "";
      const synthetic = {
        target: Object.assign(el, { value: text, name: (props as any).name }),
        currentTarget: el,
        preventDefault: () => {},
        stopPropagation: () => {},
        nativeEvent: new Event("input"),
        bubbles: true,
        cancelable: true,
        type: "change",
      } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
      onChange?.(synthetic);
      onInput?.(synthetic as any);
    };

    return (
      <div
        ref={divRef}
        role="textbox"
        aria-multiline="true"
        aria-disabled={disabled || undefined}
        aria-readonly={readOnly || undefined}
        contentEditable={!disabled && !readOnly}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        spellCheck={(props as any).spellCheck}
        inputMode={(props as any).inputMode ?? "text"}
        onInput={(e) => fireChange(e.currentTarget)}
        onBlur={(e) => (props as any).onBlur?.(e)}
        onKeyDown={(e) => (props as any).onKeyDown?.(e)}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        className={cn(
          baseClasses,
          "whitespace-pre-wrap break-words overflow-y-auto cursor-text",
          "before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
          className,
        )}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
