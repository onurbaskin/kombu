import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import type { RecipeFilterValues } from "~/lib/api/resources";

interface RecipeFiltersProps {
  filters: RecipeFilterValues;
  activeFilters: {
    cuisine?: string;
    source_type?: string;
    search?: string;
  };
  onFilterChange: (key: string, value: string | null) => void;
  onSearch: (query: string) => void;
  searchValue: string;
}

export function RecipeFilters({
  filters,
  activeFilters,
  onFilterChange,
  onSearch,
  searchValue,
}: RecipeFiltersProps) {
  const hasActiveFilters =
    activeFilters.cuisine || activeFilters.source_type || activeFilters.search;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <SlidersHorizontalIcon className="size-4 text-muted-foreground" />
        <span className="font-semibold text-sm">Filters</span>
      </div>

      <div className="relative">
        <SearchIcon className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search recipes..."
          value={searchValue}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-6 pr-3">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-xs uppercase text-muted-foreground tracking-wider">
              Source
            </span>
            {filters.source_types.map((type) => (
              <label
                key={type}
                htmlFor={`source-${type}`}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <Checkbox
                  id={`source-${type}`}
                  checked={activeFilters.source_type === type}
                  onCheckedChange={(checked) =>
                    onFilterChange("source_type", checked ? type : null)
                  }
                />
                <span className="capitalize">{type}</span>
              </label>
            ))}
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <span className="font-medium text-xs uppercase text-muted-foreground tracking-wider">
              Cuisine
            </span>
            <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
              {filters.cuisines.map((cuisine) => (
                <label
                  key={cuisine}
                  htmlFor={`cuisine-${cuisine}`}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <Checkbox
                    id={`cuisine-${cuisine}`}
                    checked={activeFilters.cuisine === cuisine}
                    onCheckedChange={(checked) =>
                      onFilterChange("cuisine", checked ? cuisine : null)
                    }
                  />
                  <span>{cuisine}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {hasActiveFilters && (
        <>
          <Separator />
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              onFilterChange("cuisine", null);
              onFilterChange("source_type", null);
              onSearch("");
            }}
          >
            <XIcon className="size-3 mr-1" />
            Clear all filters
          </Button>
        </>
      )}

      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Want millions more recipes? Configure open-source recipe datasets in{" "}
          <a href="/settings" className="underline hover:text-foreground">
            Settings → Recipe Sources
          </a>
          .
        </p>
      </div>
    </div>
  );
}
