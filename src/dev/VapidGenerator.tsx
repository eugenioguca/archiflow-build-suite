import React, { useState } from "react";

// base64url helpers
const b64uEncode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const b64uDecode = (str: string) => {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

export default function VapidGenerator() {
  const [pub, setPub] = useState<string>("");
  const [priv, setPriv] = useState<string>("");
  const [subject, setSubject] = useState<string>("mailto:soporte@tu-dominio.com");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  async function generate() {
    try {
      setBusy(true); setErr("");
      // 1) Generar par EC P-256 (ES256)
      const keyPair = await crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"]
      );
      // 2) Exportar como JWK para obtener x,y,d
      const jwkPub = await crypto.subtle.exportKey("jwk", keyPair.publicKey) as any;
      const jwkPriv = await crypto.subtle.exportKey("jwk", keyPair.privateKey) as any;
      // 3) VAPID_PUBLIC_KEY = base64url de punto no comprimido: 0x04 || X || Y
      const x = b64uDecode(jwkPub.x); // 32 bytes
      const y = b64uDecode(jwkPub.y); // 32 bytes
      const uncompressed = new Uint8Array(65);
      uncompressed[0] = 0x04;
      uncompressed.set(x, 1);
      uncompressed.set(y, 33);
      const publicKey = b64uEncode(uncompressed);
      // 4) VAPID_PRIVATE_KEY = 'd' del JWK (ya está en base64url)
      const privateKey = jwkPriv.d; // 32 bytes base64url
      setPub(publicKey);
      setPriv(privateKey);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function Copy({ value }: { value: string }) {
    return (
      <button
        onClick={() => navigator.clipboard.writeText(value || "")}
        className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-sm"
        disabled={!value}
      >
        Copiar
      </button>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Generador VAPID (solo DEV)</h1>
      <p className="mb-4">Usa este generador para obtener las llaves de Web Push (VAPID). Copia y pega en tus variables de entorno.</p>
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm text-slate-600">VAPID_SUBJECT</span>
          <input value={subject} onChange={e=>setSubject(e.target.value)}
            className="w-full border rounded px-3 py-2" placeholder="mailto:soporte@tu-dominio.com" />
        </label>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">VAPID_PUBLIC_KEY</span>
            <Copy value={pub}/>
          </div>
          <textarea className="w-full border rounded px-3 py-2 font-mono text-xs" rows={3} readOnly value={pub}/>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">VAPID_PRIVATE_KEY</span>
            <Copy value={priv}/>
          </div>
          <textarea className="w-full border rounded px-3 py-2 font-mono text-xs" rows={3} readOnly value={priv}/>
        </div>
        {err && <div className="text-red-600 text-sm">Error: {err}</div>}
        <button
          onClick={generate}
          className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-60"
          disabled={busy}
        >
          {busy ? "Generando…" : "Generar llaves VAPID"}
        </button>
      </div>
      <div className="mt-6 p-3 border rounded text-sm">
        <p>Pega en Lovable → Environment:</p>
        <pre className="whitespace-pre-wrap">{`VAPID_PUBLIC_KEY=${pub}\nVAPID_PRIVATE_KEY=${priv}\nVAPID_SUBJECT=${subject}\nVITE_VAPID_PUBLIC_KEY=${pub}`}</pre>
      </div>
    </div>
  );
}
