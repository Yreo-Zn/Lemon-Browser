const { exec } = require('child_process');

const shortcutPath = "C:\\Users\\denis\\Desktop\\Lemon Browser.lnk";
const psScript = `
$path = "${shortcutPath}"
if (Test-Path $path) {
    $shell = New-Object -COM WScript.Shell
    $shortcut = $shell.CreateShortcut($path)
    if (-not $shortcut.Hotkey) {
        $shortcut.Hotkey = "Ctrl+Alt+L"
        $shortcut.Save()
    }
    Write-Host "Success"
} else {
    Write-Host "File not found"
}
`;
const encodedCommand = Buffer.from(psScript, 'utf16le').toString('base64');
exec(`powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encodedCommand}`, (error, stdout, stderr) => {
    console.log("Error:", error);
    console.log("Stdout:", stdout);
    console.log("Stderr:", stderr);
});
