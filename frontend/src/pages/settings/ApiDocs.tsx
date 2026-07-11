import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Copy, Check, Key, HelpCircle, ArrowRight, Server, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ParamInfo {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface EndpointDoc {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  headers?: Record<string, string>;
  pathParams?: ParamInfo[];
  queryParams?: ParamInfo[];
  requestBody?: string;
  responseStatus: string;
  responseBody: string;
}

export default function ApiDocs() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [snippetLang, setSnippetLang] = useState<'curl' | 'js' | 'php'>('curl');
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');

  const sandboxUrl = 'https://api-yellowdev.maisaqui.com.br/api/v1';
  const productionUrl = 'https://api-yellow.maisaqui.com.br/api/v1';
  const baseUrl = environment === 'sandbox' ? sandboxUrl : productionUrl;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'POST':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'PUT':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return '';
    }
  };

  const generateSnippet = (lang: 'curl' | 'js' | 'php', endpoint: EndpointDoc) => {
    const fullUrl = `${baseUrl}${endpoint.path}`;
    const hasBody = !!endpoint.requestBody;
    const bodyStr = hasBody ? JSON.stringify(JSON.parse(endpoint.requestBody || '{}'), null, 2) : '';

    if (lang === 'curl') {
      let snippet = `curl -X ${endpoint.method} "${fullUrl}" \\\n  -H "Accept: application/json"`;
      if (endpoint.path !== '/login') {
        snippet += ` \\\n  -H "Authorization: Bearer <SEU_TOKEN_AQUI>"`;
      }
      if (hasBody) {
        snippet += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${bodyStr.replace(/'/g, "'\\''")}'`;
      }
      return snippet;
    }

    if (lang === 'js') {
      let headersObj: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (endpoint.path !== '/login') {
        headersObj['Authorization'] = 'Bearer <SEU_TOKEN_AQUI>';
      }
      if (hasBody) {
        headersObj['Content-Type'] = 'application/json';
      }

      let snippet = `fetch("${fullUrl}", {\n  method: "${endpoint.method}",\n  headers: ${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')}`;
      if (hasBody) {
        snippet += `,\n  body: JSON.stringify(${bodyStr.replace(/\n/g, '\n  ')})`;
      }
      snippet += `\n})\n.then(response => response.json())\n.then(data => console.log(data))\n.catch(error => console.error('Erro:', error));`;
      return snippet;
    }

    if (lang === 'php') {
      let snippet = `<?php\n\n$client = new \\GuzzleHttp\\Client();\n\n$response = $client->request('${endpoint.method}', '${fullUrl}', [\n  'headers' => [\n    'Accept' => 'application/json',\n`;
      if (endpoint.path !== '/login') {
        snippet += `    'Authorization' => 'Bearer <SEU_TOKEN_AQUI>',\n`;
      }
      if (hasBody) {
        snippet += `    'Content-Type' => 'application/json',\n`;
      }
      snippet += `  ]`;
      if (hasBody) {
        snippet += `,\n  'json' => [\n`;
        const bodyObj = JSON.parse(endpoint.requestBody || '{}');
        Object.entries(bodyObj).forEach(([k, v]) => {
          const val = typeof v === 'string' ? `'${v}'` : v;
          snippet += `    '${k}' => ${val},\n`;
        });
        snippet += `  ]`;
      }
      snippet += `\n]);\n\necho $response->getBody();`;
      return snippet;
    }

    return '';
  };

  const loginDoc: EndpointDoc = {
    method: 'POST',
    path: '/login',
    description: 'Efetua a autenticação do usuário ou credencial de API externa e retorna o token de acesso Bearer.',
    requestBody: JSON.stringify({
      email: 'usuario@exemplo.com',
      password: 'senha_segura_123',
      local: 'api'
    }),
    responseStatus: '200 OK',
    responseBody: JSON.stringify({
      user: {
        id: "019be6ab-42b8-73f4-a900-bbef2fcb6a62",
        tipo_pessoa: "pf",
        name: "Douglas Alvares",
        razao: "",
        cpf: null,
        cnpj: null,
        email: "douglas.alvares@gmail.com",
        celular: null,
        email_verified_at: null,
        status: "actived",
        genero: "ni",
        verificado: "n",
        permission_id: 3,
        client_permission: [],
        created_at: "2026-01-22T17:05:42.000000Z",
        updated_at: "2026-01-23T21:35:39.000000Z",
        config: "{\"celular\":\"\",\"telefone_comercial\":\"\",\"nascimento\":\"\",\"cep\":\"\",\"endereco\":\"\",\"numero\":\"\",\"complemento\":\"\",\"bairro\":\"\",\"cidade\":\"\",\"uf\":\"\",\"nome_fantasia\":\"\",\"telefone_residencial\":\"\",\"rg\":\"\",\"escolaridade\":\"\",\"profissao\":\"\",\"tipo_pj\":\"\"}",
        preferencias: [],
        foto_perfil: null,
        ativo: "s",
        autor: "019be1de-b7a4-71ad-b2b6-8ee58c11d972",
        excluido: "n",
        reg_excluido: null,
        deletado: "n",
        reg_deletado: null,
        organization_id: 1,
        organization: {
          id: 1,
          name: "FullLife Digital Health Ltda",
          document: "63.121.689/0001-22",
          email: "douglas.alvares@gmail.com",
          phone: null,
          address: null,
          active: true,
          config: {
            cep: null,
            endereco: "Travessa Antônio Francisco Alves",
            numero: "52",
            complemento: "Apto 401",
            bairro: "Ingleses do Rio Vermelho",
            cidade: "Florianópolis",
            uf: "SC",
            allowed_products: [
              "12"
            ]
          },
          created_at: "2026-01-23T14:38:40.000000Z",
          updated_at: "2026-01-23T21:37:25.000000Z"
        }
      },
      token: "157|E90bghb89Kq9gO6Zi0xvp0Y0sMrVusE1XL6o7R5Z5cc69420",
      menu: [],
      organization: 1
    }, null, 2)
  };

  const clientsDocs: EndpointDoc[] = [
    {
      method: 'GET',
      path: '/clients',
      description: 'Retorna a listagem paginada e filtrável de todos os clientes cadastrados.',
      queryParams: [
        { name: 'search', type: 'string', required: false, description: 'Busca por nome, CPF/CNPJ, e-mail ou código.' },
        { name: 'ativo', type: 'string', required: false, description: 'Filtra por status: "s" (ativo) ou "n" (inativo).' },
        { name: 'page', type: 'integer', required: false, description: 'Número da página de paginação (padrão: 1).' }
      ],
      responseStatus: '200 OK',
      responseBody: JSON.stringify({
        current_page: 1,
        data: [
          {
            id: 15,
            name: 'Patricia Brandão',
            cpf: '850.264.450-55',
            email: 'exemplo@email.com',
            genero: 'f',
            status: 'actived',
            tipo_pessoa: 'pf',
            created_at: '2026-05-12T14:32:00.000000Z'
          }
        ],
        first_page_url: '...',
        from: 1,
        last_page: 10,
        per_page: 10,
        total: 98
      }, null, 2)
    },
    {
      method: 'GET',
      path: '/clients',
      description: 'Consulta de Clientes por CPF / Filtros Avançados (Enviando JSON no corpo da requisição).',
      requestBody: JSON.stringify({
        page: '1',
        per_page: '50',
        search: '85026445055',
        order_by: 'name',
        order: 'asc'
      }, null, 2),
      responseStatus: '200 OK',
      responseBody: JSON.stringify({
        current_page: 1,
        data: [
          {
            id: 15,
            name: 'Patricia Brandão',
            cpf: '850.264.450-55',
            email: 'exemplo@email.com',
            genero: 'f',
            status: 'actived',
            tipo_pessoa: 'pf',
            created_at: '2026-05-12T14:32:00.000000Z'
          }
        ],
        total: 1
      }, null, 2)
    },
    {
      method: 'POST',
      path: '/clients',
      description: 'Cadastra um novo cliente no sistema. Requer validação do CPF/CNPJ e formato dos dados.',
      requestBody: JSON.stringify({
        name: 'Patricia Brandão',
        cpf: '850.264.450-55',
        email: 'exemplo@email.com',
        genero: 'f',
        status: 'actived',
        tipo_pessoa: 'pf',
        config: {
          bairro: 'Jardim Universitário',
          celular: '',
          cep: '78075-420',
          cidade: 'Cuiabá',
          complemento: '',
          endereco: 'Rua Coletora 1',
          escolaridade: '',
          funnelId: '',
          nascimento: '1969-11-04',
          nome_fantasia: '',
          numero: '56',
          observacoes: '',
          profissao: '',
          rg: '',
          stage_id: '',
          telefone_residencial: '',
          uf: 'MT'
        }
      }, null, 2),
      responseStatus: '201 Created',
      responseBody: JSON.stringify({
        status: 201,
        message: 'Cliente cadastrado com sucesso',
        data: {
          id: 16,
          name: 'Patricia Brandão',
          cpf: '850.264.450-55',
          email: 'exemplo@email.com',
          genero: 'f',
          status: 'actived',
          tipo_pessoa: 'pf',
          config: {
            bairro: 'Jardim Universitário',
            celular: '',
            cep: '78075-420',
            cidade: 'Cuiabá',
            complemento: '',
            endereco: 'Rua Coletora 1',
            escolaridade: '',
            funnelId: '',
            nascimento: '1969-11-04',
            nome_fantasia: '',
            numero: '56',
            observacoes: '',
            profissao: '',
            rg: '',
            stage_id: '',
            telefone_residencial: '',
            uf: 'MT'
          },
          created_at: '2026-07-10T17:48:00.000000Z',
          updated_at: '2026-07-10T17:48:00.000000Z'
        }
      }, null, 2)
    },
    {
      method: 'GET',
      path: '/clients/{id}',
      description: 'Recupera os detalhes completos de um cliente específico pelo ID.',
      pathParams: [
        { name: 'id', type: 'integer', required: true, description: 'ID identificador exclusivo do cliente.' }
      ],
      responseStatus: '200 OK',
      responseBody: JSON.stringify({
        id: 15,
        name: 'Patricia Brandão',
        cpf: '850.264.450-55',
        email: 'exemplo@email.com',
        genero: 'f',
        status: 'actived',
        tipo_pessoa: 'pf',
        config: {
          bairro: 'Jardim Universitário',
          cep: '78075-420',
          cidade: 'Cuiabá',
          endereco: 'Rua Coletora 1',
          nascimento: '1969-11-04',
          numero: '56',
          uf: 'MT'
        },
        created_at: '2026-05-12T14:32:00.000000Z',
        updated_at: '2026-06-01T10:15:30.000000Z'
      }, null, 2)
    },
    {
      method: 'PUT',
      path: '/clients/{id}',
      description: 'Atualiza os dados de um cliente existente pelo ID.',
      pathParams: [
        { name: 'id', type: 'integer', required: true, description: 'ID do cliente a ser atualizado.' }
      ],
      requestBody: JSON.stringify({
        name: 'Patricia Brandão Reis',
        email: 'novoemail@email.com'
      }),
      responseStatus: '200 OK',
      responseBody: JSON.stringify({
        status: 200,
        message: 'Cliente atualizado com sucesso',
        data: {
          id: 15,
          name: 'Patricia Brandão Reis',
          cpf: '850.264.450-55',
          email: 'novoemail@email.com',
          genero: 'f',
          status: 'actived',
          tipo_pessoa: 'pf',
          updated_at: '2026-07-10T17:50:00.000000Z'
        }
      }, null, 2)
    },
    {
      method: 'DELETE',
      path: '/clients/{id}',
      description: 'Exclui de forma lógica (soft delete) um cliente pelo ID.',
      pathParams: [
        { name: 'id', type: 'integer', required: true, description: 'ID do cliente a ser excluído.' }
      ],
      responseStatus: '200 OK',
      responseBody: JSON.stringify({
        status: 200,
        message: 'Cliente excluído com sucesso'
      }, null, 2)
    }
  ];

  const contractsDocs: EndpointDoc[] = [
    {
      method: 'GET',
      path: '/contracts',
      description: 'Retorna a listagem paginada de todos os contratos cadastrados no sistema.',
      queryParams: [
        { name: 'client_id', type: 'integer', required: false, description: 'Filtra contratos de um cliente específico.' },
        { name: 'status', type: 'string', required: false, description: 'Filtra por status: "ativo", "suspenso", "cancelado".' },
        { name: 'page', type: 'integer', required: false, description: 'Número da página.' }
      ],
      responseStatus: '200 OK',
      responseBody: JSON.stringify({
        current_page: 1,
        data: [
          {
            id: 8,
            client_id: 15,
            numero_contrato: 'CONT-2026-0087',
            valor: 1500.00,
            status: 'ativo',
            data_inicio: '2026-01-01',
            data_fim: '2027-01-01',
            created_at: '2026-01-01T08:00:00.000000Z'
          }
        ],
        total: 15
      }, null, 2)
    },
    {
      method: 'POST',
      path: '/contracts',
      description: 'Gera e cadastra um novo contrato para um cliente.',
      requestBody: JSON.stringify({
        client_id: '019cbf21-ebe2-7085-9f3c-5cd5918c66b4',
        end_date: '2027-01-10',
        product_id: '12',
        start_date: '2026-01-10',
        status: 'pending',
        value: 0
      }, null, 2),
      responseStatus: '201 Created',
      responseBody: JSON.stringify({
        status: 201,
        message: 'Contrato gerado com sucesso',
        data: {
          id: 9,
          client_id: '019cbf21-ebe2-7085-9f3c-5cd5918c66b4',
          product_id: '12',
          numero_contrato: 'CONT-2026-0099',
          value: 0,
          status: 'pending',
          start_date: '2026-01-10',
          end_date: '2027-01-10',
          created_at: '2026-07-10T17:48:00.000000Z'
        }
      }, null, 2)
    },
    {
      method: 'GET',
      path: '/contracts/{id}',
      description: 'Recupera os detalhes completos de um contrato específico pelo ID.',
      pathParams: [
        { name: 'id', type: 'integer', required: true, description: 'ID identificador exclusivo do contrato.' }
      ],
      responseStatus: '200 OK',
      responseBody: JSON.stringify({
        id: 8,
        client_id: 15,
        numero_contrato: 'CONT-2026-0087',
        valor: 1500.00,
        status: 'ativo',
        data_inicio: '2026-01-01',
        data_fim: '2027-01-01',
        created_at: '2026-01-01T08:00:00.000000Z',
        client: {
          id: 15,
          name: 'Patricia Brandão'
        }
      }, null, 2)
    },
    {
      method: 'POST',
      path: '/contracts/{id}/cancel',
      description: 'Cancela um contrato ativo existente no sistema.',
      pathParams: [
        { name: 'id', type: 'integer', required: true, description: 'ID do contrato a ser cancelado.' }
      ],
      requestBody: JSON.stringify({
        motivo_cancelamento: 'Solicitado pelo cliente por motivos financeiros.'
      }),
      responseStatus: '200 OK',
      responseBody: JSON.stringify({
        status: 200,
        message: 'Contrato cancelado com sucesso',
        data: {
          id: 8,
          status: 'cancelado',
          cancelled_at: '2026-07-10T17:48:00.000000Z',
          motivo_cancelamento: 'Solicitado pelo cliente por motivos financeiros.'
        }
      }, null, 2)
    }
  ];

  const organizationsDocs: EndpointDoc[] = [
    {
      method: 'GET',
      path: '/allowed-products',
      description: 'Retorna a lista de produtos permitidos/liberados para a organização associada ao usuário autenticado (inferred pelo Token).',
      responseStatus: '200 OK',
      responseBody: JSON.stringify([
        {
          id: 12,
          nome: 'Seguro de Vida Individual'
        },
        {
          id: 15,
          nome: 'Plano Odontológico Familiar'
        }
      ], null, 2)
    }
  ];

  const renderEndpointDoc = (endpoint: EndpointDoc, index: number, resourceName: string) => {
    const docId = `${resourceName}-${index}`;
    const codeSnippet = generateSnippet(snippetLang, endpoint);

    return (
      <AccordionItem key={docId} value={docId} className="border border-border rounded-lg px-4 mb-3 overflow-hidden shadow-sm dark:bg-card">
        <AccordionTrigger className="hover:no-underline py-4 flex flex-col md:flex-row md:items-center gap-3 text-left">
          <div className="flex items-center gap-3 w-full">
            <Badge className={`font-mono text-xs px-2 py-0.5 border ${getMethodBadgeClass(endpoint.method)}`}>
              {endpoint.method}
            </Badge>
            <span className="font-mono text-sm md:text-base font-semibold text-foreground break-all">
              {endpoint.path}
            </span>
          </div>
          <span className="text-sm text-muted-foreground font-normal md:ml-auto md:text-right pr-4 block">
            {endpoint.description.substring(0, 70)}...
          </span>
        </AccordionTrigger>
        <AccordionContent className="pt-2 pb-6 border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informações Técnicas */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1">Descrição</h4>
                <p className="text-sm text-muted-foreground">{endpoint.description}</p>
              </div>

              {/* Path Parameters */}
              {endpoint.pathParams && endpoint.pathParams.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Parâmetros de Rota (Path)</h4>
                  <div className="border border-border rounded-md overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted border-b border-border">
                          <th className="p-2 font-medium">Nome</th>
                          <th className="p-2 font-medium">Tipo</th>
                          <th className="p-2 font-medium">Obrigatório</th>
                          <th className="p-2 font-medium">Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {endpoint.pathParams.map((p) => (
                          <tr key={p.name} className="border-b border-border last:border-none">
                            <td className="p-2 font-mono font-bold">{p.name}</td>
                            <td className="p-2 text-muted-foreground">{p.type}</td>
                            <td className="p-2">
                              <Badge variant="outline" className={p.required ? 'text-rose-500 border-rose-500/20 bg-rose-500/5' : 'text-muted-foreground'}>
                                {p.required ? 'Sim' : 'Não'}
                              </Badge>
                            </td>
                            <td className="p-2 text-muted-foreground">{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Query Parameters */}
              {endpoint.queryParams && endpoint.queryParams.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Parâmetros de Consulta (Query)</h4>
                  <div className="border border-border rounded-md overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted border-b border-border">
                          <th className="p-2 font-medium">Nome</th>
                          <th className="p-2 font-medium">Tipo</th>
                          <th className="p-2 font-medium">Obrigatório</th>
                          <th className="p-2 font-medium">Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {endpoint.queryParams.map((p) => (
                          <tr key={p.name} className="border-b border-border last:border-none">
                            <td className="p-2 font-mono font-bold">{p.name}</td>
                            <td className="p-2 text-muted-foreground">{p.type}</td>
                            <td className="p-2">
                              <Badge variant="outline" className={p.required ? 'text-rose-500 border-rose-500/20 bg-rose-500/5' : 'text-muted-foreground'}>
                                {p.required ? 'Sim' : 'Não'}
                              </Badge>
                            </td>
                            <td className="p-2 text-muted-foreground">{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Request Headers */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Cabeçalhos (Headers)</h4>
                <div className="bg-muted/60 p-3 rounded-md border border-border">
                  <pre className="font-mono text-xs text-muted-foreground">
                    Accept: application/json{'\n'}
                    {endpoint.path !== '/login' && `Authorization: Bearer <SEU_TOKEN_AQUI>\n`}
                    {['POST', 'PUT'].includes(endpoint.method) && `Content-Type: application/json`}
                  </pre>
                </div>
              </div>

              {/* Request Body Schema */}
              {endpoint.requestBody && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Corpo da Requisição (JSON)</h4>
                  <div className="relative">
                    <pre className="bg-muted/80 p-3 rounded-md border border-border overflow-x-auto max-h-[160px] font-mono text-xs text-foreground">
                      {endpoint.requestBody}
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => copyToClipboard(endpoint.requestBody || '', `${docId}-body`)}
                    >
                      {copiedId === `${docId}-body` ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Response Status & Schema */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-foreground">Resposta Exemplo</h4>
                  <Badge variant="secondary" className="font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Status {endpoint.responseStatus}
                  </Badge>
                </div>
                <div className="relative">
                  <pre className="bg-muted/80 p-3 rounded-md border border-border overflow-x-auto max-h-[220px] font-mono text-xs text-foreground">
                    {endpoint.responseBody}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => copyToClipboard(endpoint.responseBody, `${docId}-resp`)}
                  >
                    {copiedId === `${docId}-resp` ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Snippet / Exemplo de Código */}
            <div className="flex flex-col border border-border rounded-lg overflow-hidden h-fit bg-card shadow-sm">
              <div className="bg-muted/80 px-4 py-2 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5" />
                  Snippet de Requisição
                </span>
                <div className="flex gap-1">
                  <Button
                    variant={snippetLang === 'curl' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setSnippetLang('curl')}
                  >
                    cURL
                  </Button>
                  <Button
                    variant={snippetLang === 'js' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setSnippetLang('js')}
                  >
                    Fetch (JS)
                  </Button>
                  <Button
                    variant={snippetLang === 'php' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setSnippetLang('php')}
                  >
                    PHP
                  </Button>
                </div>
              </div>
              <div className="relative p-4 bg-slate-950 dark:bg-zinc-950 overflow-x-auto">
                <pre className="font-mono text-xs text-slate-100 min-h-[180px] select-text">
                  {codeSnippet}
                </pre>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute right-3 top-3 h-8 px-3 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200"
                  onClick={() => copyToClipboard(codeSnippet, `${docId}-snippet`)}
                >
                  {copiedId === `${docId}-snippet` ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <Check className="h-3.5 w-3.5" /> Copiado!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Copy className="h-3.5 w-3.5" /> Copiar Código
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Server className="h-8 w-8 text-primary" />
          Documentação da API
        </h1>
        <p className="text-muted-foreground text-sm">
          Acesso rápido, referências de endpoints e exemplos de integração com o sistema.
        </p>
      </div>

      {/* Alerta de Token */}
      <Alert className="border-primary/20 bg-primary/5">
        <Key className="h-5 w-5 text-primary" />
        <AlertTitle className="font-semibold text-primary">Autenticação por Bearer Token</AlertTitle>
        <AlertDescription className="text-muted-foreground text-sm flex flex-col md:flex-row md:items-center gap-2 mt-1">
          <span>Para fazer chamadas protegidas, envie o cabeçalho <code>Authorization: Bearer &lt;seu_token&gt;</code>.</span>
          <Link to="/admin/settings/integration" className="text-primary font-medium underline flex items-center gap-1 hover:text-primary/80">
            Gerar Credenciais e Chaves de API <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full h-auto bg-muted p-1 gap-1">
          <TabsTrigger value="geral" className="py-2.5 text-xs md:text-sm font-semibold">
            Geral & Autenticação
          </TabsTrigger>
          <TabsTrigger value="login" className="py-2.5 text-xs md:text-sm font-semibold">
            1. Autenticação (Login)
          </TabsTrigger>
          <TabsTrigger value="clients" className="py-2.5 text-xs md:text-sm font-semibold">
            2. Clientes
          </TabsTrigger>
          <TabsTrigger value="contracts" className="py-2.5 text-xs md:text-sm font-semibold">
            3. Contratos
          </TabsTrigger>
          <TabsTrigger value="organizations" className="py-2.5 text-xs md:text-sm font-semibold">
            4. Produtos
          </TabsTrigger>
        </TabsList>

        {/* 1. Aba Geral */}
        <TabsContent value="geral" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Visão Geral do Consumo
                </CardTitle>
                <CardDescription>
                  Entenda os formatos, codificações de erros e URLs bases.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>
                  Esta API permite interagir de forma programática com a sua plataforma de Seguros e Operações. Todas as requisições enviadas para a API devem respeitar o protocolo <strong>HTTPS</strong> e enviar os dados encapsulados em formato <strong>JSON</strong>.
                </p>
                
                <div>
                  <h3 className="text-foreground font-semibold mb-2">Ambiente e URL Base</h3>
                  <div className="space-y-2">
                    {/* Sandbox Environment */}
                    <div 
                      onClick={() => setEnvironment('sandbox')}
                      className={`p-3 rounded-md border cursor-pointer transition-all flex items-center justify-between ${
                        environment === 'sandbox' 
                          ? 'border-primary bg-primary/5 text-foreground' 
                          : 'border-border bg-muted/40 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold uppercase tracking-wider">Sandbox (Desenvolvimento)</span>
                        <span className="font-mono text-xs">{sandboxUrl}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={environment === 'sandbox' ? 'default' : 'outline'} className="text-xs">
                          {environment === 'sandbox' ? 'Ativo (Snippets)' : 'Selecionar'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(sandboxUrl, 'sandbox-url');
                          }}
                        >
                          {copiedId === 'sandbox-url' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>

                    {/* Production Environment */}
                    <div 
                      onClick={() => setEnvironment('production')}
                      className={`p-3 rounded-md border cursor-pointer transition-all flex items-center justify-between ${
                        environment === 'production' 
                          ? 'border-primary bg-primary/5 text-foreground' 
                          : 'border-border bg-muted/40 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold uppercase tracking-wider">Produção</span>
                        <span className="font-mono text-xs">{productionUrl}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={environment === 'production' ? 'default' : 'outline'} className="text-xs">
                          {environment === 'production' ? 'Ativo (Snippets)' : 'Selecionar'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(productionUrl, 'prod-url');
                          }}
                        >
                          {copiedId === 'prod-url' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    * Selecione o ambiente desejado para atualizar automaticamente a URL nos snippets de código gerados abaixo.
                  </p>
                </div>

                <div>
                  <h3 className="text-foreground font-semibold mb-2">Tabela de Códigos de Erro</h3>
                  <div className="border border-border rounded-md overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted border-b border-border">
                          <th className="p-2.5 font-semibold text-foreground">Código</th>
                          <th className="p-2.5 font-semibold text-foreground">Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="p-2.5 font-mono text-blue-500 font-bold">200 OK</td>
                          <td className="p-2.5">A requisição foi processada com sucesso.</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-2.5 font-mono text-emerald-500 font-bold">201 Created</td>
                          <td className="p-2.5">O recurso (cliente, contrato, etc) foi criado com sucesso.</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-2.5 font-mono text-amber-500 font-bold">400 Bad Request</td>
                          <td className="p-2.5">Requisição inválida. Dados malformados ou incompletos.</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-2.5 font-mono text-rose-500 font-bold">401 Unauthorized</td>
                          <td className="p-2.5">Token inválido, expirado ou não fornecido nos cabeçalhos.</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-2.5 font-mono text-rose-500 font-bold">403 Forbidden</td>
                          <td className="p-2.5">O usuário autenticado não possui permissões suficientes.</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-2.5 font-mono text-rose-500 font-bold">404 Not Found</td>
                          <td className="p-2.5">O recurso solicitado não pôde ser encontrado.</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-2.5 font-mono text-rose-500 font-bold">422 Unprocessable</td>
                          <td className="p-2.5">Erro de validação nos dados fornecidos (ex: formato de CPF inválido).</td>
                        </tr>
                        <tr className="last:border-none">
                          <td className="p-2.5 font-mono text-rose-500 font-bold">500 Server Error</td>
                          <td className="p-2.5">Falha interna no servidor. Caso ocorra, reporte ao suporte técnico.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  Boas Práticas & Segurança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs md:text-sm text-muted-foreground leading-relaxed">
                <div>
                  <h3 className="text-foreground font-semibold mb-1">Nunca compartilhe tokens</h3>
                  <p>As chaves Bearer emitidas possuem as mesmas permissões do usuário que as criou. Guarde os tokens gerados em variáveis de ambiente seguras no seu código.</p>
                </div>
                <div>
                  <h3 className="text-foreground font-semibold mb-1">Limite de requisições</h3>
                  <p>A API conta com rate-limiting padrão de 60 requisições por minuto por chave de API. Exceder esse limite retornará o código HTTP 429.</p>
                </div>
                <div>
                  <h3 className="text-foreground font-semibold mb-1">Use cabeçalhos corretos</h3>
                  <p>Envie sempre <code>Accept: application/json</code> nas suas chamadas para garantir que o Laravel retorne erros de validação e respostas em formato legível.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. Aba Login */}
        <TabsContent value="login" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Autenticação por Usuário</CardTitle>
              <CardDescription>
                Utilize o endpoint de Login para gerar um token dinamicamente a partir do e-mail e senha de uma conta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible defaultValue="login-0" className="w-full">
                {renderEndpointDoc(loginDoc, 0, 'login')}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Aba Clientes */}
        <TabsContent value="clients" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Clientes</CardTitle>
              <CardDescription>
                Ações para listar, criar, visualizar, atualizar e remover cadastros de clientes da sua seguradora.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {clientsDocs.map((doc, idx) => renderEndpointDoc(doc, idx, 'clients'))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Aba Contratos */}
        <TabsContent value="contracts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Contratos</CardTitle>
              <CardDescription>
                Ações para listar, criar e cancelar contratos de cobertura securitária.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {contractsDocs.map((doc, idx) => renderEndpointDoc(doc, idx, 'contracts'))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Aba Produtos */}
        <TabsContent value="organizations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Produtos da Organização</CardTitle>
              <CardDescription>
                Retorna os produtos liberados e ativos vinculados a uma organização.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {organizationsDocs.map((doc, idx) => renderEndpointDoc(doc, idx, 'organizations'))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
