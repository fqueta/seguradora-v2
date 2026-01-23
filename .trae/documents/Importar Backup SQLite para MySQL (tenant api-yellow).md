## Visão Geral

* Melhor caminho: unificar o “titular do contrato” como um usuário (da tabela users), mantendo a coluna existente client\_id como ponte para qualquer usuário (cliente ou usuário interno). Sem migrações.

* Ajustar apenas o modelo/relacionamento no backend e os formulários/listas no frontend para aceitar seleção de qualquer usuário, com filtros por perfil (permission\_id).

* Integrações (ex.: SulAmérica) só disparam quando o titular possui perfil de Cliente ou atende pré‑requisitos.

## Backend

1. Modelo Contract

* Alterar relação client() para belongsTo(User::class, 'client\_id').

* Manter owner() e demais relações inalteradas.

1. Controller ContractController

* Criar regra: integração de fornecedores só quando o titular (client\_id→User) tiver permission\_id de “Cliente” e dados necessários (cpf/cnpj, nascimento etc.). Caso contrário, pular integração e retornar sucesso simples.

* Manter verificações de duplicidade por client\_id+product\_id (válido pois users é chave única por id).

1. Modelo Client (escopo de Cliente)

* Manter para consultas/filters onde necessário (ex.: listas específicas só de clientes), mas não exigir Client para gravar contratos.

## Frontend

1. Formulário de Contrato (pages/contracts/ContractForm.tsx)

* Substituir a fonte de dados do combobox de “Cliente” por uma lista de usuários (users). Adicionar filtro por perfil: Cliente/Usuário/Todos.

* Rótulos: “Titular do contrato” em vez de “Cliente”, preservando client\_id no payload.

* Manter pré‑seleção via query params (?client\_id, ?owner\_id).

1. Hooks/Serviços

* Criar/usar hook de users (ou ampliar useClientsList para aceitar um parâmetro profileFilter). Retornar {id, name, permission\_id}.

* Manter contractsService sem mudanças de endpoint; payload continua com client\_id.

1. UI/UX

* Exibir badge do perfil do titular selecionado (Cliente/Usuário) para clareza.

* Se perfil não for “Cliente”, ocultar campos específicos de integrações (quando existirem).

## Relatórios e Filtros

* Atualizar listagens/relatórios que assumem “Cliente” para mostrar “Titular (User)”.

* Filtros: permitir buscar por permission\_id do titular (Cliente ou Usuário), além de organization e owner.

## Compatibilidade e Migração

* Nenhuma migração: contracts já usa string para IDs e não possui FK rígida.

* Relação client agora aponta para User, evitando quebra; onde precisar somente‑cliente, usar o escopo/model Client.

## Validação e Testes

* Cenário 1: criar contrato para usuário interno (permission\_id != Cliente) → criação OK, integração pulada, status inicial conforme regra.

* Cenário 2: criar contrato para cliente (permission\_id de Cliente) → integração executa; verificar contract\_number/c\_number e status approved.

* Cenário 3: duplicidade por client\_id+product\_id e vigência → bloqueio conforme já implementado.

* Cenário 4: listagens/relatórios exibem titular corretamente (nome, perfil, organização).

