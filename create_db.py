import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

try:
    print("Connecting to default 'postgres' database to check for 'farmland_db'...")
    conn = psycopg2.connect(
        user="postgres",
        password="password123",
        host="localhost",
        port="5432",
        dbname="postgres",
        client_encoding="utf8"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    cursor.execute("CREATE DATABASE farmland_db;")
    print("SUCCESS: Database 'farmland_db' created successfully!")
    cursor.close()
    conn.close()
except psycopg2.errors.DuplicateDatabase:
    print("SUCCESS: Database 'farmland_db' already exists. No action needed.")
except Exception as e:
    print(f"FAILED: Could not connect or create database. Error: {e}")
