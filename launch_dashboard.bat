@echo off
chcp 65001 >nul
color 0A
cls

echo ========================================================
echo    DASHBOARD KPI - LANCEMENT
echo ========================================================
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Python non installe
    echo Telechargez Python : https://www.python.org/downloads/
    pause & exit /b 1
)

pip show openpyxl pandas >nul 2>&1
if %errorlevel% neq 0 (
    echo Installation des dependances...
    pip install pandas openpyxl --quiet
)

echo  Lancement du serveur local...
echo  Le dashboard va s'ouvrir dans votre navigateur.
echo.
echo  Pour arreter : fermez cette fenetre
echo.

python server.py

pause
