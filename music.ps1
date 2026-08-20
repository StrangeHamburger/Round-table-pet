# Music bridge for desktop pet (persistent process, line protocol)
# input: one command per line: get | quit
# output: one JSON per line: { playing, hasSession, title, artist, status }
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# --- WinRT async helper (IAsyncOperation<T> -> sync .NET Task) ---
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
  Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]

function Await($WinRtTask, $ResultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}

# --- Load GSMTC session manager once (cached) ---
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
$script:manager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

function Get-State {
  if (-not $script:manager) { return @{ playing = $false; hasSession = $false } }
  try { $sessions = @($script:manager.GetSessions()) } catch { return @{ playing = $false; hasSession = $false } }
  if ($sessions.Count -eq 0) { return @{ playing = $false; hasSession = $false } }

  # pick the Playing session if any, else the first one
  $s = $null
  foreach ($cand in $sessions) {
    try {
      $pb0 = $cand.GetPlaybackInfo()
      if ([string]$pb0.PlaybackStatus -eq 'Playing') { $s = $cand; break }
    } catch {}
  }
  if (-not $s) { $s = $sessions[0] }

  try {
    $props = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $pb = $s.GetPlaybackInfo()
    return @{
      playing    = ([string]$pb.PlaybackStatus -eq 'Playing')
      hasSession = $true
      title      = [string]$props.Title
      artist     = [string]$props.Artist
      status     = [string]$pb.PlaybackStatus
    }
  } catch {
    return @{ playing = $false; hasSession = $true }
  }
}

function Send-Json($obj) {
  $json = $obj | ConvertTo-Json -Compress
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
}

while (($cmd = [Console]::In.ReadLine()) -ne $null) {
  $cmd = $cmd.Trim().ToLower()
  switch ($cmd) {
    'get'  { Send-Json (Get-State) }
    'quit' { break }
    default { Send-Json (Get-State) }
  }
}
