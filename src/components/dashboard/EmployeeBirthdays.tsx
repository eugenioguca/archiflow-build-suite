import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Cake, Calendar, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EmployeeBirthday {
  id: string;
  full_name: string;
  birth_date: string;
  email?: string;
  avatar_url?: string;
  daysUntil: number;
  isToday: boolean;
}

export function EmployeeBirthdays() {
  const [birthdays, setBirthdays] = useState<EmployeeBirthday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBirthdays();
  }, []);

  const fetchBirthdays = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, birth_date, email, avatar_url')
        .not('birth_date', 'is', null)
        .in('role', ['employee', 'admin']);

      if (error) {
        console.error('Error fetching birthdays:', error);
        return;
      }

      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      const processedBirthdays = data
        .map(profile => {
          const birthDate = new Date(profile.birth_date);
          const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
          
          // If birthday already passed this year, calculate for next year
          if (thisYearBirthday < today) {
            thisYearBirthday.setFullYear(currentYear + 1);
          }

          const timeDiff = thisYearBirthday.getTime() - today.getTime();
          const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));
          const isToday = daysUntil === 0;

          return {
            ...profile,
            daysUntil,
            isToday
          };
        })
        .filter(profile => {
          // Show birthdays in current month or within next 30 days
          const birthDate = new Date(profile.birth_date);
          return birthDate.getMonth() === currentMonth || profile.daysUntil <= 30;
        })
        .sort((a, b) => a.daysUntil - b.daysUntil);

      setBirthdays(processedBirthdays);
    } catch (error) {
      console.error('Error fetching birthdays:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long'
    }).format(date);
  };

  if (loading) {
    return (
      <Card className="glassmorphic-bg border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink" />
            Cumpleaños del Mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glassmorphic-bg border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink" />
            Cumpleaños del Personal
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {birthdays.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No hay cumpleaños próximos
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {birthdays.map((birthday) => (
                <div
                  key={birthday.id}
                  className={`
                    flex items-center space-x-3 p-3 rounded-lg transition-colors
                    ${birthday.isToday 
                      ? 'bg-gradient-to-r from-pink/20 to-purple/20 border border-pink/30' 
                      : 'bg-muted/30 hover:bg-muted/50'
                    }
                  `}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={birthday.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-pink to-purple text-white">
                      {getInitials(birthday.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {birthday.full_name}
                      </p>
                      {birthday.isToday && (
                        <Badge variant="secondary" className="bg-pink/20 text-pink-foreground">
                          <Gift className="h-3 w-3 mr-1" />
                          ¡Hoy!
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(birthday.birth_date)}
                      {!birthday.isToday && (
                        <span className="ml-2">
                          • En {birthday.daysUntil} día{birthday.daysUntil !== 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </>
  );
}