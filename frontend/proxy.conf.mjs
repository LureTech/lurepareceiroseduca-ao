// Proxy do "ng serve": /api e /files vão para a API local (http://localhost:8086), que usa o schema
// "lure2" do banco. Nunca aponta por padrão para a API do LURE EDUCAÇÃO original.
// Depois de publicar este site na Vercel, dá para usar a API publicada: LURE_API=https://<site>.vercel.app
const remote = process.env.LURE_API && process.env.LURE_API !== 'local' ? process.env.LURE_API : null;
const target = remote ?? 'http://localhost:8086';
const local = !remote;

export default {
  '/api': { target, secure: !local, changeOrigin: !local, logLevel: 'warn' },
  '/files': { target, secure: !local, changeOrigin: !local, logLevel: 'warn' },
};
