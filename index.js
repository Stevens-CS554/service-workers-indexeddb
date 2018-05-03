const express = require("express");
const uuid = require("uuid");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");

app.use("/assets", express.static("assets"));
app.use(bodyParser.json());

const todo = [
  {
    id: uuid.v4(),
    task: "Make todo list"
  },
  {
    id: uuid.v4(),
    task: "Add todo list entries to server"
  },
  {
    id: uuid.v4(),
    task: "Panic"
  }
];

app.get("/to-do", (req, res) => {
  res.json(todo);
});

app.post("/to-do", (req, res) => {
  const newItem = { ...req.body.todo, id: req.body.id || uuid.v4() };
  todo.push(newItem);
  res.json(newItem);
});

app.get("/home", (req, res) => {
  res.sendFile(path.resolve("misc/index.html"));
});

// We're just going to provide this at the root since service workers scope by directory
app.get("/service-worker.js", (req, res) => {
  res.sendFile(path.resolve("misc/service-worker.js"));
});

app.get("/", (req, res) => res.redirect("/home"));

app.listen(3000, () => {
  console.log(`listening on http://localhost:${3000}`);
});
