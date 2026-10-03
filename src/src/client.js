import './style.css'
import { invoke } from '@tauri-apps/api/core'

const WS_URL = 'wss://YOUR-SERVER-URL/ws'

let socket = null
let sessionId = null
let peerConnection = null
let dataChannel = null
let chatEnabled = false
const pressedRemoteKeys = new Set()
let screenStream = null
let pendingRemoteIce = []

const rtcConfiguration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302'
    },
    {
      urls: [
        'turn:YOUR-SERVER-IP:3478?transport=udp',
        'turn:YOUR-SERVER-IP:3478?transport=tcp'
      ],
      username: 'USERNAME',
      credential: 'PASSWORD'
    }
  ]
}

/*
 * =========================================================
 * MOUSE REMOTO
 * =========================================================
 *
 * El técnico envía coordenadas normalizadas:
 *
 * x = 0.0 ... 1.0
 * y = 0.0 ... 1.0
 *
 * Aquí las convertimos a coordenadas de pantalla
 * y las entregamos al comando nativo de Tauri.
 * =========================================================
 */

async function handleRemoteMouseMove(data) {
  if (!data) {
    return
  }

  const x = Number(data.x)
  const y = Number(data.y)

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    console.warn(
      'mouse_move rechazado: coordenadas inválidas',
      data
    )

    return
  }

  if (
    x < 0 ||
    x > 1 ||
    y < 0 ||
    y > 1
  ) {
    console.warn(
      'mouse_move rechazado: coordenadas fuera de rango',
      data
    )

    return
  }

  const screenWidth = window.screen.width
  const screenHeight = window.screen.height

  if (
    !screenWidth ||
    !screenHeight
  ) {
    console.error(
      'No fue posible determinar la resolución de pantalla'
    )

    return
  }

  const mouseX = Math.round(
    x * (screenWidth - 1)
  )

  const mouseY = Math.round(
    y * (screenHeight - 1)
  )

  try {

    await invoke(
      'move_mouse',
      {
        x: mouseX,
        y: mouseY
      }
    )
    
  } catch (error) {

    console.error(
      'Error ejecutando movimiento de mouse:',
      error
    )

  }
}
async function handleRemoteMouseDown(data) {
  if (!data) {
    return
  }

  const button = data.button

  if (button !== 'left' && button !== 'right') {
    console.warn(
      'mouse_down rechazado: botón inválido',
      data
    )

    return
  }

  try {
    await invoke(
      'mouse_down',
      {
        button
      }
    )

  } catch (error) {
    console.error(
      'Error ejecutando mouse_down:',
      error
    )
  }
}

async function handleRemoteMouseUp(data) {
  if (!data) {
    return
  }

  const button = data.button

  if (button !== 'left' && button !== 'right') {
    console.warn(
      'mouse_up rechazado: botón inválido',
      data
    )

    return
  }

  try {
    await invoke(
      'mouse_up',
      {
        button
      }
    )

  } catch (error) {
    console.error(
      'Error ejecutando mouse_up:',
      error
    )
  }
}


async function handleRemoteMouseWheel(data) {
  if (!data) {
    return
  }

  const delta = Number(data.delta)

  if (!Number.isFinite(delta) || delta === 0) {
    console.warn(
      'mouse_wheel rechazado: delta inválido',
      data
    )

    return
  }

  const wheelDelta = Math.max(
    -120,
    Math.min(120, Math.round(delta))
  )

  try {
    await invoke(
      'mouse_wheel',
      {
        delta: wheelDelta
      }
    )

    console.log(
      `Mouse WHEEL remoto -> ${wheelDelta}`
    )

  } catch (error) {
    console.error(
      'Error ejecutando mouse_wheel:',
      error
    )
  }
}


async function handleRemoteKeyDown(data) {
  if (!data || typeof data.key !== 'string') {
    return
  }

  const key = data.key

  if (pressedRemoteKeys.has(key)) {
    return
  }

  pressedRemoteKeys.add(key)

  try {
    await invoke(
      'key_down',
      {
        key
      }
    )

    console.log(
      `Keyboard DOWN remoto -> ${key}`
    )

  } catch (error) {

    pressedRemoteKeys.delete(key)

    console.error(
      'Error ejecutando key_down:',
      error
    )
  }
}

