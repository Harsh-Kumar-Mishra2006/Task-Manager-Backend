// sockets/documentSocket.js
const jwt = require('jsonwebtoken');
const Document = require('../models/Document');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Per-document pending writes (debounced persistence)
const pendingSaves = new Map();      // docId -> { timer, content, version, lastEditor }
const SAVE_DEBOUNCE_MS = 2000;

const flushDocument = async (docId) => {
  const pending = pendingSaves.get(docId);
  if (!pending) return;

  pendingSaves.delete(docId);

  try {
    const doc = await Document.findById(docId);
    if (!doc) return;

    doc.content = pending.content;
    doc.lastEditedBy = pending.lastEditor;
    doc.version = pending.version;
    await doc.save();

    console.log(`[socket] persisted doc ${docId} (v${pending.version}, ${pending.content.length} chars)`);
  } catch (err) {
    console.error(`[socket] persist failed for ${docId}:`, err.message);
    // Re-queue so we don't lose writes
    if (!pendingSaves.has(docId)) pendingSaves.set(docId, pending);
  }
};

const scheduleSave = (docId, content, version, lastEditor) => {
  const existing = pendingSaves.get(docId);
  if (existing?.timer) clearTimeout(existing.timer);

  const timer = setTimeout(() => flushDocument(docId), SAVE_DEBOUNCE_MS);
  pendingSaves.set(docId, { timer, content, version, lastEditor });
};

const registerDocumentSocket = (io) => {
  // ---- auth middleware ----
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization || '').replace('Bearer ', '') ||
        socket.handshake.headers.cookie
          ?.split('; ')
          .find((c) => c.startsWith('token='))
          ?.split('=')[1];

      if (!token) return next(new Error('No token provided'));

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id} user=${socket.user.userId}`);

    // ----- JOIN document room -----
    socket.on('doc:join', async ({ docId }, ack) => {
      try {
        const doc = await Document.findById(docId).lean();
        if (!doc) return ack?.({ ok: false, error: 'Document not found' });

        const uid = socket.user.userId.toString();
        const canAccess =
          doc.isPublic ||
          doc.owner.toString() === uid ||
          doc.collaborators.some((c) => c.toString() === uid);

        if (!canAccess) return ack?.({ ok: false, error: 'Not authorized' });

        socket.join(`doc:${docId}`);
        socket.currentDocId = docId;

        // Send current snapshot to the joiner only
        socket.emit('doc:snapshot', {
          content: doc.content,
          title: doc.title,
          version: doc.version
        });

        // Tell others someone joined
        socket.to(`doc:${docId}`).emit('doc:presence', {
          event: 'joined',
          userId: uid,
          name: socket.user.name,
          socketId: socket.id
        });

        ack?.({ ok: true });
      } catch (err) {
        console.error('[socket] doc:join error', err);
        ack?.({ ok: false, error: err.message });
      }
    });

    // ----- REALTIME EDIT -----
    // Client throttles to ~50ms; we just relay + buffer
    socket.on('doc:edit', ({ docId, content, version }) => {
      if (!docId || typeof content !== 'string') return;
      if (socket.currentDocId !== docId) return;

      const outgoingVersion = Number(version) || 0;

      // Broadcast to everyone else in the room
      socket.to(`doc:${docId}`).emit('doc:update', {
        content,
        version: outgoingVersion,
        editorId: socket.user.userId,
        editorName: socket.user.name,
        socketId: socket.id
      });

      // Buffer for debounced persistence
      scheduleSave(docId, content, outgoingVersion, socket.user.userId);
    });

    // ----- TITLE UPDATE -----
    socket.on('doc:title', async ({ docId, title }) => {
      if (!docId || typeof title !== 'string') return;
      if (socket.currentDocId !== docId) return;

      try {
        await Document.updateOne(
          { _id: docId },
          { $set: { title: title.trim() || 'Untitled' } }
        );
        socket.to(`doc:${docId}`).emit('doc:title-update', { title });
      } catch (err) {
        console.error('[socket] title update failed', err.message);
      }
    });

    // ----- MANUAL FORCE SAVE (from client "save now") -----
    socket.on('doc:save-now', async ({ docId }, ack) => {
      try {
        await flushDocument(docId);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    // ----- LEAVE -----
    socket.on('doc:leave', ({ docId }) => {
      socket.leave(`doc:${docId}`);
      if (socket.currentDocId === docId) socket.currentDocId = null;
      socket.to(`doc:${docId}`).emit('doc:presence', {
        event: 'left',
        userId: socket.user.userId,
        socketId: socket.id
      });
    });

    // ----- DISCONNECT -----
    socket.on('disconnect', async (reason) => {
      console.log(`[socket] disconnected ${socket.id} (${reason})`);
      if (socket.currentDocId) {
        // Flush any pending writes immediately on disconnect
        await flushDocument(socket.currentDocId);
        socket.to(`doc:${socket.currentDocId}`).emit('doc:presence', {
          event: 'left',
          userId: socket.user.userId,
          socketId: socket.id
        });
      }
    });
  });

  // Flush all pending writes when server shuts down gracefully
  const shutdown = async () => {
    for (const docId of pendingSaves.keys()) await flushDocument(docId);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

module.exports = { registerDocumentSocket };