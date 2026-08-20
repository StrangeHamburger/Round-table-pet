# 在桌面创建「团团」快捷方式（双击即启动桌宠）
$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$lnkPath = Join-Path $desktop '团团.lnk'

$lnk = $ws.CreateShortcut($lnkPath)
$lnk.TargetPath = 'C:\Users\hbg20\桌宠\node_modules\electron\dist\electron.exe'
$lnk.Arguments = 'C:\Users\hbg20\桌宠'
$lnk.WorkingDirectory = 'C:\Users\hbg20\桌宠'
$lnk.IconLocation = 'C:\Users\hbg20\桌宠\icon.ico, 0'
$lnk.Description = '团团桌面宠物'
$lnk.Save()

Write-Output ('OK ' + $lnkPath)
