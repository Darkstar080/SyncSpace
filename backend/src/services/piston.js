import axios from "axios";

const API_URL = "https://api.onlinecompiler.io/api/run-code-sync/";

export async function executeCode(compiler, code) {
  try {

    
    const response = await axios.post(
      
      API_URL,
      {
        compiler,
        code,
        input: "",
      },
      {
        headers: {
          Authorization: process.env.ONLINE_COMPILER_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    

    return response.data;
  } catch (error) {
    console.error("Compiler Error:");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message);
    }

    throw error;
  }
}