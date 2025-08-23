import { useState } from 'react';
import { MonthlyFeaturedImage } from '@/components/dashboard/MonthlyFeaturedImage';
import { EmployeeBirthdays } from '@/components/dashboard/EmployeeBirthdays';
import { CompanyPromotions } from '@/components/dashboard/CompanyPromotions';
import { OperationManuals } from '@/components/dashboard/OperationManuals';
import { ImprovedCalendarWidget } from '@/components/dashboard/ImprovedCalendarWidget';
import { SmartDashboardStats } from '@/components/SmartDashboardStats';
import { useIsMobile } from '@/hooks/use-mobile';
import { TestCombobox } from '@/components/TestCombobox';
import { Button } from '@/components/ui/button';

export default function CorporateDashboard() {
  const isMobile = useIsMobile();
  const [showTest, setShowTest] = useState(false);

  // Modo de prueba del combobox
  if (showTest) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mb-4">
          <Button 
            onClick={() => setShowTest(false)}
            variant="outline"
          >
            ← Volver al Dashboard
          </Button>
        </div>
        <TestCombobox />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Dovita Hub
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            Tu espacio de información y recursos empresariales
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="status-dot bg-success"></div>
          Sistema operativo
        </div>
      </div>


      {/* Monthly Featured Image - Full Width */}
      <MonthlyFeaturedImage />

      {/* Main Content Grid */}
      <div className={`grid gap-6 ${
        isMobile 
          ? 'grid-cols-1' 
          : 'grid-cols-1 lg:grid-cols-3'
      }`}>
        
        {/* Left Column - Two rows */}
        <div className={`space-y-6 ${isMobile ? '' : 'lg:col-span-2'}`}>
          {/* Top Row - Promotions and Birthdays */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <CompanyPromotions />
            <EmployeeBirthdays />
          </div>
          
          {/* Bottom Row - Operation Manuals */}
          <OperationManuals />
        </div>

        {/* Right Column - Calendar */}
        <div className={`${isMobile ? '' : 'lg:col-span-1'}`}>
          <ImprovedCalendarWidget />
        </div>
      </div>
      
      {/* Test Combobox Button - Floating */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <Button 
          onClick={() => setShowTest(true)}
          className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
          size="sm"
        >
          🧪 Test Combobox
        </Button>
        <Button 
          onClick={() => window.open('/test-transaction-form', '_blank')}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          size="sm"
        >
          🔧 Test Form
        </Button>
      </div>
    </div>
  );
}