const { spawn } = require('child_process');
const admin = require('firebase-admin');
const env = require('../config/env');

/**
 * Manages the Cloudflare Tunnel lifecycle and pushes the active URL to Firebase Firestore.
 */
class EnvironmentService {
    constructor() {
        this.tunnelProcess = null;
        this.activeUrl = env.activeBaseUrl;
    }

    async publishToFirebase(url) {
        try {
            const db = admin.firestore();
            await db.collection('remoteConfig').doc('urls').set({
                apiBaseUrl: url,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                mode: env.appEnv
            }, { merge: true });
            console.log(`[EnvService] Successfully published URL to Firebase: ${url}`);
        } catch (error) {
            if (error.message.includes('PERMISSION_DENIED') || error.message.includes('enabled')) {
                console.warn('[EnvService] ⚠️ Firebase Firestore is DISABLED in your console. Remote testers will NOT be able to find this backend.');
                console.warn('[EnvService] 👉 ACTION REQUIRED: Enable Firestore at https://console.firebase.google.com/project/pdt-acdc4/firestore');
            } else {
                console.error(`[EnvService] Failed to publish URL to Firebase:`, error.message);
            }
        }
    }

    async establishTunnel() {
        return new Promise((resolve, reject) => {
            const path = require('path');
            const fs = require('fs');

            // Try to find cloudflared in common locations
            const possiblePaths = [
                'cloudflared', // System PATH
                path.resolve(process.cwd(), 'scripts', 'cloudflared.exe'), // Backend scripts folder
                path.resolve(process.cwd(), 'cloudflared.exe'), // Backend folder
                path.resolve(process.cwd(), '..', 'cloudflared.exe'), // Project Root
            ];

            let binaryPath = 'cloudflared';
            for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                    binaryPath = p;
                    break;
                }
            }

            console.log(`[EnvService] Starting Cloudflare tunnel using: ${binaryPath} against local port ${env.port}...`);
            
            this.tunnelProcess = spawn(binaryPath, ['tunnel', '--url', `http://localhost:${env.port}`], {
                shell: true
            });

            let buffer = '';
            this.tunnelProcess.stderr.on('data', (data) => {
                buffer += data.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep the last partial line

                for (const line of lines) {
                    const match = line.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
                    if (match) {
                        const discoveredUrl = match[0];
                        console.log(`[EnvService] Discovered Tunnel URL: ${discoveredUrl}`);
                        resolve(discoveredUrl);
                        return;
                    }
                }
            });

            this.tunnelProcess.on('error', (err) => {
                console.error('[EnvService] Failed to start cloudflared:', err);
                reject(err);
            });

            this.tunnelProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error(`[EnvService] cloudflared process exited with code ${code}`);
                }
            });
        });
    }

    async boot() {
        console.log(`[EnvService] Booting in ${env.appEnv.toUpperCase()} mode.`);
        
        // Skip tunnel if running on Render
        if (process.env.RENDER) {
            console.log('[EnvService] 🚀 Running on Render. Skipping tunnel.');
            this.activeUrl = process.env.RENDER_EXTERNAL_URL || this.activeUrl;
            env.activeBaseUrl = this.activeUrl;
            env.publicBaseUrl = this.activeUrl;
            void this.publishToFirebase(this.activeUrl);
            return;
        }

        if (env.appEnv === 'cloud') {
            try {
                const cloudUrl = await this.establishTunnel();
                this.activeUrl = cloudUrl;
                env.activeBaseUrl = cloudUrl;
                env.publicBaseUrl = cloudUrl;
                void this.publishToFirebase(cloudUrl);
            } catch (err) {
                console.error('[EnvService] Error establishing cloud tunnel, falling back to local.', err);
                void this.publishToFirebase(this.activeUrl);
            }
        } else {
            // Local mode should never block startup on remote config publishing.
            console.log('[EnvService] Skipping Firebase remote config publish in LOCAL mode.');
        }
    }

    stop() {
        if (this.tunnelProcess) {
            console.log('[EnvService] Terminating Cloudflare tunnel...');
            this.tunnelProcess.kill('SIGINT');
        }
    }
}

const envService = new EnvironmentService();
module.exports = envService;
