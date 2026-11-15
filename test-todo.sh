#!/usr/bin/env bash
# Pasa todas las pruebas en los dos motores.
#
#   ./test-todo.sh            los dos
#   ./test-todo.sh webkit     solo el motor de Safari
#
# Por qué dos: esta app ya se rompió en Safari varias veces (el login que
# daba vueltas, el video que no grababa, el texto que se seleccionaba solo).
# Probar únicamente en Chrome no dice nada de iPhone ni iPad.
#
# AVISO: WebKit en Linux NO es el Safari de un iPhone. Comparten motor, así
# que caza diferencias de CSS y de API —que es la mayoría—, pero no el
# comportamiento propio de iOS: los permisos de notificación, el teclado, la
# barra que aparece y desaparece, o que MediaRecorder exista. Esa build ni
# siquiera trae MediaRecorder, y el Safari de verdad sí. Para eso hace falta
# un aparato.

set -u
cd "$(dirname "$0")"

MOTORES="${1:-chromium webkit}"
PRUEBAS=$(ls test-*.js | grep -v '^test-server.js$')

total=0
fallos=0
for motor in $MOTORES; do
  echo ""
  echo "══════ $motor ══════"
  for t in $PRUEBAS; do
    printf '  %-26s' "$t"
    total=$((total + 1))
    if NAVEGADOR="$motor" node "$t" > "/tmp/ss-$motor-$t.log" 2>&1; then
      echo "✅"
    else
      echo "❌"
      fallos=$((fallos + 1))
      grep -E '^❌' "/tmp/ss-$motor-$t.log" | head -4 | sed 's/^/      /'
      echo "      (salida completa: /tmp/ss-$motor-$t.log)"
    fi
  done
done

echo ""
if [ "$fallos" -eq 0 ]; then
  echo "✅ $total pruebas, todas en verde"
else
  echo "❌ $fallos de $total fallaron"
fi
exit $((fallos > 0))
