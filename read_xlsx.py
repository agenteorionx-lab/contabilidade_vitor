import pandas as pd

excel_path = r'c:\Users\Vitor\Desktop\Vitor\contabilidade_vitor\Teste-contabilidade.xlsx'

try:
    xls = pd.ExcelFile(excel_path)
    print("Sheets found:", xls.sheet_names)
    
    for sheet in xls.sheet_names:
        print(f"\n--- Sheet: {sheet} ---")
        df = pd.read_excel(excel_path, sheet_name=sheet)
        print("Columns:", df.columns.tolist())
        print("First 3 rows:")
        print(df.head(3))
except Exception as e:
    print(f"Error reading Excel file: {e}")