async function handleRemoteKeyUp(data) {
  if (!data || typeof data.key !== 'string') {
    return
  }

  const key = data.key

  if (!pressedRemoteKeys.has(key)) {
    return
  }

  pressedRemoteKeys.delete(key)

  try {
    await invoke(
      'key_up',
      {
        key
      }
    )

    console.log(
      `Keyboard UP remoto -> ${key}`
    )

  } catch (error) {

    console.error(
      'Error ejecutando key_up:',
      error
    )
  }
}

function setSessionId(id) {
  sessionId = id

  const parts = [
    id.substring(0, 3),
    id.substring(3, 6),
    id.substring(6, 9)
  ]

  document.querySelector('#sessionId').innerHTML = `
    <span>${parts[0]}</span>
    <span>${parts[1]}</span>
    <span>${parts[2]}</span>
  `
}

function setWaiting(message) {
  const waiting =
    document.querySelector(
      '#waitingMessage'
    )

  if (waiting) {
    waiting.innerHTML = `
      <span class="pulse"></span>
      ${message}
    `
  }
}

document.querySelector('#app').innerHTML = `
  <div class="app">

    <header class="header">
      <div class="brand">
        <div class="brand-mark">A</div>

        <div>
          <div class="brand-name">ALEUX</div>
          <div class="brand-subtitle">SOPORTE REMOTO</div>
        </div>
      </div>

      <div class="status">
        <span class="status-dot"></span>
        Servicio disponible
      </div>
    </header>

    <main class="main">

      <div class="hero">
        <div class="shield">✓</div>

        <h1>Soporte Remoto</h1>

        <p class="description">
          Permite que un técnico autorizado te ayude
          con tu equipo de forma segura.
        </p>
      </div>

      <section class="session-card">

        <div class="label">
          ID DE SESIÓN
        </div>

        <div class="session-id" id="sessionId">
          <span>---</span>
          <span>---</span>
          <span>---</span>
        </div>

        <div class="waiting" id="waitingMessage">
          <span class="pulse"></span>
          Conectando...
        </div>

        <button
          class="cancel-button"
          id="cancelButton"
        >
          CERRAR SESIÓN
        </button>

      </section>

      <section class="chat-card" id="chatCard">
  <div class="chat-header">
    <strong>Chat de soporte</strong>
    <span id="chatStatus">Esperando conexión...</span>
  </div>

  <div class="chat-messages" id="chatMessages"></div>

  <div class="chat-form">
    <input
      id="chatInput"
      type="text"
      placeholder="Escribe un mensaje..."
      autocomplete="off"
      disabled
    />
    <button
      id="chatSendButton"
      type="button"
      disabled
    >
      Enviar
    </button>
  </div>
</section>

      <div class="security-note">
        <div class="lock">🔒</div>

        <div>
          <strong>Tu autorización es necesaria</strong>

          <p>
            Nadie puede controlar este equipo sin que tú
            aceptes la solicitud de conexión.
          </p>
        </div>
      </div>

    </main>

    <footer>
      Aleux Soporte Remoto
      <span>•</span>
      Conexión segura
    </footer>

  </div>
`
function setChatEnabled(enabled) {
  chatEnabled = enabled

  const input = document.querySelector('#chatInput')
  const button = document.querySelector('#chatSendButton')
  const status = document.querySelector('#chatStatus')

  if (input) input.disabled = !enabled
  if (button) button.disabled = !enabled

  if (status) {
    status.textContent = enabled
      ? 'Conectado'
      : 'Esperando conexión...'
  }
}

function appendChatMessage(text, own = false) {
  const messages = document.querySelector('#chatMessages')

  if (!messages || !text) return

  const message = document.createElement('div')
  message.className = `chat-message ${own ? 'own' : 'remote'}`

  message.textContent = text

  messages.appendChild(message)
  messages.scrollTop = messages.scrollHeight
}

