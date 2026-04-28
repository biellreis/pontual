import pandas as pd
import PyPDF2

print("=== EXCEL DATA ===")
try:
    df = pd.read_excel('INCONSISTÊNCIAS DO MÊS DE ABRIL- 2026.xlsx')
    print("Columns:", df.columns.tolist())
    print(df.head(20).to_string())
    print("Total rows:", len(df))
except Exception as e:
    print("Error reading excel:", e)

print("\n=== PDF DATA ===")
try:
    with open('RELATORIO TESTE.pdf', 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        for i in range(min(2, len(reader.pages))): # just print first 2 pages
            print(f"Page {i+1}:")
            print(reader.pages[i].extract_text())
except Exception as e:
    print("Error reading PDF:", e)

