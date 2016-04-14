function TodoList(configuration) {
  var self = riot.observable(this);
 
  // Requires an array of TodoItems
  $.extend(self, configuration);
 
  self.add = function(name) {
    var id = Math.random() * 1000000;
    var data = {name: name, id: id};
    var todo = new TodoItem(self, data);
    self.items.push(todo);
  }
 
  self.complete = function(id) {
    var itemAsArray = $.grep(self.items, function(item) { return item.id == id});
    if (itemAsArray.length > 0) {
      var item = itemAsArray[0]; // Assume only one
 
      if (item.name.match(/<strike>/)) { return false; }
      var index = $.inArray(item, self.items);
      item.name = "<strike>" + item.name + "</strike>"
      self.items[index] = item;
    }
  }
 
  self.delete = function(id) {
    self.items = $.grep(self.items, function(item) { return item.id != id});
  }
}
 
function TodoItem(app, data) {
  var self = riot.observable(this);
 
  $.extend(self, data);
}
 
// SPA
var instance;
 
window.todo = riot.observable(function(arg) {
  // todo()
  if (!arg) return instance;
 
  // todo(fn) to add a new module
  if ($.isFunction(arg)) {
      console.log('spa2'); 
    window.todo.on("ready", arg);
  } else {
    // todo(conf) to initialize the application
    instance = new TodoList(arg);
      console.log('spa3'); 
 
    instance.on("ready", function() {
      console.log('spa3-ready'); 
      window.todo.trigger("ready", instance);
    });
  }
});
 
// Presenters
todo(function(app) {
      console.log('pres-parse'); 
 
  var root = $("#todos");
  var template = $("#todo-item-tmpl").html();
 
  // Ready
  app.on("ready", function(view) {
      console.log('pres-ready'); 
    app.trigger('list');
  });
 
  /// Add
  $("#addNewTodo").submit(function(e) {
 
    e.preventDefault();
    var name = $("#todoName").val();
    if (name) {
      app.add(name);
    }
 
    this.reset();
 
    app.trigger('list');
  });
 
  /// List
  app.on("list", function(view) {
    root.empty();
 
    $.each(app.items, function(i, item) {
      root.append(
        riot.render(template, { item: item }));
    });
  });
 
  /// Complete
  $('body').on('click', '.todo-complete', function(e) {
    e.preventDefault();
 
    app.complete($(this).parent().data('key'));
 
    app.trigger('list');
  });
 
  /// Delete
  $('body').on('click', '.todo-delete', function(e) {
    e.preventDefault();
 
    app.delete($(this).parent().data('key'));
 
    app.trigger('list');
  });
});