function sendChatMessage() {
  if (!chatEnabled) return

  if (
    !socket ||
    socket.readyState !== WebSocket.OPEN ||
    !sessionId
  ) {
    return
  }

  const input = document.querySelector('#chatInput')

  if (!input) return

  const text = input.value.trim()

  if (!text) return

  socket.send(
    JSON.stringify({
      type: 'chat_message',
      session_id: sessionId,
      data: {
        text
      }
    })
  )

  appendChatMessage(text, true)

  input.value = ''
  input.focus()
}

document.querySelector('#chatSendButton')?.addEventListener(
  'click',
  sendChatMessage
)

document.querySelector('#chatInput')?.addEventListener(
  'keydown',
  (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      sendChatMessage()
    }
  }
)

function sendSignal(type, data = null) {

  if (
    !socket ||
    socket.readyState !== WebSocket.OPEN
  ) {

    console.error(
      'WebSocket no está conectado'
    )

    return
  }

  socket.send(
    JSON.stringify({
      type,
      session_id: sessionId,
      data
    })
  )
}

function createPeerConnection() {

  console.log(
    'Creando RTCPeerConnection'
  )

  peerConnection =
    new RTCPeerConnection(
      rtcConfiguration
    )

  /*
   * =========================================================
   * DATA CHANNEL
   * =========================================================
   */

  peerConnection.addEventListener(
    'datachannel',
    (event) => {

      console.log(
        'DataChannel recibido'
      )

      dataChannel =
        event.channel

      dataChannel.addEventListener(
        'open',
        async () => {

          console.log(
            'DataChannel abierto'
          )

          try {
            const computerName = await invoke('get_computer_name')

            dataChannel.send(
              JSON.stringify({
                type: 'client_info',
                computer_name: computerName
              })
            )

            console.log(
              'Nombre de equipo enviado:',
              computerName
            )
          } catch (error) {
            console.error(
              'No fue posible obtener el nombre del equipo:',
              error
            )
          }

          setWaiting(
            'Canal WebRTC conectado'
          )

        }
      )

      dataChannel.addEventListener(
        'message',
        async (event) => {

          try {

            const data =
              JSON.parse(event.data)

            /*
             * =================================================
             * HELLO
             * =================================================
             */

            if (
              data.type === 'hello'
            ) {

              dataChannel.send(
                JSON.stringify({
                  type: 'hello_response',
                  message: 'HELLO FROM CLIENT'
                })
              )

              setWaiting(
                'WebRTC PASS: conexión P2P activa'
              )

              console.log(
                'P2P confirmado. Iniciando captura de pantalla...'
              )

              setTimeout(
                () => {
                  startScreenSharing()
                },
                500
              )

              return
            }

            /*
             * =================================================
             * MOUSE MOVE
             * =================================================
             */

            if (
              data.type === 'mouse_move'
            ) {

              await handleRemoteMouseMove(
                data
              )

              return
            }

                        /*
             * =================================================
             * MOUSE DOWN
             * =================================================
             */

            if (
              data.type === 'mouse_down'
            ) {

              await handleRemoteMouseDown(
                data
              )

              return
            }

            /*
             * =================================================
             * MOUSE UP
             * =================================================
             */

            if (
              data.type === 'mouse_up'
            ) {

              await handleRemoteMouseUp(
                data
              )

              return
            }

            if (
              data.type === 'mouse_wheel'
            ) {

              await handleRemoteMouseWheel(
                data
              )

              return
            }

            /*
 * =================================================
 * KEY DOWN
 * =================================================
 */

if (
  data.type === 'key_down'
) {

  await handleRemoteKeyDown(
    data
  )

  return
}

/*
 * =================================================
 * KEY UP
 * =================================================
 */

if (
  data.type === 'key_up'
) {

  await handleRemoteKeyUp(
    data
  )

  return
}
            
          } catch {

            console.log(
              'Mensaje DataChannel:',
              event.data
            )

          }

        }
      )

      async function releaseAllRemoteKeys() {
  const keys = Array.from(
    pressedRemoteKeys
  )

  pressedRemoteKeys.clear()

  for (const key of keys) {
    try {
      await invoke(
        'key_up',
        {
          key
        }
      )

      console.log(
        `Keyboard RELEASE remoto -> ${key}`
      )

    } catch (error) {

      console.error(
        `Error liberando tecla ${key}:`,
        error
      )
    }
  }
}

      dataChannel.addEventListener(
        'close',
        () => {

          console.log(
            'DataChannel cerrado'
          )

          setWaiting(
            'Canal WebRTC cerrado'
          )

        }
      )

      dataChannel.addEventListener(
        'error',
        (error) => {

          console.error(
            'Error DataChannel:',
            error
          )

          setWaiting(
            'Error en DataChannel'
          )

        }
      )

    }
  )

  /*
   * =========================================================
   * ICE
   * =========================================================
   */

  peerConnection.addEventListener(
  'icecandidate',
  (event) => {

    if (!event.candidate) {
      console.log('ICE gathering terminado')
      return
    }

    sendSignal(
      'webrtc_ice',
      {
        candidate:
          event.candidate.candidate,

        sdpMid:
          event.candidate.sdpMid,

        sdpMLineIndex:
          event.candidate.sdpMLineIndex
      }
    )
  }
)

  /*
 * =========================================================
 * CONNECTION STATE
 * =========================================================
 */

peerConnection.addEventListener(
  'connectionstatechange',
  () => {

    console.log(
      'WebRTC connectionState:',
      peerConnection.connectionState
    )

    console.log(
      'WebRTC iceConnectionState:',
      peerConnection.iceConnectionState
    )

    console.log(
      'WebRTC iceGatheringState:',
      peerConnection.iceGatheringState
    )

    if (
      peerConnection.connectionState ===
      'connected'
    ) {

      setWaiting(
        'Conexión WebRTC establecida'
      )

    }

    if (
      peerConnection.connectionState ===
      'failed'
    ) {

      setWaiting(
        'Conexión WebRTC falló'
      )

    }

    if (
      peerConnection.connectionState ===
      'disconnected'
    ) {

      setWaiting(
        'WebRTC desconectado'
      )

    }
  }
)

  return peerConnection
}

