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
    protected $pass;
    protected $user;
    protected $produtoParceiro;
    public function __construct()
    {
        $credenciais = $this->credentials();
        $this->url = $credenciais['url'];
        $this->user = $credenciais['user'];
        $this->pass = $credenciais['pass'];
        $this->produtoParceiro = $credenciais['produto'];
    }
    private function credentials(){
        $credencias = Qlib::qoption("credenciais_sulamerica") ? Qlib::qoption("credenciais_sulamerica") : [];
        return [
            'url'=>$credencias['url'] ?? "https://canalvenda-internet-develop.executivoslab.com.br/services/canalvenda?wsdl",
            'user'=>$credencias['user'] ?? "yello1232user",
            'pass'=>$credencias['pass'] ?? "yello1232pass",
            'produto'=> $credencias['produto'] ?? "10124",
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
        $planoProduto = isset($config['planoProduto']) ? $config['planoProduto'] : '1'; //1;
        $documento = isset($config['documento']) ? $config['documento'] : ''; //85528114306;
        $premioSeguro = isset($config['premioSeguro']) ? $config['premioSeguro'] : '3.96'; //3.96;
        $tipoDocumento = isset($config['tipoDocumento']) ? $config['tipoDocumento'] : 'C'; //C para cpf;
        $produto = $this->produtoParceiro; //Produto padrão;
        // dd($produto);
        $canalVenda = isset($config['canalVenda']) ? $config['canalVenda'] : 'SITE'; //C para cpf;
        $operacaoParceiro = isset($config['operacaoParceiro']) ? $config['operacaoParceiro'] : '000004'; //Numero de controle do parceiro;
        $operacaoParceiro = (string)$operacaoParceiro;
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
        $xml_teste = ' <soapenv:Envelope
            xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
            xmlns:urn="urn:br.com.sulamerica.canalvenda.ws"
            xmlns:NS1="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
            <soapenv:Header>
                <NS1:Security soapenv:mustUnderstand="1">
                    <NS1:UsernameToken>
                    <NS1:Username>yello1232user</NS1:Username>
                    <NS1:Password>yello1232pass</NS1:Password>
                    </NS1:UsernameToken>
                </NS1:Security>
            </soapenv:Header>
            <soapenv:Body>
                <urn:contratarSeguro>
                <urn:produto>10124</urn:produto>
                <urn:canalVenda>SITE</urn:canalVenda>
                <urn:operacaoParceiro>69727d7df0c69</urn:operacaoParceiro>
                <urn:parametros>
                <![CDATA[
                <parametros>
                    <planoProduto>2</planoProduto>
                    <premioSeguro>3.96</premioSeguro>
                    <nomeSegurado>Raphael Retto Veiga</nomeSegurado>
                    <dataNascimento>1977-05-18</dataNascimento>
                    <sexo>M</sexo>
                    <uf>MG</uf>
                    <tipoDocumento>C</tipoDocumento>
                    <documento>03334580601</documento>
                    <inicioVigencia>2026-01-23</inicioVigencia>
                    <fimVigencia>2027-01-23</fimVigencia>
                </parametros>]]>
                </urn:parametros>
                </urn:contratarSeguro>
            </soapenv:Body>
        </soapenv:Envelope>';
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
                $xml_teste,
                auth()->id()
            );
        }
        $response = Http::withHeaders([
            'Content-Type' => 'application/xml',
            'Accept' => 'application/xml',
            'SOAPAction' => '',
        ])->withBody($xml_teste, 'application/xml')->post($this->url);

        $ret['url'] = $this->url;
        $resposta = $response->body();
        // $ret['requsição'] = $xml;
        // $ret['passwordDigest'] = $passwordDigest;
        $ret['body'] = $resposta;
        $ret = $this->xmlContrata_to_array($resposta,$config);
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
        $numeroOperacao = isset($config['numeroOperacao']) ? $config['numeroOperacao'] : false;
        $canalVenda = isset($config['canalVenda']) ? $config['canalVenda'] : 'site';
        $mesAnoFatura = isset($config['mesAnoFatura']) ? $config['mesAnoFatura'] : '032025';
        $id_contrato = isset($config['id_contrato']) ? $config['id_contrato'] : '';
        $contract = $id_contrato ? \App\Models\Contract::find($id_contrato) : null;

        // Log de início do processamento do cancelamento na integração
        if ($contract) {
            ContractEventLogger::log(
                $contract,
                'cancelamento_integracao',
                'Início do processamento do cancelamento (SulAmérica)',
                ['request' => $config],
                null,
                auth()->id()
            );
        }
        if(!$numeroOperacao){
            $ret['exec'] = false;
            $ret['mens'] = 'Número de operação é obrigatório';
            if ($contract) {
                ContractEventLogger::log(
                    $contract,
                    'cancelamento_integracao',
                    $ret['mens'],
                    [
                        'status' => 'error',
                        'response' => $ret,
                    ],
                    null,
                    auth()->id()
                );
            }
            return $ret;
        }elseif(!$id_contrato){
            $ret['exec'] = false;
            $ret['mens'] = 'ID do contrato é obrigatório';
            if ($contract) {
                ContractEventLogger::log(
                    $contract,
                    'cancelamento_integracao',
                    $ret['mens'],
                    [
                        'status' => 'error',
                        'response' => $ret,
                    ],
                    null,
                    auth()->id()
                );
            }
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
        $response = Http::withHeaders([
            'Content-Type' => 'application/xml',
            'Accept' => 'application/xml',
            'SOAPAction' => '',
        ])->withBody($xml, 'application/xml')->post($this->url);

        $ret['url'] = $this->url;
        $resposta = $response->body();
        // $ret['requsição'] = $xml;
        // $ret['passwordDigest'] = $passwordDigest;
        $ret['body'] = $resposta;
        $ret = $this->xmlCancela_to_array($resposta,$config);
        if(isset($ret['exec']) && !empty($token_contrato)){
            //Atualizar o status do contrato
            (new ContratoController)->status_update($token_contrato,'Cancelado',$ret);
        }
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
        $xmlObject = simplexml_load_string($xml, 'SimpleXMLElement', LIBXML_NOCDATA);

        // Passo 2: Registrar os namespaces (SOAP e SulAmérica)
        $xmlObject->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
        $xmlObject->registerXPathNamespace('ns2', 'urn:br.com.sulamerica.canalvenda.ws');

        // Passo 3: Buscar o conteúdo do nó ns2:contratarSeguro (onde está o XML interno)
        $confirmarCancelamento = $xmlObject->xpath('//soap:Body/ns2:confirmarCancelamentoResponse/ns2:confirmarCancelamento');
        $ret['exec'] = false;
        $ret['data'] = [];
        $ret['mens'] = '';
        $ret['color'] = 'danger';
        if(Qlib::isAdmin(1)){
            $ret['dados'] = $dados;

        }
        // Verificar se o nó foi encontrado
        if (!empty($confirmarCancelamento)) {
            // Passo 4: Extrair o XML interno como string
            $innerXmlString = (string) $confirmarCancelamento[0];

            // Passo 5: Decodificar os caracteres HTML (&lt; e &gt;)
            $decodedXml = html_entity_decode($innerXmlString);

            // Passo 6: Converter para SimpleXML novamente para facilitar manipulação
            $innerXmlObject = simplexml_load_string($decodedXml, 'SimpleXMLElement', LIBXML_NOCDATA);

            // Passo 7: Converter para array associativo
            $array = json_decode(json_encode($innerXmlObject), true);

            // Exibir resultado
            if(isset($array['retorno']) && $array['retorno']=='0'){
                $ret['exec'] = true;
                $ret['data'] = $array;
                $ret['mens'] = isset($array['retornoMsg']) ? $array['retornoMsg'] : 'Cancelado com sucesso!';
                $ret['color'] = 'success';
            }else{
                $ret['mens'] = isset($array['retornoMsg']) ? $array['retornoMsg'] : 'Erro ao cancelar!';
            }
        } else {
            // $ret['data'] = $array;
            $ret['mens'] = "Erro: O nó ns2:contratarSeguro não foi encontrado!";
        }
        return $ret;
    }
}
