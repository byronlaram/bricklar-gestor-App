Add-Type -AssemblyName System.Drawing

$brandDir = Join-Path (Get-Location) "public\branding"
$sourcePath = Join-Path $brandDir "bricklar-app-icon.png"

# Read bytes to avoid file locks
$bytes = [System.IO.File]::ReadAllBytes($sourcePath)
$ms = New-Object System.IO.MemoryStream($bytes, 0, $bytes.Length)
$sourceImg = [System.Drawing.Image]::FromStream($ms)

Write-Host "Source Image Loaded. Size: $($sourceImg.Width)x$($sourceImg.Height)"

# 1. Function to resize and save standard PNG
function Create-Icon($src, $targetPath, $width, $height) {
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    
    $g.DrawImage($src, 0, 0, $width, $height)
    $bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated standard icon: $targetPath ($width x $height)"
}

# 2. Function to generate maskable icon with safe-zone margin (80% safe zone as per W3C PWA spec)
function Create-Maskable-Icon($src, $targetPath, $size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Fill background with brand dark navy #0f172a or sample corner
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml("#0f172a")
    $g.Clear($bgColor)
    
    # Scale source icon down to 80% to fit within safe zone circle/squircle
    $innerSize = [int]($size * 0.8)
    $offset = [int](($size - $innerSize) / 2)
    
    $g.DrawImage($src, $offset, $offset, $innerSize, $innerSize)
    $bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated maskable icon: $targetPath ($size x $size with safe-zone margin)"
}

# Generate all required icons
Create-Icon $sourceImg (Join-Path $brandDir "pwa-192x192.png") 192 192
Create-Icon $sourceImg (Join-Path $brandDir "pwa-512x512.png") 512 512
Create-Icon $sourceImg (Join-Path $brandDir "apple-touch-icon.png") 180 180
Create-Icon $sourceImg (Join-Path $brandDir "favicon-32x32.png") 32 32
Create-Icon $sourceImg (Join-Path $brandDir "favicon-16x16.png") 16 16
Create-Maskable-Icon $sourceImg (Join-Path $brandDir "pwa-maskable-512x512.png") 512
Create-Maskable-Icon $sourceImg (Join-Path $brandDir "pwa-maskable-192x192.png") 192

# Finally replace bricklar-app-icon.png as true 512x512 PNG
$sourceImg.Dispose()
$ms.Dispose()

# Now overwrite bricklar-app-icon.png with true PNG
$temp512 = [System.IO.File]::ReadAllBytes((Join-Path $brandDir "pwa-512x512.png"))
[System.IO.File]::WriteAllBytes((Join-Path $brandDir "bricklar-app-icon.png"), $temp512)

Write-Host "All branding icons successfully generated and saved as valid PNGs!"
