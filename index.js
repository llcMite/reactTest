import React from './js/reactMin';
const TodoList = React.createClass({
  getInitialState: function() {
    return {items: [],text:'hello'};
  },
  add:function(){
  	console.log(1)
    var nextItems = this.state.items.concat([this.state.text]);
    this.setState({items: nextItems, text: 'hello'});
    console.log(this.state.items)
  },
  onChange: function(e) {
    this.setState({text: e.target.value});
  },
  render: function() {
    var createItem = function(itemText) {
      return React.createElement("div", null, itemText);
    };

    var lists = this.state.items.map(createItem);
    var input = React.createElement("input", {onkeyup: this.onChange.bind(this),value: this.state.text});
    var button = React.createElement("button", {onclick: this.add.bind(this)}, 'Add#' + (this.state.items.length + 1))
    var children = lists.concat([input,button])
    console.log(lists)
    return React.createElement("div", null,children);
  }
});


React.render(React.createElement(TodoList), document.getElementById("app"));
