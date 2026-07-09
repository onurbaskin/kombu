import {
  CheckIcon,
  Loader2Icon,
  PlusIcon,
  WandSparklesIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MetricCard } from "~/components/metric-card";
import { PageHeader } from "~/components/page-header";
import { SourceNotice } from "~/components/source-notice";
import { StatusBadge } from "~/components/status-badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  getAiCapabilities,
  getInventory,
  getRecipes,
  getShoppingItems,
  type ShoppingSuggestion,
  suggestShoppingItems,
} from "~/lib/api/resources";
import type { Route } from "./+types/shopping";

export const handle = {
  topbar: function ShoppingTopbar() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<ShoppingSuggestion[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [aiEnabled, setAiEnabled] = useState(false);

    useEffect(() => {
      getAiCapabilities().then((result) => {
        setAiEnabled(result.data.some((c) => c.enabled));
      });
    }, []);

    const handleSmartSuggest = async () => {
      setLoading(true);
      setError(null);
      setSuggestions([]);
      setOpen(true);
      try {
        const [inventory, recipes, shopping] = await Promise.all([
          getInventory(),
          getRecipes(),
          getShoppingItems(),
        ]);

        const result = await suggestShoppingItems({
          shopping_history: shopping.data.map((item) => ({
            name: item.name,
          })),
          inventory_items: inventory.data.map((item) => ({
            name: item.name,
            quantity: String(item.quantity),
            location: item.location,
          })),
          planned_recipes: recipes.data.map((r) => ({ title: r.title })),
          frequently_cooked: recipes.data.slice(0, 10).map((r) => r.title),
        });

        if (result.error) {
          setError(result.error);
        } else {
          setSuggestions(result.data.suggestions);
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };

    const priorityVariant = (priority: string) => {
      if (priority === "high") return "destructive" as const;
      if (priority === "low") return "secondary" as const;
      return "default" as const;
    };

    return (
      <>
        <Button
          variant="outline"
          onClick={handleSmartSuggest}
          disabled={!aiEnabled || loading}
        >
          {loading ? (
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
          ) : (
            <WandSparklesIcon data-icon="inline-start" />
          )}
          Smart suggest
        </Button>
        <Button variant="outline">
          <CheckIcon data-icon="inline-start" />
          Mark trip complete
        </Button>
        <Button>
          <PlusIcon data-icon="inline-start" />
          Add item
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Smart suggestions</DialogTitle>
              <DialogDescription>
                AI-powered shopping list suggestions based on your inventory,
                recipes, and shopping patterns.
              </DialogDescription>
            </DialogHeader>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : suggestions.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No suggestions available. Try adding more items to your shopping
                list or inventory.
              </div>
            ) : (
              <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
                {suggestions.map((s) => (
                  <div
                    key={s.item_name}
                    className="flex items-start justify-between gap-4 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{s.item_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {s.reason}
                      </p>
                    </div>
                    <Badge
                      variant={priorityVariant(s.priority)}
                      className="shrink-0"
                    >
                      {s.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter showCloseButton />
          </DialogContent>
        </Dialog>
      </>
    );
  },
};

export function meta() {
  return [{ title: "Shopping | Kombu" }];
}

export async function loader() {
  const shopping = await getShoppingItems();
  return { shopping };
}

export default function Shopping({ loaderData }: Route.ComponentProps) {
  const { shopping } = loaderData;
  const needed = shopping.data.filter((item) => item.status === "needed");
  const purchased = shopping.data.filter((item) => item.status === "purchased");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Shopping"
        title="Turn missing ingredients and low stock into a shared list."
        description="Shopping starts from recipes, inventory thresholds, scanner sessions, and direct user entry."
      />

      <SourceNotice results={[shopping]} />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Needed"
          value={needed.length}
          description="Items still waiting to be bought."
        />
        <MetricCard
          label="Purchased"
          value={purchased.length}
          description="Items marked complete during the current trip."
        />
        <MetricCard
          label="Categories"
          value={
            new Set(shopping.data.map((item) => item.category ?? "Other")).size
          }
          description="Groups ready for a store-friendly layout."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shopping list</CardTitle>
          <CardDescription>
            One table for humans, agents, and future mobile or scanner flows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="needed">
            <TabsList>
              <TabsTrigger value="needed">Needed</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="purchased">Purchased</TabsTrigger>
            </TabsList>
            <TabsContent value="needed" className="mt-4">
              <ShoppingTable items={needed} />
            </TabsContent>
            <TabsContent value="all" className="mt-4">
              <ShoppingTable items={shopping.data} />
            </TabsContent>
            <TabsContent value="purchased" className="mt-4">
              <ShoppingTable items={purchased} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function ShoppingTable({
  items,
}: {
  items: Route.ComponentProps["loaderData"]["shopping"]["data"];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>
              {item.quantity} {item.unit}
            </TableCell>
            <TableCell>{item.category ?? "Other"}</TableCell>
            <TableCell>
              <StatusBadge value={item.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
