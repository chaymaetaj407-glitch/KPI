@echo off
chcp 65001 >nul
color 0A
cls

echo ========================================================
echo    DASHBOARD KPI - MISE A JOUR v2
echo    Donnees + Commentaires persistants dans Excel
echo ========================================================
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Python non installe
    echo Telechargez Python : https://www.python.org/downloads/
    pause & exit /b 1
)

pip show openpyxl >nul 2>&1
if %errorlevel% neq 0 (
    echo Installation openpyxl...
    pip install openpyxl --quiet
)

pip show pandas >nul 2>&1
if %errorlevel% neq 0 (
    echo Installation pandas...
    pip install pandas --quiet
)

echo Lancement de la mise a jour...
echo.
python -X utf8 update_dashboard_v2_FINAL.py 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERREUR dans le script Python - voir message ci-dessus
)

echo.
pause
