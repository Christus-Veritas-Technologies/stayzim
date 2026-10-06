"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { backdropClassName, popupClassName } from "@stayzim/ui/components/dialog";
import { cn } from "@stayzim/ui/lib/utils";
import * as React from "react";

/** A dialog that needs an answer, e.g. "Delete River Suite?". Escape and the backdrop don't dismiss it. */
function AlertDialog(props: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger(props: AlertDialogPrimitive.Trigger.Props) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogClose(props: AlertDialogPrimitive.Close.Props) {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-close" {...props} />;
}

function AlertDialogContent({ className, ...props }: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop className={backdropClassName} />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(popupClassName, "max-w-[400px] gap-4 p-5", className)}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

/** Round tinted icon above the title, e.g. a red bin for deletes. */
function AlertDialogIcon({
  tone = "danger",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: "danger" | "brand" }) {
  return (
    <span
      data-slot="alert-dialog-icon"
      aria-hidden="true"
      className={cn(
        "flex size-11 items-center justify-center rounded-full animate-in zoom-in-75 duration-300 [&_svg]:size-5",
        tone === "danger" ? "bg-danger-tint text-danger" : "bg-brand-wash text-brand",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("font-display text-lg leading-6 font-semibold tracking-[-0.01em] text-ink", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({ className, ...props }: AlertDialogPrimitive.Description.Props) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("-mt-2 text-[13.5px] leading-5 text-muted", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("mt-1 grid grid-cols-2 gap-2", className)}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogIcon,
  AlertDialogTitle,
  AlertDialogTrigger,
};
