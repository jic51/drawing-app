# Vistas previas

Cada subcarpeta sirve una versión en pruebas desde la web real, con su
Firebase real, **sin tocar la app publicada**. La app en vivo sigue siendo
`/index.html`; esto cuelga aparte y no está enlazado desde ningún sitio.

    https://sketch-send.com/preview/<nombre>/

## Añadir una

    git checkout main
    mkdir -p preview/<nombre>
    git show <rama>:index.html > preview/<nombre>/index.html
    git add preview/<nombre> && git commit && git push

## Cuidado al probar envíos

Una vista previa escribe en la MISMA base de datos que la app en vivo. Si
la rama cambia el formato de lo que se guarda, un amigo que use la app
normal recibirá algo que su versión no sabe leer.

Regla: **publicar primero el lector, después el escritor.** Si una rama
cambia un formato, su parte de lectura va a `main` antes de que la vista
previa empiece a escribir en el formato nuevo.
