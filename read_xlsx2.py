import pandas as pd

excel_path = r'c:\Users\Vitor\Desktop\Vitor\contabilidade_vitor\Teste-contabilidade.xlsx'
out_path = r'c:\Users\Vitor\Desktop\Vitor\contabilidade_vitor\excel_structure.txt'

try:
    with open(out_path, 'w', encoding='utf-8') as f:
        xls = pd.ExcelFile(excel_path)
        f.write(f"Sheets found: {xls.sheet_names}\n\n")
        
        for sheet in xls.sheet_names:
            f.write(f"--- Sheet: {sheet} ---\n")
            df = pd.read_excel(excel_path, sheet_name=sheet)
            f.write(f"Columns: {df.columns.tolist()}\n")
            f.write("First 3 rows:\n")
            f.write(df.head(3).to_string() + "\n\n")
            
    print("Done")
except Exception as e:
    print(f"Error: {e}")
