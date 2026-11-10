# Prompt inicial para Claude Code

Copia e envia este prompt depois de abrires a pasta do repositório no Claude Code:

---

Quero começar a desenvolver o **CAPTAIN SHOOTOUT**. Antes de escrever código, lê integralmente os ficheiros `CLAUDE.md`, `PROJECT_SPEC.md`, `TECHNICAL_ARCHITECTURE.md` e `IMPLEMENTATION_PLAN.md`.

O produto é um jogo de basquetebol 3D em primeira pessoa para uma booth. O computador apresenta o campo e o cesto; o jogador usa o telemóvel como comando, através de uma página web aberta por QR code, e faz swipe para lançar a bola. Cada ronda dura 30 segundos.

Segue estas regras:
- Não implementes o projeto inteiro de uma vez.
- Primeiro inspeciona o repositório e identifica o estado atual.
- Confirma as versões e compatibilidade das dependências antes de as instalar.
- Começa pela fundação do projeto e pelo protótipo 3D local.
- Não integres Firebase nesta primeira fase.
- Usa uma solução temporária de teclado/rato para testar lançamentos antes de ligar o telemóvel.
- Mantém a lógica de física, scoring e estado do jogo separada da UI.
- O desktop é a autoridade sobre o timer, física e pontuação.
- Não inventes funcionalidades fora do MVP sem me perguntares.

Na tua primeira resposta:
1. Resume a arquitetura que entendeste.
2. Analisa o estado atual do repositório.
3. Propõe as tarefas concretas do primeiro milestone.
4. Identifica dúvidas ou decisões que bloqueiem o arranque.

Depois de eu confirmar, implementa apenas esse milestone. No fim, executa os checks relevantes e apresenta um resumo do que foi feito e do próximo passo.

---
