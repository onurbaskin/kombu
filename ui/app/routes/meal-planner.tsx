import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Repeat2Icon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRevalidator, useSearchParams } from "react-router";
import { SourceNotice } from "~/components/source-notice";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  createMealPlan,
  deleteMealPlanOccurrence,
  deleteMealPlanSeries,
  getMealPlan,
  getRecipesPaginated,
  type MealPlanOccurrence,
  type Recipe,
} from "~/lib/api/resources";
import type { Route } from "./+types/meal-planner";

type PlannerView = "day" | "week" | "month";
type Slot = { date: string; time: string };

function dateKey(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(value: Date): Date {
  return addDays(value, value.getDay() === 0 ? -6 : 1 - value.getDay());
}

function getWindow(anchor: Date, view: PlannerView): [string, string] {
  if (view === "day") return [dateKey(anchor), dateKey(anchor)];
  if (view === "week") {
    const start = startOfWeek(anchor);
    return [dateKey(start), dateKey(addDays(start, 6))];
  }
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 12);
  return [dateKey(start), dateKey(end)];
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", options).format(parseDate(value));
}

function displayTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date(2020, 0, 1, hours, minutes);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function moveAnchor(value: string, view: PlannerView, direction: number) {
  const anchor = parseDate(value);
  if (view === "day") return dateKey(addDays(anchor, direction));
  if (view === "week") return dateKey(addDays(anchor, direction * 7));
  return dateKey(
    new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1, 12),
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  const view = (params.get("view") as PlannerView | null) ?? "week";
  const anchor = params.get("date") ?? dateKey(new Date());
  const [startDate, endDate] = getWindow(parseDate(anchor), view);
  const [meals, recipes] = await Promise.all([
    getMealPlan(startDate, endDate),
    getRecipesPaginated({ limit: 100, sort_by: "title", sort_order: "asc" }),
  ]);
  return { meals, recipes, startDate, endDate };
}

export function meta() {
  return [{ title: "Meal planner | Kombu" }];
}

export const handle = {
  topbar: function MealPlannerTopbar() {
    return (
      <Button
        size="sm"
        onClick={() =>
          window.dispatchEvent(new Event("kombu:meal-planner:add"))
        }
      >
        <PlusIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Add meal</span>
      </Button>
    );
  },
};

