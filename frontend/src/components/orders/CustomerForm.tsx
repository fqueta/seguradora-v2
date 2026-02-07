import React, { useState } from "react";
import { CustomerInfo, FulfillmentType } from "@/types/orders";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Phone, User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export interface CustomerFormProps {
  value: CustomerInfo;
  fulfillmentType: FulfillmentType;
  onChange: (value: CustomerInfo) => void;
}

const formatPhone = (val: string) => {
  const v = val.replace(/\D/g, "").substring(0, 11);
  if (v.length > 10) return `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
  if (v.length > 6) return `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
  if (v.length > 2) return `(${v.substring(0, 2)}) ${v.substring(2)}`;
  return v;
};

const formatCep = (val: string) => {
  const v = val.replace(/\D/g, "").substring(0, 8);
  if (v.length > 5) return `${v.substring(0, 5)}-${v.substring(5)}`;
  return v;
};

export function CustomerForm({ value, fulfillmentType, onChange }: CustomerFormProps) {
  const { toast } = useToast();
  const [loadingCep, setLoadingCep] = useState(false);

  const set = (patch: Partial<CustomerInfo>) => onChange({ ...value, ...patch });
  const setAddress = (patch: Partial<NonNullable<CustomerInfo["address"]>>) => {
    const addr = value.address ?? {};
    onChange({ ...value, address: { ...addr, ...patch } });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    set({ phone: formatPhone(e.target.value) });
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress({ zip: formatCep(e.target.value) });
  };

  const fetchCep = async () => {
    const rawCep = value.address?.zip?.replace(/\D/g, "") ?? "";
    if (rawCep.length !== 8) {
      toast({ title: "CEP inválido", description: "O CEP deve conter 8 dígitos.", variant: "destructive" });
      return;
    }

    setLoadingCep(true);
    try {
      // Usando BrasilAPI (alternativa: Viacep)
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${rawCep}`);
      if (!res.ok) throw new Error("CEP não encontrado");
      
      const data = await res.json();
      setAddress({
        street: data.street,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
      });
      toast({ title: "Endereço encontrado", description: "Os campos foram preenchidos automaticamente." });
    } catch (error) {
      toast({ title: "Erro ao buscar CEP", description: "Verifique o CEP e tente novamente.", variant: "destructive" });
    } finally {
      setLoadingCep(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Nome <span className="text-destructive">*</span>
          </Label>
          <Input
            value={value.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Seu nome completo"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Telefone <span className="text-destructive">*</span>
          </Label>
          <Input
            value={value.phone}
            onChange={handlePhoneChange}
            placeholder="(00) 90000-0000"
            type="tel"
          />
        </div>
      </div>

      {fulfillmentType === FulfillmentType.Delivery && (
        <div className="border border-indigo-50 bg-indigo-50/30 rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-primary flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Endereço de Entrega
          </h3>
          
          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div className="space-y-2">
              <Label>CEP <span className="text-destructive">*</span></Label>
              <Input
                value={value.address?.zip ?? ""}
                onChange={handleCepChange}
                placeholder="00000-000"
                maxLength={9}
              />
            </div>
            <Button 
              type="button" 
              onClick={fetchCep} 
              disabled={loadingCep || (value.address?.zip?.length ?? 0) < 9}
              className="mb-[2px]"
            >
              {loadingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
            <div className="space-y-2">
              <Label>Rua <span className="text-destructive">*</span></Label>
              <Input
                value={value.address?.street ?? ""}
                onChange={(e) => setAddress({ street: e.target.value })}
                placeholder="Nome da rua"
              />
            </div>
            <div className="space-y-2">
              <Label>Número <span className="text-destructive">*</span></Label>
              <Input
                value={value.address?.number ?? ""}
                onChange={(e) => setAddress({ number: e.target.value })}
                placeholder="123"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bairro <span className="text-destructive">*</span></Label>
              <Input
                value={value.address?.neighborhood ?? ""}
                onChange={(e) => setAddress({ neighborhood: e.target.value })}
                placeholder="Bairro"
              />
            </div>
            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input
                value={value.address?.complement ?? ""}
                onChange={(e) => setAddress({ complement: e.target.value })}
                placeholder="Apto, Bloco, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-[2fr_1fr] gap-4">
            <div className="space-y-2">
              <Label>Cidade <span className="text-destructive">*</span></Label>
              <Input
                value={value.address?.city ?? ""}
                onChange={(e) => setAddress({ city: e.target.value })}
                placeholder="Cidade"
              />
            </div>
            <div className="space-y-2">
              <Label>UF <span className="text-destructive">*</span></Label>
              <Input
                value={value.address?.state ?? ""}
                onChange={(e) => setAddress({ state: e.target.value })}
                placeholder="UF"
                maxLength={2}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerForm;

