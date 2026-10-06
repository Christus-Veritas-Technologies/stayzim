"use client";

import { Avatar } from "@stayzim/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@stayzim/ui/components/dropdown-menu";
import { Button } from "@stayzim/ui/components/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@stayzim/ui/components/dialog";
import { Field } from "@stayzim/ui/components/field";
import { Input } from "@stayzim/ui/components/input";
import { cn } from "@stayzim/ui/lib/utils";
import { KeyRound, LogOut, UserPen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export function useSignOut() {
  const router = useRouter();
  return async () => {
    await authClient.signOut();
    router.replace("/login");
  };
}

const NAME_LIMITS = { min: 2, max: 60 };

/** "Your name": the name StayZim greets the owner by and signs emails to. */
function NameDialog({ open, onOpenChange, name }: { open: boolean; onOpenChange: (open: boolean) => void; name: string }) {
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = value.trim().replace(/\s+/g, " ");
    if (next.length < NAME_LIMITS.min) {
      setError("Add your name");
      return;
    }
    if (next === name) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    const result = await authClient.updateUser({ name: next });
    setSaving(false);
    if (result.error) {
      setError("Your name didn't save. Try again.");
      return;
    }
    toast.success("Name saved");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Your name</DialogTitle>
            <DialogDescription>We greet you by it in the dashboard and in emails. Guests don&apos;t see it.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="Name" error={error ?? undefined}>
              <Input
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError(null);
                }}
                maxLength={NAME_LIMITS.max}
                autoComplete="name"
                autoFocus
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save name
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Name and email, Your name, Change password, Log out. Opens from the owner's avatar. */
export function AccountMenu({
  name,
  email,
  trigger,
  side = "bottom",
  align = "end",
}: {
  name: string;
  email: string;
  trigger?: ReactElement;
  side?: "top" | "bottom" | "right";
  align?: "start" | "end";
}) {
  const signOut = useSignOut();
  const [editing, setEditing] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          render={trigger}
          className={cn(!trigger && "rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/30")}
        >
          {trigger ? (trigger.props as { children?: ReactNode }).children : <Avatar name={name} />}
        </DropdownMenuTrigger>
        <DropdownMenuContent side={side} align={align} className="w-60">
          <DropdownMenuGroup>
            <div className="flex items-center gap-2.5 px-2.5 py-2">
              <Avatar name={name} size="sm" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13.5px] font-semibold text-ink">{name}</span>
                <span className="truncate text-xs text-muted">{email}</span>
              </span>
            </div>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <UserPen />
            Your name
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/set-password" />}>
            <KeyRound />
            Change password
          </DropdownMenuItem>
          <DropdownMenuItem onClick={signOut}>
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* A new key each time, so the field starts from the current name */}
      {editing ? <NameDialog key={name} open={editing} onOpenChange={setEditing} name={name} /> : null}
    </>
  );
}
