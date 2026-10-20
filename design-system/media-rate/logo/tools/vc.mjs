// Minimal client for the VectorCraft desktop control channel (JSON lines on 127.0.0.1).
// Docs: https://github.com/storytold/vectorcraft/blob/main/docs/control-protocol.md
import net from "node:net";

export class VC {
  constructor(port = Number(process.env.VECTORCRAFT_CONTROL_PORT ?? 7981)) {
    this.port = port;
    this.id = 0;
    this.pending = new Map();
    this.buffer = "";
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.sock = net.createConnection({ host: "127.0.0.1", port: this.port }, resolve);
      this.sock.on("error", reject);
      this.sock.setEncoding("utf8");
      this.sock.on("data", (chunk) => {
        this.buffer += chunk;
        let nl;
        while ((nl = this.buffer.indexOf("\n")) >= 0) {
          const line = this.buffer.slice(0, nl).trim();
          this.buffer = this.buffer.slice(nl + 1);
          if (!line) continue;
          let msg;
          try {
            msg = JSON.parse(line);
          } catch {
            continue;
          }
          const waiter = this.pending.get(msg.id);
          if (!waiter) continue;
          this.pending.delete(msg.id);
          if (msg.ok) waiter.resolve(msg.result);
          else waiter.reject(new Error(msg.error));
        }
      });
    });
  }

  request(method, params = {}) {
    const id = ++this.id;
    const payload = JSON.stringify(params ? { id, method, params } : { id, method });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.sock.write(payload + "\n");
    });
  }

  exec(command, params = {}) {
    return this.request("engine.execute", { command, params });
  }

  close() {
    this.sock?.end();
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
