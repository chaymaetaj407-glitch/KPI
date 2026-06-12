@echo off
chcp 65001 >/dev/null
echo ============================================================
echo   Service de surveillance automatique des bilans KPI
echo ============================================================
echo.
echo Ce service surveille le dossier "bilans\" et met à jour
echo automatiquement le dashboard quand un nouveau bilan arrive.
echo.
echo Déposez vos fichiers bilan dans : %~dp0bilans\
echo Format du nom : Bilan_S23_2026.xlsx
echo.
cd /d "%~dp0"
python watcher_service.py %*
if errorlevel 1 (
  echo.
  echo ERREUR : Vérifiez que Python est installé et que les
  echo dépendances sont présentes (pip install pandas openpyxl)
  pause
)