export default function MealPlanner({ loaderData }: Route.ComponentProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const revalidator = useRevalidator();
  const view = (searchParams.get("view") as PlannerView | null) ?? "week";
  const anchor = searchParams.get("date") ?? dateKey(new Date());
  const [composerOpen, setComposerOpen] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [event, setEvent] = useState<MealPlanOccurrence | null>(null);
  const [interval, setInterval] = useState("30");
  const recipes = loaderData.recipes.data?.items ?? [];
  const meals = loaderData.meals.data ?? [];

  useEffect(() => {
    const open = () => {
      setSlot({
        date: searchParams.get("date") ?? dateKey(new Date()),
        time: "18:00",
      });
      setComposerOpen(true);
    };
    window.addEventListener("kombu:meal-planner:add", open);
    return () => window.removeEventListener("kombu:meal-planner:add", open);
  }, [searchParams]);

  useEffect(() => {
    if (!searchParams.get("recipeId")) return;
    setSlot({ date: anchor, time: "18:00" });
    setComposerOpen(true);
  }, [anchor, searchParams]);

  function updatePlanner(next: { view?: PlannerView; date?: string }) {
    const nextParams = new URLSearchParams(searchParams);
    if (next.view) nextParams.set("view", next.view);
    if (next.date) nextParams.set("date", next.date);
    setSearchParams(nextParams);
  }

  function openSlot(nextSlot: Slot) {
    setSlot(nextSlot);
    setComposerOpen(true);
  }

  async function removeOccurrence() {
    if (!event) return;
    const result = await deleteMealPlanOccurrence(event.id);
    if (!result.error) {
      setEvent(null);
      revalidator.revalidate();
    }
  }

  async function removeSeries() {
    if (!event) return;
    const result = await deleteMealPlanSeries(event.series_id);
    if (!result.error) {
      setEvent(null);
      revalidator.revalidate();
    }
  }

  const heading =
    view === "day"
      ? formatDate(anchor, { weekday: "long", month: "long", day: "numeric" })
      : view === "week"
        ? `${formatDate(loaderData.startDate, { month: "short", day: "numeric" })} – ${formatDate(loaderData.endDate, { month: "short", day: "numeric", year: "numeric" })}`
        : formatDate(anchor, { month: "long", year: "numeric" });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <SourceNotice results={[loaderData.meals, loaderData.recipes]} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-muted-foreground text-sm">
            <CalendarDaysIcon aria-hidden="true" />
            Kitchen board
          </div>
          <h1 className="font-display font-semibold text-3xl tracking-tight">
            Meal planner
          </h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Place recipes on the calendar. The shopping view follows the meals
            you plan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              updatePlanner({ date: moveAnchor(anchor, view, -1) })
            }
            aria-label="Previous period"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            onClick={() => updatePlanner({ date: dateKey(new Date()) })}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => updatePlanner({ date: moveAnchor(anchor, view, 1) })}
            aria-label="Next period"
          >
            <ChevronRightIcon />
          </Button>
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(value) =>
              value && updatePlanner({ view: value as PlannerView })
            }
            variant="default"
            aria-label="Planner view"
          >
            <ToggleGroupItem value="day">Day</ToggleGroupItem>
            <ToggleGroupItem value="week">Week</ToggleGroupItem>
            <ToggleGroupItem value="month">Month</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{heading}</CardTitle>
              <CardDescription>
                {meals.length} scheduled meal{meals.length === 1 ? "" : "s"} in
                this view
              </CardDescription>
            </div>
            {view === "day" && (
              <ToggleGroup
                type="single"
                value={interval}
                onValueChange={(value) => value && setInterval(value)}
                variant="default"
                aria-label="Day interval"
              >
                <ToggleGroupItem value="15">15 min</ToggleGroupItem>
                <ToggleGroupItem value="30">30 min</ToggleGroupItem>
                <ToggleGroupItem value="60">60 min</ToggleGroupItem>
              </ToggleGroup>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {view === "day" && (
            <DayView
              date={anchor}
              interval={Number(interval)}
              meals={meals}
              onSlot={openSlot}
              onEvent={setEvent}
            />
          )}
          {view === "week" && (
            <WeekView
              startDate={loaderData.startDate}
              meals={meals}
              onSlot={openSlot}
              onEvent={setEvent}
            />
          )}
          {view === "month" && (
            <MonthView
              startDate={loaderData.startDate}
              endDate={loaderData.endDate}
              meals={meals}
              onSlot={openSlot}
              onEvent={setEvent}
            />
          )}
        </CardContent>
      </Card>

      <AddMealDialog
        open={composerOpen}
        onOpenChange={(open) => {
          setComposerOpen(open);
          if (!open && searchParams.get("recipeId")) {
            const next = new URLSearchParams(searchParams);
            next.delete("recipeId");
            setSearchParams(next, { replace: true });
          }
        }}
        initialSlot={slot}
        initialRecipeId={Number(searchParams.get("recipeId")) || undefined}
        recipes={recipes}
        onCreated={() => revalidator.revalidate()}
      />
      <MealEventDialog
        event={event}
        onOpenChange={(open) => !open && setEvent(null)}
        onRemoveOccurrence={() => void removeOccurrence()}
        onRemoveSeries={() => void removeSeries()}
      />
    </div>
  );
}

function EventPill({
  meal,
  onClick,
}: {
  meal: MealPlanOccurrence;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="flex w-full flex-col gap-0.5 rounded-md border border-primary/20 bg-primary/10 px-2 py-1.5 text-left text-xs transition-colors hover:bg-primary/20"
    >
      <span className="font-medium leading-tight">{meal.recipe_title}</span>
      <span className="text-muted-foreground">
        {displayTime(meal.start_time)} · {meal.duration_minutes}m
      </span>
      {meal.repeat_frequency !== "once" && (
        <Badge variant="outline" className="mt-0.5 w-fit px-1 py-0 text-[10px]">
          <Repeat2Icon /> {meal.repeat_frequency}
        </Badge>
      )}
    </button>
  );
}

