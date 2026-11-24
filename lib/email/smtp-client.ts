import tls from 'tls';
import net from 'net';

export interface SmtpOptions {
  host: string;
  port: number;
  secure?: boolean; // true for 465, false for 587/25
  auth?: {
    user: string;
    pass: string;
  };
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  timeoutMs?: number;
}

export interface SmtpSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  transcript?: string[];
}

/**
 * Pure Node.js SMTP client over TLS/TCP with zero npm dependencies.
 * Supports direct SSL/TLS on port 465 (Gmail, Yahoo, etc.) and STARTTLS on port 587.
 */
export async function sendSmtpMail(options: SmtpOptions): Promise<SmtpSendResult> {
  const {
    host,
    port = 465,
    secure = port === 465,
    auth,
    from,
    to,
    subject,
    text,
    html,
    timeoutMs = 15000,
  } = options;

  const transcript: string[] = [];

  return new Promise((resolve) => {
    let timer: NodeJS.Timeout | null = null;
    let socket: net.Socket | tls.TLSSocket | null = null;
    let step = 0;
    let buffer = '';

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (socket && !socket.destroyed) {
        socket.destroy();
      }
    };

    timer = setTimeout(() => {
      cleanup();
      resolve({
        success: false,
        error: `SMTP connection to ${host}:${port} timed out after ${timeoutMs}ms`,
        transcript,
      });
    }, timeoutMs);

    const onFatalError = (err: any) => {
      cleanup();
      resolve({
        success: false,
        error: `SMTP error: ${err.message || String(err)}`,
        transcript,
      });
    };

    const sendCmd = (cmd: string, maskLog = false) => {
      if (maskLog) {
        transcript.push(`CLIENT: [AUTH CREDENTIALS HIDDEN]`);
      } else {
        transcript.push(`CLIENT: ${cmd.trim()}`);
      }
      socket?.write(cmd + '\r\n');
    };

    const handleServerResponse = (code: number, line: string) => {
      transcript.push(`SERVER (${code}): ${line}`);

      // Check for error codes (4xx, 5xx)
      if (code >= 400) {
        onFatalError(new Error(`Server error response: ${code} ${line}`));
        return;
      }

      switch (step) {
        case 0: // Server greeting (220)
          if (code === 220) {
            step = 1;
            sendCmd(`EHLO localhost`);
          }
          break;

        case 1: // EHLO response (250)
          if (code === 250) {
            if (auth && auth.user && auth.pass) {
              step = 2;
              sendCmd(`AUTH LOGIN`);
            } else {
              // No auth, skip to MAIL FROM
              step = 5;
              const senderAddr = extractEmailAddress(from);
              sendCmd(`MAIL FROM:<${senderAddr}>`);
            }
          }
          break;

        case 2: // AUTH LOGIN response (334 Username challenge)
          if (code === 334) {
            step = 3;
            sendCmd(Buffer.from(auth!.user).toString('base64'), true);
          }
          break;

        case 3: // Username accepted (334 Password challenge)
          if (code === 334) {
            step = 4;
            sendCmd(Buffer.from(auth!.pass.replace(/\s+/g, '')).toString('base64'), true);
          }
          break;

        case 4: // Auth success (235)
          if (code === 235) {
            step = 5;
            const senderAddr = extractEmailAddress(from);
            sendCmd(`MAIL FROM:<${senderAddr}>`);
          }
          break;

        case 5: // MAIL FROM accepted (250)
          if (code === 250) {
            step = 6;
            const recipientAddr = extractEmailAddress(to);
            sendCmd(`RCPT TO:<${recipientAddr}>`);
          }
          break;

        case 6: // RCPT TO accepted (250)
          if (code === 250) {
            step = 7;
            sendCmd(`DATA`);
          }
          break;

        case 7: // DATA prompt (354)
          if (code === 354) {
            step = 8;
            const mimeMessage = buildMimeMessage({
              from,
              to,
              subject,
              text,
              html,
            });
            // Send email body followed by CRLF.CRLF
            sendCmd(mimeMessage + '\r\n.');
          }
          break;

        case 8: // Message queued/accepted (250)
          if (code === 250) {
            step = 9;
            sendCmd(`QUIT`);
            cleanup();
            resolve({
              success: true,
              messageId: line,
              transcript,
            });
          }
          break;

        default:
          break;
      }
    };

    try {
      if (secure) {
        socket = tls.connect(port, host, { rejectUnauthorized: false }, () => {
          transcript.push(`TLS connection established with ${host}:${port}`);
        });
      } else {
        socket = net.connect(port, host, () => {
          transcript.push(`TCP connection established with ${host}:${port}`);
        });
      }

      socket.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\r\n');
        buffer = lines.pop() || ''; // Keep incomplete trailing fragment

        for (const line of lines) {
          if (!line.trim()) continue;
          // Standard SMTP status code is 3 digits
          const match = line.match(/^(\d{3})([ -])(.*)$/);
          if (match) {
            const code = parseInt(match[1], 10);
            const isLastLine = match[2] === ' ';
            // If it's a multi-line response (e.g. 250-SIZE...), wait for final line (250 OK)
            if (isLastLine) {
              handleServerResponse(code, match[3]);
            } else {
              transcript.push(`SERVER (${code}): ${match[3]}`);
            }
          }
        }
      });

      socket.on('error', onFatalError);
      socket.on('close', () => {
        if (step < 8) {
          onFatalError(new Error('SMTP connection closed before message delivery completed.'));
        }
      });
    } catch (err: any) {
      onFatalError(err);
    }
  });
}

function extractEmailAddress(full: string): string {
  const match = full.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  return full.trim();
}

function buildMimeMessage(data: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}): string {
  const boundary = `==_MIME_PART_${Date.now()}_${Math.random().toString(36).substring(2, 8)}==`;
  const dateStr = new Date().toUTCString();
  const msgId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@gps-attendance.local>`;

  const headers = [
    `From: ${data.from}`,
    `To: ${data.to}`,
    `Subject: ${data.subject}`,
    `Date: ${dateStr}`,
    `Message-ID: ${msgId}`,
    `MIME-Version: 1.0`,
  ];

  if (data.html) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    return `${headers.join('\r\n')}

--${boundary}
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 8bit

${data.text}

--${boundary}
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: 8bit

${data.html}

--${boundary}--`;
  }

  headers.push(`Content-Type: text/plain; charset=utf-8`);
  headers.push(`Content-Transfer-Encoding: 8bit`);
  return `${headers.join('\r\n')}

${data.text}`;
}
