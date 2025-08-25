import pandas as pd
df = pd.read_csv(r"backend\risk_predictions_20250808_110625.csv")
print(df["risk_score"].describe())
print("Nulls:", df["risk_score"].isna().sum()) 
high = (df["risk_score"] >= 0.70).sum()
med = ((df["risk_score"] >= 0.40) & (df["risk_score"] < 0.70)).sum() 
low = (df["risk_score"] < 0.40).sum()

print("Buckets:", {"high": high, "medium": med, "low": low}, "Total:", high+med+low, "Rows:", len(df)) 
print("Class dist:\n", df["at_risk_prediction"].value_counts())