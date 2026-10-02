const params = new URLSearchParams(window.location.search)

const mode = params.get('mode')

if (mode === 'support') {
  import('./support.js')
    .catch((error) => {
      console.error(
        'No fue posible cargar el módulo de soporte:',
        error
      )
    })
} else {
  import('./client.js')
    .catch((error) => {
      console.error(
        'No fue posible cargar el módulo cliente:',
        error
      )
    })
}