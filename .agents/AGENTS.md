# Regras de Agente - Projeto `sqlattach`

Este projeto é uma ferramenta CLI em Node.js (`sqlattach`) e este arquivo define regras de comportamento para agentes IA ao interagir com este workspace.

## 1. Stack Tecnológico e Dependências
- **Linguagem:** Node.js (EcmaScript Modules - `type: module`).
- **Versão Alvo:** Node.js 22+.
- **Dependências Principais:** `mssql` (banco), `commander` (CLI), `zod` (validações), `pino` e `pino-pretty` (logs), `p-limit` (concorrência), `tar-fs` (streams de arquivo), `yaml` (configuração).
- **Testes:** Utilizamos `vitest` e almejamos cobertura máxima (100% dos processos).

## 2. Princípios de Arquitetura e Padrões
- Mantenha a separação de responsabilidades (CLI, Config, Scanner, Validator, Docker, SqlServer, Orchestrator).
- **Nunca use `docker cp`** no código para transferir arquivos para o container. Utilizamos exclusivamente **Tar Streams** via `docker exec -i <container> tar x` por questões de performance ao lidar com arquivos grandes vindo do WSL.
- **Não use `sqlcmd`** via Docker exec. Todas as interações T-SQL (`CREATE DATABASE`, `DROP DATABASE`, validações de bases) devem ser feitas via driver nativo do Node (`mssql` pela porta 1433 do host).
- Toda configuração e argumento vindo de entrada de usuário deve passar pela validação estrita do `zod` no `config.js`.

## 3. Logs e Saída Visual
- Não utilize `console.log` para mensagens de diagnóstico. Use sempre o módulo `logger.js` (Pino).
- Mantenha logs informativos (INFO) no nível de orquestração e logs detalhados (DEBUG) para saídas técnicas (T-SQL gerado, mensagens de stderr do docker).

## 4. Testes Automatizados (Vitest)
- Sempre que criar um novo módulo ou regra de negócio, construa o arquivo de teste correspondente (`.test.js`) dentro do diretório `/tests`.
- Utilize `vi.mock` extensivamente para evitar depender de um container Docker real ou arquivo físico durante a execução de testes unitários da suíte básica.
- Não altere o comportamento de mock da biblioteca `p-limit` e do `tar-fs` a menos que saiba lidar com problemas de buffer e deadlock na suíte de testes.
