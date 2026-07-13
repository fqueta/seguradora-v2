import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";

import QuickClientForm from "@/components/serviceOrders/QuickClientForm";

interface CreatedClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export default function QuickCreateServiceOrder() {
  const navigate = useNavigate();
  const [createdClient, setCreatedClient] = useState<CreatedClient | null>(null);

  const handleClientCreated = (client: CreatedClient) => {
    setCreatedClient(client);
    toast.success("Cliente cadastrado com sucesso!");
  };

  const handleFinish = () => {
    if (createdClient) {
      navigate("/admin/service-orders/create", {
        state: {
          quickCreate: true,
          clientId: createdClient.id,
        }
      });
    }
  };

  const handleCancel = () => {
    navigate("/admin/service-orders");
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Cadastro Rápido</h1>
            <p className="text-gray-600">
              Crie um cliente e depois inicie a ordem de serviço
            </p>
          </div>
        </div>
      </div>

      {!createdClient ? (
        <Card>
          <CardContent className="p-6">
            <QuickClientForm
              onClientCreated={handleClientCreated}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-semibold text-green-600">
                  Cliente Cadastrado com Sucesso!
                </h3>
                <p className="text-gray-600">
                  Agora você será redirecionado para criar a ordem de serviço ou orçamento.
                </p>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Cliente Criado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="font-medium">{createdClient?.name}</p>
                    {createdClient?.email && (
                      <p className="text-sm text-gray-600">{createdClient.email}</p>
                    )}
                    {createdClient?.phone && (
                      <p className="text-sm text-gray-600">{createdClient.phone}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setCreatedClient(null)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cadastrar outro cliente
                </Button>
                <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700">
                  Criar Ordem de Serviço
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
