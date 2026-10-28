"use client";

import * as React from "react";

import { CalendarDays, ExternalLink, Moon, Orbit, Sparkles } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type GuideEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  description: string;
  sourceName: string;
  sourceUrl: string | null;
};

type Guide = {
  resort: { id: string; name: string; timezone: string; locationEstimated: boolean };
  window: { from: string; to: string; months: number };
  moon: { phaseName: string; illuminationPercent: number; nextNewMoon: string | null; nextFullMoon: string | null };
  moonPhases: GuideEvent[];
  meteorShowers: GuideEvent[];
  astronomicalEvents: GuideEvent[];
};

const SECTIONS = [
  { key: "moonPhases", label: "Moon phases", icon: Moon, empty: "No moon phases in this period." },
  { key: "meteorShowers", label: "Meteor showers", icon: Sparkles, empty: "No meteor shower peaks in this period." },
  { key: "astronomicalEvents", label: "Astronomical events", icon: Orbit, empty: "No major astronomical events in this period." },
] as const;

// Calculated titles may start with an emoji; the guide uses its own icons instead.
const cleanTitle = (title: string) => title.replace(/^\p{Extended_Pictographic}️?\s*/u, "");

function formatter(timeZone: string, withTime: boolean) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function GuideList({ events, timeZone, empty }: { events: GuideEvent[]; timeZone: string; empty: string }) {
  if (!events.length) {
    return (
      <Empty className="min-h-48">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDays />
          </EmptyMedia>
          <EmptyTitle>Nothing scheduled</EmptyTitle>
          <EmptyDescription>{empty}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  const dateTime = formatter(timeZone, true);
  return (
    <ul className="divide-y">
      {events.map((event) => (
        <li key={event.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[13rem_1fr] sm:gap-4">
          <time dateTime={event.startsAt} className="font-medium text-sm tabular-nums">
            {dateTime.format(new Date(event.startsAt))}
          </time>
          <div className="min-w-0">
            <p className="font-medium">{cleanTitle(event.title)}</p>
            {event.description ? <p className="mt-0.5 text-muted-foreground text-sm">{event.description}</p> : null}
            {event.sourceName ? (
              <p className="mt-1 text-muted-foreground text-xs">
                {event.sourceUrl ? (
                  <a
                    className="inline-flex items-center gap-1 underline underline-offset-4"
                    href={event.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {event.sourceName}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ) : (
                  event.sourceName
                )}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Calculated astronomy for a resort: tonight's moon, moon phases, meteor showers and sky events. */
export function SkyGuide({ resorts }: { resorts?: { id: string; name: string }[] }) {
  const [months, setMonths] = React.useState("3");
  const [resortId, setResortId] = React.useState(resorts?.[0]?.id ?? "");
  const [guide, setGuide] = React.useState<Guide | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ months });
      if (resortId) params.set("resortId", resortId);
      const response = await fetch(`/api/sky-guide?${params}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "The Sky Guide could not be loaded.");
      setGuide(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The Sky Guide could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [months, resortId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const date = guide ? formatter(guide.resort.timezone, false) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">Sky Guide</h1>
          <p className="text-muted-foreground text-sm">
            Moon phases, meteor showers and astronomical events above {guide?.resort.name ?? "the resort"}, calculated
            for its location.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {resorts && resorts.length > 1 ? (
            <Select value={resortId} onValueChange={(value) => value && setResortId(value)}>
              <SelectTrigger className="w-full sm:w-56" aria-label="Resort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {resorts.map((resort) => (
                    <SelectItem key={resort.id} value={resort.id}>
                      {resort.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : null}
          <Select value={months} onValueChange={(value) => value && setMonths(value)}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="1">Next month</SelectItem>
                <SelectItem value="3">Next 3 months</SelectItem>
                <SelectItem value="6">Next 6 months</SelectItem>
                <SelectItem value="12">Next 12 months</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {error}
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {loading && !guide ? (
        <div className="grid gap-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : null}

      {guide && date ? (
        <>
          <Card>
            <CardHeader>
              <CardDescription>Moon tonight</CardDescription>
              <CardTitle className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-2xl">
                {guide.moon.phaseName}
                <span className="font-normal text-base text-muted-foreground">
                  {guide.moon.illuminationPercent}% illuminated
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Next full moon </span>
                {guide.moon.nextFullMoon ? date.format(new Date(guide.moon.nextFullMoon)) : "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Next new moon </span>
                {guide.moon.nextNewMoon ? date.format(new Date(guide.moon.nextNewMoon)) : "—"}
              </p>
              <p className="text-muted-foreground">New moon nights are darkest — best for the Milky Way and deep sky.</p>
            </CardContent>
          </Card>

          {guide.resort.locationEstimated ? (
            <Alert>
              <AlertDescription>
                This resort has no coordinates yet, so times are calculated for central Maldives. Add its latitude and
                longitude in the resort settings for exact times.
              </AlertDescription>
            </Alert>
          ) : null}

          <Card className="gap-0 pb-0">
            <Tabs defaultValue="moonPhases" className="gap-0">
              <CardHeader className="border-b pb-4">
                <TabsList className="flex h-auto w-full flex-wrap justify-start sm:w-fit">
                  {SECTIONS.map((section) => (
                    <TabsTrigger key={section.key} value={section.key}>
                      <section.icon aria-hidden="true" />
                      {section.label}
                      <Badge variant="secondary" className="ml-1">
                        {guide[section.key].length}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
                <CardDescription className="pt-2">
                  {date.format(new Date(`${guide.window.from}T12:00:00Z`))} –{" "}
                  {date.format(new Date(`${guide.window.to}T12:00:00Z`))} · times in {guide.resort.timezone}
                </CardDescription>
              </CardHeader>
              {SECTIONS.map((section) => (
                <TabsContent key={section.key} value={section.key}>
                  <GuideList events={guide[section.key]} timeZone={guide.resort.timezone} empty={section.empty} />
                </TabsContent>
              ))}
            </Tabs>
          </Card>
        </>
      ) : null}
    </div>
  );
}
