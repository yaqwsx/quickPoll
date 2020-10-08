#!/usr/bin/env python3

import importlib.util
import sys
import psycopg2

if len(sys.argv) < 2:
    print("Invalid usage! Use './addTeachers.py <path_to_config_file> <teacher login>...")
    sys.exit(1)

# Import configuration from python file
spec = importlib.util.spec_from_file_location("config", sys.argv[1])
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)

db = psycopg2.connect(**config.DB_CONNECTION)

cursor = db.cursor()

try:
    for teacherLogin in sys.argv[2:]:
        cursor.execute("""
            INSERT INTO teachers (login)
                VALUES (%s)
                ON CONFLICT (login) DO NOTHING;
            """, [teacherLogin])
except Exception as e:
    db.rollback()
    raise
else:
    db.commit()