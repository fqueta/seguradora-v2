import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useMesasList, useCreateMesa, useUpdateMesa, useDeleteMesa } from "@/hooks/mesas";
import type { Mesa, CreateMesaInput } from "@/types/mesas";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit, 
  Trash2, 
  QrCode, 
  Search, 
  ArrowRight, 
  Check, 
  Copy, 
  Download, 
  LayoutGrid, 
  Zap, 
  Info,
  Users,
  Grid3X3,
  Loader2
} from "lucide-react";

import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

/**
 * Mesas
 * pt-BR: Página de gerenciamento de mesas com visual Premium, cards interativos e geração de QR Code.
 */
export default function Mesas() {
  const { data: mesasData, isLoading, error, refetch } = useMesasList();
  
  const createMutation = useCreateMesa({
    onSuccess: () => {
      setIsDialogOpen(false);
      setEditing(null);
      refetch();
      setFormState({ name: "", description: "", capacity: undefined, active: true });
      toast.success("Mesa criada com sucesso!");
    }
  });

  const updateMutation = useUpdateMesa({
    onSuccess: () => {
      setIsDialogOpen(false);
      setEditing(null);
      refetch();
      setFormState({ name: "", description: "", capacity: undefined, active: true });
      toast.success("Mesa atualizada com sucesso!");
    }
  });

  const deleteMutation = useDeleteMesa({
    onSuccess: () => {
      refetch();
      toast.success("Mesa excluída com sucesso!");
    }
  });

  const mesas: Mesa[] = Array.isArray(mesasData) ? mesasData : mesasData?.data || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Mesa | null>(null);
  const [formState, setFormState] = useState<CreateMesaInput>({
    name: "",
    description: "",
    capacity: undefined,
    active: true,
  });
  const [qrCodeMesa, setQrCodeMesa] = useState<Mesa | null>(null);

  const getMenuUrl = (token: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/menu?mesa=${token}`;
  };

  const downloadQRCode = (mesa: Mesa) => {
    const svg = document.getElementById(`qr-code-${mesa.id}`);
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 140;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        
        ctx.fillStyle = "#000000";
        ctx.font = "bold 24px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(mesa.name.toUpperCase(), canvas.width / 2, img.height + 60);
        
        ctx.fillStyle = "#666666";
        ctx.font = "14px Inter, system-ui, sans-serif";
        ctx.fillText("ESCANEIE PARA VER O CARDÁPIO", canvas.width / 2, img.height + 95);
      }
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `qrcode-${mesa.slug}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const filtered = mesas.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setFormState({ name: "", description: "", capacity: undefined, active: true });
    setIsDialogOpen(true);
  };

  const openEdit = (mesa: Mesa) => {
    setEditing(mesa);
    setFormState({
      name: mesa.name,
      description: mesa.description || "",
      capacity: mesa.capacity,
      active: mesa.active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (mesa: Mesa) => {
    if (confirm("Deseja realmente excluir esta mesa?")) {
       await deleteMutation.mutateAsync(mesa.id);
    }
  };

  const submitForm = async () => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: formState });
    } else {
      await createMutation.mutateAsync(formState);
    }
  };

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
      
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2 pt-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Grid3X3 className="h-6 w-6 text-primary" />
            </div>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest py-0.5 border-primary/20 bg-primary/5 text-primary">
              Mapeamento Físico
            </Badge>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Gestão de Mesas</h1>
          <p className="text-muted-foreground mt-1 font-medium italic">Configure o layout do seu restaurante e gere QR Codes para pedidos autônomos.</p>
        </div>

        <Button 
          onClick={openCreate}
          className="h-14 px-8 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 gap-3 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Nova Mesa
        </Button>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
         <Card className="rounded-[2rem] border-none shadow-lg shadow-gray-100/30 overflow-hidden bg-white group">
            <CardContent className="p-6 flex items-center gap-5">
               <div className="p-4 rounded-2xl bg-primary text-white shadow-lg">
                  <Grid3X3 className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Disponível</span>
                  <span className="text-3xl font-black text-gray-900 leading-none">{mesas.length}</span>
               </div>
            </CardContent>
         </Card>
         <Card className="rounded-[2rem] border-none shadow-lg shadow-gray-100/30 overflow-hidden bg-white group">
            <CardContent className="p-6 flex items-center gap-5">
               <div className="p-4 rounded-2xl bg-emerald-500 text-white shadow-lg">
                  <Plus className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Mesas Ativas</span>
                  <span className="text-3xl font-black text-gray-900 leading-none">{mesas.filter(m => m.active).length}</span>
               </div>
            </CardContent>
         </Card>
         <Card className="rounded-[2rem] border-none shadow-lg shadow-gray-100/30 overflow-hidden bg-white group">
            <CardContent className="p-6 flex items-center gap-5">
               <div className="p-4 rounded-2xl bg-indigo-500 text-white shadow-lg">
                  <Users className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Capacidade Total</span>
                  <span className="text-3xl font-black text-gray-900 leading-none">{mesas.reduce((acc, m) => acc + (m.capacity || 0), 0)}</span>
               </div>
            </CardContent>
         </Card>
      </div>

      {/* Filtros Glassmorphism */}
      <Card className="rounded-[2.5rem] border-none shadow-lg shadow-gray-100/30 bg-white/50 backdrop-blur-md overflow-hidden p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="relative group flex-1 w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar mesas pelo nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 rounded-2xl border-gray-100 bg-white shadow-sm font-bold focus:shadow-md transition-all"
              />
           </div>
           
           <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-6 py-2 rounded-full border-gray-200 bg-white text-gray-400 font-black text-[10px] uppercase tracking-widest shadow-sm">
                 Resultados: {filtered.length}
              </Badge>
           </div>
        </div>
      </Card>

      {/* Grid de Mesas Interactive */}
      <div className="pb-20">
        {isLoading ? (
          <div className="py-40 text-center flex flex-col items-center gap-4">
             <Loader2 className="w-12 h-12 text-primary animate-spin" />
             <p className="font-black text-gray-400 uppercase tracking-widest text-[11px]">Sincronizando Mapeamento...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-40 text-center border-4 border-dashed rounded-[4rem] border-gray-100 bg-gray-50/50">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-gray-100/50">
                <Search className="w-10 h-10 text-gray-200" />
             </div>
             <p className="text-2xl font-black text-gray-900">Nenhuma mesa encontrada</p>
             <p className="text-sm text-gray-400 mt-2 font-medium">Ajuste os filtros ou inicie o cadastro de novos assentos.</p>
             <Button onClick={openCreate} variant="outline" className="mt-8 rounded-full border-2 font-black uppercase text-[10px] tracking-widest px-8">Criar Primeira Mesa</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {filtered.map((m) => (
              <Card 
                key={m.id} 
                className="group relative rounded-[2.5rem] border-none shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden bg-white"
              >
                <CardContent className="p-8">
                  {/* Visual Table Representation */}
                  <div className="mb-8 relative flex justify-center">
                     <div className={cn(
                       "w-24 h-24 rounded-[2rem] flex items-center justify-center transition-all group-hover:scale-110 duration-500 shadow-xl",
                       m.active ? 'bg-primary text-white shadow-primary/20' : 'bg-gray-100 text-gray-300 shadow-none'
                     )}>
                        <div className="relative">
                           <div className="w-14 h-12 border-4 border-current rounded-2xl opacity-80"></div>
                           <div className="absolute -top-1 -left-3 w-4 h-4 rounded-full bg-current opacity-40"></div>
                           <div className="absolute -top-1 -right-3 w-4 h-4 rounded-full bg-current opacity-40"></div>
                           <div className="absolute -bottom-1 -left-3 w-4 h-4 rounded-full bg-current opacity-40"></div>
                           <div className="absolute -bottom-1 -right-3 w-4 h-4 rounded-full bg-current opacity-40"></div>
                        </div>
                     </div>
                     <Badge className={cn(
                       "absolute -top-2 -right-2 rounded-full h-11 w-11 flex items-center justify-center border-4 border-white font-black text-sm shadow-lg",
                       m.active ? 'bg-emerald-500 text-white' : 'bg-gray-400 text-white'
                     )}>
                        {m.capacity || '?'}
                     </Badge>
                  </div>

                  <div className="text-center space-y-2 mb-8">
                    <h3 className="text-2xl font-black text-gray-900 leading-tight tracking-tight">{m.name}</h3>
                    <div className="flex items-center justify-center gap-2">
                       <div className={cn("h-1.5 w-1.5 rounded-full", m.active ? "bg-emerald-500 animate-pulse" : "bg-gray-300")} />
                       <p className={cn("text-[9px] font-black uppercase tracking-widest", m.active ? "text-emerald-500" : "text-gray-400")}>
                          {m.active ? 'Assento Ativo' : 'Indisponível'}
                       </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setQrCodeMesa(m)}
                      className="h-12 w-full rounded-2xl bg-gray-50 hover:bg-primary hover:text-white transition-all shadow-sm"
                      title="QR Code"
                    >
                      <QrCode className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => openEdit(m)}
                      className="h-12 w-full rounded-2xl bg-gray-50 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                      title="Editar"
                    >
                      <Edit className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(m)}
                      className="h-12 w-full rounded-2xl bg-gray-50 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      title="Excluir"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="absolute bottom-6 left-0 right-0 text-center group-hover:hidden animate-in fade-in duration-700">
                     <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none">Interações Disponíveis</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog de Formulário Premium */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 border-none rounded-[3rem] overflow-hidden shadow-2xl">
          <div className="bg-primary p-12 text-white relative">
             <div className="absolute top-0 right-0 p-8 opacity-10">
                <Grid3X3 className="w-32 h-32" />
             </div>
             <DialogHeader className="relative z-10 text-left">
               <DialogTitle className="text-3xl font-black tracking-tight flex items-center gap-4">
                 {editing ? <Edit className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
                 {editing ? 'Editar Mesa' : 'Configurar Mesa'}
               </DialogTitle>
               <DialogDescription className="text-white/70 font-bold uppercase tracking-widest text-[11px] mt-2">
                 Cadastre novas entidades físicas para o salão.
               </DialogDescription>
             </DialogHeader>
          </div>

          <div className="p-10 bg-white space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Identificação / Nome</label>
                <Input
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="Ex.: Mesa 01, VIP, Terraço..."
                  className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Lotação (Pessoas)</label>
                <Input
                  type="number"
                  value={formState.capacity ?? ''}
                  onChange={(e) => setFormState({ ...formState, capacity: Number(e.target.value) || undefined })}
                  placeholder="Ex.: 4"
                  className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold shadow-inner"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Observações Internas</label>
              <Input
                value={formState.description || ''}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                placeholder="Ex.: Perto da janela, Área de fumantes..."
                className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between p-6 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
               <div>
                  <p className="font-black text-gray-800">Mesa Disponível para Pedidos?</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Controle a visibilidade no terminal do cliente</p>
               </div>
               <Badge className={cn(
                 "px-4 py-2 rounded-xl border-none font-black text-[10px] uppercase shadow-sm cursor-pointer transition-all",
                 formState.active ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
               )} onClick={() => setFormState({ ...formState, active: !formState.active })}>
                  {formState.active ? "Ativada" : "Desativada"}
               </Badge>
            </div>

            <DialogFooter className="flex gap-4 sm:justify-start">
               <Button variant="ghost" className="flex-1 h-16 rounded-2xl font-black uppercase text-xs text-gray-400" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
               <Button onClick={submitForm} className="flex-[2] h-16 rounded-2xl font-black uppercase text-xs tracking-widest gap-3 shadow-xl shadow-primary/20">
                  <Zap className="w-5 h-5" />
                  {editing ? 'Salvar Alterações' : 'Confirmar Cadastro'}
               </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog Premium */}
      <Dialog open={!!qrCodeMesa} onOpenChange={() => setQrCodeMesa(null)}>
        <DialogContent className="sm:max-w-[500px] p-0 border-none rounded-[3rem] overflow-hidden shadow-2xl">
          <div className="bg-slate-900 p-12 text-white text-center relative">
             <div className="absolute top-0 left-0 p-8 opacity-10">
                <QrCode className="w-32 h-32" />
             </div>
             <DialogTitle className="text-3xl font-black tracking-tight mb-2">Canal do Cliente</DialogTitle>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">Gerador de Link Dinâmico - {qrCodeMesa?.name}</p>
          </div>

          <div className="p-12 flex flex-col items-center bg-white">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-8 border-gray-50 relative group">
              {qrCodeMesa && (
                <QRCodeSVG
                  id={`qr-code-${qrCodeMesa.id}`}
                  value={getMenuUrl(qrCodeMesa.token)}
                  size={200}
                  level="H"
                  includeMargin={true}
                  className="transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
            
            <div className="mt-10 w-full space-y-6">
              <div className="text-center">
                <Badge variant="outline" className="border-gray-100 bg-gray-50 h-8 px-4 font-black text-gray-400 text-[10px] uppercase tracking-tighter truncate w-full justify-center">
                  {qrCodeMesa && getMenuUrl(qrCodeMesa.token)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                   className="h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 border-2"
                  onClick={() => {
                    if (qrCodeMesa) {
                      navigator.clipboard.writeText(getMenuUrl(qrCodeMesa.token));
                      toast.success("Link copiado!");
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copiar Link
                </Button>
                <Button 
                   className="h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-primary/20"
                  onClick={() => qrCodeMesa && downloadQRCode(qrCodeMesa)}
                >
                  <Download className="h-4 w-4" />
                  Download PNG
                </Button>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                 <Info className="w-5 h-5 text-blue-500" />
                 <p className="text-[10px] font-bold text-blue-600 leading-tight uppercase tracking-tight">Imprima este QR Code e coloque sobre a mesa para que o cliente realize pedidos automaticamente.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
