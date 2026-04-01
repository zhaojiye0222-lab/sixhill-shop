param([string])
Add-Type -AssemblyName System.Windows.Forms
Start-Process "ssh" -ArgumentList "-o StrictHostKeyChecking=no root@8.215.108.239" -WindowStyle Normal
Start-Sleep -Seconds 2
[System.Windows.Forms.SendKeys]::SendWait("$password{ENTER}")
