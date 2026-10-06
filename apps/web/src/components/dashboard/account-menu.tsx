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
import { cn } from "@stayzim/ui/lib/utils";
import { KeyRound, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";

import { authClient } from "@/lib/auth-client";

export function useSignOut() {
  const router = useRouter();
  return async () => {
    await authClient.signOut();
    router.replace("/login");
  };
}

/** Name and email, Change password, Log out. Opens from the owner's avatar. */
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        render={trigger}
        className={cn(!trigger && "rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/30")}
      >
        {trigger ? undefined : <Avatar name={name} />}
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
  );
}
