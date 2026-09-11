import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export type PaymentFilterTab = "ALL" | "UNSETTLED" | "PAID";

interface PaymentsFilterBarProps {
  filterTab: PaymentFilterTab;
  setFilterTab: (tab: PaymentFilterTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onClearSearch: () => void;
  totalOrdersCount: number;
  unsettledCount: number;
}

export const PaymentsFilterBar: React.FC<PaymentsFilterBarProps> = ({
  filterTab,
  setFilterTab,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  onClearSearch,
  totalOrdersCount,
  unsettledCount,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      {/* Search Input */}
      <form onSubmit={onSearchSubmit} className="flex items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Order #, client, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-8 text-xs"
            id="input-ledger-search"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          className="h-8 px-3 text-xs"
          id="btn-ledger-search-submit"
        >
          Search
        </Button>
      </form>
      {/* Filter Tabs */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0"
        id="filter-tabs"
      >
        <Button
          type="button"
          size="sm"
          variant={filterTab === "ALL" ? "default" : "outline"}
          className="h-8 text-xs px-3"
          onClick={() => setFilterTab("ALL")}
          id="tab-filter-all"
        >
          All Orders ({totalOrdersCount})
        </Button>
        <Button
          type="button"
          size="sm"
          variant={filterTab === "UNSETTLED" ? "default" : "outline"}
          className="h-8 text-xs px-3"
          onClick={() => setFilterTab("UNSETTLED")}
          id="tab-filter-unsettled"
        >
          Outstanding Balance ({unsettledCount})
        </Button>
        <Button
          type="button"
          size="sm"
          variant={filterTab === "PAID" ? "default" : "outline"}
          className="h-8 text-xs px-3"
          onClick={() => setFilterTab("PAID")}
          id="tab-filter-paid"
        >
          Fully Settled ({totalOrdersCount - unsettledCount})
        </Button>
      </div>
    </div>
  );
};
