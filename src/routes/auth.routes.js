const express = require("express");
const authController = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", authController.userRegisterController);

router.post("/login", authController.userloginController);

module.exports = router;
