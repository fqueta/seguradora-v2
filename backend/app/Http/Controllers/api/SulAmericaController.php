<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\admin\ContratoController;
use App\Http\Controllers\Controller;
use App\Services\ContractEventLogger;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class SulAmericaController extends Controller
{
    protected $url;
    protected $urlRaw;
    protected $credentialSource = 'fallback';
    protected $pass;
    protected $user;
    protected $produtoParceiro;
    public function __construct()
    {
        $credenciais = $this->credentials();
        $this->urlRaw = $credenciais['url'];
        $this->url = $this->endpointUrl($credenciais['url']);
        $this->user = $credenciais['user'];
        $this->pass = $credenciais['pass'];
        $this->produtoParceiro = $credenciais['produto'];
        $this->credentialSource = $credenciais['source'] ?? 'fallback';
        // dd($credenciais);
    }
    /**
     * URL efetiva de POST: remove ?wsdl/?WSDL e barras extras.
     * O ?wsdl serve só p/ ler o descritor; o POST SOAP deve ir no endpoint puro,
     * igual ao curl de referência (.../services/canalvenda).
     */
    private function endpointUrl($url){
        $url = trim((string)$url);
        if($url === '') return $url;
        // remove query ?wsdl (case-insensitive) preservando outras queries se houver
        $parts = parse_url($url);
        if(isset($parts['query']) && preg_match('/^\s*wsdl\s*$/i', trim($parts['query']))){
            $scheme = isset($parts['scheme']) ? $parts['scheme'].'://' : '';
            $host = $parts['host'] ?? '';
            $port = isset($parts['port']) ? ':'.$parts['port'] : '';
            $path = $parts['path'] ?? '';
            $url = $scheme.$host.$port.$path;
            if(isset($parts['fragment'])) $url .= '#'.$parts['fragment'];
        } else {
            // fallback simples: corta ?wsdl no fim mesmo com case diferente
            $url = preg_replace('/\?wsdl\s*$/i', '', $url);
        }
        return rtrim($url, '?& ');
    }
    private function tryDecryptPass($value){
        if(!is_string($value) || $value === '') return $value;
        try {
            return \Illuminate\Support\Facades\Crypt::decryptString($value);
        } catch (\Throwable $e) {
            return $value;
        }
    }
    private function credentials(){
        // Fonte primária: tela Sistema > Configurações de API > Api Sulamerica
        // (options.url = credenciais_sulamerica). É a tela escolhida na operação.
        $credencias = Qlib::qoption("credenciais_sulamerica") ? Qlib::qoption("credenciais_sulamerica") : [];
        if(is_string($credencias)){
            $credencias = json_decode($credencias,true);
        }
        if(!is_array($credencias)) $credencias = [];
        if(!empty($credencias['url'])){
            return [
                'url'=>$credencias['url'],
                'user'=>$credencias['user'] ?? "yello1232user",
                'pass'=>$this->tryDecryptPass($credencias['pass'] ?? "yello1232pass"),
                'produto'=> $credencias['produto'] ?? "10124",
                'source'=> 'qoption:credenciais_sulamerica',
            ];
        }
        // Fallback: integração dinâmica (ApiCredential slugs sulamerica/integracao-sulamerica)
        // Tela: Credenciais de Integração (tabela posts/post_type api_credentials)
        try {
            if(class_exists(\App\Models\ApiCredential::class)){
                $slugs = ['sulamerica', 'integracao-sulamerica'];
                $item = \App\Models\ApiCredential::whereIn('post_name', $slugs)->first();
                if($item){
                    $cfg = $item->config;
                    if(is_string($cfg)){
                        $cfg = json_decode($cfg, true) ?? [];
                    }
                    if(is_array($cfg) && !empty($cfg['url'])){
                        $active = ($item->post_status ?? '') === 'publish';
                        return [
                            'url'=>$cfg['url'],
                            'user'=>$cfg['user'] ?? 'yello1232user',
                            'pass'=>$this->tryDecryptPass($cfg['pass'] ?? 'yello1232pass'),
                            'produto'=> $cfg['produto'] ?? '10124',
                            'source'=> 'api_credentials:'.($item->post_name ?? 'sulamerica').($active ? '' : ':inactive'),
                        ];
                    }
                }
            }
        } catch (\Throwable $e) {
            // cai para o default abaixo
        }
        return [
            'url'=>"https://canalvenda-internet-develop.executivoslab.com.br/services/canalvenda?wsdl",
            'user'=>"yello1232user",
            'pass'=>"yello1232pass",
            'produto'=> "10124",
            'source'=> 'default',
        ];
    }
    /**
     * Metodo para ser chamado na api do ajax
     * $numero = $request->get('numero') ? $request->get('numero') : 6;
     *       $config = [
     *          'planoProduto'=>1,
     *           'operacaoParceiro'=>Qlib::zerofill($numero,5),
     *           'nomeSegurado'=>'Programdor teste',
     *           'dataNascimento'=>'1989-06-05',
     *           'sexo'=>'F',
     *           'uf'=>'MG',
     *           'documento'=>'12345678909',
     *           'inicioVigencia'=>'2025-03-25',
     *           'fimVigencia'=>'2026-03-25',
     *       ];
     * $ret = (new SulAmericaController)->contratacao($config);
     */
    public function contratar(Request $request){
        $ret = $this->contratacao($request);
        return $ret;
    }
    /**
     * Metodo para ser chamado na api do ajax
     * $config = [
     *           'numeroOperacao'=>'740442',
     *  ];
     *  $ret = (new SulAmericaController)->cancelamento($config);
     */
    public function cancelar(Request $request){
        $ret = $this->cancelamento($request);
        return $ret;
    }
    /**
     * Para contratação de apolice
     * @param $config
     * @return $ret
     * @uso (new sulAmericaController)->contratacao($config);
     */
    public function contratacao($config=[]){

        $nomeSegurado = isset($config['nomeSegurado']) ? $config['nomeSegurado'] : false; //Pessoa de Teste;
        $dataNascimento = isset($config['dataNascimento']) ? $config['dataNascimento'] : ''; //1981-01-01;
        $inicioVigencia = isset($config['inicioVigencia']) ? $config['inicioVigencia'] : ''; //2025-03-23;
        $fimVigencia = isset($config['fimVigencia']) ? $config['fimVigencia'] : ''; //2026-03-23;
        $sexo = isset($config['sexo']) ? $config['sexo'] : false; //M;
        $uf = isset($config['uf']) ? $config['uf'] : false; //PI;
        $planoProduto = isset($config['planoProduto']) ? $config['planoProduto'] : '2'; //1;
        $documento = isset($config['documento']) ? $config['documento'] : ''; //85528114306;
        $premioSeguro = isset($config['premioSeguro']) ? $config['premioSeguro'] : '3.96'; //3.96;
        $tipoDocumento = isset($config['tipoDocumento']) ? $config['tipoDocumento'] : 'C'; //C para cpf;
        $produto = $this->produtoParceiro; //Produto padrão;
        // return $produto;
        $canalVenda = isset($config['canalVenda']) ? $config['canalVenda'] : 'SITE'; //C para cpf;
        $operacaoParceiro = isset($config['operacaoParceiro']) ? $config['operacaoParceiro'] : '000004'; //Numero de controle do parceiro;
        $token_contrato = isset($config['token_contrato']) ? $config['token_contrato'] : ''; // Token do contrato para log
        $ret = ['exec'=>false];
        $uf = strtoupper($uf);
        // dd($this->url,$config);
        if(!$dataNascimento){
            $ret['mens'] = 'Data de Nascimento é obrigatória';
            return $ret;
        }
        if(!$inicioVigencia){
            $ret['mens'] = 'Data de início é obrigatória';
            return $ret;
        }
        if(!$fimVigencia){
            $ret['mens'] = 'Data de fim é obrigatória';
            return $ret;
        }
        if(!$documento){
            $ret['mens'] = 'Documento de fim é obrigatório';
            return $ret;
        }
        // dd($config,$produto);
        $xml = '
        <soapenv:Envelope
            xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
            xmlns:urn="urn:br.com.sulamerica.canalvenda.ws"
            xmlns:NS1="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
            <soapenv:Header>
                <NS1:Security soapenv:mustUnderstand="1">
                    <NS1:UsernameToken>
                    <NS1:Username>'.$this->user.'</NS1:Username>
                    <NS1:Password>'.$this->pass.'</NS1:Password>
                    </NS1:UsernameToken>
                </NS1:Security>
            </soapenv:Header>
            <soapenv:Body>
                <urn:contratarSeguro>
                <urn:produto>'.$produto.'</urn:produto>
                <urn:canalVenda>'.$canalVenda.'</urn:canalVenda>
                <urn:operacaoParceiro>'.$operacaoParceiro.'</urn:operacaoParceiro>
                <urn:parametros>
                <![CDATA[
                <parametros>
                    <planoProduto>'.$planoProduto.'</planoProduto>
                    <premioSeguro>'.$premioSeguro.'</premioSeguro>
                    <nomeSegurado>'.$nomeSegurado.'</nomeSegurado>
                    <dataNascimento>'.$dataNascimento.'</dataNascimento>
                    <sexo>'.$sexo.'</sexo>
                    <uf>'.$uf.'</uf>
                    <tipoDocumento>'.$tipoDocumento.'</tipoDocumento>
                    <documento>'.$documento.'</documento>
                    <inicioVigencia>'.$inicioVigencia.'</inicioVigencia>
                    <fimVigencia>'.$fimVigencia.'</fimVigencia>
                </parametros>]]>
                </urn:parametros>
                </urn:contratarSeguro>
            </soapenv:Body>
        </soapenv:Envelope>
        ';
        // dd($xml);
        // Log de início da contratação (start)
        if($token_contrato){
            ContractEventLogger::logByToken(
                $token_contrato,
                'contratacao_start',
                'Início do processamento do método contratacao (SulAmérica)',
                [
                    'request' => [
                        'produto' => $produto,
                        'canalVenda' => $canalVenda,
                        'operacaoParceiro' => $operacaoParceiro,
                        'parametros' => [
                            'planoProduto' => $planoProduto,
                            'premioSeguro' => $premioSeguro,
                            'inicioVigencia' => $inicioVigencia,
                            'fimVigencia' => $fimVigencia,
                            'uf' => $uf,
                            'tipoDocumento' => $tipoDocumento,
                            'sexo' => $sexo,
                            'nomeSegurado' => $nomeSegurado,
                            'documento_masked' => strlen($documento) ? substr($documento,0,3).'****'.substr($documento,-2) : null,
                        ],
                    ],
                ],
                $xml,
                auth()->id()
            );
        }
        $response = Http::withHeaders([
            'Content-Type' => 'text/xml; charset=utf-8',
            'SOAPAction' => '',
        ])->withBody($xml, 'text/xml; charset=utf-8')->post($this->url);

        $resposta = $response->body();
        // $ret['requsição'] = $xml;
        // $ret['passwordDigest'] = $passwordDigest;
        $ret['body'] = $resposta;
        $ret = $this->xmlContrata_to_array($resposta,$config);
        $ret['url'] = $this->url;
        $ret['produto'] = $this->produtoParceiro;
        $ret['plano'] = $planoProduto;
        // dd($xml,$ret);
        // Log de término da contratação (end)
        if($token_contrato){
            ContractEventLogger::logByToken(
                $token_contrato,
                'contratacao_end',
                'Fim do processamento do método contratacao (SulAmérica)',
                [
                    'success' => isset($ret['exec']) ? (bool)$ret['exec'] : null,
                    'response' => $ret,
                ],

                $resposta,
                auth()->id()
            );
        }
        return $ret; // Retorna a resposta do WebService
    }
    /**
     * Para cancelar contratação de apolice
     * @param $config
     * @return $ret
     * @uso (new sulAmericaController)->cancelamento($config);
     */
    public function cancelamento($config){
        // Aceita array ou Request (cancelar(Request) passa o Request direto)
        if($config instanceof Request){
            $config = array_merge($config->query->all(), $config->request->all());
        }
        if(!is_array($config)) $config = [];
        $numeroOperacao = isset($config['numeroOperacao']) && $config['numeroOperacao'] !== '' ? trim((string)$config['numeroOperacao']) : false;
        $canalVenda = isset($config['canalVenda']) && trim((string)$config['canalVenda']) !== '' ? trim((string)$config['canalVenda']) : 'site';
        $mesAnoFatura = isset($config['mesAnoFatura']) && trim((string)$config['mesAnoFatura']) !== '' ? trim((string)$config['mesAnoFatura']) : date('mY');
        $id_contrato = isset($config['id_contrato']) ? $config['id_contrato'] : '';
        $contract = $id_contrato ? \App\Models\Contract::find($id_contrato) : null;

        // Validação antecipada (antes de montar XML/log de início)
        if(!$numeroOperacao){
            $ret['exec'] = false;
            $ret['mens'] = 'Número de operação é obrigatório';
            $ret['color'] = 'danger';
            return $ret;
        }
        if(!$id_contrato){
            $ret['exec'] = false;
            $ret['mens'] = 'ID do contrato é obrigatório';
            $ret['color'] = 'danger';
            return $ret;
        }

        $xml = '
        <soapenv:Envelope
            xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
            xmlns:urn="urn:br.com.sulamerica.canalvenda.ws"
            xmlns:NS1="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
            <soapenv:Header>
                <NS1:Security soapenv:mustUnderstand="1">
                    <NS1:UsernameToken>
                    <NS1:Username>'.$this->user.'</NS1:Username>
                    <NS1:Password>'.$this->pass.'</NS1:Password>
                    </NS1:UsernameToken>
                </NS1:Security>
            </soapenv:Header>
            <soapenv:Body>
                <urn:confirmarCancelamento>
                    <urn:numeroOperacao>'.$numeroOperacao.'</urn:numeroOperacao>
                    <urn:canalVenda>'.$canalVenda.'</urn:canalVenda>
                    <urn:mesAnoFatura>'.$mesAnoFatura.'</urn:mesAnoFatura>
                </urn:confirmarCancelamento>
            </soapenv:Body>
        </soapenv:Envelope>
        ';

        // Log de início do processamento do cancelamento na integração
        if ($contract) {
            ContractEventLogger::log(
                $contract,
                'cancelamento_integracao',
                'Início do processamento do cancelamento (SulAmérica)',
                ['request' => $config, 'endpoint' => $this->url, 'credential_source' => $this->credentialSource],
                $xml,
                auth()->id()
            );
        }
        // Mesmo envelope do curl de referência: text/xml + SOAPAction vazia,
        // POST no endpoint dinâmico persistido (sem ?wsdl).
        $response = Http::withHeaders([
            'Content-Type' => 'text/xml; charset=utf-8',
            'SOAPAction' => '',
        ])->withBody($xml, 'text/xml; charset=utf-8')->post($this->url);

        $resposta = $response->body();
        $ret = $this->xmlCancela_to_array($resposta,$config);
        $ret['body'] = $resposta;
        $ret['url'] = $this->url;
        $ret['credential_source'] = $this->credentialSource;
        // $ret['produto'] = $produto;
        // dd($xml,$ret);
        // Log de término do processamento na integração
        if ($contract) {
            ContractEventLogger::log(
                $contract,
                'cancelamento_integracao',
                'Fim do processamento do cancelamento (SulAmérica)',
                [
                    'success' => isset($ret['exec']) ? (bool)$ret['exec'] : null,
                    'response' => $ret,
                ],
                $resposta,
                auth()->id()
            );
        }
        return $ret; // Retorna a resposta do WebService
    }
    public function formaResposta($xml){
        $cleanXml = trim(preg_replace('/\s+/', ' ', $xml));

        $decodedXml = html_entity_decode($cleanXml);
        return $decodedXml;
    }
    public function xmlContrata_to_array($xml,$dados=[]){
        $xmlObject = simplexml_load_string($xml, 'SimpleXMLElement', LIBXML_NOCDATA);

        // Passo 2: Registrar os namespaces (SOAP e SulAmérica)
        $xmlObject->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
        $xmlObject->registerXPathNamespace('ns2', 'urn:br.com.sulamerica.canalvenda.ws');

        // Passo 3: Buscar o conteúdo do nó ns2:contratarSeguro (onde está o XML interno)
        $contratarSeguroNode = $xmlObject->xpath('//soap:Body/ns2:contratarSeguroResponse/ns2:contratarSeguro');
        $ret['exec'] = false;
        $ret['data'] = [];
        $ret['mens'] = '';
        $ret['color'] = 'danger';
        if(Qlib::isAdmin(1)){
            $ret['dados'] = $dados;

        }

        // Verificar se o nó foi encontrado
        if (!empty($contratarSeguroNode)) {
            // Passo 4: Extrair o XML interno como string
            $innerXmlString = (string) $contratarSeguroNode[0];

            // Passo 5: Decodificar os caracteres HTML (&lt; e &gt;)
            $decodedXml = html_entity_decode($innerXmlString);

            // Passo 6: Converter para SimpleXML novamente para facilitar manipulação
            $innerXmlObject = simplexml_load_string($decodedXml, 'SimpleXMLElement', LIBXML_NOCDATA);

            // Passo 7: Converter para array associativo
            $array = json_decode(json_encode($innerXmlObject), true);

            // Exibir resultado
            $ret['data'] = $array;
            if (isset($array['retorno']) && $array['retorno']=='0') {
                $ret['exec'] = true;
                $ret['mens'] = 'Contrato realizado com sucesso!!';
                $ret['color'] = 'success';
            }else{
                $ret['mens'] = isset($array['retornoMsg']) ? $array['retornoMsg'] : '';
            }
        } else {
            // $ret['data'] = $array;
            $ret['mens'] = "Erro: O nó ns2:contratarSeguro não foi encontrado!";
        }
        return $ret;
    }
    public function xmlCancela_to_array($xml,$dados=[]){
        $ret['exec'] = false;
        $ret['data'] = [];
        $ret['mens'] = '';
        $ret['color'] = 'danger';
        if(Qlib::isAdmin(1)){
            $ret['dados'] = $dados;

        }
        $xmlObject = @simplexml_load_string((string)$xml, 'SimpleXMLElement', LIBXML_NOCDATA);
        if($xmlObject === false){
            $ret['mens'] = 'Resposta inválida do fornecedor (XML malformado).';
            return $ret;
        }

        // Registrar os namespaces (SOAP e SulAmérica)
        $xmlObject->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
        $xmlObject->registerXPathNamespace('ns2', 'urn:br.com.sulamerica.canalvenda.ws');

        // SOAP Fault? (ex.: credencial/endpoint/validação do fornecedor)
        $fault = $xmlObject->xpath('//soap:Body/soap:Fault');
        if(!empty($fault)){
            $faultString = isset($fault[0]->faultstring) ? trim((string)$fault[0]->faultstring) : '';
            $faultCode = isset($fault[0]->faultcode) ? trim((string)$fault[0]->faultcode) : '';
            $ret['mens'] = $faultString !== '' ? $faultString : 'Falha SOAP no cancelamento.';
            $ret['data'] = ['faultcode' => $faultCode, 'faultstring' => $faultString];
            return $ret;
        }

        // Buscar o conteúdo do nó ns2:confirmarCancelamento (onde está o XML interno)
        $confirmarCancelamento = $xmlObject->xpath('//soap:Body/ns2:confirmarCancelamentoResponse/ns2:confirmarCancelamento');
        // Verificar se o nó foi encontrado
        if (!empty($confirmarCancelamento)) {
            // Extrair o XML interno como string
            $innerXmlString = (string) $confirmarCancelamento[0];

            // Decodificar os caracteres HTML (&lt; e &gt;)
            $decodedXml = html_entity_decode($innerXmlString, ENT_QUOTES | ENT_XML1, 'UTF-8');

            // Converter para SimpleXML novamente para facilitar manipulação
            $innerXmlObject = @simplexml_load_string(trim($decodedXml), 'SimpleXMLElement', LIBXML_NOCDATA);
            if($innerXmlObject === false){
                $ret['mens'] = 'Resposta inválida do fornecedor (conteúdo interno malformado).';
                return $ret;
            }

            // Converter para array associativo
            $array = json_decode(json_encode($innerXmlObject), true);
            if(!is_array($array)) $array = [];

            // Modelo validado: <canalvenda><retorno>0</retorno>... (sucesso)
            //                 com retornoMsg apenas em erro/sucesso alternativo.
            if(isset($array['retorno']) && trim((string)$array['retorno'])==='0'){
                $ret['exec'] = true;
                $ret['data'] = $array;
                $ret['mens'] = (isset($array['retornoMsg']) && trim((string)$array['retornoMsg']) !== '') ? trim((string)$array['retornoMsg']) : 'Cancelado com sucesso!!';
                if(isset($array['dataOperacaoContrat']) && strtotime($array['dataOperacaoContrat'])){
                    $ret['mens'] .= ' Data da operação: '.date('d/m/Y', strtotime($array['dataOperacaoContrat']));
                }
                $ret['color'] = 'success';
            }else{
                $ret['data'] = $array;
                $ret['mens'] = (isset($array['retornoMsg']) && trim((string)$array['retornoMsg']) !== '') ? trim((string)$array['retornoMsg']) : 'Erro ao cancelar!';
            }
        } else {
            $ret['mens'] = "Erro: O nó ns2:confirmarCancelamento não foi encontrado!";
        }
        return $ret;
    }
    public function testeConexao(Request $request){
        // Usa o link dinâmico persistido na integração (ApiCredential > qoption).
        // Permite override via ?url= para diagnóstico pontual.
        $url = trim((string)$request->input('url', $this->url));
        if($url === '') $url = $this->url;
        $produto = $request->input('produto', $this->produtoParceiro);
        $canalVenda = $request->input('canalVenda', 'SITE');
        $operacaoParceiro = $request->input('operacaoParceiro', '69727d7df0c69');
        $planoProduto = $request->input('planoProduto', '2');
        $premioSeguro = $request->input('premioSeguro', '3.96');
        $nomeSegurado = $request->input('nomeSegurado', 'Raphael Retto Veiga');
        $dataNascimento = $request->input('dataNascimento', '1977-05-18');
        $sexo = $request->input('sexo', 'M');
        $uf = strtoupper($request->input('uf', 'MG'));
        $tipoDocumento = $request->input('tipoDocumento', 'C');
        $documento = $request->input('documento', '03334580601');
        $inicioVigencia = $request->input('inicioVigencia', '2026-01-23');
        $fimVigencia = $request->input('fimVigencia', '2027-01-23');
        $xml = '
        <soapenv:Envelope
            xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
            xmlns:urn="urn:br.com.sulamerica.canalvenda.ws"
            xmlns:NS1="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
            <soapenv:Header>
                <NS1:Security soapenv:mustUnderstand="1">
                    <NS1:UsernameToken>
                    <NS1:Username>'.$this->user.'</NS1:Username>
                    <NS1:Password>'.$this->pass.'</NS1:Password>
                    </NS1:UsernameToken>
                </NS1:Security>
            </soapenv:Header>
            <soapenv:Body>
                <urn:contratarSeguro>
                <urn:produto>'.$produto.'</urn:produto>
                <urn:canalVenda>'.$canalVenda.'</urn:canalVenda>
                <urn:operacaoParceiro>'.$operacaoParceiro.'</urn:operacaoParceiro>
                <urn:parametros>
                <![CDATA[
                <parametros>
                    <planoProduto>'.$planoProduto.'</planoProduto>
                    <premioSeguro>'.$premioSeguro.'</premioSeguro>
                    <nomeSegurado>'.$nomeSegurado.'</nomeSegurado>
                    <dataNascimento>'.$dataNascimento.'</dataNascimento>
                    <sexo>'.$sexo.'</sexo>
                    <uf>'.$uf.'</uf>
                    <tipoDocumento>'.$tipoDocumento.'</tipoDocumento>
                    <documento>'.$documento.'</documento>
                    <inicioVigencia>'.$inicioVigencia.'</inicioVigencia>
                    <fimVigencia>'.$fimVigencia.'</fimVigencia>
                </parametros>]]>
                </urn:parametros>
                </urn:contratarSeguro>
            </soapenv:Body>
        </soapenv:Envelope>
        ';
        $raw = $request->getContent();
        if (is_string($raw) && strlen(trim($raw))) {
            $xml = $raw;
        }
        $response = Http::withHeaders([
            'Content-Type' => 'text/xml; charset=utf-8',
            'SOAPAction' => '',
        ])->withBody($xml, 'text/xml; charset=utf-8')->post($url);
        $cred = [
            'url' => $url,
            'url_raw' => $this->urlRaw,
            'credential_source' => $this->credentialSource,
            'user' => $this->user,
            'pass_masked' => strlen($this->pass) ? substr($this->pass,0,2).'****'.substr($this->pass,-2) : null,
        ];
        $mensgem = $response->body();
        try{
            $xmlObject = @simplexml_load_string($response->body(), 'SimpleXMLElement', LIBXML_NOCDATA);
            if($xmlObject){
                $xmlObject->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
                $xmlObject->registerXPathNamespace('ns2', 'urn:br.com.sulamerica.canalvenda.ws');
                $contratarSeguroNode = $xmlObject->xpath('//soap:Body/ns2:contratarSeguroResponse/ns2:contratarSeguro');
                if (!empty($contratarSeguroNode)) {
                    $innerXmlString = (string) $contratarSeguroNode[0];
                    $decodedXml = html_entity_decode($innerXmlString);
                    $innerXmlObject = @simplexml_load_string($decodedXml, 'SimpleXMLElement', LIBXML_NOCDATA);
                    if($innerXmlObject){
                        $array = json_decode(json_encode($innerXmlObject), true);
                        if(isset($array['retornoMsg'])){
                            $mensgem = $array['retornoMsg'];
                        }
                    }
                }
            }
        }catch(\Throwable $e){}
        return response()->json([
            'payload' => $xml,
            'response' => [
                'status' => $response->status(),
                'body' => $response->body(),
                'headers' => $response->headers(),
                'url' => $url,
            ],
            'credentials' => $cred,
            'mensgem' => $mensgem,
        ], 200);
    }
}
