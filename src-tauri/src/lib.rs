#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            move_mouse,
            mouse_down,
            mouse_up,
            mouse_wheel,
            key_down,
            key_up
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}

#[tauri::command]
fn move_mouse(x: i32, y: i32) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::WindowsAndMessaging::SetCursorPos;

        let result = unsafe { SetCursorPos(x, y) };

        if result == 0 {
            return Err(
                "No fue posible mover el cursor de Windows."
                    .to_string()
            );
        }

    }

    #[cfg(not(windows))]
    {
        let _ = (x, y);

        return Err(
            "El control de mouse solo está implementado para Windows."
                .to_string(),
        );
    }

    Ok(())
}

#[tauri::command]
fn mouse_down(button: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
            SendInput,
            INPUT,
            INPUT_0,
            MOUSEEVENTF_LEFTDOWN,
            MOUSEEVENTF_RIGHTDOWN,
            MOUSEINPUT,
        };

        let flags = match button.as_str() {
            "left" => MOUSEEVENTF_LEFTDOWN,
            "right" => MOUSEEVENTF_RIGHTDOWN,
            _ => {
                return Err(
                    "Botón de mouse no válido.".to_string()
                );
            }
        };

        let mut input = INPUT {
            r#type: 0,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: 0,
                    dwFlags: flags,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        let result = unsafe {
            SendInput(
                1,
                &mut input,
                std::mem::size_of::<INPUT>() as i32,
            )
        };

        if result != 1 {
            return Err(
                "No fue posible presionar el botón del mouse."
                    .to_string()
            );
        }

    }

    #[cfg(not(windows))]
    {
        let _ = button;

        return Err(
            "El control de mouse solo está implementado para Windows."
                .to_string(),
        );
    }

    Ok(())
}

#[tauri::command]
fn mouse_up(button: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
            SendInput,
            INPUT,
            INPUT_0,
            MOUSEEVENTF_LEFTUP,
            MOUSEEVENTF_RIGHTUP,
            MOUSEINPUT,
        };

        let flags = match button.as_str() {
            "left" => MOUSEEVENTF_LEFTUP,
            "right" => MOUSEEVENTF_RIGHTUP,
            _ => {
                return Err(
                    "Botón de mouse no válido.".to_string()
                );
            }
        };

        let mut input = INPUT {
            r#type: 0,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: 0,
                    dwFlags: flags,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        let result = unsafe {
            SendInput(
                1,
                &mut input,
                std::mem::size_of::<INPUT>() as i32,
            )
        };

        if result != 1 {
            return Err(
                "No fue posible soltar el botón del mouse."
                    .to_string()
            );
        }

    }

    #[cfg(not(windows))]
    {
        let _ = button;

        return Err(
            "El control de mouse solo está implementado para Windows."
                .to_string(),
        );
    }

    Ok(())
}

/*
 * =========================================================
 * SCROLL REMOTO
 * =========================================================
 *
 * delta:
 *   positivo = arriba
 *   negativo = abajo
 *
 * Windows utiliza WHEEL_DELTA = 120 por unidad de rueda.
 * =========================================================
 */

#[tauri::command]
fn mouse_wheel(delta: i32) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
            SendInput,
            INPUT,
            INPUT_0,
            MOUSEEVENTF_WHEEL,
            MOUSEINPUT,
        };

        if delta == 0 {
            return Ok(());
        }

        let mut input = INPUT {
            r#type: 0,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: delta as u32,
                    dwFlags: MOUSEEVENTF_WHEEL,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        let result = unsafe {
            SendInput(
                1,
                &mut input,
                std::mem::size_of::<INPUT>() as i32,
            )
        };

        if result != 1 {
            return Err(
                "No fue posible ejecutar el scroll del mouse."
                    .to_string()
            );
        }

    }

    #[cfg(not(windows))]
    {
        let _ = delta;

        return Err(
            "El control de mouse solo está implementado para Windows."
                .to_string(),
        );
    }

    Ok(())
}

