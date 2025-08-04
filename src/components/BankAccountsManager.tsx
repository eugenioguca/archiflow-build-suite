import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Building2, CreditCard, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  account_holder: string;
  current_balance: number;
  credit_limit: number;
  status: string;
  notes?: string;
}

export const BankAccountsManager: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    bank_name: "",
    account_number: "",
    account_type: "checking",
    account_holder: "",
    current_balance: "0",
    credit_limit: "0",
    notes: ""
  });

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las cuentas bancarias",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('bank_accounts')
        .insert([{
          ...formData,
          current_balance: parseFloat(formData.current_balance),
          credit_limit: parseFloat(formData.credit_limit),
          created_by: profile.id
        }]);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Cuenta bancaria creada correctamente"
      });

      setIsDialogOpen(false);
      setFormData({
        bank_name: "",
        account_number: "",
        account_type: "checking",
        account_holder: "",
        current_balance: "0",
        credit_limit: "0",
        notes: ""
      });
      fetchBankAccounts();
    } catch (error) {
      console.error('Error creating bank account:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la cuenta bancaria",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getAccountTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      checking: "Corriente",
      savings: "Ahorro",
      credit: "Crédito",
      investment: "Inversión"
    };
    return types[type] || type;
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-green-600";
    if (balance < 0) return "text-red-600";
    return "text-gray-600";
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Account Button */}
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cuenta Bancaria
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva Cuenta Bancaria</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="bank_name">Banco</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  required
                  placeholder="Ej. BBVA, Santander, Banamex"
                />
              </div>

              <div>
                <Label htmlFor="account_number">Número de Cuenta</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  required
                  placeholder="****1234"
                />
              </div>

              <div>
                <Label htmlFor="account_type">Tipo de Cuenta</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Corriente</SelectItem>
                    <SelectItem value="savings">Ahorro</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                    <SelectItem value="investment">Inversión</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="account_holder">Titular</Label>
                <Input
                  id="account_holder"
                  value={formData.account_holder}
                  onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                  required
                  placeholder="Nombre del titular"
                />
              </div>

              <div>
                <Label htmlFor="current_balance">Saldo Inicial</Label>
                <Input
                  id="current_balance"
                  type="number"
                  step="0.01"
                  value={formData.current_balance}
                  onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="credit_limit">Límite de Crédito</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  step="0.01"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Información adicional..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  Crear Cuenta
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No hay cuentas bancarias</h3>
          <p className="text-muted-foreground mb-4">
            Crea tu primera cuenta bancaria para comenzar a gestionar los movimientos
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <Card key={account.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {account.bank_name}
                  </CardTitle>
                  <Badge variant="outline">
                    {getAccountTypeLabel(account.account_type)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  ****{account.account_number.slice(-4)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Titular</p>
                    <p className="font-medium">{account.account_holder}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Saldo
                      </p>
                      <p className={`font-bold ${getBalanceColor(account.current_balance)}`}>
                        {formatCurrency(account.current_balance)}
                      </p>
                    </div>
                    
                    {account.credit_limit > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          Límite
                        </p>
                        <p className="font-medium text-blue-600">
                          {formatCurrency(account.credit_limit)}
                        </p>
                      </div>
                    )}
                  </div>

                  {account.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Notas</p>
                      <p className="text-sm">{account.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};