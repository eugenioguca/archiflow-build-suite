import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Plus } from "lucide-react";

interface QualityCheck {
  id: string;
  check_name: string;
  check_type: string;
  inspection_date: string;
  status: string;
  score?: number;
}

interface QualityControlProps {
  constructionProjectId: string;
}

export function QualityControl({ constructionProjectId }: QualityControlProps) {
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChecks = async () => {
    try {
      const { data, error } = await supabase
        .from("quality_checks")
        .select("*")
        .eq("construction_project_id", constructionProjectId);
      if (error) throw error;
      setChecks(data || []);
    } catch (error) {
      console.error("Error fetching quality checks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (constructionProjectId) {
      fetchChecks();
    }
  }, [constructionProjectId]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Control de Calidad</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Inspección
        </Button>
      </div>
      {checks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay inspecciones registradas</h3>
          </CardContent>
        </Card>
      ) : (
        checks.map((check) => (
          <Card key={check.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {check.status === "passed" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                {check.check_name}
                <Badge>{check.status}</Badge>
              </CardTitle>
            </CardHeader>
          </Card>
        ))
      )}
    </div>
  );
}