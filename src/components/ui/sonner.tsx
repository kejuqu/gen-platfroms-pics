"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster({ theme = "dark", ...props }: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      richColors
      closeButton
      theme={theme}
      {...props}
    />
  );
}
