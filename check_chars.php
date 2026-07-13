<?php
$content = file_get_contents('D:\Projetos\yellow\seguradora-v2\backend\app\Services\PermissionService.php');
$lines = explode("\n", $content);
// Check around line 95
for ($i = 90; $i < min(100, count($lines)); $i++) {
    echo "Line " . ($i + 1) . ": ";
    for ($j = 0; $j < strlen($lines[$i]); $j++) {
        $c = ord($lines[$i][$j]);
        if ($c < 32 && $c != 10 && $c != 13) {
            echo "[$c]";
        } elseif ($c > 126) {
            echo "[$c]";
        } else {
            echo chr($c);
        }
    }
    echo "\n";
}
