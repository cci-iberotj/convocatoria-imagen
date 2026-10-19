# -*- coding: utf-8 -*-
"""
Convocatoria de imagen - servidor local para revisar el formulario

    python servidor.py          → abre http://localhost:8791/

Sólo sirve los archivos de esta carpeta (no guarda nada: las
respuestas en modo local viven en el navegador). Hace falta porque
la cámara (getUserMedia) sólo funciona en https o en localhost, no
abriendo el archivo directo desde el disco.
"""

import os
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RAIZ = os.path.dirname(os.path.abspath(__file__))
PUERTO = 8791


class Manejador(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=RAIZ, **k)

    def end_headers(self):
        # Que al corregir algo se vea al recargar, sin pelearse con la caché.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "--callado" not in sys.argv:
            super().log_message(fmt, *args)


def main():
    servidor = ThreadingHTTPServer(("127.0.0.1", PUERTO), Manejador)
    url = "http://localhost:{}/".format(PUERTO)
    print("\n  Convocatoria de imagen")
    print("  formulario: {}".format(url))
    print("  equipo:     {}equipo.html".format(url))
    print("  Ctrl+C para cerrar.\n")
    if "--sin-navegador" not in sys.argv:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
