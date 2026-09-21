# 10. Memória Operacional Anti-Freeze e Diagnóstico de Sistema

> **Estação de Trabalho do Desenvolvedor:** Dell Inspiron 15 3520  
> **Sistema Operacional:** Ubuntu 24.04 LTS (Noble Numbat)  
> **Kernel Ativo / Suportado:** Linux 6.8.0-139-generic (linux-generic)  
> **Responsável / Desenvolvedor:** Daniel Arraes Reino (`coletivoaruatemvoz@gmail.com`)  
> **Objetivo Deste Documento:** Garantir tolerância a falhas, persistência febril ininterrupta contra congelamentos (*freezes*) do sistema hospedeiro e registro detalhado do ambiente de hardware para eliminar qualquer retrabalho.

---

## 1. O Problema do Freeze do Host e a Regra da "Persistência Febril"

### 1.1 Contexto e Motivação
A máquina hospedeira de desenvolvimento (Dell Inspiron 15 3520) possui um histórico de instabilidade térmica, de clock e de interrupções de hardware (I2C Goodix / Wi-Fi RTL8821CE) que, sob certas condições de carga desregulada ou regressão de kernel, pode sofrer travamentos súbitos (*hard freeze*).

Quando um freeze ocorre, qualquer contexto em memória volátil não persistido em disco ou não comitado no Git é perdido. Por isso, a **Regra de Ouro da Persistência Febril** foi estabelecida:

> [!CAUTION]
> **REGRA DE OURO DA PERSISTÊNCIA FEBRIL:**  
> Toda e qualquer decisão de arquitetura, refatoração de código, nova funcionalidade, migração SQL e status de sprint **DEVE SER PERSISTIDA IMEDIATAMENTE EM DISCO** dentro desta pasta `documentação viva/` e no Git com commits claros e atômicos.  
> Nunca acumule horas de raciocínio ou dezenas de arquivos alterados sem salvar e comitar. A documentação viva é o "cérebro persistente" que sobrevive a qualquer reinicialização abrupta.

---

## 2. Histórico de Bugs de Hardware, Diagnóstico e Mitigações Ativas

### 2.1 Bug do Kernel OEM 6.17 (Tempestade de Interrupções I2C)
* **Sintoma:** Congelamento total da interface gráfica ao utilizar o touchpad Goodix (`VEN_27C6`).
* **Causa Raiz:** O kernel OEM 6.17 introduziu um bug no driver de barramento I2C, gerando tempestade de dezenas de milhares de interrupções por segundo.
* **Resolução Definitiva:**
  1. Purga total dos pacotes do kernel OEM (`linux-oem-*`).
  2. Fixação e bloqueio do kernel na série estável `linux-generic`: **Kernel 6.8.0-138 / 6.8.0-139-generic**.

### 2.2 Subclocking Forçado da CPU (Queda para 400 MHz)
* **Sintoma:** Lentidão extrema repentina; o sistema passa a responder como se estivesse travado.
* **Causa Raiz:** Gestão agressiva e incorreta do firmware da Dell para sensores térmicos, travando a CPU no multiplicador mínimo de 400 MHz.
* **Resolução Definitiva:**
  * Criação do serviço systemd `/etc/systemd/system/cpu-performance-tune.service`.
  * Define o piso mínimo de frequência de todos os núcleos em **1.0 GHz** (1000000 kHz) e o governor em `balance_performance` ou `performance`.
  * **Verificação rápida:**
    ```bash
    systemctl status cpu-performance-tune.service --no-pager
    cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq
    ```

### 2.3 Instabilidade e Deadlock Wi-Fi (Realtek RTL8821CE)
* **Sintoma:** Congelamento do anel PCI com bloqueio do sistema operacional durante tráfego de rede intenso.
* **Causa Raiz:** Timeout no flush da fila do módulo `rtw88_8821ce` com estados profundos de economia de energia ASPM e MSI.
* **Resolução Definitiva:**
  * Parâmetros forçados em `/etc/modprobe.d/rtw88.conf`:
    ```ini
    options rtw88_core disable_lps_deep=y
    options rtw88_pci disable_aspm=y
    options rtw88_pci disable_msi=y
    ```

