<?php
$content = file_get_contents('D:\Projetos\yellow\seguradora-v2\backend\app\Services\PermissionService.php');
$lines = explode("\n", $content);
$braceCount = 0;
foreach ($lines as $i => $line) {
    $openBrace = substr_count($line, '{');
    $closeBrace = substr_count($line, '}');
    $braceCount += $openBrace - $closeBrace;
    echo "Line " . ($i + 1) . ": $braceCount\n";
}
