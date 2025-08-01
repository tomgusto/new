# Version Control Script for Workout Manager
# Usage:
#   .\version-control.ps1 save "Description of changes"
#   .\version-control.ps1 list
#   .\version-control.ps1 restore VERSION_NUMBER

param(
    [string]$action = "list",
    [string]$description = "",
    [string]$version = ""
)

$versionsDir = "versions"
$currentFile = "index.html"
$versionsFile = "$versionsDir\versions.csv"

# Create versions directory if it doesn't exist
if (-not (Test-Path $versionsDir)) {
    New-Item -ItemType Directory -Path $versionsDir | Out-Null
}

# Initialize versions file if it doesn't exist
if (-not (Test-Path $versionsFile)) {
    "Version,Timestamp,Description,FileName" | Out-File -FilePath $versionsFile -Encoding UTF8
}

function Save-Version {
    param([string]$desc)
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    
    # Get the next version number by counting existing versions (skip header)
    $versionCount = (Import-Csv $versionsFile | Measure-Object).Count
    $versionNum = $versionCount + 1
    
    $versionName = "v${versionNum}_${timestamp}"
    $versionFile = "${versionsDir}\${versionName}.html"
    
    # Copy current file to versions directory
    Copy-Item $currentFile -Destination $versionFile -Force
    
    # Add to versions log
    "${versionNum},${timestamp},${desc},${versionFile}" | Out-File -FilePath $versionsFile -Append -Encoding UTF8
    
    Write-Host "Saved version ${versionNum} (${versionName}.html) - ${desc}"
    return $versionNum
}

function List-Versions {
    if ((Get-Item $versionsFile).length -eq 0) {
        Write-Host "No versions saved yet."
        return
    }
    
    Write-Host "`nSaved Versions:"
    Write-Host "--------------"
    $versions = Import-Csv $versionsFile
    $versions | Format-Table -AutoSize | Out-String -Width 1000 | Write-Host
}

function Restore-Version {
    param([string]$versionNum)
    
    $version = Import-Csv $versionsFile | Where-Object { $_.Version -eq $versionNum }
    
    if ($null -eq $version) {
        Write-Host "Version ${versionNum} not found."
        return
    }
    
    $sourceFile = $version.FileName
    
    if (-not (Test-Path $sourceFile)) {
        Write-Host "Version file not found: ${sourceFile}"
        return
    }
    
    # Create backup of current file
    $backupName = "${currentFile}.bak.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $currentFile -Destination $backupName
    
    # Restore the version
    Copy-Item $sourceFile -Destination $currentFile -Force
    
    Write-Host "Restored version ${versionNum} (${version.Timestamp}) - ${version.Description}"
    Write-Host "Previous version backed up as: ${backupName}"
}

# Main script logic
switch ($action.ToLower()) {
    "save" {
        if ([string]::IsNullOrEmpty($description)) {
            $description = Read-Host "Enter a description for this version"
        }
        Save-Version -desc $description
    }
    "list" {
        List-Versions
    }
    "restore" {
        if ([string]::IsNullOrEmpty($version)) {
            $version = Read-Host "Enter version number to restore"
        }
        Restore-Version -versionNum $version
    }
    default {
        Write-Host "Usage:"
        Write-Host "  .\version-control.ps1 save [description] - Save current version"
        Write-Host "  .\version-control.ps1 list              - List all saved versions"
        Write-Host "  .\version-control.ps1 restore [version]  - Restore a specific version"
    }
}
