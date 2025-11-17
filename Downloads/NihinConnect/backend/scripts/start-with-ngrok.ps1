$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $scriptDir "..\.venv\Scripts\python.exe"
try {
    $python = (Resolve-Path $python).Path
} catch {
    Write-Host "Python executable not found at $python. Activate your venv or run the script with the venv python." -ForegroundColor Yellow
    exit 1
}

Push-Location (Join-Path $scriptDir "..")
& $python (Join-Path $scriptDir 'run_with_ngrok.py')
Pop-Location