#[tauri::command]
fn key_down(key: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
            SendInput,
            INPUT,
            INPUT_0,
            KEYBDINPUT,
            VK_BACK,
            VK_TAB,
            VK_RETURN,
            VK_SHIFT,
            VK_CONTROL,
            VK_MENU,
            VK_PAUSE,
            VK_CAPITAL,
            VK_ESCAPE,
            VK_SPACE,
            VK_PRIOR,
            VK_NEXT,
            VK_END,
            VK_HOME,
            VK_LEFT,
            VK_UP,
            VK_RIGHT,
            VK_DOWN,
            VK_INSERT,
            VK_DELETE,
            VK_LWIN,
            VK_RWIN,
            VK_F1,
            VK_F2,
            VK_F3,
            VK_F4,
            VK_F5,
            VK_F6,
            VK_F7,
            VK_F8,
            VK_F9,
            VK_F10,
            VK_F11,
            VK_F12,
        };

        let vk: u16 = match key.as_str() {
            "Backspace" => VK_BACK as u16,
            "Tab" => VK_TAB as u16,
            "Enter" => VK_RETURN as u16,
            "Shift" => VK_SHIFT as u16,
            "Control" => VK_CONTROL as u16,
            "Alt" => VK_MENU as u16,
            "Pause" => VK_PAUSE as u16,
            "CapsLock" => VK_CAPITAL as u16,
            "Escape" => VK_ESCAPE as u16,
            " " => VK_SPACE as u16,
            "PageUp" => VK_PRIOR as u16,
            "PageDown" => VK_NEXT as u16,
            "End" => VK_END as u16,
            "Home" => VK_HOME as u16,
            "ArrowLeft" => VK_LEFT as u16,
            "ArrowUp" => VK_UP as u16,
            "ArrowRight" => VK_RIGHT as u16,
            "ArrowDown" => VK_DOWN as u16,
            "Insert" => VK_INSERT as u16,
            "Delete" => VK_DELETE as u16,
            "MetaLeft" => VK_LWIN as u16,
            "MetaRight" => VK_RWIN as u16,

            "F1" => VK_F1 as u16,
            "F2" => VK_F2 as u16,
            "F3" => VK_F3 as u16,
            "F4" => VK_F4 as u16,
            "F5" => VK_F5 as u16,
            "F6" => VK_F6 as u16,
            "F7" => VK_F7 as u16,
            "F8" => VK_F8 as u16,
            "F9" => VK_F9 as u16,
            "F10" => VK_F10 as u16,
            "F11" => VK_F11 as u16,
            "F12" => VK_F12 as u16,

            k if k.len() == 1
                && k.as_bytes()[0].is_ascii_alphabetic() =>
            {
                k.to_ascii_uppercase().as_bytes()[0] as u16
            }

            k if k.len() == 1
                && k.as_bytes()[0].is_ascii_digit() =>
            {
                k.as_bytes()[0] as u16
            }

            _ => {
                return Err(
                    format!("Tecla no soportada: {}", key)
                );
            }
        };

        let mut input = INPUT {
            r#type: 1,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    wScan: 0,
                    dwFlags: 0,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        let result = unsafe {
            SendInput(
                1,
                &mut input,
                std::mem::size_of::<INPUT>() as i32,
            )
        };

        if result != 1 {
            return Err(
                format!(
                    "No fue posible presionar la tecla: {}",
                    key
                )
            );
        }

    }

    #[cfg(not(windows))]
    {
        let _ = key;

        return Err(
            "El control de teclado solo está implementado para Windows."
                .to_string(),
        );
    }

    Ok(())
}

#[tauri::command]
fn key_up(key: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
            SendInput,
            INPUT,
            INPUT_0,
            KEYBDINPUT,
            KEYEVENTF_KEYUP,
            VK_BACK,
            VK_TAB,
            VK_RETURN,
            VK_SHIFT,
            VK_CONTROL,
            VK_MENU,
            VK_PAUSE,
            VK_CAPITAL,
            VK_ESCAPE,
            VK_SPACE,
            VK_PRIOR,
            VK_NEXT,
            VK_END,
            VK_HOME,
            VK_LEFT,
            VK_UP,
            VK_RIGHT,
            VK_DOWN,
            VK_INSERT,
            VK_DELETE,
            VK_LWIN,
            VK_RWIN,
            VK_F1,
            VK_F2,
            VK_F3,
            VK_F4,
            VK_F5,
            VK_F6,
            VK_F7,
            VK_F8,
            VK_F9,
            VK_F10,
            VK_F11,
            VK_F12,
        };

        let vk: u16 = match key.as_str() {
            "Backspace" => VK_BACK as u16,
            "Tab" => VK_TAB as u16,
            "Enter" => VK_RETURN as u16,
            "Shift" => VK_SHIFT as u16,
            "Control" => VK_CONTROL as u16,
            "Alt" => VK_MENU as u16,
            "Pause" => VK_PAUSE as u16,
            "CapsLock" => VK_CAPITAL as u16,
            "Escape" => VK_ESCAPE as u16,
            " " => VK_SPACE as u16,
            "PageUp" => VK_PRIOR as u16,
            "PageDown" => VK_NEXT as u16,
            "End" => VK_END as u16,
            "Home" => VK_HOME as u16,
            "ArrowLeft" => VK_LEFT as u16,
            "ArrowUp" => VK_UP as u16,
            "ArrowRight" => VK_RIGHT as u16,
            "ArrowDown" => VK_DOWN as u16,
            "Insert" => VK_INSERT as u16,
            "Delete" => VK_DELETE as u16,
            "MetaLeft" => VK_LWIN as u16,
            "MetaRight" => VK_RWIN as u16,

            "F1" => VK_F1 as u16,
            "F2" => VK_F2 as u16,
            "F3" => VK_F3 as u16,
            "F4" => VK_F4 as u16,
            "F5" => VK_F5 as u16,
            "F6" => VK_F6 as u16,
            "F7" => VK_F7 as u16,
            "F8" => VK_F8 as u16,
            "F9" => VK_F9 as u16,
            "F10" => VK_F10 as u16,
            "F11" => VK_F11 as u16,
            "F12" => VK_F12 as u16,

            k if k.len() == 1
                && k.as_bytes()[0].is_ascii_alphabetic() =>
            {
                k.to_ascii_uppercase().as_bytes()[0] as u16
            }

            k if k.len() == 1
                && k.as_bytes()[0].is_ascii_digit() =>
            {
                k.as_bytes()[0] as u16
            }

            _ => {
                return Err(
                    format!("Tecla no soportada: {}", key)
                );
            }
        };

        let mut input = INPUT {
            r#type: 1,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        let result = unsafe {
            SendInput(
                1,
                &mut input,
                std::mem::size_of::<INPUT>() as i32,
            )
        };

        if result != 1 {
            return Err(
                format!(
                    "No fue posible soltar la tecla: {}",
                    key
                )
            );
        }

    }

    #[cfg(not(windows))]
    {
        let _ = key;

        return Err(
            "El control de teclado solo está implementado para Windows."
                .to_string(),
        );
    }

    Ok(())
}