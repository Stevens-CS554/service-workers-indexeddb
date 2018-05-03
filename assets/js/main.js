const registerFormStuff = () => {
  const entryList = $("#todo-entries");
  const entryForm = $("#todo-form");
  const todoInput = $("#todo-input");

  const addItemToPage = item => {
    const newChild = $("<li>" + item.task + "</li>");
    entryList.append(newChild);
  };

  $.get("/to-do").then(res => {
    res.forEach(addItemToPage);
  });

  entryForm.submit(e => {
    e.preventDefault();
    const task = todoInput.val();
    todoInput.val("");

    const config = {
      type: "POST",
      url: "/to-do",
      dataType: "json",
      contentType: "application/json",
      data: JSON.stringify({ todo: { task: task } })
    };

    return $.ajax(config).then(addItemToPage);
  });
};

// First, we register that service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .then(function(registration) {
      // registration worked
      console.log("Registration succeeded; let's update.");
      return registration.update();
    })
    .then(registerFormStuff)
    .catch(console.log);
} else {
  registerFormStuff();
}
