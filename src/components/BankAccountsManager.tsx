import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/CurrencyInput";
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
  clabe?: string;
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
    current_balance: 0,
    credit_limit: 0,
    clabe: "",
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
        current_balance: 0,
        credit_limit: 0,
        clabe: "",
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
      checking: "Cuenta de Cheques",
      savings: "Cuenta de Ahorro", 
      credit: "Línea de Crédito",
      investment: "Cuenta de Inversión"
    };
    return types[type] || type;
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-green-600";
    if (balance < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin Cuentas Bancarias</h3>
              <p className="text-muted-foreground mb-4">
                Comience agregando su primera cuenta bancaria para gestionar sus finanzas.
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Primera Cuenta
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Nueva Cuenta Bancaria</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bank_name">Banco</Label>
                        <Input
                          id="bank_name"
                          value={formData.bank_name}
                          onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                          placeholder="Ej: Bancomer"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="account_holder">Titular</Label>
                        <Input
                          id="account_holder"
                          value={formData.account_holder}
                          onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                          placeholder="Nombre completo"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="account_number">Número de Cuenta</Label>
                        <Input
                          id="account_number"
                          value={formData.account_number}
                          onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                          placeholder="1234567890"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="clabe">CLABE</Label>
                        <Input
                          id="clabe"
                          type="number"
                          value={formData.clabe}
                          onChange={(e) => setFormData({ ...formData, clabe: e.target.value })}
                          placeholder="123456789012345678"
                          maxLength={18}
                        />
                      </div>
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
                          <SelectItem value="checking">Cuenta de Cheques</SelectItem>
                          <SelectItem value="savings">Cuenta de Ahorro</SelectItem>
                          <SelectItem value="credit">Línea de Crédito</SelectItem>
                          <SelectItem value="investment">Cuenta de Inversión</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="current_balance">Saldo Inicial</Label>
                        <CurrencyInput
                          value={formData.current_balance}
                          onChange={(value) => setFormData({ ...formData, current_balance: value })}
                          placeholder="$ 0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="credit_limit">Límite de Crédito</Label>
                        <CurrencyInput
                          value={formData.credit_limit}
                          onChange={(value) => setFormData({ ...formData, credit_limit: value })}
                          placeholder="$ 0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes">Notas</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Información adicional..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" className="flex-1">
                        Crear Cuenta
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          accounts.map((account) => (
            <Card key={account.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {account.bank_name}
                  </CardTitle>
                  <Badge variant="outline">
                    {getAccountTypeLabel(account.account_type)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div>Titular: {account.account_holder}</div>
                  <div>****{account.account_number.slice(-4)}</div>
                  {account.clabe && <div>CLABE: {account.clabe}</div>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Saldo Actual</span>
                    <span className={`text-lg font-bold ${getBalanceColor(account.current_balance)}`}>
                      {formatCurrency(account.current_balance)}
                    </span>
                  </div>
                  
                  {account.credit_limit > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Límite de Crédito</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(account.credit_limit)}
                      </span>
                    </div>
                  )}

                  {account.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">{account.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};