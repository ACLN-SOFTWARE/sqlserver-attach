# sqlattach

Uma ferramenta de linha de comando (CLI) baseada em Node.js desenvolvida para simplificar e automatizar drasticamente o processo de **Restore/Attach** de arquivos `.mdf` e `.ldf` do SQL Server em containers Docker.

## Visão Geral

Se você possui backups antigos baseados em arquivos brutos do SQL Server (`.mdf` e `.ldf`) e trabalha com containers no Docker (seja no Linux, WSL ou Mac), restaurar múltiplos bancos exige copiar os arquivos manualmente para dentro do container e escrever complexos scripts `CREATE DATABASE FOR ATTACH`.

O **sqlattach** resolve isso em um único comando:

- **Varredura Inteligente:** Encontra pares MDF/LDF recursivamente em suas pastas.
- **Stream Direto:** Usa _Tar Streams_ para transferir os arquivos diretamente para o _filesystem_ do container de forma extremamente rápida, preservando permissões (`chown`).
- **Conexão Nativa:** Conecta ao banco de dados via Node (`mssql` na porta 1433) sem depender de ferramentas instaladas dentro do container como o `sqlcmd`.
- **Alta Performance:** Suporta execuções **paralelas** restaurando dezenas de bancos ao mesmo tempo.

## Requisitos

- **Node.js** 22+
- **Docker** em execução no host.
- Acesso à porta 1433 (ou a porta exposta no container do banco).

## Instalação

Dentro do projeto:

```bash
npm install
```

_(Você pode torná-lo executável globalmente com `npm link` ou executá-lo através do Node diretamente)._

## Configuração (`sqlattach.yml`)

A ferramenta aceita parâmetros por linha de comando ou através de um arquivo `sqlattach.yml` na pasta atual de onde o comando é executado.

Exemplo de `sqlattach.yml`:

```yaml
container: sqlserver
host: localhost
port: 1433
user: sa
password: 'SuaSenhaSuperSegura123!'
sqlPath: /var/opt/mssql/data
parallel: 3
cleanup: true
replace: false
waitTimeout: 180
```

## Como Usar

Para escanear uma pasta chamada `/backups/ClienteA` e anexar os bancos de dados ali contidos:

```bash
node cli.js /backups/ClienteA
```

### Argumentos Comuns (Sobrescrevem o YML)

- **Restaurar e substituir bases que já existam com o mesmo nome**:

  ```bash
  node cli.js /backups --replace
  ```

- **Definir um nome específico (se a pasta possuir apenas 1 banco)**:

  ```bash
  node cli.js /backups/ClienteA --name EscolaNova
  ```

- **Definir concorrência (ex: 5 restaurações simultâneas)**:

  ```bash
  node cli.js /backups --parallel 5
  ```

- **Verificar o que será feito antes de executar (Modo Dry-Run)**:
  ```bash
  node cli.js /backups --dry-run
  ```

## Estrutura do Projeto

- `cli.js`: Ponto de entrada.
- `config.js`: Parse de YML e validação Zod.
- `scanner.js`: Varredura recursiva de diretórios.
- `validator.js`: Valida existência e tamanho dos arquivos.
- `docker.js`: Detecção, criação de containers e transferências via Tar Stream.
- `sqlserver.js`: Interação via T-SQL para drop e attach.
- `attach.js`: Orquestrador com fila de execução paralela.
- `logger.js`: Motor de logs utilizando o _Pino_.

## Testes e Cobertura

O projeto utiliza **Vitest** visando alta cobertura. Para rodar a suíte de testes:

```bash
npm run test
```

Para exibir a tabela de cobertura:

```bash
npm run coverage
```
