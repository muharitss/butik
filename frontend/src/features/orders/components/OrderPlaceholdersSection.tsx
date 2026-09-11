import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Paperclip } from 'lucide-react';

export const OrderPlaceholdersSection: React.FC = () => {
  return (
    <div className="space-y-4" id="order-future-placeholders">
      <div className="grid grid-cols-1 gap-4">
        {/* Attachments Placeholder */}
        <Card className="border-dashed bg-card/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Design Sketches & Photos</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px]">Phase 6 Reserved</Badge>
            </div>
            <CardDescription className="text-xs">
              Customer reference photos, fabric swatches, and bespoke sketches.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground italic">
              Attachment uploads and gallery previews will be introduced in Phase 6 (TASK-024 – TASK-025).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
