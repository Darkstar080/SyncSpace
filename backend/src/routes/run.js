import express from "express";
import { executeCode } from "../services/piston.js";

const router = express.Router();

const languageMap = {
   javascript: "nodejs-24",
  python: "python-3.14",
  java: "openjdk-25",
  cpp: "g++-15",
  c: "gcc-15",
  typescript: "typescript-deno",
};

router.post("/", async (req, res) => {
  try {
    const { language, code } = req.body;

    const compiler = languageMap[language];

    if (!compiler) {
      return res.status(400).json({
        success: false,
        message: "Unsupported language",
      });
    }

    const result = await executeCode(compiler, code);

    res.json(result);
  } catch (error) {
  console.error("RUN ERROR:");

  if (error.response) {
    console.error("Status:", error.response.status);
    console.error("Data:", error.response.data);

    return res.status(error.response.status).json(error.response.data);
  }

  console.error(error);

  res.status(500).json({
    success: false,
    message: error.message,
  });
}
});

export default router;