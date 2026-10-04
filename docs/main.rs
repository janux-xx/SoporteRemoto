
use futures_util::{SinkExt, StreamExt};

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
    routing::{any, get},
    Json, Router,
};

use serde::{Deserialize, Serialize};
use serde_json::json;

use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use tokio::sync::{mpsc, RwLock};
use tracing::info;
use uuid::Uuid;

type SessionId = String;

#[derive(Clone)]
struct AppState {
    sessions: Arc<RwLock<HashMap<SessionId, Session>>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SessionState {
    Created,
    Connected,
    AccessRequested,
    Authorized,
    Active,
    Closed,
}

struct Session {
    client_id: Uuid,
    created_at: u64,

    client_tx: mpsc::UnboundedSender<Message>,

    technician_id: Option<Uuid>,
    technician_tx: Option<mpsc::UnboundedSender<Message>>,

    access_granted: bool,
    state: SessionState,
}

#[derive(Debug, Deserialize)]
struct ClientMessage {
    #[serde(rename = "type")]
    message_type: String,

    session_id: Option<String>,

    // Datos utilizados para WebRTC signaling.
    data: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
struct SessionResponse {
    #[serde(rename = "type")]
    message_type: String,

    session_id: String,

    token: String,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .init();

    let state = AppState {
        sessions: Arc::new(RwLock::new(HashMap::new())),
    };

    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health))
        .route("/ws", any(websocket_handler))
        .with_state(state);

    let address = SocketAddr::from(([127, 0, 0, 1], 8787));

    info!("Aleux Remote Server");
    info!("Listening on {}", address);

    let listener = tokio::net::TcpListener::bind(address)
        .await
        .expect("No se pudo abrir el puerto 8787");

    axum::serve(listener, app)
        .await
        .expect("Error del servidor");
}

async fn root() -> impl IntoResponse {
    Json(json!({
        "service": "Aleux Soporte Remoto",
        "status": "online"
    }))
}

async fn health() -> impl IntoResponse {
    Json(json!({
        "status": "ok"
    }))
}

async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(
    socket: WebSocket,
    state: AppState,
) {
    let client_id = Uuid::new_v4();

    let (mut socket_tx, mut socket_rx) = socket.split();

    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();

    let writer = tokio::spawn(async move {
        while let Some(message) = rx.recv().await {
            if socket_tx.send(message).await.is_err() {
                break;
            }
        }
    });

    info!("Nueva conexión: {}", client_id);

    while let Some(Ok(message)) = socket_rx.next().await {
        match message {
            Message::Text(text) => {
                info!("{} -> {}", client_id, text);

                let parsed = serde_json::from_str::<ClientMessage>(&text);

                let Ok(message) = parsed else {
                    let _ = tx.send(Message::Text(
                        json!({
                            "type": "error",
                            "message": "Mensaje JSON inválido"
                        })
                        .to_string()
                        .into(),
                    ));

                    continue;
                };

                match message.message_type.as_str() {

                    // =====================================================
                    // SESIONES
                    // =====================================================

                    "create_session" => {
                        create_session(
                            &tx,
                            &state,
                            client_id,
                        )
                        .await;
                    }

                    "join_session" => {
                        join_session(
                            &tx,
                            &state,
                            client_id,
                            message.session_id,
                        )
                        .await;
                    }

                    "request_access" => {
                        request_access(
                            &state,
                            client_id,
                            message.session_id,
                        )
                        .await;
                    }

                    "accept_access" => {
                        accept_access(
                            &state,
                            client_id,
                            message.session_id,
                        )
                        .await;
                    }

                    "reject_access" => {
                        reject_access(
                            &state,
                            client_id,
                            message.session_id,
                        )
                        .await;
                    }

                    "close_session" => {
                        close_session(
                            &state,
                            client_id,
                            message.session_id,
                        )
                        .await;
                    }

                    // =====================================================
                    // WEBRTC SIGNALING
                    // =====================================================

                    "webrtc_offer" => {
                        relay_webrtc_message(
                            &state,
                            client_id,
                            message.session_id,
                            "webrtc_offer",
                            message.data,
                        )
                        .await;
                    }

                    "webrtc_answer" => {
                        relay_webrtc_message(
                            &state,
                            client_id,
                            message.session_id,
                            "webrtc_answer",
                            message.data,
                        )
                        .await;
                    }

                    "webrtc_ice" => {
                        relay_webrtc_message(
                            &state,
                            client_id,
                            message.session_id,
                            "webrtc_ice",
                            message.data,
                        )
                        .await;
                    }

                    "chat_message" => {
                        relay_chat_message(
                            &state,
                            client_id,
                            message.session_id,
                            message.data,
                        )
                        .await;
                    }

                    _ => {
                        let _ = tx.send(Message::Text(
                            json!({
                                "type": "error",
                                "message": "Tipo de mensaje no soportado"
                            })
                            .to_string()
                            .into(),
                        ));
                    }
                }
            }

            Message::Close(_) => {
                info!("Conexión cerrada: {}", client_id);
                break;
            }

            _ => {}
        }
    }

    cleanup_client(&state, client_id).await;

    writer.abort();
}

