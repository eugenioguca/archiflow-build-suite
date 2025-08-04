import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link, Users, AlertCircle, CheckCircle } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: 'admin' | 'employee' | 'client';
}

interface Client {
  id: string;
  full_name: string;
  profile_id: string | null;
}

export const UserClientLinker: React.FC = () => {
  const [clientUsers, setClientUsers] = useState<UserProfile[]>([]);
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get users with 'client' role but no linked client
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client');

      if (usersError) throw usersError;

      // Get clients without linked profile
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, full_name, profile_id');

      if (clientsError) throw clientsError;

      // Filter users that don't have a linked client
      const linkedProfileIds = clientsData
        ?.filter(client => client.profile_id)
        .map(client => client.profile_id) || [];

      const unlinkedUsers = usersData?.filter(user => 
        !linkedProfileIds.includes(user.id)
      ) || [];

      // Filter clients without linked profile
      const unlinkedClients = clientsData?.filter(client => 
        !client.profile_id
      ) || [];

      setClientUsers(unlinkedUsers);
      setAvailableClients(unlinkedClients);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkUserToClient = async (userId: string, clientId: string) => {
    try {
      const userProfile = clientUsers.find(user => user.user_id === userId);
      if (!userProfile) throw new Error('Usuario no encontrado');

      console.log('Vinculando usuario:', { userId, clientId, userProfile });

      // Update client with profile_id
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .update({ profile_id: userProfile.id })
        .eq('id', clientId)
        .select();

      if (clientError) {
        console.error('Error actualizando cliente:', clientError);
        throw new Error(`Error actualizando cliente: ${clientError.message}`);
      }

      console.log('Cliente actualizado exitosamente:', clientData);

      // Create portal settings with upsert to avoid duplicates
      const { data: portalData, error: portalError } = await supabase
        .from('client_portal_settings')
        .upsert({
          client_id: clientId,
          can_view_documents: true,
          can_view_finances: true,
          can_view_photos: true,
          can_view_progress: true
        }, {
          onConflict: 'client_id'
        })
        .select();

      if (portalError) {
        console.error('Error creando configuración portal:', portalError);
        throw new Error(`Error creando configuración portal: ${portalError.message}`);
      }

      console.log('Configuración portal creada exitosamente:', portalData);

      toast({
        title: "Vinculación exitosa",
        description: `Usuario ${userProfile.full_name} vinculado al cliente correctamente`
      });

      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Error completo linking user to client:', error);
      const errorMessage = error.message || 'Error desconocido al vincular usuario';
      toast({
        variant: "destructive",
        title: "Error de vinculación",
        description: errorMessage
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Vincular Usuarios con Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientUsers.length === 0 && availableClients.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Todos los usuarios con rol de cliente están vinculados correctamente.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {clientUsers.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No hay usuarios con rol de cliente sin vincular.
                  </AlertDescription>
                </Alert>
              ) : availableClients.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No hay clientes disponibles para vincular. Primero crea registros de clientes en el sistema.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Vincula usuarios que tienen rol de cliente con registros de clientes existentes en el sistema.
                  </p>
                  
                  <div className="space-y-4">
                    {clientUsers.map((user) => (
                      <UserClientLinkRow
                        key={user.id}
                        user={user}
                        availableClients={availableClients}
                        onLink={handleLinkUserToClient}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Estadísticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{clientUsers.length}</div>
              <div className="text-sm text-muted-foreground">Usuarios sin vincular</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">{availableClients.length}</div>
              <div className="text-sm text-muted-foreground">Clientes disponibles</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface UserClientLinkRowProps {
  user: UserProfile;
  availableClients: Client[];
  onLink: (userId: string, clientId: string) => void;
}

const UserClientLinkRow: React.FC<UserClientLinkRowProps> = ({ 
  user, 
  availableClients, 
  onLink 
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);

  const handleLink = async () => {
    if (!selectedClientId) return;
    
    setIsLinking(true);
    try {
      await onLink(user.user_id, selectedClientId);
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      <div className="flex-1">
        <div className="font-medium">{user.full_name || 'Sin nombre'}</div>
        <div className="text-sm text-muted-foreground">{user.email}</div>
        <Badge variant="outline" className="mt-1">Cliente</Badge>
      </div>
      
      <div className="flex items-center gap-2">
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Seleccionar cliente" />
          </SelectTrigger>
          <SelectContent>
            {availableClients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button 
          onClick={handleLink}
          disabled={!selectedClientId || isLinking}
          size="sm"
        >
          {isLinking ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <>
              <Link className="h-4 w-4 mr-2" />
              Vincular
            </>
          )}
        </Button>
      </div>
    </div>
  );
};