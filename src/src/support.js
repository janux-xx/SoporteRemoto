import './style.css'
import { invoke } from '@tauri-apps/api/core'

const WS_URL = 'wss://YOUR-SERVER-URL/ws'

let socket = null
let sessionId = null
let peerConnection = null
let dataChannel = null
let remoteStream = null

let lastMouseSendTime = 0
const MOUSE_SEND_INTERVAL = 33 // ~30 FPS

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
        Técnico
      </div>
    </header>

    <main class="main">

      <div class="hero">
        <div class="shield">✓</div>

        <h1>Conectar a equipo</h1>

        <p class="description">
          Ingresa el ID de sesión proporcionado por el cliente.
        </p>
      </div>

      <section class="session-card">

        <div class="label">
          ID DE SESIÓN
        </div>

        <input
          id="sessionInput"
          class="session-input"
          type="text"
          maxlength="9"
          inputmode="numeric"
          placeholder="000 000 000"
          autocomplete="off"
        />

        <button class="connect-button" id="connectButton">
          CONECTAR
        </button>

        <div class="waiting" id="statusMessage">
          <span class="pulse"></span>
          Listo para conectar
        </div>

      </section>

      <section
        id="remoteScreenContainer"
        style="
          display: none;
          position: relative;
          width: 100%;
          margin-top: 24px;
          background: #111827;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,.15);
        "
      >

        <button
          id="expandRemoteScreen"
          type="button"
          style="
            position: absolute;
            top: 12px;
            right: 12px;
            z-index: 10;
            padding: 8px 14px;
            border: none;
            border-radius: 8px;
            background: rgba(17,24,39,.85);
            color: white;
            cursor: pointer;
            font-weight: 600;
          "
        >
          VER PANTALLA
        </button>

        <button
          id="closeRemoteSession"
          type="button"
          style="
            position: absolute;
            top: 12px;
            left: 12px;
            z-index: 10;
            padding: 8px 14px;
            border: none;
            border-radius: 8px;
            background: #b91c1c;
            color: white;
            cursor: pointer;
            font-weight: 600;
          "
        >
          CERRAR SESIÓN
        </button>

        <video
          id="remoteScreen"
          tabindex="0"
          autoplay
          playsinline
          style="
            display: block;
            width: 100%;
            height: auto;
            min-height: 300px;
            background: #000;
            object-fit: contain;
            cursor: default;
          "
        ></video>

      </section>

      <div class="security-note">
        <div class="lock">🔒</div>

        <div>
          <strong>El cliente debe autorizar</strong>

          <p>
            La conexión remota solamente podrá comenzar
            después de que el cliente acepte la solicitud.
          </p>
        </div>
      </div>

    </main>

    <footer>
      Aleux Soporte Remoto
      <span>•</span>
      Técnico
    </footer>

  </div>
