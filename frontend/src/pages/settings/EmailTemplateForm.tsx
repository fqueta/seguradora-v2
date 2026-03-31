import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emailTemplatesService, EmailTemplate } from '@/services/emailTemplatesService';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Mail, Info, Code, Eye, Edit3, Send, Paperclip, Upload, X, FileText, ExternalLink } from 'lucide-react';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MediaLibraryModal } from '@/components/media/MediaLibraryModal';
import type { FileStorageItem } from '@/services/fileStorageService';
import { systemSettingsService } from '@/services/systemSettingsService';
import { authService } from '@/services/authService';
import { organizationService } from '@/services/organizationService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EmailTemplateForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isEdit = !!id;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'publish' | 'draft'>('publish');
  const [attachPdf, setAttachPdf] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isMediaLibOpen, setIsMediaLibOpen] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; url: string; path?: string } | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>('null'); // 'null' como string para o Select

  const { data: template, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ['settings', 'email-templates', 'detail', id],
    queryFn: () => emailTemplatesService.getById(id!),
    enabled: isEdit,
  });

  const user = authService.getStoredUser();
  const canAttach = user?.permission_id === '1' || Number(user?.permission_id) === 1;

  const { data: shortcodes } = useQuery({
    queryKey: ['settings', 'email-templates', 'shortcodes'],
    queryFn: () => emailTemplatesService.getShortcodes('contract'),
  });

  // Buscar configurações de branding e aparência para a moldura
  const { data: branding } = useQuery({
    queryKey: ['settings', 'public-branding'],
    queryFn: () => systemSettingsService.getPublicBranding(),
  });

  const { data: appearance } = useQuery({
    queryKey: ['settings', 'public-appearance'],
    queryFn: () => systemSettingsService.getPublicAppearance(),
  });

  const { data: organizations } = useQuery({
    queryKey: ['organizations', 'list', 'all'],
    queryFn: () => organizationService.list({ per_page: 100 }),
  });

  useEffect(() => {
    if (template) {
      setTitle(template.post_title || '');
      setSlug(template.post_name || '');
      setContent(template.post_content || '');
      setStatus(template.post_status || 'publish');
      
      try {
        const config = typeof template.config === 'string' 
          ? JSON.parse(template.config) 
          : (template.config || {});
        setAttachPdf(!!config.attach_pdf);
        if (config.attachment) {
          setAttachment(config.attachment);
        }
        setOrganizationId(template.organization_id ? String(template.organization_id) : 'null');
      } catch (e) {
        setAttachPdf(false);
      }
    }
  }, [template]);

  const { error: queryError } = { error: null as any }; // Placeholder para não quebrar tipagem se não for usar error do useQuery

  const mutation = useMutation({
    mutationFn: (data: Partial<EmailTemplate>) => 
      isEdit 
        ? emailTemplatesService.update(id!, data)
        : emailTemplatesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'email-templates'] });
      toast.success(isEdit ? 'Template atualizado' : 'Template criado');
      navigate('/admin/settings/email-templates');
    },
    onError: (err: any) => {
      toast.error(String(err?.message || 'Falha ao salvar template'));
    },
  });
  
  const testMutation = useMutation({
    mutationFn: () => emailTemplatesService.sendTest(testEmail, title, content, 'contract', {
      attach_pdf: attachPdf,
      attachment: (attachment && (attachment.path || attachment.url)) ? attachment : null,
    }),
    onSuccess: () => {
      toast.success('E-mail de teste enviado com sucesso!');
      setIsTestDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(String(err?.message || 'Falha ao enviar e-mail de teste'));
    },
  });

  const handleSave = () => {
    if (!title || !slug || !content) {
      toast.error('Preencha os campos obrigatórios (Assunto, Slug e Conteúdo)');
      return;
    }
    mutation.mutate({
      post_title: title,
      post_name: slug,
      post_content: content,
      post_status: status,
      config: {
        attach_pdf: attachPdf,
        attachment: (attachment && (attachment.path || attachment.url)) ? attachment : null,
      },
      organization_id: organizationId === 'null' ? null : organizationId,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF são permitidos.');
      return;
    }
    
    toast.info('Enviando arquivo...');
    try {
      const { fileStorageService } = await import('@/services/fileStorageService');
      const response: any = await fileStorageService.upload(file, {
        title: file.name.replace(/\.pdf$/i, ''),
        active: true,
      });
      
      // O response pode vir em diferentes formatos
      const data = response?.data || response;
      const filePath = data?.file?.path;
      const fileUrl = data?.file?.url || data?.url;
      const fileName = data?.file?.original || data?.title || file.name;
      
      if (filePath) {
        setAttachment({
          name: fileName,
          url: fileUrl || '',
          path: filePath,
        });
        toast.success(`Arquivo "${file.name}" enviado e anexado com sucesso!`);
      } else {
        toast.error('Arquivo enviado, mas o caminho não foi retornado. Tente pela Biblioteca de Mídia.');
      }
    } catch (err: any) {
      toast.error('Falha ao enviar arquivo: ' + (err?.message || 'Erro desconhecido'));
    }
  };

  const handleMediaSelect = (item: FileStorageItem) => {
    setAttachment({
      name: item.title || item.file?.original || `arquivo-${item.id}`,
      url: item.file?.url || item.url || '',
      path: item.file?.path,
    });
    setIsMediaLibOpen(false);
    toast.success('Arquivo da biblioteca selecionado.');
  };

  const insertShortcode = (code: string) => {
    const shortcode = `[${code}]`;
    setContent(prev => prev + shortcode);
    toast.info(`Shortcode ${shortcode} adicionado`);
  };

  const getPreviewContent = () => {
    let body = content;
    const institutionName = branding?.app_institution_name || 'Clube Yellow';
    const primaryColor = appearance?.ui_primary_color || '#952c9f';
    const logoUrl = branding?.app_logo_url;

    const dummyData = {
        client_name: 'Fernando Teste',
        user_name: 'Fernando Teste',
        client_email: 'cliente@exemplo.com',
        user_email: 'cliente@exemplo.com',
        contract_number: '2024-ABC-123',
        product_name: 'Plano Diamante Plus',
        start_date: '01/01/2024',
        end_date: '01/01/2025',
        value: 'R$ 450,00',
        company_name: institutionName,
        current_date: new Date().toLocaleDateString('pt-BR'),
    };

    Object.entries(dummyData).forEach(([key, value]) => {
      const regex = new RegExp(`\\[${key}\\]`, 'g');
      body = body.replace(regex, value);
    });

    const headerLogo = logoUrl 
        ? `<img src="${logoUrl}" alt="${institutionName}" style="max-height: 40px; width: auto; display: block; margin: 0 auto;">`
        : `<h1 style="margin:0; font-size: 20px; color: #111827; font-weight: 800;">${institutionName}</h1>`;

    return `
      <div style="background-color: #f8fafc; padding: 20px; font-family: sans-serif; border-radius: 8px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <div style="padding: 20px; text-align: center; border-bottom: 4px solid ${primaryColor};">
            ${headerLogo}
          </div>
          <div style="padding: 30px; line-height: 1.7; color: #334155; font-size: 15px;">
            ${body}
          </div>
        </div>
        <div style="max-width: 600px; margin: 0 auto; text-align: center; padding: 20px; color: #94a3b8; font-size: 11px;">
          <p style="margin: 0 0 5px; font-weight: 600;">&copy; ${institutionName}</p>
          <p style="margin: 0;">Este é um e-mail automático enviado pelo sistema de gestão.</p>
        </div>
      </div>
    `;
  };

  if (isEdit && isLoadingTemplate) {
    return <div className="container mx-auto py-10 text-center">Carregando template...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-5 max-w-7xl pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/5 via-transparent to-transparent p-4 -mx-4 rounded-xl">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate('/admin/settings/email-templates')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              {isEdit ? 'Editar Template' : 'Novo Template'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Configure o conteúdo, variáveis e anexos do e-mail.</p>
          </div>
        </div>
      </div>

      {/* Campos inline: Assunto + Slug + Status + Switch */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-x-5 gap-y-6 items-end">
            {/* Primeira Linha */}
            <div className="md:col-span-8 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assunto do E-mail</label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Ex: Seu contrato foi aprovado! 🎉" 
                className="h-10 focus-visible:ring-primary shadow-sm"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
              <div className="flex bg-muted p-0.5 rounded-md h-10 border border-border/50">
                <button 
                  className={`flex-1 px-2 text-[10px] uppercase font-bold rounded-sm transition-all ${status === 'publish' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setStatus('publish')}
                >
                  Público
                </button>
                <button 
                  className={`flex-1 px-2 text-[10px] uppercase font-bold rounded-sm transition-all ${status === 'draft' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setStatus('draft')}
                >
                  Rascunho
                </button>
              </div>
            </div>
            {canAttach && (
              <div className="md:col-span-2 flex items-end">
                <div className="flex items-center gap-2 w-full px-3 py-2 bg-primary/5 border border-primary/10 rounded-md h-10 shadow-sm">
                  <Switch 
                    id="attach-pdf" 
                    checked={attachPdf} 
                    onCheckedChange={setAttachPdf}
                    className="scale-90"
                  />
                  <label htmlFor="attach-pdf" className="text-[10px] font-bold cursor-pointer select-none leading-tight text-primary/70">
                    ANEXAR PDF
                  </label>
                </div>
              </div>
            )}

            {/* Segunda Linha: Slug e Organização dividindo o espaço igualmente */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                Tipo de Notificação <Badge variant="outline" className="text-[8px] py-0 px-1 border-primary/20 text-primary/60">Sistema</Badge>
              </label>
              <Select value={slug} onValueChange={setSlug} disabled={isEdit && slug === 'contract_approved'}>
                <SelectTrigger className="h-10 text-xs font-medium border-muted-foreground/20 bg-muted/10">
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract_approved" className="font-semibold text-primary">📑 Aprovação de Contrato</SelectItem>
                  <SelectItem value="welcome_email" className="font-medium">👋 Boas-vindas (Novo Usuário)</SelectItem>
                  <SelectItem value="generic" className="font-medium italic">✉️ Notificação Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-7 space-y-1.5">
              <label className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                🏠 Vincular à Organização
              </label>
              <Select value={organizationId || 'null'} onValueChange={setOrganizationId}>
                <SelectTrigger className="h-10 text-sm border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors">
                  <SelectValue placeholder="Configuração Global" />
                </SelectTrigger>
                <SelectContent className="border-primary/20 shadow-xl">
                  <SelectItem value="null" className="font-semibold text-primary">🌎 Geral / Global (Todos os clientes)</SelectItem>
                  {organizations?.data?.map((org) => (
                    <SelectItem key={org.id} value={String(org.id)} className="pl-8">🏢 {org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground italic">Selecione uma organização para tornar este template exclusivo ou deixe Global para todos.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 space-y-5">
          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="mb-3 bg-muted/50">
                <TabsTrigger value="edit" className="gap-1.5 text-xs data-[state=active]:shadow-sm">
                    <Edit3 className="h-3.5 w-3.5" /> Editor
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-1.5 text-xs data-[state=active]:shadow-sm">
                    <Eye className="h-3.5 w-3.5" /> Pré-visualização
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value="edit" className="space-y-5 mt-0">
                <Card className="shadow-sm overflow-hidden border-border/60">
                    <CardHeader className="py-2.5 px-4 border-b bg-muted/30">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Corpo da Mensagem</CardTitle>
                    </CardHeader>
                    <div className="p-0">
                        <RichTextEditor 
                            value={content} 
                            onChange={setContent} 
                            placeholder="Escreva o conteúdo do e-mail aqui..."
                        />
                    </div>
                </Card>

                {/* Seção de Anexo */}
                {canAttach && (
                    <Card className="shadow-sm border-border/60">
                        <CardHeader className="py-2.5 px-4 border-b bg-muted/30">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Paperclip className="h-3.5 w-3.5" /> Arquivo Anexo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-3 px-4">
                            {attachment ? (
                                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border border-red-200/50 dark:border-red-800/30 rounded-lg">
                                    <div className="flex items-center justify-center h-11 w-11 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg shrink-0 shadow-sm">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{attachment.name}</p>
                                        <p className="text-[10px] text-muted-foreground truncate font-mono">{attachment.path || 'Upload local'}</p>
                                    </div>
                                    {attachment.url && (
                                        <a 
                                            href={attachment.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary bg-background hover:bg-primary/10 border rounded-md transition-colors shrink-0 shadow-sm"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            Abrir
                                        </a>
                                    )}
                                    <Button 
                                        variant="ghost" size="icon" 
                                        className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10 shrink-0"
                                        onClick={() => { setAttachment(null); toast.info('Anexo removido.'); }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                            <Upload className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="text-center">
                                            <span className="text-xs font-semibold text-foreground">Upload de PDF</span>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">Selecione do computador</p>
                                        </div>
                                        <input 
                                            type="file" 
                                            accept="application/pdf" 
                                            className="hidden" 
                                            onChange={handleFileUpload} 
                                        />
                                    </label>
                                    <button 
                                        type="button"
                                        onClick={() => setIsMediaLibOpen(true)}
                                        className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                    >
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                            <FileText className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="text-center">
                                            <span className="text-xs font-semibold text-foreground">Biblioteca de Mídia</span>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">Selecione um arquivo existente</p>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </TabsContent>

            <TabsContent value="preview" className="mt-0">
                <Card className="shadow-sm border-border/60">
                    <CardHeader className="py-2.5 px-4 border-b bg-muted/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</span>
                            </div>
                            <Badge variant="secondary" className="text-[10px] font-mono">{slug || 'sem-slug'}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="max-w-2xl mx-auto">
                            {/* Simulação de inbox */}
                            <div className="bg-muted/30 rounded-t-lg p-3 border border-b-0 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">CY</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">{title || '(Sem assunto)'}</p>
                                    <p className="text-[10px] text-muted-foreground">Clube Yellow &lt;nao_responda@maisaqui.com.br&gt;</p>
                                </div>
                            </div>
                            <div className="border rounded-b-lg shadow-sm bg-white dark:bg-background overflow-hidden">
                                <div className="p-6 md:p-8 email-content-preview prose prose-sm max-w-none prose-blue overflow-auto min-h-[350px]" 
                                     dangerouslySetInnerHTML={{ __html: getPreviewContent() }} 
                                />
                                {attachment && (
                                    <div className="border-t px-6 py-3 bg-muted/20 flex items-center gap-2">
                                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">{attachment.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar de Variáveis */}
        <div className="lg:col-span-4">
          <Card className="shadow-sm sticky top-4 border-primary/15 overflow-hidden">
            <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/10">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-primary">
                <Code className="h-3.5 w-3.5" /> Variáveis de Dados
              </CardTitle>
            </CardHeader>
            <div className="px-4 py-2.5 border-b bg-muted/20">
              <div className="flex gap-2 items-start">
                <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Clique em uma variável para inserir no editor. O sistema preencherá automaticamente.
                </p>
              </div>
            </div>
            <ScrollArea className="h-[500px]">
              <div className="p-3 space-y-1.5">
                  {shortcodes && Object.entries(shortcodes).map(([key, label]) => (
                  <div 
                      key={key} 
                      onClick={() => insertShortcode(key)}
                      className="flex items-center justify-between p-2.5 bg-background hover:bg-primary/5 border hover:border-primary/30 rounded-md cursor-pointer transition-all group"
                  >
                      <div className="flex-1 min-w-0 mr-2">
                          <span className="text-xs font-semibold text-foreground block truncate">{label}</span>
                          <code className="text-[10px] text-primary/60 group-hover:text-primary font-mono">[{key}]</code>
                      </div>
                      <Badge variant="outline" className="text-[9px] py-0 h-5 border-primary/20 text-primary/60 group-hover:text-primary group-hover:border-primary/40 shrink-0 transition-colors">
                        Inserir
                      </Badge>
                  </div>
                  ))}
                  {!shortcodes && (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mb-3"></div>
                           <span className="text-xs">Carregando variáveis...</span>
                      </div>
                  )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>

      {/* Modal de Teste */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Enviar E-mail de Teste
            </DialogTitle>
            <DialogDescription>
              Visualize o resultado final diretamente na sua caixa de entrada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail do Destinatário</label>
              <Input 
                type="email" 
                placeholder="nome@exemplo.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="focus-visible:ring-primary"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">Os shortcodes serão preenchidos com dados de exemplo.</p>
            </div>
            {attachment && (
              <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-md border">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Anexo: <strong>{attachment.name}</strong></span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
                onClick={() => testMutation.mutate()} 
                disabled={testMutation.isPending || !testEmail}
                className="min-w-[120px] gap-2"
            >
              {testMutation.isPending ? 'Enviando...' : <><Send className="h-3.5 w-3.5" /> Enviar Agora</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MediaLibraryModal
        open={isMediaLibOpen}
        onClose={() => setIsMediaLibOpen(false)}
        onSelect={handleMediaSelect}
        defaultFilters={{ mime: 'application/pdf' }}
      />

      {/* Fixed bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-4 shadow-lg ring-1 ring-black/5">
        <div className="container mx-auto max-w-7xl flex items-center justify-between gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin/settings/email-templates')}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar para a lista</span>
            <span className="sm:hidden text-xs">Voltar</span>
          </Button>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsTestDialogOpen(true)} 
              className="gap-2 text-xs h-9 sm:h-10 px-4 transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <Send className="h-3.5 w-3.5 text-primary" /> 
              <span className="hidden sm:inline">Enviar E-mail de Teste</span>
              <span className="sm:hidden">Teste</span>
            </Button>
            
            <Button 
              onClick={handleSave} 
              disabled={mutation.isPending} 
              className="gap-2 min-w-[100px] h-9 sm:h-10 px-6 shadow-md transition-all active:scale-95"
            >
              {mutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> 
                  <span>{isEdit ? 'Salvar Alterações' : 'Criar Template'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