async function startScreenSharing() {

  if (!peerConnection) {

    console.error(
      'No existe conexión WebRTC para compartir pantalla'
    )

    return
  }

  if (screenStream) {

    console.log(
      'La pantalla ya está compartiéndose'
    )

    return
  }

  try {

    console.log(
      'Solicitando permiso para compartir pantalla...'
    )

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getDisplayMedia
    ) {

      console.error(
        'getDisplayMedia no está disponible'
      )

      setWaiting(
        'La captura de pantalla no está disponible'
      )

      return
    }

    screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: {
    cursor: 'always'
  },
  audio: false
})

    console.log(
      'Captura de pantalla autorizada'
    )

    const videoTrack =
      screenStream.getVideoTracks()[0]

    if (!videoTrack) {

      console.error(
        'No se obtuvo video de pantalla'
      )

      screenStream = null

      return
    }

    /*
     * =====================================================
     * DIAGNÓSTICO DEL VIDEOTRACK
     * =====================================================
     */

    console.log(
      'VideoTrack obtenido:',
      videoTrack.label
    )

    console.log(
      'VideoTrack readyState:',
      videoTrack.readyState
    )

    console.log(
      'VideoTrack enabled:',
      videoTrack.enabled
    )

    console.log(
      'VideoTrack muted:',
      videoTrack.muted
    )

    console.log(
      'VideoTrack settings:',
      videoTrack.getSettings()
    )

    /*
     * =====================================================
     * DETECCIÓN DE FIN DE CAPTURA
     * =====================================================
     */

    videoTrack.addEventListener(
      'ended',
      () => {

        console.log(
          'El usuario detuvo la captura de pantalla'
        )

        screenStream = null

        setWaiting(
          'Compartición de pantalla detenida'
        )

      }
    )

    /*
     * =====================================================
     * AGREGAR VIDEO A WEBRTC
     * =====================================================
     */

    peerConnection.addTrack(
      videoTrack,
      screenStream
    )

    console.log(
      'VideoTrack agregado a WebRTC'
    )

    setWaiting(
      'Pantalla autorizada. Iniciando transmisión...'
    )

    /*
     * =====================================================
     * RENEGOCIACIÓN
     * =====================================================
     */

    await renegotiateScreen()

  } catch (error) {

    console.error(
      'Error al compartir pantalla:',
      error
    )

    screenStream = null

    setWaiting(
      'Compartición de pantalla cancelada'
    )

  }
}

