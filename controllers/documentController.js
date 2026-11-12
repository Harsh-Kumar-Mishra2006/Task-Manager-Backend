// controllers/documentController.js
const Document = require('../models/Document');

// ---------- CREATE ----------
const createDocument = async (req, res) => {
  try {
    const { title = 'Untitled', content = '' } = req.body || {};

    const doc = await Document.create({
      title: title.trim() || 'Untitled',
      content,
      owner: req.user.userId,
      lastEditedBy: req.user.userId
    });

    return res.status(201).json({
      status: 'success',
      data: { document: doc }
    });
  } catch (err) {
    console.error('createDocument:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ---------- LIST (user's docs) ----------
const listDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ owner: req.user.userId })
      .sort({ updatedAt: -1 })
      .select('title charCount updatedAt createdAt')
      .lean();

    return res.status(200).json({ status: 'success', data: { documents: docs } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ---------- GET ONE ----------
const getDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ status: 'error', message: 'Document not found' });

    const isOwner = doc.owner.toString() === req.user.userId.toString();
    const isCollab = doc.collaborators.some(
      (c) => c.toString() === req.user.userId.toString()
    );
    if (!isOwner && !isCollab && !doc.isPublic) {
      return res.status(403).json({ status: 'error', message: 'Not authorized' });
    }

    return res.status(200).json({ status: 'success', data: { document: doc } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ---------- UPDATE (REST fallback + non-realtime save) ----------
const updateDocument = async (req, res) => {
  try {
    const { title, content } = req.body || {};

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ status: 'error', message: 'Document not found' });

    const isOwner = doc.owner.toString() === req.user.userId.toString();
    const isCollab = doc.collaborators.some(
      (c) => c.toString() === req.user.userId.toString()
    );
    if (!isOwner && !isCollab) {
      return res.status(403).json({ status: 'error', message: 'Not authorized' });
    }

    if (typeof title === 'string') doc.title = title.trim() || 'Untitled';
    if (typeof content === 'string') doc.content = content;
    doc.version += 1;
    doc.lastEditedBy = req.user.userId;

    await doc.save();

    return res.status(200).json({ status: 'success', data: { document: doc } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ---------- DOWNLOAD ----------
const downloadDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ status: 'error', message: 'Document not found' });

    const isOwner = doc.owner.toString() === req.user.userId.toString();
    const isCollab = doc.collaborators.some(
      (c) => c.toString() === req.user.userId.toString()
    );
    if (!isOwner && !isCollab && !doc.isPublic) {
      return res.status(403).json({ status: 'error', message: 'Not authorized' });
    }

    const safeName = (doc.title || 'document')
      .replace(/[^a-zA-Z0-9 _-]/g, '')
      .trim()
      .replace(/\s+/g, '_') || 'document';

    const body = `${doc.title}\n\n${doc.content}`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.txt"`);
    return res.send(body);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ---------- DELETE ----------
const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ status: 'error', message: 'Document not found' });

    if (doc.owner.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ status: 'error', message: 'Only owner can delete' });
    }

    await doc.deleteOne();
    return res.status(200).json({ status: 'success', message: 'Document deleted' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

module.exports = {
  createDocument,
  listDocuments,
  getDocument,
  updateDocument,
  downloadDocument,
  deleteDocument
};