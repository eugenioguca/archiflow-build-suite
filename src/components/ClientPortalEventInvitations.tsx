import React from 'react';
import { usePersonalCalendar } from '@/hooks/usePersonalCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const ClientPortalEventInvitations = () => {
  // Personal calendar mode - no invitations
  return (
    <div className="text-center py-4 text-muted-foreground">
      <p>Las invitaciones a eventos no están disponibles en el calendario personal.</p>
    </div>
  );
};