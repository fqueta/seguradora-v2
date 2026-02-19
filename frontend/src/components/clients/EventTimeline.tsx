import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, User, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { UserEvent } from '@/types/user-events';
import { useAuth } from '@/contexts/AuthContext';

interface EventTimelineProps {
  events?: UserEvent[];
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events = [] }) => {
  const { user } = useAuth();
  const [expandedEvents, setExpandedEvents] = useState<Set<string | number>>(new Set());
  
  // Detalhes técnicos apenas para Super Admin (permission_id = 1)
  const canSeeTechnicalDetails = Number(user?.permission_id) === 1;

  const toggleExpand = (id: string | number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEvents(newExpanded);
  };

  const getEventLabel = (type: string) => {
    const labels: Record<string, string> = {
      'user_created': 'Criação de Usuário',
      'user_updated': 'Atualização de Cadastro',
      'user_deleted': 'Exclusão (Lixeira)',
      'user_restored': 'Restauração',
      'user_force_deleted': 'Exclusão Permanente',
      'login_success': 'Login realizado',
      'login_failed': 'Falha no Login',
      'logout_success': 'Logout realizado',
      'password_change': 'Alteração de Senha',
      'permission_change': 'Alteração de Nível',
      'status_change': 'Alteração de Status',
      'user_registered': 'Novo Registro',
      'integration_alloyal': 'Integração Alloyal',
      'integration_lsx': 'Integração LSX Medical',
      'organization_change': 'Troca de Organização',
      'owner_change': 'Troca de Proprietário',
    };
    return labels[type] || type;
  };

  const getEventColor = (type: string, description?: string) => {
    const isError = type.includes('failed') || 
                  type.includes('deleted') || 
                  (description && (
                    description.toLowerCase().includes('erro') || 
                    description.toLowerCase().includes('falha')
                  ));

    if (isError) return 'bg-red-500';
    if (type.includes('created') || type.includes('registered')) return 'bg-green-500';
    if (type.includes('updated')) return 'bg-amber-500';
    if (type.includes('integration')) return 'bg-indigo-500';
    return 'bg-primary';
  };

  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Histórico de Eventos
        </CardTitle>
        <Badge variant="outline" className="font-normal">
          {events.length} evento(s)
        </Badge>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground italic">
            <Clock className="h-8 w-8 mb-2 opacity-20" />
            <p>Nenhum evento registrado até o momento.</p>
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted before:to-transparent">
            {sortedEvents.map((event) => {
              const isExpanded = expandedEvents.has(event.id);
              const eventDate = new Date(event.created_at);

              return (
                <div key={event.id} className="relative pl-10">
                  {/* Dot */}
                  <div className={`absolute left-0 h-8 w-8 rounded-full border-4 border-background ${getEventColor(event.event_type, event.description)} flex items-center justify-center text-white shadow-sm ring-1 ring-black/5`}>
                    <Clock className="h-4 w-4" />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-semibold">
                          {getEventLabel(event.event_type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {eventDate.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      
                      {event.author && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full border border-muted">
                          <User className="h-3 w-3" />
                          <span>Por: <strong>{event.author.name}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="bg-muted/30 rounded-lg p-3 border border-muted/50 hover:bg-muted/50 transition-colors">
                      <p className="text-sm font-medium">{event.description || 'Nenhuma descrição disponível.'}</p>
                      
                      {canSeeTechnicalDetails && (event.from_data || event.to_data || event.payload || event.metadata) && (
                        <div className="mt-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs p-0 flex items-center gap-1 hover:bg-transparent text-primary hover:text-primary/80"
                            onClick={() => toggleExpand(event.id)}
                          >
                            {isExpanded ? (
                              <>Ocultar detalhes <ChevronUp className="h-3 w-3" /></>
                            ) : (
                              <>Ver detalhes técnicos <ChevronDown className="h-3 w-3" /></>
                            )}
                          </Button>
                          
                          {isExpanded && (
                            <div className="mt-3 space-y-3">
                              {event.from_data && (
                                <div className="space-y-1">
                                  <span className="text-[10px] uppercase font-bold text-muted-foreground">De:</span>
                                  <pre className="text-[11px] p-2 bg-slate-950 text-slate-50 rounded-md overflow-x-auto max-h-40 border border-slate-800">
                                    {JSON.stringify(event.from_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {event.to_data && (
                                <div className="space-y-1">
                                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Para:</span>
                                  <pre className="text-[11px] p-2 bg-slate-900 text-slate-50 rounded-md overflow-x-auto max-h-40 border border-slate-800">
                                    {JSON.stringify(event.to_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {!event.from_data && !event.to_data && (event.payload || event.metadata) && (
                                <pre className="text-[11px] p-2 bg-slate-950 text-slate-50 rounded-md overflow-x-auto max-h-40 border border-slate-800">
                                  {JSON.stringify(event.payload || event.metadata, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
