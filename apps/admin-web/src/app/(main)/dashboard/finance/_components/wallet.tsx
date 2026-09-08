import { Banknote, Building2 } from "lucide-react";
import { siBarclays, siBitcoin, siEthereum, siHsbc, siRevolut, type SimpleIcon as SimpleIconType } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface WalletItem {
  id: string | number;
  label: string;
  description: string;
}

type WalletDisplayItem = WalletItem & { icon?: SimpleIconType };

const defaultPrimaryItems: WalletDisplayItem[] = [
  {
    id: 1,
    label: "Revolut Premium · **** 4182",
    description: "$12,450.60",
    icon: siRevolut,
  },
  {
    id: 2,
    label: "HSBC Bank · **** 1004",
    description: "$3,200.11",
    icon: siHsbc,
  },
  {
    id: 4,
    label: "Barclays Bank · **** 9912",
    description: "$1,450.00",
    icon: siBarclays,
  },
];

const defaultSecondaryItems: WalletDisplayItem[] = [
  {
    id: 1,
    label: "Bitcoin · Binance",
    description: "0.42 BTC · $24,150.00",
    icon: siBitcoin,
  },
  {
    id: 2,
    label: "Ethereum · MetaMask",
    description: "4.85 ETH · $12,420.10",
    icon: siEthereum,
  },
];

export function Wallet({
  primaryItems = defaultPrimaryItems,
  secondaryItems = defaultSecondaryItems,
  footerLabel = "Physical Vault:",
  footerValue = "Ledger Nano X",
  statusLabel = "Air-Gapped",
  title = "Wallet",
}: {
  primaryItems?: WalletDisplayItem[];
  secondaryItems?: WalletDisplayItem[];
  footerLabel?: string;
  footerValue?: string;
  statusLabel?: string;
  title?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          {primaryItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm leading-none">{item.label}</span>
                </div>
                <span className="font-normal text-muted-foreground text-xs">{item.description}</span>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
                {item.icon ? <SimpleIcon icon={item.icon} /> : <Building2 className="size-5" />}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex flex-col gap-4">
          {secondaryItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm leading-none">{item.label}</span>
                </div>
                <span className="font-normal text-muted-foreground text-xs">{item.description}</span>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
                {item.icon ? <SimpleIcon icon={item.icon} /> : <Banknote className="size-5" />}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-[10px] text-muted-foreground">
              {footerLabel} <span className="text-foreground">{footerValue}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-1 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="font-bold text-[9px] text-green-500 uppercase tracking-widest">{statusLabel}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
