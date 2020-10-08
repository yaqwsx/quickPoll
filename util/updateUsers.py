#!/usr/bin/env python3

import ldap
import importlib.util
import sys
import psycopg2

def getUcoFromDescription(descr):
    for item in descr:
        item = item.decode("utf-8")
        if item.startswith("UCO="):
            return int(item.split("=")[1])
    return None

def ldapRecordToTableRow(rec):
    rec = rec[1]
    name = rec.get("displayName", None)
    if name is not None:
        name = name[0].decode("utf-8")
    login = rec.get("uid", None)
    if login is not None:
        login = login[0].decode("utf-8")
    return {
        "login": login,
        "name": name,
        "uco": getUcoFromDescription(rec.get("description", []))
    }

if len(sys.argv) != 2:
    print("Invalid usage! Use './updateUsers.py <path_to_config_file>")
    sys.exit(1)

# Import configuration from python file
spec = importlib.util.spec_from_file_location("config", sys.argv[1])
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)

db = psycopg2.connect(**config.DB_CONNECTION)

l = ldap.initialize('ldap://ldap.fi.muni.cz')
l.simple_bind_s()
res = l.search_s('ou=People,dc=fi,dc=muni,dc=cz', ldap.SCOPE_SUBTREE)

cursor = db.cursor()

try:
    for rec in res:
        row = ldapRecordToTableRow(rec)
        if row["login"] is None:
            continue
        cursor.execute("""
            INSERT INTO people (login, name, uco)
                VALUES (%s, %s, %s)
                ON CONFLICT (login) DO UPDATE
                SET name = excluded.name,
                    uco = excluded.uco;
            """, [
                row["login"],
                row["name"],
                row["uco"],
            ])
except Exception as e:
    db.rollback()
    raise
else:
    db.commit()