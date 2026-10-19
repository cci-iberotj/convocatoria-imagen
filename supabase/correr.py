# -*- coding: utf-8 -*-
"""
Convocatoria de imagen - Correr SQL en la base de LA PIZARRA

    python supabase/correr.py casting.sql
    python supabase/correr.py "select count(*) from casting"

Es el mismo correr.py de LA PIZARRA apuntando al mismo proyecto
(wrezcukptrtmnhnlxmao): la tabla `casting` vive ahí, junto a
`solicitudes` y `revisiones`. El token de cuenta se lee del mismo
lugar que usa LA PIZARRA (LA PIZARRA/datos/token_supabase.txt),
así que no hay que pegarlo dos veces.

Cualquier instrucción que borre datos la detiene y la enseña
antes; para correrla hay que agregar --si-borra a propósito.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
TOKEN = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(AQUI))),
                     "LA PIZARRA", "datos", "token_supabase.txt")
PROYECTO = "wrezcukptrtmnhnlxmao"
API = "https://api.supabase.com/v1/projects/{}/database/query"

PELIGROSAS = [
    (r"\bdrop\s+table\b", "drop table"),
    (r"\bdrop\s+schema\b", "drop schema"),
    (r"\btruncate\b", "truncate"),
    (r"\bdelete\s+from\b", "delete from"),
    (r"\bdrop\s+column\b", "drop column"),
]


def salir(mensaje):
    print("\n  " + mensaje.replace("\n", "\n  ") + "\n")
    sys.exit(1)


def leer_token():
    if not os.path.exists(TOKEN):
        salir("No encuentro el token de LA PIZARRA en:\n\n    {}".format(TOKEN))
    with open(TOKEN, "r", encoding="utf-8") as f:
        reales = [l.strip() for l in f if l.strip() and not l.strip().startswith("#")]
    t = reales[0] if reales else ""
    if not t.startswith("sbp_"):
        salir("Eso no parece un token de cuenta de Supabase (empiezan con sbp_).")
    return t


def ejecutar(sql, token):
    peticion = urllib.request.Request(
        API.format(PROYECTO),
        data=json.dumps({"query": sql}).encode("utf-8"),
        headers={"Authorization": "Bearer " + token,
                 "Content-Type": "application/json",
                 "User-Agent": "la-pizarra/1.0"},   # sin esto Cloudflare da 403
        method="POST",
    )
    try:
        with urllib.request.urlopen(peticion, timeout=120) as r:
            return json.loads(r.read().decode("utf-8") or "[]")
    except urllib.error.HTTPError as e:
        cuerpo = e.read().decode("utf-8", "replace")
        try:
            cuerpo = json.loads(cuerpo).get("message", cuerpo)
        except Exception:
            pass
        salir("Supabase respondió error {}:\n\n  {}".format(e.code, cuerpo))
    except urllib.error.URLError as e:
        salir("No hubo forma de llegar a Supabase: {}".format(e.reason))


def tabla(filas):
    if not isinstance(filas, list) or not filas:
        return
    columnas = list(filas[0].keys())
    anchos = [max(len(c), max(len(str(f.get(c, ""))) for f in filas)) for c in columnas]
    print("  " + "  ".join(c.ljust(a) for c, a in zip(columnas, anchos)))
    print("  " + "  ".join("-" * a for a in anchos))
    for f in filas:
        print("  " + "  ".join(str(f.get(c, "")).ljust(a) for c, a in zip(columnas, anchos)))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        salir("Dime qué correr:\n\n    python supabase/correr.py casting.sql")
    que = args[0]
    ruta = que if os.path.exists(que) else os.path.join(AQUI, que)
    if os.path.exists(ruta):
        with open(ruta, "r", encoding="utf-8") as f:
            sql = f.read()
        print("\n  archivo: {}".format(os.path.basename(ruta)))
    else:
        sql = que
        print("\n  sql: {}".format(sql[:70]))
    limpio = re.sub(r"--[^\n]*", "", sql).lower()
    peligros = [n for p, n in PELIGROSAS if re.search(p, limpio)]
    if peligros and "--si-borra" not in sys.argv:
        salir("Esto borra cosas ({}). Si es a propósito, agrega --si-borra.".format(", ".join(peligros)))
    print("  proyecto: {} (LA PIZARRA)".format(PROYECTO))
    tabla(ejecutar(sql, leer_token()))
    print("\n  Listo.\n")


if __name__ == "__main__":
    main()
