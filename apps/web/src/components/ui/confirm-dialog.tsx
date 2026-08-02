"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "destructive" | "default";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  onConfirm,
  variant = "default",
}: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-popover" />
        <DialogPrimitive.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface-card rounded-2xl shadow-floating border border-surface-border/30 p-6 z-popover"
          aria-describedby="confirm-dialog-desc"
        >
          <DialogPrimitive.Title className="text-lg font-semibold text-gray-100 mb-2">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            id="confirm-dialog-desc"
            className="text-sm text-gray-400 mb-6"
          >
            {description}
          </DialogPrimitive.Description>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button
              variant={variant === "destructive" ? "destructive" : "default"}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
