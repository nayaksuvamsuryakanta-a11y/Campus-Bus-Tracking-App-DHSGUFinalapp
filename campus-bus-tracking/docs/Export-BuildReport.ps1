$ErrorActionPreference = 'Stop'

$reportPath = Join-Path $PSScriptRoot 'TECHNICAL_BUILD_REPORT.md'
$outputPath = Join-Path $PSScriptRoot 'TECHNICAL_BUILD_REPORT.docx'
$tempHtmlPath = Join-Path ([System.IO.Path]::GetTempPath()) ("dhsgu-build-report-{0}.html" -f [guid]::NewGuid())

if (-not (Test-Path -LiteralPath $reportPath -PathType Leaf)) {
    throw "Build report was not found: $reportPath"
}

function Convert-InlineMarkdown {
    param([string]$Text)

    $encoded = [System.Net.WebUtility]::HtmlEncode($Text)
    $encoded = [regex]::Replace($encoded, '\*\*(.+?)\*\*', '<strong>$1</strong>')
    return [regex]::Replace($encoded, '`([^`]+)`', '<code>$1</code>')
}

$htmlLines = New-Object 'System.Collections.Generic.List[string]'
$openList = ''
$tableOpen = $false
$tableHeaderWritten = $false
$inCodeFence = $false

function Add-HtmlLine {
    param([string]$Value)
    [void]$script:htmlLines.Add($Value)
}

function Close-List {
    if ($script:openList -ne '') {
        Add-HtmlLine "</$script:openList>"
        $script:openList = ''
    }
}

function Close-Table {
    if ($script:tableOpen) {
        Add-HtmlLine '</tbody></table>'
        $script:tableOpen = $false
        $script:tableHeaderWritten = $false
    }
}

Add-HtmlLine '<!doctype html>'
Add-HtmlLine '<html><head><meta charset="utf-8">'
Add-HtmlLine '<title>DHSGU Campus Bus Tracker - Technical Build Report</title>'
Add-HtmlLine '<style>'
Add-HtmlLine 'body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #202124; margin: 24pt; }'
Add-HtmlLine 'h1, h2, h3 { font-family: Calibri, Arial, sans-serif; color: #174ea6; }'
Add-HtmlLine 'pre, code { font-family: Consolas, "Courier New", monospace; }'
Add-HtmlLine 'pre { white-space: pre-wrap; background: #f3f5f7; border: 1px solid #c7cbd1; padding: 8pt; }'
Add-HtmlLine 'table { border-collapse: collapse; width: 100%; font-size: 10pt; margin: 8pt 0 12pt; }'
Add-HtmlLine 'th, td { border: 1px solid #666; padding: 4pt 6pt; vertical-align: top; }'
Add-HtmlLine 'th { background: #e8eef7; }'
Add-HtmlLine '</style></head><body>'

foreach ($line in Get-Content -LiteralPath $reportPath -Encoding UTF8) {
    if ($inCodeFence) {
        if ($line -match '^```') {
            Add-HtmlLine '</code></pre>'
            $inCodeFence = $false
        } else {
            Add-HtmlLine ([System.Net.WebUtility]::HtmlEncode($line))
        }
        continue
    }

    if ($line -match '^```') {
        Close-List
        Close-Table
        Add-HtmlLine '<pre><code>'
        $inCodeFence = $true
        continue
    }

    if ($line.TrimStart().StartsWith('|')) {
        Close-List
        if (-not $tableOpen) {
            Add-HtmlLine '<table><tbody>'
            $tableOpen = $true
        }

        if ($line -match '^\|\s*:?-{3,}') {
            continue
        }

        $cells = @($line.Trim().Trim('|').Split('|') | ForEach-Object { $_.Trim() })
        if (-not $tableHeaderWritten) {
            $cellTag = 'th'
            $tableHeaderWritten = $true
        } else {
            $cellTag = 'td'
        }
        $cellHtml = foreach ($cell in $cells) {
            '<{0}>{1}</{0}>' -f $cellTag, (Convert-InlineMarkdown $cell)
        }
        Add-HtmlLine ('<tr>' + ($cellHtml -join '') + '</tr>')
        continue
    }

    Close-Table

    if ($line -match '^(#{1,3})\s+(.+)$') {
        Close-List
        $headingLevel = $Matches[1].Length
        Add-HtmlLine ("<h{0}>{1}</h{0}>" -f $headingLevel, (Convert-InlineMarkdown $Matches[2]))
        continue
    }

    if ($line -match '^-\s+(.+)$') {
        if ($openList -ne 'ul') {
            Close-List
            Add-HtmlLine '<ul>'
            $openList = 'ul'
        }
        Add-HtmlLine ("<li>{0}</li>" -f (Convert-InlineMarkdown $Matches[1]))
        continue
    }

    if ($line -match '^\d+\.\s+(.+)$') {
        if ($openList -ne 'ol') {
            Close-List
            Add-HtmlLine '<ol>'
            $openList = 'ol'
        }
        Add-HtmlLine ("<li>{0}</li>" -f (Convert-InlineMarkdown $Matches[1]))
        continue
    }

    Close-List
    if (-not [string]::IsNullOrWhiteSpace($line)) {
        Add-HtmlLine ("<p>{0}</p>" -f (Convert-InlineMarkdown $line))
    }
}

Close-List
Close-Table
if ($inCodeFence) {
    Add-HtmlLine '</code></pre>'
}
Add-HtmlLine '</body></html>'

$html = $htmlLines -join [Environment]::NewLine
[System.IO.File]::WriteAllText($tempHtmlPath, $html, [System.Text.UTF8Encoding]::new($false))

$word = $null
$document = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($tempHtmlPath, $false, $false)
    $document.SaveAs2($outputPath, 16)
    Write-Output "Created: $outputPath"
} finally {
    if ($null -ne $document) {
        try {
            $document.Close(0)
        } catch {
        }
        [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($document)
        $document = $null
    }
    if ($null -ne $word) {
        try {
            $word.Quit()
        } catch {
        }
        [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)
        $word = $null
    }
    if (Test-Path -LiteralPath $tempHtmlPath) {
        Remove-Item -LiteralPath $tempHtmlPath -Force
    }
}
