@echo off
title DLCTS Secure Access
py "%~dp0server.py" --prototype-verification
if errorlevel 1 pause
