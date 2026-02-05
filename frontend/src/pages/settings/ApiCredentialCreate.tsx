import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMutation } from '@tanstack/react-query';
import { apiCredentialsService } from '@/services/apiCredentialsService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { Eye, EyeOff } from 'lucide-react';

export default function ApiCredentialCreate() {
  const navigate = useNavigate();
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

  const createMutation = useMutation({
    mutationKey: ['settings', 'api-credentials', 'create'],
    mutationFn: async () =>
      apiCredentialsService.create({
        name,
        active,
        config: { url, user, pass, produto },
        meta: meta.filter((m) => m.key.trim() !== ''),
      }),
    onSuccess: () => {
      toast.success('Credencial criada');
      navigate('/admin/settings/integration');
    },
    onError: (err: any) => {
      toast.error(String(err?.message || 'Falha ao criar credencial'));
    },
  });

  const handleSave = () => {
    if (!name || !url) {
        toast.error("Preencha todos os campos obrigatórios (Nome e URL)");
        return;
    }
    createMutation.mutate();
  };

  const disabled = createMutation.isPending;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cadastrar credencial</h1>
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

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => navigate('/admin/settings/integration')}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={disabled}>
              Salvar Credencial
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
