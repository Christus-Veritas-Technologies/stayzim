"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@stayzim/ui/lib/utils";
import { XIcon } from "lucide-react";
import * as React from "react";

/** Shared by dialogs, alert dialogs and sheets: a dimmed, slightly blurred page behind. */
const backdropClassName =
  "fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none";

/** Centred card that scales up from 96% as it fades in. */
const popupClassName =
  "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-[20px] bg-popover text-popover-foreground shadow-pop outline-none transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0 motion-reduce:transition-none";

function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/** Round close button for the top-right corner of dialogs and sheets. */
function CloseButton({ className, ...props }: DialogPrimitive.Close.Props) {
  return (
    <DialogPrimitive.Close
      aria-label="Close"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-input bg-white text-muted-2 shadow-xs transition-colors outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/30",
        className,
      )}
      {...props}
    >
      <XIcon className="size-4" />
    </DialogPrimitive.Close>
  );
}

function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: DialogPrimitive.Popup.Props & { showClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className={backdropClassName} />
      <DialogPrimitive.Popup data-slot="dialog-content" className={cn(popupClassName, className)} {...props}>
        {children}
        {showClose ? <CloseButton className="absolute top-4 right-4" /> : null}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-1 px-5 pt-5 pr-14", className)} {...props} />;
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-body" className={cn("px-5 py-4", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 px-5 pt-1 pb-5 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-display text-lg leading-6 font-semibold tracking-[-0.01em] text-ink", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-[13.5px] leading-5 text-muted", className)}
      {...props}
    />
  );
}

export {
  backdropClassName,
  CloseButton,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  popupClassName,
};
