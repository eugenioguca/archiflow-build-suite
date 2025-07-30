import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Star, AlertTriangle } from "lucide-react";

interface LeadScoringProps {
  client: {
    id: string;
    lead_score: number;
    budget: number | null;
    project_type: string | null;
    priority: string;
    last_contact_date: string | null;
    created_at: string;
  };
  onScoreUpdate?: (newScore: number) => void;
}

export function CRMLeadScoring({ client, onScoreUpdate }: LeadScoringProps) {
  const [score, setScore] = useState(client.lead_score || 0);
  const [scoreBreakdown, setScoreBreakdown] = useState({
    budget: 0,
    engagement: 0,
    timeline: 0,
    fit: 0,
    authority: 0
  });

  useEffect(() => {
    calculateLeadScore();
  }, [client]);

  const calculateLeadScore = () => {
    let totalScore = 0;
    const breakdown = {
      budget: 0,
      engagement: 0,
      timeline: 0,
      fit: 0,
      authority: 0
    };

    // Budget Score (0-30 points)
    if (client.budget) {
      if (client.budget >= 2000000) breakdown.budget = 30;
      else if (client.budget >= 1000000) breakdown.budget = 25;
      else if (client.budget >= 500000) breakdown.budget = 20;
      else if (client.budget >= 250000) breakdown.budget = 15;
      else if (client.budget >= 100000) breakdown.budget = 10;
      else breakdown.budget = 5;
    }

    // Engagement Score (0-25 points)
    const daysSinceCreated = client.created_at ? 
      Math.floor((Date.now() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    const daysSinceLastContact = client.last_contact_date ? 
      Math.floor((Date.now() - new Date(client.last_contact_date).getTime()) / (1000 * 60 * 60 * 24)) : 999;

    if (daysSinceLastContact <= 1) breakdown.engagement = 25;
    else if (daysSinceLastContact <= 7) breakdown.engagement = 20;
    else if (daysSinceLastContact <= 30) breakdown.engagement = 15;
    else if (daysSinceLastContact <= 60) breakdown.engagement = 10;
    else breakdown.engagement = 5;

    // Timeline Score (0-20 points)
    if (daysSinceCreated <= 7) breakdown.timeline = 20;
    else if (daysSinceCreated <= 30) breakdown.timeline = 15;
    else if (daysSinceCreated <= 90) breakdown.timeline = 10;
    else breakdown.timeline = 5;

    // Project Fit Score (0-15 points)
    const highValueProjects = ['commercial', 'industrial'];
    const mediumValueProjects = ['residential', 'renovation'];
    const specialtyProjects = ['landscape', 'interior_design'];

    if (client.project_type) {
      if (highValueProjects.includes(client.project_type)) breakdown.fit = 15;
      else if (mediumValueProjects.includes(client.project_type)) breakdown.fit = 12;
      else if (specialtyProjects.includes(client.project_type)) breakdown.fit = 10;
      else breakdown.fit = 8;
    }

    // Priority/Authority Score (0-10 points)
    switch (client.priority) {
      case 'urgent': breakdown.authority = 10; break;
      case 'high': breakdown.authority = 8; break;
      case 'medium': breakdown.authority = 6; break;
      case 'low': breakdown.authority = 4; break;
      default: breakdown.authority = 5;
    }

    totalScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    setScore(totalScore);
    setScoreBreakdown(breakdown);
    
    if (onScoreUpdate && totalScore !== client.lead_score) {
      onScoreUpdate(totalScore);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 40) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return { label: "Muy Alto", icon: Star };
    if (score >= 60) return { label: "Alto", icon: TrendingUp };
    if (score >= 40) return { label: "Medio", icon: Minus };
    return { label: "Bajo", icon: TrendingDown };
  };

  const scoreInfo = getScoreLabel(score);
  const ScoreIcon = scoreInfo.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Lead Scoring</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Principal */}
        <div className={`text-center p-4 rounded-lg border ${getScoreColor(score)}`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <ScoreIcon className="h-5 w-5" />
            <span className="text-2xl font-bold">{score}/100</span>
          </div>
          <Badge variant="outline" className={getScoreColor(score)}>
            {scoreInfo.label}
          </Badge>
        </div>

        {/* Barra de Progreso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Puntuación Total</span>
            <span>{score}%</span>
          </div>
          <Progress value={score} className="h-2" />
        </div>

        {/* Desglose de Puntuación */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Desglose de Puntuación:</h4>
          
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">💰 Presupuesto</span>
              <div className="flex items-center gap-2">
                <Progress value={(scoreBreakdown.budget / 30) * 100} className="w-16 h-1" />
                <span className="font-medium w-8">{scoreBreakdown.budget}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🎯 Engagement</span>
              <div className="flex items-center gap-2">
                <Progress value={(scoreBreakdown.engagement / 25) * 100} className="w-16 h-1" />
                <span className="font-medium w-8">{scoreBreakdown.engagement}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⏱️ Timeline</span>
              <div className="flex items-center gap-2">
                <Progress value={(scoreBreakdown.timeline / 20) * 100} className="w-16 h-1" />
                <span className="font-medium w-8">{scoreBreakdown.timeline}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🏗️ Tipo Proyecto</span>
              <div className="flex items-center gap-2">
                <Progress value={(scoreBreakdown.fit / 15) * 100} className="w-16 h-1" />
                <span className="font-medium w-8">{scoreBreakdown.fit}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">👑 Prioridad</span>
              <div className="flex items-center gap-2">
                <Progress value={(scoreBreakdown.authority / 10) * 100} className="w-16 h-1" />
                <span className="font-medium w-8">{scoreBreakdown.authority}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recomendaciones */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h5 className="font-medium text-sm text-blue-800 mb-2">💡 Recomendaciones:</h5>
          <ul className="text-xs text-blue-700 space-y-1">
            {score >= 80 && (
              <li>• Priorizar contacto inmediato - Lead caliente</li>
            )}
            {score >= 60 && score < 80 && (
              <li>• Programar follow-up en 24-48 horas</li>
            )}
            {score >= 40 && score < 60 && (
              <li>• Enviar información adicional y reagendar</li>
            )}
            {score < 40 && (
              <li>• Necesita más calificación antes de invertir tiempo</li>
            )}
            {scoreBreakdown.engagement < 15 && (
              <li>• ⚠️ Contacto reciente necesario</li>
            )}
            {scoreBreakdown.budget < 10 && (
              <li>• 💰 Verificar presupuesto real</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}