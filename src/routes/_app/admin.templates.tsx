import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_app/admin/templates")({ component: AdminTemplates });

function AdminTemplates() {
  return (
    <Card>
      <CardHeader><CardTitle>PPT Templates</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Templates are uploaded per project on the project's Overview tab. This page is a placeholder for future global template management.
      </CardContent>
    </Card>
  );
}