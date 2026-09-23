# NetSide Retaguarda Desktop

Aplicação desktop Windows para retaguarda comercial, construída com Electron, HTML/CSS/JavaScript e SQLite local.

## Recursos

- Interface inspirada no ERP tradicional da referência visual fornecida.
- Cadastro e pesquisa de clientes, produtos e funcionários.
- Produtos inicialmente vazios para pesquisa/cadastro e compatíveis com leitor USB que funciona como teclado.
- Pedidos, pré-vendas, orçamentos, ordens de serviço e registro de entradas.
- Faturamento com F12: PIX fictício com aprovação após 20 segundos, dinheiro com troco e crédito/débito simulados.
- Movimento de caixa e módulos locais de simulação de NF-e/NFC-e.
- Persistência local em SQLite na pasta de dados do usuário.
- Instalador NSIS para Windows com atalho, Menu Iniciar e desinstalação.

## Desenvolvimento

```bash
pnpm install
pnpm --filter @workspace/netside-retaguarda start
```

## Teste do SQLite

```bash
pnpm --filter @workspace/netside-retaguarda db:smoke
```

## Gerar instalador Windows

```bash
pnpm --filter @workspace/netside-retaguarda build
```

O instalador será criado como `release/NetSide-Retaguarda-Setup.exe`.

> NF-e e NFC-e são somente simulações locais. O aplicativo não transmite documentos fiscais reais.