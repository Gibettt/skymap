"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV_ICONS } from "@/navigation/sidebar/nav-icons";
import type { NavGroup, NavIconName } from "@/navigation/sidebar/sidebar-items";

type SearchItem = {
  id: string;
  group: string;
  label: string;
  url: string;
  icon?: NavIconName;
  disabled?: boolean;
  newTab?: boolean;
};

function flattenNavigation(items: readonly NavGroup[]): SearchItem[] {
  const groupLabels = new Set(items.flatMap((group) => (group.label ? [group.label] : [])));

  return items.flatMap((group) =>
    group.items.flatMap((item) => {
      if (item.subItems) {
        const itemGroup = groupLabels.has(item.title) ? (group.label ?? "Other") : item.title;
        return item.subItems.map((subItem) => ({
          id: subItem.id,
          group: itemGroup,
          label: subItem.title,
          url: subItem.url,
          icon: subItem.icon ?? item.icon,
          disabled: subItem.disabled,
          newTab: subItem.newTab,
        }));
      }

      return [
        {
          id: item.id,
          group: group.label ?? "Other",
          label: item.title,
          url: item.url,
          icon: item.icon,
          disabled: item.disabled,
          newTab: item.newTab,
        },
      ];
    }),
  );
}

function getAvailableItems(items: readonly SearchItem[]) {
  return items.filter((item) => !item.disabled && !item.url.includes("coming-soon"));
}

function groupBy(items: readonly SearchItem[]) {
  const groups = [...new Set(items.map((item) => item.group))];
  return groups.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  }));
}

export function SearchDialog({ items }: { items: readonly NavGroup[] }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const router = useRouter();
  const searchItems = React.useMemo(() => flattenNavigation(items), [items]);
  const recommendations = React.useMemo(() => getAvailableItems(searchItems), [searchItems]);

  React.useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "j" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) setQuery("");
  };

  const handleSelect = (item: SearchItem) => {
    if (item.disabled) return;
    handleOpenChange(false);
    if (item.newTab) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(item.url);
  };

  const renderGroups = (availableItems: readonly SearchItem[]) =>
    groupBy(availableItems).map(({ group, items: groupItems }, index) => (
      <React.Fragment key={group}>
        {index > 0 ? <CommandSeparator /> : null}
        <CommandGroup heading={group}>
          {groupItems.map((item) => {
            const Icon = item.icon ? NAV_ICONS[item.icon] : undefined;
            return (
              <CommandItem
                disabled={item.disabled}
                key={`${group}-${item.id}`}
                value={`${item.group} ${item.label}`}
                onSelect={() => handleSelect(item)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {Icon ? <Icon /> : null}
                  <span className="truncate">{item.label}</span>
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </React.Fragment>
    ));

  return (
    <>
      <Button
        onClick={() => handleOpenChange(true)}
        variant="link"
        className="w-8 px-0! font-normal text-muted-foreground hover:no-underline sm:w-auto"
        aria-label="Search staff tools"
      >
        <Search data-icon="inline-start" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium text-[10px] sm:inline-flex">
          <span className="text-xs">⌘</span>J
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <Command>
          <CommandInput placeholder="Search staff tools…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {query ? renderGroups(searchItems) : renderGroups(recommendations)}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
