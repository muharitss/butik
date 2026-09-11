import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Paperclip } from 'lucide-react';

export const OrderPlaceholdersSection: React.FC = () => {
  return (
    <div className="space-y-4" id="order-future-placeholders">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Revisions Placeholder */}
        <Card className="border-dashed bg-card/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Garment Revisions</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px]">Phase 5 Reserved</Badge>
            </div>
            <CardDescription className="text-xs">
              Alteration tickets, re-tailoring requests, and adjustment resolution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground italic">
              Revision tickets and seamstress workflows will land in Phase 5 (TASK-022 – TASK-023).
            </p>
          </CardContent>
        </Card>

        {/* Attachments Placeholder */}
        <Card className="border-dashed bg-card/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Design Sketches & Photos</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px]">Phase 7 Reserved</Badge>
            </div>
            <CardDescription className="text-xs">
              Customer reference photos, fabric swatches, and bespoke sketches.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground italic">
              Attachment uploads and gallery previews will be introduced in Phase 7 (TASK-026 – TASK-027).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
