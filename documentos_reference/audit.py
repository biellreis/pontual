import pandas as pd
import PyPDF2
import re

print("=== Lendo Excel ===")
df = pd.read_excel('INCONSISTÊNCIAS DO MÊS DE ABRIL- 2026.xlsx', header=1)
excel_records = []
for index, row in df.iterrows():
    nome = str(row['NOME DO SERVIDOR']).strip()
    data = str(row['DATA']).strip().split(' ')[0] if pd.notna(row['DATA']) else ''
    tipo = str(row['TIPO DE INCONSISTÊNCIA']).strip()
    if nome and nome != 'nan' and tipo and tipo != 'nan':
        excel_records.append({'nome': nome, 'data': data, 'tipo': tipo})

print(f"Total Excel registros extraidos: {len(excel_records)}")

print("=== Lendo PDF ===")
pdf_records = []
try:
    with open('RELATORIO_TESTE.pdf', 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        text = ''
        for i in range(len(reader.pages)):
            text += reader.pages[i].extract_text() + '\n'
            
        # O PDF possui linhas da tabela na forma: 08/04/2026 Qua NOME ENTRADA SAIDA STATUS
        # Vamos buscar com regex ou algo mais simples
        # Formato da data: dd/mm/yyyy
        lines = text.split('\n')
        
        # Como o nome pode conter espaços, vamos tentar extrair as partes
        for line in lines:
            line = line.strip()
            # ex: 08/04/2026 Qua REGINA GOMES GRANDAL 08:30 — Atraso
            match = re.match(r'^(\d{2}/\d{2}/\d{4})\s+([a-zA-Záéíóúçãõ]+)\s+(.+?)\s+([0-9:]{5}|—)\s+([0-9:]{5}|—)\s+(Falta|Atraso|Saída Ant\.|S/ Entrada|S/ Saída)$', line)
            if match:
                data_br = match.group(1)
                dia_sem = match.group(2)
                nome = match.group(3).strip()
                entrada = match.group(4)
                saida = match.group(5)
                status = match.group(6)
                
                # Converter data_br para ISO 
                d, m, y = data_br.split('/')
                data_iso = f"{y}-{m}-{d}"
                
                pdf_records.append({'nome': nome, 'data': data_iso, 'tipo': status})

except Exception as e:
    print('Erro:', e)

print(f"Total PDF registros extraidos: {len(pdf_records)}")

# Agrupar para facilitar comparacao
excel_df = pd.DataFrame(excel_records)
pdf_df = pd.DataFrame(pdf_records)

if len(excel_df) > 0:
    print("\nResumo Excel por Tipo:")
    print(excel_df['tipo'].value_counts())

if len(pdf_df) > 0:
    print("\nResumo PDF por Tipo:")
    print(pdf_df['tipo'].value_counts())