### 2.4 Bloqueio do Touchpad ao Digitar
* **Sintoma:** Sensação de teclado ou ponteiro congelando durante a escrita de código.
* **Resolução:** Desativação da opção `disable-while-typing` nas configurações do GNOME/libinput.

---

## 3. Runbook de Diagnóstico Rápido de Saúde do Host

Se notar qualquer micro-travamento, lentidão ou queda de desempenho no terminal, execute a seguinte sequência:

```bash
# 1. Conferir se o kernel ativo é o seguro (6.8.0-generic)
uname -r

# 2. Conferir o status do serviço de piso de CPU
systemctl status cpu-performance-tune.service --no-pager

# 3. Conferir se os núcleos da CPU não caíram para 400 MHz
cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq

# 4. Checar o log contínuo de pressão do sistema (PSI - Memory / CPU / IO)
tail -n 30 /mnt/armazenamento/freezelog/pressure.log

# 5. Monitorar se não houve tempestade de interrupções no barramento I2C
grep i2c /proc/interrupts
```

---

## 4. Diretrizes de Execução Segura para Agentes de IA

Ao operar ferramentas de execução de comandos (`run_command`), compilação ou testes nesta máquina:

1. **Evitar Concorrência Exaustiva:**
   - Em testes de carga ou Vitest, usar `--maxWorkers=2` ou `--workers=1` em pipelines pesados para evitar saturação instantânea de memória e CPU.
   - No Playwright móvel, sempre especificar `--workers=1`.
2. **Salvar Arquivos Antes de Compilar:**
   - Nunca disparar builds longos antes de garantir que os arquivos editados foram gravados em disco.
3. **Commit Frequente com Mensagens Semânticas:**
   - Realizar commits incrementais a cada marco concluído (`docs:`, `feat:`, `fix:`, `test:`).
   - Enviar com `git push origin main` logo em seguida. (Nota 2026-09-21: o projeto não está
     mais sincronizado com o Lovable — a menção anterior a essa integração foi removida por
     estar desatualizada. Push continua recomendado como prática de persistência, só não por
     causa do Lovable.)

---

## 5. Mapeamento Geral de Projetos do Sistema (`/mnt/armazenamento/Projetos`)

Para que o agente de IA nunca perca o contexto cruzado entre as iniciativas de Daniel Reino, segue o mapa de ecossistemas armazenados no mesmo disco:

1. **`triagem-medica/` (Projeto Atual — TriagemPsi):** Plataforma clínica multi-tenant para Saraiva Clínica de Psiquiatria e Instituto Lumina.
2. **`GASTRONOMIA_ALERO_ECOSYSTEM/`:** Alero SaaS, Feira de Barão (`feiradebarao.com.br`), Bar da Vila (`bardavila.bar`), precificação gastronômica.
3. **`JURIDICO_JUSSARA_ALESSANDRA/`:** Advocacia autoral, LegalOps, LexBR base legal, Romanov Advocacy.
4. **`CAMINHOS_BRASIL_POP_RUA/`:** Capacitação social, serious games, Ozipa Oziel, documentação Docsify.
5. **`APPS_E_GAMES_EXPERIMENTAIS/`:** Campinas Cidadã, PyChess Engine, automações experimentais de mídia.
6. **`BIBLIOTECA_EBOOKS_E_DOSSIES/`:** Livros, e-books e dossiês estratégicos de propriedade intelectual.
7. **`CLIENTES_MKT_E_ARTESANATO/`:** Catálogo comercial, Berga Charcutaria, Omar Cerâmica, Nilceia Autoral.
8. **`ENGINES_IA_E_AUTOMACOES/`:** NordestinoTTS, automação social, Agentic Seek, canal do YouTube.
9. **`CENE/` (em `/mnt/armazenamento/CENE`):** Video Factory, Social Hub Postiz, Studio e Open edX Tutor.