async function renegotiateScreen() {

  if (!peerConnection) {
    return
  }

  try {

    console.log(
      'Iniciando renegociación WebRTC...'
    )

    const offer =
      await peerConnection.createOffer()

    await peerConnection.setLocalDescription(
      offer
    )

    console.log(
      'Nueva WebRTC Offer creada para pantalla'
    )

    sendSignal(
      'webrtc_offer',
      {
        type: offer.type,
        sdp: offer.sdp
      }
    )

    setWaiting(
      'Transmisión de pantalla iniciando...'
    )

  } catch (error) {

    console.error(
      'Error renegociando WebRTC:',
      error
    )

    setWaiting(
      'Error iniciando transmisión de pantalla'
    )

  }
}

async function handleWebRTCOffer(data) {

  try {

    console.log(
      'WebRTC Offer recibido'
    )

    if (!peerConnection) {
      createPeerConnection()
    }

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription({
        type: data.type,
        sdp: data.sdp
      })
    )

    console.log(
      'Remote Description aplicada'
    )

    /*
     * Aplicar ICE que haya llegado antes
     * de la Remote Description.
     */

    await flushPendingRemoteIce()

    const answer =
      await peerConnection.createAnswer()

    await peerConnection.setLocalDescription(
      answer
    )

    console.log(
      'WebRTC Answer creado'
    )

    sendSignal(
      'webrtc_answer',
      {
        type: answer.type,
        sdp: answer.sdp
      }
    )

    setWaiting(
      'Respuesta WebRTC enviada...'
    )

  } catch (error) {

    console.error(
      'Error procesando WebRTC Offer:',
      error
    )

    setWaiting(
      'Error iniciando WebRTC'
    )

  }
}

async function handleWebRTCAnswer(data) {

  if (!peerConnection) {

    console.error(
      'No existe RTCPeerConnection para aplicar Answer'
    )

    return
  }

  try {

    console.log(
      'WebRTC Answer recibido para renegociación'
    )

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription({
        type: data.type,
        sdp: data.sdp
      })
    )

    console.log(
      'Remote Description de video aplicada'
    )

    await flushPendingRemoteIce()

    setWaiting(
      'Transmisión de pantalla conectada'
    )

  } catch (error) {

    console.error(
      'Error aplicando WebRTC Answer:',
      error
    )

    setWaiting(
      'Error conectando la pantalla remota'
    )

  }
}

async function flushPendingRemoteIce() {

  if (!peerConnection) {
    return
  }

  if (!peerConnection.remoteDescription) {
    return
  }

  while (
    pendingRemoteIce.length > 0
  ) {

    const candidate =
      pendingRemoteIce.shift()

    try {

      await peerConnection.addIceCandidate(
        candidate
      )

      console.log(
        'ICE remoto en cola agregado'
      )

    } catch (error) {

      console.error(
        'Error agregando ICE en cola:',
        error
      )

    }

  }
}

async function handleRemoteIce(data) {

  if (
    !peerConnection ||
    !data
  ) {
    return
  }

  const candidate =
    new RTCIceCandidate({
      candidate:
        data.candidate,

      sdpMid:
        data.sdpMid,

      sdpMLineIndex:
        data.sdpMLineIndex
    })

  if (
    !peerConnection.remoteDescription
  ) {

    console.log(
      'ICE recibido antes de Remote Description. En cola.'
    )

    pendingRemoteIce.push(
      candidate
    )

    return
  }

  try {

    await peerConnection.addIceCandidate(
      candidate
    )

    console.log(
      'ICE remoto agregado'
    )

  } catch (error) {

    console.error(
      'Error agregando ICE:',
      error
    )

  }
}

