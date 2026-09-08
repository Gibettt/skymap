import {
  Banknote,
  Building2,
  ChevronRight,
  Droplet,
  History,
  Lightbulb,
  MoreHorizontal,
  Package,
  QrCode,
  ReceiptText,
  SendHorizontal,
  Settings,
  Smartphone,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";

export interface QuickActionContact {
  id: string | number;
  initials: string;
}

const contacts: QuickActionContact[] = [
  { id: 1, initials: "AR" },
  { id: 2, initials: "SC" },
  { id: 3, initials: "MJ" },
  { id: 4, initials: "ED" },
];

const shortcuts = [
  { id: 1, label: "Scan QR", icon: QrCode },
  { id: 2, label: "Transfer", icon: SendHorizontal },
  { id: 3, label: "Pay Bills", icon: Banknote },
  { id: 4, label: "History", icon: History },
  { id: 5, label: "Mobile", icon: Smartphone },
  { id: 6, label: "Electricity", icon: Lightbulb },
  { id: 7, label: "Water", icon: Droplet },
  { id: 8, label: "More", icon: MoreHorizontal },
];

const adminShortcuts = [
  { id: 1, label: "Bookings", icon: ReceiptText, href: "/dashboard/admin/bookings" },
  { id: 2, label: "Payouts", icon: SendHorizontal, href: "/dashboard/admin/finance" },
  { id: 3, label: "Resorts", icon: Building2, href: "/dashboard/admin/resorts" },
  { id: 4, label: "Users", icon: Users, href: "/dashboard/admin/users" },
  { id: 5, label: "Packages", icon: Package, href: "/dashboard/admin/packages" },
  { id: 6, label: "Logs", icon: History, href: "/dashboard/admin/logs" },
  { id: 7, label: "Settings", icon: Settings, href: "/dashboard/admin/pengaturan" },
  { id: 8, label: "More", icon: MoreHorizontal, href: "/dashboard/admin" },
];

export function QuickActions({
  contactItems = contacts,
  adminMode = false,
  amount = "",
}: {
  contactItems?: QuickActionContact[];
  adminMode?: boolean;
  amount?: string;
}) {
  const displayedShortcuts = adminMode ? adminShortcuts : shortcuts;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-normal">{adminMode ? "Payout Queue" : "Quick Transfer"}</CardTitle>
          <CardAction>
            <div className="flex items-center gap-1">
              <div className="flex -space-x-2">
                {contactItems.map((contact) => (
                  <Avatar key={contact.id} className="size-7 border-2 border-background">
                    <AvatarFallback className="text-[10px]">{contact.initials}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <ChevronRight className="size-4" />
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Field orientation="horizontal">
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>$</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput placeholder="0.00" readOnly={adminMode} value={adminMode ? amount : undefined} />
              <InputGroupAddon align="inline-end">
                <InputGroupText>USD</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            {adminMode ? (
              <Button asChild>
                <Link href="#payouts">Review</Link>
              </Button>
            ) : (
              <Button>Send</Button>
            )}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-normal">Shortcuts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {displayedShortcuts.map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <div key={shortcut.id} className="flex flex-col items-center gap-2.5">
                  {"href" in shortcut ? (
                    <Button variant="outline" className="size-12 rounded-full" asChild>
                      <Link href={String(shortcut.href)} aria-label={shortcut.label}>
                        <Icon className="size-5" />
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" className="size-12 rounded-full">
                      <Icon className="size-5" />
                    </Button>
                  )}
                  <span className="text-center text-muted-foreground text-xs">{shortcut.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
