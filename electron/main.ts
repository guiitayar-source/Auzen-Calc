import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const APP_ROOT = path.join(__dirname, '..')
const RENDERER_DIST = path.join(APP_ROOT, 'dist')
const VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
      contextIsolation: true,
    },
    width: 1200,
    height: 800,
    show: false,
  })

  win.setMenu(null)

  win.once('ready-to-show', () => {
    win?.show()
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// --- Google OAuth Authorization Code Flow ---
import fs from 'node:fs'
const secretsPath = path.join(APP_ROOT, 'google-secrets.json')
let GOOGLE_CLIENT_ID = ''
let GOOGLE_CLIENT_SECRET = ''

if (fs.existsSync(secretsPath)) {
  const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf-8'))
  GOOGLE_CLIENT_ID = secrets.client_id
  GOOGLE_CLIENT_SECRET = secrets.client_secret
}

const OAUTH_PORT = 48291 // Porta exclusiva para OAuth (não conflita com Vite 5180)
const REDIRECT_URI = `http://localhost:${OAUTH_PORT}`

ipcMain.handle('google-oauth', async () => {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://${req.headers.host}`)
      
      // Ignorar favicon
      if (url.pathname === '/favicon.ico') {
        res.writeHead(204)
        res.end()
        return
      }

      const code = url.searchParams.get('code')

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<h1>Login concluído!</h1><p>Você já pode fechar esta janela e voltar ao Auzên Calc.</p>')
        server.close()

        // Trocar o código de autorização por um access_token
        try {
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: GOOGLE_CLIENT_ID,
              client_secret: GOOGLE_CLIENT_SECRET,
              redirect_uri: REDIRECT_URI,
              grant_type: 'authorization_code',
            }).toString(),
          })

          const tokenData = await tokenRes.json()

          if (tokenData.access_token) {
            resolve(tokenData.access_token)
          } else {
            const errorMsg = tokenData.error_description || tokenData.error || 'Erro desconhecido na troca do token'
            reject(new Error(errorMsg))
          }
        } catch (err) {
          reject(err)
        }
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<h1>Erro: código de autorização não recebido.</h1>')
        server.close()
        reject(new Error('Código de autorização não recebido'))
      }
    }).listen(OAUTH_PORT)

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email')}&` +
      `access_type=offline`

    shell.openExternal(authUrl)

    setTimeout(() => {
      server.close()
      reject(new Error('Timeout na autenticação (5 min)'))
    }, 5 * 60 * 1000)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
