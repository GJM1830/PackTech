import psycopg2

conn = psycopg2.connect(
    host="127.0.0.1",
    port=5432,
    dbname="PackTech",
    user="postgres",
    password="packtech123"
)

print("Conexión exitosa")

conn.close()