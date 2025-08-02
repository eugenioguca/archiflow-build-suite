import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus } from "lucide-react";

interface ConstructionExpense {
  id: string;
  description: string;
  total_amount: number;
  status: string;
  expense_date: string;
}

interface ConstructionExpensesProps {
  constructionProjectId: string;
}

export function ConstructionExpenses({ constructionProjectId }: ConstructionExpensesProps) {
  const [expenses, setExpenses] = useState<ConstructionExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("construction_expenses")
        .select("*")
        .eq("construction_project_id", constructionProjectId);
      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (constructionProjectId) {
      fetchExpenses();
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
        <h2 className="text-2xl font-bold">Gastos de Construcción</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Gasto
        </Button>
      </div>
      {expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay gastos registrados</h3>
          </CardContent>
        </Card>
      ) : (
        expenses.map((expense) => (
          <Card key={expense.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {expense.description}
                <Badge>{expense.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${expense.total_amount.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}