function DayView({
  date,
  interval,
  meals,
  onSlot,
  onEvent,
}: {
  date: string;
  interval: number;
  meals: MealPlanOccurrence[];
  onSlot: (slot: Slot) => void;
  onEvent: (meal: MealPlanOccurrence) => void;
}) {
  const slots: string[] = [];
  for (let minutes = 6 * 60; minutes < 24 * 60; minutes += interval) {
    slots.push(
      `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
    );
  }
  return (
    <div className="max-h-[min(70vh,760px)] overflow-y-auto">
      {slots.map((time) => (
        <button
          key={time}
          type="button"
          onClick={() => onSlot({ date, time })}
          className="grid min-h-12 w-full grid-cols-[4.5rem_1fr] border-b text-left last:border-b-0 hover:bg-muted/30"
        >
          <span className="border-r px-3 py-3 text-muted-foreground text-xs tabular-nums">
            {displayTime(time)}
          </span>
          <span className="flex flex-col gap-1 p-1">
            {meals
              .filter(
                (meal) =>
                  meal.occurrence_date === date && meal.start_time === time,
              )
              .map((meal) => (
                <EventPill
                  key={meal.id}
                  meal={meal}
                  onClick={() => onEvent(meal)}
                />
              ))}
          </span>
        </button>
      ))}
    </div>
  );
}

function WeekView({
  startDate,
  meals,
  onSlot,
  onEvent,
}: {
  startDate: string;
  meals: MealPlanOccurrence[];
  onSlot: (slot: Slot) => void;
  onEvent: (meal: MealPlanOccurrence) => void;
}) {
  const days = Array.from({ length: 7 }, (_, index) =>
    dateKey(addDays(parseDate(startDate), index)),
  );
  return (
    <div className="grid min-w-[760px] grid-cols-7 divide-x overflow-x-auto">
      {days.map((day) => (
        <div key={day} className="min-h-[540px] bg-background">
          <button
            type="button"
            onClick={() => onSlot({ date: day, time: "18:00" })}
            className="flex w-full flex-col gap-0.5 border-b px-2 py-3 text-left hover:bg-muted/40"
          >
            <span className="text-muted-foreground text-xs uppercase">
              {formatDate(day, { weekday: "short" })}
            </span>
            <span className="font-semibold text-lg">
              {formatDate(day, { day: "numeric" })}
            </span>
          </button>
          <div className="flex flex-col gap-2 p-2">
            {meals
              .filter((meal) => meal.occurrence_date === day)
              .map((meal) => (
                <EventPill
                  key={meal.id}
                  meal={meal}
                  onClick={() => onEvent(meal)}
                />
              ))}
            <button
              type="button"
              onClick={() => onSlot({ date: day, time: "18:00" })}
              className="rounded-md border border-dashed px-2 py-5 text-muted-foreground text-xs hover:border-primary hover:text-foreground"
            >
              + schedule meal
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthView({
  startDate,
  endDate,
  meals,
  onSlot,
  onEvent,
}: {
  startDate: string;
  endDate: string;
  meals: MealPlanOccurrence[];
  onSlot: (slot: Slot) => void;
  onEvent: (meal: MealPlanOccurrence) => void;
}) {
  const start = startOfWeek(parseDate(startDate));
  const end = addDays(parseDate(endDate), 6 - parseDate(endDate).getDay());
  const days: string[] = [];
  for (let current = start; current <= end; current = addDays(current, 1))
    days.push(dateKey(current));
  return (
    <div className="min-w-[760px] overflow-x-auto">
      <div className="grid grid-cols-7 border-b text-muted-foreground text-xs uppercase">
        {Array.from({ length: 7 }, (_, index) => {
          const day = dateKey(addDays(start, index));
          return (
            <span key={day} className="px-3 py-2">
              {formatDate(day, { weekday: "short" })}
            </span>
          );
        })}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y">
        {days.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => onSlot({ date: day, time: "18:00" })}
            className="flex min-h-32 flex-col gap-1 p-2 text-left align-top hover:bg-muted/30"
          >
            <span className="font-medium text-sm">
              {formatDate(day, { day: "numeric" })}
            </span>
            {meals
              .filter((meal) => meal.occurrence_date === day)
              .map((meal) => (
                <EventPill
                  key={meal.id}
                  meal={meal}
                  onClick={() => onEvent(meal)}
                />
              ))}
          </button>
        ))}
      </div>
    </div>
  );
}

function AddMealDialog({
  open,
  onOpenChange,
  initialSlot,
  initialRecipeId,
  recipes,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSlot: Slot | null;
  initialRecipeId?: number;
  recipes: Recipe[];
  onCreated: () => void;
}) {
  const [search, setSearch] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [date, setDate] = useState(initialSlot?.date ?? dateKey(new Date()));
  const [time, setTime] = useState(initialSlot?.time ?? "18:00");
  const [duration, setDuration] = useState("30");
  const [repeat, setRepeat] = useState("once");
  const [count, setCount] = useState("4");
  const [until, setUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const filteredRecipes = useMemo(
    () =>
      recipes.filter((recipe) =>
        recipe.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [recipes, search],
  );

  useEffect(() => {
    if (!open) return;
    setRecipeId(initialRecipeId ? String(initialRecipeId) : "");
    setDate(initialSlot?.date ?? dateKey(new Date()));
    setTime(initialSlot?.time ?? "18:00");
  }, [initialRecipeId, initialSlot, open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recipeId) {
      setError("Choose a recipe first.");
      return;
    }
    const result = await createMealPlan({
      recipe_id: Number(recipeId),
      start_date: date,
      start_time: time,
      duration_minutes: Number(duration),
      repeat_frequency: repeat as "once" | "daily" | "weekly" | "monthly",
      repeat_interval: 1,
      repeat_count: repeat === "once" ? null : Number(count) || null,
      repeat_until: repeat === "once" ? null : until || null,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>Schedule a recipe</DialogTitle>
            <DialogDescription>
              Choose when to cook it, then decide whether it repeats.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field data-invalid={Boolean(error)}>
              <FieldLabel>Recipe</FieldLabel>
              <div className="relative">
                <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search recipes…"
                  className="pl-9"
                />
              </div>
              <Select value={recipeId} onValueChange={setRecipeId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a recipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {filteredRecipes.slice(0, 30).map((recipe) => (
                      <SelectItem key={recipe.id} value={String(recipe.id)}>
                        {recipe.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {error && <p className="text-destructive text-sm">{error}</p>}
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="meal-date">Date</FieldLabel>
                <Input
                  id="meal-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="meal-time">Start time</FieldLabel>
                <Input
                  id="meal-time"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="meal-duration">Duration</FieldLabel>
                <Input
                  id="meal-duration"
                  type="number"
                  min={15}
                  step={15}
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Repeat</FieldLabel>
              <Select value={repeat} onValueChange={setRepeat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="daily">Every day</SelectItem>
                    <SelectItem value="weekly">Every week</SelectItem>
                    <SelectItem value="monthly">Every month</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Recurring meals create removable occurrences, like a recurring
                meeting.
              </FieldDescription>
            </Field>
            {repeat !== "once" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="meal-repeat-count">
                    Number of occurrences
                  </FieldLabel>
                  <Input
                    id="meal-repeat-count"
                    type="number"
                    min={1}
                    max={366}
                    value={count}
                    onChange={(event) => setCount(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="meal-repeat-until">
                    Or repeat until
                  </FieldLabel>
                  <Input
                    id="meal-repeat-until"
                    type="date"
                    value={until}
                    onChange={(event) => setUntil(event.target.value)}
                  />
                </Field>
              </div>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              <CalendarDaysIcon data-icon="inline-start" />
              Schedule meal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MealEventDialog({
  event,
  onOpenChange,
  onRemoveOccurrence,
  onRemoveSeries,
}: {
  event: MealPlanOccurrence | null;
  onOpenChange: (open: boolean) => void;
  onRemoveOccurrence: () => void;
  onRemoveSeries: () => void;
}) {
  return (
    <Dialog open={event !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event?.recipe_title}</DialogTitle>
          <DialogDescription>
            {event &&
              `${formatDate(event.occurrence_date, { weekday: "long", month: "long", day: "numeric" })} at ${displayTime(event.start_time)} · ${event.duration_minutes} minutes`}
          </DialogDescription>
        </DialogHeader>
        {event?.repeat_frequency !== "once" && (
          <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-muted-foreground text-sm">
            <Repeat2Icon />
            This meal repeats {event?.repeat_frequency}.
          </div>
        )}
        <DialogFooter className="flex-col sm:flex-row">
          <Button variant="outline" onClick={onRemoveOccurrence}>
            <Trash2Icon data-icon="inline-start" />
            Remove this occurrence
          </Button>
          <Button variant="destructive" onClick={onRemoveSeries}>
            <Trash2Icon data-icon="inline-start" />
            Remove entire series
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
