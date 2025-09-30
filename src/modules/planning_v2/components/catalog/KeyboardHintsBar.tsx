import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function KeyboardHintsBar() {
  const hints = [
    { key: "N", action: "Nueva Partida" },
    { key: "S", action: "Agregar Subpartida" },
    { key: "D", action: "Duplicar seleccionadas" },
    { key: "T", action: "Plantillas" },
    { key: "C", action: "Columnas" },
    { key: "Alt+↑/↓", action: "Mover filas" },
  ];

  return (
    <Card className="px-3 py-2 bg-muted/30 border-none">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Atajos:</span>
        {hints.map((hint) => (
          <div key={hint.key} className="flex items-center gap-1.5">
            <Badge variant="outline" className="font-mono text-xs px-1.5 py-0.5">
              {hint.key}
            </Badge>
            <span>{hint.action}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