// =============================================================
// CREATE SESSION
// =============================================================

async fn create_session(
    tx: &mpsc::UnboundedSender<Message>,
    state: &AppState,
    client_id: Uuid,
) {
    let session_id = generate_session_id(&state.sessions).await;

    let token = Uuid::new_v4().to_string();

    let created_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let session = Session {
        client_id,
        created_at,

        client_tx: tx.clone(),

        technician_id: None,
        technician_tx: None,

        access_granted: false,
        state: SessionState::Created,
    };

    state
        .sessions
        .write()
        .await
        .insert(session_id.clone(), session);

    let response = SessionResponse {
        message_type: "session_created".to_string(),
        session_id: session_id.clone(),
        token,
    };

    info!(
        "Sesión creada: {} para cliente {}",
        session_id,
        client_id
    );

    let _ = tx.send(Message::Text(
        serde_json::to_string(&response)
            .unwrap()
            .into(),
    ));
}

// =============================================================
// JOIN SESSION
// =============================================================

async fn join_session(
    tx: &mpsc::UnboundedSender<Message>,
    state: &AppState,
    technician_id: Uuid,
    session_id: Option<String>,
) {
    let Some(session_id) = session_id else {
        send_error(tx, "session_id es obligatorio");
        return;
    };

    let mut sessions = state.sessions.write().await;

    let Some(session) = sessions.get_mut(&session_id) else {
        send_error(tx, "Sesión no encontrada");
        return;
    };

    if session.technician_tx.is_some() {
        send_error(tx, "La sesión ya tiene un técnico conectado");
        return;
    }

    session.technician_id = Some(technician_id);
    session.technician_tx = Some(tx.clone());
    session.state = SessionState::Connected;

    info!(
        "Técnico {} se unió a sesión {}",
        technician_id,
        session_id
    );

    let _ = tx.send(Message::Text(
        json!({
            "type": "session_joined",
            "session_id": session_id,
            "message": "Técnico conectado. Esperando autorización del cliente."
        })
        .to_string()
        .into(),
    ));
}

// =============================================================
// REQUEST ACCESS
// =============================================================

async fn request_access(
    state: &AppState,
    technician_id: Uuid,
    session_id: Option<String>,
) {
    let Some(session_id) = session_id else {
        return;
    };

    let mut sessions = state.sessions.write().await;

    let Some(session) = sessions.get_mut(&session_id) else {
        return;
    };

    if session.technician_id != Some(technician_id) {
        return;
    }

    if session.access_granted {
        return;
    }

    session.state = SessionState::AccessRequested;

    let _ = session.client_tx.send(Message::Text(
        json!({
            "type": "access_request",
            "session_id": session_id,
            "message": "Un técnico solicita acceso a este equipo."
        })
        .to_string()
        .into(),
    ));

    info!(
        "Solicitud de acceso enviada al cliente de sesión {}",
        session_id
    );
}

// =============================================================
// ACCEPT ACCESS
// =============================================================

async fn accept_access(
    state: &AppState,
    client_id: Uuid,
    session_id: Option<String>,
) {
    let Some(session_id) = session_id else {
        return;
    };

    let mut sessions = state.sessions.write().await;

    let Some(session) = sessions.get_mut(&session_id) else {
        return;
    };

    if session.client_id != client_id {
        return;
    }

    session.access_granted = true;
    session.state = SessionState::Authorized;

    if let Some(technician_tx) = &session.technician_tx {
        let _ = technician_tx.send(Message::Text(
            json!({
                "type": "access_granted",
                "session_id": session_id,
                "message": "El cliente autorizó la conexión."
            })
            .to_string()
            .into(),
        ));
    }

    let _ = session.client_tx.send(Message::Text(
        json!({
            "type": "access_granted",
            "session_id": session_id,
            "message": "Conexión autorizada."
        })
        .to_string()
        .into(),
    ));

    info!(
        "Acceso autorizado para sesión {}",
        session_id
    );
}

// =============================================================
// REJECT ACCESS
// =============================================================

async fn reject_access(
    state: &AppState,
    client_id: Uuid,
    session_id: Option<String>,
) {
    let Some(session_id) = session_id else {
        return;
    };

    let mut sessions = state.sessions.write().await;

    let Some(session) = sessions.get_mut(&session_id) else {
        return;
    };

    if session.client_id != client_id {
        return;
    }

    session.access_granted = false;

    if let Some(technician_tx) = &session.technician_tx {
        let _ = technician_tx.send(Message::Text(
            json!({
                "type": "access_rejected",
                "session_id": session_id,
                "message": "El cliente rechazó la conexión."
            })
            .to_string()
            .into(),
        ));
    }

    let _ = session.client_tx.send(Message::Text(
        json!({
            "type": "access_rejected",
            "session_id": session_id,
            "message": "La solicitud fue rechazada."
        })
        .to_string()
        .into(),
    ));

    info!(
        "Acceso rechazado para sesión {}",
        session_id
    );
}

