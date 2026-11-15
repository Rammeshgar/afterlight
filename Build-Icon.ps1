param([Parameter(Mandatory=$true)][string]$Destination,[switch]$Cinema)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$streams=[Collections.Generic.List[byte[]]]::new()
foreach($size in @(16,32,48,64,128,256)){
    $image=[Drawing.Bitmap]::new($size,$size)
    $g=[Drawing.Graphics]::FromImage($image)
    if($Cinema){$g.Clear([Drawing.Color]::FromArgb(29,24,43))}else{$g.Clear([Drawing.Color]::FromArgb(11,21,42))}
    $g.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::None
    $k=$size/32.0
    $design=@(@(6,5,9,9,'#d4c7a4'),@(3,20,5,9,'#29414c'),@(9,16,5,13,'#355563'),@(16,11,5,18,'#355563'),@(22,18,7,11,'#29414c'),@(17,8,3,3,'#587f83'),@(18,5,1,3,'#efbc79'),@(5,22,1,2,'#79c8bc'),@(11,19,1,2,'#efbc79'),@(11,24,1,2,'#efbc79'),@(18,14,1,2,'#efbc79'),@(18,19,1,2,'#efbc79'),@(18,24,1,2,'#efbc79'),@(24,21,2,2,'#efbc79'),@(24,26,2,2,'#79c8bc'),@(3,30,26,1,'#79c8bc'))
    if($Cinema){
        $design=@(@(6,5,20,3,'#b9a1c7'),@(4,8,24,17,'#505076'),@(6,10,20,13,'#241e38'),
            @(11,10,10,12,'#8f86ba'),@(8,13,16,6,'#aea3ce'),@(11,13,10,6,'#302844'),
            @(14,13,5,5,'#dfbd87'),@(15,14,2,2,'#fff0c8'),@(7,26,18,1,'#c7a66c'))
    }
    foreach($rect in $design){
        $brush=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($rect[4]));$g.FillRectangle($brush,[single]($rect[0]*$k),[single]($rect[1]*$k),[single]($rect[2]*$k),[single]($rect[3]*$k));$brush.Dispose()
    }
    $memory=[IO.MemoryStream]::new();$image.Save($memory,[Drawing.Imaging.ImageFormat]::Png);$streams.Add($memory.ToArray());$memory.Dispose();$g.Dispose();$image.Dispose()
}
$out=[IO.File]::Create($Destination);$writer=[IO.BinaryWriter]::new($out)
try{
    $writer.Write([uint16]0);$writer.Write([uint16]1);$writer.Write([uint16]$streams.Count)
    $offset=6+16*$streams.Count;$i=0
    foreach($size in @(16,32,48,64,128,256)){
        $dimension=if($size -eq 256){0}else{$size};$writer.Write([byte]$dimension);$writer.Write([byte]$dimension);$writer.Write([byte]0);$writer.Write([byte]0);$writer.Write([uint16]1);$writer.Write([uint16]32);$writer.Write([uint32]$streams[$i].Length);$writer.Write([uint32]$offset);$offset+=$streams[$i].Length;$i++
    }
    foreach($bytes in $streams){$writer.Write($bytes)}
}finally{$writer.Dispose();$out.Dispose()}
