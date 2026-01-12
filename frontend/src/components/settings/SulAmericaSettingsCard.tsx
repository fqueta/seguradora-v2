
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Save } from "lucide-react";
import { toast } from "sonner";

interface SulAmericaSettingsCardProps {
  option: any;
  value: string;
  onChange: (id: number, newValue: string) => void;
  onSave: () => void;
  isLoading: boolean;
}

export function SulAmericaSettingsCard({ option, value, onChange, onSave, isLoading }: SulAmericaSettingsCardProps) {
  const [params, setParams] = useState({
    url: "",
    user: "",
    pass: "",
    produto: ""
  });

  useEffect(() => {
    try {
      if (value) {
        const parsed = JSON.parse(value);
        setParams({
            url: parsed.url || "",
            user: parsed.user || "",
            pass: parsed.pass || "",
            produto: parsed.produto || ""
        });
      }
    } catch (e) {
      console.error("Erro ao fazer parse das credenciais SulAmerica", e);
    }
  }, [value]);

  const handleChange = (field: keyof typeof params, newValue: string) => {
    const newParams = { ...params, [field]: newValue };
    setParams(newParams);
    onChange(option.id, JSON.stringify(newParams));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Api Sulamerica</span>
        </CardTitle>
        <CardDescription>
          Configure as credenciais para integração com a API da SulAmérica.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sa_url">Url</Label>
          <Input
            id="sa_url"
            value={params.url}
            onChange={(e) => handleChange("url", e.target.value)}
            placeholder="https://canalvenda-internet-develop.executivoslab.com.br/services/canalvenda?wsdl"
          />
        </div>
        
        <div className="space-y-2">
            <Label htmlFor="sa_user">Usuario</Label>
            <Input
                id="sa_user"
                value={params.user}
                onChange={(e) => handleChange("user", e.target.value)}
                placeholder="Ex: usuario_api"
            />
        </div>

        <div className="space-y-2">
            <Label htmlFor="sa_pass">senha</Label>
            <Input
                id="sa_pass"
                type="password"
                value={params.pass}
                onChange={(e) => handleChange("pass", e.target.value)}
                placeholder="••••••••"
            />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sa_produto">Produto</Label>
          <Input
            id="sa_produto"
            value={params.produto}
            onChange={(e) => handleChange("produto", e.target.value)}
            placeholder="Ex: 10232"
          />
        </div>

        <div className="flex justify-end pt-4 border-t">
            <Button 
                onClick={onSave}
                disabled={isLoading}
                className="flex items-center space-x-2"
            >
                <Save className="h-4 w-4" />
                <span>{isLoading ? 'Salvando...' : 'Salvar Integração'}</span>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
