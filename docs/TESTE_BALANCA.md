# Teste de comunicação com a balança

Este roteiro serve para descobrir o protocolo real da Filizola antes de implementar o parser de peso.

## Objetivo

Capturar exatamente os bytes enviados/recebidos pela interface serial da balança, sem assumir protocolo, comando ou pinagem.

## Preparação

1. Identifique o modelo exato na etiqueta da balança.
2. Fotografe a etiqueta e o conector/cabo de comunicação existente.
3. Conecte a interface serial ao notebook usando o cabo correto do modelo e, se necessário, um conversor USB -> RS-232.
4. Abra o Renascer Pesagem.
5. Clique em **Atualizar portas** e anote qual COM aparece/desaparece ao conectar o adaptador.

## Configuração inicial sugerida para diagnóstico

Comece com:

- Baud rate: 2400
- Data bits: 8
- Stop bits: 1
- Paridade: nenhuma
- RTS/CTS: desligado
- XON/XOFF: desligado

Esses parâmetros são apenas um ponto inicial comum em documentação de algumas linhas Filizola. Se não houver comunicação, teste as demais velocidades disponíveis no aplicativo. Não altere configurações internas da balança durante o diagnóstico.

## Teste A - transmissão espontânea

1. Conecte à porta COM.
2. Coloque a balança sem peso e aguarde alguns segundos.
3. Coloque um peso conhecido.
4. Retire o peso.
5. Observe se aparecem blocos em **Captura serial**.

Se houver dados, repita com pelo menos três pesos diferentes e exporte a sessão.

## Teste B - transmissão sob demanda

Se nada aparecer, a balança pode exigir uma solicitação do computador.

O aplicativo possui a seção **Envio manual** com modos ASCII e HEX. Não envie comandos aleatórios. Use somente um comando confirmado no manual técnico do modelo ou informado pela assistência Filizola. O objetivo desta função é permitir o teste quando soubermos o comando correto.

## Exportação

Clique em **Exportar captura**. O arquivo inclui:

- porta e parâmetros seriais;
- horário;
- quantidade de blocos e bytes;
- texto bruto;
- hexadecimal bruto;
- comandos enviados durante o teste.

Esse arquivo é o material que usaremos para implementar o parser do modelo real.

## Segurança

Este diagnóstico não acessa Supabase, não contém service role e não altera preço/produto/comanda. Ele apenas conversa com a porta serial local.
