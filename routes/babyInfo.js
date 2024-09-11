const express = require('express');
const { getBabyInfo } = require('../services/babyService')

const router = express.Router();

router.get('/', (req, res) => {
  const babyInfo = getBabyInfo();
  res.json(babyInfo);
});

module.exports = router;
