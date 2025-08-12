import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileEyeToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function MobileEyeToggle({ isOpen, onToggle }: MobileEyeToggleProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className="fixed top-3 left-3 z-50 h-10 w-10 p-0 bg-background/80 backdrop-blur-sm border border-border hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring transition-all duration-200 shadow-md"
      aria-label={isOpen ? "Ocultar sidebar" : "Mostrar sidebar"}
    >
      {isOpen ? (
        <EyeOff className="h-5 w-5 text-foreground" />
      ) : (
        <Eye className="h-5 w-5 text-foreground" />
      )}
    </Button>
  );
}