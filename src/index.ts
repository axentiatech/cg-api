import app from "./app";

const port = 8000;
console.log(`Server is running on port http://localhost:${port}`);

export default {
  fetch: app.fetch,
  port,
};
