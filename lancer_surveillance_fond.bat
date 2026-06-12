@echo off
chcp 65001 >/dev/null
cd /d "%~dp0"
start "KPI Watcher" /MIN python watcher_service.py
echo Service de surveillance démarré en arrière-plan.
echo Logs dans : %~dp0watcher_service.log
echo Pour arrêter : fermez la fenêtre "KPI Watcher" dans la barre des tâches
timeout /t 3 >/dev/null
