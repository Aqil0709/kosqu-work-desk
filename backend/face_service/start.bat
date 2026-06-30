@echo off
echo Starting Face Recognition Service...
cd /d "%~dp0"

:: Check if venv exists, create if not
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

:: Activate venv
call venv\Scripts\activate.bat

:: Install dependencies
echo Installing dependencies...
pip install -r requirements.txt --quiet

:: Start service
echo Face service starting on http://localhost:5002
python face_service.py
