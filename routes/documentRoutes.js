// routes/documentRoutes.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authMiddleware');
const {
  createDocument,
  listDocuments,
  getDocument,
  updateDocument,
  downloadDocument,
  deleteDocument
} = require('../controllers/documentController');

router.use(authenticateToken);  // all doc routes require login

router.post('/', createDocument);
router.get('/', listDocuments);
router.get('/:id', getDocument);
router.put('/:id', updateDocument);
router.get('/:id/download', downloadDocument);   // must come before generic :id? no, path differs
router.delete('/:id', deleteDocument);

module.exports = router;