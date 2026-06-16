import * as React from "react";
import { cn } from "@/lib/utils";

export interface AutoTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
}

/**
 * Textarea that auto-grows with its content so all text stays visible
 * without an inner scrollbar. Use anywhere you'd normally use <Input>
 * or <Textarea> but want a fluid height.
 */
const AutoTextarea = React.forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  ({ className, minRows = 1, value, onChange, style, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setRefs = (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
    };

    const resize = React.useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, []);

    React.useLayoutEffect(() => {
      resize();
    }, [value, resize]);

    React.useEffect(() => {
      const onWinResize = () => resize();
      window.addEventListener("resize", onWinResize);
      return () => window.removeEventListener("resize", onWinResize);
    }, [resize]);

    return (
      <textarea
        ref={setRefs}
        rows={minRows}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          resize();
        }}
        style={{ resize: "none", overflow: "hidden", ...style }}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
AutoTextarea.displayName = "AutoTextarea";

export { AutoTextarea };
