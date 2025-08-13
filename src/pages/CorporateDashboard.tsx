import { MonthlyFeaturedImage } from '@/components/dashboard/MonthlyFeaturedImage';
import { EmployeeBirthdays } from '@/components/dashboard/EmployeeBirthdays';
import { CompanyPromotions } from '@/components/dashboard/CompanyPromotions';
import { OperationManuals } from '@/components/dashboard/OperationManuals';
import { ImprovedCalendarWidget } from '@/components/dashboard/ImprovedCalendarWidget';
import { useIsMobile } from '@/hooks/use-mobile';

export default function CorporateDashboard() {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Hub Corporativo
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
          : 'grid-cols-1 lg:grid-cols-4'
      }`}>
        
        {/* Left Column - Operation Manuals */}
        <div className={`space-y-6 ${isMobile ? '' : 'lg:col-span-2'}`}>
          <OperationManuals />
        </div>

        {/* Right Column - Calendar and Widgets */}
        <div className={`space-y-6 ${isMobile ? '' : 'lg:col-span-2'}`}>
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Birthdays and Promotions */}
            <div className="space-y-6">
              <EmployeeBirthdays />
              <CompanyPromotions />
            </div>
            
            {/* Calendar */}
            <div>
              <ImprovedCalendarWidget />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}