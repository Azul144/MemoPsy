import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, required, placeholder, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-tenue dark:placeholder:text-tenue selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border border-transparent flex h-9 w-full min-w-0 rounded-md bg-transparent px-3 py-1 text-base shadow-xs transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus:border-dorado focus-visible:border-dorado",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      required={required}
      placeholder={placeholder}
      //className="w-full mt-1 px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black transition"
      style={{ backgroundColor: "var(--superficie)", color: "var(--foreground)" }}
      {...props}
    />
  )
}

export { Input }