// =============================================================
// WEBRTC SIGNALING RELAY
// =============================================================

async fn relay_webrtc_message(
    state: &AppState,
    sender_id: Uuid,
    session_id: Option<String>,
    message_type: &str,
    data: Option<serde_json::Value>,
) {
    let Some(session_id) = session_id else {
        return;
    };

    let mut sessions = state.sessions.write().await;

    let Some(session) = sessions.get_mut(&session_id) else {
        return;
    };

    // Nadie puede iniciar señalización WebRTC
    // antes de que el cliente haya autorizado.
    if !session.access_granted {
        info!(
            "WebRTC rechazado: sesión {} aún no autorizada",
            session_id
        );

        return;
    }

    // La sesión pasa a ACTIVE cuando comienza
    // la señalización WebRTC autorizada.
    session.state = SessionState::Active;

    let target = if sender_id == session.client_id {
        session.technician_tx.as_ref()
    } else if session.technician_id == Some(sender_id) {
        Some(&session.client_tx)
    } else {
        None
    };

    let Some(target_tx) = target else {
        return;
    };

    let message = json!({
        "type": message_type,
        "session_id": session_id,
        "data": data
    });

    let _ = target_tx.send(Message::Text(
        message
            .to_string()
            .into(),
    ));

    info!(
        "WebRTC {} reenviado para sesión {}",
        message_type,
        session_id
    );
}

// =============================================================
// CHAT MESSAGE RELAY
// =============================================================

async fn relay_chat_message(
    state: &AppState,
    sender_id: Uuid,
    session_id: Option<String>,
    data: Option<serde_json::Value>,
) {
    let Some(session_id) = session_id else {
        return;
    };

    let sessions = state.sessions.read().await;

    let Some(session) = sessions.get(&session_id) else {
        return;
    };

    // El chat solamente está disponible
    // cuando el cliente ha autorizado la conexión.
    if !session.access_granted {
        info!(
            "Chat rechazado: sesión {} aún no autorizada",
            session_id
        );

        return;
    }

    let target = if sender_id == session.client_id {
        session.technician_tx.as_ref()
    } else if session.technician_id == Some(sender_id) {
        Some(&session.client_tx)
    } else {
        None
    };

    let Some(target_tx) = target else {
        return;
    };

    let message = json!({
        "type": "chat_message",
        "session_id": session_id,
        "data": data
    });

    let _ = target_tx.send(Message::Text(
        message.to_string().into(),
    ));

    info!(
        "Chat reenviado para sesión {}",
        session_id
    );
}


// =============================================================
// CLOSE SESSION
// =============================================================

async fn close_session(
    state: &AppState,
    requester_id: Uuid,
    session_id: Option<String>,
) {
    let Some(session_id) = session_id else {
        return;
    };

    let mut sessions = state.sessions.write().await;

    let Some(session) = sessions.get_mut(&session_id) else {
        return;
    };

    let authorized = session.client_id == requester_id
        || session.technician_id == Some(requester_id);

    if !authorized {
        return;
    }

    session.state = SessionState::Closed;

    if let Some(technician_tx) = &session.technician_tx {
        let _ = technician_tx.send(Message::Text(
            json!({
                "type": "session_closed",
                "session_id": session_id
            })
            .to_string()
            .into(),
        ));
    }

    let _ = session.client_tx.send(Message::Text(
        json!({
            "type": "session_closed",
            "session_id": session_id
        })
        .to_string()
        .into(),
    ));

    sessions.remove(&session_id);

    info!("Sesión cerrada: {}", session_id);
}

// =============================================================
// GENERATE SESSION ID
// =============================================================

async fn generate_session_id(
    sessions: &Arc<RwLock<HashMap<SessionId, Session>>>,
) -> String {
    loop {
        let bytes = *Uuid::new_v4().as_bytes();

        let number = u32::from_be_bytes([
            bytes[0],
            bytes[1],
            bytes[2],
            bytes[3],
        ]) % 1_000_000_000;

        let id = format!("{:09}", number);

        if !sessions.read().await.contains_key(&id) {
            return id;
        }
    }
}

// =============================================================
// CLEANUP
// =============================================================

async fn cleanup_client(
    state: &AppState,
    client_id: Uuid,
) {
    let mut sessions = state.sessions.write().await;

    sessions.retain(|_, session| {
        if session.client_id == client_id {

            if let Some(technician_tx) = &session.technician_tx {
                let _ = technician_tx.send(Message::Text(
                    json!({
                        "type": "session_closed",
                        "message": "El cliente se desconectó."
                    })
                    .to_string()
                    .into(),
                ));
            }

            false
        } else {
            true
        }
    });
}

// =============================================================
// ERROR
// =============================================================

fn send_error(
    tx: &mpsc::UnboundedSender<Message>,
    message: &str,
) {
    let _ = tx.send(Message::Text(
        json!({
            "type": "error",
            "message": message
        })
        .to_string()
        .into(),
    ));
}