function connectWebSocket() {

  socket =
    new WebSocket(WS_URL)

  socket.addEventListener(
    'open',
    () => {

      console.log(
        'WebSocket conectado'
      )

      socket.send(
        JSON.stringify({
          type: 'create_session'
        })
      )

    }
  )

  socket.addEventListener(
    'message',
    async (event) => {

      console.log(
        'Servidor:',
        event.data
      )

      let data

      try {

        data =
          JSON.parse(event.data)

      } catch {

        console.error(
          'Respuesta inválida'
        )

        return
      }

      switch (data.type) {

        case 'session_created':

          setSessionId(
            data.session_id
          )

          setWaiting(
            'Esperando al técnico...'
          )

          break

        case 'chat_message':
  if (data.data?.text) {
    appendChatMessage(data.data.text, false)
  }
  break

        
        case 'access_request':

          showAccessRequest()

          break

        case 'access_granted':

          setChatEnabled(true)

          setWaiting(
            'Conexión autorizada'
          )

          break

        case 'access_rejected':

          setWaiting(
            'Solicitud rechazada'
          )

          break

        case 'webrtc_offer':

          await handleWebRTCOffer(
            data.data
          )

          break

        case 'webrtc_answer':

          await handleWebRTCAnswer(
            data.data
          )

          break

        case 'webrtc_ice':

          await handleRemoteIce(
            data.data
          )

          break

        case 'session_closed':

          setChatEnabled(false)
          
          setWaiting(
            'Sesión cerrada'
          )

          if (screenStream) {

            screenStream
              .getTracks()
              .forEach(
                track => track.stop()
              )

            screenStream = null

          }

          if (peerConnection) {

            peerConnection.close()

            peerConnection = null

          }

          dataChannel = null
          pendingRemoteIce = []

          break

        default:

          console.log(
            'Mensaje no manejado:',
            data
          )

      }

    }
  )

  socket.addEventListener(
    'close',
    () => {

      console.log(
        'WebSocket desconectado'
      )

      setWaiting(
        'Servidor desconectado'
      )

    }
  )

  socket.addEventListener(
    'error',
    (error) => {

      console.error(
        'Error WebSocket:',
        error
      )

      setWaiting(
        'Error de conexión'
      )

    }
  )
}

function showAccessRequest() {

  const waiting =
    document.querySelector(
      '#waitingMessage'
    )

  waiting.innerHTML = `
    <div class="access-request">

      <strong>
        Un técnico solicita acceso
      </strong>

      <p>
        ¿Deseas permitir la conexión?
      </p>

      <div class="access-buttons">

        <button
          id="acceptButton"
          class="accept-button"
        >
          ACEPTAR
        </button>

        <button
          id="rejectButton"
          class="reject-button"
        >
          RECHAZAR
        </button>

      </div>

    </div>
  `

  document
    .querySelector('#acceptButton')
    .addEventListener(
      'click',
      () => {

        socket.send(
          JSON.stringify({
            type: 'accept_access',
            session_id: sessionId
          })
        )

      }
    )

  document
    .querySelector('#rejectButton')
    .addEventListener(
      'click',
      () => {

        socket.send(
          JSON.stringify({
            type: 'reject_access',
            session_id: sessionId
          })
        )

      }
    )
}

document
  .querySelector('#cancelButton')
  .addEventListener(
    'click',
    () => {

      if (
        socket &&
        socket.readyState ===
          WebSocket.OPEN &&
        sessionId
      ) {

        socket.send(
          JSON.stringify({
            type: 'close_session',
            session_id: sessionId
          })
        )

      } else {

        alert(
          'No hay una sesión activa.'
        )

      }

    }
  )

connectWebSocket()