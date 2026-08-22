# Pixel Pay

Pelo que consegui verificar, o domínio parece redirecionar para a infraestrutura da Dropayment. A plataforma funciona como um **gateway de pagamentos e gestão de vendas**, com foco em vendedores digitais, checkout online, carteira, saques, produtos, webhooks, API REST, relatórios e controlo financeiro. ([dropayment.com -][1])



Se queres criar uma plataforma semelhante, este prompt é mais completo:



# Prompt Completo - Plataforma de Pagamentos e Vendas Digitais Tipo Dropayment



Crie uma plataforma SaaS profissional chamada "DropPay Pro" inspirada nos maiores gateways de pagamento digitais.



## Tecnologias



* HTML5

* CSS3 Avançado

* JavaScript ES6

* Firebase Authentication

* Firebase Realtime Database

* Bootstrap 5

* Font Awesome

* API REST

* Webhooks

* Dark Mode

* PWA Mobile



## Design



Criar interface moderna, futurista e profissional semelhante à Stripe, Hotmart, Kirvano e Dropayment.



Características:



* Tema escuro premium

* Gradientes modernos

* Cards glassmorphism

* Animações suaves

* Dashboard responsivo

* Sidebar recolhível

* Mobile First

* Estatísticas em tempo real



## Página Inicial



Banner principal com:



* Título impactante

* Botão Criar Conta

* Botão Login

* Estatísticas ao vivo

* Métodos de pagamento



Seções:



* Como funciona

* Benefícios

* Segurança

* FAQ

* Depoimentos

* Integrações

* Planos



## Sistema de Cadastro



Campos:



* Nome

* Email

* Telefone

* Palavra-passe

* País

* Documento



Verificação:



* Email

* Telefone

* KYC



## Dashboard do Vendedor



Cards:



* Vendas Hoje

* Receita Total

* Saldo Disponível

* Saques Pendentes

* Produtos Ativos

* Conversão



Gráficos:



* Vendas

* Receita

* Métodos de Pagamento

* Origem do Tráfego



## Gestão de Produtos



Criar Produto



Campos:



* Nome

* Descrição

* Imagem

* Preço

* Categoria

* Link de entrega

* Arquivo digital

* Página de obrigado



Funções:



* Editar

* Excluir

* Duplicar

* Ativar

* Desativar



## Checkout



Checkout de alta conversão.



Campos:



* Nome

* Email

* Telefone



Métodos:



* M-Pesa

* E-Mola

* mKesh

* Cartão Visa

* Mastercard

* PayPal



Recursos:



* Order Bump

* Cupom

* Upsell

* Downsell

* Timer

* Pixel Facebook

* TikTok Pixel



## Gestão de Vendas



Tabela completa:



* ID

* Produto

* Cliente

* Valor

* Comissão

* Status

* Data



Filtros:



* Hoje

* Semana

* Mês

* Ano



Status:



* Pago

* Pendente

* Cancelado

* Reembolsado



## Carteira Digital



Mostrar:



* Saldo Disponível

* Saldo Bloqueado

* Receita Total

* Total Sacado



Moedas:



* MZN

* USD

* ZAR



Histórico:



* Entradas

* Saídas

* Reembolsos

* Comissões



## Sistema de Saques



Métodos:



* M-Pesa

* E-Mola

* Banco



Fluxo:



1. Solicitar saque

2. Validar saldo

3. Aprovação automática

4. Transferência

5. Notificação



Status:



* Pendente

* Processando

* Concluído

* Rejeitado



## Área do Desenvolvedor



Gerar API Keys:



* Sandbox

* Produção



Permissões:



* vendas:read

* vendas:write

* produtos:read

* produtos:write

* carteira:read

* saques:read

* webhooks:read



## API REST



Endpoints:



GET /api/v1/vendas



GET /api/v1/vendas/:id



GET /api/v1/produtos



POST /api/v1/produtos



PUT /api/v1/produtos/:id



DELETE /api/v1/produtos/:id



GET /api/v1/carteira/saldo



GET /api/v1/saques



POST /api/v1/saques



GET /api/v1/webhooks



POST /api/v1/webhooks



## Webhooks



Eventos:



* venda.aprovada

* venda.pendente

* venda.cancelada

* saque.criado

* saque.aprovado

* saque.rejeitado

* produto.criado



Segurança:



* HMAC SHA256

* Assinatura Digital

* Logs



## Sistema de Afiliados



Área exclusiva.



Funções:



* Link de afiliado

* Comissão

* Cliques

* Conversões

* Pagamentos



## Área Administrativa



Controle total.



Visualizar:



* Usuários

* Vendas

* Produtos

* Saques

* Carteiras

* Comissões



Funções:



* Aprovar vendedores

* Bloquear contas

* Liberar saldo

* Processar saques

* Gerir taxas



## Segurança



* JWT

* Firebase Auth

* Rate Limit

* Anti-Fraude

* Criptografia

* 2FA

* Logs



## Notificações



Enviar:



* Email

* SMS

* WhatsApp



Eventos:



* Nova venda

* Pagamento aprovado

* Saque aprovado

* Reembolso



## Integrações



* M-Pesa API

* E-Mola API

* PayPal

* Stripe

* Facebook Pixel

* TikTok Pixel

* Google Analytics

* UTMify



## Aplicação Mobile



PWA instalável.



* Android

* iPhone



Modo offline parcial.



Objetivo final: criar a plataforma de pagamentos e vendas digitais mais moderna de Moçambique, semelhante à Dropay

ment, Hotmart, Kirvano e Stripe, com dashboard avançado, API REST, Webhooks, carteira digital, checkout de alta conversão e sistema de afiliados.



Essa versão já serve para usar em IA como Lovable, Bolt, Replit AI ou Claude Code para gerar praticamente uma plataforma completa.



[1]: https://dropayment.com/?utm_source=chatgpt.com "Home - dropayment.com"

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/71155032-297e-4016-bdfe-df68f8ff9b21).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
