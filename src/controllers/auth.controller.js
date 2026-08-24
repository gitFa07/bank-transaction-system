const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const EmailService = require("../services/email.service");
const tokenBlacklistModel = require("../models/blacklist.model");

/**
 *
 * - user register controller
 * - POST /api/auth/register
 */
async function userRegisterController(req, res) {
  const { email, password, name } = req.body;

  const isExist = await userModel.findOne({
    email: email,
  });

  if (isExist) {
    return res.status(422).json({
      message: "User already exist with email",
      status: "failed",
    });
  }

  const user = await userModel.create({
    email,
    password,
    name,
  });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  res.cookie("token", token);

  res.status(201).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });

  await EmailService.sendRegistrationEmail(user.email, user.name);
}

/**
 *
 * - user login controller
 * - POST /api/auth/login
 */
async function userloginController(req, res) {
  const { email, password } = req.body;
  const user = await userModel.findOne({ email }).select("+password");

  if (!user) {
    return res.status(401).json({
      message: "Email or passowrd invalid",
    });
  }

  const isValidPassword = await user.comparePassword(password);

  if (!isValidPassword) {
    return res.json({
      message: "Email or password is invalid",
    });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  res.cookie("token", token);

  res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });
}

/**
 *
 * - user logout controller
 * - POST /api/auth/logout
 */
async function userlogoutController(req, res) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(400).res({
      message: "user logout successfully",
    });
  }
  res.cookie("token", "");

  await tokenBlacklistModel.create({
    token: token,
  });

  res.status(200).json({
    message: "User logout successfully",
  });
}

module.exports = {
  userRegisterController,
  userloginController,
  userlogoutController,
};
