# Keyboard bridge for desktop pet (persistent process, line protocol)
# input: one command per line: get | quit
# output: one JSON per line: { down, newly }  (down=当前按住的打字键数, newly=自上次以来新按下的键数)
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class KB {
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
}
"@

# 只统计"打字"相关键：空格/退格/Tab/回车 + 数字 + 字母 + 小键盘 + 标点区（OEM）
# 排除修饰键(Shift/Ctrl/Alt/Win)、鼠标键、F 功能键等
$keys = @(0x20, 0x08, 0x09, 0x0D) + (0x30..0x39) + (0x41..0x5A) + (0x60..0x69) + (0xBA..0xDE)
$prev = @{}

function Get-Presses {
  $newly = 0
  $down = 0
  foreach ($vk in $keys) {
    $isDown = (([KB]::GetAsyncKeyState($vk)) -band 0x8000) -ne 0
    if ($isDown) { $down++ }
    if ($isDown -and -not $prev[$vk]) { $newly++ }
    $prev[$vk] = $isDown
  }
  @{ down = $down; newly = $newly }
}

while (($cmd = [Console]::In.ReadLine()) -ne $null) {
  $cmd = $cmd.Trim().ToLower()
  switch ($cmd) {
    'get'  { $r = Get-Presses; [Console]::Out.WriteLine(($r | ConvertTo-Json -Compress)); [Console]::Out.Flush() }
    'quit' { break }
    default { }
  }
}