`

const input = document.querySelector('#sessionInput')
const connectButton = document.querySelector('#connectButton')
const statusMessage = document.querySelector('#statusMessage')
const remoteScreen = document.querySelector('#remoteScreen')
const remoteScreenContainer =
  document.querySelector('#remoteScreenContainer')
const expandRemoteScreen =
  document.querySelector('#expandRemoteScreen')
const closeRemoteSession =
  document.querySelector('#closeRemoteSession')

const header = document.querySelector('.header')
const hero = document.querySelector('.hero')
const sessionCard = document.querySelector('.session-card')
const securityNote = document.querySelector('.security-note')
const footer = document.querySelector('footer')

let remoteScreenExpanded = false

function showActiveSessionUI() {
  header.style.display = 'none'
  hero.style.display = 'none'
  sessionCard.style.display = 'none'
  securityNote.style.display = 'none'
  footer.style.display = 'none'

  remoteScreenContainer.style.display = 'block'
  remoteScreenContainer.style.marginTop = '0'
  remoteScreenContainer.style.borderRadius = '14px'
}

function showInitialUI() {
  header.style.display = ''
  hero.style.display = ''
  sessionCard.style.display = ''
  securityNote.style.display = ''
  footer.style.display = ''

  remoteScreenContainer.style.display = 'none'
  remoteScreenContainer.style.marginTop = '24px'

  remoteScreenExpanded = false

  remoteScreenContainer.style.position = 'relative'
  remoteScreenContainer.style.top = ''
  remoteScreenContainer.style.left = ''
  remoteScreenContainer.style.right = ''
  remoteScreenContainer.style.bottom = ''
  remoteScreenContainer.style.width = '100%'
  remoteScreenContainer.style.height = ''
  remoteScreenContainer.style.zIndex = ''
  remoteScreenContainer.style.borderRadius = '14px'

  remoteScreen.style.width = '100%'
  remoteScreen.style.height = 'auto'
  remoteScreen.style.minHeight = '300px'

  expandRemoteScreen.textContent = 'VER PANTALLA'
}

function toggleRemoteScreen() {
  remoteScreenExpanded = !remoteScreenExpanded

  if (remoteScreenExpanded) {
    remoteScreenContainer.style.position = 'fixed'
    remoteScreenContainer.style.top = '0'
    remoteScreenContainer.style.left = '0'
    remoteScreenContainer.style.right = '0'
    remoteScreenContainer.style.bottom = '0'
    remoteScreenContainer.style.width = '100vw'
    remoteScreenContainer.style.height = '100vh'
    remoteScreenContainer.style.margin = '0'
    remoteScreenContainer.style.zIndex = '9999'
    remoteScreenContainer.style.borderRadius = '0'

    remoteScreen.style.width = '100%'
    remoteScreen.style.height = '100%'
    remoteScreen.style.minHeight = '0'
    remoteScreen.style.objectFit = 'contain'

    expandRemoteScreen.textContent = 'CERRAR PANTALLA'
  } else {
    remoteScreenContainer.style.position = 'relative'
    remoteScreenContainer.style.top = ''
    remoteScreenContainer.style.left = ''
    remoteScreenContainer.style.right = ''
    remoteScreenContainer.style.bottom = ''
    remoteScreenContainer.style.width = '100%'
    remoteScreenContainer.style.height = ''
    remoteScreenContainer.style.margin = '0'
    remoteScreenContainer.style.zIndex = ''
    remoteScreenContainer.style.borderRadius = '14px'

    remoteScreen.style.width = '100%'
    remoteScreen.style.height = 'auto'
    remoteScreen.style.minHeight = '300px'

    expandRemoteScreen.textContent = 'VER PANTALLA'
  }
}

expandRemoteScreen.addEventListener(
  'click',
  toggleRemoteScreen
)

function setStatus(message) {
  statusMessage.innerHTML = `
    <span class="pulse"></span>
    ${message}
  `
}

function sendSignal(type, data = null) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('WebSocket no está conectado')
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

/*
 * =========================================================
 * MOUSE REMOTO
 * =========================================================
 */

function getNormalizedMousePosition(event) {
  const rect = remoteScreen.getBoundingClientRect()

  if (
    rect.width <= 0 ||
    rect.height <= 0 ||
    !remoteScreen.videoWidth ||
    !remoteScreen.videoHeight
  ) {
    return null
  }

  const videoWidth = remoteScreen.videoWidth
  const videoHeight = remoteScreen.videoHeight

  const videoAspect =
    videoWidth / videoHeight

  const containerAspect =
    rect.width / rect.height

  let displayedWidth
  let displayedHeight
  let offsetX
  let offsetY

  if (containerAspect > videoAspect) {
    displayedHeight = rect.height
    displayedWidth =
      displayedHeight * videoAspect

    offsetX =
      (rect.width - displayedWidth) / 2

    offsetY = 0
  } else {
    displayedWidth = rect.width
    displayedHeight =
      displayedWidth / videoAspect

    offsetX = 0

    offsetY =
      (rect.height - displayedHeight) / 2
  }

  const x =
    event.clientX -
    rect.left -
    offsetX

  const y =
    event.clientY -
    rect.top -
    offsetY

  if (
    x < 0 ||
    y < 0 ||
    x > displayedWidth ||
    y > displayedHeight
  ) {
    return null
  }

  let normalizedX =
    x / displayedWidth

  let normalizedY =
    y / displayedHeight

  normalizedX = Math.max(
    0,
    Math.min(1, normalizedX)
  )

  normalizedY = Math.max(
    0,
    Math.min(1, normalizedY)
  )

  return {
    x: normalizedX,
    y: normalizedY
  }
}

function sendRemoteMouseMove(event) {
  if (
    !dataChannel ||
    dataChannel.readyState !== 'open'
  ) {
    return
  }

  const now = performance.now()

  if (
    now - lastMouseSendTime <
    MOUSE_SEND_INTERVAL
  ) {
    return
  }

  lastMouseSendTime = now

  const position =
    getNormalizedMousePosition(event)

  if (!position) {
    return
  }

  const message = {
    type: 'mouse_move',
    x: position.x,
    y: position.y
  }

  try {
    dataChannel.send(
      JSON.stringify(message)
    )
  } catch (error) {
    console.error(
      'Error enviando movimiento de mouse:',
      error
    )
  }
}

remoteScreen.addEventListener(
  'pointermove',
  sendRemoteMouseMove
)

remoteScreen.addEventListener(
  'pointerenter',
  () => {
    if (
      dataChannel &&
      dataChannel.readyState === 'open'
    ) {
      remoteScreen.style.cursor =
        'default'
    }
  }
)

remoteScreen.addEventListener(
  'pointerleave',
  () => {
    remoteScreen.style.cursor =
      'default'
  }
)

/*
 * =========================================================
 * TECLADO REMOTO
 * =========================================================
 */

function sendRemoteKeyboardEvent(type, event) {
  if (
    !dataChannel ||
    dataChannel.readyState !== 'open'
  ) {
    return
  }

  if (
    type !== 'key_down' &&
    type !== 'key_up'
  ) {
    return
  }

  const message = {
    type,
    key: event.key
  }

  try {
    dataChannel.send(
      JSON.stringify(message)
    )


  } catch (error) {
    console.error(
      'Error enviando evento de teclado:',
      error
    )
  }
}

remoteScreen.addEventListener(
  'keydown',
  (event) => {
    sendRemoteKeyboardEvent(
      'key_down',
      event
    )

    event.preventDefault()
  }
)

remoteScreen.addEventListener(
  'keyup',
  (event) => {
    sendRemoteKeyboardEvent(
      'key_up',
      event
    )

    event.preventDefault()
  }
)

remoteScreen.addEventListener(
  'click',
  () => {
    remoteScreen.focus()
  }
)

/*
 * =========================================================
 * CLICK REMOTO
 * =========================================================
 */

function sendRemoteMouseButton(button, action) {
  if (
    !dataChannel ||
    dataChannel.readyState !== 'open'
  ) {
    return
  }

  if (
    button !== 'left' &&
    button !== 'right'
  ) {
    return
  }

  if (
    action !== 'down' &&
    action !== 'up'
  ) {
    return
  }

  const message = {
    type: `mouse_${action}`,
    button
  }

  try {
    dataChannel.send(
      JSON.stringify(message)
    )

  } catch (error) {
    console.error(
      'Error enviando evento de mouse:',
      error
    )
  }
}

function handleRemotePointerDown(event) {
  if (event.button === 0) {
    sendRemoteMouseButton('left', 'down')
    return
  }

  if (event.button === 2) {
    sendRemoteMouseButton('right', 'down')
  }
}

function handleRemotePointerUp(event) {
  if (event.button === 0) {
    sendRemoteMouseButton('left', 'up')
    return
  }

  if (event.button === 2) {
    sendRemoteMouseButton('right', 'up')
  }
}

function handleRemoteContextMenu(event) {
  event.preventDefault()
}

remoteScreen.addEventListener(
  'pointerdown',
  handleRemotePointerDown
)

remoteScreen.addEventListener(
  'pointerup',
  handleRemotePointerUp
)

remoteScreen.addEventListener(
  'contextmenu',
  handleRemoteContextMenu
)

/*
 * =========================================================
 * DOBLE CLICK REMOTO
 * =========================================================
 */

remoteScreen.addEventListener(
  'dblclick',
  (event) => {
    event.preventDefault()

    if (
      !dataChannel ||
      dataChannel.readyState !== 'open'
    ) {
      return
    }

    sendRemoteMouseButton('left', 'down')

    setTimeout(() => {
      sendRemoteMouseButton('left', 'up')
    }, 40)

    setTimeout(() => {
      sendRemoteMouseButton('left', 'down')
    }, 80)

    setTimeout(() => {
      sendRemoteMouseButton('left', 'up')
    }, 120)


  }
)

/*
 * =========================================================
 * SCROLL REMOTO
 * =========================================================
 */

remoteScreen.addEventListener(
  'wheel',
  (event) => {
    if (
      !dataChannel ||
      dataChannel.readyState !== 'open'
    ) {
      return
    }

    event.preventDefault()

    let delta = Math.round(
      -event.deltaY
    )

    if (delta === 0) {
      return
    }

    delta = Math.max(
      -120,
      Math.min(120, delta)
    )

    const message = {
      type: 'mouse_wheel',
      delta
    }

    try {
      dataChannel.send(
        JSON.stringify(message)
      )

    } catch (error) {
      console.error(
        'Error enviando scroll remoto:',
        error
      )
    }
  },
  { passive: false }
)

/*
 * =========================================================
 * PRUEBA LOCAL DEL COMANDO TAURI
 * =========================================================
 */

/*
 * =========================================================
 * WEBRTC
 * =========================================================
 */

function createPeerConnection() {
  console.log(
    'Creando RTCPeerConnection'
  )

  peerConnection = new RTCPeerConnection(
    rtcConfiguration
  )

  /*
   * =======================================================
   * VIDEO REMOTO
   * =======================================================
   */

  peerConnection.addEventListener(
    'track',
    (event) => {
      console.log(
        'MediaTrack remoto recibido:',
        event.track.kind
      )

      if (
        event.streams &&
        event.streams.length > 0
      ) {
        remoteStream =
          event.streams[0]
      } else {
        if (!remoteStream) {
          remoteStream =
            new MediaStream()
        }

        remoteStream.addTrack(
          event.track
        )
      }

      remoteScreen.srcObject =
        remoteStream

      showActiveSessionUI()

      setStatus(
        'Pantalla remota conectada'
      )

      console.log(
        'Pantalla remota mostrada'
      )
    }
  )

  /*
   * =======================================================
   * DATA CHANNEL
   * =======================================================
   */

  dataChannel =
    peerConnection.createDataChannel(
      'aleux-control'
    )

  dataChannel.addEventListener(
    'open',
    () => {
      console.log(
        'WebRTC DataChannel conectado'
      )

      setStatus(
        'Canal WebRTC conectado'
      )

      dataChannel.send(
        JSON.stringify({
          type: 'hello',
          message: 'HELLO ALEUX'
        })
      )

      console.log(
        'Canal de control listo'
      )
    }
  )

  dataChannel.addEventListener(
    'message',
    (event) => {

      try {
        const data =
          JSON.parse(event.data)

        if (
          data.type ===
          'hello_response'
        ) {
          setStatus(
            'WebRTC PASS: conexión P2P activa'
          )

        }
      } catch {
      }
    }
  )

  dataChannel.addEventListener(
    'close',
    () => {
      console.log(
        'WebRTC DataChannel cerrado'
      )

      setStatus(
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

      setStatus(
        'Error en DataChannel'
      )
    }
  )

  /*
   * =======================================================
   * ICE
   * =======================================================
   */

  peerConnection.addEventListener(
    'icecandidate',
    (event) => {
      if (!event.candidate) {
        console.log(
          'ICE gathering terminado'
        )

        return
      }

      console.log(
        'ICE candidate generado:',
        event.candidate.candidate
      )

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
   * =======================================================
   * CONNECTION STATE
   * =======================================================
   */

  peerConnection.addEventListener(
    'connectionstatechange',
    () => {
      console.log(
        'WebRTC connectionState:',
        peerConnection.connectionState
      )

      if (
        peerConnection.connectionState ===
        'connected'
      ) {
        setStatus(
          'Conexión WebRTC establecida'
        )
      }

      if (
        peerConnection.connectionState ===
        'failed'
      ) {
        setStatus(
          'Conexión WebRTC falló'
        )
      }

      if (
        peerConnection.connectionState ===
        'disconnected'
      ) {
        setStatus(
          'WebRTC desconectado'
        )
      }
    }
  )

  return peerConnection
}

/*
 * =========================================================
 * CREATE OFFER
 * =========================================================
 */

async function createOffer() {
  try {
    createPeerConnection()

    const offer =
      await peerConnection.createOffer()

    await peerConnection.setLocalDescription(
      offer
    )

    console.log(
      'WebRTC Offer creado'
    )

    sendSignal(
      'webrtc_offer',
      {
        type: offer.type,
        sdp: offer.sdp
      }
    )

    setStatus(
      'Esperando respuesta WebRTC...'
    )
  } catch (error) {
    console.error(
      'Error creando Offer:',
      error
    )

    setStatus(
      'Error creando conexión WebRTC'
    )
  }
}

/*
 * =========================================================
 * WEBRTC ANSWER
 * =========================================================
 */

async function handleWebRTCAnswer(data) {
  if (!peerConnection) {
    console.error(
      'No existe RTCPeerConnection'
    )

    return
  }

  try {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription({
        type: data.type,
        sdp: data.sdp
      })
    )

    console.log(
      'WebRTC Answer recibida'
    )
  } catch (error) {
    console.error(
      'Error aplicando Answer:',
      error
    )
  }
}

/*
 * =========================================================
 * SEGUNDA OFFER
 * =========================================================
 */

async function handleWebRTCOffer(data) {
  if (!peerConnection) {
    console.error(
      'No existe RTCPeerConnection para recibir Offer'
    )

    return
  }

  try {
    console.log(
      'Nueva WebRTC Offer recibida'
    )

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription({
        type: data.type,
        sdp: data.sdp
      })
    )

    console.log(
      'Nueva Remote Description aplicada'
    )

    const answer =
      await peerConnection.createAnswer()

    await peerConnection.setLocalDescription(
      answer
    )

    console.log(
      'Nueva WebRTC Answer creada'
    )

    sendSignal(
      'webrtc_answer',
      {
        type: answer.type,
        sdp: answer.sdp
      }
    )

    setStatus(
      'Respuesta enviada. Esperando pantalla...'
    )
  } catch (error) {
    console.error(
      'Error procesando nueva Offer:',
      error
    )

    setStatus(
      'Error procesando transmisión de pantalla'
    )
  }
}

/*
 * =========================================================
 * REMOTE ICE
 * =========================================================
 */

async function handleRemoteIce(data) {
  if (!peerConnection || !data) {
    return
  }

  try {
    await peerConnection.addIceCandidate(
      new RTCIceCandidate({
        candidate: data.candidate,
        sdpMid: data.sdpMid,
        sdpMLineIndex:
          data.sdpMLineIndex
      })
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

/*
 * =========================================================
 * CONNECT TO SESSION
 * =========================================================
 */

function connectToSession() {
  const cleanId =
    input.value.replace(/\D/g, '')

  if (cleanId.length !== 9) {
    setStatus(
      'Ingresa un ID de 9 dígitos'
    )

    return
  }

  sessionId = cleanId

  setStatus(
    'Conectando con el servidor...'
  )

  socket =
    new WebSocket(WS_URL)

  socket.addEventListener(
    'open',
    () => {
      console.log(
        'Técnico conectado al servidor'
      )

      socket.send(
        JSON.stringify({
          type: 'join_session',
          session_id: sessionId
        })
      )
    }
  )

  socket.addEventListener(
    'message',
    async (event) => {

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
        case 'session_joined':

          setStatus(
            'Solicitando autorización del cliente...'
          )

          socket.send(
            JSON.stringify({
              type: 'request_access',
              session_id: sessionId
            })
          )

          break

        case 'access_granted':

          setStatus(
            'Acceso autorizado. Iniciando WebRTC...'
          )

          await createOffer()

          break

        case 'webrtc_answer':

          await handleWebRTCAnswer(
            data.data
          )

          break

        case 'webrtc_offer':

          await handleWebRTCOffer(
            data.data
          )

          break

        case 'webrtc_ice':

          await handleRemoteIce(
            data.data
          )

          break

        case 'access_rejected':

          setStatus(
            'El cliente rechazó la solicitud'
          )

          break

        case 'session_closed':

          setStatus(
            'Sesión cerrada'
          )

          if (dataChannel) {
            try {
              dataChannel.close()
            } catch (error) {
              console.warn(
                'Error cerrando DataChannel:',
                error
              )
            }

            dataChannel = null
          }

          if (remoteScreen) {
            remoteScreen.srcObject = null
          }

          if (remoteScreenContainer) {
            showInitialUI()
          }

          if (peerConnection) {
            try {
              peerConnection.close()
            } catch (error) {
              console.warn(
                'Error cerrando RTCPeerConnection:',
                error
              )
            }

            peerConnection = null
          }

          remoteStream = null
          sessionId = null
          lastMouseSendTime = 0

          if (input) {
            input.value = ''
          }

          break

        default:

      }
    }
  )

  socket.addEventListener(
    'close',
    () => {
      setStatus(
        'Conexión con el servidor cerrada'
      )
    }
  )

  socket.addEventListener(
    'error',
    (error) => {
      console.error(
        'WebSocket:',
        error
      )

      setStatus(
        'Error de conexión'
      )
    }
  )
}

/*
 * =========================================================
 * UI
 * =========================================================
 */

connectButton.addEventListener(
  'click',
  connectToSession
)

input.addEventListener(
  'keydown',
  (event) => {
    if (event.key === 'Enter') {
      connectToSession()
    }
  }
)

closeRemoteSession.addEventListener(
  'click',
  () => {
    if (
      socket &&
      socket.readyState === WebSocket.OPEN &&
      sessionId
    ) {
      socket.send(
        JSON.stringify({
          type: 'close_session',
          session_id: sessionId
        })
      )

      console.log(
        'Solicitud de cierre de sesión enviada'
      )
    } else {
      console.warn(
        'No hay una sesión activa para cerrar'
      )
    }
  }
)