const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');

router.get('/branch/:branchId', tableController.getTablesByBranch);

module.exports = router;