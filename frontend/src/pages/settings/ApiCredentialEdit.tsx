import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCredentialsService } from '@/services/apiCredentialsService';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import EditFooterBar from '@/components/ui/edit-footer-bar';

import { Eye, EyeOff } from 'lucide-react';

export default function ApiCredentialEdit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [url, setUrl] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [produto, setProduto] = useState('');
  const [meta, setMeta] = useState<{ key: string; value: string }[]>([]);
  const handleAddMeta = () => {
    setMeta((prev) => [...prev, { key: '', value: '' }]);
  };
  const handleMetaChange = (index: number, field: 'key' | 'value', value: string) => {
    setMeta((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };
  const handleRemoveMeta = (index: number) => {
    setMeta((prev) => prev.filter((_, i) => i !== index));
  };

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'api-credentials', 'get', id],
    queryFn: async () => apiCredentialsService.getOne(String(id)),
    enabled: !!id,
  });

  useEffect(() => {
    const d = (data?.data?.data || data?.data || {}) as any;
    if (d && d.id) {
      setName(String(d.name || ''));
      setActive(Boolean(d.active));
      const cfg = d.config || {};
      setUrl(String(cfg.url || ''));
      setUser(String(cfg.user || ''));
      setPass(String(cfg.pass || ''));
      setProduto(String(cfg.produto || ''));
      const metaArr = Array.isArray(d.meta) ? d.meta : [];
      setMeta(metaArr.map((m: any) => ({ key: String(m.key || ''), value: String(m.value || '') })));
    }
  }, [data]);

  const finishAfterSaveRef = React.useRef(true);

  const updateMutation = useMutation({
    mutationKey: ['settings', 'api-credentials', 'update', id],
    mutationFn: async () =>
      apiCredentialsService.update(String(id), {
        name,
        active,
        config: { url, user, pass, produto },
        meta: meta.filter((m) => m.key.trim() !== ''),
      }),
    onSuccess: (resp: any) => {
      toast.success('Credencial atualizada');
      const updated = (resp?.data?.data || resp?.data || null) as any;
      if (updated && id) {
        queryClient.setQueryData(['settings', 'api-credentials', 'get', id], { data: { data: updated } });
      }
      queryClient.invalidateQueries({ queryKey: ['settings', 'api-credentials', 'list'] });
      
      if (finishAfterSaveRef.current) {
        navigate('/admin/settings/integration');
      }
    },
    onError: (err: any) => {
      toast.error(String(err?.message || 'Falha ao atualizar credencial'));
    },
  });

  const handleSave = () => {
    if (!name || !url) {
        toast.error("Preencha todos os campos obrigatórios (Nome e URL)");
        return;
    }
    updateMutation.mutate();
  };

  const disabled = isLoading || updateMutation.isPending;

  return (
    <div className="container mx-auto py-6 pb-24 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Editar credencial</h1>
      </div>
      <Card>
        <CardHeader />
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-10">
              <label className="text-sm font-medium mb-1 block">Nome</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da credencial" />
            </div>
            <div className="md:col-span-2 flex items-end">
              <Button
                type="button"
                className="w-full"
                variant={active ? 'default' : 'secondary'}
                onClick={() => setActive(!active)}
              >
                {active ? 'Ativa' : 'Inativa'}
              </Button>
            </div>

            <div className="md:col-span-12">
              <label className="text-sm font-medium mb-1 block">URL</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.exemplo.com" />
            </div>

            <div className="md:col-span-6">
              <label className="text-sm font-medium mb-1 block">Usuário</label>
              <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Usuário de acesso" />
            </div>
            <div className="md:col-span-6">
              <label className="text-sm font-medium mb-1 block">Senha</label>
              <div className="relative">
                <Input 
                  type={showPass ? "text" : "password"} 
                  value={pass} 
                  onChange={(e) => setPass(e.target.value)} 
                  placeholder="••••••••" 
                  className="pr-10"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="md:col-span-12">
              <label className="text-sm font-medium mb-1 block">Produto (Opcional)</label>
              <Input value={produto} onChange={(e) => setProduto(e.target.value)} placeholder="Identificador do produto" />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-semibold text-base">Metacampos</h3>
                <p className="text-sm text-muted-foreground">Campos adicionais para configuração personalizada</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={handleAddMeta}>
                Adicionar campo
              </Button>
            </div>
            
            <div className="space-y-3">
              {meta.map((m, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="w-1/3">
                    <Input
                      value={m.key}
                      onChange={(e) => handleMetaChange(index, 'key', e.target.value)}
                      placeholder="Chave (ex: ambiente)"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      value={m.value}
                      onChange={(e) => handleMetaChange(index, 'value', e.target.value)}
                      placeholder="Valor"
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleRemoveMeta(index)}>
                    <span className="sr-only">Remover</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </Button>
                </div>
              ))}
              {meta.length === 0 && (
                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg dashed border border-muted">
                  Nenhum metacampo configurado
                </div>
              )}
            </div>
          </div>

        </CardContent>
      </Card>
      <EditFooterBar
        onBack={() => navigate('/admin/settings/integration')}
        onContinue={() => {
            finishAfterSaveRef.current = false;
            handleSave();
        }}
        onFinish={() => {
            finishAfterSaveRef.current = true;
            handleSave(); 
        }}
        disabled={disabled}
        fixed
      />
    </div>
  );
}
