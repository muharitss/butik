import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

export type FittingFilterTab = 'ALL' | 'SCHEDULED' | 'IN_PRODUCTION' | 'COMPLETED';

interface FittingsFilterBarProps {
  filterTab: FittingFilterTab;
  setFilterTab: (tab: FittingFilterTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onClearSearch: () => void;
  totalOrdersCount: number;
  scheduledCount: number;
}

export const FittingsFilterBar: React.FC<FittingsFilterBarProps> = ({
  filterTab,
  setFilterTab,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  onClearSearch,
  totalOrdersCount,
  scheduledCount,
}) => {
  return (
    <Card className="border shadow-xs bg-card">
      <CardContent className="py-3 px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0" id="fittings-filter-tabs">
            <Button
              type="button"
              size="sm"
              variant={filterTab === 'ALL' ? 'default' : 'outline'}
              className="h-8 text-xs px-3"
              onClick={() => setFilterTab('ALL')}
              id="tab-fittings-all"
            >
              All Orders ({totalOrdersCount})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filterTab === 'SCHEDULED' ? 'default' : 'outline'}
              className="h-8 text-xs px-3"
              onClick={() => setFilterTab('SCHEDULED')}
              id="tab-fittings-scheduled"
            >
              Scheduled Sessions ({scheduledCount})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filterTab === 'IN_PRODUCTION' ? 'default' : 'outline'}
              className="h-8 text-xs px-3"
              onClick={() => setFilterTab('IN_PRODUCTION')}
              id="tab-fittings-production"
            >
              In Production / Fitting
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filterTab === 'COMPLETED' ? 'default' : 'outline'}
              className="h-8 text-xs px-3"
              onClick={() => setFilterTab('COMPLETED')}
              id="tab-fittings-completed"
            >
              Ready / Completed
            </Button>
          </div>

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
                id="input-fittings-search"
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
            <Button type="submit" size="sm" variant="secondary" className="h-8 px-3 text-xs" id="btn-fittings-search-submit">
              Search
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};
