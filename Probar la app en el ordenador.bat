@echo off
rem Abre la app en el navegador del ordenador para probarla.
rem Cierra esta ventana para apagarla.
cd /d "%~dp0"
start "" http://localhost:8000
python -m http.server 8000 --bind localhost --directory web
